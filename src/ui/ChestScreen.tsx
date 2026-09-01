import { useEffect, useState, type CSSProperties } from 'react';
import { audio } from '../audio/audio';
import { canOpen, chestPrice, grantChests, openChest } from '../sim/chest';
import { addPiece, pendingTotal } from '../sim/meta';
import type { PieceInstance } from '../sim/piece';
import { rankLabel } from './rank';
import { modelLabel } from './contentLabels';
import { CHESTS } from '../sim/config';
import { rankTier } from '../theme';
import { formatCredits, t, type MessageKey } from '../i18n';
import { tx } from '../i18n/tx';
import { CHEST_QUAKE, CHEST_QUAKE_LIFE, REVEAL } from '../render/feel';
import { quake } from './screenShake';
import { ChestIcon } from './art/ChestIcon';
import { PieceIcon } from './art/PieceIcon';
import { Sparks } from './art/Sparks';
import { RingMeter } from './art/RingMeter';
import { OddsBar } from './art/OddsBar';
import { SlotStrip } from './art/SlotStrip';
import type { ChestKind, MetaState } from '../sim/types';

const CHEST_LIST: { kind: ChestKind; name: MessageKey }[] = [
  { kind: 'bronze', name: 'chest.bronze.name' },
  { kind: 'arene', name: 'chest.arene.name' },
  { kind: 'mythique', name: 'chest.mythique.name' },
];

/** Poses du couvercle. Quatre images mises en cache, pas une animation continue :
 *  `chestUrl` mémoïse par valeur d'ouverture, et une valeur par image ferait
 *  exploser le cache pour un gain que l'œil ne voit pas à cette vitesse.
 *  Le dernier pas s'arrête à 0,75 : au-delà, le couvercle pivoté sort de sa boîte
 *  de dessin et se fait rogner par le conteneur. */
const OPEN_STEPS = [0, 0.3, 0.55, 0.75];
const SHAKE_MS = 600;
const STEP_MS = 110;
/** Taille d'une pièce révélée. Elle rétrécit quand le lot grossit, pour qu'un
 *  butin de vingt coffres tienne encore dans le cadre. */
const TILE = (count: number) => (count <= 10 ? 62 : count <= 24 ? 50 : 40);
/** Gabarit partagé par la grille des pièces et par celle des gerbes : les deux
 *  doivent se superposer case pour case, une seule définition l'assure. */
const GRID: CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7, alignContent: 'center',
};

type Phase = 'shake' | 'opening' | 'reveal';

interface Opening {
  kind: ChestKind;
  /** Tirages triés du moins bon au meilleur : la révélation garde le meilleur
   *  pour la fin. Le tri est purement visuel — tout est déjà rangé en inventaire. */
  pulls: PieceInstance[];
}

