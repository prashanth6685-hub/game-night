// Human action panel: fold / check-or-call / bet-or-raise / all-in,
// with an amount picker (slider + input + quick-set chips) for bets/raises.
import { useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button } from '../../../shared/ui/index.ts';
import type { LegalAction, PokerAction } from '../logic/engine.ts';

export interface ActionPanelProps {
  legal: LegalAction[];
  onAction: (a: PokerAction) => void;
  pot: number;
  disabled?: boolean;
}

type AmountKind = 'bet' | 'raise';

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function find<T extends LegalAction['type']>(
  legal: readonly LegalAction[],
  type: T,
): Extract<LegalAction, { type: T }> | undefined {
  for (const a of legal) {
    if (a.type === type) return a as Extract<LegalAction, { type: T }>;
  }
  return undefined;
}

export function ActionPanel({ legal, onAction, pot, disabled = false }: ActionPanelProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<AmountKind | null>(null);
  const [amount, setAmount] = useState(0);

  const fold = find(legal, 'fold');
  const check = find(legal, 'check');
  const call = find(legal, 'call');
  const bet = find(legal, 'bet');
  const raise = find(legal, 'raise');
  const allIn = find(legal, 'all-in');

  const lo = mode === 'bet' ? (bet?.min ?? 0) : (raise?.minTo ?? 0);
  const hi = mode === 'bet' ? (bet?.max ?? 0) : (raise?.maxTo ?? 0);

  function openMode(kind: AmountKind): void {
    setMode(kind);
    setAmount(kind === 'bet' ? (bet?.min ?? 0) : (raise?.minTo ?? 0));
  }

  function clampAmount(v: number): number {
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, Math.round(v)));
  }

  function quickSet(frac: number): void {
    setAmount(clampAmount(pot * frac));
  }

  function confirm(): void {
    if (mode === 'bet') onAction({ type: 'bet', amount: clampAmount(amount) });
    else if (mode === 'raise') onAction({ type: 'raise', amount: clampAmount(amount) });
    setMode(null);
  }

  return (
    <div className="pk-actions" aria-label={t('poker.playTitle')}>
      {call && (
        <div className="pk-tocall">{fmt(t('poker.toCall'), { amount: call.amount })}</div>
      )}
      <div className="pk-btn-row">
        {fold && (
          <Button variant="ghost" size="lg" disabled={disabled} onClick={() => onAction({ type: 'fold' })}>
            {t('poker.action_fold')}
          </Button>
        )}
        {check ? (
          <Button variant="primary" size="lg" disabled={disabled} onClick={() => onAction({ type: 'check' })}>
            {t('poker.action_check')}
          </Button>
        ) : (
          call && (
            <Button variant="primary" size="lg" disabled={disabled} onClick={() => onAction({ type: 'call' })}>
              {fmt(t('poker.action_call'), { amount: call.amount })}
            </Button>
          )
        )}
        {bet ? (
          <Button
            variant="secondary"
            size="lg"
            disabled={disabled}
            onClick={() => (mode === 'bet' ? setMode(null) : openMode('bet'))}
          >
            {t('poker.action_bet')}
          </Button>
        ) : (
          raise && (
            <Button
              variant="secondary"
              size="lg"
              disabled={disabled}
              onClick={() => (mode === 'raise' ? setMode(null) : openMode('raise'))}
            >
              {t('poker.action_raise')}
            </Button>
          )
        )}
        {allIn && (
          <Button variant="danger" size="lg" disabled={disabled} onClick={() => onAction({ type: 'all-in' })}>
            {t('poker.action_allin')}
          </Button>
        )}
      </div>

      {mode && (
        <div className="pk-amount">
          <div className="pk-amount-head">
            <span className="pk-amount-label">
              {mode === 'bet' ? t('poker.betAmount') : t('poker.raiseAmount')}
            </span>
            <span className="pk-amount-range">
              {fmt(t('poker.minLabel'), { amount: lo })} · {fmt(t('poker.maxLabel'), { amount: hi })}
            </span>
          </div>
          <div className="pk-amount-row">
            <input
              type="range"
              className="pk-slider"
              min={lo}
              max={hi}
              step={1}
              value={clampAmount(amount)}
              disabled={disabled}
              aria-label={mode === 'bet' ? t('poker.betAmount') : t('poker.raiseAmount')}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <input
              type="number"
              className="pk-number"
              min={lo}
              max={hi}
              value={clampAmount(amount)}
              disabled={disabled}
              aria-label={mode === 'bet' ? t('poker.betAmount') : t('poker.raiseAmount')}
              onChange={(e) => setAmount(clampAmount(Number(e.target.value)))}
            />
          </div>
          <div className="pk-amount-row">
            <Button variant="secondary" size="sm" disabled={disabled} onClick={() => quickSet(0.5)}>
              {t('poker.halfPot')}
            </Button>
            <Button variant="secondary" size="sm" disabled={disabled} onClick={() => quickSet(1)}>
              {t('poker.fullPot')}
            </Button>
            <Button variant="primary" size="md" disabled={disabled} onClick={confirm}>
              {mode === 'bet'
                ? fmt(t('poker.confirmBet'), { amount: clampAmount(amount) })
                : fmt(t('poker.confirmRaise'), { amount: clampAmount(amount) })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
