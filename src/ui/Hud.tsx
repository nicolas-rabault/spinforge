import { formatCredits } from './format';
import { tryUpgrade, upgradeCost } from '../sim/economy';
import { resetRun } from '../sim/sim';
import { SALLES_PER_CHAPTER } from '../sim/config';
import type { PieceLevels, SimState } from '../sim/types';

const PIECES: { key: keyof PieceLevels; label: string }[] = [
  { key: 'lame', label: 'Lame' },
  { key: 'disque', label: 'Disque' },
  { key: 'pointe', label: 'Pointe' },
  { key: 'noyau', label: 'Noyau' },
];

export function Hud({ stateRef }: { stateRef: { current: SimState } }) {
  const s = stateRef.current;
  const spinPct = Math.max(0, Math.round((s.player.spin / s.player.spinMax) * 100));
  return (
    <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Crédits {formatCredits(s.credits)}</span>
        <span>
          Chapitre {s.chapter} · Salle {s.salle}/{SALLES_PER_CHAPTER}
          {s.salle === SALLES_PER_CHAPTER ? ' — BOSS' : ''}
        </span>
      </div>
      <div style={{ height: 8, background: '#232830' }}>
        <div style={{ width: `${spinPct}%`, height: '100%', background: '#46cede' }}></div>
      </div>
      {s.chapterValidated ? <div style={{ color: '#6fbf73' }}>Chapitre {s.chapter} validé</div> : null}
      {s.phase === 'dead' ? (
        <button style={{ minHeight: 44 }} onClick={() => resetRun(stateRef.current)}>
          Ta toupie s'est arrêtée — Retenter (crédits conservés)
        </button>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PIECES.map(({ key, label }) => {
          const cost = upgradeCost(s.pieces[key]);
          return (
            <button
              key={key}
              style={{ minHeight: 44 }}
              disabled={s.credits < cost}
              onClick={() => tryUpgrade(stateRef.current, key)}
            >
              {label} niv. {s.pieces[key]} — {formatCredits(cost)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
