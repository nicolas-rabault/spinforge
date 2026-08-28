import { formatCredits } from './format';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import { syncRunStats } from '../sim/sim';
import { rankLabel, type Slot } from '../sim/piece';
import { modelById } from '../content/pieces';
import { talentsOf, TALENT_LABELS } from '../sim/talents';
import { MODELS_PROFILE } from '../sim/config';
import { AXIS_ORDER, axisLine, isGain } from './profileAxes';
import { InventoryPanel } from './InventoryPanel';
import type { MetaState, RunState, Stats } from '../sim/types';

interface SlotRow {
  key: Slot;
  label: string;
  stat: string;
  read: (s: Stats) => number;
}

const SLOTS: SlotRow[] = [
  { key: 'lame', label: 'Lame', stat: 'Attaque', read: (s) => s.attack },
  { key: 'disque', label: 'Disque', stat: 'Défense', read: (s) => s.defense },
  { key: 'pointe', label: 'Pointe', stat: 'Vitesse', read: (s) => s.maxSpeed },
  { key: 'noyau', label: 'Noyau', stat: 'Spin max', read: (s) => s.spinMax },
];

export function ForgeScreen({
  metaRef, runRef, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  onChanged: () => void;
}) {
  const meta = metaRef.current;
  // La Forge chiffre la toupie sur laquelle l'achat va porter : celle de l'arène
  // tant que le run vit, celle qui attend une fois la descente perdue — `resetRun`
  // la montera au clic sur « Retenter », et c'est là qu'on fait ses courses.
  const toupie = runRef.current.phase === 'dead'
    ? metaRef.current.toupies.active
    : runRef.current.toupie;
  const before = playerStats(meta, toupie);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Ta toupie
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        Le combat est en pause pendant que tu améliores.
      </p>
      {SLOTS.map((row) => {
        const piece = meta.equipped[row.key];
        const cost = upgradeCost(piece.level);
        const after = row.read(
          playerStats({ ...meta, equipped: { ...meta.equipped, [row.key]: { ...piece, level: piece.level + 1 } } }, toupie),
        );
        const affordable = meta.credits >= cost;
        const talents = talentsOf(row.key, piece.rank);
        // Lames et Noyaux n'ont pas de profil (`MODELS_PROFILE` ne les liste pas) :
        // leur différenciation passe par le talent signature, pas par ces sept axes.
        const modelProfile = MODELS_PROFILE[piece.model] ?? {};
        const axes = AXIS_ORDER.filter((a) => modelProfile[a] !== undefined);
        return (
          <button
            key={row.key}
            disabled={!affordable}
            onClick={() => {
              if (tryUpgrade(metaRef.current, row.key)) {
                syncRunStats(runRef.current, metaRef.current);
                onChanged();
              }
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
                {row.label} <span style={{ color: 'var(--muted)' }}>niv. {piece.level}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {modelById(piece.model).label} · {rankLabel(piece.rank)}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {row.stat} {row.read(before).toFixed(0)} → {after.toFixed(0)}
              </span>
              {axes.map((a) => (
                <span
                  key={a}
                  style={{ fontSize: 11.5, color: isGain(a, modelProfile[a]!) ? 'var(--ember)' : 'var(--muted)' }}
                >
                  {axisLine(a, modelProfile[a]!)}
                </span>
              ))}
              {talents.length > 0 ? (
                <span style={{ fontSize: 12.5, color: 'var(--ember)' }}>
                  {talents.map((id) => TALENT_LABELS[id]).join(' · ')}
                </span>
              ) : null}
            </span>
            <span style={{ font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCredits(cost)}
            </span>
          </button>
        );
      })}

      <InventoryPanel
        metaRef={metaRef}
        onChanged={() => { syncRunStats(runRef.current, metaRef.current); onChanged(); }}
      />
    </div>
  );
}
