// Setup phase: type any custom category, hit START, then configure the game
// (language, difficulty, timer, rounds, teams) in a dialog. Words are
// AI-generated per session — no preset categories.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import {
  Button,
  Card,
  Modal,
  Spinner,
  useToast,
} from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import { track } from '../../../shared/analytics.ts';
import { generateCustomWords } from '../logic/customCategory.ts';
import type { CharadesDifficulty, CharadesLang } from '../data/types.ts';
import type { CharadesSetup, CharadesTeams } from './GameScreen.tsx';

interface SetupPhaseProps {
  onStart: (setup: CharadesSetup) => void;
}

const TIMER_OPTIONS = [30, 60, 90, 120];
const ROUND_OPTIONS: (number | null)[] = [5, 10, null];

const DIFFICULTIES: { id: CharadesDifficulty; labelKey: string }[] = [
  { id: 'easy', labelKey: 'charades.easy' },
  { id: 'medium', labelKey: 'charades.medium' },
  { id: 'hard', labelKey: 'charades.hard' },
  { id: 'veryhard', labelKey: 'charades.veryHard' },
];

const LANGS: { id: CharadesLang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'te', label: 'తెలుగు' },
  { id: 'hi', label: 'हिन्दी' },
];

const TEAM_LETTERS = ['A', 'B', 'C', 'D'];
const TEAM_COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#dc2626'];

export default function SetupPhase({ onStart }: SetupPhaseProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [customText, setCustomText] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  // Dialog config state.
  const [language, setLanguage] = useState<CharadesLang>('en');
  const [difficulty, setDifficulty] =
    useState<CharadesDifficulty>('medium');
  const [timerSecs, setTimerSecs] = useState<number>(60);
  const [rounds, setRounds] = useState<number | null>(5);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [teamNames, setTeamNames] = useState<string[]>(['', '', '', '']);

  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  const defaultTeamName = (i: number): string =>
    `${t('charades.team')} ${TEAM_LETTERS[i] ?? String(i + 1)}`;

  const setTeamName = (i: number, value: string): void => {
    setTeamNames((prev) => prev.map((n, j) => (j === i ? value : n)));
  };

  const openDialog = (): void => {
    if (customText.trim().length < 2 || generating) return;
    playSound('click');
    setGenError(null);
    setDialogOpen(true);
  };

  const handleConfirm = async (): Promise<void> => {
    const category = customText.trim();
    if (category.length < 2 || generating) return;
    playSound('click');
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generateCustomWords({
        category,
        language,
        difficulty,
      });
      const rawNames = teamNames
        .slice(0, teamCount)
        .map((n, i) => n.trim() || defaultTeamName(i));
      const seen = new Set<string>();
      const names = rawNames.map((n) => {
        let name = n;
        let k = 2;
        while (seen.has(name)) {
          name = `${n} ${k}`;
          k += 1;
        }
        seen.add(name);
        return name;
      });
      const teams: CharadesTeams = { names, rounds };
      track('custom_category_generated', {
        category: result.category,
        words: result.words.length,
      });
      track('game_started', { game: 'dumb-charades' });
      setDialogOpen(false);
      onStart({
        language,
        customCategory: result.category,
        customWords: result.words,
        difficulty,
        timerSecs,
        teams,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : t('charades.generationFailed');
      setGenError(msg);
      toast(msg);
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
      <h1 className="ch-title">🎭 {t('charades.setupTitle')}</h1>

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
              if (e.key === 'Enter') openDialog();
            }}
          />
        </div>
      </Card>

      <Button
        size="lg"
        fullWidth
        onClick={openDialog}
        disabled={customText.trim().length < 2}
      >
        {t('charades.startGame')}
      </Button>

      <Modal
        open={dialogOpen}
        onClose={() => {
          if (!generating) setDialogOpen(false);
        }}
        title={`✨ “${customText.trim()}”`}
      >
        <div className="ch-dialog">
          <span className="ch-section-label">{t('charades.language')}</span>
          <div className="ch-segmented">
            {LANGS.map((l) =>
              seg(language === l.id, () => setLanguage(l.id), l.label, l.id),
            )}
          </div>

          <span className="ch-section-label">{t('charades.difficulty')}</span>
          <div className="ch-segmented">
            {DIFFICULTIES.map((d) =>
              seg(
                difficulty === d.id,
                () => setDifficulty(d.id),
                t(d.labelKey),
                d.id,
              ),
            )}
          </div>

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

          <span className="ch-section-label">{t('charades.rounds')}</span>
          <div className="ch-segmented">
            {ROUND_OPTIONS.map((r) =>
              seg(
                rounds === r,
                () => setRounds(r),
                r === null ? t('charades.unlimited') : String(r),
                r === null ? 'rinf' : `r${r}`,
              ),
            )}
          </div>

          <span className="ch-section-label">{t('charades.teamCount')}</span>
          <div className="ch-segmented">
            {[2, 3, 4].map((n) =>
              seg(teamCount === n, () => setTeamCount(n), String(n), `t${n}`),
            )}
          </div>

          <div className="ch-teams-list">
            {Array.from({ length: teamCount }, (_, i) => (
              <div className="ch-team-row" key={i}>
                <span
                  className="ch-team-dot"
                  style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }}
                />
                <input
                  value={teamNames[i] ?? ''}
                  placeholder={defaultTeamName(i)}
                  aria-label={`${t('charades.teamName')} ${i + 1}`}
                  maxLength={24}
                  onChange={(e) => setTeamName(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          {genError ? (
            <div className="ch-gen-error" role="alert">
              {genError}
            </div>
          ) : null}

          <Button
            size="lg"
            fullWidth
            onClick={() => void handleConfirm()}
            disabled={generating}
          >
            {generating ? (
              <span className="ch-generating" role="status">
                <Spinner />
                <span>{t('charades.generating')}</span>
              </span>
            ) : (
              t('charades.startGame')
            )}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
