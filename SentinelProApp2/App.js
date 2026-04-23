import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';

export default function App() {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupFirebase = async () => {
      try {
        // Request permission
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) return;

        // Get FCM token
        const token = await messaging().getToken();
        console.log('FCM Token:', token);

        // Handle foreground notifications
        messaging().onMessage(async remoteMessage => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('sentinelNotification', {
                detail: ${JSON.stringify(remoteMessage)}
              }));
              true;
            `);
          }
        });

        // Handle background notifications
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('Background notification:', remoteMessage);
        });

      } catch (error) {
        console.log('Firebase setup error:', error);
      }
    };

    setupFirebase();
  }, []);

  const injectedScript = `
    // Listen for department login to subscribe to topic
    window.addEventListener('sentinelStaffLogin', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SUBSCRIBE_TOPIC',
        department: e.detail.department
      }));
    });
    true;
  `;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SUBSCRIBE_TOPIC') {
        const topic = data.department
          .toLowerCase()
          .replace(/ /g, '_')
          .replace(/&/g, 'and');
        await messaging().subscribeToTopic(topic);
        console.log('Subscribed to topic:', topic);
      }
    } catch (e) {
      console.log('Message error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://smart-service-rho.vercel.app' }}
        style={styles.webview}
        startInLoadingState={true}
        onLoadEnd={() => setLoading(false)}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#C5A059" />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={injectedScript}
        onMessage={handleMessage}
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#C5A059" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001529',
  },
  webview: {
    flex: 1,
    marginTop: 30,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001529',
  },
});