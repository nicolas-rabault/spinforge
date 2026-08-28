import { describe, expect, it } from 'vitest';
import { createRun, equipPendingToupie, resetRun, syncRunStats, tick } from './sim';
import { applyRunReward, createInitialMeta, setActiveToupie } from './meta';
import { salleReward } from './economy';
import { spawnSalle, botCountFor } from './salle';
import { CHASSIS, MODELS_PROFILE, PLAYER_BASE, SALLES_PER_CHAPTER, TALENTS } from './config';
import { openChest } from './chest';

function play(seed: number, n: number, clearEvery: number | null): string {
  const meta = createInitialMeta(seed);
  const run = createRun(meta, seed);
  for (let i = 0; i < n; i++) {
    if (clearEvery !== null && i % clearEvery === clearEvery - 1) for (const b of run.bots) b.spin = 0.0001;
    const salleBefore = run.salle;
    const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
    if (reward) applyRunReward(meta, reward, salleBefore);
  }
  return JSON.stringify({ run, meta });
}

const runTicks = (seed: number, n: number) => play(seed, n, null);
// Force la salle à se vider régulièrement : sans ça, 300 ticks se jouent
// entièrement dans la salle 1 et le déterminisme n'est testé que sur la physique.
const runTicksThroughSalles = (seed: number, n: number) => play(seed, n, 25);

describe('createRun', () => {
  it('démarre chapitre 1, salle 1, phase fighting, avec les bots de la salle 1', () => {
    const run = createRun(createInitialMeta(42), 42);
    expect(run.chapter).toBe(1);
    expect(run.salle).toBe(1);
    expect(run.phase).toBe('fighting');
    expect(run.bots).toHaveLength(botCountFor(1));
    expect(run.player.spin).toBe(run.player.spinMax);
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
    // plus rien de plus que le test précédent.
    expect(JSON.parse(a).meta.chapterValidated).toBe(true);
  });

  it('ouvrir des coffres entre deux salles ne change pas l’issue du run', () => {
    const playWithChests = (openChests: boolean) => {
      const meta = createInitialMeta(42);
      meta.credits = 10_000_000;
      const run = createRun(meta, 42);
      for (let i = 0; i < 300; i++) {
        if (i % 25 === 24) {
          for (const b of run.bots) b.spin = 0.0001;
          if (openChests) openChest(meta, 'bronze', 10);
        }
        const salleBefore = run.salle;
        const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
        if (reward) applyRunReward(meta, reward, salleBefore);
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
    const run = createRun(meta, 1);
    for (const b of run.bots) b.spin = 0.0001; // le decay du prochain tick les achève
    const reward = tick(run, { steer: null });
    expect(reward?.credits).toBeCloseTo(salleReward(1, false).credits, 5);
    expect(run.salle).toBe(2);
    expect(run.bots).toHaveLength(botCountFor(2));
    // tick() n'a rien appliqué : le méta est hors de sa portée.
    expect(meta.credits).toBe(0);
  });

  it('l’entrée dans une nouvelle salle remet à zéro la suspension de décroissance du joueur', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    for (const b of run.bots) b.spin = 0.0001;
    run.player.decayPauseTicks = 5; // suspension en cours (ex. talent Relance)
    tick(run, { steer: null });
    expect(run.salle).toBe(2); // la salle a bien été vidée
    // Sinon jusqu'à 2 s de décroissance offerte au joueur dans la salle suivante.
    expect(run.player.decayPauseTicks).toBe(0);
  });

  it('vider la salle 10 valide le chapitre et repart en salle 1', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.salle = SALLES_PER_CHAPTER;
    const spawned = spawnSalle(run.chapter, SALLES_PER_CHAPTER, run.rngState);
    run.bots = spawned.bots;
    run.rngState = spawned.rngState;
    for (const b of run.bots) b.spin = 0.0001;
    const reward = tick(run, { steer: null })!;
    applyRunReward(meta, reward, SALLES_PER_CHAPTER);
    expect(meta.chapterValidated).toBe(true);
    expect(run.salle).toBe(1);
    expect(meta.credits).toBeCloseTo(salleReward(SALLES_PER_CHAPTER, true).credits, 5);
    expect(meta.gems).toBe(salleReward(SALLES_PER_CHAPTER, true).gems);
  });

  it('spin à zéro ⇒ mort ; resetRun repart salle 1 en gardant les crédits', () => {
    const meta = createInitialMeta(1);
    meta.credits = 500;
    const run = createRun(meta, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
    resetRun(run, meta);
    expect(run.phase).toBe('fighting');
    expect(run.salle).toBe(1);
    expect(meta.credits).toBe(500);
    expect(run.player.spin).toBe(run.player.spinMax);
  });
});

describe('syncRunStats', () => {
  it('applique l’amélioration au joueur du run en cours', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    const before = run.player.attack;
    meta.equipped.lame.level = 5;
    syncRunStats(run, meta);
    expect(run.player.attack).toBeGreaterThan(before);
  });

  it('borne le spin vers le bas et ne soigne jamais', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
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
  it('createRun pose sur le joueur les talents de l’équipement de départ', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 4; // Excellent — débloque Estoc
    const run = createRun(meta, 1);
    expect(run.player.talents.estocThreshold).toBe(TALENTS.estoc.speedThreshold);
    expect(run.player.talents.estocBonus).toBe(TALENTS.estoc.damageBonus);
  });

  it('syncRunStats recalcule les talents du joueur d’un run déjà démarré', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
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
    const run = createRun(meta, 1);
    expect(run.player.type).toBe('endurance');
  });

  it('createRun applique l’accélération du châssis sans passer par syncRunStats — le chemin de l’app au chargement (App.tsx) et au clic « rejouer » (CombatScreen)', () => {
    const meta = createInitialMeta(1);
    meta.toupies.unlocked.push('typhon-primal');
    setActiveToupie(meta, 'typhon-primal');
    const run = createRun(meta, 1);
    // Si makePlayer recopiait PLAYER_BASE.accel en dur au lieu de stats.accel,
    // cette assertion resterait sur la valeur neutre au lieu de la valeur du
    // châssis : aucun syncRunStats n'intervient ici pour rattraper l'écart.
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel * CHASSIS['typhon-primal'].accel!, 6);
  });

  it('makePlayer multiplie la masse du profil par celle du talent Masse', () => {
    const sansTalent = createRun(createInitialMeta(1), 1);
    expect(sansTalent.player.mass).toBe(1);

    const meta = createInitialMeta(1);
    // Un Disque dont le profil pèse sur la masse (×1,30) : sans lui, stats.mass
    // resterait à 1 et `stats.mass * talents.mass` serait indiscernable de
    // `talents.mass` seul — le rang débloque aussi le talent Masse au passage.
    meta.equipped.disque.model = 'disque.colosse';
    meta.equipped.disque.rank = TALENTS.masse.rank;
    const avecTalent = createRun(meta, 1);
    expect(avecTalent.player.mass).toBeCloseTo(MODELS_PROFILE['disque.colosse'].mass! * TALENTS.masse.mass, 6);
  });

  it('syncRunStats fige le châssis de la descente et laisse passer les pièces', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1); // Brasier Solaire, profil de châssis neutre
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
    syncRunStats(run, meta);

    expect(run.player.type).toBe('equilibre');
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel, 6);
    expect(run.player.mass).toBeCloseTo(1, 6);
    expect(run.player.attack).toBeGreaterThan(attackBefore);
  });
});

