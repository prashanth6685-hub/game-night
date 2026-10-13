// Pure mic-status state machine for poker voice chat (React-free, so it is
// unit-testable; the usePokerVoice hook drives it).
//
// States:
//   idle    — not in voice chat.
//   joining — getUserMedia + POST /voice-join in flight.
//   joined  — in voice, mic live.
//   muted   — in voice, mic muted. A fresh join ALWAYS lands here (the
//             server also starts muted=true): no surprise hot-mic — the
//             user unmutes explicitly via the mic button.
//   error   — join failed (mic denied, no device, network, ...). The
//             message explains what happened and how to recover.
//
// joining/leaving/muting voice NEVER touches the poker hand: voice state
// lives in a separate server map and separate client module.

export type VoiceMicState = 'idle' | 'joining' | 'joined' | 'muted' | 'error';

export type VoiceMicEvent =
  | { type: 'join' }
  | { type: 'join-ok' }
  | { type: 'join-fail'; error: string }
  | { type: 'mute' }
  | { type: 'unmute' }
  | { type: 'leave' }
  | { type: 'reset' };

export interface VoiceMic {
  state: VoiceMicState;
  /** Last failure message; null unless state === 'error'. */
  error: string | null;
}

export const VOICE_MIC_INITIAL: VoiceMic = { state: 'idle', error: null };

/** Deterministic transition; unknown/irrelevant events are no-ops. */
export function voiceMicNext(mic: VoiceMic, ev: VoiceMicEvent): VoiceMic {
  switch (ev.type) {
    case 'join':
      if (mic.state === 'idle' || mic.state === 'error')
        return { state: 'joining', error: null };
      return mic;
    case 'join-ok':
      // A successful join lands muted (matches the server default).
      if (mic.state === 'joining') return { state: 'muted', error: null };
      return mic;
    case 'join-fail':
      if (mic.state === 'joining')
        return { state: 'error', error: ev.error };
      return mic;
    case 'mute':
      if (mic.state === 'joined') return { state: 'muted', error: null };
      return mic;
    case 'unmute':
      if (mic.state === 'muted') return { state: 'joined', error: null };
      return mic;
    case 'leave':
      if (mic.state !== 'idle') return { state: 'idle', error: null };
      return mic;
    case 'reset':
      return { state: 'idle', error: null };
  }
}

/** True when the seat is in the voice mesh (mic live or muted). */
export function voiceMicJoined(mic: VoiceMic): boolean {
  return mic.state === 'joined' || mic.state === 'muted';
}
