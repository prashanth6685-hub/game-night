// Advertising abstraction layer (spec §33).
// - App is free; ads are the planned monetization.
// - Providers are swappable: register an implementation, <AdSlot> renders it.
// - v1 ships the PlaceholderProvider (clearly labeled box, no network calls).
// - NEVER render <AdSlot> over critical gameplay: allowed placements are
//   'lobby' (home screen banner), 'postgame' (results screen), 'between'
//   (between games). Never on the chess board, tambola tickets, or while a
//   charades timer runs.
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/index.ts';

export type AdPlacement = 'lobby' | 'postgame' | 'between';

export interface AdProvider {
  name: string;
  renderSlot: (placement: AdPlacement) => ReactNode;
}

function PlaceholderProvider(): AdProvider {
  return {
    name: 'placeholder',
    renderSlot: () => <PlaceholderAd />,
  };
}

function PlaceholderAd() {
  const { t } = useI18n();
  return (
    <div className="gn-adslot" role="complementary" aria-label={t('ads.label')}>
      <span className="gn-adslot-label">{t('ads.label')}</span>
    </div>
  );
}

const AdsCtx = createContext<{ provider: AdProvider; enabled: boolean }>({
  provider: PlaceholderProvider(),
  enabled: true,
});

export function AdsProvider({
  children,
  provider,
  enabled = true,
}: {
  children: ReactNode;
  provider?: AdProvider;
  enabled?: boolean;
}) {
  return (
    <AdsCtx.Provider value={{ provider: provider ?? PlaceholderProvider(), enabled }}>
      {children}
    </AdsCtx.Provider>
  );
}

/** Swap the ad implementation at runtime (e.g. AdMob web / AdSense). */
export function useAds() {
  return useContext(AdsCtx);
}

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const { provider, enabled } = useAds();
  if (!enabled) return null;
  return <>{provider.renderSlot(placement)}</>;
}
