import { t } from '../../i18n';
/**
 * La progression du chapitre, en pastilles. Remplace trois éléments de texte
 * empilés — « SALLE 4 / 10 », une barre de progression et « Boss : salle 10 » —
 * par une seule bande qu'on lit d'un coup d'œil.
 *
 * La dernière pastille est le boss : plus grande, en losange, dans sa teinte. Elle
 * dit « le mur est là » sans l'écrire, et elle est visible depuis la salle 1.
 */
export function PipTrack({
  total, current, size = 10,
}: {
  total: number;
  /** Salle en cours, de 1 à `total`. */
  current: number;
  size?: number;
}) {
  const gap = size * 0.62;
  const bossSize = size * 1.5;
  const width = (total - 1) * (size + gap) + bossSize;
  const height = bossSize * 1.4;
  const cy = height / 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={t('combat.pips', { n: current, total })}>
      {/* Le rail : sans lui les pastilles se lisent comme dix objets séparés, pas
          comme un chemin qu'on parcourt. */}
      <line
        x1={size / 2} y1={cy} x2={width - bossSize / 2} y2={cy}
        stroke="var(--line)" strokeWidth={1.4}
      />
      <line
        x1={size / 2} y1={cy}
        x2={size / 2 + (current - 1) * (size + gap)} y2={cy}
        stroke="var(--player)" strokeWidth={1.8}
      />
      {Array.from({ length: total }, (_, i) => {
        const salle = i + 1;
        const boss = salle === total;
        const cx = i * (size + gap) + size / 2;
        const done = salle < current;
        const here = salle === current;
        const color = boss ? 'var(--boss)' : here ? 'var(--ember)' : done ? 'var(--player)' : 'var(--line)';
        const fill = done || here ? color : 'transparent';
        const r = boss ? bossSize / 2 : size / 2;
        return boss ? (
          <g key={salle} transform={`translate(${cx} ${cy}) rotate(45)`}>
            <rect
              x={-r * 0.72} y={-r * 0.72} width={r * 1.44} height={r * 1.44} rx={r * 0.22}
              fill={here || done ? color : 'transparent'} stroke={color}
              strokeWidth={here ? 2.2 : 1.4}
            />
          </g>
        ) : (
          <circle
            key={salle}
            cx={cx} cy={cy} r={here ? r * 1.15 : r * 0.82}
            fill={fill} stroke={color} strokeWidth={here ? 2.2 : 1.3}
          />
        );
      })}
    </svg>
  );
}
