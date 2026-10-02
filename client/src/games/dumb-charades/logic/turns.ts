// Pure turn-rotation, round-counting and scoring helpers for team play.

/** Index of the team that plays after `current`, wrapping around. */
export function nextTeamIndex(current: number, teamCount: number): number {
  if (teamCount <= 0) return 0;
  return (current + 1) % teamCount;
}

/** Full rounds finished once `turnsCompleted` turns have been played. */
export function completedRounds(
  turnsCompleted: number,
  teamCount: number,
): number {
  if (teamCount <= 0) return 0;
  return Math.floor(turnsCompleted / teamCount);
}

/**
 * Whether the game is over. `rounds` is the number of rounds each team gets;
 * null means unlimited (the host ends the game manually).
 */
export function isGameOver(
  turnsCompleted: number,
  teamCount: number,
  rounds: number | null,
): boolean {
  if (rounds === null) return false;
  return completedRounds(turnsCompleted, teamCount) >= rounds;
}

/** Index of the highest-scoring team; ties resolve to the first such team. */
export function winnerIndex(scores: number[]): number {
  let best = 0;
  for (let i = 1; i < scores.length; i++) {
    if ((scores[i] ?? 0) > (scores[best] ?? 0)) best = i;
  }
  return best;
}

/** True when two or more teams share the top score. */
export function isTie(scores: number[]): boolean {
  if (scores.length === 0) return false;
  const top = scores[winnerIndex(scores)] ?? 0;
  return scores.filter((s) => s === top).length > 1;
}
