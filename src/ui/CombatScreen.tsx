import { useEffect, useRef, useState } from 'react';
import { createArena } from '../render/arena';
import { useGameLoop } from './useGameLoop';
import { chapterOf } from '../content/chapters';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { maxPlayableChapter, startRun } from '../sim/sim';
import { botTypeFor } from '../sim/salle';
import { TYPE_LABELS } from './typeLabels';
import type { MetaState, RunState, Vec } from '../sim/types';
import type { Audio } from '../audio/audio';

const DEAD_ZONE_PX = 8;
const ONBOARDED_KEY = 'spinforge.onboarded';

interface Banner {
  text: string;
  tint: string;
}

function chapterChipStyle(selected: boolean) {
  return {
    flex: '1 1 auto', minHeight: 38, borderRadius: 9, cursor: 'pointer' as const,
    border: `1px solid ${selected ? 'var(--ember)' : 'var(--line)'}`,
    background: selected ? 'var(--ember)' : 'var(--panel)',
    color: selected ? 'var(--ink)' : 'var(--text)',
    font: '600 12.5px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em',
  };
}

export function CombatScreen({
  runRef, metaRef, running, chapterToPlay, onPickChapter, onTick, onMetaChanged, audio,
}: {
  runRef: { current: RunState };
  metaRef: { current: MetaState };
  running: boolean;
  /** Le chapitre que la prochaine descente utilisera, calculé par `App` — choix
   *  du joueur ou suggestion. L'écran des toupies lit exactement le même. */
  chapterToPlay: number;
  /** `null` rend la main à la suggestion : c'est ce que fait chaque descente lancée. */
  onPickChapter: (chapter: number | null) => void;
  onTick: () => void;
  onMetaChanged: () => void;
  audio: Audio;
}) {
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const pointerRef = useRef<number | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
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
            // Le triangle ne se lit en combat que par la teinte d'un point sur le
            // bot (§ 5.4) : sans ce texte, rien ne dit ce que cette teinte veut
            // dire. La salle boss garde son annonce dédiée, plus utile qu'un type.
            const isBoss = run.salle === SALLES_PER_CHAPTER;
            setBanner(
              isBoss
                ? { text: chapterOf(run.chapter).boss, tint: 'var(--boss)' }
                : { text: `Salle ${run.salle} · ${TYPE_LABELS[botTypeFor(run.chapter, run.salle)]}`, tint: `var(--type-${botTypeFor(run.chapter, run.salle)})` },
            );
            window.setTimeout(() => setBanner(null), 2100);
          }
          // Le rotor se tait dès que la descente est fermée — morte ou gagnée :
          // sans ce `null`, l'oscillateur tenait sa dernière fréquence par-dessus
          // l'écran de fin.
          audio.setSpin(run.phase !== 'fighting' ? null : run.player.spin / run.player.spinMax);
        }
        onTick();
      },
      draw: (run, alpha) => arenaRef.current?.draw(run, alpha),
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
                background: 'rgba(8,10,15,.82)', borderTop: `2px solid ${banner.tint}`, borderBottom: `2px solid ${banner.tint}`,
                padding: '10px 0', textAlign: 'center', pointerEvents: 'none',
                font: '600 17px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
              }}
            >
              {banner.text}
            </div>
          ) : null}
        </div>
      </div>

      {/* Hors de l'arène, à dessein : posée en surimpression, l'explication masquait
          les deux toupies qu'elle désigne. L'espace vertical libre autour du carré
          suffit à l'accueillir sans rétrécir le terrain de jeu. */}
      {hint ? (
        <div
          style={{
            border: '1px solid var(--player)', borderRadius: 11, padding: '9px 12px',
            background: 'rgba(128,232,255,.06)', textAlign: 'center', pointerEvents: 'none',
          }}
        >
          <p style={{ margin: 0, font: '600 14px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em', color: 'var(--player)' }}>
            ▾ TA TOUPIE EST CELLE DU CHEVRON
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.4 }}>
            Glisse le doigt n'importe où pour la piloter.{' '}
            <strong style={{ color: 'var(--ember)' }}>Fonce dans l'adversaire</strong> : qui charge casse
            plus et encaisse moins.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {/* Le chevron et la teinte reprennent exactement ceux du repère porté par la
            toupie du joueur : la barre nomme la toupie autant qu'elle mesure son spin. */}
        <span style={{ fontSize: 11, color: 'var(--player)', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>▾ TON SPIN</span>
        <div style={{ flex: '1 1 0', height: 9, borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${spinPct}%`, height: '100%', background: 'var(--player)' }} />
        </div>
      </div>

      {s.phase !== 'fighting' ? (() => {
        const maxChapter = maxPlayableChapter(metaRef.current);
        return (
          <section
            style={{
              border: '1px solid var(--ember)', background: 'var(--panel)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <p style={{ margin: 0, font: '600 15px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.03em' }}>
              {s.phase === 'won' ? `Chapitre ${s.chapter} validé` : 'Ta toupie s’est arrêtée'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              {s.phase === 'won'
                ? (metaRef.current.bestChapter > s.chapter
                    ? 'Tu l’avais déjà validé : les crédits, eux, restent bons à prendre.'
                    : (maxChapter > s.chapter
                        ? `Le chapitre ${s.chapter + 1} s’ouvre.`
                        : 'Fin du contenu actuel : les chapitres suivants arrivent plus tard.'))
                : 'Tes crédits sont gardés.'}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Choisis ta descente</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: maxChapter }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => onPickChapter(n)} style={chapterChipStyle(n === chapterToPlay)}>
                  {n} — {chapterOf(n).name}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                // La graine continue le flux de la descente précédente : deux runs
                // consécutifs ne rejouent pas les mêmes gabarits d'arène, et aucune
                // horloge n'entre dans la simulation.
                runRef.current = startRun(metaRef.current, chapterToPlay, s.rngState);
                onPickChapter(null);
                onTick();
              }}
              style={{
                minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
                background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
              }}
            >
              Nouvelle descente
            </button>
          </section>
        );
      })() : null}
    </div>
  );
}
