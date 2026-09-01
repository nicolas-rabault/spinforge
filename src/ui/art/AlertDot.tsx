/**
 * Le point rouge : « quelque chose t'attend ici ».
 *
 * Il ne marque que des actions **gratuites** — coffre à ouvrir, fusion possible,
 * pièce dominante à équiper, Fondateur à réclamer. Jamais un achat : les crédits
 * rentrent en continu, un point « tu peux payer » resterait allumé en permanence
 * et ne dirait plus rien.
 *
 * Le cerne sombre n'est pas un ornement. Sur l'onglet actif le fond est
 * `--ember` : du rouge posé sur de l'orange ne se voit pas. Le cerne détache le
 * point de ses deux fonds possibles.
 *
 * L'appelant doit porter `position: relative`.
 */
export function AlertDot({
  label, count, top = 4, right = 6,
}: {
  /** Ce que le point veut dire, pour les lecteurs d'écran. */
  label: string;
  /** Absent : un point nu. Présent : la pastille chiffrée. */
  count?: number;
  top?: number;
  right?: number;
}) {
  const base = {
    position: 'absolute' as const, top, right, zIndex: 1, boxSizing: 'border-box' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, background: 'var(--alert)', border: '1.5px solid var(--ink)',
  };

  if (count === undefined) {
    return <span role="img" aria-label={label} style={{ ...base, width: 11, height: 11 }} />;
  }

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        ...base, minWidth: 18, height: 18, padding: '0 4px',
        color: 'var(--text)', fontSize: 11,
        fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums',
      }}
    >
      {count}
    </span>
  );
}
