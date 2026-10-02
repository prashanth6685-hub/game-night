import { Avatar } from './Avatar.tsx';

export interface ScoreboardProps {
  entries: Array<{
    name: string;
    score: string | number;
    color?: string;
    highlight?: boolean;
  }>;
}

export function Scoreboard({ entries }: ScoreboardProps) {
  return (
    <ol className="ui-scoreboard">
      {entries.map((e, i) => (
        <li key={`${e.name}-${i}`} className={`ui-score-row${e.highlight ? ' ui-score-row-highlight' : ''}`}>
          <span className="ui-score-dot" style={{ backgroundColor: e.color ?? '#888' }} aria-hidden="true" />
          <Avatar name={e.name} color={e.color} size={36} />
          <span className="ui-score-name">{e.name}</span>
          <span className="ui-score-value">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
