import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { chapterOf } from '../content/chapters';
import { ARENA, ARENA_RADIUS, SALLES_PER_CHAPTER } from '../sim/config';
import { typeMult } from '../sim/typeChart';
import { PALETTE, spinTint } from '../theme';
import { botArt, type ToupieArt } from '../art/toupie';
import type { RunState, Top } from '../sim/types';
import type { Zone } from '../sim/terrain';
import { backdropTexture, createTextures, destroyTextures, floorTexture, FLOOR_EDGE, FLOOR_OVERSCAN } from './textures';
import { FEEL } from './feel';
import { createToupieTextures } from './toupieTextures';
import { createTopView, type Advantage, type TopView } from './topView';
import { lerp, snapshotById, takeSnapshot, type Snapshot } from './snapshot';
import { observe, type RenderEvents } from './observer';
import { createEffects, type Effects } from './effects';

/** Marge entre le bord de l'anneau et le bord du canvas. Au plus juste : l'arène
 *  est un cercle sur un écran haut, elle ne peut gagner de la place qu'en largeur,
 *  et chaque pour-cent compte. Le disque visible vaut 0,996 × ARENA_RADIUS
 *  (FLOOR_OVERSCAN × FLOOR_EDGE), donc 1,02 laisse encore deux pour-cent de garde. */
const MARGIN = 1.02;
/** Rayon visuel du disque du sol : mêmes facteurs que floorTexture() (textures.ts),
 * dérivés du même symbole pour que les deux ne puissent jamais diverger — un cercle,
 * pas le carré de la texture qui le contient. */
const FLOOR_VISUAL_RADIUS = ARENA_RADIUS * FLOOR_OVERSCAN * FLOOR_EDGE;

export interface Arena {
  beforeTick(state: RunState): void;
  afterTick(state: RunState): void;
  /** Les événements du dernier tick, consommés une seule fois (sonorisation). */
  consumeEvents(): RenderEvents | null;
  /** `playerArt` est la toupie réellement montée : châssis de la descente et
   *  pièces équipées à cet instant. Passée par image plutôt que posée une fois,
   *  parce qu'un achat en Forge prend effet dans la seconde (acquis du jalon 1). */
  draw(state: RunState, alpha: number, playerArt: ToupieArt): void;
  destroy(): void;
}

