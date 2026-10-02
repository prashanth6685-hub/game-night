// Dumb Charades game screen — owns the setup → play flow.
// Setup collects the custom category + full game config in a dialog.
// Same-device games hand off to PlayPhase; multi-phone games open the QR
// lobby (words stay on the host's phone as hostData) and then route every
// phone to #/mp/dumb-charades/<code>.
import { useState } from 'react';
import type { GameScreenProps } from '../../types.ts';
import type {
  CharadesDifficulty,
  CharadesLang,
} from '../data/types.ts';
import SetupPhase from './SetupPhase.tsx';
import PlayPhase from './PlayPhase.tsx';
import { MpLobby } from '../../../shared/mp/MpLobby.tsx';
import { initialCharadesMpState } from '../multiplayer/MpGame.tsx';
import type { CharadesMpConfig } from '../multiplayer/MpGame.tsx';
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
  /** Multi-phone only: display name of the hosting player. */
  hostName?: string;
}

export interface CharadesTeams {
  names: string[];
  /** null = unlimited rounds (host ends the game manually). */
  rounds: number | null;
}

type Phase = 'setup' | 'play' | 'mp-lobby';

export default function GameScreen({ onFinish }: GameScreenProps) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [setup, setSetup] = useState<CharadesSetup | null>(null);

  const handleSetupDone = (s: CharadesSetup): void => {
    setSetup(s);
    setPhase('play');
  };

  const handleSetupMulti = (s: CharadesSetup): void => {
    setSetup(s);
    setPhase('mp-lobby');
  };

  if (phase === 'play' && setup) {
    return (
      <PlayPhase setup={setup} teams={setup.teams} onFinish={onFinish} />
    );
  }

  if (phase === 'mp-lobby' && setup) {
    const config: CharadesMpConfig = {
      category: setup.customCategory,
      timerSecs: setup.timerSecs,
      rounds: setup.teams.rounds,
      teamCount: setup.teams.names.length,
      language: setup.language,
    };
    return (
      <MpLobby
        gameId="dumb-charades"
        hostName={setup.hostName ?? ''}
        config={config}
        minPlayers={Math.max(2, setup.teams.names.length)}
        maxPlayers={20}
        hostData={setup.customWords}
        buildInitialState={(players) =>
          initialCharadesMpState(players, config, setup.teams.names)
        }
        onStart={(s) => {
          window.location.hash = `#/mp/dumb-charades/${s.code}`;
        }}
        onCancel={() => setPhase('setup')}
      />
    );
  }

  return (
    <SetupPhase onStart={handleSetupDone} onStartMulti={handleSetupMulti} />
  );
}
