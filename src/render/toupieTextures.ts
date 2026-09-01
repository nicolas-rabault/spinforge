import { Texture } from 'pixi.js';
import { makeCanvas } from '../art/draw';
import { drawToupieTop, drawToupieTopRim, toupieKey, type ToupieArt } from '../art/toupie';

/**
 * Les textures de toupie de l'arène, produites par `src/art/` et **par lui seul**.
 * `textures.ts` dessinait auparavant deux disques encochés génériques — un pour le
 * joueur, un pour tous les bots — sans aucun rapport avec le catalogue. C'est ce
 * fichier qui ferme l'écart : la toupie qui tourne est celle qu'on a montée.
 */
const TOP_PX = 256;

/** Trois niveaux d'usure : intacte, ébréchée, très ébréchée. Repris à l'identique
 *  de l'ancien `textures.ts` — les seuils de bascule vivent dans `feel.ts`. */
export const WEAR_CHIP = [0, 0.34, 0.6];

export interface ToupieSprites {
  /** Le corps, en couleurs. Ne suit jamais le spin. */
  body: Texture;
  /** Le contour seul, en blanc : c'est lui que la vue teinte au fil du spin. */
  rim: Texture;
}

export interface ToupieTextureCache {
  get(art: ToupieArt, wear: number): ToupieSprites;
  destroy(): void;
}

export function createToupieTextures(): ToupieTextureCache {
  const map = new Map<string, ToupieSprites>();
  return {
    get(art, wear) {
      // Même clé que le cache de l'UI (`art/cache.ts`) : deux clés distinctes et
      // les deux vues finiraient par diverger sans que rien ne le signale.
      const key = `${toupieKey(art)}|${wear}`;
      let hit = map.get(key);
      if (!hit) {
        const chip = WEAR_CHIP[wear] ?? 0;
        const body = makeCanvas(TOP_PX);
        drawToupieTop(body.ctx, art, TOP_PX, chip);
        const rim = makeCanvas(TOP_PX);
        drawToupieTopRim(rim.ctx, art, TOP_PX, chip);
        hit = { body: Texture.from(body.el), rim: Texture.from(rim.el) };
        map.set(key, hit);
      }
      return hit;
    },
    destroy() {
      for (const s of map.values()) {
        s.body.destroy(true);
        s.rim.destroy(true);
      }
      map.clear();
    },
  };
}
