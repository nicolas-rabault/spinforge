import { describe, expect, it } from 'vitest';
import { SAVE_SCHEMA, deserializeMeta, serializeMeta } from './save';
import { createInitialMeta } from './meta';

function filled() {
  const meta = createInitialMeta(7);
  meta.credits = 1234.5;
  meta.gems = 80;
  meta.equipped.lame = { model: 'lame.couronne-solaire', rank: 4, level: 12 };
  meta.inventory = [
    // Plusieurs niveaux réellement distincts dans la même pile : c'est justement
    // ce que le schéma 1 (`count` + `bestLevel`) ne pouvait pas représenter.
    { model: 'disque.lourd', rank: 1, levels: [5, 3, 0, 0, 0, 0, 0] },
    { model: 'pointe.furie', rank: 3, levels: [0, 0] },
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
    back.inventory[0].levels[0] = 99;
    expect(meta.inventory[0].levels[0]).toBe(5);
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

  it('rejette `equipped: null` sans lever d’exception', () => {
    const meta = { ...filled(), equipped: null };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  it('rejette un champ obligatoire posé à `null` plutôt qu’absent', () => {
    const meta = { ...filled(), pity: null };
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

  // Celle-ci a réellement existé : le schéma 1 stockait chaque pile en
  // `{ count, bestLevel }`. La migration doit convertir vers `{ levels }` en
  // mettant le meilleur niveau connu en tête et en complétant le reste à 0 —
  // exactement l'hypothèse que l'ancien `takePiece` faisait à chaque retrait,
  // appliquée ici une seule fois à la lecture.
  it('migre un blob v1 réaliste : les piles `{ count, bestLevel }` deviennent `{ levels }`', () => {
    const v1 = {
      v: 1,
      meta: {
        rngState: 42,
        credits: 500,
        gems: 10,
        equipped: createInitialMeta(1).equipped,
        inventory: [
          { model: 'disque.lourd', rank: 1, count: 4, bestLevel: 9 },
          { model: 'pointe.furie', rank: 2, count: 1, bestLevel: 0 },
        ],
        pity: { bronze: 0, arene: 0, mythique: 0 },
        chapterValidated: false,
      },
    };
    const back = deserializeMeta(JSON.stringify(v1));
    expect(back).not.toBeNull();
    expect(back!.inventory).toEqual([
      { model: 'disque.lourd', rank: 1, levels: [9, 0, 0, 0] },
      { model: 'pointe.furie', rank: 2, levels: [0] },
    ]);
  });
});
