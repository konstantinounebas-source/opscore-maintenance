import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale service workers that may serve cached/outdated JS bundles
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  // Also clear all caches to avoid stale module cache causing duplicate React issues
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)