// Pure Ludo game logic — framework-free, no React imports.
// Board model (classic rules):
// - 2-4 players, 4 tokens each.
// - Token progress: -1 = in base, 0..50 = main track (relative to the
//   player's start square), 51..56 = 6-cell home stretch, 57 = finished.
// - Roll a 6 to leave base. Exact roll needed to finish (progress <= 57).
// - 52-cell main track. Safe squares (no captures): each player's start
//   square + 4 star squares. Landing on an opponent's token elsewhere
//   captures it (back to base).
// - Extra turn on rolling a 6; three consecutive sixes forfeits the turn.
// - First player to bring all 4 tokens home wins.

export const TRACK_LEN = 52;
export const TOKENS_PER_PLAYER = 4;
export const BASE = -1;
export const FINISHED = 57;
export const MAX_TRACK_PROGRESS = 50;
export const HOME_START = 51; // first home-stretch progress value

/** Absolute track squares where captures never happen. */
export const SAFE_SQUARES: ReadonlySet<number> = new Set([
  0, 13, 26, 39, // player start squares
  8, 21, 34, 47, // star squares
]);

/** Absolute track square where each seat's progress 0 sits. */
export const START_OFFSETS = [0, 13, 26, 39] as const;

/** Seat colors in classic order: red, green, yellow, blue. */
export const PLAYER_COLORS = ['#ef4444', '#22c55e', '#eab308', '#3b82f6'] as const;

export interface LudoPlayer {
  name: string;
  color: string;
  isBot: boolean;
  /** 4 token progress values: -1 base, 0..50 track, 51..56 home, 57 finished */
  tokens: number[];
}

export interface LudoState {
  players: LudoPlayer[];
  turn: number;
  winner: number | null;
  /** sixes rolled in the current turn streak (for the three-sixes rule) */
  consecutiveSixes: number;
}

export interface LudoMove {
  token: number;
  from: number;
  to: number;
}

export type LudoEvent =
  | 'leave-base'
  | 'capture'
  | 'token-home'
  | 'safe-landing'
  | 'win';

export interface ApplyResult {
  state: LudoState;
  events: LudoEvent[];
  extraTurn: boolean;
  /** seats that lost at least one token to a capture in this move */
  capturedPlayers: number[];
}

/** Absolute track square (0..51) for a seat's track progress (0..50). */
export function absoluteSquare(playerIdx: number, progress: number): number {
  const offset = START_OFFSETS[playerIdx] ?? 0;
  return (offset + progress) % TRACK_LEN;
}

/** Roll a die. Pass an rng in tests for determinism. */
export function rollDice(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 6);
}

/**
 * Create a game. `names` has 2-4 entries; `bots[i]` marks seat i as computer.
 * The starting player is picked with `rng` (deterministic in tests).
 */
export function createGame(
  names: string[],
  bots: boolean[] = [],
  rng: () => number = Math.random,
): LudoState {
  if (names.length < 2 || names.length > 4) {
    throw new Error(`ludo needs 2-4 players, got ${names.length}`);
  }
  const players: LudoPlayer[] = names.map((name, i) => ({
    name,
    color: PLAYER_COLORS[i] ?? '#888888',
    isBot: bots[i] ?? false,
    tokens: [BASE, BASE, BASE, BASE],
  }));
  return {
    players,
    turn: Math.floor(rng() * players.length),
    winner: null,
    consecutiveSixes: 0,
  };
}

/** True when this roll is the third consecutive six: the turn is forfeited. */
export function isForfeit(state: LudoState, roll: number): boolean {
  return roll === 6 && state.consecutiveSixes >= 2;
}

/** All legal token moves for a roll. Empty when nothing can move (or forfeit). */
export function legalMoves(
  state: LudoState,
  playerIdx: number,
  roll: number,
): LudoMove[] {
  if (isForfeit(state, roll)) return [];
  const player = state.players[playerIdx];
  if (!player) return [];
  const moves: LudoMove[] = [];
  player.tokens.forEach((t, i) => {
    if (t === BASE) {
      if (roll === 6) moves.push({ token: i, from: BASE, to: 0 });
    } else if (t >= 0 && t < FINISHED) {
      if (t + roll <= FINISHED) moves.push({ token: i, from: t, to: t + roll });
    }
  });
  return moves;
}

