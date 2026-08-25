import { Container, Sprite } from 'pixi.js';
import { spinTint, type Camp } from '../theme';
import { FEEL, spinOmega } from './feel';
import type { Shape, Textures } from './textures';

interface Ghost {
  sprite: Sprite;
  life: number;
}

export interface TopView {
  container: Container;
  /** `dt` en secondes ; `ratio` = spin/spinMax ; `speedRatio` = vitesse/vitesse max. */
  sync(x: number, y: number, ratio: number, speedRatio: number, dt: number): void;
  flash(power: number): void;
  /** Démarre l'agonie : la toupie se couche, racle, s'immobilise. */
  kill(): void;
  isFinished(): boolean;
  /** Ramène une vue en pleine agonie à l'état vivant (ex. après un Retenter). Sans effet si la vue n'agonise pas. */
  revive(): void;
  destroy(): void;
}

function wearIndex(ratio: number): number {
  if (ratio < FEEL.wearLevel2) return 2;
  if (ratio < FEEL.wearLevel1) return 1;
  return 0;
}

export function createTopView(
  tex: Textures,
  shape: Shape,
  camp: Camp,
  radius: number,
  isBoss = false,
): TopView {
  const container = new Container();
  const trail = new Container();
  const size = radius * 2;

  const halo = new Sprite(tex.halo);
  halo.anchor.set(0.5);
  halo.blendMode = 'add';
  halo.width = halo.height = size * FEEL.haloRadiusMult;
  if (isBoss) halo.width = halo.height = size * FEEL.bossHaloMult;

  const ring = isBoss ? new Sprite(tex.wave) : null;
  if (ring) {
    ring.anchor.set(0.5);
    ring.blendMode = 'add';
    ring.width = ring.height = size * 1.9;
    ring.alpha = 0.35;
  }

  const shadow = new Sprite(tex.shadow);
  shadow.anchor.set(0.5);
  shadow.width = size * 1.5;
  shadow.height = size * 0.7;
  shadow.y = radius * 0.5;

  const body = new Sprite(tex.body[shape][0]);
  body.anchor.set(0.5);
  body.width = body.height = size;

  const rim = new Sprite(tex.rim[shape][0]);
  rim.anchor.set(0.5);
  rim.width = rim.height = size;

  const core = new Sprite(tex.core);
  core.anchor.set(0.5);
  core.blendMode = 'add';
  core.width = core.height = size * 0.62;

  const flashSprite = new Sprite(tex.core);
  flashSprite.anchor.set(0.5);
  flashSprite.blendMode = 'add';
  flashSprite.width = flashSprite.height = size * 1.3;
  flashSprite.tint = 0xfff6e4;
  flashSprite.alpha = 0;

  const pivot = new Container();
  pivot.addChild(body, rim, core);
  container.addChild(halo, shadow, trail, pivot, flashSprite);
  if (ring) container.addChildAt(ring, 1);

  const ghosts: Ghost[] = [];
  let angle = Math.random() * Math.PI * 2;
  let wear = 0;
  let flashLife = 0;
  let dying = -1; // -1 = vivante ; sinon progression de l'agonie dans [0, 1]

  return {
    container,
    sync(x, y, ratio, speedRatio, dt) {
      container.x = x;
      container.y = y;

      // Pendant l'agonie la toupie ralentit jusqu'à l'arrêt et se couche.
      const dyingFade = dying < 0 ? 1 : Math.max(0, 1 - dying);
      angle += spinOmega(ratio) * dyingFade * dt;
      if (dying >= 0) {
        dying = Math.min(1, dying + dt / FEEL.deathLife);
        pivot.scale.set(1, 1 - 0.6 * dying);
        container.alpha = 1 - dying * dying;
        shadow.alpha = 1 - dying;
      }
      pivot.rotation = angle;
      if (ring) {
        ring.rotation = angle * FEEL.bossRingSpeed;
        ring.tint = spinTint(camp, ratio);
        ring.alpha = 0.2 + 0.25 * ratio;
      }

      const tint = spinTint(camp, ratio);
      rim.tint = tint;
      core.tint = tint;
      halo.tint = tint;
      core.alpha = 0.35 + 0.65 * ratio;
      halo.alpha = FEEL.haloAlphaBase + FEEL.haloAlphaSpan * ratio;

      const w = wearIndex(ratio);
      if (w !== wear) {
        wear = w;
        body.texture = tex.body[shape][w];
        rim.texture = tex.rim[shape][w];
      }

      // Traînée : uniquement au-delà du seuil de vitesse, sinon elle ne dit rien.
      if (speedRatio > FEEL.trailSpeedRatio && ghosts.length < FEEL.trailMax) {
        const sprite = new Sprite(tex.rim[shape][w]);
        sprite.anchor.set(0.5);
        sprite.width = sprite.height = size;
        sprite.blendMode = 'add';
        sprite.tint = tint;
        // Les fantômes vivent en coordonnées monde, pas dans le conteneur qui bouge.
        sprite.x = x;
        sprite.y = y;
        sprite.rotation = angle;
        trail.addChild(sprite);
        ghosts.push({ sprite, life: 1 });
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const g = ghosts[i];
        g.life -= dt / FEEL.trailLife;
        if (g.life <= 0) {
          g.sprite.destroy();
          ghosts.splice(i, 1);
        } else {
          g.sprite.alpha = 0.17 * g.life * g.life * ratio;
        }
      }
      // Le conteneur suit la toupie ; les fantômes doivent rester où ils sont nés.
      trail.x = -x;
      trail.y = -y;

      if (flashLife > 0) {
        flashLife = Math.max(0, flashLife - dt / FEEL.flashLife);
        flashSprite.alpha = 0.34 * flashLife * flashLife;
      }
    },
    flash(power) {
      flashLife = Math.max(flashLife, Math.min(1, power));
    },
    kill() {
      if (dying < 0) dying = 0;
    },
    isFinished() {
      return dying >= 1;
    },
    revive() {
      if (dying < 0) return;
      dying = -1;
      // Restaure tout ce que la branche d'agonie de sync() avait modifié.
      pivot.scale.set(1, 1);
      container.alpha = 1;
      shadow.alpha = 1;
    },
    destroy() {
      for (const g of ghosts) g.sprite.destroy();
      ghosts.length = 0;
      container.destroy({ children: true });
    },
  };
}
