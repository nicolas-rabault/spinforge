import { describe, expect, it } from 'vitest';
import { maxPlayableChapter, startRun, syncRunStats, tick } from './sim';
import { applyRunReward, createInitialMeta, setActiveToupie } from './meta';
import { salleReward } from './economy';
import { spawnSalle, botCountFor } from './salle';
import { ARENA_RADIUS, CHASSIS, MAX_CHAPTER, MODELS_PROFILE, PLAYER_BASE, SALLES_PER_CHAPTER, TALENTS } from './config';
import { openChest } from './chest';

function play(seed: number, n: number, clearEvery: number | null, clearBreaches = false): string {
  const meta = createInitialMeta(seed);
  const run = startRun(meta, 1, seed);
  for (let i = 0; i < n; i++) {
    if (clearEvery !== null && i % clearEvery === clearEvery - 1) for (const b of run.bots) b.spin = 0.0001;
    const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
    if (reward) applyRunReward(meta, reward);
    // `run.arena` n'est reconstruit que dans `startSalle`, appelé depuis `tick` :
    // le nettoyer ici après coup suffit à retirer le bord létal de ce scénario.
    // Ce scénario sert à couvrir le déterminisme des transitions de salle et la
    // validation du chapitre, pas le bord — sans ce nettoyage la toupie finirait
    // éjectée en cours de route et le scénario ne couvrirait plus la salle 10.
    if (clearBreaches) run.arena.breaches = [];
  }
  return JSON.stringify({ run, meta });
}

const runTicks = (seed: number, n: number) => play(seed, n, null);
// Force la salle à se vider régulièrement : sans ça, 300 ticks se jouent
// entièrement dans la salle 1 et le déterminisme n'est testé que sur la physique.
const runTicksThroughSalles = (seed: number, n: number) => play(seed, n, 25, true);
// Même scénario, mais sans nettoyer `run.arena.breaches` : les brèches restent en
// place (elles apparaissent dès la salle 3) et le chemin d'éjection est donc
// réellement traversé — sans ce scénario, plus aucun test ne garde le déterminisme
// à travers une éjection, alors que c'est le risque central du jalon 2.5.
const runTicksThroughBreaches = (seed: number, n: number) => play(seed, n, 25);

describe('ouverture de la descente', () => {
  it('démarre chapitre 1, salle 1, phase fighting, avec les bots de la salle 1', () => {
    const run = startRun(createInitialMeta(42), 1, 42);
    expect(run.chapter).toBe(1);
    expect(run.salle).toBe(1);
    expect(run.phase).toBe('fighting');
    expect(run.bots).toHaveLength(botCountFor(1));
    expect(run.player.spin).toBe(run.player.spinMax);
  });

  it('chaque salle reçoit son gabarit d’arène', () => {
    const run = startRun(createInitialMeta(1), 1, 1);
    expect(run.arena.zones.length).toBeGreaterThan(0);
    expect(run.arena.shard).toBeNull();
  });
});