/** How many opponent tokens this move would capture (0 when it can't). */
export function capturesFor(
  state: LudoState,
  playerIdx: number,
  move: LudoMove,
): number {
  if (move.to < 0 || move.to > MAX_TRACK_PROGRESS) return 0;
  const abs = absoluteSquare(playerIdx, move.to);
  if (SAFE_SQUARES.has(abs)) return 0;
  let n = 0;
  state.players.forEach((p, pi) => {
    if (pi === playerIdx) return;
    p.tokens.forEach((t) => {
      if (t >= 0 && t <= MAX_TRACK_PROGRESS && absoluteSquare(pi, t) === abs) {
        n += 1;
      }
    });
  });
  return n;
}

/** True when landing on `progress` can never be captured. */
export function isSafeLanding(playerIdx: number, progress: number): boolean {
  if (progress === BASE || progress === FINISHED) return true;
  if (progress >= HOME_START) return true; // home stretch is safe
  if (progress < 0) return true;
  return SAFE_SQUARES.has(absoluteSquare(playerIdx, progress));
}

/**
 * True when a token sitting on `progress` could be captured by an opponent
 * on their next turn (an opponent token 1-6 squares behind on the track).
 */
export function isDangerous(
  state: LudoState,
  playerIdx: number,
  progress: number,
): boolean {
  if (progress < 0 || progress > MAX_TRACK_PROGRESS) return false;
  const abs = absoluteSquare(playerIdx, progress);
  if (SAFE_SQUARES.has(abs)) return false;
  return state.players.some((p, pi) => {
    if (pi === playerIdx) return false;
    return p.tokens.some((t) => {
      if (t < 0 || t > MAX_TRACK_PROGRESS) return false;
      const behind = (abs - absoluteSquare(pi, t) + TRACK_LEN) % TRACK_LEN;
      return behind >= 1 && behind <= 6;
    });
  });
}

/** Apply a legal move. Returns the next state, events, and extra-turn flag. */
export function applyMove(
  state: LudoState,
  playerIdx: number,
  move: LudoMove,
  roll: number,
): ApplyResult {
  const mover = state.players[playerIdx];
  if (!mover) {
    return { state, events: [], extraTurn: false, capturedPlayers: [] };
  }
  const events: LudoEvent[] = [];
  const movedTokens = mover.tokens.map((t, i) =>
    i === move.token ? move.to : t,
  );

  if (move.from === BASE) events.push('leave-base');
  if (move.to === FINISHED) {
    events.push('token-home');
  } else if (
    move.to >= 0 &&
    move.to <= MAX_TRACK_PROGRESS &&
    SAFE_SQUARES.has(absoluteSquare(playerIdx, move.to))
  ) {
    events.push('safe-landing');
  }

  const landingAbs =
    move.to >= 0 && move.to <= MAX_TRACK_PROGRESS
      ? absoluteSquare(playerIdx, move.to)
      : -1;
  const canCapture = landingAbs >= 0 && !SAFE_SQUARES.has(landingAbs);
  let captured = 0;
  const capturedPlayers: number[] = [];
  const players = state.players.map((p, pi) => {
    if (pi === playerIdx) return { ...p, tokens: movedTokens };
    if (!canCapture) return p;
    const next = p.tokens.map((t) =>
      t >= 0 && t <= MAX_TRACK_PROGRESS && absoluteSquare(pi, t) === landingAbs
        ? BASE
        : t,
    );
    let lost = 0;
    next.forEach((t, i) => {
      if (t === BASE && p.tokens[i] !== BASE) lost += 1;
    });
    if (lost > 0) {
      captured += lost;
      capturedPlayers.push(pi);
    }
    return { ...p, tokens: next };
  });
  if (captured > 0) events.push('capture');

  const winnerNow = (players[playerIdx]?.tokens ?? []).every(
    (t) => t === FINISHED,
  );
  if (winnerNow) events.push('win');

  const extraTurn = !winnerNow && roll === 6;
  return {
    state: {
      players,
      turn: winnerNow
        ? playerIdx
        : extraTurn
          ? playerIdx
          : (playerIdx + 1) % players.length,
      winner: winnerNow ? playerIdx : null,
      consecutiveSixes: extraTurn ? state.consecutiveSixes + 1 : 0,
    },
    events,
    extraTurn,
    capturedPlayers,
  };
}

/** Third six (or a roll with no legal moves): turn passes, sixes reset. */
export function passTurn(state: LudoState): LudoState {
  return {
    ...state,
    turn: (state.turn + 1) % state.players.length,
    consecutiveSixes: 0,
  };
}

/** Number of finished tokens for a player (for standings). */
export function finishedCount(player: LudoPlayer): number {
  return player.tokens.filter((t) => t === FINISHED).length;
}

/** Total forward progress of a player (for standings tie-breaks). */
export function totalProgress(player: LudoPlayer): number {
  return player.tokens.reduce((sum, t) => sum + (t === BASE ? 0 : t), 0);
}
