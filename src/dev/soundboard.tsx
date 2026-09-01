import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { audio } from '../audio/audio';

/**
 * Banc d'essai du son, jumeau de la planche de style — et pour la même raison :
 * le goût ne se teste pas unitairement, il s'écoute. Régler un choc sans lui
 * demanderait de lancer une partie et d'attendre qu'un bot vienne au contact.
 * `vite build` ne construit que `index.html` : ce banc n'est jamais livré.
 */
function Soundboard() {
  const [power, setPower] = useState(0.6);
  const [spin, setSpin] = useState(1);
  const [tier, setTier] = useState(3);
  const [intensity, setIntensity] = useState(0.7);

  const fire = (run: () => void) => () => {
    audio.start();
    run();
  };

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: 20, display: 'grid', gap: 14 }}>
      <h1 style={{ font: '600 22px ui-sans-serif', margin: 0 }}>Banc d'essai sonore</h1>

      <label style={{ display: 'grid', gap: 4 }}>
        Intensité musicale : {intensity.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={intensity}
               onChange={(e) => {
                 const v = Number(e.target.value);
                 setIntensity(v);
                 audio.start();
                 audio.setIntensity(v);
               }} />
      </label>

      <label style={{ display: 'grid', gap: 4 }}>
        Puissance du choc : {power.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={power}
               onChange={(e) => setPower(Number(e.target.value))} />
      </label>
      <button onClick={fire(() => audio.hit(power))} style={BTN}>Choc</button>
      <button onClick={fire(() => { for (let i = 0; i < 12; i++) setTimeout(() => audio.hit(power * Math.random()), i * 90); })} style={BTN}>
        Mêlée — 12 chocs en 1 s (vérifie la garde)
      </button>

      <label style={{ display: 'grid', gap: 4 }}>
        Rotor (spin) : {spin.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={spin}
               onChange={(e) => { setSpin(Number(e.target.value)); audio.start(); audio.setSpin(Number(e.target.value)); }} />
      </label>
      <button onClick={fire(() => audio.setSpin(null))} style={BTN}>Couper le rotor</button>

      <button onClick={fire(() => audio.death())} style={BTN}>Mort</button>
      <button onClick={fire(() => audio.door())} style={BTN}>Porte de salle</button>

      <label style={{ display: 'grid', gap: 4 }}>
        Palier de rang : {tier}
        <input type="range" min={0} max={3} step={1} value={tier}
               onChange={(e) => setTier(Number(e.target.value))} />
      </label>
      <button onClick={fire(() => audio.reward(1))} style={BTN}>Récompense de salle</button>
      <button onClick={fire(() => audio.bossDown())} style={BTN}>Boss vaincu</button>
      <button onClick={fire(() => audio.chestShake())} style={BTN}>Coffre — secousse</button>
      <button onClick={fire(() => [0, 1, 2].forEach((i) => setTimeout(() => audio.chestStep(i), i * 110)))} style={BTN}>
        Coffre — les trois poses
      </button>
      <button onClick={fire(() => audio.chestOpened())} style={BTN}>Coffre — le couvercle cède</button>
      <button onClick={fire(() => audio.pieceRevealed(tier))} style={BTN}>Pièce révélée (palier {tier})</button>
      <button onClick={fire(() => audio.chestDone(tier))} style={BTN}>Butin rangé (palier {tier})</button>
      <button onClick={fire(() => audio.fuse())} style={BTN}>Fusion</button>
      <button onClick={fire(() => audio.upgrade())} style={BTN}>Amélioration</button>
      <button onClick={fire(() => audio.equip())} style={BTN}>Équiper</button>
      <button onClick={fire(() => audio.tap('tap'))} style={BTN}>Bouton — appui simple</button>
      <button onClick={fire(() => audio.tap('chest'))} style={BTN}>Bouton — appui qui dépense</button>
    </main>
  );
}

const BTN: React.CSSProperties = {
  minHeight: 44, borderRadius: 10, cursor: 'pointer',
  border: '1px solid #2a3444', background: '#131922', color: '#e7ecf3', fontSize: 15,
};

createRoot(document.getElementById('root')!).render(<StrictMode><Soundboard /></StrictMode>);
