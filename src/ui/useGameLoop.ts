import { useEffect } from 'react';
import { TICK_S } from '../sim/config';
import { tick } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

export function useGameLoop(
  stateRef: { current: SimState },
  steerRef: { current: Vec | null },
  onFrame: () => void,
): void {
  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      acc += Math.min(now - last, 250);
      last = now;
      while (acc >= TICK_S * 1000) {
        tick(stateRef.current, { steer: steerRef.current });
        acc -= TICK_S * 1000;
      }
      onFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // stateRef/steerRef/onFrame sont stables (refs + callback stable par construction)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
