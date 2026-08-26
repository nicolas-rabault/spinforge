import { useEffect, useState } from 'react';
import { canOpen, chestPrice, openChest } from '../sim/chest';
import { addPiece } from '../sim/meta';
import { rankLabel, type PieceInstance } from '../sim/piece';
import { modelById } from '../content/pieces';
import { CHESTS } from '../sim/config';
import { formatCredits } from './format';
import { rankColor } from './rank';
import type { ChestKind, MetaState } from '../sim/types';

const CHEST_LIST: { kind: ChestKind; name: string; blurb: string }[] = [
  { kind: 'bronze', name: 'Coffre Bronze', blurb: 'Disques et Pointes, du Commun au Rare.' },
  { kind: 'arene', name: "Coffre d'Arène", blurb: 'Les quatre emplacements, du Bon à l’Excellent.' },
  { kind: 'mythique', name: 'Coffre Mythique', blurb: 'Les quatre emplacements, de l’Excellent à la Légende.' },
];

const REVEAL_MS = 90;

export function ChestScreen({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [pulls, setPulls] = useState<PieceInstance[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const meta = metaRef.current;

  // Révélation en léger décalage : les pièces apparaissent l'une après l'autre.
  useEffect(() => {
    if (pulls === null || revealed >= pulls.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), REVEAL_MS);
    return () => clearTimeout(id);
  }, [pulls, revealed]);

  const open = (kind: ChestKind, count: 1 | 10) => {
    const drawn = openChest(metaRef.current, kind, count);
    if (!drawn) return;
    for (const piece of drawn) addPiece(metaRef.current, piece);
    setPulls(drawn);
    setRevealed(0);
    onChanged();
  };

  if (pulls !== null) {
    const best = pulls.reduce((m, p) => Math.max(m, p.rank), 0);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0 }}>
        <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
          {pulls.length === 1 ? 'Ton tirage' : `Tes ${pulls.length} tirages`}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
          {pulls.slice(0, revealed).map((piece, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                border: `1px solid ${piece.rank >= 7 ? rankColor(piece.rank) : 'var(--line)'}`,
                background: 'var(--panel)', borderRadius: 10, padding: '9px 12px',
              }}
            >
              <span style={{ font: '500 15px Oswald, ui-sans-serif, sans-serif' }}>
                {modelById(piece.model).label}
              </span>
              <span style={{ fontSize: 12.5, color: rankColor(piece.rank), whiteSpace: 'nowrap' }}>
                {rankLabel(piece.rank)}
              </span>
            </div>
          ))}
        </div>
        {revealed >= pulls.length ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
            Meilleur rang obtenu : <span style={{ color: rankColor(best) }}>{rankLabel(best)}</span>. Tout est rangé dans ton inventaire, onglet Forge.
          </p>
        ) : null}
        <button
          onClick={() => { setPulls(null); setRevealed(0); }}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Coffres
      </h2>
      {CHEST_LIST.map(({ kind, name, blurb }) => {
        const def = CHESTS[kind];
        const unit = chestPrice(kind, 1);
        const ten = chestPrice(kind, 10);
        const label = unit.currency === 'credits' ? 'crédits' : 'gemmes';
        return (
          <section
            key={kind}
            style={{
              border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div>
              <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{name}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>{blurb}</p>
              {def.pityThreshold > 0 ? (
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  {rankLabel(def.pityRank)} garanti dans{' '}
                  <span style={{ color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
                    {def.pityThreshold - meta.pity[kind]}
                  </span>{' '}
                  tirage{def.pityThreshold - meta.pity[kind] > 1 ? 's' : ''}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {([1, 10] as const).map((count) => {
                const price = count === 1 ? unit : ten;
                const affordable = canOpen(meta, kind, count);
                return (
                  <button
                    key={count}
                    disabled={!affordable}
                    onClick={() => open(kind, count)}
                    style={{
                      flex: '1 1 0', minHeight: 46, borderRadius: 10, cursor: affordable ? 'pointer' : 'default',
                      border: '1px solid var(--line)', background: 'var(--bg)',
                      color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.5,
                      font: '500 13px Oswald, ui-sans-serif, sans-serif',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    }}
                  >
                    <span>Ouvrir ×{count}</span>
                    <span style={{ fontSize: 11.5, color: affordable ? 'var(--ember)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCredits(price.amount)} {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
