// Claim flow dialog: pick a pattern + ticket, verify it against the called
// numbers, then Approve or Reject. Claimed patterns are locked by the parent
// (they are passed in via `available`, which excludes them).

import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/index.ts';
import { Button, Modal } from '../../../shared/ui/index.ts';
import { checkPattern, patternCells } from '../logic/patterns.ts';
import type { PatternId } from '../logic/patterns.ts';
import type { Ticket } from '../logic/ticket.ts';
import { TicketCard } from './TicketCard.tsx';

export interface ClaimInput {
  playerIndex: number;
  ticketIndex: number;
  pattern: PatternId;
}

interface ClaimDialogProps {
  open: boolean;
  onClose: () => void;
  /** Enabled patterns, in display order. */
  enabled: PatternId[];
  /** Patterns already claimed (locked). */
  claimed: Set<PatternId>;
  playerCount: number;
  tickets: Ticket[][];
  called: Set<number>;
  onApprove: (claim: ClaimInput) => void;
  onReject: () => void;
}

type Step = 'choose' | 'verify';

function nameKeyFor(id: PatternId): string {
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

export function ClaimDialog({
  open,
  onClose,
  enabled,
  claimed,
  playerCount,
  tickets,
  called,
  onApprove,
  onReject,
}: ClaimDialogProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('choose');
  const [pattern, setPattern] = useState<PatternId | null>(null);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [ticketIndex, setTicketIndex] = useState(0);

  const resetAndClose = (): void => {
    setStep('choose');
    setPattern(null);
    setPlayerIndex(0);
    setTicketIndex(0);
    onClose();
  };

  const playerTickets = tickets[playerIndex] ?? [];
  const ticket = playerTickets[ticketIndex];
  const allClaimed = enabled.every((id) => claimed.has(id));
  const valid =
    pattern !== null &&
    !claimed.has(pattern) &&
    ticket !== undefined &&
    checkPattern(ticket, called, pattern);
  const outline = useMemo(
    () => (pattern && ticket ? patternCells(ticket, pattern) : []),
    [pattern, ticket],
  );

  const playerName = (i: number): string =>
    t('tambola.playerName').replace('{n}', String(i + 1));
  const ticketLabel = (i: number): string =>
    t('tambola.ticketLabel').replace('{n}', String(i + 1));

  const canVerify = pattern !== null && ticket !== undefined;

  return (
    <Modal open={open} onClose={resetAndClose} title={t('tambola.claimWin')}>
      {allClaimed ? (
        <p>{t('tambola.allPatternsClaimed')}</p>
      ) : step === 'choose' ? (
        <div className="tm-claim">
          <div className="tm-claim__label">{t('tambola.choosePattern')}</div>
          <div className="tm-checklist" role="radiogroup">
            {enabled.map((id) => {
              const isClaimed = claimed.has(id);
              return (
                <label
                  key={id}
                  className={'tm-check' + (isClaimed ? ' tm-check--locked' : '')}
                >
                  <input
                    type="radio"
                    name="tm-pattern"
                    disabled={isClaimed}
                    checked={pattern === id}
                    onChange={() => setPattern(id)}
                  />
                  <span>
                    {t(nameKeyFor(id))}
                    {isClaimed ? ` · ${t('tambola.claimLocked')}` : ''}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="tm-claim__label">{t('tambola.chooseTicket')}</div>
          <div className="tm-row">
            <select
              className="tm-select"
              aria-label={t('tambola.players')}
              value={playerIndex}
              onChange={(e) => {
                setPlayerIndex(Number(e.target.value));
                setTicketIndex(0);
              }}
            >
              {Array.from({ length: playerCount }, (_, i) => (
                <option key={i} value={i}>
                  {playerName(i)}
                </option>
              ))}
            </select>
            <div className="tm-row">
              {playerTickets.map((_, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={ticketIndex === i ? 'primary' : 'secondary'}
                  onClick={() => setTicketIndex(i)}
                >
                  {ticketLabel(i)}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            fullWidth
            disabled={!canVerify}
            onClick={() => setStep('verify')}
          >
            {t('tambola.verify')}
          </Button>
        </div>
      ) : (
        <div className="tm-claim">
          <div className="tm-claim__label">{t('tambola.verifyClaim')}</div>
          <p className="tm-claim__sub">
            {pattern ? t(nameKeyFor(pattern)) : ''} · {playerName(playerIndex)} ·{' '}
            {ticketLabel(ticketIndex)}
          </p>
          {ticket ? (
            <TicketCard ticket={ticket} called={called} outline={outline} />
          ) : null}
          <p className={valid ? 'tm-valid' : 'tm-invalid'}>
            {valid ? t('tambola.validClaim') : t('tambola.invalidClaim')}
          </p>
          <div className="tm-row">
            <Button
              variant="success"
              fullWidth
              disabled={!valid || pattern === null}
              onClick={() => {
                if (pattern !== null) {
                  onApprove({ playerIndex, ticketIndex, pattern });
                  resetAndClose();
                }
              }}
            >
              {t('tambola.approve')}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                onReject();
                resetAndClose();
              }}
            >
              {t('tambola.reject')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