export async function createArena(host: HTMLElement): Promise<Arena> {
  const app = new Application();
  await app.init({
    width: Math.max(1, host.clientWidth),
    height: Math.max(1, host.clientHeight),
    background: PALETTE.bg,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  // `resizeTo` du greffon Pixi n'écoute qu'un `resize` de `window`, jamais le
  // conteneur (ResizePlugin.mjs) : quand l'hôte est gardé à display:none (onglet
  // Forge) puis redimensionné pendant ce temps, il ignore la valeur nulle et le
  // canvas reste figé à sa dernière taille au retour. On observe l'hôte nous-mêmes
  // et on ignore les tailles nulles plutôt que de leur laisser écraser la dernière
  // taille connue.
  const resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    app.renderer.resize(rect.width, rect.height);
  });
  resizeObserver.observe(host);

  const tex = createTextures();
  const tops = createToupieTextures();
  const world = new Container();
  const floorLayer = new Container();
  const topLayer = new Container();
  const effects: Effects = createEffects(tex);
  world.addChild(floorLayer, topLayer, effects.container);

  // Le décor vit dans le repère de l'ÉCRAN, pas du monde : il doit couvrir tout le
  // canvas quelle que soit l'échelle de l'arène.
  const backdrop = new Sprite(Texture.EMPTY);
  backdrop.anchor.set(0.5);
  app.stage.addChild(backdrop, world);

  const floor = new Sprite(Texture.EMPTY);
  floor.anchor.set(0.5);
  floor.width = floor.height = ARENA_RADIUS * 2 * FLOOR_OVERSCAN;
  floorLayer.addChild(floor);

  // Un cercle, pas un carré : le voile doit épouser le disque du sol, pas
  // déborder dans les coins du canvas où la page est visible derrière.
  const dim = new Graphics().circle(0, 0, FLOOR_VISUAL_RADIUS).fill(0x04050a);
  dim.alpha = 0;
  floorLayer.addChild(dim);

  // La porte du haut, qui s'allume pendant la transition de salle.
  const door = new Graphics();
  floorLayer.addChild(door);

  // L'éclat de Gyre : un sprite unique, positionné et mis à l'échelle par
  // image — pas de géométrie retracée, seulement une transform.
  const shard = new Sprite(tex.shard);
  shard.anchor.set(0.5);
  shard.blendMode = 'add';
  shard.visible = false;
  floorLayer.addChild(shard);

  // Même réserve que la porte (dette 1.5) : retracé par image parce que
  // l'ouverture pulse. Deux arcs par brèche, sans effet mesuré sur la cadence.
  const breachEdges = new Graphics();
  floorLayer.addChild(breachEdges);

  // Les zones vivent sous les toupies et au-dessus du sol. Recréées à chaque
  // changement de gabarit, jamais retracées par image.
  const zoneLayer = new Container();
  floorLayer.addChild(zoneLayer);
  let lastZones: Zone[] | null = null;

  function syncZones(state: RunState): void {
    // `state.arena` est remplacé en bloc par startSalle() à chaque entrée de
    // salle, et rien ne mute `zones` en place ensuite (buildLayout() le
    // construit une fois pour toute la salle) : la référence du tableau est
    // donc un identifiant fiable du gabarit, sans reconstruire une signature
    // par image pour ne conclure « rien à faire » quasiment à chaque fois.
    if (state.arena.zones === lastZones) return;
    lastZones = state.arena.zones;
    zoneLayer.removeChildren().forEach((child) => child.destroy());
    for (const zone of state.arena.zones) {
      const sprite = new Sprite(tex.zone[zone.kind]);
      sprite.anchor.set(0.5);
      sprite.width = sprite.height = zone.radius * 2;
      sprite.x = zone.x;
      sprite.y = zone.y;
      zoneLayer.addChild(sprite);
    }
  }

  // Même rayon que dim, à dessein : un second rayon dupliqué aurait fini par
  // déborder du disque du sol, exactement le défaut que dim a déjà corrigé.
  const flash = new Graphics().circle(0, 0, FLOOR_VISUAL_RADIUS).fill(0xffe2b2);
  flash.alpha = 0;
  flash.blendMode = 'add';
  floorLayer.addChild(flash);

  const views = new Map<string, TopView>();
  let before: Snapshot | null = null;
  let snapPositions = true;
  let bossEntry = 0; // secondes restantes d'entrée du boss
  let reforge = 0; // secondes restantes de transition de salle
  let pending: RenderEvents | null = null;
  let reforgeFlash = 0; // secondes restantes d'éclair
  let lastReforgeAt = -Infinity;
  let floorPx = 0;
  let backdropChapter = 0;
  let lastDraw = performance.now();

  function layout(chapter: number): void {
    const size = Math.min(app.screen.width, app.screen.height);
    world.scale.set(size / (2 * ARENA_RADIUS * MARGIN));
    const wanted = Math.max(256, Math.round(size * Math.min(window.devicePixelRatio || 1, 2)));
    if (wanted !== floorPx) {
      floorPx = wanted;
      const old = floor.texture;
      floor.texture = floorTexture(wanted);
      if (old !== Texture.EMPTY) old.destroy(true);
    }
    if (chapter !== backdropChapter) {
      backdropChapter = chapter;
      const old = backdrop.texture;
      backdrop.texture = backdropTexture(512, chapterOf(chapter).ambience);
      if (old !== Texture.EMPTY) old.destroy(true);
    }
    backdrop.x = app.screen.width / 2;
    backdrop.y = app.screen.height / 2;
    // `Math.max` et non la taille exacte : le décor doit déborder du canvas plutôt
    // que d'en laisser voir les coins.
    const cover = Math.max(app.screen.width, app.screen.height) * 1.05;
    backdrop.width = backdrop.height = cover;
  }

  function viewFor(top: Top, art: ToupieArt, salle: number): TopView {
    let view = views.get(top.id);
    if (!view) {
      const boss = !top.isPlayer && salle === SALLES_PER_CHAPTER;
      view = createTopView(tex, tops, art, top.isPlayer ? 'player' : boss ? 'boss' : 'bot', top.radius, boss);
      topLayer.addChild(view.container);
      views.set(top.id, view);
    }
    return view;
  }

  /** Ce que le triangle donne au joueur contre cet adversaire. Neutre des deux
   *  côtés — ou favorable des deux, cas d'Équilibre contre Équilibre — n'affiche
   *  rien : un badge qui ne tranche pas n'apprend rien. */
  function advantageOf(player: Top, bot: Top): Advantage {
    const deals = typeMult(player.type, bot.type) > 1;
    const takes = typeMult(bot.type, player.type) > 1;
    if (deals === takes) return 0;
    return deals ? 1 : -1;
  }

  return {
    beforeTick(state) {
      before = takeSnapshot(state);
    },
    afterTick(state) {
      if (!before) return;
      const after = takeSnapshot(state);
      const events = observe(before, after);
      pending = events;
      for (const hit of events.hits) {
        const view = views.get(hit.id);
        view?.flash(hit.power);
        // hit.id vient de after.tops, lui-même construit à partir de state.player et
        // state.bots dans ce même appel : la toupie qui a émis le choc est donc
        // nécessairement présente ici, aucun repli n'est atteignable.
        const top = [state.player, ...state.bots].find((t) => t.id === hit.id)!;
        const ratio = Math.max(0, Math.min(1, top.spin / top.spinMax));
        const camp = hit.id === 'player' ? 'player' : after.salle === SALLES_PER_CHAPTER ? 'boss' : 'bot';
        effects.hit(
          hit.x + hit.nx * top.radius,
          hit.y + hit.ny * top.radius,
          hit.nx,
          hit.ny,
          hit.power,
          spinTint(camp, ratio),
        );
      }
      for (const death of events.deaths) {
        const view = views.get(death.id);
        view?.kill();
        if (death.cause === 'ringout') {
          // L'éjection part vers l'extérieur : l'onde s'ouvre plus large et la
          // secousse est franche. C'est le retour qui apprend la règle sans texte.
          effects.wave(death.x, death.y, FEEL.waveRadius * 2.2, PALETTE.zoneSpike);
          const d = Math.hypot(death.x, death.y) || 1;
          effects.hit(death.x, death.y, death.x / d, death.y / d, 1, PALETTE.zoneSpike);
        } else {
          effects.wave(death.x, death.y, FEEL.waveRadius, 0xffd9a0);
        }
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
    consumeEvents() {
      const e = pending;
      pending = null;
      return e;
    },
    draw(state, alpha, playerArt) {
      const now = performance.now();
      const dt = Math.min((now - lastDraw) / 1000, 0.05);
      lastDraw = now;
      layout(state.chapter);
      syncZones(state);

      // L'éclat pulse et tourne pour ne jamais se confondre avec une toupie
      // immobile — c'est ce mouvement continu qui signale « à prendre ».
      const shardNow = state.arena.shard;
      shard.visible = shardNow !== null;
      if (shardNow) {
        shard.x = shardNow.x;
        shard.y = shardNow.y;
        const bob = 1 + 0.16 * Math.sin(now / 150);
        shard.width = shard.height = ARENA.shard.radius * 2 * bob;
        shard.rotation = now / 900;
      }

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

      // Les brèches se dessinent comme une ABSENCE : l'anneau s'interrompt, et
      // deux arêtes pulsent de part et d'autre. C'est la seule information dont
      // dépend la survie du joueur : elle doit se lire à un demi-écran.
      const pulse = 0.55 + 0.45 * Math.sin(now / 190);
      breachEdges.clear();
      for (const breach of state.arena.breaches) {
        breachEdges.arc(0, 0, ARENA_RADIUS, breach.angle - breach.halfWidth, breach.angle + breach.halfWidth);
        breachEdges.stroke({ width: 5, color: PALETTE.bg, alpha: 1 });
        breachEdges.arc(0, 0, ARENA_RADIUS * 0.965, breach.angle - breach.halfWidth, breach.angle + breach.halfWidth);
        breachEdges.stroke({ width: 2.5, color: PALETTE.zoneSpike, alpha: 0.35 + 0.5 * pulse });
      }

      world.x = app.screen.width / 2 + effects.shake.x * world.scale.x;
      world.y = app.screen.height / 2 + effects.shake.y * world.scale.y;

      const prev = before ? snapshotById(before) : null;
      const live = new Set<string>();
      const all = [state.player, ...state.bots];

      for (const top of all) {
        live.add(top.id);
        const art = top.isPlayer ? playerArt : botArt(top.type);
        const view = viewFor(top, art, state.salle);
        view.setArt(art);
        if (!top.isPlayer) view.setAdvantage(advantageOf(state.player, top));
        // Le joueur reste dans state.player même mort (sim.ts ne fait que basculer
        // phase à 'dead', il ne le retire jamais) : reviver sans condition annulerait
        // kill() à l'image même où il vient d'être appelé, et l'agonie ne jouerait
        // jamais. spin > 0 distingue exactement les deux cas : une toupie morte a un
        // spin nul ou négatif, une toupie relancée par « Retenter » repart à son spin
        // maximum. Les bots sont déjà filtrés sur spin > 0 par la simulation
        // (state.bots = state.bots.filter(b => b.spin > 0)), donc leur comportement
        // ici est inchangé — ils passaient déjà cette condition.
        if (top.spin > 0) view.revive();
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
      resizeObserver.disconnect();
      for (const view of views.values()) view.destroy();
      views.clear();
      if (floor.texture !== Texture.EMPTY) floor.texture.destroy(true);
      if (backdrop.texture !== Texture.EMPTY) backdrop.texture.destroy(true);
      effects.destroy();
      // Après app.destroy(true, ...) : ce dernier détruit toute la scène, y
      // compris le sprite `shard` et les enfants de `zoneLayer` qui référencent
      // encore les textures de `tex` — les détruire avant les laisserait
      // pointer sur des textures déjà libérées. Les textures de toupie sont dans
      // le même cas : les vues viennent d'être détruites, mais elles partagent
      // leurs textures avec le cache, qui ne se vide qu'ici.
      app.destroy(true, { children: true });
      destroyTextures(tex);
      tops.destroy();
    },
  };
}
