import { Application, Graphics } from 'pixi.js';
import { ARENA_RADIUS } from '../sim/config';
import type { SimState } from '../sim/types';

const SIZE = 360;
const SCALE = 1.1;
const C = SIZE / 2;

export async function createArena(container: HTMLElement) {
  const app = new Application();
  await app.init({ width: SIZE, height: SIZE, background: '#1c2027', antialias: true });
  container.appendChild(app.canvas);
  const g = new Graphics();
  app.stage.addChild(g);
  return {
    draw(state: SimState) {
      g.clear();
      g.circle(C, C, ARENA_RADIUS * SCALE).stroke({ width: 2, color: 0x46cede });
      for (const b of state.bots) {
        g.circle(C + b.pos.x * SCALE, C + b.pos.y * SCALE, b.radius * SCALE).fill(0xe86a5a);
      }
      const p = state.player;
      g.circle(C + p.pos.x * SCALE, C + p.pos.y * SCALE, p.radius * SCALE).fill(0x46cede);
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
