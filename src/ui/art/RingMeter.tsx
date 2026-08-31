/**
 * Un anneau qui se remplit, avec sa valeur au centre. Utilisé pour la pitié des
 * coffres : « Excellent garanti dans 7 tirages » devient un anneau autour du
 * coffre — on voit le seuil approcher au lieu de lire une phrase.
 */
export function RingMeter({
  value, total, size, color, label, thickness = 4,
}: {
  value: number;
  total: number;
  size: number;
  color: string;
  /** Ce qui s'inscrit au centre. Le compte exact reste lisible : l'anneau donne
   *  la sensation, le nombre donne la certitude. */
  label?: string;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={label ? `${label}` : `${value} sur ${total}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
      <circle
        cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={thickness}
        strokeLinecap="round" strokeDasharray={`${circ * ratio} ${circ}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      {label ? (
        <text
          x={c} y={c} fill={color} fontSize={size * 0.26}
          fontFamily="Oswald, ui-sans-serif, sans-serif" textAnchor="middle" dominantBaseline="central"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}
