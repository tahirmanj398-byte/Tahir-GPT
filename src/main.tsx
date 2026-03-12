import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Aggressively suppress Vite WebSocket errors in development
const isWebSocketError = (err: any): boolean => {
  const msg = typeof err === 'string' ? err : (err?.message || '');
  return msg.toLowerCase().includes('websocket');
};

window.addEventListener('unhandledrejection', (event) => {
  if (isWebSocketError(event.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

window.addEventListener('error', (event) => {
  if (isWebSocketError(event.message) || isWebSocketError(event.error)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

const originalConsoleError = console.error;
console.error = (...args) => {
  if (args.some(arg => isWebSocketError(arg))) return;
  originalConsoleError(...args);
};

// Theme Initialization
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