describe('déterminisme', () => {
  it('même seed + mêmes inputs ⇒ états strictement identiques', () => {
    expect(runTicks(42, 300)).toBe(runTicks(42, 300));
  });

  it('seeds différentes ⇒ états différents', () => {
    expect(runTicks(42, 300)).not.toBe(runTicks(7, 300));
  });

  it('reste déterministe à travers les transitions de salle et la validation du chapitre', () => {
    const a = runTicksThroughSalles(42, 300);
    expect(a).toBe(runTicksThroughSalles(42, 300));
    expect(a).not.toBe(runTicksThroughSalles(7, 300));
    // Garde-fou : si ce scénario cessait de franchir des salles, il ne testerait
    // plus rien de plus que le test précédent — d'où l'exigence de la validation
    // du chapitre entier (les dix salles), pas seulement d'une salle vidée.
    expect(JSON.parse(a).meta.bestChapter).toBe(1);
  });

  // Graines 95 et 132 choisies exprès, pas au hasard : sous ce pilotage à direction
  // fixe ({x:1, y:0.5} un tick sur deux), une éjection reste rare — un balayage des
  // graines 1 à 200 n'en a trouvé que trois (95, 132, 150). Vérifié par
  // instrumentation, pas supposé : les deux graines retenues éjectent réellement
  // au moins une toupie pendant le scénario. Sans cette vérification, ce test
  // attesterait un chemin qu'il ne parcourt jamais — c'était le cas des graines
  // 42/7 d'une version précédente. Si le pilotage, le gabarit d'arène ou les
  // valeurs de brèche changent, ces graines perdent leur garantie et un nouveau
  // balayage est nécessaire — ne pas les remettre à 42 « pour faire simple », ça
  // rouvrirait le trou en silence.
  it('reste déterministe à travers les brèches (bord létal non nettoyé)', () => {
    const a = runTicksThroughBreaches(95, 300);
    expect(a).toBe(runTicksThroughBreaches(95, 300));
    expect(a).not.toBe(runTicksThroughBreaches(132, 300));
  });

  it('ouvrir des coffres entre deux salles ne change pas l’issue du run', () => {
    const playWithChests = (openChests: boolean) => {
      const meta = createInitialMeta(42);
      meta.credits = 10_000_000;
      const run = startRun(meta, 1, 42);
      for (let i = 0; i < 300; i++) {
        if (i % 25 === 24) {
          for (const b of run.bots) b.spin = 0.0001;
          if (openChests) openChest(meta, 'bronze', 10);
        }
        const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
        if (reward) applyRunReward(meta, reward);
      }
      return JSON.stringify(run);
    };
    // C'est tout l'intérêt d'avoir séparé les deux flux de RNG.
    expect(playWithChests(true)).toBe(playWithChests(false));
  });
});

describe('progression', () => {
  it('vider une salle retourne la récompense et fait avancer', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    for (const b of run.bots) b.spin = 0.0001; // le decay du prochain tick les achève
    const reward = tick(run, { steer: null });
    expect(reward?.credits).toBeCloseTo(salleReward(1, 1, false, 1).reward.credits, 5);
    expect(run.salle).toBe(2);
    expect(run.bots).toHaveLength(botCountFor(2));
    // tick() n'a rien appliqué : le méta est hors de sa portée.
    expect(meta.credits).toBe(0);
  });

  it('vider une salle rapporte au moins un coffre', () => {
    const run = startRun(createInitialMeta(1), 1, 1);
    let reward = null;
    for (let i = 0; i < 6000 && reward === null; i++) {
      reward = tick(run, { steer: run.bots[0] ? { x: run.bots[0].pos.x - run.player.pos.x, y: run.bots[0].pos.y - run.player.pos.y } : null });
    }
    expect(reward).not.toBeNull();
    expect(reward!.chests.length).toBeGreaterThanOrEqual(1);
  });

  it('l’entrée dans une nouvelle salle remet à zéro la suspension de décroissance du joueur', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    for (const b of run.bots) b.spin = 0.0001;
    run.player.decayPauseTicks = 5; // suspension en cours (ex. talent Relance)
    tick(run, { steer: null });
    expect(run.salle).toBe(2); // la salle a bien été vidée
    // Sinon jusqu'à 2 s de décroissance offerte au joueur dans la salle suivante.
    expect(run.player.decayPauseTicks).toBe(0);
  });

  it('vider la salle 10 pose la phase « won » et ne repart pas en salle 1', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    run.salle = SALLES_PER_CHAPTER;
    const spawned = spawnSalle(run.chapter, SALLES_PER_CHAPTER, run.rngState);
    run.bots = spawned.bots;
    run.rngState = spawned.rngState;
    for (const b of run.bots) b.spin = 0.0001;
    const reward = tick(run, { steer: null })!;
    applyRunReward(meta, reward);
    expect(reward.boss).toBe(true);
    expect(meta.bestChapter).toBe(1);
    expect(run.phase).toBe('won');
    // La descente est fermée : la salle ne revient pas à 1 et plus rien n'avance.
    expect(run.salle).toBe(SALLES_PER_CHAPTER);
    expect(tick(run, { steer: null })).toBeNull();
    expect(meta.credits).toBeCloseTo(salleReward(1, SALLES_PER_CHAPTER, true, 1).reward.credits, 5);
    expect(meta.gems).toBe(salleReward(1, SALLES_PER_CHAPTER, true, 1).reward.gems);
  });

  it('spin à zéro ⇒ mort ; la descente suivante repart salle 1 en gardant les crédits', () => {
    const meta = createInitialMeta(1);
    meta.credits = 500;
    const run = startRun(meta, 1, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
    const suivant = startRun(meta, 1, run.rngState);
    expect(suivant.phase).toBe('fighting');
    expect(suivant.salle).toBe(1);
    expect(meta.credits).toBe(500);
    expect(suivant.player.spin).toBe(suivant.player.spinMax);
  });
});

