// Teams phase: team count (2-4), editable names, rounds (5/10/unlimited).
import { useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card } from '../../../shared/ui/index.ts';
import { playSound } from '../../../shared/sound.ts';
import type { CharadesTeams } from './GameScreen.tsx';

interface TeamsPhaseProps {
  onStart: (teams: CharadesTeams) => void;
  onBack: () => void;
}

const TEAM_LETTERS = ['A', 'B', 'C', 'D'];
const TEAM_COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#dc2626'];

export default function TeamsPhase({ onStart, onBack }: TeamsPhaseProps) {
  const { t } = useI18n();
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(['', '', '', '']);
  const [rounds, setRounds] = useState<number | null>(5);

  const defaultName = (i: number): string =>
    `${t('charades.team')} ${TEAM_LETTERS[i] ?? String(i + 1)}`;

  const setName = (i: number, value: string): void => {
    setNames((prev) => prev.map((n, j) => (j === i ? value : n)));
  };

  const handleStart = (): void => {
    playSound('click');
    const raw = names
      .slice(0, count)
      .map((n, i) => n.trim() || defaultName(i));
    // Guarantee unique names for the scoreboard/result lines.
    const seen = new Set<string>();
    const finalNames = raw.map((n) => {
      let name = n;
      let k = 2;
      while (seen.has(name)) {
        name = `${n} ${k}`;
        k += 1;
      }
      seen.add(name);
      return name;
    });
    onStart({ names: finalNames, rounds });
  };

  const segBtn = (
    pressed: boolean,
    onClick: () => void,
    label: string,
    key: string,
  ) => (
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
      <h1 className="ch-title">🎭 {t('charades.teams')}</h1>

      <Card>
        <span className="ch-section-label">{t('charades.teamCount')}</span>
        <div className="ch-segmented">
          {[2, 3, 4].map((n) =>
            segBtn(count === n, () => setCount(n), String(n), `count-${n}`),
          )}
        </div>
      </Card>

      <Card>
        <span className="ch-section-label">{t('charades.teamName')}</span>
        <div className="ch-teams-list">
          {Array.from({ length: count }, (_, i) => (
            <div className="ch-team-row" key={i}>
              <span
                className="ch-team-dot"
                style={{
                  background: TEAM_COLORS[i % TEAM_COLORS.length],
                }}
              />
              <input
                value={names[i] ?? ''}
                placeholder={defaultName(i)}
                aria-label={`${t('charades.teamName')} ${i + 1}`}
                maxLength={24}
                onChange={(e) => setName(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <span className="ch-section-label">{t('charades.rounds')}</span>
        <div className="ch-segmented">
          {segBtn(rounds === 5, () => setRounds(5), '5', 'r5')}
          {segBtn(rounds === 10, () => setRounds(10), '10', 'r10')}
          {segBtn(
            rounds === null,
            () => setRounds(null),
            t('charades.unlimited'),
            'rinf',
          )}
        </div>
      </Card>

      <Button size="lg" fullWidth onClick={handleStart}>
        {t('charades.startGame')}
      </Button>
      <Button variant="ghost" fullWidth onClick={onBack}>
        {t('common.back')}
      </Button>
    </div>
  );
}
