import { audio } from '../audio/audio';
import { t } from '../i18n';
import type { AudioSettings as Settings } from '../audio/settings';

const ROWS = [
  { key: 'music', label: 'audio.music' },
  { key: 'sfx', label: 'audio.sfx' },
  { key: 'haptics', label: 'audio.haptics' },
] as const;

/** Trois interrupteurs plutôt qu'un mute global : couper la musique en gardant
 *  les chocs est le réglage que cherchent les joueurs mobiles, et il était
 *  impossible. Le panneau lit et écrit directement le singleton — il n'y a pas
 *  d'état à remonter, `onChanged` sert seulement à redessiner l'icône. */
export function AudioSettings({ settings, onChanged, onClose }: {
  settings: Settings;
  onChanged: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(6,8,12,.6)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 52, right: 12, width: 208, padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
          border: '1px solid var(--line)', borderRadius: 11, background: 'var(--panel)',
        }}
      >
        {ROWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { audio.setSetting(key, !settings[key]); onChanged(); }}
            aria-pressed={settings[key]}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 40, padding: '0 10px', borderRadius: 9, cursor: 'pointer',
              border: '1px solid var(--line)', background: 'var(--bg)',
              color: settings[key] ? 'var(--text)' : 'var(--muted)',
              font: '500 13.5px Oswald, ui-sans-serif, sans-serif',
            }}
          >
            <span>{t(label)}</span>
            {/* L'état se lit sur la pastille, pas sur un mot : trois lignes qui
                diraient « activé / désactivé » se relisent une par une. */}
            <span
              style={{
                width: 30, height: 17, borderRadius: 999, padding: 2,
                background: settings[key] ? 'var(--ember)' : 'var(--line)',
                display: 'flex', justifyContent: settings[key] ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--ink)' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
