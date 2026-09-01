import { Container, Graphics, Sprite } from 'pixi.js';
import { PALETTE, spinTint, type Camp } from '../theme';
import { toupieKey, type ToupieArt } from '../art/toupie';
import { FEEL, spinOmega } from './feel';
import type { Textures } from './textures';
import type { ToupieTextureCache } from './toupieTextures';

interface Ghost {
  sprite: Sprite;
  life: number;
}

/** Ce que le joueur gagne à croiser cet adversaire, du point de vue du triangle
 *  des forces. `0` = neutre, et alors **aucun badge n'est affiché** : un badge
 *  « rien de spécial » n'apprend rien et encombre l'arène. */
export type Advantage = -1 | 0 | 1;

export interface TopView {
  container: Container;
  /** `dt` en secondes ; `ratio` = spin/spinMax ; `speedRatio` = vitesse/vitesse max. */
  sync(x: number, y: number, ratio: number, speedRatio: number, dt: number): void;
  /** Remonte la toupie si son équipement a changé (achat, fusion en cours de run). */
  setArt(art: ToupieArt): void;
  setAdvantage(advantage: Advantage): void;
  flash(power: number): void;
  /** Démarre l'agonie : la toupie se couche, racle, s'immobilise. */
  kill(): void;
  isFinished(): boolean;
  /** Ramène une vue en pleine agonie à l'état vivant (ex. après une nouvelle descente). Sans effet si la vue n'agonise pas. */
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
  tops: ToupieTextureCache,
  initialArt: ToupieArt,
  camp: Camp,
  radius: number,
  isBoss: boolean,
): TopView {
  const container = new Container();
  const trail = new Container();
  const size = radius * 2;
  const isPlayer = camp === 'player';
  let art = initialArt;
  let artKey = toupieKey(art);

  // Jauge de spin, portée par la toupie elle-même. Elle remplace la barre du HUD :
  // l'information se lit là où les yeux sont déjà, et **chaque** adversaire porte
  // désormais la sienne — rien ne disait jusqu'ici qu'un bot était à deux coups de
  // la mort.
  //
  // La piste sombre est tracée en entier et ne s'efface jamais : c'est elle qui
  // continue de désigner la toupie du joueur quand son spin tombe à zéro. La règle
  // « un repère d'identité ne suit pas l'état de santé » (docs/ameliorations.md)
  // reste donc tenue, la piste et le chevron s'en chargeant.
  const gauge = new Graphics();
  const gaugeRadius = radius * FEEL.gaugeRadiusMult;
  const gaugeWidth = radius * (isPlayer ? FEEL.gaugeWidthPlayer : FEEL.gaugeWidthBot);
  const gaugeColor = PALETTE[camp];
  let gaugeAt = -1;

  const caret = isPlayer ? new Sprite(tex.caret) : null;
  if (caret) {
    caret.anchor.set(0.5, 1);
    caret.width = caret.height = size * FEEL.caretSizeMult;
    caret.tint = PALETTE.player;
  }

  // Badge d'avantage : dit ce que le triangle change **contre cet adversaire-là**,
  // à la place du bandeau « Salle 4 · Défense » qui nommait un type sans dire ce
  // qu'il fallait en faire.
  const badge = !isPlayer ? new Graphics() : null;
  let advantage: Advantage = 0;

  const halo = new Sprite(tex.halo);
  halo.anchor.set(0.5);
  halo.blendMode = 'add';
  halo.width = halo.height = size * (isBoss ? FEEL.bossHaloMult : FEEL.haloRadiusMult);

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

  const sprites = tops.get(art, 0);
  const body = new Sprite(sprites.body);
  body.anchor.set(0.5);
  body.width = body.height = size;

  const rim = new Sprite(sprites.rim);
  rim.anchor.set(0.5);
  rim.width = rim.height = size;

  const flashSprite = new Sprite(tex.core);
  flashSprite.anchor.set(0.5);
  flashSprite.blendMode = 'add';
  flashSprite.width = flashSprite.height = size * 1.3;
  flashSprite.tint = 0xfff6e4;
  flashSprite.alpha = 0;

  const pivot = new Container();
  pivot.addChild(body, rim);
  container.addChild(halo, shadow, gauge, trail, pivot, flashSprite);
  if (ring) container.addChildAt(ring, 1);
  if (caret) container.addChild(caret);
  if (badge) container.addChild(badge);

  const ghosts: Ghost[] = [];
  let angle = Math.random() * Math.PI * 2;
  let wear = 0;
  let flashLife = 0;
  let dying = -1; // -1 = vivante ; sinon progression de l'agonie dans [0, 1]
  let elapsed = 0;

  function drawGauge(ratio: number, fade: number): void {
    gauge.clear();
    gauge.circle(0, 0, gaugeRadius);
    gauge.stroke({ width: gaugeWidth, color: 0x080b10, alpha: 0.62 * fade });
    if (ratio > 0.002) {
      gauge.arc(0, 0, gaugeRadius, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      gauge.stroke({ width: gaugeWidth * 0.72, color: gaugeColor, alpha: 0.95 * fade, cap: 'round' });
    }
  }

  function drawBadge(): void {
    if (!badge) return;
    badge.clear();
    if (advantage === 0) return;
    // Vers le bas et vert : « tu domines ». Vers le haut et rouge : « il te domine ».
    const up = advantage < 0;
    const color = up ? PALETTE.zoneSpike : PALETTE.zoneBoost;
    const w = radius * 0.5;
    const h = radius * 0.42;
    const y0 = -radius * FEEL.badgeGapMult;
    for (const step of [0, 1]) {
      const y = y0 + step * h * 0.55 * (up ? -1 : 1);
      badge.moveTo(-w, y);
      badge.lineTo(0, y + (up ? -h : h));
      badge.lineTo(w, y);
      badge.stroke({ width: radius * 0.16, color, alpha: 0.92 - step * 0.3, join: 'round', cap: 'round' });
    }
  }

  function applyArt(): void {
    const s = tops.get(art, wear);
    body.texture = s.body;
    rim.texture = s.rim;
  }

  return {
    container,
    setArt(next) {
      const key = toupieKey(next);
      if (key === artKey) return;
      art = next;
      artKey = key;
      applyArt();
    },
    setAdvantage(next) {
      if (next === advantage) return;
      advantage = next;
      drawBadge();
    },
    sync(x, y, ratio, speedRatio, dt) {
      container.x = x;
      container.y = y;
      elapsed += dt;

      const fade = dying < 0 ? 1 : Math.max(0, 1 - dying * 2);
      if (caret) {
        const pulse = Math.sin(elapsed * Math.PI * 2 * FEEL.markerPulseHz);
        caret.alpha = (0.85 + 0.15 * pulse) * fade;
        caret.y = -radius * FEEL.caretGapMult + pulse * radius * FEEL.caretBobMult;
      }
      if (badge) badge.alpha = fade;

      // Retracer la jauge à chaque image coûterait une géométrie par toupie et par
      // image pour un dessin qui ne bouge quasiment pas : on ne la retrace qu'au
      // franchissement d'un pas visible.
      if (Math.abs(ratio - gaugeAt) > FEEL.gaugeStep || (dying >= 0 && gaugeAt >= 0)) {
        gaugeAt = dying >= 0 ? -1 : ratio;
        drawGauge(ratio, fade);
      }

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
      halo.tint = tint;
      halo.alpha = FEEL.haloAlphaBase + FEEL.haloAlphaSpan * ratio;

      const w = wearIndex(ratio);
      if (w !== wear) {
        wear = w;
        applyArt();
      }

      // Traînée : uniquement au-delà du seuil de vitesse, sinon elle ne dit rien.
      if (speedRatio > FEEL.trailSpeedRatio && ghosts.length < FEEL.trailMax) {
        const sprite = new Sprite(rim.texture);
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
      gaugeAt = -1;
    },
    destroy() {
      for (const g of ghosts) g.sprite.destroy();
      ghosts.length = 0;
      // `children: true` détruirait les textures partagées du cache de toupies,
      // que d'autres vues utilisent encore. Les sprites suffisent.
      container.destroy({ children: true, texture: false });
    },
  };
}
