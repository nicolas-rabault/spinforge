import { useEffect, useMemo, useRef, useState } from 'react';
import { createArena } from '../render/arena';
import { playerArt } from '../art/toupie';
import { useGameLoop } from './useGameLoop';
import { chapterBoss, chapterName } from './contentLabels';
import { t } from '../i18n';
import { tx } from '../i18n/tx';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { maxPlayableChapter, startRun } from '../sim/sim';
import { steerWithTerrain } from '../sim/autopilot';
import { PipTrack } from './art/PipTrack';
import type { MetaState, RunState, Vec } from '../sim/types';
import { audio } from '../audio/audio';
import { MIX } from '../audio/mix';

const DEAD_ZONE_PX = 8;
const ONBOARDED_KEY = 'spinforge.onboarded';

function chapterChipStyle(selected: boolean) {
  return {
    flex: '1 1 auto', minHeight: 38, padding: '0 12px', borderRadius: 9, cursor: 'pointer' as const,
    border: `1px solid ${selected ? 'var(--ember)' : 'var(--line)'}`,
    background: selected ? 'var(--ember)' : 'rgba(19,25,34,.9)',
    color: selected ? 'var(--ink)' : 'var(--text)',
    font: '600 12.5px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em',
  };
}

/**
 * Le choix de la prochaine descente : les pastilles de chapitre et le bouton qui
 * part. Un seul exemplaire dans le projet, monté à DEUX endroits — le voile de
 * fin de descente et l'invite du décor — parce que deux panneaux divergeraient.
 *
 * `meta` est toujours le VRAI méta, jamais celui du décor : partir avec un méta
 * figé au montage lancerait la descente sans les pièces qu'on vient d'acheter,
 * ni le châssis qu'on vient d'équiper.
 */
function RunPicker({
  meta, runRef, chapterToPlay, onPickChapter, onTick,
}: {
  meta: MetaState;
  runRef: { current: RunState };
  chapterToPlay: number;
  onPickChapter: (chapter: number | null) => void;
  onTick: () => void;
}) {
  const maxChapter = maxPlayableChapter(meta);
  return (
    <>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{t('combat.pickRun')}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'stretch' }}>
        {Array.from({ length: maxChapter }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPickChapter(n)} style={chapterChipStyle(n === chapterToPlay)}>
            {t('combat.chapterChip', { n, name: chapterName(n) })}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          // La graine continue le flux de la descente précédente — celle du décor
          // comme celle qu'on vient de perdre : deux runs consécutifs ne rejouent
          // pas les mêmes gabarits d'arène, et aucune horloge n'entre dans la
          // simulation. `onTick` signale à App qu'un run tout neuf est posé, ce
          // qui le fait repasser en partie pilotée.
          runRef.current = startRun(meta, chapterToPlay, runRef.current.rngState);
          onPickChapter(null);
          onTick();
        }}
        style={{
          minHeight: 50, padding: '0 34px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid var(--ember)', background: 'var(--ember)', color: 'var(--ink)',
          font: '600 16px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em',
        }}
      >
        {t('combat.newRun')}
      </button>
    </>
  );
}

