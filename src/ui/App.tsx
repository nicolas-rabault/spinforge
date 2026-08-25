import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../sim/sim';
import { createAudio } from '../audio/audio';
import { formatCredits } from './format';
import { CombatScreen } from './CombatScreen';
import { ForgeScreen } from './ForgeScreen';
import { TabBar, type Tab } from './TabBar';

export function App() {
  const [initialState] = useState(() => createInitialState(Date.now() >>> 0));
  const stateRef = useRef(initialState);
  const [tab, setTab] = useState<Tab>('combat');
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((f) => f + 1);

  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  if (audioRef.current === null) audioRef.current = createAudio();
  const [muted, setMuted] = useState(() => audioRef.current!.isMuted());
  useEffect(() => () => audioRef.current?.destroy(), []);

  return (
    <div
      style={{
        height: '100vh', boxSizing: 'border-box', maxWidth: 460, margin: '0 auto', padding: '14px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
        background: 'var(--bg)', color: 'var(--text)', userSelect: 'none',
      }}
    >
      <header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 9,
            padding: '5px 11px', fontSize: 12.5,
          }}
        >
          Crédits{' '}
          <span style={{ color: 'var(--ember)', fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {formatCredits(stateRef.current.credits)}
          </span>
        </span>
        <button
          onClick={() => {
            const next = !muted;
            audioRef.current!.setMuted(next);
            setMuted(next);
          }}
          aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
          style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--muted)', fontSize: 15,
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      {/* L'écran de combat reste monté quand on passe en Forge : détruire l'app
          PixiJS à chaque changement d'onglet coûterait un rechargement complet
          des textures. On le masque, la boucle se met en pause. */}
      <div style={{ display: tab === 'combat' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0', minHeight: 0 }}>
        <CombatScreen stateRef={stateRef} running={tab === 'combat'} onTick={redraw} audio={audioRef.current} />
      </div>
      {tab === 'forge' ? <ForgeScreen stateRef={stateRef} onChanged={redraw} /> : null}

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
