/** Quatre paliers de lisibilité, alignés sur les paliers nommés de l'échelle.
 *  Un rang doit se reconnaître à la couleur sans lire son étiquette. */
export function rankColor(rank: number): string {
  if (rank >= 11) return 'var(--boss)';
  if (rank >= 7) return 'var(--ember)';
  if (rank >= 4) return 'var(--player)';
  return 'var(--muted)';
}
