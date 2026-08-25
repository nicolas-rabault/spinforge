import { useEffect, useRef, useState } from 'react';
import { createArena } from '../render/arena';
import { useGameLoop } from './useGameLoop';
import { chapterOf } from '../content/chapters';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { resetRun } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

const DEAD_ZONE_PX = 8;

export function CombatScreen({
  stateRef, running, onTick,
}: {
  stateRef: { current: SimState };
  running: boolean;
  onTick: () => void;
}) {
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const pointerRef = useRef<number | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<string | null>(null);
  // Sans ce garde-fou, le bandeau se rejouerait à chaque tick passé en salle 10.
  const bannerDoneRef = useRef(false);

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

  useGameLoop(
    stateRef,
    steerRef,
    {
      beforeTick: (state) => arenaRef.current?.beforeTick(state),
      afterTick: (state) => {
        arenaRef.current?.afterTick(state);
        if (state.salle !== SALLES_PER_CHAPTER) {
          bannerDoneRef.current = false;
        } else if (!bannerDoneRef.current) {
          bannerDoneRef.current = true;
          setBanner(chapterOf(state.chapter).boss);
          window.setTimeout(() => setBanner(null), 2100);
        }
        onTick();
      },
      draw: (state, alpha) => arenaRef.current?.draw(state, alpha),
    },
    running,
  );

  const onDown = (e: React.PointerEvent) => {
    // Glisser n'importe où pilote la toupie — sauf sur un bouton.
    if ((e.target as HTMLElement).closest('button')) return;
    if (pointerRef.current !== null) return;
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

  const s = stateRef.current;
  const chapter = chapterOf(s.chapter);
  const spinPct = Math.max(0, Math.min(100, (s.player.spin / s.player.spinMax) * 100));

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, touchAction: 'none' }}
    >
      <section style={{ border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11, padding: '9px 12px' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          Chapitre {s.chapter} — {chapter.name}
        </p>
        <p style={{ margin: 0, font: '500 22px/1.15 Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em' }}>
          SALLE {s.salle} / {SALLES_PER_CHAPTER}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {s.salle === SALLES_PER_CHAPTER ? chapter.boss : `Boss : salle ${SALLES_PER_CHAPTER}`}
          </span>
          <div style={{ flex: '1 1 0', height: 7, borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            <div style={{ width: `${((s.salle - 1) / (SALLES_PER_CHAPTER - 1)) * 100}%`, height: '100%', background: 'var(--ember)' }} />
          </div>
        </div>
      </section>

      {/* Ce panneau prend tout l'espace vertical restant (flex: 1 1 0, minHeight: 0
          l'autorise à se comprimer sous sa taille naturelle) ; le conteneur de
          requête (containerType: size) donne à ses unités cq la taille réellement
          disponible, et min(100cqw, 100cqh) choisit le plus grand carré qui y tient
          — l'arène reste carrée sur toute taille d'écran, sans jamais pousser la
          barre d'onglets hors du viewport. */}
      <div style={{ flex: '1 1 0', minHeight: 0, containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 'min(100cqw, 100cqh)', aspectRatio: '1 / 1' }}>
          <div ref={hostRef} style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', background: '#05070b' }} />
          {banner ? (
            <div
              style={{
                position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(8,10,15,.82)', borderTop: '2px solid var(--boss)', borderBottom: '2px solid var(--boss)',
                padding: '10px 0', textAlign: 'center', pointerEvents: 'none',
                font: '600 17px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
              }}
            >
              {banner}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.07em' }}>SPIN</span>
        <div style={{ flex: '1 1 0', height: 9, borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${spinPct}%`, height: '100%', background: 'var(--player)' }} />
        </div>
      </div>

      {s.phase === 'dead' ? (
        <button
          onClick={() => { resetRun(stateRef.current); onTick(); }}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          Ta toupie s'est arrêtée — Retenter
        </button>
      ) : null}
    </div>
  );
}
