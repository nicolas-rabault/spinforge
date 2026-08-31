import { TOUPIES, toupieById, type ToupieId, type TopType } from '../content/toupies';
import {
  activeToupie, buyToupie, canClaimFounderGift, claimFounderGift, setActiveToupie,
} from '../sim/meta';
import { botTypeFor } from '../sim/salle';
import { CHASSIS, SALLES_PER_CHAPTER, TOUPIE_SHOP } from '../sim/config';
import { playerArt } from '../art/toupie';
import { formatCredits } from './format';
import { TYPE_LABELS } from './typeLabels';
import { ToupiePortrait } from './art/ToupiePortrait';
import { StatRadar } from './art/StatRadar';
import { TypeTriangle } from './art/TypeTriangle';
import type { MetaState, RunState } from '../sim/types';

function cardStyle(border: string) {
  return {
    border: `1px solid ${border}`, background: 'var(--panel)', borderRadius: 11,
    padding: '10px 12px', display: 'flex', flexDirection: 'column' as const, gap: 8,
  };
}

function actionButtonStyle(enabled: boolean) {
  return {
    minHeight: 44, borderRadius: 10, cursor: enabled ? 'pointer' as const : 'default' as const,
    border: `1px solid ${enabled ? 'var(--ember)' : 'var(--line)'}`,
    background: enabled ? 'var(--ember)' : 'var(--panel)',
    color: enabled ? 'var(--ink)' : 'var(--muted)',
    opacity: enabled ? 1 : 0.55,
    font: '600 14px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em',
  };
}

/** La composition du chapitre : une pastille par salle, teintée du type qu'on y
 *  affronte, la dixième en losange pour le boss. Remplace trois lignes
 *  « Salles 1-3 — Endurance » : ici on voit d'un coup où le chapitre bascule, et
 *  la bande se lit contre le triangle juste au-dessus. */
function ChapterComposition({ chapter }: { chapter: number }) {
  const salles = Array.from({ length: SALLES_PER_CHAPTER }, (_, i) => ({
    salle: i + 1,
    type: botTypeFor(chapter, i + 1),
  }));
  return (
    <div
      role="img"
      aria-label={salles.map((s) => `Salle ${s.salle} : ${TYPE_LABELS[s.type]}`).join(', ')}
      // `alignSelf: stretch` : la carte parente centre ses enfants, et sans cela
      // la bande se réduisait à la largeur de son contenu — c'est-à-dire à rien,
      // ses pastilles étant toutes en `flex: 1 1 0`.
      style={{ display: 'flex', gap: 4, alignItems: 'center', alignSelf: 'stretch', width: '100%' }}
    >
      {salles.map(({ salle, type }) => {
        const boss = salle === SALLES_PER_CHAPTER;
        return (
          <span
            key={salle}
            style={{
              flex: '1 1 0', height: boss ? 20 : 14,
              borderRadius: boss ? 5 : 999,
              background: `var(--type-${type})`,
              opacity: boss ? 1 : 0.72,
              border: boss ? '2px solid var(--boss)' : 'none',
              boxSizing: 'border-box',
            }}
          />
        );
      })}
    </div>
  );
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

  // Une seule porte de mutation. Plus de `syncRunStats` ici : le run ne relit
  // jamais `meta.toupies.active`, c'est tout l'objet du verrou.
  const mutate = (fn: (m: MetaState, id: ToupieId) => boolean, id: ToupieId) => {
    if (fn(metaRef.current, id)) onChanged();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      {/* Le triangle des forces, dessiné, et juste dessous la composition du
          chapitre dans les mêmes teintes. Quatre lignes de paragraphe et trois
          lignes de tableau tenaient ici. */}
      <section style={{ ...cardStyle('var(--line)'), alignItems: 'center', gap: 10 }}>
        <TypeTriangle size={196} highlight={piloted.type as TopType} />
        <ChapterComposition chapter={1} />
      </section>

      {waiting ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
          {dead ? (
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
        const affordable = meta.gems >= TOUPIE_SHOP.priceGems;

        return (
          <section key={t.id} style={cardStyle(isPiloted ? 'var(--ember)' : 'var(--line)')}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Le portrait montre TES pièces sur CE châssis : on compare des
                  toupies montées, pas des noms. */}
              <ToupiePortrait art={playerArt(meta.equipped, t.id)} size={104} />
              <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{t.label}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: `var(--type-${t.type})` }}>{TYPE_LABELS[t.type]}</p>
                {owned && (isPiloted || isPending) ? (
                  <span
                    style={{
                      marginTop: 3, alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap',
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
              {/* Le profil du châssis, seul : c'est ce qui distingue vraiment les
                  quatre, et la forme se compare d'une carte à l'autre. */}
              <StatRadar values={CHASSIS[t.id] ?? {}} size={92} labels={false} />
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
