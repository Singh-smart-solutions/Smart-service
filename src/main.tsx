import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { ErrorBoundary } from './App';
import SentinelAdmin from './SentinelAdmin';
import { LanguageProvider } from './contexts/TranslationContext';
import './index.css';

// ✅ PWA: Register service worker for Play Store TWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — app still works normally
    });
  });
}

const isAdminRoute = window.location.pathname === '/sentinel-admin';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <SentinelAdmin />
    ) : (
      <LanguageProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </LanguageProvider>
    )}
  </React.StrictMode>
);
