import { describe, expect, it } from 'vitest';
import { BALANCE, BOTS_PER_SALLE, CHESTS, FUSION, RARITY, SALLES_PER_CHAPTER, TALENTS } from './config';
import { TOUPIES } from '../content/toupies';

const SLOTS = ['lame', 'disque', 'pointe', 'noyau'];

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

  it('a une table de types de bots complète pour le chapitre 1', () => {
    const table = BALANCE.botTypes['1'];
    expect(table).toHaveLength(BALANCE.chapter.sallesPerChapter);
    const valid = ['attaque', 'endurance', 'defense', 'equilibre'];
    for (const t of table) expect(valid).toContain(t);
  });

  it('a un profil de châssis par toupie et laisse la toupie de départ neutre', () => {
    for (const t of TOUPIES) expect(BALANCE.chassis[t.id]).toBeDefined();
    expect(BALANCE.chassis['brasier-solaire']).toEqual({});
  });

  it('laisse l’équipement de départ strictement neutre', () => {
    expect(BALANCE.models['disque.lourd']).toEqual({});
    expect(BALANCE.models['pointe.plate']).toEqual({});
  });

  it('n’a que des multiplicateurs strictement positifs', () => {
    for (const p of [...Object.values(BALANCE.chassis), ...Object.values(BALANCE.models)]) {
      for (const v of Object.values(p)) expect(v).toBeGreaterThan(0);
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
