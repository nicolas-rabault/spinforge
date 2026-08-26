import { useState } from 'react';
import { equipFromStack } from '../sim/meta';
import { canFuse, fusionRecipe, tryFuse } from '../sim/fusion';
import { rankLabel, type Slot } from '../sim/piece';
import { modelById } from '../content/pieces';
import { rankColor } from './rank';
import type { MetaState } from '../sim/types';

const SLOT_LABELS: { key: Slot | 'tous'; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'lame', label: 'Lames' },
  { key: 'disque', label: 'Disques' },
  { key: 'pointe', label: 'Pointes' },
  { key: 'noyau', label: 'Noyaux' },
];

export function InventoryPanel({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Slot | 'tous'>('tous');
  const meta = metaRef.current;

  const stacks = meta.inventory
    .filter((s) => filter === 'tous' || modelById(s.model).slot === filter)
    // Rang décroissant puis modèle : les meilleures trouvailles en tête.
    .sort((a, b) => b.rank - a.rank || a.model.localeCompare(b.model));

  return (
    <>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: '6px 0 0', letterSpacing: '.02em' }}>
        Inventaire
      </h2>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {SLOT_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              minHeight: 32, padding: '0 11px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${filter === key ? 'var(--ember)' : 'var(--line)'}`,
              background: filter === key ? 'var(--ember)' : 'var(--panel)',
              color: filter === key ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12.5, fontFamily: 'Oswald, ui-sans-serif, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {stacks.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Rien ici pour l'instant. Ouvre un coffre pour trouver des pièces.
        </p>
      ) : null}

      {stacks.map((stack) => {
        const model = modelById(stack.model);
        const recipe = fusionRecipe(stack.rank);
        const fusable = canFuse(meta, stack.model, stack.rank);
        return (
          <div
            key={`${stack.model}:${stack.rank}`}
            style={{
              border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
              padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 7,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span style={{ font: '500 16px Oswald, ui-sans-serif, sans-serif' }}>
                {model.label}{' '}
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>×{stack.levels.length}</span>
              </span>
              <span style={{ fontSize: 12.5, color: rankColor(stack.rank), whiteSpace: 'nowrap' }}>
                {rankLabel(stack.rank)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                onClick={() => { if (equipFromStack(metaRef.current, stack.model, stack.rank)) onChanged(); }}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: 'pointer',
                  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)',
                  font: '500 13px Oswald, ui-sans-serif, sans-serif',
                }}
              >
                Équiper
              </button>
              <button
                disabled={!fusable}
                onClick={() => { if (tryFuse(metaRef.current, stack.model, stack.rank)) onChanged(); }}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: fusable ? 'pointer' : 'default',
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  color: fusable ? 'var(--text)' : 'var(--muted)', opacity: fusable ? 1 : 0.5,
                  font: '500 13px Oswald, ui-sans-serif, sans-serif',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}
              >
                <span>Fusionner</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {recipe.identical} identiques{recipe.sacrifice > 0 ? ` + ${recipe.sacrifice} sacrifice${recipe.sacrifice > 1 ? 's' : ''}` : ''}
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
