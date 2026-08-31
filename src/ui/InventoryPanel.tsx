import { useState } from 'react';
import { equipFromStack } from '../sim/meta';
import { canFuse, fusionRecipe, tryFuse } from '../sim/fusion';
import type { Slot } from '../sim/piece';
import { modelById } from '../content/pieces';
import { t, tn, type MessageKey } from '../i18n';
import { modelLabel } from './contentLabels';
import { MODELS_PROFILE } from '../sim/config';
import { AXIS_ORDER, axisLine, isGain } from './profileAxes';
import { rankColor, rankLabel } from './rank';
import type { MetaState } from '../sim/types';

/** Les pluriels du filtre, distincts des `slot.*` singuliers de la Forge. */
const SLOT_FILTERS: { key: Slot | 'tous'; label: MessageKey }[] = [
  { key: 'tous', label: 'filter.all' },
  { key: 'lame', label: 'filter.lame' },
  { key: 'disque', label: 'filter.disque' },
  { key: 'pointe', label: 'filter.pointe' },
  { key: 'noyau', label: 'filter.noyau' },
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
        {t('inventory.title')}
      </h2>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {SLOT_FILTERS.map(({ key, label }) => (
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
            {t(label)}
          </button>
        ))}
      </div>

      {stacks.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          {t('inventory.empty')}
        </p>
      ) : null}

      {stacks.map((stack) => {
        const recipe = fusionRecipe(stack.rank);
        const fusable = canFuse(meta, stack.model, stack.rank);
        // Lames et Noyaux n'ont pas de profil : `MODELS_PROFILE` ne les liste pas,
        // `axes` reste vide et rien n'est affiché — cohérent, pas trompeur.
        const modelProfile = MODELS_PROFILE[stack.model] ?? {};
        const axes = AXIS_ORDER.filter((a) => modelProfile[a] !== undefined);
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
                {modelLabel(stack.model)}{' '}
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>×{stack.levels.length}</span>
              </span>
              <span style={{ fontSize: 12.5, color: rankColor(stack.rank), whiteSpace: 'nowrap' }}>
                {rankLabel(stack.rank)}
              </span>
            </div>
            {axes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {axes.map((a) => (
                  <span
                    key={a}
                    style={{ fontSize: 11.5, color: isGain(a, modelProfile[a]!) ? 'var(--ember)' : 'var(--muted)' }}
                  >
                    {axisLine(a, modelProfile[a]!)}
                  </span>
                ))}
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                onClick={() => { if (equipFromStack(metaRef.current, stack.model, stack.rank)) onChanged(); }}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: 'pointer',
                  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)',
                  font: '500 13px Oswald, ui-sans-serif, sans-serif',
                }}
              >
                {t('action.equip')}
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
                <span>{t('inventory.fuse')}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {t('inventory.recipe.identical', { n: recipe.identical })}
                  {recipe.sacrifice > 0 ? tn('inventory.recipe.sacrifice', recipe.sacrifice) : ''}
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