describe('resetRun', () => {
  it('adopte le châssis choisi pendant le run perdu', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1); // Brasier Solaire
    // Le joueur change d'avis en cours de descente : le choix attend la mort.
    meta.toupies.unlocked.push('typhon-primal');
    setActiveToupie(meta, 'typhon-primal');
    expect(run.toupie).toBe('brasier-solaire');

    resetRun(run, meta);

    expect(run.toupie).toBe('typhon-primal');
    expect(run.player.type).toBe('attaque');
  });
});

describe('equipPendingToupie', () => {
  it('monte le châssis en attente et recopie type, accel et masse', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1); // Brasier Solaire, profil neutre
    meta.toupies.unlocked.push('carapace-abyssale');
    setActiveToupie(meta, 'carapace-abyssale');
    meta.equipped.disque.rank = TALENTS.masse.rank;

    equipPendingToupie(run, meta);

    expect(run.toupie).toBe('carapace-abyssale');
    expect(run.player.type).toBe('defense');
    // Carapace pèse sur l'accélération (×0,80) et la masse (×1,40) : ces deux
    // assertions retomberaient sur les valeurs neutres si l'adoption ne
    // repassait pas par `syncRunStats`.
    expect(run.player.accel).toBeCloseTo(PLAYER_BASE.accel * CHASSIS['carapace-abyssale'].accel!, 6);
    expect(run.player.mass).toBeCloseTo(CHASSIS['carapace-abyssale'].mass! * TALENTS.masse.mass, 6);
  });

  it('ne soigne pas : changer de châssis au boss ne rend pas de spin', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.spin = 42;
    // Tigre Foudre porte spinMax ×1,15 : sans la borne vers le bas de
    // `syncRunStats`, adopter un châssis plus endurant serait un soin gratuit.
    meta.toupies.unlocked.push('tigre-foudre');
    setActiveToupie(meta, 'tigre-foudre');

    equipPendingToupie(run, meta);

    expect(run.player.spinMax).toBeGreaterThan(run.player.spin);
    expect(run.player.spin).toBe(42);
  });
});

describe('talent Second souffle', () => {
  it('accorde un sursis au lieu de la mort, une seule fois par run', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7; // Épique : Réserve + Second souffle
    const run = createRun(meta, 1);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('fighting');
    expect(run.player.spin).toBeCloseTo(run.player.spinMax * 0.2, 5);
    expect(run.secondSouffleUsed).toBe(true);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });

  it('resetRun réarme le sursis', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7;
    const run = createRun(meta, 1);
    run.secondSouffleUsed = true;
    resetRun(run, meta);
    expect(run.secondSouffleUsed).toBe(false);
  });

  it('sans le talent, spin à zéro tue toujours', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });
});

describe('talent Réserve', () => {
  it('rend davantage de spin entre deux salles', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 4; // Excellent : Réserve
    const run = createRun(meta, 1);
    run.player.spin = 100;
    for (const b of run.bots) b.spin = 0.0001;
    tick(run, { steer: null });
    // 0,35 du spin max au lieu de 0,20.
    expect(run.player.spin).toBeGreaterThan(100 + 0.3 * run.player.spinMax);
  });
});
