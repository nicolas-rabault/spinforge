import { t, type MessageKey } from '../i18n';
import type { TalentId } from '../sim/talents';

/** La Forge affiche les talents actifs d'une pièce équipée : le rang seul ne dit
 *  rien du talent qu'il débloque, c'est pourtant sa vraie valeur (spec § 4.3). */
const KEYS: Record<TalentId, MessageKey> = {
  estoc: 'talent.estoc',
  riposte: 'talent.riposte',
  percee: 'talent.percee',
  ancrage: 'talent.ancrage',
  frolement: 'talent.frolement',
  masse: 'talent.masse',
  glisse: 'talent.glisse',
  relance: 'talent.relance',
  toupieFolle: 'talent.toupieFolle',
  reserve: 'talent.reserve',
  secondSouffle: 'talent.secondSouffle',
  coeurGyre: 'talent.coeurGyre',
};

export function talentLabel(id: TalentId): string {
  return t(KEYS[id]);
}
