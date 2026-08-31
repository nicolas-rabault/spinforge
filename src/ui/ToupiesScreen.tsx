import { TOUPIES, toupieById, type ToupieId, type TopType } from '../content/toupies';
import {
  activeToupie, buyToupie, canClaimFounderGift, claimFounderGift, setActiveToupie,
} from '../sim/meta';
import { botTypeFor } from '../sim/salle';
import { CHASSIS, SALLES_PER_CHAPTER, TOUPIE_SHOP, TYPES } from '../sim/config';
import { formatCredits, t } from '../i18n';
import { tx } from '../i18n/tx';
import { toupieLabel } from './contentLabels';
import { AXIS_ORDER, axisLine, isGain } from './profileAxes';
import { typeLabel } from './typeLabels';
import type { MetaState, RunState } from '../sim/types';

/** Ce que le triangle donne réellement, en toutes lettres — sinon les deux
 *  grandeurs qui gouvernent chaque combat (`TYPES.dominantBonus`,
 *  `TYPES.equilibreBonus`) ne sont écrites nulle part dans le jeu. */
function typeBonusLine(type: TopType): string {
  return type === 'equilibre'
    ? t('type.bonus.equilibre', { pct: Math.round(TYPES.equilibreBonus * 100) })
    : t('type.bonus.dominant', { pct: Math.round(TYPES.dominantBonus * 100) });
}

interface SalleGroup {
  start: number;
  end: number;
  type: TopType;
}

/** Regroupe les dix salles du chapitre 1 par plages consécutives de même type —
 *  sans ce regroupement la contre-pioche se lirait comme dix lignes répétitives
 *  au lieu d'une composition qu'on saisit d'un regard. */
function chapterGroups(chapter: number): SalleGroup[] {
  const groups: SalleGroup[] = [];
  for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
    const type = botTypeFor(chapter, salle);
    const last = groups[groups.length - 1];
    if (last && last.type === type) last.end = salle;
    else groups.push({ start: salle, end: salle, type });
  }
  return groups;
}

/** Les bornes restent des nombres dans les données, le mot vient du catalogue :
 *  la clé React suit la plage et non la langue. */
function groupLabel(g: SalleGroup): string {
  return g.start === g.end
    ? t('toupies.salle', { n: g.start })
    : t('toupies.salles', { a: g.start, b: g.end });
}

function cardStyle(border: string) {
  return {
    border: `1px solid ${border}`, background: 'var(--panel)', borderRadius: 11,
    padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 8,
  };
}

function actionButtonStyle(enabled: boolean) {
  return {
    minHeight: 46, borderRadius: 10, cursor: enabled ? 'pointer' as const : 'default' as const,
    border: `1px solid ${enabled ? 'var(--ember)' : 'var(--line)'}`,
    background: enabled ? 'var(--ember)' : 'var(--panel)',
    color: enabled ? 'var(--ink)' : 'var(--muted)',
    opacity: enabled ? 1 : 0.55,
    font: '600 14px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em',
  };
}

