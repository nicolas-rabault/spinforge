import { CHAPTER_COUNT } from '../content/chapters';
import type { ToupieId } from '../content/toupies';
import { t, type MessageKey } from '../i18n';

/** Les catalogues de `src/content/` ne portent plus de texte : chaque nom se
 *  déduit de son identifiant. La clé étant construite, TypeScript ne peut plus
 *  la vérifier — c'est `src/i18n/catalog.test.ts` qui tient ce rôle. */
export function toupieLabel(id: ToupieId): string {
  return t(`toupie.${id}` as MessageKey);
}

export function modelLabel(id: string): string {
  return t(`piece.${id}` as MessageKey);
}

/** Le chapitre 8 est infini côté design : borner évite de sortir du catalogue. */
function clamp(chapter: number): number {
  return Math.min(Math.max(1, chapter), CHAPTER_COUNT);
}

export function chapterName(chapter: number): string {
  return t(`chapter.${clamp(chapter)}.name` as MessageKey);
}

export function chapterBoss(chapter: number): string {
  return t(`chapter.${clamp(chapter)}.boss` as MessageKey);
}
