import { formatCredits, t, type MessageKey } from '../i18n';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import { syncRunStats } from '../sim/sim';
import type { Slot } from '../sim/piece';
import { resolveProfile, type ProfileAxis } from '../sim/profile';
import { modelLabel } from './contentLabels';
import { talentsOf } from '../sim/talents';
import { talentLabel } from './talentLabels';
import { axisAbbr } from './profileAxes';
import { playerArt } from '../art/toupie';
import { rankTier } from '../theme';
import { PieceIcon } from './art/PieceIcon';
import { ToupiePortrait } from './art/ToupiePortrait';
import { StatRadar } from './art/StatRadar';
import { InventoryPanel } from './InventoryPanel';
import type { MetaState, RunState, Stats } from '../sim/types';

interface SlotRow {
  key: Slot;
  label: MessageKey;
  /** Stat portée par l'emplacement. Son abrégé vient de `axisAbbr`, comme celui
   *  du radar (`StatRadar`) : le joueur n'apprend qu'un vocabulaire, pas deux. */
  axis: ProfileAxis;
  read: (s: Stats) => number;
}

/** Des clés et non des chaînes : une table de libellés construite au chargement
 *  du module resterait figée dans la langue du démarrage. */
const SLOTS: SlotRow[] = [
  { key: 'lame', label: 'slot.lame', axis: 'attack', read: (s) => s.attack },
  { key: 'disque', label: 'slot.disque', axis: 'defense', read: (s) => s.defense },
  { key: 'pointe', label: 'slot.pointe', axis: 'maxSpeed', read: (s) => s.maxSpeed },
  { key: 'noyau', label: 'slot.noyau', axis: 'spinMax', read: (s) => s.spinMax },
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
  const talents = SLOTS.flatMap((row) => talentsOf(row.key, meta.equipped[row.key].rank));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      {/* La toupie montée en grand, et la forme de son profil à côté. Les deux
          changent à chaque pièce équipée : c'est ce qui rend la Forge lisible
          sans lire une seule ligne. */}
      <section
        style={{
          border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
          padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 6,
        }}
      >
        <ToupiePortrait art={playerArt(meta.equipped, toupie)} size={148} />
        <StatRadar values={resolveProfile(meta, toupie)} size={146} />
      </section>

      {talents.length > 0 ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {talents.map((id) => (
            <span
              key={id}
              style={{
                padding: '3px 9px', borderRadius: 999, fontSize: 12,
                border: '1px solid var(--ember)', color: 'var(--ember)',
                fontFamily: 'Oswald, ui-sans-serif, sans-serif',
              }}
            >
              {talentLabel(id)}
            </span>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SLOTS.map((row) => {
          const piece = meta.equipped[row.key];
          const cost = upgradeCost(piece.level);
          const after = row.read(
            playerStats({ ...meta, equipped: { ...meta.equipped, [row.key]: { ...piece, level: piece.level + 1 } } }, toupie),
          );
          const affordable = meta.credits >= cost;
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
                textAlign: 'left', padding: 8, borderRadius: 11, cursor: affordable ? 'pointer' : 'default',
                border: '1px solid var(--line)', background: 'var(--panel)',
                color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.55,
                display: 'flex', gap: 9, alignItems: 'center',
              }}
            >
              <PieceIcon model={piece.model} rank={piece.rank} size={54} tile />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: '1 1 0' }}>
                <span style={{ font: '500 14px Oswald, ui-sans-serif, sans-serif' }}>
                  {t(row.label)}{' '}
                  <span style={{ color: 'var(--muted)' }}>{t('forge.level', { n: piece.level })}</span>
                </span>
                <span style={{ fontSize: 11, color: `var(--rank-${rankTier(piece.rank)})`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {modelLabel(piece.model)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {axisAbbr(row.axis)} {formatCredits(row.read(before))} → <span style={{ color: 'var(--text)' }}>{formatCredits(after)}</span>
                </span>
                <span style={{ font: '600 13px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCredits(cost)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <InventoryPanel
        metaRef={metaRef}
        onChanged={() => { syncRunStats(runRef.current, metaRef.current); onChanged(); }}
      />
    </div>
  );
}
