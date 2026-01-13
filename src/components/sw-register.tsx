'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * 
 * Note: @ducanh2912/next-pwa v10+ handles SW registration internally when `register: true` is set.
 * This component provides fallback registration and update notifications.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    // Check if SW is already controlled (handled by next-pwa)
    if (navigator.serviceWorker.controller) {
      console.log('SW already active via next-pwa');
    }

    // Listen for SW updates
    navigator.serviceWorker.ready.then((registration) => {
      console.log('SW ready:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New SW version available');
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    });

    // Handle controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New service worker activated');
    });
  }, []);

  return null;
}