export function CombatScreen({
  runRef, metaRef, rewardMetaRef, running, piloted, chapterToPlay, onPickChapter, onTick, onMetaChanged,
}: {
  runRef: { current: RunState };
  /** Le VRAI méta, toujours : tout ce que cet écran affiche et tout ce qu'il
   *  lance en part — art équipé, pastilles de chapitre, `startRun`. */
  metaRef: { current: MetaState };
  /** Le méta qui ENCAISSE les récompenses de la boucle de jeu. Identique au
   *  précédent en partie pilotée ; en décor, un clone jetable, puisque le décor
   *  ne crédite rien (la vraie monnaie vient de `farm`, côté App). */
  rewardMetaRef: { current: MetaState };
  running: boolean;
  /** Vrai en partie pilotée (le doigt commande le run affiché), faux en décor
   *  (l'autopilote le commande) — bascule unique de la source de pilotage
   *  donnée à `useGameLoop` ci-dessous. Alimenté par `playing` côté App. */
  piloted: boolean;
  /** Le chapitre que la prochaine descente utilisera, calculé par `App` — choix
   *  du joueur ou suggestion. L'écran des toupies lit exactement le même. */
  chapterToPlay: number;
  /** `null` rend la main à la suggestion : c'est ce que fait chaque descente lancée. */
  onPickChapter: (chapter: number | null) => void;
  onTick: () => void;
  onMetaChanged: () => void;
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
  }, [running]);

  // Source de pilotage donnée à `useGameLoop` : le doigt en partie pilotée,
  // l'autopilote en décor — sans que `useGameLoop` (qui ne fait que lire
  // `.current` à chaque tick) ait à savoir laquelle des deux commande. Un
  // getter suffit, structurellement compatible avec ce que `useGameLoop`
  // attend d'un `steerRef`. Mémorisé sur la seule bascule `piloted` : un
  // objet recréé à chaque rendu relancerait la boucle de `useGameLoop`, qui
  // le porte dans les dépendances de son effet.
  const steerSourceRef = useMemo(() => ({
    get current(): Vec | null {
      return piloted ? steerRef.current : steerWithTerrain(runRef.current);
    },
  }), [piloted, runRef]);

  // `rewardMetaRef` et non `metaRef` : c'est cette boucle, et elle seule, qui
  // applique les récompenses du run affiché — celles du décor doivent tomber
  // dans le clone jetable.
  useGameLoop(
    runRef,
    rewardMetaRef,
    steerSourceRef,
    {
      beforeTick: (run) => arenaRef.current?.beforeTick(run),
      afterTick: (run) => {
        arenaRef.current?.afterTick(run);
        const events = arenaRef.current?.consumeEvents();
        if (events) {
          // Les frôlements entre bots ne méritent pas un son ; les tiens, toujours.
          for (const hit of events.hits) if (hit.id === 'player' || hit.power > MIX.hitBotThreshold) audio.hit(hit.power);
          if (events.deaths.some((d) => d.isPlayer)) audio.death();
          // Le boss vaincu ferme la descente : la salle ne change plus en le
          // battant, donc ce son ne peut plus vivre dans la branche
          // `salleChanged` — il n'y serait jamais parvenu.
          if (events.chapterValidated) audio.bossDown();
          else if (events.salleChanged) {
            // Une porte qui s'ouvre reste vraie même en décor : la salle a
            // réellement changé. Pas de garde ici.
            audio.door();
            // Seul le boss garde une annonce écrite : nommer le Gardien du Hangar à
            // son entrée est de la mise en scène. Le type de l'adversaire, lui, se
            // lit désormais sur la toupie elle-même — badge d'avantage porté par le
            // bot — au lieu d'un bandeau « Salle 4 · Défense » qui nommait un type
            // sans dire ce qu'il fallait en faire.
            //
            // `piloted` ici : en décor, `handleRunTick` (App.tsx) referme la
            // salle 10 avant qu'elle ne soit jouée — mais son remplacement du
            // run et ce `setBossBanner` sont deux mises à jour d'état
            // groupées par React dans le même passage, donc sans cette garde
            // le bandeau resterait affiché par-dessus une descente déjà
            // repartie en salle 1 : une annonce d'un combat qui n'aura pas
            // lieu.
            if (piloted && run.salle === SALLES_PER_CHAPTER) {
              setBossBanner(chapterBoss(run.chapter));
              window.setTimeout(() => setBossBanner(null), 2100);
            }
          }
          // Le rotor se tait dès que la descente est fermée — morte ou gagnée :
          // sans ce `null`, l'oscillateur tenait sa dernière fréquence par-dessus
          // l'écran de fin.
          audio.setSpin(run.phase !== 'fighting' ? null : run.player.spin / run.player.spinMax);
        }
        onTick();
      },
      draw: (run, alpha) =>
        arenaRef.current?.draw(run, alpha, playerArt(metaRef.current.equipped, run.toupie)),
      onReward: (reward) => {
        audio.reward(reward.chests.length);
        onMetaChanged();
      },
    },
    running,
  );

  // En décor, le doigt ne pilote pas — « le mode auto n'est pas jouable » est
  // une exigence explicite du jeu. Un contact sur l'arène pendant le décor ne
  // fait donc rien : ni piloter, ni entamer une partie pilotée (ça, c'est le
  // bouton « Nouvelle descente » du voile, seul canal prévu pour ça).
  const onDown = (e: React.PointerEvent) => {
    if (!piloted) return;
    // Glisser n'importe où pilote la toupie — sauf sur un bouton.
    if ((e.target as HTMLElement).closest('button')) return;
    if (pointerRef.current !== null) return;
    pointerRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!piloted) return;
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
    if (!piloted) return;
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
          qu'elle désigne. `piloted` : en décor le doigt ne commande rien, une
          consigne de pilotage y serait fausse — et l'invite ci-dessous occupe
          déjà ce coin de l'écran. */}
      {hint && piloted ? (
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

      {/* Fin de descente : le même voile plein écran qu'à la mort, puisque c'est
          la même chose — la descente est close. Il porte désormais le choix du
          chapitre suivant : la mécanique du lot A dans la mise en page de la
          refonte, plutôt qu'un panneau de plus sous l'arène. */}
      {s.phase !== 'fighting' ? (() => {
        const maxChapter = maxPlayableChapter(metaRef.current);
        return (
          <div
            style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 20px',
              background: 'rgba(5,7,11,.72)',
            }}
          >
            <p style={{ margin: 0, font: '600 22px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>
              {s.phase === 'won' ? t('combat.won.title', { n: s.chapter }) : t('combat.dead.title')}
            </p>
            {/* Le rejeu passe en premier : sans lui, refaire un chapitre déjà
                validé annoncerait l'ouverture d'un chapitre ouvert depuis
                longtemps. */}
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
              {s.phase === 'won'
                ? (metaRef.current.bestChapter > s.chapter
                    ? t('combat.won.replay')
                    : (maxChapter > s.chapter
                        ? t('combat.won.unlock', { n: s.chapter + 1 })
                        : t('combat.won.last')))
                : t('combat.dead.body')}
            </p>
            <RunPicker
              meta={metaRef.current} runRef={runRef} chapterToPlay={chapterToPlay}
              onPickChapter={onPickChapter} onTick={onTick}
            />
          </div>
        );
      })() : !piloted ? (
        /* L'invite du décor. Sans elle, un joueur qui revient n'a AUCUN moyen de
           lancer une descente : le décor referme la sienne dans le même bloc
           synchrone que le tick, donc le voile ci-dessus ne s'affiche jamais, et
           le doigt est inerte tant que personne ne pilote. Elle est permanente
           tant que le décor tourne — pas un voile plein écran : le décor doit
           rester visible derrière, c'est tout son objet. */
        <div
          style={{
            position: 'absolute', left: 12, right: 12, bottom: 80,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            border: '1px solid var(--line)', borderRadius: 12, padding: '12px 12px 14px',
            background: 'rgba(6,8,12,.9)',
          }}
        >
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4, textAlign: 'center', color: 'var(--muted)' }}>
            {t('combat.decor.body')}
          </p>
          <RunPicker
            meta={metaRef.current} runRef={runRef} chapterToPlay={chapterToPlay}
            onPickChapter={onPickChapter} onTick={onTick}
          />
        </div>
      ) : null}
    </div>
  );
}
