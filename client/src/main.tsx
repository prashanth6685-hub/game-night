import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './i18n/index.ts';
import { SettingsProvider } from './shared/settings.tsx';
import { ToastProvider } from './shared/ui/index.ts';
import { AdsProvider } from './shared/ads/Ads.tsx';
import { RoomProvider } from './shared/rooms/Rooms.tsx';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <SettingsProvider>
        <ToastProvider>
          <AdsProvider>
            <RoomProvider>
              <App />
            </RoomProvider>
          </AdsProvider>
        </ToastProvider>
      </SettingsProvider>
    </I18nProvider>
  </StrictMode>,
);

// PWA: register the service worker in production builds only.
if (__PROD__ && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    });
  });
}
