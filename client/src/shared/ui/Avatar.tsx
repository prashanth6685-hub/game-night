export interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
}

const PALETTE = [
  '#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2',
  '#9b5de5', '#00f5d4', '#f15bb5', '#ff8fab', '#43aa8b',
];

// Deterministic color from name so a player keeps the same avatar color.
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length] as string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('');
}

export function Avatar({ name, color, size = 40 }: AvatarProps) {
  const bg = color ?? hashColor(name);
  return (
    <span
      className="ui-avatar"
      aria-label={name}
      style={{
        backgroundColor: bg,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials(name)}
    </span>
  );
}
