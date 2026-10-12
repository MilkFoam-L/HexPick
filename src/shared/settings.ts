import { DEFAULT_HOTKEY, isValidAccelerator } from './hotkey';

export interface Settings {
  readonly hotkey: string;
  readonly volume: number;
  readonly muted: boolean;
  readonly disabledPlugins: readonly string[];
  readonly lastPluginId: string | null;
  readonly launchAtLogin: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: DEFAULT_HOTKEY,
  volume: 0.6,
  muted: false,
  disabledPlugins: [],
  lastPluginId: null,
  launchAtLogin: false,
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);

/** 合并补丁并逐字段校验；非法字段保持原值，保证设置文件被手改坏也能启动。 */
export function mergeSettings(base: Settings, patch: unknown): Settings {
  if (!isObj(patch)) return base;
  const out: { -readonly [K in keyof Settings]: Settings[K] } = { ...base };
  if (isValidAccelerator(patch.hotkey)) out.hotkey = patch.hotkey;
  if (typeof patch.volume === 'number' && Number.isFinite(patch.volume)) out.volume = Math.min(1, Math.max(0, patch.volume));
  if (typeof patch.muted === 'boolean') out.muted = patch.muted;
  if (Array.isArray(patch.disabledPlugins)) out.disabledPlugins = [...new Set(patch.disabledPlugins.filter(isId))].slice(0, 500);
  if (patch.lastPluginId === null || isId(patch.lastPluginId)) out.lastPluginId = patch.lastPluginId;
  if (typeof patch.launchAtLogin === 'boolean') out.launchAtLogin = patch.launchAtLogin;
  return out;
}
