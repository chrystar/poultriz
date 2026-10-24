import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F4F5F7" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Poultriz" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        <ScrollViewStyleReset />
        <style>{`
          html, body {
            overscroll-behavior: none;
            scrollbar-width: none;
          }
          html::-webkit-scrollbar, body::-webkit-scrollbar {
            display: none;
          }
          #root {
            min-height: 100%;
            width: 100%;
          }
        `}</style>
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            var isDevelopment = location.port !== '';
            if (isDevelopment) {
              navigator.serviceWorker.getRegistrations().then(function (registrations) {
                registrations.forEach(function (registration) { registration.unregister(); });
              });
              if ('caches' in window) {
                caches.keys().then(function (keys) {
                  keys.forEach(function (key) { caches.delete(key); });
                });
              }
            } else {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js');
              });
            }
          }
        ` }} />
      </body>
    </html>
  );
}
