// Dumb Charades game screen — owns the setup → play flow.
// Setup collects the custom category + full game config in a dialog;
// finishing calls onFinish with translated strings. The app shell handles exit.
import { useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import type {
  CharadesDifficulty,
  CharadesLang,
} from '../data/types.ts';
import SetupPhase from './SetupPhase.tsx';
import PlayPhase from './PlayPhase.tsx';
import './charades.css';

export interface CharadesSetup {
  language: CharadesLang;
  /** AI-generated custom category (via POST /api/charades/generate). */
  customCategory: string;
  /** Session-only generated words — never persisted. */
  customWords: string[];
  difficulty: CharadesDifficulty;
  timerSecs: number;
  teams: CharadesTeams;
}

export interface CharadesTeams {
  names: string[];
  /** null = unlimited rounds (host ends the game manually). */
  rounds: number | null;
}

type Phase = 'setup' | 'play';

export default function GameScreen({ onFinish }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [setup, setSetup] = useState<CharadesSetup | null>(null);

  const handleSetupDone = (s: CharadesSetup): void => {
    setSetup(s);
    setPhase('play');
  };

  if (phase === 'play' && setup) {
    return (
      <PlayPhase setup={setup} teams={setup.teams} onFinish={onFinish} />
    );
  }

  return <SetupPhase onStart={handleSetupDone} />;
}
