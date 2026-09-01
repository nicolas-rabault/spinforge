import { pieceGlyphUrl, pieceTileUrl } from '../../art/cache';

/** Une pièce dessinée. `tile` l'affiche dans son écrin de rang (inventaire,
 *  tirages) ; sans `tile` l'objet est nu (Forge, fiches). Le dessin vient du cache
 *  de `src/art/` : rien n'est redessiné au rendu, et l'image est **exactement**
 *  celle que l'arène assemble. */
export function PieceIcon({
  model, rank, size, tile = false,
}: {
  model: string;
  rank: number;
  size: number;
  tile?: boolean;
}) {
  return (
    <img
      src={tile ? pieceTileUrl(model, rank, size) : pieceGlyphUrl(model, rank, size)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{ display: 'block' }}
    />
  );
}
