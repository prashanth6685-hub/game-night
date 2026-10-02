// Setup phase: player count (2–20), tickets per player (1–3),
// winning-pattern toggles (all on by default), auto-call interval.

import { useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card } from '../../../shared/ui/index.ts';
import { PATTERNS } from '../logic/patterns.ts';
import type { PatternId } from '../logic/patterns.ts';

export type TambolaMode = 'same-device' | 'multi-phone';

export interface TambolaSetup {
  mode: TambolaMode;
  playerCount: number;
  ticketsPerPlayer: number;
  enabled: PatternId[];
  intervalSec: number;
}

interface SetupScreenProps {
  onStart: (cfg: TambolaSetup) => void;
}

const INTERVALS = [3, 5, 10, 15];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 20;
const MIN_TICKETS = 1;
const MAX_TICKETS = 3;

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}): JSX.Element {
  return (
    <div className="tm-stepper">
      <span className="tm-stepper__label">{label}</span>
      <div className="tm-stepper__controls">
        <button
          type="button"
          className="tm-stepper__btn"
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <span className="tm-stepper__value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="tm-stepper__btn"
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<TambolaMode>('same-device');
  const [playerCount, setPlayerCount] = useState(4);
  const [ticketsPerPlayer, setTicketsPerPlayer] = useState(1);
  const [enabled, setEnabled] = useState<Record<PatternId, boolean>>({
    'early-five': true,
    'top-line': true,
    'middle-line': true,
    'bottom-line': true,
    'four-corners': true,
    'full-house': true,
  });
  const [intervalSec, setIntervalSec] = useState(5);

  const toggle = (id: PatternId): void => {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="tm">
      <Card title={t('tambola.setupTitle')}>
        <div className="tm-setup">
          <div className="tm-claim__label">{t('tambola.modeLabel')}</div>
          <div className="tmq-mode" role="radiogroup" aria-label={t('tambola.modeLabel')}>
            <label className={'tmq-mode__card' + (mode === 'same-device' ? ' tmq-mode__card--on' : '')}>
              <input
                type="radio"
                name="tm-mode"
                checked={mode === 'same-device'}
                onChange={() => setMode('same-device')}
              />
              <span className="tmq-mode__icon" aria-hidden>
                📱
              </span>
              <span className="tmq-mode__name">{t('tambola.modeSameDevice')}</span>
              <span className="tmq-mode__desc">{t('tambola.modeSameDeviceDesc')}</span>
            </label>
            <label className={'tmq-mode__card' + (mode === 'multi-phone' ? ' tmq-mode__card--on' : '')}>
              <input
                type="radio"
                name="tm-mode"
                checked={mode === 'multi-phone'}
                onChange={() => setMode('multi-phone')}
              />
              <span className="tmq-mode__icon" aria-hidden>
                📲
              </span>
              <span className="tmq-mode__name">{t('tambola.modeMultiPhone')}</span>
              <span className="tmq-mode__desc">{t('tambola.modeMultiPhoneDesc')}</span>
            </label>
          </div>
          {mode === 'same-device' ? (
            <>
              <Stepper
                label={t('tambola.players')}
                value={playerCount}
                min={MIN_PLAYERS}
                max={MAX_PLAYERS}
                onChange={setPlayerCount}
                decreaseLabel={t('tambola.stepperDecrease')}
                increaseLabel={t('tambola.stepperIncrease')}
              />
              <Stepper
                label={t('tambola.ticketsPerPlayer')}
                value={ticketsPerPlayer}
                min={MIN_TICKETS}
                max={MAX_TICKETS}
                onChange={setTicketsPerPlayer}
                decreaseLabel={t('tambola.stepperDecrease')}
                increaseLabel={t('tambola.stepperIncrease')}
              />
            </>
          ) : null}
          <div className="tm-claim__label">{t('tambola.patternsLabel')}</div>
          <div className="tm-checklist">
            {PATTERNS.map((p) => (
              <label key={p.id} className="tm-check">
                <input
                  type="checkbox"
                  checked={enabled[p.id] ?? false}
                  onChange={() => toggle(p.id)}
                />
                <span>{t(p.nameKey)}</span>
              </label>
            ))}
          </div>
          <div className="tm-claim__label">{t('tambola.intervalLabel')}</div>
          <select
            className="tm-select"
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
          >
            {INTERVALS.map((s) => (
              <option key={s} value={s}>
                {t('tambola.intervalSeconds').replace('{n}', String(s))}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() =>
              onStart({
                mode,
                playerCount,
                ticketsPerPlayer,
                enabled: PATTERNS.map((p) => p.id).filter((id) => enabled[id]),
                intervalSec,
              })
            }
          >
            {mode === 'multi-phone' ? t('tambola.createRoom') : t('tambola.startGame')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
