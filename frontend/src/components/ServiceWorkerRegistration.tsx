'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新しいバージョンが利用可能になったことをユーザーに通知
                  if (window.confirm('アプリケーションの新しいバージョンが利用可能です。ページを再読み込みしますか？')) {
                    window.location.reload();
                  }
                }
              });
            }
          });

          console.log('ServiceWorker registration successful');
        } catch (error) {
          console.warn('ServiceWorker registration failed:', error);
        }
      };

      registerServiceWorker();
    }
  }, []);

  return null;
}