import { useEffect, useRef, useState } from 'react';
import { maxPlayableChapter, startRun } from '../sim/sim';
import { farm, newFarmSession } from '../sim/farm';
import { OFFLINE, SALLES_PER_CHAPTER } from '../sim/config';
import { attention, shoppingToupie } from './attention';
import { flushSave, installFlushOnHide, loadMeta, scheduleSave } from '../storage/localSave';
import { audio } from '../audio/audio';
import { intensityFor } from '../audio/music';
import { formatCredits, getLang, setLang, t } from '../i18n';
import { AudioSettings } from './AudioSettings';
import { CombatScreen } from './CombatScreen';
import { ForgeScreen } from './ForgeScreen';
import { ChestScreen } from './ChestScreen';
import { ToupiesScreen } from './ToupiesScreen';
import { TabBar, type Tab } from './TabBar';

export function App() {
  const [loaded] = useState(() => loadMeta());
  const metaRef = useRef(loaded.meta);
  // `useState(() => …)` et non `useRef(startRun(…))` : l'argument d'un useRef est
  // réévalué à chaque rendu, or App se re-rend à chaque tick — startRun tournerait
  // une dizaine de fois par seconde, et muterait le méta le jour où il y touchera.
  // La graine du run est dérivée de celle du méta : prises dans la même milliseconde,
  // les deux seraient identiques, et le premier tirage de coffre reproduirait
  // exactement le premier angle de spawn. Deux flux séparés doivent l'être vraiment.
  // Le joueur reprend là où il poussait : son chapitre le plus haut. Il en change
  // entre deux descentes, dans le panneau de l'écran de combat.
  //
  // Sauf si aucun chapitre n'est encore validé (voir `playing` plus bas) : le run
  // affiché au montage démarre alors en DÉCOR, sur `bestChapter` et non sur
  // `maxPlayableChapter` — sinon le tout premier décor jouerait un instant le
  // chapitre non validé, avant de se corriger de lui-même à sa première salle
  // du boss (`handleRunTick`, plus bas).
  const [initialRun] = useState(() => startRun(
    loaded.meta,
    loaded.meta.bestChapter === 0 ? maxPlayableChapter(loaded.meta) : loaded.meta.bestChapter,
    (Date.now() ^ 0x9e3779b9) >>> 0,
  ));
  const runRef = useRef(initialRun);

  // Deux états, une seule bascule : lancer une descente (bouton « Nouvelle
  // descente » de CombatScreen) entre en partie pilotée ; quitter l'onglet
  // Combat une fois la descente close en sort (voir l'effet plus bas — le
  // voile de fin de descente doit rester atteignable tant qu'on y reste).
  // Hors partie, la descente affichée tourne en DÉCOR : `handleRunTick`
  // plus bas l'empêche d'atteindre la salle du boss, et elle ne crédite
  // rien (voir `combatMeta` plus bas) — la vraie monnaie vient de `farm`,
  // plus bas encore. Au tout premier lancement, aucun chapitre n'est
  // validé : le jeu démarre directement en partie pilotée, le décor n'ayant
  // rien à farmer.
  const [playing, setPlaying] = useState(() => loaded.meta.bestChapter === 0);

  // Méta jetable du décor, cloné une fois au montage — `useState(() => …)`
  // et non `useRef(structuredClone(…))`, pour la même raison qu'`initialRun`
  // ci-dessus : l'argument d'un `useRef` est réévalué à chaque rendu, et
  // `structuredClone` n'est pas gratuit. `useGameLoop` y applique les
  // récompenses du décor à travers `combatMeta` ci-dessous ; elles sont
  // jetées avec lui. Écart purement cosmétique : le décor ne verra pas les
  // améliorations achetées pendant qu'il tourne.
  const [decorMetaInit] = useState(() => structuredClone(loaded.meta));
  const decorMetaRef = useRef(decorMetaInit);

  // Méta donné à `CombatScreen` à la place de `metaRef` : le vrai méta en
  // partie pilotée, ou tant qu'aucun chapitre n'est validé (le décor n'existe
  // pas encore, R1 ci-dessus) ; celui du décor sinon. Une simple sélection
  // entre deux objets déjà stables (`metaRef`, `decorMetaRef` ne changent
  // jamais d'identité) : son résultat ne change donc, lui aussi, qu'à la
  // bascule elle-même — pas besoin de mémoïsation. `CombatScreen` se re-rend
  // à chaque tick, ce choix couvre donc tous ses usages (art équipé, liste
  // de chapitres du voile, « Nouvelle descente ») sans qu'il ait à savoir
  // qu'un décor existe.
  const combatMeta = playing || metaRef.current.bestChapter < 1 ? metaRef : decorMetaRef;

  // Le chapitre explicitement choisi par le joueur pour sa prochaine descente.
  // Remis à null à chaque descente lancée : la suggestion reprend alors la main
  // sans qu'aucun effet n'ait à la recalculer.
  const [pickedChapter, setPickedChapter] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('combat');
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((f) => f + 1);

  // Une seule porte pour « le méta a changé » : redessine et programme l'écriture.
  const metaChanged = () => {
    scheduleSave(metaRef.current);
    redraw();
  };

  useEffect(() => installFlushOnHide(), []);
  useEffect(() => () => flushSave(), []);

  // App se re-rend à chaque tick : l'effet ne se déclenche donc que quand l'un des
  // trois vrais paramètres change, et `setIntensity` ignore une valeur identique.
  const run = runRef.current;
  useEffect(() => {
    audio.setIntensity(intensityFor(tab === 'combat', run.salle, run.phase === 'dead'));
  }, [tab, run.salle, run.phase]);

  // Poussé dans `onTick` de CombatScreen : appelé à chaque tick de
  // simulation, piloté ou décor. `displayed.tick === 0` juste après
  // l'assignation d'un run tout neuf signale que le bouton « Nouvelle
  // descente » vient d'être cliqué — CombatScreen n'a pas d'autre canal
  // pour nous le dire, faute d'un callback dédié — et repasse en partie
  // pilotée. Sinon, en décor, la salle du boss ou une descente close
  // referme immédiatement le run AFFICHÉ par un nouveau `startRun` : la
  // même règle que `farm()` applique à sa propre session (voir farm.ts),
  // ici sur ce qu'on montre à l'écran plutôt que sur ce qu'on facture.
  const handleRunTick = () => {
    const displayed = runRef.current;
    if (displayed.tick === 0) {
      if (!playing) setPlaying(true);
    } else if (
      !playing && metaRef.current.bestChapter >= 1 &&
      (displayed.salle >= SALLES_PER_CHAPTER || displayed.phase !== 'fighting')
    ) {
      runRef.current = startRun(metaRef.current, metaRef.current.bestChapter, displayed.rngState);
    }
    redraw();
  };

  // Quitter l'onglet Combat une fois la descente close est le seul retour
  // au décor (R4d) : tant qu'on y reste, `playing` reste vrai pour que le
  // voile de fin de descente propose encore la prochaine descente.
  useEffect(() => {
    if (tab !== 'combat' && playing && runRef.current.phase !== 'fighting') setPlaying(false);
  }, [tab]);

  // Session persistante du farm, distincte du run affiché : c'est elle qui
  // paie, par paquets mesurés sur l'horloge réelle — jamais sur la cadence
  // du minuteur, ralentie par le navigateur quand l'onglet passe en
  // arrière-plan. La graine du premier run de la session est tirée une fois
  // au montage, un flux séparé de celui d'`initialRun` ci-dessus.
  const farmSessionRef = useRef(newFarmSession());
  const [farmSeed] = useState(() => (Date.now() ^ 0x2545f491) >>> 0);
  const lastPacketRef = useRef(0);

  // Le farm crédite dès que le joueur ne pilote pas une descente vivante
  // (R4c) : aussi pendant le voile de fin de descente (`playing` vrai,
  // `run.phase` clos), et sur tous les onglets hors combat.
  const farmActive = !(playing && run.phase === 'fighting');

  useEffect(() => {
    if (!farmActive || metaRef.current.bestChapter < 1) return;
    lastPacketRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - lastPacketRef.current) / 1000);
      lastPacketRef.current = now;
      const report = farm(metaRef.current, farmSessionRef.current, elapsed * OFFLINE.rate, farmSeed);
      if (report.salles > 0) metaChanged();
    }, 1000);
    return () => clearInterval(id);
  }, [farmActive]);

  const [soundOpen, setSoundOpen] = useState(false);
  const [sound, setSound] = useState(() => audio.settings());
  const soundOn = sound.music || sound.sfx;

  // Source unique de « le chapitre que la prochaine descente utilisera ». L'écran
  // de combat le propose et le change, celui des toupies en affiche la
  // composition : les deux doivent parler du même chapitre, y compris entre deux
  // descentes, où `run.chapter` est encore celui qu'on vient de quitter. Tant que
  // la descente court, `pickedChapter` est null et la suggestion vaut
  // `run.chapter` — le calcul se réduit alors au chapitre du run. La règle de
  // suggestion vit ici et nulle part ailleurs : le chapitre qui vient de s'ouvrir
  // après un boss vaincu, celui qu'on vient de perdre sinon. `run` est déjà lu
  // plus haut, pour l'intensité musicale.
  const chapterToPlay = pickedChapter ?? (run.phase === 'won'
    ? Math.min(run.chapter + 1, maxPlayableChapter(metaRef.current))
    : run.chapter);

  // `t()` lit un singleton de module, ce qui évite d'enfiler une locale à travers
  // `axisLine`, `rankLabel` et `formatCredits`. Ce `useState` n'existe que pour
  // redessiner : aucun `memo` dans l'arbre, un seul rendu de la racine repropage
  // partout — et le run en cours n'est pas interrompu.
  const [lang, setLangState] = useState(() => getLang());
  const toggleLang = () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    document.documentElement.lang = next;
    setLangState(next);
  };

  // En combat, l'arène occupe tout l'écran et le reste se pose dessus. Ailleurs,
  // la colonne ordinaire avec ses marges. C'est le seul endroit où la disposition
  // dépend de l'onglet — les écrans eux-mêmes n'en savent rien.
  const combat = tab === 'combat';
  const overlay = { position: 'absolute' as const, left: 0, right: 0, zIndex: 3 };

  // Recalculé à chaque rendu : le point rouge est dérivé de l'état, jamais
  // stocké. Le coût est une passe sur l'inventaire — l'arbre n'a de toute façon
  // aucun `memo`, il se repropage entier à chaque tick.
  const att = attention(metaRef.current, shoppingToupie(metaRef.current, runRef.current));

  return (
    <div
      onPointerDownCapture={(e) => {
        // Le contexte audio ne peut naître qu'au premier geste, et il doit naître
        // ICI : porté par `CombatScreen`, il laissait sans aucun son un joueur qui
        // démarre l'application sur l'onglet Coffres. Reste avant le filtre
        // ci-dessous : ce premier geste peut tomber sur un bouton grisé.
        audio.start();
        // Un seul écouteur plutôt que seize `onClick`, mais un bouton `disabled`
        // ne se tait pas tout seul : mesuré sur « Fusionner » désactivé, un clic
        // dont la cible est un enfant du bouton (un `<span>` d'icône) traverse
        // quand même jusqu'à la racine — seul l'élément visé directement est
        // supprimé. Sans ce garde, un bouton grisé confirmait une action qui
        // n'avait pas eu lieu.
        const button = (e.target as HTMLElement).closest('button');
        if (!button || button.disabled) return;
        const kind = button.dataset.sfx;
        audio.tap(kind === 'chest' || kind === 'fuse' || kind === 'upgrade' ? kind : 'tap');
      }}
      style={{
        height: '100%', boxSizing: 'border-box', maxWidth: 460, margin: '0 auto',
        position: 'relative', padding: combat ? 0 : '14px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: combat ? 0 : 10,
        background: 'var(--bg)', color: 'var(--text)', userSelect: 'none',
      }}
    >
      <header
        style={{
          display: 'flex', gap: 8, alignItems: 'center',
          ...(combat ? { ...overlay, top: 0, padding: '10px 12px 0', pointerEvents: 'none' } : {}),
        }}
      >
        <span
          style={{
            border: '1px solid var(--line)', background: 'rgba(19,25,34,.9)', borderRadius: 9,
            padding: '5px 11px', fontSize: 12.5,
          }}
        >
          {t('header.credits')}{' '}
          <span style={{ color: 'var(--ember)', fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {formatCredits(metaRef.current.credits)}
          </span>
        </span>
        <span
          style={{
            border: '1px solid var(--line)', background: 'rgba(19,25,34,.9)', borderRadius: 9,
            padding: '5px 11px', fontSize: 12.5,
          }}
        >
          {t('header.gems')}{' '}
          <span style={{ color: 'var(--player)', fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {formatCredits(metaRef.current.gems)}
          </span>
        </span>
        <button
          onClick={toggleLang}
          aria-label={t('header.switchLang')}
          style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            border: '1px solid var(--line)', background: 'rgba(19,25,34,.9)', color: 'var(--muted)',
            font: '600 12px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.04em',
            pointerEvents: 'auto',
          }}
        >
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button
          onClick={() => setSoundOpen((open) => !open)}
          aria-label={t('audio.settings')}
          style={{
            width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            border: '1px solid var(--line)', background: 'rgba(19,25,34,.9)', color: 'var(--muted)',
            fontSize: 15, pointerEvents: 'auto',
          }}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </header>

      {loaded.recovered ? (
        <p
          style={{
            margin: combat ? '52px 12px 0' : 0, fontSize: 12, color: 'var(--boss)',
            ...(combat ? { ...overlay, top: 0, background: 'rgba(6,8,12,.92)', borderRadius: 9, padding: 9 } : {}),
          }}
        >
          {t('save.recovered')}
        </p>
      ) : null}

      {/* L'écran de combat reste monté quand on passe en Forge : détruire l'app
          PixiJS à chaque changement d'onglet coûterait un rechargement complet
          des textures. On le masque, la boucle se met en pause. */}
      <div style={{ position: 'absolute', inset: 0, display: combat ? 'block' : 'none' }}>
        <CombatScreen runRef={runRef} metaRef={combatMeta} running={combat} piloted={playing} chapterToPlay={chapterToPlay} onPickChapter={setPickedChapter} onTick={handleRunTick} onMetaChanged={metaChanged} />
      </div>
      {tab === 'forge' ? (
        <ForgeScreen
          metaRef={metaRef} runRef={runRef} att={att}
          onGoToToupies={() => setTab('toupies')} onChanged={metaChanged}
        />
      ) : null}
      {tab === 'coffres' ? <ChestScreen metaRef={metaRef} onChanged={metaChanged} /> : null}
      {tab === 'toupies' ? <ToupiesScreen metaRef={metaRef} runRef={runRef} chapterToPlay={chapterToPlay} onChanged={metaChanged} /> : null}

      <TabBar tab={tab} onChange={setTab} att={att} floating={combat} />

      {soundOpen ? (
        <AudioSettings
          settings={sound}
          onChanged={() => setSound(audio.settings())}
          onClose={() => setSoundOpen(false)}
        />
      ) : null}
    </div>
  );
}
