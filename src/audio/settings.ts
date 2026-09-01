export interface AudioSettings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
}

/** Le sous-ensemble de `localStorage` dont on a besoin. Injecté plutôt qu'importé :
 *  c'est ce qui rend la migration testable hors navigateur. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'spinforge.audio';
/** Le mute global d'avant les trois interrupteurs. */
const LEGACY_KEY = 'spinforge.muted';

const ALL_ON: AudioSettings = { music: true, sfx: true, haptics: true };

export function loadSettings(store: KeyValueStore): AudioSettings {
  const raw = store.getItem(KEY);
  if (raw === null) {
    const legacy = store.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const migrated: AudioSettings =
        legacy === '1' ? { music: false, sfx: false, haptics: false } : { ...ALL_ON };
      saveSettings(store, migrated);
      // Retirée pour de bon : la laisser ferait rejouer la migration au prochain
      // chargement et écraserait les réglages faits entre-temps.
      store.removeItem(LEGACY_KEY);
      return migrated;
    }
    return { ...ALL_ON };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    // Tout ce qui n'est pas explicitement `false` est allumé : une clé ajoutée
    // plus tard arrive donc active, sans migration.
    return {
      music: parsed.music !== false,
      sfx: parsed.sfx !== false,
      haptics: parsed.haptics !== false,
    };
  } catch {
    return { ...ALL_ON };
  }
}

export function saveSettings(store: KeyValueStore, settings: AudioSettings): void {
  store.setItem(KEY, JSON.stringify(settings));
}
