import type { CSSProperties } from 'react';
import { REVEAL } from '../../render/feel';
import { rankTier } from '../../theme';

/** Gerbe d'une pièce qui se révèle : des étincelles, et une onde de choc à
 *  partir du palier Rare. Tout le dimensionnement vient de `REVEAL` — le palier
 *  Commun ne dessine rien, la Légende projette une gerbe pleine.
 *
 *  L'effet est en CSS pur : chaque étincelle porte son angle et sa portée en
 *  variables, et une seule keyframe les anime toutes. Pas de canvas ni de boucle
 *  d'animation à entretenir, et la gerbe disparaît avec son élément.
 *
 *  À poser dans un parent `position: relative` : la gerbe se centre dessus. */
export function Sparks({ rank, size }: { rank: number; size: number }) {
  const tier = rankTier(rank);
  const feel = REVEAL[tier];
  if (feel.sparks === 0) return null;

  const color = `var(--rank-${tier})`;
  const life = { '--sf-life': `${feel.life}s` } as CSSProperties;

  return (
    // Un point sans dimension au centre de la pièce : les enfants s'y recentrent
    // eux-mêmes (`translate(-50%,-50%)` en tête de chaque keyframe), ce qui évite
    // d'avoir à connaître leur taille ici.
    <span
      aria-hidden
      style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, pointerEvents: 'none' }}
    >
      {feel.ring > 0 ? (
        <span
          className="sf-ring"
          style={{
            ...life, '--sf-ring': feel.ring,
            position: 'absolute', left: 0, top: 0, width: size, height: size,
            borderRadius: '50%', border: `2px solid ${color}`,
          } as CSSProperties}
        />
      ) : null}

      {Array.from({ length: feel.sparks }, (_, i) => {
        // Angles et portées écartés d'un pas irrégulier : réparties exactement,
        // les étincelles dessinent un cadran d'horloge au lieu d'une gerbe.
        const angle = (i * 360) / feel.sparks + ((i * 47) % 23) - 11;
        const reach = size * feel.reach * (0.62 + ((i * 13) % 7) / 18);
        return (
          <span
            key={i}
            className="sf-spark"
            style={{
              ...life, '--sf-angle': `${angle}deg`, '--sf-reach': `${reach}px`,
              animationDelay: `${(i % 4) * 0.022}s`,
              position: 'absolute', left: 0, top: 0,
              width: Math.max(6, size * 0.19), height: feel.thick, borderRadius: feel.thick / 2,
              background: color, boxShadow: `0 0 ${feel.thick * 3}px ${color}`,
            } as CSSProperties}
          />
        );
      })}
    </span>
  );
}
