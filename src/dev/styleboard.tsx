/**
 * Planche de style — **temporaire**. Point d'arrêt de la vague 1 de la refonte
 * graphique : elle montre les 24 objets du catalogue dessinés, à tous les paliers et
 * à toutes les tailles, avant qu'un seul écran de jeu ne change. Elle sert ensuite
 * de surface de vérification aux vagues suivantes, puis elle est supprimée avec
 * `styleboard.html` — voir `docs/superpowers/plans/2026-08-31-refonte-graphique.md`.
 */
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import { applyThemeToDocument } from '../theme';
import { MODELS, type Slot } from '../content/pieces';
import { TOUPIES, toupieById, type ToupieId } from '../content/toupies';
import { CHASSIS } from '../sim/config';
import { rankLabel } from '../sim/piece';
import { drawToupieTop, botArt, type ToupieArt } from '../art/toupie';
import { makeCanvas } from '../art/draw';
import { PieceIcon } from '../ui/art/PieceIcon';
import { ToupiePortrait } from '../ui/art/ToupiePortrait';
import { ChestIcon } from '../ui/art/ChestIcon';
import { StatRadar } from '../ui/art/StatRadar';
import { TypeTriangle } from '../ui/art/TypeTriangle';
import type { ChestKind } from '../sim/types';

applyThemeToDocument();

const SLOTS: Slot[] = ['lame', 'disque', 'pointe', 'noyau'];
const RANKS = [1, 4, 7, 11];

function atRank(art: ToupieArt, rank: number): ToupieArt {
  return {
    chassis: art.chassis,
    pieces: Object.fromEntries(
      Object.entries(art.pieces).map(([slot, p]) => [slot, { ...p, rank }]),
    ) as ToupieArt['pieces'],
  };
}

function artOf(id: ToupieId, rank: number): ToupieArt {
  return atRank(botArt(toupieById(id).type), rank);
}

function TopView({ art, size }: { art: ToupieArt; size: number }) {
  const { el, ctx } = makeCanvas(size * 2);
  drawToupieTop(ctx, art, size * 2);
  return <img src={el.toDataURL()} width={size} height={size} alt="" style={{ display: 'block' }} />;
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2 style={{ font: '600 17px Oswald, sans-serif', margin: 0, letterSpacing: '.04em', textTransform: 'uppercase' }}>
        {title}
      </h2>
      {note ? <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>{note}</p> : null}
      {children}
    </section>
  );
}

function Cap({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'center' }}>{children}</span>;
}

