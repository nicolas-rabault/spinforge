import { Application, Container, Sprite, Texture } from 'pixi.js';
import { ARENA_RADIUS, SALLES_PER_CHAPTER } from '../sim/config';
import { PALETTE } from '../theme';
import type { SimState } from '../sim/types';
import { createTextures, destroyTextures, floorTexture, type Shape } from './textures';
import { createTopView, type TopView } from './topView';
import { lerp, snapshotById, takeSnapshot, type Snapshot } from './snapshot';

/** Marge entre le bord de l'anneau et le bord du canvas. */
const MARGIN = 1.1;

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
  world.addChild(floorLayer, topLayer);
  app.stage.addChild(world);

  const floor = new Sprite(Texture.EMPTY);
  floor.anchor.set(0.5);
  floor.width = floor.height = ARENA_RADIUS * 2 * 1.06;
  floorLayer.addChild(floor);

  const views = new Map<string, TopView>();
  let before: Snapshot | null = null;
  let snapPositions = true;
  let floorPx = 0;
  let lastDraw = performance.now();

  function layout(): void {
    const size = Math.min(app.screen.width, app.screen.height);
    world.scale.set(size / (2 * ARENA_RADIUS * MARGIN));
    world.x = app.screen.width / 2;
    world.y = app.screen.height / 2;
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
      view = createTopView(tex, shape, isPlayer ? 'player' : boss ? 'boss' : 'bot', radius);
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
      // Au changement de salle, la simulation téléporte le joueur au point de
      // départ : interpoler ferait glisser la toupie à travers l'arène.
      if (before && before.salle !== state.salle) snapPositions = true;
    },
    draw(state, alpha) {
      const now = performance.now();
      const dt = Math.min((now - lastDraw) / 1000, 0.05);
      lastDraw = now;
      layout();

      const prev = before ? snapshotById(before) : null;
      const live = new Set<string>();
      const tops = [state.player, ...state.bots];

      for (const top of tops) {
        live.add(top.id);
        const view = viewFor(top.id, top.isPlayer, top.radius, state.salle);
        const p = prev?.get(top.id);
        const useLerp = p && !snapPositions;
        const x = useLerp ? lerp(p.x, top.pos.x, alpha) : top.pos.x;
        const y = useLerp ? lerp(p.y, top.pos.y, alpha) : top.pos.y;
        const ratio = Math.max(0, Math.min(1, top.spin / top.spinMax));
        const speedRatio = Math.hypot(top.vel.x, top.vel.y) / top.maxSpeed;
        view.sync(x, y, ratio, speedRatio, dt);
      }
      snapPositions = false;

      for (const [id, view] of views) {
        if (live.has(id)) continue;
        view.destroy();
        views.delete(id);
      }
    },
    destroy() {
      for (const view of views.values()) view.destroy();
      views.clear();
      if (floor.texture !== Texture.EMPTY) floor.texture.destroy(true);
      destroyTextures(tex);
      app.destroy(true, { children: true });
    },
  };
}
