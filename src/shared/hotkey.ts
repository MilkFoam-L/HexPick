/** 快捷键：Electron accelerator 字符串 ⇄ 键盘事件 ⇄ macOS 符号显示。 */

export const DEFAULT_HOTKEY = 'Command+H';

const MODIFIERS = ['Command', 'Control', 'Alt', 'Shift'] as const;
type Modifier = (typeof MODIFIERS)[number];
const MOD_SYMBOL: Record<Modifier, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘' };
/** macOS 习惯的修饰键显示顺序 */
const MOD_ORDER: readonly Modifier[] = ['Control', 'Alt', 'Shift', 'Command'];

const NAMED_KEYS: Record<string, string> = {
  Space: 'Space', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Enter: 'Enter',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`',
};
const KEY_SYMBOL: Record<string, string> = {
  Space: '空格', Tab: '⇥', Backspace: '⌫', Delete: '⌦', Enter: '↩', Up: '↑', Down: '↓', Left: '←', Right: '→',
};

const VALID_KEYS = new Set<string>([
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
  ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
  ...Object.values(NAMED_KEYS),
]);

/** 用 KeyboardEvent.code 而不是 key：按住 ⌥ 时 key 会变成特殊字符。 */
export function keyFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  return NAMED_KEYS[code] ?? null;
}

export interface KeyLike {
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export type RecordResult = { kind: 'combo'; accelerator: string } | { kind: 'pending' } | { kind: 'invalid'; reason: string };

/** 把一次按键转成 accelerator。只按修饰键时返回 pending，等待主键。 */
export function acceleratorFromEvent(e: KeyLike): RecordResult {
  const key = keyFromCode(e.code);
  const mods: Modifier[] = [];
  if (e.metaKey) mods.push('Command');
  if (e.ctrlKey) mods.push('Control');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (!key) return /^(Meta|Control|Alt|Shift)(Left|Right)$/.test(e.code) ? { kind: 'pending' } : { kind: 'invalid', reason: '不支持这个按键' };
  const isFn = /^F\d+$/.test(key);
  if (mods.length === 0 && !isFn) return { kind: 'invalid', reason: '至少需要一个修饰键（⌘ ⌥ ⌃ ⇧）' };
  if (mods.length === 1 && mods[0] === 'Shift' && !isFn) return { kind: 'invalid', reason: '仅 ⇧ 会和打字冲突，请再加一个修饰键' };
  return { kind: 'combo', accelerator: [...mods, key].join('+') };
}

export function isValidAccelerator(acc: unknown): acc is string {
  if (typeof acc !== 'string' || acc.length > 60) return false;
  const parts = acc.split('+');
  // 处理 “Command+Shift+=” 这种主键本身是符号的情况；'+' 键不支持
  const key = parts.pop();
  if (!key || !VALID_KEYS.has(key)) return false;
  if (new Set(parts).size !== parts.length) return false;
  if (!parts.every((p) => (MODIFIERS as readonly string[]).includes(p))) return false;
  return parts.length > 0 || /^F\d+$/.test(key);
}

export function formatAccelerator(acc: string): string {
  const parts = acc.split('+');
  const key = parts.pop() ?? '';
  const mods = MOD_ORDER.filter((m) => parts.includes(m)).map((m) => MOD_SYMBOL[m]);
  return mods.join('') + (KEY_SYMBOL[key] ?? key);
}
