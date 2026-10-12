// The poker table: oval emerald felt, community cards, pot display,
// and seats positioned around the ellipse (human seat 0 at bottom-center).
import { useI18n } from '../../../i18n/index.ts';
import { Avatar } from '../../../shared/ui/index.ts';
import type { PokerState } from '../logic/engine.ts';
import { potTotal } from '../logic/engine.ts';
import { PlayingCard } from './PlayingCard.tsx';

export interface PokerTableProps {
  state: PokerState;
  sbSeat: number | null;
  bbSeat: number | null;
  thinkingSeat: number | null;
  rankName: (handName: string) => string;
}

function fmt(template: string, vars: Record<string, string | number>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Seat center as % of the felt, seat 0 at bottom-center, rest clockwise. */
function seatPos(seat: number, count: number): { left: string; top: string } {
  const rad = ((90 + (seat * 360) / count) * Math.PI) / 180;
  const x = 50 + 41 * Math.cos(rad);
  const y = 52 + 39 * Math.sin(rad);
  return { left: `${x.toFixed(2)}%`, top: `${y.toFixed(2)}%` };
}

export function PokerTable({ state, sbSeat, bbSeat, thinkingSeat, rankName }: PokerTableProps) {
  const { t } = useI18n();
  const complete = state.street === 'complete';
  const total = potTotal(state);
  const n = state.players.length;

  const winnerSeats = new Set<number>();
  for (const w of state.winners) {
    for (const s of w.winnerSeats) winnerSeats.add(s);
  }

  return (
    <div className="pk-table-wrap">
      <div className="pk-felt" role="img" aria-label={t('poker.playTitle')}>
        {/* Pot + community cards, centered */}
        <div className="pk-center">
          <div className="pk-pot" aria-live="polite">
            {complete && state.winners.length > 0 ? (
              <ul className="pk-pot-list">
                {state.winners.map((w) => {
                  const names = w.winnerSeats
                    .map((s) => state.players[s]?.name ?? '')
                    .filter((x) => x !== '')
                    .join(', ');
                  const label =
                    state.winners.length > 1
                      ? fmt(t('poker.sidePot'), { n: w.potIndex + 1 })
                      : t('poker.pot');
                  return (
                    <li key={w.potIndex} className="pk-pot-win">
                      🏆 {label}: {names} +{w.amount}{' '}
                      <span className="pk-pot-hand">({rankName(w.handName)})</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <span className="pk-pot-current">
                {t('poker.pot')}: <strong>{total}</strong>
              </span>
            )}
          </div>
          <div className="pk-community">
            {Array.from({ length: 5 }, (_, i) => {
              const c = state.community[i];
              return c ? (
                <PlayingCard key={`${i}-${c.rank}-${c.suit}`} card={c} />
              ) : (
                <div key={i} className="pk-card pk-card-empty" aria-hidden="true" />
              );
            })}
          </div>
        </div>

        {/* Seats around the ellipse */}
        {state.players.map((p) => {
          const pos = seatPos(p.seat, n);
          const isActor = !complete && state.actorSeat === p.seat;
          const isWinner = complete && winnerSeats.has(p.seat);
          const revealed = complete && !p.folded && p.hole.length === 2;
          const seatCls = [
            'pk-seat',
            isActor ? 'pk-seat-active' : '',
            p.folded ? 'pk-seat-folded' : '',
            isWinner ? 'pk-seat-winner' : '',
            p.eliminated ? 'pk-seat-out' : '',
          ]
            .filter((c) => c !== '')
            .join(' ');
          return (
            <div key={p.seat} className={seatCls} style={pos}>
              <div className="pk-seat-badges">
                {p.seat === state.button && (
                  <span className="pk-badge pk-badge-dealer" title={t('poker.dealer')}>
                    D
                  </span>
                )}
                {p.seat === sbSeat && <span className="pk-badge pk-badge-blind">SB</span>}
                {p.seat === bbSeat && <span className="pk-badge pk-badge-blind">BB</span>}
              </div>
              <Avatar name={p.name} size={38} />
              <div className="pk-seat-name">
                {p.isBot && <span className="pk-bot-badge">🤖</span>}
                <span className="pk-seat-name-text">{p.name}</span>
              </div>
              <div className="pk-seat-chips">⛁ {p.chips}</div>
              {p.bet > 0 && <div className="pk-seat-bet">🪙 {p.bet}</div>}
              <div className="pk-seat-cards">
                {p.hole.length === 2 ? (
                  p.seat === 0 || revealed ? (
                    <>
                      <PlayingCard card={p.hole[0]} small />
                      <PlayingCard card={p.hole[1]} small />
                    </>
                  ) : (
                    <>
                      <PlayingCard faceDown small />
                      <PlayingCard faceDown small />
                    </>
                  )
                ) : null}
              </div>
              {thinkingSeat === p.seat && (
                <div className="pk-thinking" aria-live="polite">
                  {t('poker.thinking')}
                </div>
              )}
              {isWinner && revealed && (
                <div className="pk-seat-hand">
                  {rankName(
                    state.showdown?.find((s) => s.seat === p.seat)?.handName ?? 'high-card',
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
