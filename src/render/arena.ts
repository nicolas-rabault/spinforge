import { Application, Graphics } from 'pixi.js';
import { ARENA_RADIUS } from '../sim/config';
import { PALETTE } from '../theme';
import type { SimState } from '../sim/types';

const MARGIN = 1.06;

export interface Arena {
  beforeTick(state: SimState): void;
  afterTick(state: SimState): void;
  draw(state: SimState, alpha: number): void;
  destroy(): void;
}

export async function createArena(host: HTMLElement): Promise<Arena> {
  const app = new Application();
  await app.init({ resizeTo: host, background: PALETTE.bg, antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
  host.appendChild(app.canvas);
  const g = new Graphics();
  app.stage.addChild(g);

  const scale = () => Math.min(app.screen.width, app.screen.height) / (2 * ARENA_RADIUS * MARGIN);

  return {
    beforeTick() {},
    afterTick() {},
    draw(state) {
      const k = scale();
      const cx = app.screen.width / 2;
      const cy = app.screen.height / 2;
      g.clear();
      g.circle(cx, cy, ARENA_RADIUS * k).stroke({ width: 2, color: PALETTE.rim });
      for (const b of state.bots) {
        g.circle(cx + b.pos.x * k, cy + b.pos.y * k, b.radius * k).fill(PALETTE.bot);
      }
      const p = state.player;
      g.circle(cx + p.pos.x * k, cy + p.pos.y * k, p.radius * k).fill(PALETTE.player);
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
