import { chestUrl } from '../../art/cache';
import type { ChestKind } from '../../sim/types';

export function ChestIcon({ kind, size, open = 0 }: { kind: ChestKind; size: number; open?: number }) {
  return (
    <img
      src={chestUrl(kind, size, open)}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{ display: 'block' }}
    />
  );
}
