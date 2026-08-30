import { useEffect, useRef } from 'react';
import { SALLES_PER_CHAPTER, TICK_S } from '../sim/config';
import { equipPendingToupie, tick } from '../sim/sim';
import { applyRunReward } from '../sim/meta';
import type { MetaState, RunReward, RunState, Vec } from '../sim/types';

const STEP_MS = TICK_S * 1000;
const MAX_CATCHUP_MS = 250;

export interface GameLoopHandlers {
  /** Appelé juste avant chaque tick : le rendu y prend son instantané. */
  beforeTick(run: RunState): void;
  /** Appelé juste après chaque tick : le rendu y déduit ses événements. */
  afterTick(run: RunState): void;
  /** Appelé une fois par image. `alpha` ∈ [0, 1) interpole entre les deux derniers ticks. */
  draw(run: RunState, alpha: number): void;
  /** Appelé quand une salle vient d'être vidée, après application au méta. */
  onReward(reward: RunReward): void;
}

export function useGameLoop(
  runRef: { current: RunState },
  metaRef: { current: MetaState },
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
        h.beforeTick(runRef.current);
        const salleBefore = runRef.current.salle;
        const reward = tick(runRef.current, { steer: steerRef.current });
        if (reward) {
          applyRunReward(metaRef.current, reward, salleBefore);
          // Le boss vidé referme la descente : c'est la seule frontière, avec la
          // mort, où le châssis choisi entre-temps monte sur la toupie. `tick` a
          // déjà ramené `run.salle` à 1 pour le tour suivant.
          if (salleBefore === SALLES_PER_CHAPTER) equipPendingToupie(runRef.current, metaRef.current);
          h.onReward(reward);
        }
        h.afterTick(runRef.current);
        acc -= STEP_MS;
      }
      h.draw(runRef.current, acc / STEP_MS);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [runRef, metaRef, steerRef]);
}
