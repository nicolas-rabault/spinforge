import { TOUPIES, toupieById, type ToupieId, type TopType } from '../content/toupies';
import {
  activeToupie, buyToupie, canClaimFounderGift, claimFounderGift, setActiveToupie,
} from '../sim/meta';
import { botTypeFor } from '../sim/salle';
import { CHASSIS, SALLES_PER_CHAPTER, TOUPIE_SHOP, TYPES } from '../sim/config';
import { formatCredits } from './format';
import { AXIS_ORDER, axisLine, isGain } from './profileAxes';
import { TYPE_LABELS } from './typeLabels';
import type { MetaState, RunState } from '../sim/types';

/** Ce que le triangle donne réellement, en toutes lettres — sinon les deux
 *  grandeurs qui gouvernent chaque combat (`TYPES.dominantBonus`,
 *  `TYPES.equilibreBonus`) ne sont écrites nulle part dans le jeu. */
function typeBonusLine(type: TopType): string {
  if (type === 'equilibre') {
    const pct = Math.round(TYPES.equilibreBonus * 100);
    return `Équilibre : +${pct} % de dégâts sur chaque coup, jamais subis en retour.`;
  }
  const pct = Math.round(TYPES.dominantBonus * 100);
  return `+${pct} % de dégâts contre son type dominé, +${pct} % subis face à qui la domine.`;
}

interface SalleGroup {
  label: string;
  type: TopType;
}

/** Regroupe les dix salles du chapitre par plages consécutives de même type —
 *  sans ce regroupement la contre-pioche se lirait comme dix lignes répétitives
 *  au lieu d'une composition qu'on saisit d'un regard. */
function chapterGroups(chapter: number): SalleGroup[] {
  const groups: { start: number; end: number; type: TopType }[] = [];
  for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
    const type = botTypeFor(chapter, salle);
    const last = groups[groups.length - 1];
    if (last && last.type === type) last.end = salle;
    else groups.push({ start: salle, end: salle, type });
  }
  return groups.map((g) => ({
    label: g.start === g.end ? `Salle ${g.start}` : `Salles ${g.start}-${g.end}`,
    type: g.type,
  }));
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
  const between = runRef.current.phase !== 'fighting';
  const giftAvailable = canClaimFounderGift(meta);
  const groups = chapterGroups(runRef.current.chapter);

  // Une seule porte de mutation. Plus de `syncRunStats` ici : le run ne relit
  // jamais `meta.toupies.active`, c'est tout l'objet du verrou.
  const mutate = (fn: (m: MetaState, id: ToupieId) => boolean, id: ToupieId) => {
    if (fn(metaRef.current, id)) onChanged();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Toupies
      </h2>

      {waiting ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
          {between ? (
            <>
              <span style={{ color: 'var(--text)' }}>{pending.label}</span> monte sur le ring dès que
              tu relances la descente.
            </>
          ) : (
            <>
              Tu pilotes <span style={{ color: 'var(--ember)' }}>{piloted.label}</span> jusqu'au bout
              de la descente. <span style={{ color: 'var(--text)' }}>{pending.label}</span> prend le
              relais à la mort ou au boss vaincu.
            </>
          )}
        </p>
      ) : null}

      <section style={cardStyle('var(--line)')}>
        <p style={{ margin: 0, font: '500 15px Oswald, ui-sans-serif, sans-serif' }}>
          Chapitre {runRef.current.chapter} — composition
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          Attaque bat Endurance, qui bat Défense, qui bat Attaque : +{Math.round(TYPES.dominantBonus * 100)} %
          de dégâts infligés au type battu, subis en retour face au type qui bat. Équilibre ne domine ni
          n'est dominé : +{Math.round(TYPES.equilibreBonus * 100)} % de dégâts sur chaque coup, jamais subis
          en retour.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {groups.map((g) => (
            <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{g.label}</span>
              <span style={{ color: `var(--type-${g.type})` }}>{TYPE_LABELS[g.type]}</span>
            </div>
          ))}
        </div>
      </section>

      {giftAvailable ? (
        <section style={cardStyle('var(--ember)')}>
          <p style={{ margin: 0, font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)' }}>
            Tu as franchi le mur !
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
            Choisis ton Fondateur — réclame-le sur l'une des fiches ci-dessous.
          </p>
        </section>
      ) : null}

      {TOUPIES.map((t) => {
        const owned = meta.toupies.unlocked.includes(t.id);
        const isPiloted = t.id === piloted.id;
        const isPending = t.id === pending.id;
        const profile = CHASSIS[t.id] ?? {};
        const axes = AXIS_ORDER.filter((a) => profile[a] !== undefined);
        const affordable = meta.gems >= TOUPIE_SHOP.priceGems;

        return (
          <section key={t.id} style={cardStyle(isPiloted ? 'var(--ember)' : 'var(--line)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: `var(--type-${t.type})` }}>{TYPE_LABELS[t.type]}</p>
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
                  {isPiloted ? 'Pilotée' : 'Au prochain run'}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {axes.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Profil de châssis neutre — aucun bonus ni malus de stats.
                </span>
              ) : axes.map((a) => (
                <span
                  key={a}
                  style={{ fontSize: 12, color: isGain(a, profile[a]!) ? 'var(--ember)' : 'var(--muted)' }}
                >
                  {axisLine(a, profile[a]!)}
                </span>
              ))}
              <span style={{ fontSize: 12, color: `var(--type-${t.type})` }}>
                {typeBonusLine(t.type)}
              </span>
            </div>

            {owned && isPending ? null : owned ? (
              // La carte pilotée n'apparaît ici que si un autre châssis attend :
              // y appuyer revient à renoncer au changement, pas à « équiper ».
              <button onClick={() => mutate(setActiveToupie, t.id)} style={actionButtonStyle(true)}>
                {isPiloted ? 'Annuler le changement' : 'Équiper'}
              </button>
            ) : giftAvailable ? (
              <button onClick={() => mutate(claimFounderGift, t.id)} style={actionButtonStyle(true)}>
                Réclamer
              </button>
            ) : (
              <button
                disabled={!affordable}
                onClick={() => mutate(buyToupie, t.id)}
                style={actionButtonStyle(affordable)}
              >
                Acheter · {formatCredits(TOUPIE_SHOP.priceGems)} 💎
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