function Board() {
  const wrap = { display: 'flex', flexWrap: 'wrap' as const, gap: 12 };
  const cell = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, width: 84 };

  return (
    <div style={{
      background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh',
      padding: 20, display: 'flex', flexDirection: 'column', gap: 26,
      font: '400 13px Inter, system-ui, sans-serif',
    }}>
      <h1 style={{ font: '600 26px Oswald, sans-serif', margin: 0, letterSpacing: '.03em' }}>
        SpinForge — planche de style
      </h1>

      <Section
        title="1 · Les quatre paliers de rang"
        note="Une silhouette par emplacement, aux quatre paliers. Le rang doit se lire avant le modèle : acier → bleui → violet → or, plus 0 à 3 gemmes."
      >
        {SLOTS.map((slot) => {
          const model = MODELS.find((m) => m.slot === slot)!;
          return (
            <div key={slot} style={{ ...wrap, alignItems: 'flex-end' }}>
              {RANKS.map((rank) => (
                <div key={rank} style={cell}>
                  <PieceIcon model={model.id} rank={rank} size={76} tile />
                  <Cap>{rankLabel(rank)}</Cap>
                </div>
              ))}
              <div style={{ ...cell, width: 130, alignItems: 'flex-start' }}>
                <Cap>{model.label}</Cap>
              </div>
            </div>
          );
        })}
      </Section>

      <Section
        title="2 · Les vingt modèles"
        note="Au rang Épique, dans leur écrin. Deux modèles du même emplacement doivent se distinguer par leur motif seul."
      >
        {SLOTS.map((slot) => (
          <div key={slot} style={wrap}>
            {MODELS.filter((m) => m.slot === slot).map((m) => (
              <div key={m.id} style={cell}>
                <PieceIcon model={m.id} rank={7} size={76} tile />
                <Cap>{m.label}</Cap>
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section
        title="3 · Lisibilité en taille réelle"
        note="24 px est la taille d'un badge, 40 px celle d'une tuile d'inventaire dense, 96 px celle d'une fiche. L'emplacement et le rang doivent tenir à 24."
      >
        <div style={{ ...wrap, alignItems: 'flex-end' }}>
          {[24, 32, 40, 56, 76, 96].map((s) => (
            <div key={s} style={{ ...cell, width: s + 16 }}>
              <PieceIcon model="lame.croc-de-tempete" rank={11} size={s} tile />
              <Cap>{s} px</Cap>
            </div>
          ))}
        </div>
        <div style={{ ...wrap, alignItems: 'flex-end' }}>
          {[24, 32, 40, 56, 76, 96].map((s) => (
            <div key={s} style={{ ...cell, width: s + 16 }}>
              <PieceIcon model="noyau.oeil-du-cyclone" rank={4} size={s} tile />
              <Cap>{s} px</Cap>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="4 · Les quatre toupies, montées"
        note="Portrait trois quarts : châssis + Lame + Disque + Pointe + Noyau. Changer une pièce change le portrait."
      >
        <div style={wrap}>
          {TOUPIES.map((t) => (
            <div key={t.id} style={{ ...cell, width: 150 }}>
              <ToupiePortrait art={artOf(t.id, 7)} size={150} />
              <Cap>{t.label}</Cap>
              <Cap>
                <span style={{ color: `var(--type-${t.type})` }}>{t.type}</span>
              </Cap>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="5 · Vue de dessus — ce que l'arène affiche"
        note="Même recette que les portraits ci-dessus. Les quatre châssis doivent se distinguer à la taille où ils tournent réellement (≈ 46 px)."
      >
        <div style={{ ...wrap, alignItems: 'flex-end' }}>
          {TOUPIES.map((t) => (
            <div key={t.id} style={{ ...cell, width: 110 }}>
              <TopView art={artOf(t.id, 7)} size={104} />
              <Cap>{t.label}</Cap>
            </div>
          ))}
        </div>
        <div style={{ ...wrap, alignItems: 'flex-end' }}>
          {TOUPIES.map((t) => (
            <div key={t.id} style={{ ...cell, width: 60 }}>
              <TopView art={artOf(t.id, 7)} size={46} />
              <Cap>46 px</Cap>
            </div>
          ))}
        </div>
      </Section>

      <Section title="6 · Les trois coffres" note="Fermés, puis le Mythique en cours d'ouverture.">
        <div style={{ ...wrap, alignItems: 'flex-end' }}>
          {(['bronze', 'arene', 'mythique'] as ChestKind[]).map((k) => (
            <div key={k} style={{ ...cell, width: 120 }}>
              <ChestIcon kind={k} size={110} />
              <Cap>{k}</Cap>
            </div>
          ))}
          {[0.35, 0.7, 1].map((o) => (
            <div key={o} style={{ ...cell, width: 120 }}>
              <ChestIcon kind="mythique" size={110} open={o} />
              <Cap>ouverture {o}</Cap>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="7 · Le radar de profil — à trancher"
        note="Sept axes. Le pointillé gris est le neutre, le plein bleu le profil, le pointillé ambre l'état après achat. Si ce n'est pas lisible ici, le repli est quatre barres."
      >
        <div style={{ ...wrap, alignItems: 'center' }}>
          {TOUPIES.map((t) => (
            <div key={t.id} style={{ ...cell, width: 140 }}>
              <StatRadar values={CHASSIS[t.id] ?? {}} size={132} />
              <Cap>{t.label}</Cap>
            </div>
          ))}
          <div style={{ ...cell, width: 140 }}>
            <StatRadar
              values={CHASSIS['carapace-abyssale'] ?? {}}
              compare={{ ...(CHASSIS['carapace-abyssale'] ?? {}), maxSpeed: 1.25, accel: 1.3 }}
              size={132}
            />
            <Cap>avant / après achat</Cap>
          </div>
          <div style={{ ...cell, width: 76 }}>
            <StatRadar values={CHASSIS['typhon-primal'] ?? {}} size={64} labels={false} />
            <Cap>64 px, sans libellés</Cap>
          </div>
        </div>
      </Section>

      <Section title="8 · Le triangle des forces" note="Remplace un paragraphe de quatre lignes.">
        <div style={{ ...wrap, alignItems: 'center' }}>
          <TypeTriangle size={190} />
          <TypeTriangle size={190} highlight="defense" />
        </div>
      </Section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Board />);
