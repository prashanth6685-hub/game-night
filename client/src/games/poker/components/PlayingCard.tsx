// A single playing card (face-up) or a patterned card back (face-down).
// Pure CSS — no images. Face-up shows rank+suit in the top-left and
// bottom-right (rotated) corners with a large center suit pip.
import { useI18n } from '../../../i18n/index.ts';
import type { Card } from '../logic/cards.ts';
import { cardName, isRed, rankLabel, suitSymbol } from '../logic/cards.ts';

export interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
}

export function PlayingCard({ card, faceDown = false, small = false }: PlayingCardProps) {
  const { t } = useI18n();
  const cls = `pk-card${small ? ' pk-card-sm' : ''}`;

  if (faceDown || !card) {
    return (
      <div className={`${cls} pk-card-back`} aria-label={t('poker.faceDownCard')}>
        <span className="pk-back-motif" aria-hidden="true">
          ♠
        </span>
      </div>
    );
  }

  const red = isRed(card.suit);
  const rank = rankLabel(card.rank);
  const suit = suitSymbol(card.suit);
  return (
    <div
      className={`${cls}${red ? ' pk-card-red' : ' pk-card-black'}`}
      aria-label={cardName(card)}
      role="img"
    >
      <span className="pk-corner pk-corner-tl" aria-hidden="true">
        {rank}
        {suit}
      </span>
      <span className="pk-pip" aria-hidden="true">
        {suit}
      </span>
      <span className="pk-corner pk-corner-br" aria-hidden="true">
        {rank}
        {suit}
      </span>
    </div>
  );
}
