import { useEffect, useRef, useState } from 'react';
import { createRun } from '../sim/sim';
import { pendingTotal } from '../sim/meta';
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
  // `useState(() => …)` et non `useRef(createRun(…))` : l'argument d'un useRef est
  // réévalué à chaque rendu, or App se re-rend à chaque tick — createRun tournerait
  // une dizaine de fois par seconde, et muterait le méta le jour où il y touchera.
  // La graine du run est dérivée de celle du méta : prises dans la même milliseconde,
  // les deux seraient identiques, et le premier tirage de coffre reproduirait
  // exactement le premier angle de spawn. Deux flux séparés doivent l'être vraiment.
  const [initialRun] = useState(() => createRun(loaded.meta, (Date.now() ^ 0x9e3779b9) >>> 0));
  const runRef = useRef(initialRun);
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

  const [soundOpen, setSoundOpen] = useState(false);
  const [sound, setSound] = useState(() => audio.settings());
  const soundOn = sound.music || sound.sfx;

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

  return (
    <div
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
        <CombatScreen runRef={runRef} metaRef={metaRef} running={tab === 'combat'} onTick={redraw} onMetaChanged={metaChanged} />
      </div>
      {tab === 'forge' ? <ForgeScreen metaRef={metaRef} runRef={runRef} onChanged={metaChanged} /> : null}
      {tab === 'coffres' ? <ChestScreen metaRef={metaRef} onChanged={metaChanged} /> : null}
      {tab === 'toupies' ? <ToupiesScreen metaRef={metaRef} runRef={runRef} onChanged={metaChanged} /> : null}

      <TabBar tab={tab} onChange={setTab} pending={pendingTotal(metaRef.current)} floating={combat} />

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
