import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings, type KeyValueStore } from './settings';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
    dump: () => ({ ...data }),
  };
}

describe('les réglages du son', () => {
  it('donne les trois interrupteurs allumés sur une installation neuve', () => {
    expect(loadSettings(fakeStore())).toEqual({ music: true, sfx: true, haptics: true });
  });

  it("migre l'ancien mute global vers les trois interrupteurs éteints", () => {
    const store = fakeStore({ 'spinforge.muted': '1' });
    expect(loadSettings(store)).toEqual({ music: false, sfx: false, haptics: false });
    // L'ancienne clé disparaît : sans ça, la migration se rejouerait à chaque
    // chargement et écraserait les réglages faits depuis.
    expect(store.dump()['spinforge.muted']).toBeUndefined();
    expect(store.dump()['spinforge.audio']).toBeDefined();
  });

  it("migre un ancien son actif vers les trois allumés", () => {
    const store = fakeStore({ 'spinforge.muted': '0' });
    expect(loadSettings(store)).toEqual({ music: true, sfx: true, haptics: true });
    // Sans cette ligne le test reste vert quand on supprime toute la migration :
    // « installation neuve » rend exactement le même trio allumé. C'est la clé
    // consommée qui distingue les deux chemins.
    expect(store.dump()['spinforge.muted']).toBeUndefined();
  });

  it('ignore un JSON corrompu au lieu de casser le démarrage', () => {
    expect(loadSettings(fakeStore({ 'spinforge.audio': '{oops' })))
      .toEqual({ music: true, sfx: true, haptics: true });
  });

  it('relit ce qui a été écrit, y compris un seul interrupteur éteint', () => {
    const store = fakeStore();
    saveSettings(store, { music: false, sfx: true, haptics: true });
    expect(loadSettings(store)).toEqual({ music: false, sfx: true, haptics: true });
  });

  it('ne rejoue pas la migration quand les deux clés coexistent', () => {
    const store = fakeStore({
      'spinforge.muted': '1',
      'spinforge.audio': '{"music":true,"sfx":true,"haptics":true}',
    });
    expect(loadSettings(store)).toEqual({ music: true, sfx: true, haptics: true });
  });
});