describe('syncRunStats', () => {
  it('applique l’amélioration au joueur du run en cours', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    const before = run.player.attack;
    meta.equipped.lame.level = 5;
    syncRunStats(run, meta);
    expect(run.player.attack).toBeGreaterThan(before);
  });

  it('borne le spin vers le bas et ne soigne jamais', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    run.player.spin = 100;
    meta.equipped.noyau.level = 10; // spinMax augmente
    syncRunStats(run, meta);
    expect(run.player.spin).toBe(100);

    run.player.spin = run.player.spinMax;
    meta.equipped.noyau.level = 0; // spinMax redescend
    syncRunStats(run, meta);
    expect(run.player.spin).toBe(run.player.spinMax);
  });
});

describe('talents du joueur', () => {
  it('startRun pose sur le joueur les talents de l’équipement de départ', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 4; // Excellent — débloque Estoc
    const run = startRun(meta, 1, 1);
    expect(run.player.talents.estocThreshold).toBe(TALENTS.estoc.speedThreshold);
    expect(run.player.talents.estocBonus).toBe(TALENTS.estoc.damageBonus);
  });

  it('syncRunStats recalcule les talents du joueur d’un run déjà démarré', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    expect(run.player.talents.impulseTaken).toBe(1); // rang 1 : Ancrage pas encore débloqué

    meta.equipped.disque.rank = 4; // Excellent — débloque Ancrage
    syncRunStats(run, meta);
    expect(run.player.talents.impulseTaken).toBe(TALENTS.ancrage.impulseTaken);
  });
});

