import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initMotion } from './lib/motion';
import { initAppIcon } from './lib/appIcon';

// Card shine follows the phone's tilt.
initMotion();

// Apply custom PWA app icon if configured by user
initAppIcon();

// Register PWA service worker for push notifications & offline caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
  // Tapping a notification while the app is already open.
  navigator.serviceWorker.addEventListener('message', (e) => {
    const url = e.data?.type === 'open-url' && typeof e.data.url === 'string' ? new URL(e.data.url) : null;
    if (url && url.origin === window.location.origin) window.location.hash = url.hash;
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
