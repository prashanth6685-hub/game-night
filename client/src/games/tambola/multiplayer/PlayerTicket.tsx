// Player's ticket view for multi-phone Tambola: their own ticket only.
// Called numbers auto-highlight (green + ✓, never color alone); the player
// taps any number to dab it (their own mark, gold ring). Big touch targets.

import type { Ticket } from '../../../../../shared/tambola/ticket.ts';
import type { PatternId } from '../../../../../shared/tambola/patterns.ts';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Card } from '../../../shared/ui/index.ts';

function patternNameKey(id: PatternId): string {
  switch (id) {
    case 'early-five':
      return 'tambola.patterns.earlyFive';
    case 'top-line':
      return 'tambola.patterns.topLine';
    case 'middle-line':
      return 'tambola.patterns.middleLine';
    case 'bottom-line':
      return 'tambola.patterns.bottomLine';
    case 'four-corners':
      return 'tambola.patterns.fourCorners';
    case 'full-house':
      return 'tambola.patterns.fullHouse';
  }
}

interface PlayerTicketProps {
  playerName: string;
  code: string;
  ticket: Ticket;
  called: Set<number>;
  dabbed: Set<number>;
  calledCount: number;
  enabledPatterns: PatternId[];
  approvedPatterns: Set<PatternId>;
  pendingPattern: PatternId | null;
  winners: { playerName: string; pattern: PatternId }[];
  onToggle: (n: number) => void;
  onClaim: (p: PatternId) => void;
}

export function PlayerTicket({
  playerName,
  code,
  ticket,
  called,
  dabbed,
  calledCount,
  enabledPatterns,
  approvedPatterns,
  pendingPattern,
  winners,
  onToggle,
  onClaim,
}: PlayerTicketProps): JSX.Element {
  const { t } = useI18n();
  const claimable = enabledPatterns.filter(
    (p) => !approvedPatterns.has(p) && pendingPattern !== p,
  );

  return (
    <div className="tm">
      <Card>
        <div className="tmq-playerhead">
          <div>
            <div className="tmq-playerhead__name">{playerName}</div>
            <div className="tm-muted">
              {t('tambola.roomCodeLabel')}: <strong>{code}</strong>
            </div>
          </div>
          <div
            className="tm-count"
            aria-live="polite"
            aria-label={t('tambola.calledOfN').replace('{called}', String(calledCount))}
          >
            <strong>{calledCount}</strong> / 90
          </div>
        </div>
        <p className="tm-muted">{t('tambola.dabHint')}</p>
      </Card>

      <Card title={t('tambola.yourTicketLabel')}>
        <div className="tm-ticket tmq-ticket" role="group" aria-label={t('tambola.yourTicketLabel')}>
          {ticket.map((row, r) => (
            <div className="tm-ticket__row" key={r}>
              {row.map((v, c) => {
                if (v === null) {
                  return <div className="tm-cell tm-cell--empty" key={c} aria-hidden />;
                }
                const isCalled = called.has(v);
                const isDabbed = dabbed.has(v);
                const cls =
                  'tm-cell tmq-cell' +
                  (isCalled ? ' tmq-cell--called' : '') +
                  (isDabbed ? ' tmq-cell--dabbed' : '');
                const label = isDabbed
                  ? t('tambola.cellDabbed').replace('{n}', String(v))
                  : isCalled
                    ? t('tambola.cellCalled').replace('{n}', String(v))
                    : t('tambola.cellUncalled').replace('{n}', String(v));
                return (
                  <button
                    type="button"
                    key={c}
                    className={cls}
                    aria-pressed={isDabbed}
                    aria-label={label}
                    onClick={() => onToggle(v)}
                  >
                    {isCalled ? (
                      <span className="tmq-cell__check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                    <span>{v}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="tmq-legend" aria-hidden>
          <span className="tmq-legend__item tmq-legend__item--called">✓ {t('tambola.legendCalled')}</span>
          <span className="tmq-legend__item tmq-legend__item--dabbed">◉ {t('tambola.legendDabbed')}</span>
        </div>
      </Card>

      <Card title={t('tambola.claimWin')}>
        {pendingPattern ? (
          <p className="tmq-pending" aria-live="polite">
            ⏳ {t('tambola.claimPendingMsg').replace('{pattern}', t(patternNameKey(pendingPattern)))}
          </p>
        ) : claimable.length === 0 ? (
          <p className="tm-muted">{t('tambola.noClaimable')}</p>
        ) : (
          <div className="tmq-claims">
            {claimable.map((p) => (
              <Button key={p} variant="success" size="lg" onClick={() => onClaim(p)}>
                🎉 {t(patternNameKey(p))}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {winners.length > 0 ? (
        <Card title={t('tambola.claimedWins')}>
          <ul className="tm-claims">
            {winners.map((w, i) => (
              <li key={i} className="tm-claims__item">
                <span>{t(patternNameKey(w.pattern))}</span>
                <strong>{w.playerName}</strong>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