describe('type et masse du joueur', () => {
  it('makePlayer prend le type de la toupie active, pas un type en dur', () => {
    const meta = createInitialMeta(1);
    // Le starter est 'brasier-solaire' (équilibre) : on débloque et active une
    // autre toupie, d'un autre type, pour ne pas retomber par hasard dessus.
    meta.toupies.unlocked.push('tigre-foudre');
    setActiveToupie(meta, 'tigre-foudre');
    const run = startRun(meta, 1, 1);
    expect(run.player.type).toBe('endurance');
  });

  it('startRun applique l’accélération du châssis sans passer par syncRunStats — le chemin de l’app au chargement (App.tsx) et au clic « rejouer » (CombatScreen)', () => {
    const meta = createInitialMeta(1);
    meta.toupies.unlocked.push('typhon-primal');
    setActiveToupie(meta, 'typhon-primal');
    const run = startRun(meta, 1, 1);
    // Si makePlayer recopiait PLAYER_BASE.accel en dur au lieu de stats.accel,
    // cette assertion resterait sur la valeur neutre au lieu de la valeur du
    // châssis : aucun syncRunStats n'intervient ici pour rattraper l'écart.
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel * CHASSIS['typhon-primal'].accel!, 6);
  });

  it('makePlayer multiplie la masse du profil par celle du talent Masse', () => {
    const sansTalent = startRun(createInitialMeta(1), 1, 1);
    expect(sansTalent.player.mass).toBe(1);

    const meta = createInitialMeta(1);
    // Un Disque dont le profil pèse sur la masse (×1,30) : sans lui, stats.mass
    // resterait à 1 et `stats.mass * talents.mass` serait indiscernable de
    // `talents.mass` seul — le rang débloque aussi le talent Masse au passage.
    meta.equipped.disque.model = 'disque.colosse';
    meta.equipped.disque.rank = TALENTS.masse.rank;
    const avecTalent = startRun(meta, 1, 1);
    expect(avecTalent.player.mass).toBeCloseTo(MODELS_PROFILE['disque.colosse'].mass! * TALENTS.masse.mass, 6);
  });

  it('syncRunStats fige le châssis de la descente et laisse passer les pièces', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1); // Brasier Solaire, profil de châssis neutre
    const attackBefore = run.player.attack;

    // Le contournement mesuré avant le verrou : changer de châssis à chaque salle
    // pour être toujours du bon côté du triangle. Carapace Abyssale pèse sur les
    // trois axes vérifiés ici — type défense, accel ×0,80, masse ×1,40 — donc si
    // `syncRunStats` lisait encore `meta.toupies.active`, les trois bougeraient.
    meta.toupies.unlocked.push('carapace-abyssale');
    setActiveToupie(meta, 'carapace-abyssale');
    // Améliorée dans le même appel : sans cette moitié, le test passerait encore
    // si `syncRunStats` ne faisait plus rien du tout.
    meta.equipped.lame.level = 5;
    // Perturbés d'abord : sans ça, les trois assertions ci-dessous porteraient sur
    // les valeurs que `startRun` a déjà écrites, et passeraient encore si
    // `syncRunStats` cessait purement et simplement d'écrire ces champs.
    run.player.type = 'attaque';
    run.player.accel = 0;
    run.player.mass = 0;
    syncRunStats(run, meta);

    expect(run.player.type).toBe('equilibre');
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel, 6);
    expect(run.player.mass).toBeCloseTo(1, 6);
    expect(run.player.attack).toBeGreaterThan(attackBefore);
  });
});

describe('startRun', () => {
  // Vérifié par mutation : faire relire `meta.toupies.active` à `syncRunStats`
  // fait rougir ce test.
  it('fixe le châssis de la descente, et le run ne le relit jamais', () => {
    const meta = createInitialMeta(1);
    meta.toupies.unlocked = ['brasier-solaire', 'carapace-abyssale'];
    const run = startRun(meta, 1, 1); // Brasier Solaire, type équilibre
    expect(run.toupie).toBe('brasier-solaire');
    setActiveToupie(meta, 'carapace-abyssale');
    syncRunStats(run, meta);
    for (const b of run.bots) b.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.salle).toBe(2); // une frontière de salle a bien été franchie
    expect(run.toupie).toBe('brasier-solaire');
    expect(run.player.type).toBe('equilibre');
    // Accel et masse viennent du `stats` de `syncRunStats`, là où le type est
    // écrit sur une ligne à part : sans ces deux-là, la mutation d'une seule
    // ligne — `playerStats(meta, meta.toupies.active)` — laisserait ce test vert.
    // Carapace Abyssale pèse ×0,80 sur l'accel et ×1,40 sur la masse, contre le
    // profil neutre de Brasier Solaire.
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel, 6);
    expect(run.player.mass).toBeCloseTo(1, 6);
    // Le choix en attente ne monte qu'à la descente suivante.
    expect(startRun(meta, 1, 2).toupie).toBe('carapace-abyssale');
  });

  // Vérifié par mutation : retirer la borne de `startRun` fait rougir ce test.
  it('borne le chapitre jouable par bestChapter + 1', () => {
    const meta = createInitialMeta(1);
    expect(maxPlayableChapter(meta)).toBe(1);
    expect(startRun(meta, 4, 1).chapter).toBe(1);
    meta.bestChapter = 1;
    expect(maxPlayableChapter(meta)).toBe(2);
    expect(startRun(meta, 2, 1).chapter).toBe(2);
    expect(startRun(meta, 3, 1).chapter).toBe(2);
    // Jamais au-delà du contenu qui existe.
    meta.bestChapter = 99;
    expect(maxPlayableChapter(meta)).toBe(MAX_CHAPTER);
    expect(startRun(meta, 99, 1).chapter).toBe(MAX_CHAPTER);
  });

  it('normalise une graine nulle', () => {
    // `startSalle` a déjà consommé le flux quand `startRun` rend la main : la
    // normalisation ne s'observe donc pas sur la graine elle-même, mais sur le
    // fait que la descente de graine 0 est exactement celle de la graine 1.
    expect(startRun(createInitialMeta(1), 1, 0).rngState)
      .toBe(startRun(createInitialMeta(1), 1, 1).rngState);
  });
});

