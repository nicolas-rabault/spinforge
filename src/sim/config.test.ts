import { describe, expect, it } from 'vitest';
import {
  ARENA, BALANCE, BOTS_PER_SALLE, BOT_TYPES, BREACH, CHESTS, FUSION, LAYOUTS, LOOT,
  MAX_CHAPTER, PLAYER_SPAWN, RARITY, SALLES_PER_CHAPTER, SHARD, TALENTS, TOUPIE_SHOP,
  TYPES, ZONES,
} from './config';
import { PROFILE_AXES } from './profile';
import { TOUPIES } from '../content/toupies';
import { MODELS } from '../content/pieces';

const SLOTS = ['lame', 'disque', 'pointe', 'noyau'];
const TOP_TYPES = ['attaque', 'defense', 'endurance', 'equilibre'];

describe('balance.json', () => {
  it('a autant d’entrées de bots que de salles par chapitre', () => {
    expect(BOTS_PER_SALLE).toHaveLength(SALLES_PER_CHAPTER);
    expect(BOTS_PER_SALLE.every((n) => Number.isInteger(n) && n >= 1)).toBe(true);
    // La 10ᵉ salle est le boss : un seul adversaire.
    expect(BOTS_PER_SALLE[SALLES_PER_CHAPTER - 1]).toBe(1);
  });

  it('chaque coffre ne tire que des emplacements valides', () => {
    for (const chest of Object.values(CHESTS)) {
      expect(chest.slots.length).toBeGreaterThan(0);
      for (const slot of chest.slots) expect(SLOTS).toContain(slot);
      expect(['credits', 'gems']).toContain(chest.currency);
    }
  });

  it('chaque distribution de rang somme à 1', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      const total = chest.ranks.reduce((acc, r) => acc + r.p, 0);
      expect(total, `coffre ${name}`).toBeCloseTo(1, 10);
      expect(chest.ranks.every((r) => Number.isInteger(r.rank) && r.rank >= 1)).toBe(true);
    }
  });

  it('un coffre qui a un pity vise un rang qu’il peut garantir', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      if (chest.pityThreshold === 0) continue;
      expect(chest.pityRank, `coffre ${name}`).toBeGreaterThan(0);
      // Le rang garanti doit être le meilleur que le coffre sait produire,
      // sans quoi le pity serait une régression déguisée.
      const best = Math.max(...chest.ranks.map((r) => r.rank));
      expect(chest.pityRank, `coffre ${name}`).toBe(best);
    }
  });

  it('les règles de fusion couvrent tous les rangs, la dernière étant ouverte', () => {
    expect(FUSION.length).toBeGreaterThan(0);
    expect(FUSION[FUSION.length - 1].throughRank).toBe(0);
    const bounded = FUSION.slice(0, -1).map((r) => r.throughRank);
    // Bornes strictement croissantes : sans quoi une règle en masquerait une autre.
    for (let i = 1; i < bounded.length; i++) expect(bounded[i]).toBeGreaterThan(bounded[i - 1]);
    for (const rule of FUSION) expect(rule.identical).toBeGreaterThanOrEqual(2);
  });

  it('porte un numéro de version', () => {
    expect(Number.isInteger(BALANCE.version)).toBe(true);
    expect(BALANCE.version).toBeGreaterThanOrEqual(1);
  });

  it('chaque chapitre jouable a une table de types complète', () => {
    for (let chapter = 1; chapter <= MAX_CHAPTER; chapter++) {
      const table = BOT_TYPES[String(chapter)];
      // Sans cette garde, une table trop courte ferait silencieusement retomber
      // le boss sur le type de la dernière salle décrite (`botTypeFor` borne
      // l'index) — un chapitre dont le mur change de type sans que rien ne le dise.
      expect(table, `chapitre ${chapter}`).toBeDefined();
      expect(table, `chapitre ${chapter}`).toHaveLength(SALLES_PER_CHAPTER);
      for (const type of table) expect(TOP_TYPES, `chapitre ${chapter}`).toContain(type);
    }
  });

  it('a un profil de châssis par toupie et laisse la toupie de départ neutre', () => {
    for (const t of TOUPIES) expect(BALANCE.chassis[t.id]).toBeDefined();
    expect(BALANCE.chassis['brasier-solaire']).toEqual({});
  });

  // Sans ce test, une clé de `chassis` orpheline (toupie retirée, id renommé)
  // survivrait indéfiniment sans jamais être lue par `resolveProfile`.
  it('n’a aucune entrée de châssis orpheline : exactement les quatre toupies', () => {
    expect(Object.keys(BALANCE.chassis).sort()).toEqual(TOUPIES.map((t) => t.id).sort());
  });

  it('laisse l’équipement de départ strictement neutre', () => {
    expect(BALANCE.models['disque.lourd']).toEqual({});
    expect(BALANCE.models['pointe.plate']).toEqual({});
  });

  // Ce test est celui qui aurait attrapé une faute de frappe sur une clé de
  // `models` (ex. `disque.eventail` → `disque.eventaille`) : sans lui, le modèle
  // fautif perd tout son profil en silence — `resolveProfile` fait
  // `if (!source) continue` — et les trois autres tests de ce bloc ne le voient
  // jamais, puisqu'ils ne lisent que les clés qu'ils connaissent déjà. Seules les
  // Lames et les Noyaux sont hors périmètre : ils n'ont pas de profil, leur
  // différenciation passe par le talent signature de leur rang (`profile.ts`).
  it('couvre exactement les modèles de Disque et de Pointe, sans orphelin', () => {
    const expectedIds = MODELS
      .filter((m) => m.slot === 'disque' || m.slot === 'pointe')
      .map((m) => m.id)
      .sort();
    expect(Object.keys(BALANCE.models).sort()).toEqual(expectedIds);
  });

  it('n’a que des multiplicateurs strictement positifs, sur des axes connus', () => {
    for (const p of [...Object.values(BALANCE.chassis), ...Object.values(BALANCE.models)]) {
      for (const [axis, v] of Object.entries(p)) {
        expect(PROFILE_AXES, axis).toContain(axis);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('les deux grandeurs du triangle sont des nombres positifs', () => {
    expect(TYPES.dominantBonus).toBeGreaterThan(0);
    expect(TYPES.equilibreBonus).toBeGreaterThan(0);
  });

  it('le prix de la boutique de toupies est un nombre positif', () => {
    expect(Number.isFinite(TOUPIE_SHOP.priceGems)).toBe(true);
    expect(TOUPIE_SHOP.priceGems).toBeGreaterThan(0);
  });

  it('donne au boss une masse propre et à l’éclat un rayon', () => {
    expect(BALANCE.boss.mass).toBeGreaterThan(0);
    expect(BALANCE.arena.shard.radius).toBeGreaterThan(0);
  });

  it('les zones portent des modificateurs de valeurs neutres plausibles', () => {
    const kinds = Object.keys(ZONES);
    expect(kinds.length).toBeGreaterThan(0);
    for (const [name, zone] of Object.entries(ZONES)) {
      expect(zone.radius, `zone ${name}`).toBeGreaterThan(0);
      // Une zone ne peut pas ralentir : les malus passent par spinDrain ou par la
      // friction, jamais par un plafond de vitesse rabaissé — sans quoi une zone
      // pourrait tronquer un recul, exactement le défaut que ce jalon corrige.
      expect(zone.speedMult, `zone ${name}`).toBeGreaterThanOrEqual(1);
      expect(zone.accelMult, `zone ${name}`).toBeGreaterThanOrEqual(1);
      // friction 0 = neutre ; sinon c'est un plancher strictement inférieur à 1.
      expect(zone.friction, `zone ${name}`).toBeGreaterThanOrEqual(0);
      expect(zone.friction, `zone ${name}`).toBeLessThan(1);
      expect(zone.spinDrain, `zone ${name}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('les gabarits couvrent toutes les salles et ne citent que des zones connues', () => {
    expect(LAYOUTS[0].fromSalle).toBe(1);
    for (let i = 1; i < LAYOUTS.length; i++) {
      expect(LAYOUTS[i].fromSalle).toBeGreaterThan(LAYOUTS[i - 1].fromSalle);
    }
    expect(LAYOUTS[LAYOUTS.length - 1].fromSalle).toBeLessThanOrEqual(SALLES_PER_CHAPTER);
    for (const entry of LAYOUTS) {
      for (const kind of entry.zones) expect(Object.keys(ZONES)).toContain(kind);
    }
  });

  it("la salle 1 n'a aucune zone punitive", () => {
    // Le premier objet de terrain rencontré doit être un bonus. Spec § 3.4.
    for (const kind of LAYOUTS[0].zones) expect(ZONES[kind].spinDrain).toBe(0);
  });

  it("les brèches n'apparaissent pas avant que le pilotage soit compris", () => {
    expect(BREACH.fromSalle).toBeGreaterThanOrEqual(2);
    expect(BREACH.count).toBeGreaterThanOrEqual(1);
    // Les secteurs mortels doivent laisser plus de bord plein que de trou : à
    // count brèches régulièrement réparties, chacune occupe 2 × halfWidth du
    // tour, et 360 / count est l'écart entre deux centres.
    expect(BREACH.halfWidthDeg * 2).toBeLessThan(360 / BREACH.count / 2);
    expect(BREACH.ejectSpeed).toBeGreaterThan(0);
  });

  it("l'éclat reste dans l'anneau et rend une part bornée du spin", () => {
    expect(SHARD.minRadius).toBeGreaterThan(0);
    expect(SHARD.maxRadius).toBeLessThan(1);
    expect(SHARD.maxRadius).toBeGreaterThan(SHARD.minRadius);
    expect(SHARD.spinGain).toBeGreaterThan(0);
    expect(SHARD.spinGain).toBeLessThan(1);
    expect(SHARD.everyTicks).toBeGreaterThan(SHARD.lifeTicks);
  });

  it("l'amortissement de surcharge résorbe sans jamais figer", () => {
    expect(ARENA.overspeedDamping).toBeGreaterThan(0);
    expect(ARENA.overspeedDamping).toBeLessThan(1);
  });

  it('le repli de placement reste géométriquement possible', () => {
    // buildLayout replie une zone diamétralement opposée au point d'apparition
    // quand douze tirages n'ont rien trouvé. Ce repli n'existe que si l'anneau
    // est assez large pour la plus grosse zone.
    const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    for (const [name, zone] of Object.entries(ZONES)) {
      expect(d + ARENA.radius - zone.radius, `zone ${name}`)
        .toBeGreaterThanOrEqual(zone.radius + ARENA.spawnClearance);
    }
  });

  it('le butin ne cite que des coffres existants', () => {
    for (const rule of [LOOT.bySalle, LOOT.boss]) {
      expect(Object.keys(CHESTS)).toContain(rule.chest);
      expect(Object.keys(CHESTS)).toContain(rule.extra);
      expect(rule.extraChance).toBeGreaterThan(0);
      expect(rule.extraChance).toBeLessThan(1);
    }
  });
});

// La double assertion `BALANCE = raw as unknown as Balance` ne protège que ce
// que ces tests vérifient explicitement. Les six tests ci-dessus ne touchent
// ni RARITY ni TALENTS : sans ce bloc, une clé de talent renommée ou un champ
// manquant compilerait et passerait tous les tests, pour ne se manifester
// qu'en `NaN` silencieux quand la Task 5 branchera les talents au combat.
describe('RARITY et TALENTS', () => {
  it('RARITY porte un pas de progression et un rang légendaire valides', () => {
    expect(Number.isFinite(RARITY.step)).toBe(true);
    expect(RARITY.step).toBeGreaterThan(1);
    expect(Number.isInteger(RARITY.legendRank)).toBe(true);
    expect(RARITY.legendRank).toBeGreaterThanOrEqual(1);
  });

  it('les douze talents attendus sont présents, et aucun autre', () => {
    const expected = [
      'estoc', 'riposte', 'percee', 'ancrage', 'frolement', 'masse',
      'glisse', 'relance', 'toupieFolle', 'reserve', 'secondSouffle', 'coeurGyre',
    ].sort();
    expect(Object.keys(TALENTS).sort()).toEqual(expected);
  });

  // Schéma attendu de chaque talent, dupliqué depuis l'interface `Balance.talents`.
  // Une simple boucle `Object.entries(talent)` n'aurait parcouru que les champs
  // *présents* : un champ retiré du JSON n'y serait jamais apparu, donc jamais
  // vérifié. En comparant l'ensemble de clés au schéma attendu, un champ absent,
  // renommé ou en trop fait échouer le test au lieu de disparaître silencieusement.
  const TALENT_FIELDS: Record<string, string[]> = {
    estoc: ['rank', 'speedThreshold', 'damageBonus'],
    riposte: ['rank', 'reflect'],
    percee: ['rank', 'defenseIgnore'],
    ancrage: ['rank', 'impulseTaken'],
    frolement: ['rank', 'speedThreshold'],
    masse: ['rank', 'mass'],
    glisse: ['rank', 'friction'],
    relance: ['rank', 'ticks'],
    toupieFolle: ['rank', 'maxSpeedAtZero'],
    reserve: ['rank', 'heal'],
    secondSouffle: ['rank', 'revive'],
    coeurGyre: ['rank', 'decayMult'],
  };

  it('chaque talent a exactement les champs de son schéma, tous des nombres finis', () => {
    for (const [name, fields] of Object.entries(TALENT_FIELDS)) {
      const talent = TALENTS[name as keyof typeof TALENTS] as unknown as Record<string, unknown> | undefined;
      // Garde explicite : un talent renommé donnerait `undefined` ici, et sans
      // elle l'échec serait une TypeError peu lisible plutôt qu'un assert net.
      expect(talent, name).toBeTruthy();
      expect(Object.keys(talent!).sort(), name).toEqual([...fields].sort());
      for (const field of fields) {
        expect(Number.isFinite(talent![field]), `${name}.${field}`).toBe(true);
      }
      expect(Number.isInteger(talent!.rank), `${name}.rank`).toBe(true);
      expect(talent!.rank, `${name}.rank`).toBeGreaterThanOrEqual(1);
    }
  });

  it('les rangs des talents couvrent exactement les trois paliers, quatre par palier', () => {
    const ranks = Object.values(TALENTS).map((t) => t.rank);
    expect(new Set(ranks)).toEqual(new Set([4, 7, 11]));
    const counts = ranks.reduce<Record<number, number>>((acc, r) => {
      acc[r] = (acc[r] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ 4: 4, 7: 4, 11: 4 });
  });
});
