import { useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';

export default function App() {
  const webViewRef = useRef(null);

  useEffect(() => {
    const setupNotifications = async () => {
      await messaging().requestPermission();
      
      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Handle notification when app is open
      messaging().onMessage(async remoteMessage => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('newRequest', {
              detail: ${JSON.stringify(remoteMessage.data)}
            }));
          `);
        }
      });

      // Handle notification when app is in background
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Background message:', remoteMessage);
      });
    };

    setupNotifications();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://smart-service-rho.vercel.app' }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#C5A059" />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
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