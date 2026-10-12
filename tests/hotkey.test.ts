import { describe, expect, it } from 'vitest';
import { acceleratorFromEvent, formatAccelerator, isValidAccelerator } from '../src/shared/hotkey';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/shared/settings';

const ev = (code: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
  code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods,
});

describe('hotkey', () => {
  it('records combos from physical key codes', () => {
    expect(acceleratorFromEvent(ev('KeyH', { metaKey: true }))).toEqual({ kind: 'combo', accelerator: 'Command+H' });
    expect(acceleratorFromEvent(ev('Digit1', { altKey: true, shiftKey: true }))).toEqual({ kind: 'combo', accelerator: 'Alt+Shift+1' });
    expect(acceleratorFromEvent(ev('F5'))).toEqual({ kind: 'combo', accelerator: 'F5' });
    expect(acceleratorFromEvent(ev('Space', { ctrlKey: true }))).toEqual({ kind: 'combo', accelerator: 'Control+Space' });
  });

  it('waits while only modifiers are held and rejects unsafe combos', () => {
    expect(acceleratorFromEvent(ev('MetaLeft', { metaKey: true }))).toEqual({ kind: 'pending' });
    expect(acceleratorFromEvent(ev('KeyA')).kind).toBe('invalid');
    expect(acceleratorFromEvent(ev('KeyA', { shiftKey: true })).kind).toBe('invalid');
    expect(acceleratorFromEvent(ev('IntlRo', { metaKey: true })).kind).toBe('invalid');
  });

  it('validates accelerators', () => {
    for (const ok of ['Command+H', 'Control+Alt+Space', 'F12', 'Command+Shift+=', 'Command+/']) expect(isValidAccelerator(ok)).toBe(true);
    for (const bad of ['H', 'Command', 'Command+Command+H', 'Super+H', 'Command+Plus', '', 42]) expect(isValidAccelerator(bad)).toBe(false);
  });

  it('formats with mac symbols in canonical order', () => {
    expect(formatAccelerator('Command+H')).toBe('⌘H');
    expect(formatAccelerator('Shift+Command+Alt+Space')).toBe('⌥⇧⌘空格');
  });
});

describe('settings', () => {
  it('keeps valid fields and ignores invalid ones', () => {
    const s = mergeSettings(DEFAULT_SETTINGS, { hotkey: 'nope', volume: 3, muted: true, disabledPlugins: ['a', 'a', '../x'], lastPluginId: 'food' });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, volume: 1, muted: true, disabledPlugins: ['a'], lastPluginId: 'food' });
    expect(mergeSettings(DEFAULT_SETTINGS, 'garbage')).toBe(DEFAULT_SETTINGS);
  });
});
