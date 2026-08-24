import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../sim/sim';
import { createArena } from '../render/arena';
import { useGameLoop } from './useGameLoop';
import { Hud } from './Hud';
import type { Vec } from '../sim/types';

const DEAD_ZONE_PX = 8;

export function Game() {
  const [initialState] = useState(() => createInitialState(Date.now() >>> 0));
  const stateRef = useRef(initialState);
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const pointerRef = useRef<number | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let disposed = false;
    createArena(hostRef.current!).then((arena) => {
      if (disposed) arena.destroy();
      else arenaRef.current = arena;
    });
    return () => {
      disposed = true;
      arenaRef.current?.destroy();
      arenaRef.current = null;
    };
  }, []);

  useGameLoop(stateRef, steerRef, () => {
    arenaRef.current?.draw(stateRef.current);
    setFrame((f) => f + 1);
  });

  const onDown = (e: React.PointerEvent) => {
    if (pointerRef.current !== null) return; // un seul doigt pilote à la fois
    pointerRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerRef.current || !originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    steerRef.current = Math.hypot(dx, dy) > DEAD_ZONE_PX ? { x: dx, y: dy } : null;
  };
  const onUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerRef.current) return;
    pointerRef.current = null;
    originRef.current = null;
    steerRef.current = null;
  };

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        minHeight: '100vh',
        background: '#14171d',
        color: '#e8eaee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 16,
      }}
    >
      <div ref={hostRef}></div>
      <Hud stateRef={stateRef} />
    </div>
  );
}
