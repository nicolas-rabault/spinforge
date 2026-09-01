import { formatCredits, t, type MessageKey } from '../i18n';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import { syncRunStats } from '../sim/sim';
import type { Slot } from '../sim/piece';
import { resolveProfile, type ProfileAxis } from '../sim/profile';
import { toupieById } from '../content/toupies';
import { modelLabel, toupieLabel } from './contentLabels';
import { typeLabel } from './typeLabels';
import { AlertDot } from './art/AlertDot';
import { shoppingToupie, type Attention } from './attention';
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
 *  du module resterait figée dans la langue du démarrage.
 *
 *  **L'ordre est celui du portrait**, pas celui du modèle de données :
 *  `drawToupiePortrait` pose la Lame en haut, le Noyau en façade au creux de la
 *  couronne, puis le Disque, puis la Pointe. Une grille 2×2 ne disait rien de
 *  cette géométrie ; la pile la rend lisible sans un mot. */
const SLOTS: SlotRow[] = [
  { key: 'lame', label: 'slot.lame', axis: 'attack', read: (s) => s.attack },
  { key: 'noyau', label: 'slot.noyau', axis: 'spinMax', read: (s) => s.spinMax },
  { key: 'disque', label: 'slot.disque', axis: 'defense', read: (s) => s.defense },
  { key: 'pointe', label: 'slot.pointe', axis: 'maxSpeed', read: (s) => s.maxSpeed },
];

/** Le gabarit commun aux cinq lignes. Elles doivent se lire comme une pile
 *  d'objets, pas comme cinq cartes voisines : même hauteur de vignette, même
 *  gouttière, même fond. */
const ROW = {
  position: 'relative' as const, textAlign: 'left' as const, padding: 8,
  borderRadius: 11, border: '1px solid var(--line)', background: 'var(--panel)',
  display: 'flex', gap: 10, alignItems: 'center', width: '100%',
  boxSizing: 'border-box' as const,
};

export function ForgeScreen({
  metaRef, runRef, att, onGoToToupies, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  /** Ce qui attend le joueur, calculé une fois par `App`. */
  att: Attention;
  /** La ligne Châssis mène à l'onglet Toupies. Un rappel, et non l'onglet
   *  lui-même : la Forge n'a pas à connaître la liste des onglets. */
  onGoToToupies: () => void;
  onChanged: () => void;
}) {
  const meta = metaRef.current;
  const toupie = shoppingToupie(meta, runRef.current);
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Le châssis n'est pas un cran de la pile : c'est la pièce qui porte
            toutes les autres, et la seule qui ne s'achète pas ici. Il ouvre la
            liste, sans colonne de prix, et mène là où on en change. */}
        <button onClick={onGoToToupies} aria-label={t('forge.changeToupie')} style={{ ...ROW, cursor: 'pointer', color: 'var(--text)' }}>
          <ToupiePortrait art={playerArt(meta.equipped, toupie)} size={54} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 0' }}>
            <span style={{ font: '500 14px Oswald, ui-sans-serif, sans-serif' }}>{t('slot.chassis')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toupieLabel(toupie)}
            </span>
          </span>
          <span
            style={{
              padding: '2px 9px', borderRadius: 999, fontSize: 11.5, whiteSpace: 'nowrap',
              border: `1px solid var(--type-${toupieById(toupie).type})`,
              color: `var(--type-${toupieById(toupie).type})`,
            }}
          >
            {typeLabel(toupieById(toupie).type)}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
        </button>

        <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />

        {SLOTS.map((row) => {
          const piece = meta.equipped[row.key];
          const cost = upgradeCost(piece.level);
          const after = row.read(
            playerStats({ ...meta, equipped: { ...meta.equipped, [row.key]: { ...piece, level: piece.level + 1 } } }, toupie),
          );
          const affordable = meta.credits >= cost;
          return (
            // Le point est HORS du bouton : il annonce une action gratuite
            // (équiper), pas l'achat. Dedans, il s'éteindrait à moitié avec le
            // bouton grisé quand les crédits manquent — exactement le moment où
            // le joueur a le plus besoin de savoir qu'il a mieux en réserve.
            <div key={row.key} style={{ position: 'relative' }}>
              <button
                disabled={!affordable}
                onClick={() => {
                  if (tryUpgrade(metaRef.current, row.key)) {
                    syncRunStats(runRef.current, metaRef.current);
                    onChanged();
                  }
                }}
                style={{
                  ...ROW, cursor: affordable ? 'pointer' : 'default',
                  color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.55,
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
                </span>
                <span style={{ font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatCredits(cost)}
                </span>
              </button>
              {att.betterSlots.has(row.key) ? <AlertDot label={t('alert.better')} /> : null}
            </div>
          );
        })}
      </div>

      <InventoryPanel
        metaRef={metaRef}
        att={att}
        onChanged={() => { syncRunStats(runRef.current, metaRef.current); onChanged(); }}
      />
    </div>
  );
}
