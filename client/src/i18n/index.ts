// Minimal i18n: JSON dictionaries + useI18n hook.
// UI strings must come from here — never hard-code user-visible text in components.
// Game CONTENT (e.g. charades word lists) lives in each game's data/ folder, not here.
import { createContext, useContext, useState, useEffect, createElement } from 'react';
import type { ReactNode } from 'react';
import en from './en.json';
import te from './te.json';
import hi from './hi.json';

export type Lang = 'en' | 'te' | 'hi';

const DICTS_BASE: Record<Lang, Record<string, unknown>> = { en, te, hi };

// Game/area string fragments: client/src/i18n/fragments/<ns>.en.json
// (one fragment per area, e.g. tambola.en.json) are deep-merged into English.
// This lets contributors add strings without merge conflicts; te/hi fall back
// to English for any key they don't translate.
// NOTE: imported explicitly — esbuild (unlike Vite) has no import.meta.glob.
import bingoFrag from './fragments/bingo.en.json';
import charadesFrag from './fragments/charades.en.json';
import chessFrag from './fragments/chess.en.json';
import ludoFrag from './fragments/ludo.en.json';
import snakeladderFrag from './fragments/snakeladder.en.json';
import tambolaFrag from './fragments/tambola.en.json';
import uiFrag from './fragments/ui.en.json';

const fragmentDicts: Record<string, unknown>[] = [
  bingoFrag as Record<string, unknown>,
  charadesFrag as Record<string, unknown>,
  chessFrag as Record<string, unknown>,
  ludoFrag as Record<string, unknown>,
  snakeladderFrag as Record<string, unknown>,
  tambolaFrag as Record<string, unknown>,
  uiFrag as Record<string, unknown>,
];

function deepMerge(
  target: Record<string, unknown>,
  src: Record<string, unknown>,
): Record<string, unknown> {
  for (const [k, v] of Object.entries(src)) {
    if (
      typeof v === 'object' &&
      v !== null &&
      !Array.isArray(v) &&
      typeof target[k] === 'object' &&
      target[k] !== null &&
      !Array.isArray(target[k])
    ) {
      deepMerge(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      target[k] = v;
    }
  }
  return target;
}

const enMerged = deepMerge({}, DICTS_BASE.en);
for (const frag of fragmentDicts) {
  deepMerge(enMerged, frag);
}

const DICTS: Record<Lang, Record<string, unknown>> = {
  en: enMerged,
  te: DICTS_BASE.te,
  hi: DICTS_BASE.hi,
};

function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(lang: Lang, key: string): string {
  return lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
}

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('gh-lang');
    return saved === 'te' || saved === 'hi' ? saved : 'en';
  });
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('gh-lang', l);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang ]);
  return createElement(I18nCtx.Provider, { value: { lang, setLang } }, children);
}

export function useI18n() {
  const { lang, setLang } = useContext(I18nCtx);
  return { t: (key: string) => translate(lang, key), lang, setLang };
}
