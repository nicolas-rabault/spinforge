import { TOUPIES, type ToupieId, type TopType } from '../content/toupies';
import {
  activeToupie, buyToupie, canClaimFounderGift, claimFounderGift, setActiveToupie,
} from '../sim/meta';
import { botTypeFor } from '../sim/salle';
import { CHASSIS, SALLES_PER_CHAPTER, TOUPIE_SHOP } from '../sim/config';
import type { ProfileAxis } from '../sim/profile';
import { syncRunStats } from '../sim/sim';
import { formatCredits } from './format';
import type { MetaState, RunState } from '../sim/types';

const TYPE_LABELS: Record<TopType, string> = {
  attaque: 'Attaque',
  endurance: 'Endurance',
  defense: 'Défense',
  equilibre: 'Équilibre',
};

const AXIS_LABELS: Record<ProfileAxis, string> = {
  attack: 'Attaque',
  defense: 'Défense',
  maxSpeed: 'Vitesse max',
  spinMax: 'Spin max',
  accel: 'Accélération',
  mass: 'Masse',
  spinDecay: 'Décroissance',
};

const AXIS_ORDER: ProfileAxis[] = ['attack', 'defense', 'maxSpeed', 'spinMax', 'accel', 'mass', 'spinDecay'];

/** > 1 est un gain pour six axes sur sept. `spinDecay` est une perte de spin par
 *  seconde (voir `profile.ts`) : là, c'est < 1 qui est le gain. Piège de sens à ne
 *  pas reproduire ici — la couleur suit cette règle, pas le signe du pourcentage. */
function isGain(axis: ProfileAxis, value: number): boolean {
  return axis === 'spinDecay' ? value < 1 : value > 1;
}

function axisLine(axis: ProfileAxis, value: number): string {
  const pct = Math.round((value - 1) * 100);
  const sign = pct > 0 ? '+' : '';
  return `${AXIS_LABELS[axis]} ${sign}${pct} %`;
}

interface SalleGroup {
  label: string;
  type: TopType;
}

/** Regroupe les dix salles du chapitre 1 par plages consécutives de même type —
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
  const active = activeToupie(meta);
  const giftAvailable = canClaimFounderGift(meta);
  const groups = chapterGroups(1);

  // Une seule porte de mutation : `sync` puis `onChanged`, exactement ce que fait
  // ForgeScreen après un achat — sans ça, changer de toupie n'affecterait le
  // pilotage qu'au prochain run au lieu du run en cours.
  const mutate = (fn: (m: MetaState, id: ToupieId) => boolean, id: ToupieId) => {
    if (fn(metaRef.current, id)) {
      syncRunStats(runRef.current, metaRef.current);
      onChanged();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Toupies
      </h2>

      <section style={cardStyle('var(--line)')}>
        <p style={{ margin: 0, font: '500 15px Oswald, ui-sans-serif, sans-serif' }}>
          Chapitre 1 — composition
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          Attaque bat Endurance, qui bat Défense, qui bat Attaque. Équilibre ne domine ni n'est dominé.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {groups.map((g) => (
            <div key={g.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>{g.label}</span>
              <span>{TYPE_LABELS[g.type]}</span>
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
        const isActive = t.id === active.id;
        const profile = CHASSIS[t.id] ?? {};
        const axes = AXIS_ORDER.filter((a) => profile[a] !== undefined);
        const affordable = meta.gems >= TOUPIE_SHOP.priceGems;

        return (
          <section key={t.id} style={cardStyle(isActive ? 'var(--ember)' : 'var(--line)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>{TYPE_LABELS[t.type]}</p>
              </div>
              {owned && isActive ? (
                <span
                  style={{
                    minHeight: 22, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
                    background: 'var(--ember)', color: 'var(--ink)',
                    font: '600 12px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.03em',
                  }}
                >
                  Pilotée
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {axes.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Profil de référence — aucun bonus ni malus.
                </span>
              ) : axes.map((a) => (
                <span
                  key={a}
                  style={{ fontSize: 12, color: isGain(a, profile[a]!) ? 'var(--ember)' : 'var(--muted)' }}
                >
                  {axisLine(a, profile[a]!)}
                </span>
              ))}
            </div>

            {owned && isActive ? null : owned ? (
              <button onClick={() => mutate(setActiveToupie, t.id)} style={actionButtonStyle(true)}>
                Équiper
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
