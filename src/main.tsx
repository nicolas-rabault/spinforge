import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import { createRoot } from 'react-dom/client';
import './ui/anim.css';
import { applyThemeToDocument } from './theme';
import { getLang } from './i18n';
import { App } from './ui/App';

applyThemeToDocument();
// `index.html` annonce `lang="fr"`, la langue source du dépôt ; la vraie langue
// n'est connue qu'ici, une fois le navigateur et le choix stocké consultés.
document.documentElement.lang = getLang();
createRoot(document.getElementById('root')!).render(<App />);
