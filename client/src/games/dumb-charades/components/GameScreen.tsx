// Dumb Charades game screen — owns the setup → teams → play phase flow.
// The app shell handles exit; finishing calls onFinish with translated strings.
import { useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import { track } from '../../../shared/analytics.ts';
import type {
  CharadesCategory,
  CharadesDifficulty,
  CharadesLang,
} from '../data/types.ts';
import SetupPhase from './SetupPhase.tsx';
import TeamsPhase from './TeamsPhase.tsx';
import PlayPhase from './PlayPhase.tsx';
import './charades.css';

export interface CharadesSetup {
  language: CharadesLang;
  category: CharadesCategory | 'random';
  difficulty: CharadesDifficulty | 'all';
  timerSecs: number;
  /**
   * AI-generated custom category (via POST /api/charades/generate).
   * When present, PlayPhase builds the deck from these words instead of
   * the preset packs. Session-only — never persisted.
   */
  customCategory?: string;
  customWords?: string[];
}

export interface CharadesTeams {
  names: string[];
  /** null = unlimited rounds (host ends the game manually). */
  rounds: number | null;
}

type Phase = 'setup' | 'teams' | 'play';

export default function GameScreen({ onFinish }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [setup, setSetup] = useState<CharadesSetup | null>(null);
  const [teams, setTeams] = useState<CharadesTeams | null>(null);

  const handleSetupDone = (s: CharadesSetup): void => {
    setSetup(s);
    setPhase('teams');
  };

  const handleTeamsDone = (tm: CharadesTeams): void => {
    setTeams(tm);
    track('game_started', { game: 'dumb-charades' });
    setPhase('play');
  };

  if (phase === 'play' && setup && teams) {
    return <PlayPhase setup={setup} teams={teams} onFinish={onFinish} />;
  }

  if (phase === 'teams') {
    return (
      <TeamsPhase
        onStart={handleTeamsDone}
        onBack={() => setPhase('setup')}
      />
    );
  }

  return <SetupPhase onStart={handleSetupDone} />;
}
