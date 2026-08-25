import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { ARENA_RADIUS, SALLES_PER_CHAPTER } from '../sim/config';
import { PALETTE, spinTint } from '../theme';
import type { SimState } from '../sim/types';
import { createTextures, destroyTextures, floorTexture, type Shape } from './textures';
import { FEEL } from './feel';
import { createTopView, type TopView } from './topView';
import { lerp, snapshotById, takeSnapshot, type Snapshot } from './snapshot';
import { observe } from './observer';
import { createEffects, type Effects } from './effects';

/** Marge entre le bord de l'anneau et le bord du canvas. */
const MARGIN = 1.1;
/** Rayon visuel du disque du sol, même facteur de bord que floorTexture() (textures.ts) :
 * un cercle, pas le carré de la texture qui le contient. */
const FLOOR_VISUAL_RADIUS = ARENA_RADIUS * 1.06 * 0.94;

export interface Arena {
  beforeTick(state: SimState): void;
  afterTick(state: SimState): void;
  draw(state: SimState, alpha: number): void;
  destroy(): void;
}

export async function createArena(host: HTMLElement): Promise<Arena> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: PALETTE.bg,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const tex = createTextures();
  const world = new Container();
  const floorLayer = new Container();
  const topLayer = new Container();
  const effects: Effects = createEffects(tex);
  world.addChild(floorLayer, topLayer, effects.container);
  app.stage.addChild(world);

  const floor = new Sprite(Texture.EMPTY);
  floor.anchor.set(0.5);
  floor.width = floor.height = ARENA_RADIUS * 2 * 1.06;
  floorLayer.addChild(floor);

  // Un cercle, pas un carré : le voile doit épouser le disque du sol, pas
  // déborder dans les coins du canvas où la page est visible derrière.
  const dim = new Graphics().circle(0, 0, FLOOR_VISUAL_RADIUS).fill(0x04050a);
  dim.alpha = 0;
  floorLayer.addChild(dim);

  // La porte du haut, qui s'allume pendant la transition de salle.
  const door = new Graphics();
  floorLayer.addChild(door);

  // Un cercle, pas un carré, même raison que dim : un voile carré déborderait
  // du disque du sol et découperait un angle droit visible dans les coins.
  const flash = new Graphics().circle(0, 0, ARENA_RADIUS * 1.2).fill(0xffe2b2);
  flash.alpha = 0;
  flash.blendMode = 'add';
  floorLayer.addChild(flash);

  const views = new Map<string, TopView>();
  let before: Snapshot | null = null;
  let snapPositions = true;
  let bossEntry = 0; // secondes restantes d'entrée du boss
  let reforge = 0; // secondes restantes de transition de salle
  let reforgeFlash = 0; // secondes restantes d'éclair
  let lastReforgeAt = -Infinity;
  let floorPx = 0;
  let lastDraw = performance.now();

  function layout(): void {
    const size = Math.min(app.screen.width, app.screen.height);
    world.scale.set(size / (2 * ARENA_RADIUS * MARGIN));
    const wanted = Math.max(256, Math.round(size * Math.min(window.devicePixelRatio || 1, 2)));
    if (wanted !== floorPx) {
      floorPx = wanted;
      const old = floor.texture;
      floor.texture = floorTexture(wanted);
      if (old !== Texture.EMPTY) old.destroy(true);
    }
  }

  function viewFor(id: string, isPlayer: boolean, radius: number, salle: number): TopView {
    let view = views.get(id);
    if (!view) {
      const shape: Shape = isPlayer ? 'player' : 'bot';
      const boss = !isPlayer && salle === SALLES_PER_CHAPTER;
      view = createTopView(tex, shape, isPlayer ? 'player' : boss ? 'boss' : 'bot', radius, boss);
      topLayer.addChild(view.container);
      views.set(id, view);
    }
    return view;
  }

  return {
    beforeTick(state) {
      before = takeSnapshot(state);
    },
    afterTick(state) {
      if (!before) return;
      const after = takeSnapshot(state);
      const events = observe(before, after);
      for (const hit of events.hits) {
        const view = views.get(hit.id);
        view?.flash(hit.power);
        const top = [state.player, ...state.bots].find((t) => t.id === hit.id);
        const radius = top?.radius ?? 12;
        const ratio = top ? Math.max(0, Math.min(1, top.spin / top.spinMax)) : 0;
        const camp = hit.id === 'player' ? 'player' : after.salle === SALLES_PER_CHAPTER ? 'boss' : 'bot';
        effects.hit(
          hit.x + hit.nx * radius,
          hit.y + hit.ny * radius,
          hit.nx,
          hit.ny,
          hit.power,
          spinTint(camp, ratio),
        );
      }
      for (const death of events.deaths) {
        const view = views.get(death.id);
        view?.kill();
        effects.wave(death.x, death.y, 34, 0xffd9a0);
      }
      if (events.bossEntered) {
        bossEntry = FEEL.bossEntryLife;
        const boss = state.bots[0];
        if (boss) effects.wave(boss.pos.x, boss.pos.y, ARENA_RADIUS * 1.4, PALETTE.boss);
      }
      // Au changement de salle, la simulation téléporte le joueur au point de
      // départ : interpoler ferait glisser la toupie à travers l'arène.
      if (before.salle !== after.salle) {
        snapPositions = true;
        const now = performance.now() / 1000;
        // Dix transitions par chapitre : on atténue quand elles s'enchaînent.
        const quick = now - lastReforgeAt < FEEL.reforgeQuickWindow;
        lastReforgeAt = now;
        reforge = FEEL.reforgeLife;
        reforgeFlash = FEEL.reforgeFlashLife * (quick ? FEEL.reforgeQuickScale : 1);
        for (const bot of state.bots) {
          effects.wave(bot.pos.x, bot.pos.y, 30, PALETTE.ember);
        }
      }
    },
    draw(state, alpha) {
      const now = performance.now();
      const dt = Math.min((now - lastDraw) / 1000, 0.05);
      lastDraw = now;
      layout();
      effects.update(dt);
      if (bossEntry > 0) {
        bossEntry = Math.max(0, bossEntry - dt);
        dim.alpha = 0.72 * (bossEntry / FEEL.bossEntryLife);
      } else if (dim.alpha !== 0) {
        dim.alpha = 0;
      }
      if (reforge > 0) reforge = Math.max(0, reforge - dt);
      if (reforgeFlash > 0) reforgeFlash = Math.max(0, reforgeFlash - dt);
      flash.alpha = reforgeFlash > 0 ? 0.5 * (reforgeFlash / FEEL.reforgeFlashLife) : 0;

      // La porte s'allume le temps de la transition — la simulation n'a jamais
      // d'état « salle vide » à représenter autrement.
      const lit = reforge > 0 ? reforge / FEEL.reforgeLife : 0;
      door.clear();
      door.arc(0, 0, ARENA_RADIUS, -1.9, -1.24);
      door.stroke({ width: 3 + 4 * lit, color: PALETTE.ember, alpha: 0.22 + 0.7 * lit });
      world.x = app.screen.width / 2 + effects.shake.x * world.scale.x;
      world.y = app.screen.height / 2 + effects.shake.y * world.scale.y;

      const prev = before ? snapshotById(before) : null;
      const live = new Set<string>();
      const tops = [state.player, ...state.bots];

      for (const top of tops) {
        live.add(top.id);
        const view = viewFor(top.id, top.isPlayer, top.radius, state.salle);
        // Une toupie présente dans l'état (typiquement le joueur après un Retenter)
        // ne doit jamais rester figée dans sa pose d'agonie : on la ressuscite.
        // Les vues orphelines (bots retirés de state.bots) ne passent pas par cette
        // boucle, donc leur agonie va bien à son terme dans la boucle de nettoyage.
        view.revive();
        const p = prev?.get(top.id);
        const useLerp = p && !snapPositions;
        const x = useLerp ? lerp(p.x, top.pos.x, alpha) : top.pos.x;
        const y = useLerp ? lerp(p.y, top.pos.y, alpha) : top.pos.y;
        const ratio = Math.max(0, Math.min(1, top.spin / top.spinMax));
        const speedRatio = Math.hypot(top.vel.x, top.vel.y) / top.maxSpeed;
        // Les nouvelles toupies tombent du plafond pendant la reforge.
        const drop = reforge > 0 && !top.isPlayer ? -(reforge / FEEL.reforgeLife) * ARENA_RADIUS * 0.7 : 0;
        view.sync(x, y + drop, ratio, speedRatio, dt);
      }
      snapPositions = false;

      for (const [id, view] of views) {
        if (live.has(id)) continue;
        // La toupie n'est plus dans la simulation, qu'elle ait été tuée (bot mort)
        // ou simplement remplacée sans mourir (les survivants d'une salle sont
        // écrasés par startSalle quand le joueur meurt et retente) : kill() est
        // idempotente, donc l'appeler sans condition force toute vue orpheline à
        // agoniser puis à finir par isFinished(), au lieu de rester figée à jamais.
        view.kill();
        view.sync(view.container.x, view.container.y, 0, 0, dt);
        if (!view.isFinished()) continue;
        view.destroy();
        views.delete(id);
      }
    },
    destroy() {
      for (const view of views.values()) view.destroy();
      views.clear();
      if (floor.texture !== Texture.EMPTY) floor.texture.destroy(true);
      effects.destroy();
      destroyTextures(tex);
      app.destroy(true, { children: true });
    },
  };
}
