import { TYPES } from '../../sim/config';
import type { TopType } from '../../content/toupies';
import { TYPE_LABELS } from '../typeLabels';

/**
 * Le triangle des forces, dessiné. Il remplace quatre lignes de paragraphe qui
 * énoncent un cycle — or un cycle se montre, il ne se récite pas.
 *
 * Attaque bat Endurance, qui bat Défense, qui bat Attaque. Équilibre est au centre :
 * hors du cycle, ni dominant ni dominé.
 */
const CYCLE: TopType[] = ['attaque', 'endurance', 'defense'];

export function TypeTriangle({
  size = 190, highlight,
}: {
  size?: number;
  /** Le type du joueur : mis en avant, les deux autres en retrait. */
  highlight?: TopType;
}) {
  const cx = size / 2;
  const cy = size * 0.52;
  const r = size * 0.32;
  const node = size * 0.125;
  const pos = CYCLE.map((_, i) => {
    const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
  const dominant = Math.round(TYPES.dominantBonus * 100);
  const equilibre = Math.round(TYPES.equilibreBonus * 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`Attaque bat Endurance, qui bat Défense, qui bat Attaque : +${dominant} % de dégâts. Équilibre est hors du cycle : +${equilibre} % sur chaque coup.`}>
      <defs>
        {CYCLE.map((t) => (
          <marker key={t} id={`arrow-${t}`} viewBox="0 0 8 8" refX={6.5} refY={4}
            markerWidth={4.6} markerHeight={4.6} orient="auto-start-reverse">
            <path d="M0,0.6 L7.4,4 L0,7.4 z" fill={`var(--type-${t})`} />
          </marker>
        ))}
      </defs>

      {/* Les flèches partent du dominant vers le dominé, décalées du rayon des
          pastilles pour ne pas passer dessous. */}
      {CYCLE.map((from, i) => {
        const a = pos[i];
        const b = pos[(i + 1) % 3];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const gap = node * 1.32;
        const dim = highlight && highlight !== from ? 0.32 : 1;
        return (
          <line
            key={from}
            x1={a.x + (dx / len) * gap} y1={a.y + (dy / len) * gap}
            x2={b.x - (dx / len) * gap} y2={b.y - (dy / len) * gap}
            stroke={`var(--type-${from})`} strokeWidth={2} strokeOpacity={dim}
            markerEnd={`url(#arrow-${from})`}
          />
        );
      })}

      {/* Équilibre : au centre, hors du cycle. Cerclé en pointillé pour dire
          « n'appartient pas au triangle » sans l'écrire. */}
      <circle cx={cx} cy={cy} r={node * 0.86} fill="var(--panel)"
        stroke="var(--type-equilibre)" strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={cx} y={cy - node * 0.28} fill="var(--type-equilibre)" fontSize={size * 0.05}
        fontFamily="Oswald, ui-sans-serif, sans-serif" textAnchor="middle" dominantBaseline="central">
        ÉQUI
      </text>
      <text x={cx} y={cy + node * 0.34} fill="var(--type-equilibre)" fontSize={size * 0.058}
        fontFamily="Oswald, ui-sans-serif, sans-serif" textAnchor="middle" dominantBaseline="central">
        +{equilibre}%
      </text>

      {CYCLE.map((t, i) => {
        const dim = highlight && highlight !== t ? 0.45 : 1;
        return (
          <g key={t} opacity={dim}>
            <circle cx={pos[i].x} cy={pos[i].y} r={node} fill="var(--panel)"
              stroke={`var(--type-${t})`} strokeWidth={highlight === t ? 3 : 1.8} />
            <text x={pos[i].x} y={pos[i].y} fill={`var(--type-${t})`} fontSize={size * 0.056}
              fontFamily="Oswald, ui-sans-serif, sans-serif" textAnchor="middle" dominantBaseline="central">
              {TYPE_LABELS[t].slice(0, 3).toUpperCase()}
            </text>
          </g>
        );
      })}

      <text x={cx} y={size * 0.965} fill="var(--muted)" fontSize={size * 0.058}
        fontFamily="Oswald, ui-sans-serif, sans-serif" textAnchor="middle">
        +{dominant} % infligés · +{dominant} % subis
      </text>
    </svg>
  );
}
