import { toupiePortraitUrl } from '../../art/cache';
import type { ToupieArt } from '../../art/toupie';

/** La toupie montée, vue de trois quarts. Changer une pièce change l'image. */
export function ToupiePortrait({ art, size }: { art: ToupieArt; size: number }) {
  return (
    <img
      src={toupiePortraitUrl(art, size)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{ display: 'block' }}
    />
  );
}
