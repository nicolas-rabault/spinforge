import { rankTier } from '../../theme';
import { rankLabel } from '../rank';

/**
 * Ce qu'un coffre rend, en une bande. Chaque segment est un rang possible, large
 * comme sa probabilité et coloré comme son palier. Remplace « Les quatre
 * emplacements, de l'Excellent à la Légende. » : une phrase qui nomme les bornes
 * mais tait le fait qu'un Mythique rend un Excellent quatre-vingt-huit fois sur cent.
 */
export function OddsBar({
  ranks, height = 9, labels = false,
}: {
  ranks: readonly { rank: number; p: number }[];
  height?: number;
  /** Nomme les deux bornes sous la bande. Deux mots suffisent à donner son échelle
   *  à la barre ; sans eux elle est jolie et muette. */
  labels?: boolean;
}) {
  const total = ranks.reduce((s, r) => s + r.p, 0) || 1;
  const low = ranks[0];
  const high = ranks[ranks.length - 1];
  const bar = (
    <div
      role="img"
      aria-label={ranks.map((r) => `${rankLabel(r.rank)} ${Math.round((r.p / total) * 100)} %`).join(', ')}
      style={{ display: 'flex', gap: 2, height, borderRadius: 999, overflow: 'hidden' }}
    >
      {ranks.map((r) => (
        <div
          key={r.rank}
          style={{
            // `flexGrow` et non une largeur en pourcent : les gouttières de 2 px
            // sont prises sur l'espace, pas sur les segments — sinon un segment à
            // 0,5 % disparaît complètement.
            flex: `${r.p / total} 1 0`,
            minWidth: 3,
            background: `var(--rank-${rankTier(r.rank)})`,
            opacity: 0.5 + 0.5 * rankTier(r.rank) / 3,
          }}
        />
      ))}
    </div>
  );
  if (!labels) return bar;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {bar}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontFamily: 'Oswald, ui-sans-serif, sans-serif' }}>
        <span style={{ color: `var(--rank-${rankTier(low.rank)})` }}>{rankLabel(low.rank)}</span>
        <span style={{ color: `var(--rank-${rankTier(high.rank)})` }}>{rankLabel(high.rank)}</span>
      </div>
    </div>
  );
}
