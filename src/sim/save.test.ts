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
  meta.bestChapter = 1;
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
  it('charge une sauvegarde de schéma 2 avec une file de butin vide', () => {
    const meta = createInitialMeta(3);
    meta.credits = 1234;
    const v2 = JSON.stringify({ v: 2, meta: { ...meta, pending: undefined } });
    const loaded = deserializeMeta(v2);
    expect(loaded).not.toBeNull();
    expect(loaded!.credits).toBe(1234);
    expect(loaded!.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
  });

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

  // Le bug qu'on referme : la migration (v < SAVE_SCHEMA) ne passait par aucune
  // validation, contrairement au schéma courant. Un blob migré dont un
  // emplacement équipé est amputé ressortait non nul de `deserializeMeta`, puis
  // faisait lever un `TypeError` à la création du run — page blanche
  // définitive, sans bandeau ni copie de secours.
  it('rejette un blob migré dont un emplacement équipé est amputé', () => {
    const { lame: _omise, ...reste } = createInitialMeta(1).equipped;
    const v1 = {
      v: 1,
      meta: {
        rngState: 42, credits: 500, gems: 10,
        equipped: reste, // lame manquante
        inventory: [],
        pity: { bronze: 0, arene: 0, mythique: 0 },
        chapterValidated: false,
      },
    };
    expect(deserializeMeta(JSON.stringify(v1))).toBeNull();
  });

  it('rejette un blob migré dont un emplacement équipé vaut `null`', () => {
    const v1 = {
      v: 1,
      meta: {
        rngState: 42, credits: 500, gems: 10,
        equipped: { ...createInitialMeta(1).equipped, lame: null },
        inventory: [],
        pity: { bronze: 0, arene: 0, mythique: 0 },
        chapterValidated: false,
      },
    };
    expect(deserializeMeta(JSON.stringify(v1))).toBeNull();
  });

  it('migre un blob de schéma 4 : chapterValidated devient bestChapter', () => {
    const { bestChapter: _absent, ...sans } = createInitialMeta(1);
    const valide = { v: 4, meta: { ...sans, chapterValidated: true } };
    expect(deserializeMeta(JSON.stringify(valide))!.bestChapter).toBe(1);
    const vierge = { v: 4, meta: { ...sans, chapterValidated: false } };
    expect(deserializeMeta(JSON.stringify(vierge))!.bestChapter).toBe(0);
  });

  it('rejette un blob de schéma courant sans bestChapter', () => {
    const { bestChapter: _absent, ...sans } = createInitialMeta(1);
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta: sans }))).toBeNull();
  });

  // `isComplete` ne vérifie que « c'est un nombre ». Sans la normalisation de
  // `hydrate`, un `bestChapter` de 1,5 donne un `maxPlayableChapter` de 2,5, que
  // `chapterOf` va chercher dans `CHAPTERS[1.5]` : `undefined`, puis un
  // `TypeError` à la création du run — page blanche, sans même le bandeau de
  // sauvegarde récupérée, puisque le blob n'a pas été refusé.
  it('normalise un bestChapter fractionnaire ou négatif en entier', () => {
    const fraction = { ...filled(), bestChapter: 1.5 };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta: fraction }))!.bestChapter).toBe(1);
    const negatif = { ...filled(), bestChapter: -3 };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta: negatif }))!.bestChapter).toBe(0);
  });
});

describe('isComplete renforcée', () => {
  // Avant, seule la nullité de chaque emplacement équipé était vérifiée : un
  // objet vide passait, puis produisait des statistiques à `NaN` partout où la
  // pièce est lue — le joueur devient alors immortel, une comparaison avec
  // `NaN` étant toujours fausse.
  it('rejette un emplacement équipé sans modèle, rang ni niveau', () => {
    const meta = { ...filled(), equipped: { ...filled().equipped, lame: {} } };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  // Avant, seul `Array.isArray` était vérifié : un inventaire de nombres nus
  // passait puis faisait lever à l'ouverture de la Forge.
  it('rejette un inventaire dont les entrées ne sont pas des piles', () => {
    const meta = { ...filled(), inventory: [1, 2, 3] };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  // Avant, seule la présence d'un objet non nul était vérifiée : un `pity`
  // vide passait puis cassait silencieusement les deux garanties de coffre.
  it('rejette un `pity` sans ses trois compteurs', () => {
    const meta = { ...filled(), pity: {} };
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  it('refuse une sauvegarde du schéma courant amputée de sa file de butin', () => {
    // Schéma courant : un champ manquant est un blob corrompu, pas une version
    // antérieure — le compléter en silence masquerait le problème.
    const meta = createInitialMeta(3) as unknown as Record<string, unknown>;
    delete meta.pending;
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });
});

describe('schéma courant et migrations', () => {
  it('donne la toupie de départ et un cadeau en attente à une sauvegarde v2', () => {
    const v2 = createInitialMeta(9);
    delete (v2 as unknown as Record<string, unknown>).toupies;
    delete (v2 as unknown as Record<string, unknown>).founderGiftClaimed;
    const restored = deserializeMeta(JSON.stringify({ v: 2, meta: v2 }));
    expect(restored).not.toBeNull();
    expect(restored!.toupies).toEqual({ unlocked: ['brasier-solaire'], active: 'brasier-solaire' });
    expect(restored!.founderGiftClaimed).toBe(false);
    expect(restored!.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
  });

  it('retombe sur la toupie de départ si l’active n’est pas débloquée', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire'], active: 'tigre-foudre' };
    const restored = deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }));
    expect(restored!.toupies.active).toBe('brasier-solaire');
  });

  it('rejette un blob au schéma courant privé de ses toupies', () => {
    const meta = createInitialMeta(9);
    delete (meta as unknown as Record<string, unknown>).toupies;
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });

  it('écarte un identifiant de toupie inconnu au lieu de le propager', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire', 'nawak' as never], active: 'brasier-solaire' };
    const restored = deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }));
    expect(restored!.toupies.unlocked).toEqual(['brasier-solaire']);
  });

  it('complète les deux dialectes du schéma 3 livrés en parallèle', () => {
    // Le dialecte 2b : toupies mais pas pending. Le dialecte 2.5 : l'inverse.
    // Ni l'un ni l'autre n'est rejeté : au schéma 4, un blob v3 est antérieur, il
    // échappe à la garde du schéma courant et passe par `hydrate`. Le joueur garde
    // sa progression ; seuls les champs que son dialecte ignorait repartent de leur
    // valeur initiale.
    const dialecte2b = createInitialMeta(9);
    delete (dialecte2b as unknown as Record<string, unknown>).pending;
    const dialecte25 = createInitialMeta(9);
    delete (dialecte25 as unknown as Record<string, unknown>).toupies;
    delete (dialecte25 as unknown as Record<string, unknown>).founderGiftClaimed;
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte2b }))).not.toBeNull();
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte25 }))).not.toBeNull();
    // …mais complétés par hydrate, pas propagés tels quels :
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte2b }))!.pending)
      .toEqual({ bronze: 0, arene: 0, mythique: 0 });
    expect(deserializeMeta(JSON.stringify({ v: 3, meta: dialecte25 }))!.toupies.active)
      .toBe('brasier-solaire');
  });
});
