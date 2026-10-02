// Setup phase: pick category, language, difficulty and timer length.
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card, Spinner, useToast } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { PACKS, CATEGORIES, LANGUAGES } from '../data/index.ts';
import { buildPool } from '../logic/pool.ts';
import { generateCustomWords } from '../logic/customCategory.ts';
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

  // AI custom category: free-text search → server generates fresh words.
  const [customText, setCustomText] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<{
    category: string;
    words: string[];
  } | null>(null);

  const clearCustom = (): void => setCustomResult(null);

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
    if (customResult) {
      track('custom_category_generated', {
        category: customResult.category,
        words: customResult.words.length,
      });
      onStart({
        language: language as CharadesLang,
        category,
        difficulty,
        timerSecs,
        customCategory: customResult.category,
        customWords: customResult.words,
      });
      return;
    }
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

  const handleGenerate = async (): Promise<void> => {
    const category = customText.trim();
    if (category.length < 2 || generating) return;
    playSound('click');
    setGenerating(true);
    try {
      const result = await generateCustomWords({
        category,
        language: language as CharadesLang,
        difficulty,
      });
      setCustomResult(result);
      track('custom_category_generated', {
        category: result.category,
        words: result.words.length,
      });
    } catch (err) {
      toast(
        err instanceof Error && err.message
          ? err.message
          : t('charades.generationFailed'),
      );
    } finally {
      setGenerating(false);
    }
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
                clearCustom();
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
        <span className="ch-section-label">{t('charades.customCategory')}</span>
        <div className="ch-custom-row">
          <input
            className="ch-custom-input"
            type="text"
            value={customText}
            maxLength={60}
            placeholder={t('charades.customPlaceholder')}
            aria-label={t('charades.customCategory')}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleGenerate();
            }}
          />
          <Button
            onClick={() => void handleGenerate()}
            disabled={generating || customText.trim().length < 2}
          >
            ✨ {t('charades.generate')}
          </Button>
        </div>
        {generating ? (
          <div className="ch-generating" role="status">
            <Spinner />
            <span>{t('charades.generating')}</span>
          </div>
        ) : null}
        {customResult && !generating ? (
          <div className="ch-custom-chip">
            <span>
              ✨ “{customResult.category}” · {customResult.words.length}{' '}
              {t('charades.words')}
            </span>
            <button
              type="button"
              className="ch-custom-clear"
              aria-label={t('common.cancel')}
              onClick={() => {
                playSound('click');
                clearCustom();
              }}
            >
              ✕
            </button>
          </div>
        ) : null}
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
