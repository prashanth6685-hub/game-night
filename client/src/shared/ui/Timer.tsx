import { useEffect, useRef, useState } from 'react';

export interface TimerProps {
  seconds: number;
  running: boolean;
  onDone?: () => void;
  onTick?: (remaining: number) => void;
}

function format(remaining: number): string {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Timer({ seconds, running, onDone, onTick }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const remainingRef = useRef(seconds);
  const doneRef = useRef(false);
  // Latest callbacks via refs so the interval effect only depends on `running`.
  const onDoneRef = useRef(onDone);
  const onTickRef = useRef(onTick);
  onDoneRef.current = onDone;
  onTickRef.current = onTick;

  // Reset whenever the seconds prop changes.
  useEffect(() => {
    remainingRef.current = seconds;
    doneRef.current = false;
    setRemaining(seconds);
    onTickRef.current?.(seconds);
  }, [seconds]);

  // Tick once per second while running; onDone fires exactly once at 0.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (remainingRef.current <= 0) return;
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      onTickRef.current?.(remainingRef.current);
      if (remainingRef.current === 0 && !doneRef.current) {
        doneRef.current = true;
        onDoneRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const low = remaining <= 10 && remaining > 0;

  return (
    <div className={`ui-timer${low ? ' ui-timer-low' : ''}`} role="timer" aria-label={format(remaining)}>
      {format(remaining)}
    </div>
  );
}
