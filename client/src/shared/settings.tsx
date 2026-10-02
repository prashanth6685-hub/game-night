// App-wide settings: theme, sound, animations. Persisted to localStorage.
// Language lives in i18n/I18nProvider; theme is applied to <html data-theme>.
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { setSoundEnabled } from './sound.ts';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
  sound: boolean;
  animations: boolean;
}

const DEFAULTS: Settings = { theme: 'system', sound: true, animations: true };

function load(): Settings {
  try {
    const raw = localStorage.getItem('gn-settings');
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const Ctx = createContext<{ settings: Settings; update: (p: Partial<Settings>) => void }>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    localStorage.setItem('gn-settings', JSON.stringify(settings));
    document.documentElement.dataset.theme = resolveTheme(settings.theme);
    document.documentElement.style.setProperty(
      'color-scheme',
      resolveTheme(settings.theme),
    );
    setSoundEnabled(settings.sound);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () =>
      (document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const update = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }));
  return <Ctx.Provider value={{ settings, update }}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
