import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App, { ErrorBoundary } from './App.tsx';
import { LanguageProvider } from './contexts/TranslationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
