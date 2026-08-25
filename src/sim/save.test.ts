import { describe, expect, it } from 'vitest';
import { SAVE_SCHEMA, deserializeMeta, serializeMeta } from './save';
import { createInitialMeta } from './meta';

function filled() {
  const meta = createInitialMeta(7);
  meta.credits = 1234.5;
  meta.gems = 80;
  meta.equipped.lame = { model: 'lame.couronne-solaire', rank: 4, level: 12 };
  meta.inventory = [
    { model: 'disque.lourd', rank: 1, count: 7, bestLevel: 3 },
    { model: 'pointe.furie', rank: 3, count: 2, bestLevel: 0 },
  ];
  meta.pity = { bronze: 0, arene: 6, mythique: 19 };
  meta.chapterValidated = true;
  return meta;
}

describe('aller-retour', () => {
  it('restitue un méta identique', () => {
    const meta = filled();
    const back = deserializeMeta(serializeMeta(meta));
    expect(back).toEqual(meta);
  });

  it('ne partage aucune référence avec l’original', () => {
    const meta = filled();
    const back = deserializeMeta(serializeMeta(meta))!;
    back.inventory[0].count = 99;
    expect(meta.inventory[0].count).toBe(7);
  });

  it('écrit le numéro de schéma courant', () => {
    expect(JSON.parse(serializeMeta(filled())).v).toBe(SAVE_SCHEMA);
  });
});

describe('robustesse', () => {
  it('rejette un JSON illisible', () => {
    expect(deserializeMeta('{pas du json')).toBeNull();
  });

  it('rejette un blob sans enveloppe de version', () => {
    expect(deserializeMeta(JSON.stringify({ credits: 10 }))).toBeNull();
  });

  it('rejette un schéma venu du futur', () => {
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA + 1, meta: filled() }))).toBeNull();
  });

  it('rejette un méta amputé d’un champ obligatoire', () => {
    const meta = filled() as Partial<ReturnType<typeof filled>>;
    delete meta.equipped;
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });
});

describe('migration', () => {
  // Le schéma naît à 1 : aucune version antérieure réelle n'existe. Ce test en
  // fabrique une pour prouver que le chemin de migration fonctionne — c'est tout
  // l'intérêt de bâtir le mécanisme maintenant, la forme du méta changera au 2b.
  it('fait remonter un blob v0 jusqu’au schéma courant', () => {
    const v0 = { v: 0, meta: { credits: 300, gems: 0 } };
    const back = deserializeMeta(JSON.stringify(v0));
    expect(back).not.toBeNull();
    expect(back!.credits).toBe(300);
    // Les champs absents en v0 prennent leur valeur de départ.
    expect(back!.inventory).toEqual([]);
    expect(back!.equipped.lame.rank).toBe(1);
  });
});
