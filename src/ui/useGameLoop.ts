import { useEffect, useRef } from 'react';
import { TICK_S } from '../sim/config';
import { tick } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

const STEP_MS = TICK_S * 1000;
const MAX_CATCHUP_MS = 250;

export interface GameLoopHandlers {
  /** Appelé juste avant chaque tick : le rendu y prend son instantané. */
  beforeTick(state: SimState): void;
  /** Appelé juste après chaque tick : le rendu y déduit ses événements. */
  afterTick(state: SimState): void;
  /** Appelé une fois par image. `alpha` ∈ [0, 1) interpole entre les deux derniers ticks. */
  draw(state: SimState, alpha: number): void;
}

export function useGameLoop(
  stateRef: { current: SimState },
  steerRef: { current: Vec | null },
  handlers: GameLoopHandlers,
  running: boolean,
): void {
  // Les rappels changent à chaque rendu ; la boucle lit toujours les derniers
  // via cette ref, ce qui supprime la closure figée de la version précédente.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(now - last, MAX_CATCHUP_MS);
      last = now;
      const h = handlersRef.current;
      if (!runningRef.current) {
        acc = 0;
        return;
      }
      acc += elapsed;
      while (acc >= STEP_MS) {
        h.beforeTick(stateRef.current);
        tick(stateRef.current, { steer: steerRef.current });
        h.afterTick(stateRef.current);
        acc -= STEP_MS;
      }
      h.draw(stateRef.current, acc / STEP_MS);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stateRef, steerRef]);
}
