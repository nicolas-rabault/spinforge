import { OFFLINE } from '../sim/config';
import type { FarmReport } from '../sim/farm';
import { formatCredits, getLang, t, tn } from '../i18n';
import { chapterName } from './contentLabels';

/** Nombre d'heures à afficher, arrondi au dixième et jamais nul tant qu'une
 *  absence a été mesurée — sans le plancher, une absence de 61 s (le minimum
 *  qui déclenche l'écran) arrondirait à « 0 h », un résultat qui a l'air d'un
 *  bug plutôt que d'un farm minuscule. L'unité vient du catalogue : le
 *  français la sépare du nombre, l'anglais la colle, comme {@link formatCredits}. */
function formatHours(seconds: number): string {
  const hours = Math.max(0.1, Math.round(seconds / 360) / 10);
  return new Intl.NumberFormat(getLang(), { maximumFractionDigits: 1 }).format(hours) + t('format.hour');
}

/**
 * Voile plein écran affiché une fois par chargement quand le farm hors-ligne
 * a produit quelque chose pendant l'absence. Mêmes valeurs de style que le
 * voile de fin de descente de `CombatScreen` (fond, rayon, police, bouton) —
 * le même genre d'objet, posé cette fois par-dessus l'app entière plutôt que
 * la seule arène.
 *
 * `farm` a déjà appliqué les gains à `meta` avant que ce composant ne soit
 * monté (voir `App.tsx`) : « Réclamer » ne fait que refermer l'écran, il
 * n'applique rien lui-même.
 */
export function AbsenceScreen({ report, absenceSeconds, onClaim }: {
  report: FarmReport;
  /** Durée d'absence brute (non plafonnée), pour situer le bonus de retour —
   *  la durée AFFICHÉE, elle, est plafonnée à `OFFLINE.capHours` ci-dessous. */
  absenceSeconds: number;
  onClaim: () => void;
}) {
  const shownSeconds = Math.min(absenceSeconds, OFFLINE.capHours * 3600);
  const winback = absenceSeconds >= OFFLINE.winbackAfterHours * 3600;
  const totalChests = Object.values(report.chests).reduce((sum, n) => sum + n, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 11, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 20px',
        background: 'rgba(5,7,11,.72)',
      }}
    >
      <p style={{ margin: 0, font: '600 22px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>
        {t('absence.title')}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
        {t('absence.duration', { h: formatHours(shownSeconds), chapter: chapterName(report.chapter) })}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, textAlign: 'center' }}>
        {t('absence.credits', { n: formatCredits(report.credits) })}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, textAlign: 'center' }}>
        {tn('absence.chests', totalChests)}
      </p>
      <p style={{ margin: 0, fontSize: 12.5, textAlign: 'center' }}>
        {tn('absence.salles', report.salles)}
      </p>
      {winback ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ember)', textAlign: 'center' }}>
          {/* `×1.5` porte une virgule en français : `Intl` la met, un `{mult}`
              brut aurait collé le point anglais aux deux langues. */}
          {t('absence.winback', { mult: new Intl.NumberFormat(getLang()).format(OFFLINE.winbackMult) })}
        </p>
      ) : null}
      <button
        onClick={onClaim}
        style={{
          minHeight: 50, padding: '0 34px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid var(--ember)', background: 'var(--ember)', color: 'var(--ink)',
          font: '600 16px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em',
        }}
      >
        {t('absence.claim')}
      </button>
    </div>
  );
}
