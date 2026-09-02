import { OFFLINE, SALLES_PER_CHAPTER, TICK_S } from './config';
import { steerWithTerrain } from './autopilot';
import { applyRunReward } from './meta';
import { startRun, syncRunStats, tick } from './sim';
import type { ChestKind, MetaState, RunState } from './types';

/**
 * La descente que le farm a en cours, et ce qu'il n'a pas encore consommé.
 * Vit ENTRE deux appels : sans elle, chaque appel repartirait en salle 1, et
 * l'AUTO — qui appelle par petits paquets — ne verrait jamais que des salles 1
 * quand le hors-ligne enchaîne les dix. Comme le revenu croît en
 * `1,13^(salle−1)`, les deux faces du farm paieraient des tarifs très
 * différents. Jamais sauvegardée : fermer l'app en plein farm équivaut à
 * abandonner la descente, comme en jeu piloté.
 */
export interface FarmSession {
  run: RunState | null;
  /** Le chapitre de `run`. Sert à repartir quand `bestChapter` a monté. */
  chapter: number;
  /** Secondes reçues mais pas encore converties en ticks. La simulation avance
   *  par pas de 100 ms ; à un taux de 15 %, un paquet d'une seconde vaut un tick
   *  et demi, et tronquer à chaque paquet perdrait un tiers du farm sans que
   *  rien ne le signale. */
  carry: number;
}

export function newFarmSession(): FarmSession {
  return { run: null, chapter: 0, carry: 0 };
}

export interface FarmReport {
  /** Temps de jeu réellement simulé, en secondes. */
  seconds: number;
  credits: number;
  /** Toujours 0 : les gemmes ne tombent que du boss, que le farm ne combat pas. */
  gems: number;
  chests: Record<ChestKind, number>;
  salles: number;
  chapter: number;
}

function emptyReport(chapter: number): FarmReport {
  return {
    seconds: 0, credits: 0, gems: 0,
    chests: { bronze: 0, arene: 0, mythique: 0 },
    salles: 0, chapter,
  };
}

/** Ouvre la descente suivante. La graine continue le flux de la précédente —
 *  `seed` n'ouvre que la toute première de la session. Sans cette continuité,
 *  découper le même temps en paquets différents produirait des descentes
 *  différentes, et le test « N paquets valent un gros paquet » serait faux. */
function reopen(meta: MetaState, session: FarmSession, seed: number): void {
  session.run = startRun(meta, meta.bestChapter, session.run ? session.run.rngState : seed);
  session.chapter = meta.bestChapter;
}

/**
 * Fait avancer le farm de `seconds` de jeu et applique au méta ce qu'il produit.
 *
 * **Le farm s'arrête salle 9.** Dès que la descente atteint la salle du boss,
 * elle est abandonnée et une autre s'ouvre. `applyRunReward` ne fait monter
 * `bestChapter` que sur `reward.boss` : un farm qui ne bat jamais de boss ne
 * peut pas déclencher ce `Math.max`, quoi qu'il arrive. Le critère du jalon —
 * « l'AUTO ne franchit jamais une salle non validée » — cesse d'être une
 * convention à tenir pour devenir une propriété du code.
 *
 * La règle vit ICI et non dans `tick()` : le jeu piloté garde son boss.
 */
export function farm(
  meta: MetaState,
  session: FarmSession,
  seconds: number,
  seed: number,
): FarmReport {
  const report = emptyReport(meta.bestChapter);
  if (meta.bestChapter < 1 || !(seconds > 0)) return report;

  const available = session.carry + seconds;
  // `+ 1e-9` : 0,1 n'a pas de représentation binaire exacte, donc `carry`
  // dérive de quelques 1e-16 à chaque paquet. Après assez d'appels, cette
  // dérive fait tomber `available / TICK_S` juste sous un entier (1,9999… au
  // lieu de 2) et `Math.floor` tronque un tick pourtant dû — perte réelle,
  // mesurée sur 100 paquets de 0,15 s. L'epsilon absorbe cette dérive sans
  // toucher aux vrais restes de fraction, plus grands de plusieurs ordres de
  // grandeur.
  const ticks = Math.floor(available / TICK_S + 1e-9);
  session.carry = available - ticks * TICK_S;
  if (ticks === 0) return report;
  report.seconds = ticks * TICK_S;

  if (session.run === null || session.chapter !== meta.bestChapter) {
    reopen(meta, session, seed);
  }

  for (let i = 0; i < ticks; i++) {
    const run = session.run!;
    const reward = tick(run, { steer: steerWithTerrain(run) });
    if (reward) {
      applyRunReward(meta, reward);
      report.credits += reward.credits;
      report.gems += reward.gems;
      for (const kind of reward.chests) report.chests[kind]++;
      report.salles++;
      // Les pièces prennent effet dans la seconde, comme en jeu piloté.
      syncRunStats(run, meta);
    }
    // Salle du boss atteinte, ou descente close : on en ouvre une autre.
    if (run.salle >= SALLES_PER_CHAPTER || run.phase !== 'fighting') {
      reopen(meta, session, seed);
    }
  }
  return report;
}

/**
 * Secondes de JEU à simuler pour une absence donnée. Le taux s'applique au
 * temps, jamais aux gains : un seul chiffre gouverne crédits, gemmes et coffres
 * à la fois, sans règle d'arrondi à inventer pour chacun.
 *
 * Le plafond porte sur l'ABSENCE, pas sur le temps simulé — 4 h d'absence à
 * 20 % valent 48 min de jeu, et une absence de trois jours vaut la même chose,
 * bonus de retour en plus.
 *
 * Une absence négative (horloge système reculée) vaut zéro plutôt qu'un gain
 * négatif : le méta est écrit par une couche qu'on ne contrôle pas.
 */
export function offlineSeconds(absenceSeconds: number): number {
  if (!(absenceSeconds >= OFFLINE.minSeconds)) return 0;
  const capped = Math.min(absenceSeconds, OFFLINE.capHours * 3600);
  const bonus = absenceSeconds >= OFFLINE.winbackAfterHours * 3600 ? OFFLINE.winbackMult : 1;
  return capped * OFFLINE.rate * bonus;
}
