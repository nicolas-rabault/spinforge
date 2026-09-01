import { useEffect, useRef, useState } from 'react';
import { createArena } from '../render/arena';
import { playerArt } from '../art/toupie';
import { useGameLoop } from './useGameLoop';
import { chapterBoss, chapterName } from './contentLabels';
import { t } from '../i18n';
import { tx } from '../i18n/tx';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { resetRun } from '../sim/sim';
import { PipTrack } from './art/PipTrack';
import type { MetaState, RunState, Vec } from '../sim/types';
import type { Audio } from '../audio/audio';

const DEAD_ZONE_PX = 8;
const ONBOARDED_KEY = 'spinforge.onboarded';

export function CombatScreen({
  runRef, metaRef, running, onTick, onMetaChanged, audio,
}: {
  runRef: { current: RunState };
  metaRef: { current: MetaState };
  running: boolean;
  onTick: () => void;
  onMetaChanged: () => void;
  audio: Audio;
}) {
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const pointerRef = useRef<number | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [bossBanner, setBossBanner] = useState<string | null>(null);
  // Le premier lancement explique ce qu'aucun repère à l'écran ne peut dire seul :
  // laquelle est la tienne, et que foncer vaut mieux qu'attendre le choc.
  const [hint, setHint] = useState(() => localStorage.getItem(ONBOARDED_KEY) !== '1');

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

  useEffect(() => {
    // La boucle est en pause en Forge : plus personne n'appelle setSpin, et le
    // rotor sonnerait indéfiniment à sa dernière fréquence.
    if (!running) audio.setSpin(null);
  }, [running, audio]);

  useGameLoop(
    runRef,
    metaRef,
    steerRef,
    {
      beforeTick: (run) => arenaRef.current?.beforeTick(run),
      afterTick: (run) => {
        arenaRef.current?.afterTick(run);
        const events = arenaRef.current?.consumeEvents();
        if (events) {
          // Les frôlements entre bots ne méritent pas un son ; les tiens, toujours.
          for (const hit of events.hits) if (hit.id === 'player' || hit.power > 0.25) audio.hit(hit.power);
          if (events.deaths.some((d) => d.isPlayer)) audio.death();
          if (events.salleChanged) {
            audio.door();
            // Seul le boss garde une annonce écrite : nommer le Gardien du Hangar à
            // son entrée est de la mise en scène. Le type de l'adversaire, lui, se
            // lit désormais sur la toupie elle-même — badge d'avantage porté par le
            // bot — au lieu d'un bandeau « Salle 4 · Défense » qui nommait un type
            // sans dire ce qu'il fallait en faire.
            if (run.salle === SALLES_PER_CHAPTER) {
              setBossBanner(chapterBoss(run.chapter));
              window.setTimeout(() => setBossBanner(null), 2100);
            }
          }
          // Le rotor se tait à la mort : sans ce `null`, l'oscillateur tenait sa
          // dernière fréquence par-dessus l'écran de défaite.
          audio.setSpin(run.phase === 'dead' ? null : run.player.spin / run.player.spinMax);
        }
        onTick();
      },
      draw: (run, alpha) =>
        arenaRef.current?.draw(run, alpha, playerArt(metaRef.current.equipped, run.toupie)),
      onReward: () => { onMetaChanged(); },
    },
    running,
  );

  const onDown = (e: React.PointerEvent) => {
    // Doit démarrer même si le doigt tombe sur un bouton : le contexte audio
    // ne peut naître qu'au premier geste, avant le garde anti-glissement.
    audio.start();
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
    const steering = Math.hypot(dx, dy) > DEAD_ZONE_PX;
    steerRef.current = steering ? { x: dx, y: dy } : null;
    // La consigne est comprise dès qu'elle est exécutée : c'est le premier vrai
    // glissement qui referme l'explication, pas un minuteur.
    if (steering && hint) {
      localStorage.setItem(ONBOARDED_KEY, '1');
      setHint(false);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerRef.current) return;
    pointerRef.current = null;
    originRef.current = null;
    steerRef.current = null;
  };

  const s = runRef.current;

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', overflow: 'hidden' }}
    >
      {/* L'arène prend tout l'écran : l'en-tête et la barre d'onglets se posent
          par-dessus (voir App). Le carré central d'autrefois laissait 60 % de la
          hauteur au vide. */}
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Bandeau supérieur : nom du chapitre et les dix pastilles de salle. Posé
          sous les jetons de monnaie, sur un voile qui garantit la lisibilité
          quelle que soit la couleur d'ambiance du chapitre. */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 52,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          background: 'linear-gradient(180deg, rgba(6,8,12,.86) 0%, rgba(6,8,12,.55) 62%, rgba(6,8,12,0) 100%)',
          paddingBottom: 22, pointerEvents: 'none',
        }}
      >
        <span style={{ font: '500 12px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
          {chapterName(s.chapter)}
        </span>
        <PipTrack total={SALLES_PER_CHAPTER} current={s.salle} />
      </div>

      {bossBanner ? (
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: '46%', transform: 'translateY(-50%)',
            background: 'rgba(8,10,15,.82)', borderTop: '2px solid var(--boss)', borderBottom: '2px solid var(--boss)',
            padding: '10px 0', textAlign: 'center', pointerEvents: 'none',
            font: '600 17px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
          }}
        >
          {bossBanner}
        </div>
      ) : null}

      {/* Explication du premier lancement. Posée bas, au-dessus de la barre
          d'onglets : en surimpression au centre elle masquait les deux toupies
          qu'elle désigne. */}
      {hint ? (
        <div
          style={{
            position: 'absolute', left: 12, right: 12, bottom: 74,
            border: '1px solid var(--player)', borderRadius: 11, padding: '9px 12px',
            background: 'rgba(8,12,18,.88)', textAlign: 'center', pointerEvents: 'none',
          }}
        >
          <p style={{ margin: 0, font: '600 14px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em', color: 'var(--player)' }}>
            {t('combat.hint.title')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}>
            {tx('combat.hint.body', {
              charge: <strong style={{ color: 'var(--ember)' }}>{t('combat.hint.charge')}</strong>,
            })}
          </p>
        </div>
      ) : null}

      {s.phase === 'dead' ? (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            background: 'rgba(5,7,11,.72)',
          }}
        >
          <p style={{ margin: 0, font: '600 22px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            {t('combat.dead.title')}
          </p>
          <button
            onClick={() => { resetRun(runRef.current, metaRef.current); onTick(); }}
            style={{
              minHeight: 50, padding: '0 34px', borderRadius: 11, cursor: 'pointer',
              border: '1px solid var(--ember)', background: 'var(--ember)', color: 'var(--ink)',
              font: '600 16px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em',
            }}
          >
            {t('combat.retry')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
