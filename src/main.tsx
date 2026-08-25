import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import { createRoot } from 'react-dom/client';
import { applyThemeToDocument } from './theme';
import { Game } from './ui/Game';

applyThemeToDocument();
createRoot(document.getElementById('root')!).render(<Game />);
