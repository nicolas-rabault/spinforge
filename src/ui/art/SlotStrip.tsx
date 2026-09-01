import { SLOT_EMBLEM } from '../../art/recipes';
import type { Slot } from '../../content/pieces';
import { PieceIcon } from './PieceIcon';

const ORDER: Slot[] = ['lame', 'disque', 'pointe', 'noyau'];
const NAMES: Record<Slot, string> = { lame: 'Lame', disque: 'Disque', pointe: 'Pointe', noyau: 'Noyau' };

/** Les emplacements qu'un coffre peut rendre, dessinés. Ceux qu'il ne rend pas
 *  restent visibles mais éteints : montrer l'absence vaut mieux que la taire — on
 *  voit du même coup que le Bronze est le seul à ne pas donner de Lames.
 *
 *  `rank` teinte les emplacements présents au meilleur palier que le coffre peut
 *  rendre. Sans lui, présents et absents étaient deux gris voisins et la bande ne
 *  disait plus rien. */
export function SlotStrip({ slots, rank = 1, size = 30 }: { slots: readonly string[]; rank?: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {ORDER.map((slot) => {
        const on = slots.includes(slot);
        return (
          <span
            key={slot}
            title={NAMES[slot]}
            aria-label={`${NAMES[slot]}${on ? '' : ' — absent de ce coffre'}`}
            style={{ opacity: on ? 1 : 0.16, filter: on ? 'none' : 'grayscale(1)', display: 'block' }}
          >
            <PieceIcon model={SLOT_EMBLEM[slot]} rank={on ? rank : 1} size={size} />
          </span>
        );
      })}
    </div>
  );
}
