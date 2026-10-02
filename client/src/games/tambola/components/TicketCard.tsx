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
    <table className="tm-table" aria-label={label ?? 'ticket'}>
      <tbody>
        {label ? (
          <caption className="tm-ticket__label">{label}</caption>
        ) : null}
        {ticket.map((row, r) => (
          <tr key={r}>
            {row.map((v, c) => {
              const marked = v !== null && called.has(v);
              const outlined = outlineKeys.has(`${r},${c}`);
              const cls =
                'tm-td' +
                (v === null ? ' tm-td--empty' : '') +
                (marked ? ' tm-td--marked' : '') +
                (outlined ? ' tm-td--outline' : '');
              return (
                <td key={c} className={cls}>
                  {v ?? ''}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
