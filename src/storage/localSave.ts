import { deserializeMeta, serializeMeta } from '../sim/save';
import { createInitialMeta } from '../sim/meta';
import type { MetaState } from '../sim/types';

const KEY = 'spinforge.save';
const BACKUP_KEY = 'spinforge.save.backup';
const DEBOUNCE_MS = 1000;

/** Charge le méta. `recovered` vaut vrai si une sauvegarde existait mais s'est
 *  révélée illisible : elle a alors été recopiée sous une clé de secours plutôt
 *  qu'écrasée. Perdre une progression sans laisser de trace est le pire défaut
 *  qu'une sauvegarde puisse avoir.
 *
 *  `absenceSeconds` mesure le temps écoulé depuis la dernière écriture
 *  (`lastSeenAt`, estampillé par `write` ci-dessous) : c'est la seule horloge
 *  du méta. Une horloge système reculée depuis la dernière écriture donnerait
 *  une absence négative : elle vaut zéro, comme une absence qui n'a pas eu
 *  lieu. Les retours « pas de sauvegarde » et « sauvegarde illisible » rendent
 *  aussi zéro : sans passé lisible, il n'y a rien dont être absent. */
export function loadMeta(): { meta: MetaState; recovered: boolean; absenceSeconds: number } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { meta: createInitialMeta(Date.now() >>> 0), recovered: false, absenceSeconds: 0 };
  }
  if (raw === null) return { meta: createInitialMeta(Date.now() >>> 0), recovered: false, absenceSeconds: 0 };

  const meta = deserializeMeta(raw);
  if (meta !== null) {
    const absenceSeconds = meta.lastSeenAt === 0 ? 0 : Math.max(0, (Date.now() - meta.lastSeenAt) / 1000);
    return { meta, recovered: false, absenceSeconds };
  }

  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // Quota plein ou stockage refusé : on ne peut pas mieux faire que continuer.
  }
  return { meta: createInitialMeta(Date.now() >>> 0), recovered: true, absenceSeconds: 0 };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: MetaState | null = null;

/** Écrit le méta en y estampillant l'instant présent. C'est le seul endroit du
 *  projet où l'horloge entre dans le méta. */
function write(meta: MetaState): void {
  try {
    localStorage.setItem(KEY, serializeMeta({ ...meta, lastSeenAt: Date.now() }));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie continue.
  }
}

/** Écriture débouncée. Appelée à chaque mutation du méta — récompense de salle,
 *  coffre, fusion, équipement, amélioration. */
export function scheduleSave(meta: MetaState): void {
  pending = meta;
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    if (pending) write(pending);
    pending = null;
  }, DEBOUNCE_MS);
}

export function flushSave(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) write(pending);
  pending = null;
}

/** Écrit sans attendre le débounce quand la page part. Retourne le désabonnement. */
export function installFlushOnHide(): () => void {
  const onHide = () => flushSave();
  window.addEventListener('pagehide', onHide);
  return () => window.removeEventListener('pagehide', onHide);
}
