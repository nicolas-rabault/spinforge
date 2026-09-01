/**
 * Secousse de l'écran entier. La cible est `#root` : c'est le seul élément qui
 * couvre toute la fenêtre, HUD et barre d'onglets compris — secouer la colonne
 * de l'app laisserait le cadre immobile autour.
 *
 * L'appel écrit dans le DOM plutôt que de remonter un état jusqu'à `App` : la
 * secousse ne survit pas à son animation, rien n'a besoin de s'en souvenir.
 */
export function quake(pixels: number, seconds: number): void {
  const root = document.getElementById('root');
  if (!root) return;
  root.style.setProperty('--sf-quake', `${pixels}px`);
  root.style.setProperty('--sf-quake-life', `${seconds}s`);
  // Retirer la classe puis lire une métrique force le navigateur à recalculer :
  // sans ce détour, une seconde secousse pendant la première ne redémarre pas
  // l'animation — et c'est justement quand ça s'enchaîne qu'on veut la sentir.
  root.classList.remove('sf-quake');
  void root.offsetWidth;
  root.classList.add('sf-quake');
}
