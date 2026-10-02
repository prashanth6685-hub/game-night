// Tests for turn rotation, round counting and scoring helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  completedRounds,
  isGameOver,
  isTie,
  nextTeamIndex,
  winnerIndex,
} from './turns.ts';

test('nextTeamIndex advances and wraps around', () => {
  assert.equal(nextTeamIndex(0, 3), 1);
  assert.equal(nextTeamIndex(1, 3), 2);
  assert.equal(nextTeamIndex(2, 3), 0);
  assert.equal(nextTeamIndex(1, 2), 0);
});

test('completedRounds counts full cycles only', () => {
  assert.equal(completedRounds(0, 2), 0);
  assert.equal(completedRounds(1, 2), 0);
  assert.equal(completedRounds(2, 2), 1);
  assert.equal(completedRounds(5, 3), 1);
  assert.equal(completedRounds(6, 3), 2);
});

test('isGameOver: null rounds never ends the game', () => {
  assert.equal(isGameOver(100, 2, null), false);
});

test('isGameOver: ends once every team played the configured rounds', () => {
  // 2 teams x 5 rounds = 10 turns
  assert.equal(isGameOver(9, 2, 5), false);
  assert.equal(isGameOver(10, 2, 5), true);
  assert.equal(isGameOver(11, 4, 2), true);
});

test('winnerIndex picks the highest scorer, first on ties', () => {
  assert.equal(winnerIndex([3, 5, 2]), 1);
  assert.equal(winnerIndex([5, 5, 2]), 0);
  assert.equal(winnerIndex([0, 0, 0]), 0);
});

test('isTie detects shared top scores', () => {
  assert.equal(isTie([3, 5, 5]), true);
  assert.equal(isTie([3, 5, 2]), false);
  assert.equal(isTie([7]), false);
  assert.equal(isTie([]), false);
});