export function ToupiesScreen({
  metaRef, runRef, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  onChanged: () => void;
}) {
  const meta = metaRef.current;
  const pending = activeToupie(meta);
  const piloted = toupieById(runRef.current.toupie);
  // Le châssis est figé pour la descente : tant que le choix diffère de la
  // toupie pilotée, il attend la mort ou le boss. Sans ce texte, « Équiper » ne
  // changerait rien à l'écran et se lirait comme un bug.
  const waiting = pending.id !== piloted.id;
  const dead = runRef.current.phase === 'dead';
  const giftAvailable = canClaimFounderGift(meta);
  const groups = chapterGroups(1);

  // Une seule porte de mutation. Plus de `syncRunStats` ici : le run ne relit
  // jamais `meta.toupies.active`, c'est tout l'objet du verrou.
  const mutate = (fn: (m: MetaState, id: ToupieId) => boolean, id: ToupieId) => {
    if (fn(metaRef.current, id)) onChanged();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        {t('toupies.title')}
      </h2>

      {waiting ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
          {dead
            ? tx('toupies.waiting.dead', {
                pending: <span style={{ color: 'var(--text)' }}>{toupieLabel(pending.id)}</span>,
              })
            : tx('toupies.waiting.alive', {
                piloted: <span style={{ color: 'var(--ember)' }}>{toupieLabel(piloted.id)}</span>,
                pending: <span style={{ color: 'var(--text)' }}>{toupieLabel(pending.id)}</span>,
              })}
        </p>
      ) : null}

      <section style={cardStyle('var(--line)')}>
        <p style={{ margin: 0, font: '500 15px Oswald, ui-sans-serif, sans-serif' }}>
          {t('toupies.composition.title')}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          {t('toupies.composition.body', {
            dominant: Math.round(TYPES.dominantBonus * 100),
            equilibre: Math.round(TYPES.equilibreBonus * 100),
          })}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {groups.map((g) => (
            <div key={`${g.start}-${g.end}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{groupLabel(g)}</span>
              <span style={{ color: `var(--type-${g.type})` }}>{typeLabel(g.type)}</span>
            </div>
          ))}
        </div>
      </section>

      {giftAvailable ? (
        <section style={cardStyle('var(--ember)')}>
          <p style={{ margin: 0, font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)' }}>
            {t('toupies.gift.title')}
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
            {t('toupies.gift.body')}
          </p>
        </section>
      ) : null}

      {TOUPIES.map((toupie) => {
        const owned = meta.toupies.unlocked.includes(toupie.id);
        const isPiloted = toupie.id === piloted.id;
        const isPending = toupie.id === pending.id;
        const profile = CHASSIS[toupie.id] ?? {};
        const axes = AXIS_ORDER.filter((a) => profile[a] !== undefined);
        const affordable = meta.gems >= TOUPIE_SHOP.priceGems;

        return (
          <section key={toupie.id} style={cardStyle(isPiloted ? 'var(--ember)' : 'var(--line)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{toupieLabel(toupie.id)}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: `var(--type-${toupie.type})` }}>{typeLabel(toupie.type)}</p>
              </div>
              {owned && (isPiloted || isPending) ? (
                <span
                  style={{
                    minHeight: 22, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: isPiloted ? 'var(--ember)' : 'transparent',
                    color: isPiloted ? 'var(--ink)' : 'var(--muted)',
                    border: isPiloted ? '1px solid var(--ember)' : '1px solid var(--line)',
                    font: '600 12px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.03em',
                  }}
                >
                  {t(isPiloted ? 'toupies.badge.piloted' : 'toupies.badge.next')}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {axes.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {t('toupies.neutralChassis')}
                </span>
              ) : axes.map((a) => (
                <span
                  key={a}
                  style={{ fontSize: 12, color: isGain(a, profile[a]!) ? 'var(--ember)' : 'var(--muted)' }}
                >
                  {axisLine(a, profile[a]!)}
                </span>
              ))}
              <span style={{ fontSize: 12, color: `var(--type-${toupie.type})` }}>
                {typeBonusLine(toupie.type)}
              </span>
            </div>

            {owned && isPending ? null : owned ? (
              // La carte pilotée n'apparaît ici que si un autre châssis attend :
              // y appuyer revient à renoncer au changement, pas à « équiper ».
              <button onClick={() => mutate(setActiveToupie, toupie.id)} style={actionButtonStyle(true)}>
                {t(isPiloted ? 'toupies.cancelSwap' : 'action.equip')}
              </button>
            ) : giftAvailable ? (
              <button onClick={() => mutate(claimFounderGift, toupie.id)} style={actionButtonStyle(true)}>
                {t('toupies.claim')}
              </button>
            ) : (
              <button
                disabled={!affordable}
                onClick={() => mutate(buyToupie, toupie.id)}
                style={actionButtonStyle(affordable)}
              >
                {t('toupies.buy', { n: formatCredits(TOUPIE_SHOP.priceGems) })}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
