// Setup phase: pick category, language, difficulty and timer length.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card, useToast } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { PACKS, CATEGORIES, LANGUAGES } from '../data/index.ts';
import { buildPool } from '../logic/pool.ts';
import type {
  CharadesCategory,
  CharadesDifficulty,
  CharadesLang,
} from '../data/types.ts';
import type { CharadesSetup } from './GameScreen.tsx';

interface SetupPhaseProps {
  onStart: (setup: CharadesSetup) => void;
}

const TIMER_OPTIONS = [30, 60, 90, 120];

const DIFFICULTIES: { id: CharadesDifficulty | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'charades.all' },
  { id: 'easy', labelKey: 'charades.easy' },
  { id: 'medium', labelKey: 'charades.medium' },
  { id: 'hard', labelKey: 'charades.hard' },
  { id: 'veryhard', labelKey: 'charades.veryHard' },
];

function prettify(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SetupPhase({ onStart }: SetupPhaseProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [category, setCategory] = useState<CharadesCategory | 'random'>(
    'random',
  );
  const [difficulty, setDifficulty] = useState<CharadesDifficulty | 'all'>(
    'all',
  );
  const [timerSecs, setTimerSecs] = useState<number>(60);

  // LANGUAGES may be plain ids ('en') or { id, label } objects — accept both,
  // falling back to the languages actually present in PACKS.
  const langOpts = useMemo((): { id: string; label: string }[] => {
    const ids: string[] = [];
    const labels = new Map<string, string>();
    const raw: unknown = LANGUAGES;
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (typeof entry === 'string') {
          ids.push(entry);
        } else if (entry !== null && typeof entry === 'object' && 'id' in entry) {
          const id = (entry as { id: unknown }).id;
          if (typeof id === 'string') {
            ids.push(id);
            const label = (entry as { label: unknown }).label;
            if (typeof label === 'string') labels.set(id, label);
          }
        }
      }
    }
    if (ids.length === 0) {
      for (const pack of PACKS) {
        if (!ids.includes(pack.language)) ids.push(pack.language);
      }
    }
    return ids.map((id) => {
      const fromData = labels.get(id);
      if (fromData) return { id, label: fromData };
      const key = `charades.lang.${id}`;
      const label = t(key);
      return { id, label: label === key ? prettify(id) : label };
    });
  }, [t]);

  const [language, setLanguage] = useState<string>(
    () => langOpts[0]?.id ?? 'en',
  );

  const catLabel = (id: string): string => {
    if (id === 'random') return t('charades.random');
    const key = `charades.cat.${id}`;
    const label = t(key);
    return label === key ? prettify(id) : label;
  };

  const handleStart = (): void => {
    playSound('click');
    const pool = buildPool(PACKS, {
      language: language as CharadesLang,
      category,
      difficulty,
    });
    if (pool.length === 0) {
      toast(t('charades.noWords'));
      return;
    }
    track('category_selected', { category: category as string });
    track('language_selected', { language });
    onStart({
      language: language as CharadesLang,
      category,
      difficulty,
      timerSecs,
    });
  };

  const seg = (
    pressed: boolean,
    onClick: () => void,
    label: string,
    key: string,
  ): ReactNode => (
    <button
      key={key}
      type="button"
      className="ch-seg"
      aria-pressed={pressed}
      onClick={() => {
        playSound('click');
        onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="ch-screen">
      <h1 className="ch-title">
        🎭 {t('charades.setupTitle')}
      </h1>

      <Card>
        <span className="ch-section-label">{t('charades.category')}</span>
        <div className="ch-catgrid">
          {CATEGORIES.map((c) => (
            <button
              key={c.id as string}
              type="button"
              className="ch-cat"
              aria-pressed={category === c.id}
              onClick={() => {
                playSound('click');
                setCategory(c.id);
              }}
            >
              <span className="ch-cat-icon">{c.icon}</span>
              <span>{catLabel(c.id as string)}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <span className="ch-section-label">{t('charades.language')}</span>
        <div className="ch-segmented">
          {langOpts.map((l) =>
            seg(
              language === l.id,
              () => setLanguage(l.id),
              l.label,
              l.id,
            ),
          )}
        </div>
      </Card>

      <Card>
        <span className="ch-section-label">{t('charades.difficulty')}</span>
        <div className="ch-segmented">
          {DIFFICULTIES.map((d) =>
            seg(
              difficulty === d.id,
              () => setDifficulty(d.id),
              t(d.labelKey),
              d.id as string,
            ),
          )}
        </div>
      </Card>

      <Card>
        <span className="ch-section-label">{t('charades.timer')}</span>
        <div className="ch-segmented">
          {TIMER_OPTIONS.map((s) =>
            seg(
              timerSecs === s,
              () => setTimerSecs(s),
              `${s}${t('charades.seconds')}`,
              String(s),
            ),
          )}
        </div>
      </Card>

      <Button size="lg" fullWidth onClick={handleStart}>
        {t('charades.startGame')}
      </Button>
    </div>
  );
}