export function ChestScreen({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [opening, setOpening] = useState<Opening | null>(null);
  const [phase, setPhase] = useState<Phase>('shake');
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const meta = metaRef.current;

  // Le coffre tremble, s'ouvre en quatre poses, puis lâche ses pièces une à une.
  useEffect(() => {
    if (!opening) return;
    if (phase === 'shake') {
      const id = setTimeout(() => setPhase('opening'), SHAKE_MS);
      return () => clearTimeout(id);
    }
    if (phase === 'opening') {
      if (step >= OPEN_STEPS.length - 1) {
        const id = setTimeout(() => setPhase('reveal'), STEP_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setStep((n) => n + 1), STEP_MS);
      return () => clearTimeout(id);
    }
    if (revealed >= opening.pulls.length) return;
    // Le pas n'est plus fixe : il est dicté par la pièce qui vient d'apparaître.
    // Une poignée de communs défile, une Légende arrête la séquence le temps
    // qu'on la voie — c'est ce contraste qui fait la rareté, pas la couleur.
    const shown = opening.pulls[revealed - 1];
    const hold = REVEAL[shown ? rankTier(shown.rank) : 0].hold;
    const id = setTimeout(() => setRevealed((n) => n + 1), hold * 1000);
    return () => clearTimeout(id);
  }, [opening, phase, step, revealed]);

  // Ce que l'ouverture fait sentir : l'écran tremble, et le son suit exactement
  // les mêmes transitions — un seul effet, donc aucune dérive possible entre ce
  // qu'on voit et ce qu'on entend.
  useEffect(() => {
    if (!opening) return;
    if (phase === 'shake') {
      audio.chestShake();
      return;
    }
    if (phase === 'opening') {
      audio.chestStep(step);
      if (step === 0) quake(CHEST_QUAKE[opening.kind], CHEST_QUAKE_LIFE);
      return;
    }
    if (revealed === 0) {
      // Le couvercle a fini de céder : c'est ici que la main doit le sentir.
      audio.chestOpened();
      return;
    }
    const piece = opening.pulls[revealed - 1];
    const feel = REVEAL[rankTier(piece.rank)];
    audio.pieceRevealed(rankTier(piece.rank));
    if (feel.shake > 0) quake(feel.shake, feel.life);
    if (revealed >= opening.pulls.length) {
      audio.chestDone(rankTier(opening.pulls[opening.pulls.length - 1].rank));
    }
  }, [opening, phase, step, revealed]);

  const start = (kind: ChestKind, drawn: PieceInstance[] | null) => {
    if (!drawn) return;
    for (const piece of drawn) addPiece(metaRef.current, piece);
    setOpening({ kind, pulls: [...drawn].sort((a, b) => a.rank - b.rank) });
    setPhase('shake');
    setStep(0);
    setRevealed(0);
    onChanged();
  };

  if (opening) {
    const { kind, pulls } = opening;
    const done = phase === 'reveal' && revealed >= pulls.length;
    const openValue = phase === 'shake' ? 0 : OPEN_STEPS[Math.min(step, OPEN_STEPS.length - 1)];
    const best = pulls[pulls.length - 1];
    const tile = TILE(pulls.length);
    // La pièce qui vient d'apparaître commande le flash plein écran ; sa gerbe,
    // elle, reste accrochée à sa vignette.
    const last = revealed > 0 ? pulls[revealed - 1] : null;
    const lastFeel = last ? REVEAL[rankTier(last.rank)] : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0 }}>
        {last && lastFeel && lastFeel.flash > 0 ? (
          // Remonté à chaque pièce (`key`) : sans quoi l'animation ne rejouerait
          // pas pour la Légende suivante du même lot.
          <span
            key={revealed}
            aria-hidden
            className="sf-flash"
            style={{
              '--sf-flash': lastFeel.flash, '--sf-life': `${lastFeel.life}s`,
              // Derrière le butin (`zIndex: 0` contre 1) : au-dessus, le voile
              // doré lavait les étincelles qu'il était censé accompagner.
              position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
              background: `radial-gradient(circle at 50% 45%, var(--rank-${rankTier(last.rank)}) 0%, transparent 62%)`,
            } as CSSProperties}
          />
        ) : null}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          {/* L'éclat part du coffre au moment où il s'ouvre : c'est ce qui fait
              de l'ouverture un événement plutôt qu'un changement d'écran. */}
          {phase !== 'shake' ? (
            <span
              className="sf-burst"
              style={{
                position: 'absolute', top: 34, width: 120, height: 120, borderRadius: '50%',
                background: `radial-gradient(circle, var(--rank-${rankTier(best.rank)}) 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
          ) : null}
          <span className={phase === 'shake' ? 'sf-shake' : undefined} style={{ display: 'block' }}>
            <ChestIcon kind={kind} size={132} open={openValue} />
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 1, flex: '1 1 0', minHeight: 0 }}>
          <div style={{ ...GRID, overflowY: 'auto', overflowX: 'hidden' }}>
            {pulls.slice(0, revealed).map((piece, i) => (
              <div
                key={i}
                className="sf-pop"
                style={{ display: 'flex', justifyContent: 'center', height: tile }}
              >
                <PieceIcon model={piece.model} rank={piece.rank} size={tile} tile />
              </div>
            ))}
          </div>
          {/* Les gerbes vivent dans une grille jumelle posée par-dessus : même
              gabarit, même nombre de cases, donc chacune reste centrée sur sa
              pièce — mais elle déborde sans être coupée par le cadre qui défile. */}
          <div aria-hidden style={{ ...GRID, pointerEvents: 'none' }}>
            {pulls.slice(0, revealed).map((piece, i) => (
              <div key={i} style={{ position: 'relative', height: tile }}>
                <Sparks rank={piece.rank} size={tile} />
              </div>
            ))}
          </div>
        </div>

        {done ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
            {tx('chest.stored', {
              best: (
                <span style={{ color: `var(--rank-${rankTier(best.rank)})` }}>
                  {modelLabel(best.model)} · {rankLabel(best.rank)}
                </span>
              ),
            })}
          </p>
        ) : null}

        <button
          onClick={() => setOpening(null)}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          {t('chest.continue')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      {pendingTotal(meta) > 0 ? (
        <section
          style={{
            border: '1px solid var(--ember)', background: 'var(--panel)', borderRadius: 11,
            padding: '14px 12px', display: 'flex', gap: 12, alignItems: 'center',
          }}
        >
          <p style={{ margin: 0, font: '500 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)' }}>
            {t('chest.loot')}
          </p>
          {/* Le butin n'est plus une liste de boutons nommés : ce sont les coffres
              eux-mêmes, avec leur compte. On appuie sur l'objet qu'on veut ouvrir. */}
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {CHEST_LIST.filter(({ kind }) => meta.pending[kind] > 0).map(({ kind, name }) => (
              <button
                key={kind}
                aria-label={t('chest.openAll', { n: meta.pending[kind], name: t(name) })}
                onClick={() => start(kind, grantChests(metaRef.current, kind))}
                data-sfx="chest"
                className="sf-breathe"
                style={{
                  position: 'relative', border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                }}
              >
                <ChestIcon kind={kind} size={58} />
                <span
                  style={{
                    position: 'absolute', bottom: 2, right: -2, minWidth: 19, height: 19, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                    background: 'var(--ember)', color: 'var(--ink)', fontSize: 11.5,
                    fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {meta.pending[kind]}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {CHEST_LIST.map(({ kind, name }) => {
        const def = CHESTS[kind];
        const unit = chestPrice(kind, 1);
        const ten = chestPrice(kind, 10);
        const currency = t(unit.currency === 'credits' ? 'currency.credits' : 'currency.gems');
        const remaining = def.pityThreshold - meta.pity[kind];
        return (
          <section
            key={kind}
            style={{
              border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9,
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 84, height: 84, flex: '0 0 auto' }}>
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                  <ChestIcon kind={kind} size={72} />
                </span>
                {/* L'anneau de pitié entoure le coffre : le garanti approche sous
                    les yeux, au lieu d'être annoncé par une phrase sous la carte. */}
                {def.pityThreshold > 0 ? (
                  <span style={{ position: 'absolute', inset: 0 }}>
                    <RingMeter
                      value={meta.pity[kind]}
                      total={def.pityThreshold}
                      size={84}
                      thickness={3.5}
                      color={`var(--rank-${rankTier(def.pityRank)})`}
                      label={String(remaining)}
                    />
                  </span>
                ) : null}
              </div>
              <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{t(name)}</p>
                <SlotStrip slots={def.slots} rank={def.ranks[def.ranks.length - 1].rank} />
                <OddsBar ranks={def.ranks} labels />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {([1, 10] as const).map((count) => {
                const price = count === 1 ? unit : ten;
                const affordable = canOpen(meta, kind, count);
                return (
                  <button
                    key={count}
                    disabled={!affordable}
                    onClick={() => start(kind, openChest(metaRef.current, kind, count))}
                    data-sfx="chest"
                    style={{
                      flex: '1 1 0', minHeight: 46, borderRadius: 10, cursor: affordable ? 'pointer' : 'default',
                      border: '1px solid var(--line)', background: 'var(--bg)',
                      color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.5,
                      font: '500 13px Oswald, ui-sans-serif, sans-serif',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    }}
                  >
                    <span>{t('chest.open', { n: count })}</span>
                    <span style={{ fontSize: 11.5, color: affordable ? 'var(--ember)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCredits(price.amount)} {currency}
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
