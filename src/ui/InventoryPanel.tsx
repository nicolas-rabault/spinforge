import { useState } from 'react';
import { audio } from '../audio/audio';
import { equipFromStack } from '../sim/meta';
import { canFuse, fusionProgress, tryFuse } from '../sim/fusion';
import type { Slot } from '../sim/piece';
// `modelById` sert encore au filtre par emplacement : c'est une donnée du
// catalogue, pas du texte.
import { modelById } from '../content/pieces';
import { rankLabel } from './rank';
import { modelLabel } from './contentLabels';
import { t, tn, type MessageKey } from '../i18n';
import { MODELS_PROFILE } from '../sim/config';
import { SLOT_EMBLEM } from '../art/recipes';
import { rankTier } from '../theme';
import { AXIS_ORDER, axisLine, isGain } from './profileAxes';
import { PieceIcon } from './art/PieceIcon';
import { StatRadar } from './art/StatRadar';
import type { MetaState } from '../sim/types';

const SLOTS: Slot[] = ['lame', 'disque', 'pointe', 'noyau'];
/** Pluriels du filtre, distincts des `slot.*` singuliers de la Forge. */
const SLOT_NAMES: Record<Slot, MessageKey> = {
  lame: 'filter.lame', disque: 'filter.disque', pointe: 'filter.pointe', noyau: 'filter.noyau',
};

interface Selection {
  model: string;
  rank: number;
}

/** Les pastilles d'une recette de fusion : remplies pour ce qu'on a, vides pour
 *  ce qu'il manque. « 2 identiques + 1 sacrifice » demandait de compter soi-même
 *  ses doublons pour savoir si le bouton allait marcher. */
function RecipeDots({ have, need, color }: { have: number; need: number; color: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: need }, (_, i) => (
        <span
          key={i}
          style={{
            width: 9, height: 9, borderRadius: '50%',
            border: `1.5px solid ${color}`,
            background: i < have ? color : 'transparent',
          }}
        />
      ))}
    </span>
  );
}

