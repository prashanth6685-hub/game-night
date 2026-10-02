// Tiny WebAudio sound effects — no audio assets needed.
// Respects the user's sound setting via setSoundEnabled() (wired by SettingsProvider).
// Usage in games: import { playSound } from '../../../shared/sound.ts'; playSound('correct');

export type SoundName =
  | 'click'
  | 'pop' // tambola number called
  | 'dice'
  | 'correct'
  | 'skip'
  | 'win'
  | 'tick'
  | 'move'; // chess piece move

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.12,
): void {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, audio.currentTime + startAt);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + startAt + dur);
  osc.connect(g).connect(audio.destination);
  osc.start(audio.currentTime + startAt);
  osc.stop(audio.currentTime + startAt + dur + 0.02);
}

const SEQUENCES: Record<SoundName, Array<[number, number, number]>> = {
  // [frequency, delaySeconds, durationSeconds]
  click: [[660, 0, 0.06]],
  pop: [[520, 0, 0.09]],
  dice: [
    [300, 0, 0.05],
    [420, 0.06, 0.05],
    [560, 0.12, 0.08],
  ],
  correct: [
    [523, 0, 0.12],
    [659, 0.1, 0.12],
    [784, 0.2, 0.2],
  ],
  skip: [[330, 0, 0.12]],
  move: [[440, 0, 0.07]],
  tick: [[880, 0, 0.05]],
  win: [
    [523, 0, 0.15],
    [659, 0.12, 0.15],
    [784, 0.24, 0.15],
    [1047, 0.36, 0.35],
  ],
};

export function playSound(name: SoundName): void {
  const audio = ac();
  if (!audio) return;
  for (const [freq, delay, dur] of SEQUENCES[name]) tone(audio, freq, delay, dur);
}
