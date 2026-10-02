// Renders one 3×9 Tambola ticket. Numbers already called are highlighted
// automatically (host-verified marking — players don't tap cells).
// `outline` marks the cells relevant to a claim in the verify view.

import type { Ticket } from '../../../../../shared/tambola/ticket.ts';
import type { PatternCell } from '../../../../../shared/tambola/patterns.ts';

interface TicketCardProps {
  ticket: Ticket;
  called: Set<number>;
  outline?: PatternCell[];
  label?: string;
}

export function TicketCard({ ticket, called, outline, label }: TicketCardProps) {
  const outlineKeys = new Set((outline ?? []).map((c) => `${c.r},${c.c}`));
  return (
    <div className="tm-ticket">
      {label ? <div className="tm-ticket__label">{label}</div> : null}
      {ticket.map((row, r) => (
        <div className="tm-ticket__row" key={r}>
          {row.map((v, c) => {
            const marked = v !== null && called.has(v);
            const outlined = outlineKeys.has(`${r},${c}`);
            const cls =
              'tm-cell' +
              (v === null ? ' tm-cell--empty' : '') +
              (marked ? ' tm-cell--marked' : '') +
              (outlined ? ' tm-cell--outline' : '');
            return (
              <div className={cls} key={c}>
                {v ?? ''}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
