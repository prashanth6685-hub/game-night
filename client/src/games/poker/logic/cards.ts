// Poker deck primitives for Texas Hold'em Practice Mode.
// Pure logic — no React, no DOM. Tested in cards.test.ts.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

/** A playing card. rank: 2..14 (11=J, 12=Q, 13=K, 14=A). */
export interface Card {
  readonly rank: number;
  readonly suit: Suit;
}

const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

const RANK_LABELS: readonly string[] = [
  '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
];

/** A standard 52-card deck, ordered by suit then rank. */
export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

/**
 * Fisher–Yates shuffle. Returns a NEW array; the input is never mutated.
 * Accepts an injectable RNG so tests can run deterministically.
 */
export function shuffle(deck: readonly Card[], random: () => number = Math.random): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as Card;
    const b = out[j] as Card;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Human rank label: '2'..'10','J','Q','K','A'. */
export function rankLabel(rank: number): string {
  return RANK_LABELS[rank - 2] ?? String(rank);
}

/** Unicode suit symbol. */
export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spades':
      return '♠';
    case 'hearts':
      return '♥';
    case 'diamonds':
      return '♦';
    case 'clubs':
      return '♣';
  }
}

/** True for hearts and diamonds. */
export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** Compact card name, e.g. 'As', 'Td', '7h' (10 uses the single-char 'T'). */
export function cardName(card: Card): string {
  const suitCode: Record<Suit, string> = { spades: 's', hearts: 'h', diamonds: 'd', clubs: 'c' };
  const short = card.rank === 10 ? 'T' : rankLabel(card.rank);
  return `${short}${suitCode[card.suit]}`;
}
