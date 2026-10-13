// Tests for games/poker/logic/voiceState.ts (pure mic state machine).
// Run: node --test client/src/games/poker/logic/voiceState.test.ts (from repo root)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_MIC_INITIAL,
  voiceMicJoined,
  voiceMicNext,
} from './voiceState.ts';
import type { VoiceMic } from './voiceState.ts';

function at(state: VoiceMic['state']): VoiceMic {
  return { state, error: state === 'error' ? 'boom' : null };
}

describe('voiceMicNext', () => {
  it('idle -> joining on join', () => {
    const m = voiceMicNext(VOICE_MIC_INITIAL, { type: 'join' });
    assert.equal(m.state, 'joining');
    assert.equal(m.error, null);
  });

  it('joining -> muted on join-ok (fresh joins land muted, never hot)', () => {
    const m = voiceMicNext(at('joining'), { type: 'join-ok' });
    assert.equal(m.state, 'muted');
  });

  it('joining -> error on join-fail, keeping the message', () => {
    const m = voiceMicNext(at('joining'), {
      type: 'join-fail',
      error: 'mic denied',
    });
    assert.equal(m.state, 'error');
    assert.equal(m.error, 'mic denied');
  });

  it('error -> joining on retry (join from error clears the message)', () => {
    const m = voiceMicNext(at('error'), { type: 'join' });
    assert.equal(m.state, 'joining');
    assert.equal(m.error, null);
  });

  it('muted <-> joined via unmute/mute', () => {
    assert.equal(voiceMicNext(at('muted'), { type: 'unmute' }).state, 'joined');
    assert.equal(voiceMicNext(at('joined'), { type: 'mute' }).state, 'muted');
  });

  it('leave resets to idle from every non-idle state and clears errors', () => {
    for (const s of ['joining', 'joined', 'muted', 'error'] as const) {
      const m = voiceMicNext(at(s), { type: 'leave' });
      assert.equal(m.state, 'idle');
      assert.equal(m.error, null);
    }
    assert.equal(voiceMicNext(at('idle'), { type: 'leave' }).state, 'idle');
  });

  it('reset always returns to idle', () => {
    for (const s of ['joining', 'joined', 'muted', 'error'] as const) {
      assert.equal(voiceMicNext(at(s), { type: 'reset' }).state, 'idle');
    }
  });

  it('irrelevant events are no-ops (no phantom transitions)', () => {
    assert.equal(voiceMicNext(at('idle'), { type: 'join-ok' }).state, 'idle');
    assert.equal(voiceMicNext(at('idle'), { type: 'mute' }).state, 'idle');
    assert.equal(voiceMicNext(at('idle'), { type: 'unmute' }).state, 'idle');
    assert.equal(
      voiceMicNext(at('joined'), { type: 'join-fail', error: 'x' }).state,
      'joined',
    );
    assert.equal(voiceMicNext(at('muted'), { type: 'mute' }).state, 'muted');
    assert.equal(voiceMicNext(at('joined'), { type: 'unmute' }).state, 'joined');
    assert.equal(voiceMicNext(at('error'), { type: 'mute' }).state, 'error');
  });
});

describe('voiceMicJoined', () => {
  it('is true exactly for joined/muted', () => {
    assert.equal(voiceMicJoined(at('joined')), true);
    assert.equal(voiceMicJoined(at('muted')), true);
    assert.equal(voiceMicJoined(at('idle')), false);
    assert.equal(voiceMicJoined(at('joining')), false);
    assert.equal(voiceMicJoined(at('error')), false);
  });
});
