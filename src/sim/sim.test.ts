import { describe, expect, it } from 'vitest';
import { createRun, resetRun, syncRunStats, tick } from './sim';
import { applyRunReward, createInitialMeta } from './meta';
import { salleReward } from './economy';
import { spawnSalle, botCountFor } from './salle';
import { SALLES_PER_CHAPTER, TALENTS } from './config';
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