export function InventoryPanel({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Slot | 'tous'>('tous');
  const [selected, setSelected] = useState<Selection | null>(null);
  const meta = metaRef.current;

  const stacks = meta.inventory
    .filter((s) => filter === 'tous' || modelById(s.model).slot === filter)
    // Rang décroissant puis modèle : les meilleures trouvailles en tête.
    .sort((a, b) => b.rank - a.rank || a.model.localeCompare(b.model));

  const stack = selected
    ? meta.inventory.find((s) => s.model === selected.model && s.rank === selected.rank)
    : undefined;
  // La pile disparaît de l'inventaire dès qu'on l'équipe ou qu'on la fusionne :
  // la fiche se referme d'elle-même plutôt que d'afficher un objet qui n'est plus là.
  if (selected && !stack) setSelected(null);

  const act = (
    fn: (m: MetaState, model: string, rank: number) => boolean,
    sound: () => void,
  ) => {
    if (!selected) return;
    if (fn(metaRef.current, selected.model, selected.rank)) {
      // Après le succès seulement : une fusion refusée faute de doublons ne doit
      // pas sonner comme une fusion réussie.
      sound();
      setSelected(null);
      onChanged();
    }
  };

  return (
    <>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: '6px 0 0', letterSpacing: '.02em' }}>
        {t('inventory.title')}
      </h2>

      {/* Les filtres portent l'emblème de leur emplacement : on vise la forme,
          pas le mot. « Tous » reste écrit — il n'a pas de forme. */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setFilter('tous')}
          style={{
            minHeight: 40, padding: '0 12px', borderRadius: 9, cursor: 'pointer',
            border: `1px solid ${filter === 'tous' ? 'var(--ember)' : 'var(--line)'}`,
            background: filter === 'tous' ? 'var(--ember)' : 'var(--panel)',
            color: filter === 'tous' ? 'var(--ink)' : 'var(--muted)',
            fontSize: 12.5, fontFamily: 'Oswald, ui-sans-serif, sans-serif',
          }}
        >
          {t('filter.all')}
        </button>
        {SLOTS.map((slot) => (
          <button
            key={slot}
            onClick={() => setFilter(slot)}
            aria-label={t(SLOT_NAMES[slot])}
            style={{
              flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${filter === slot ? 'var(--ember)' : 'var(--line)'}`,
              background: filter === slot ? 'rgba(255,194,74,.14)' : 'var(--panel)',
              opacity: filter === slot || filter === 'tous' ? 1 : 0.5,
            }}
          >
            <PieceIcon model={SLOT_EMBLEM[slot]} rank={1} size={26} />
          </button>
        ))}
      </div>

      {stacks.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          {t('inventory.empty')}
        </p>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {stacks.map((s) => {
          const fusable = canFuse(meta, s.model, s.rank);
          return (
            <button
              key={`${s.model}:${s.rank}`}
              onClick={() => setSelected({ model: s.model, rank: s.rank })}
              aria-label={tn('inventory.copies', s.levels.length, {
                name: modelLabel(s.model), rank: rankLabel(s.rank),
              })}
              style={{
                position: 'relative', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                display: 'flex', justifyContent: 'center',
              }}
            >
              <PieceIcon model={s.model} rank={s.rank} size={76} tile />
              {s.levels.length > 1 ? (
                <span
                  style={{
                    position: 'absolute', bottom: 2, right: 4, minWidth: 18, height: 18, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                    background: 'rgba(8,11,16,.9)', border: '1px solid var(--line)',
                    color: 'var(--text)', fontSize: 11, fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ×{s.levels.length}
                </span>
              ) : null}
              {/* Une pile fusionnable respire. C'était la seule information de
                  l'inventaire qu'il fallait calculer soi-même pour la connaître. */}
              {fusable ? (
                <span
                  className="sf-breathe"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 12,
                    border: '2px solid var(--zoneBoost)', pointerEvents: 'none',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {stack ? (
        <PieceSheet
          meta={meta}
          model={stack.model}
          rank={stack.rank}
          count={stack.levels.length}
          onClose={() => setSelected(null)}
          onEquip={() => act(equipFromStack, () => audio.equip())}
          onFuse={() => act(tryFuse, () => audio.fuse())}
        />
      ) : null}
    </>
  );
}

function PieceSheet({
  meta, model, rank, count, onClose, onEquip, onFuse,
}: {
  meta: MetaState;
  model: string;
  rank: number;
  count: number;
  onClose: () => void;
  onEquip: () => void;
  onFuse: () => void;
}) {
  const profile = MODELS_PROFILE[model] ?? {};
  const axes = AXIS_ORDER.filter((a) => profile[a] !== undefined);
  const progress = fusionProgress(meta, model, rank);
  const fusable = canFuse(meta, model, rank);
  const tier = rankTier(rank);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(4,6,10,.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, boxSizing: 'border-box',
          background: 'var(--panel)', borderTop: `2px solid var(--rank-${tier})`,
          borderRadius: '14px 14px 0 0', padding: '14px 16px 18px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <PieceIcon model={model} rank={rank} size={92} tile />
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <p style={{ margin: 0, font: '500 19px Oswald, ui-sans-serif, sans-serif' }}>
              {modelLabel(model)}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: `var(--rank-${tier})` }}>
              {rankLabel(rank)} <span style={{ color: 'var(--muted)' }}>· ×{count}</span>
            </p>
          </div>
          {axes.length > 0 ? <StatRadar values={profile} size={86} labels={false} /> : null}
        </div>

        {axes.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
            {axes.map((a) => (
              <span key={a} style={{ fontSize: 11.5, color: isGain(a, profile[a]!) ? 'var(--ember)' : 'var(--muted)' }}>
                {axisLine(a, profile[a]!)}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onEquip}
            style={{
              flex: '1 1 0', minHeight: 46, borderRadius: 10, cursor: 'pointer',
              border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)',
              font: '500 14px Oswald, ui-sans-serif, sans-serif',
            }}
          >
            {t('action.equip')}
          </button>
          <button
            disabled={!fusable}
            onClick={onFuse}
            data-sfx="fuse"
            style={{
              flex: '1 1 0', minHeight: 46, borderRadius: 10, cursor: fusable ? 'pointer' : 'default',
              border: `1px solid ${fusable ? 'var(--zoneBoost)' : 'var(--line)'}`,
              background: fusable ? 'rgba(108,242,192,.12)' : 'var(--bg)',
              color: fusable ? 'var(--text)' : 'var(--muted)', opacity: fusable ? 1 : 0.6,
              font: '500 14px Oswald, ui-sans-serif, sans-serif',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}
          >
            <span>{t('inventory.fuse')}</span>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <RecipeDots
                have={progress.identical.have} need={progress.identical.need}
                color={fusable ? 'var(--zoneBoost)' : 'var(--muted)'}
              />
              {progress.sacrifice.need > 0 ? (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>+</span>
                  <RecipeDots
                    have={progress.sacrifice.have} need={progress.sacrifice.need}
                    color={fusable ? 'var(--muted)' : 'var(--line)'}
                  />
                </>
              ) : null}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
