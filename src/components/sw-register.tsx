'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    // Only register in production or if explicitly enabled
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // In development, SW is disabled by next-pwa config
    if (isLocalhost && process.env.NODE_ENV === 'development') {
      console.log('SW disabled in development');
      return;
    }

    // Register service worker with proper path
    const swPath = '/sw.js';

    navigator.serviceWorker
      .register(swPath, { scope: '/' })
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                console.log('New SW version available');
                if (confirm('New version available! Reload to update?')) {
                  window.location.reload();
                }
              }
            });
          }
        });

        // Also check for updates when page becomes visible
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(console.error);
          }
        });
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
        // Don't throw - SW failure shouldn't break the app
      });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated');
    });
  }, []);

  return null;
}
