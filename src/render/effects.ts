import { Container, Sprite } from 'pixi.js';
import { FEEL } from './feel';
import type { Textures } from './textures';

interface Spark {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
}

interface Wave {
  sprite: Sprite;
  life: number;
  radius: number;
}

export interface Effects {
  /** À ajouter au conteneur monde (coordonnées de simulation). */
  container: Container;
  hit(x: number, y: number, nx: number, ny: number, power: number, tint: number): void;
  wave(x: number, y: number, radius: number, tint: number): void;
  update(dt: number): void;
  /** Décalage de secousse à appliquer au conteneur monde, en unités de simulation. */
  readonly shake: { x: number; y: number };
  destroy(): void;
}

export function createEffects(tex: Textures): Effects {
  const container = new Container();
  const sparkPool: Sprite[] = [];
  const sparks: Spark[] = [];
  const waves: Wave[] = [];
  let shakeAmount = 0;
  const shake = { x: 0, y: 0 };

  function takeSpark(): Sprite | null {
    if (sparks.length >= FEEL.sparkPool) return null;
    const sprite = sparkPool.pop() ?? new Sprite(tex.spark);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.width = sprite.height = 3.2;
    sprite.visible = true;
    container.addChild(sprite);
    return sprite;
  }

  return {
    container,
    shake,
    hit(x, y, nx, ny, power, tint) {
      const count = Math.round(FEEL.sparkBase + FEEL.sparkSpan * power);
      for (let i = 0; i < count; i++) {
        const sprite = takeSpark();
        if (!sprite) break;
        // Gerbe orientée par la normale du contact, ouverte d'environ ±60°.
        const spread = (i / count - 0.5) * 2.1;
        const base = Math.atan2(ny, nx);
        const a = base + spread;
        const speed = 40 + 150 * power * (0.5 + (i % 5) / 5);
        sprite.x = x;
        sprite.y = y;
        sprite.tint = 0xffd9a0;
        sparks.push({ sprite, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 });
      }
      this.wave(x, y, FEEL.waveRadius * (0.5 + power), tint);
      shakeAmount = Math.min(FEEL.shakeMax, shakeAmount + power * FEEL.shakePerHit);
    },
    wave(x, y, radius, tint) {
      const sprite = new Sprite(tex.wave);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.tint = tint;
      sprite.x = x;
      sprite.y = y;
      sprite.width = sprite.height = 1;
      container.addChild(sprite);
      waves.push({ sprite, life: 1, radius });
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt / FEEL.sparkLife;
        if (s.life <= 0) {
          s.sprite.visible = false;
          container.removeChild(s.sprite);
          sparkPool.push(s.sprite);
          sparks.splice(i, 1);
          continue;
        }
        s.sprite.x += s.vx * dt;
        s.sprite.y += s.vy * dt;
        s.vx *= 0.93;
        s.vy = s.vy * 0.93 + 120 * dt;
        s.sprite.alpha = s.life;
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.life -= dt / FEEL.waveLife;
        if (w.life <= 0) {
          w.sprite.destroy();
          waves.splice(i, 1);
          continue;
        }
        const grown = (1 - w.life) * w.radius * 2;
        w.sprite.width = w.sprite.height = grown;
        w.sprite.alpha = w.life * w.life * 0.7;
      }
      shakeAmount *= Math.pow(FEEL.shakeDamping, dt * 60);
      if (shakeAmount < 0.05) shakeAmount = 0;
      // Secousse déterministe en apparence mais sans RNG de simulation : on
      // n'utilise jamais le rngState, le rendu ne doit pas y toucher.
      const t = performance.now() / 1000;
      shake.x = Math.sin(t * 91.7) * shakeAmount;
      shake.y = Math.cos(t * 77.3) * shakeAmount;
    },
    destroy() {
      for (const s of sparks) s.sprite.destroy();
      for (const s of sparkPool) s.destroy();
      for (const w of waves) w.sprite.destroy();
      sparks.length = 0;
      sparkPool.length = 0;
      waves.length = 0;
      container.destroy({ children: true });
    },
  };
}
