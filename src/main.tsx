import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { ErrorBoundary } from './App';
import SentinelAdmin from './SentinelAdmin';
import { LanguageProvider } from './contexts/TranslationContext';
import './index.css';

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