describe('talent Second souffle', () => {
  it('accorde un sursis au lieu de la mort, une seule fois par run', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7; // Épique : Réserve + Second souffle
    const run = startRun(meta, 1, 1);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('fighting');
    expect(run.player.spin).toBeCloseTo(run.player.spinMax * 0.2, 5);
    expect(run.secondSouffleUsed).toBe(true);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });

  it('la descente suivante réarme le sursis', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7;
    const run = startRun(meta, 1, 1);
    run.secondSouffleUsed = true;
    const run2 = startRun(meta, 1, run.rngState);
    expect(run2.secondSouffleUsed).toBe(false);
  });

  it('sans le talent, spin à zéro tue toujours', () => {
    const meta = createInitialMeta(1);
    const run = startRun(meta, 1, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });
});

describe('talent Réserve', () => {
  it('rend davantage de spin entre deux salles', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 4; // Excellent : Réserve
    const run = startRun(meta, 1, 1);
    run.player.spin = 100;
    for (const b of run.bots) b.spin = 0.0001;
    tick(run, { steer: null });
    // 0,35 du spin max au lieu de 0,20.
    expect(run.player.spin).toBeGreaterThan(100 + 0.3 * run.player.spinMax);
  });
});

describe('éjection', () => {
  it('une éjection met le spin à zéro et se signale au rendu', () => {
    const run = startRun(createInitialMeta(1), 1, 1);
    run.arena.breaches = [{ angle: 0, halfWidth: 0.6 }];
    const bot = run.bots[0];
    bot.pos = { x: ARENA_RADIUS - bot.radius - 1, y: 0 };
    bot.vel = { x: 600, y: 0 };
    bot.aim = { x: 1, y: 0 };
    tick(run, { steer: null });
    expect(run.ejected).toContain(bot.id);
    // Le bot éjecté est retiré par le filtre habituel : une éjection est une mort
    // comme une autre pour la simulation.
    expect(run.bots.some((b) => b.id === bot.id)).toBe(false);
  });

  it('vide la liste des éjectés à chaque tick', () => {
    const run = startRun(createInitialMeta(1), 1, 1);
    run.ejected = ['fantome'];
    tick(run, { steer: null });
    expect(run.ejected).not.toContain('fantome');
  });
});

describe('éclat', () => {
  it('un bot plus proche de l’éclat que du joueur va le chercher', () => {
    const run = startRun(createInitialMeta(1), 1, 1);
    const bot = run.bots[0];
    // Éclat à gauche, joueur à droite : le signe de aim.x tranche entre les deux.
    bot.pos = { x: 0, y: 0 };
    run.player.pos = { x: 140, y: 0 };
    run.arena.shard = { x: -60, y: 0, ttl: 30 };
    // Le retarget a lieu au tick dont le numéro vaut 1 modulo 10.
    run.tick = 0;
    tick(run, { steer: null });
    // Il vise la gauche (l'éclat, à 60) et non la droite (le joueur, à 140). Le
    // jitter d'IA ne dépasse jamais ±0,6 rad, donc le signe de aim.x est décidé.
    expect(bot.aim!.x).toBeLessThan(0);
  });
});
