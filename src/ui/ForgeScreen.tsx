import { formatCredits } from './format';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import type { PieceLevels, SimState } from '../sim/types';

interface Piece {
  key: keyof PieceLevels;
  label: string;
  stat: string;
  read: (p: PieceLevels) => number;
  digits: number;
}

const PIECES: Piece[] = [
  { key: 'lame', label: 'Lame', stat: 'Attaque', read: (p) => playerStats(p).attack, digits: 0 },
  { key: 'disque', label: 'Disque', stat: 'Défense', read: (p) => playerStats(p).defense, digits: 0 },
  { key: 'pointe', label: 'Pointe', stat: 'Vitesse', read: (p) => playerStats(p).maxSpeed, digits: 0 },
  { key: 'noyau', label: 'Noyau', stat: 'Spin max', read: (p) => playerStats(p).spinMax, digits: 0 },
];

export function ForgeScreen({ stateRef, onChanged }: { stateRef: { current: SimState }; onChanged: () => void }) {
  const s = stateRef.current;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Forge
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        Le combat est en pause pendant que tu améliores.
      </p>
      {PIECES.map((piece) => {
        const level = s.pieces[piece.key];
        const cost = upgradeCost(level);
        const before = piece.read(s.pieces);
        const after = piece.read({ ...s.pieces, [piece.key]: level + 1 });
        const affordable = s.credits >= cost;
        return (
          <button
            key={piece.key}
            disabled={!affordable}
            onClick={() => {
              tryUpgrade(stateRef.current, piece.key);
              onChanged();
            }}
            style={{
              minHeight: 64, textAlign: 'left', padding: '10px 14px', borderRadius: 11, cursor: affordable ? 'pointer' : 'default',
              border: '1px solid var(--line)', background: 'var(--panel)',
              color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.55,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>
                {piece.label} <span style={{ color: 'var(--muted)' }}>niv. {level}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {piece.stat} {before.toFixed(piece.digits)} → {after.toFixed(piece.digits)}
              </span>
            </span>
            <span style={{ font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCredits(cost)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
