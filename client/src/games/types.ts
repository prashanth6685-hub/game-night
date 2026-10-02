// Central contracts every game module must follow.
// Adding a game = create games/<id>/{meta.ts, types.ts, logic/, components/, index.ts}
// and add one line to registry.ts. Nothing else in the app may hard-code game ids.

export interface GameMeta {
  /** URL-safe id, also the folder name, e.g. 'tambola' */
  id: string;
  /** Emoji shown on the lobby card, e.g. '🎟️' */
  icon: string;
  /** i18n key for the game name, e.g. 'games.tambola.name' */
  nameKey: string;
  /** i18n key for the short description, e.g. 'games.tambola.desc' */
  descKey: string;
  minPlayers: number;
  /** null = no upper limit */
  maxPlayers: number | null;
}

export interface GameResultLine {
  label: string; // already-translated label
  value: string; // already-translated value
}

export interface GameResult {
  /** Already-translated headline, e.g. '🎉 Team A wins!' */
  title: string;
  /** Already-translated winner line, optional */
  winner?: string;
  lines: GameResultLine[];
}

export interface GameScreenProps {
  /** Call when the game ends -> app shows the shared Results screen */
  onFinish: (result: GameResult) => void;
  /** Call to leave the game -> back to the lobby */
  onExit: () => void;
}
