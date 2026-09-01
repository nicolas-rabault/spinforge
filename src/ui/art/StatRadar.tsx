import { PROFILE_AXES, type ProfileAxis } from '../../sim/profile';
import { axisAbbr } from '../profileAxes';

/**
 * Les sept axes d'un profil, en une forme. Remplace sept lignes « Vitesse max
 * +10 % » réparties sur trois écrans par une silhouette qu'on compare d'un regard.
 *
 * SVG et non canvas — contrairement aux pièces et aux toupies, ce dessin n'est
 * jamais consommé par PixiJS : la contrainte de source unique ne s'y applique pas,
 * et le SVG garde les traits fins nets sur tout écran.
 *
 * **Piège de sens, le même que dans `profileAxes.ts`** : `spinDecay` est une *perte*
 * de spin par seconde, donc un multiplicateur inférieur à 1 est un gain. On le
 * retourne avant de le tracer, sinon la meilleure tenue de spin du jeu se
 * dessinerait comme le pire creux du polygone.
 */
/** Le neutre est à mi-rayon : il reste autant de place pour montrer un malus que
 *  pour montrer un bonus. Un neutre au bord écraserait tous les malus au centre. */
const NEUTRAL_FRACTION = 0.5;
const SPAN = 1.0;

function fraction(axis: ProfileAxis, value: number): number {
  const v = axis === 'spinDecay' ? 2 - value : value;
  return Math.max(0.1, Math.min(1, NEUTRAL_FRACTION + (v - 1) / SPAN * NEUTRAL_FRACTION * 2));
}

function polygon(values: Partial<Record<ProfileAxis, number>>, r: number, cx: number, cy: number): string {
  return PROFILE_AXES.map((axis, i) => {
    const a = -Math.PI / 2 + (i / PROFILE_AXES.length) * Math.PI * 2;
    const rr = r * fraction(axis, values[axis] ?? 1);
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
}

export function StatRadar({
  values, compare, size = 132, labels = true,
}: {
  values: Partial<Record<ProfileAxis, number>>;
  /** Profil superposé — l'état *après* achat. Tracé en pointillé par-dessus. */
  compare?: Partial<Record<ProfileAxis, number>>;
  size?: number;
  labels?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * (labels ? 0.34 : 0.44);
  const neutral = polygon({}, r, cx, cy);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
      {[1, 0.66, 0.33].map((k) => (
        <polygon
          key={k}
          points={PROFILE_AXES.map((_, i) => {
            const a = -Math.PI / 2 + (i / PROFILE_AXES.length) * Math.PI * 2;
            return `${cx + Math.cos(a) * r * k},${cy + Math.sin(a) * r * k}`;
          }).join(' ')}
          fill="none"
          stroke="var(--line)"
          strokeWidth={0.8}
        />
      ))}
      {PROFILE_AXES.map((axis, i) => {
        const a = -Math.PI / 2 + (i / PROFILE_AXES.length) * Math.PI * 2;
        return (
          <line
            key={axis}
            x1={cx} y1={cy}
            x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r}
            stroke="var(--line)" strokeWidth={0.8}
          />
        );
      })}
      {/* Le neutre en trait plein discret : c'est la référence contre laquelle
          toute bosse et tout creux se lisent. */}
      <polygon points={neutral} fill="none" stroke="var(--muted)" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.85} />
      <polygon points={polygon(values, r, cx, cy)} fill="var(--player)" fillOpacity={0.24} stroke="var(--player)" strokeWidth={1.6} />
      {compare ? (
        <polygon points={polygon(compare, r, cx, cy)} fill="none" stroke="var(--ember)" strokeWidth={1.8} strokeDasharray="4 2" />
      ) : null}
      {labels
        ? PROFILE_AXES.map((axis, i) => {
            const a = -Math.PI / 2 + (i / PROFILE_AXES.length) * Math.PI * 2;
            return (
              <text
                key={axis}
                x={cx + Math.cos(a) * r * 1.28}
                y={cy + Math.sin(a) * r * 1.28}
                fill="var(--muted)"
                fontSize={size * 0.072}
                fontFamily="Oswald, ui-sans-serif, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {axisAbbr(axis)}
              </text>
            );
          })
        : null}
    </svg>
  );
}
