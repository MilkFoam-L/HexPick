import type { PickPlugin } from './plugin';
import type { Settings } from './settings';

export const IPC = {
  pluginsGet: 'plugins:get',
  pluginsChanged: 'plugins:changed',
  pluginsReload: 'plugins:reload',
  pluginsOpenDir: 'plugins:open-dir',
  pluginsCreate: 'plugins:create',
  pluginsRestoreExamples: 'plugins:restore-examples',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsChanged: 'settings:changed',
  settingsOpen: 'settings:open',
  hotkeySet: 'hotkey:set',
  hotkeySuspend: 'hotkey:suspend',
  overlayHide: 'overlay:hide',
  overlayShown: 'overlay:shown',
} as const;

export const PLUGIN_SCHEME = 'hexpick-plugin';

export interface LoadedPlugin {
  readonly plugin: PickPlugin;
  /** 插件文件夹名 */
  readonly dir: string;
  /** 插件资源的基础 URL，以 / 结尾 */
  readonly baseUrl: string;
  readonly template?: string;
  readonly style?: string;
  readonly enabled: boolean;
}

export interface PluginLoadError {
  readonly dir: string;
  readonly error: string;
}

export interface PluginSnapshot {
  readonly plugins: readonly LoadedPlugin[];
  readonly errors: readonly PluginLoadError[];
  readonly rootPath: string;
}

export type HotkeyResult = { ok: true; settings: Settings } | { ok: false; error: string };

/** preload 暴露给渲染进程的 API（window.hexpick） */
export interface HexpickBridge {
  getPlugins(): Promise<PluginSnapshot>;
  onPluginsChanged(cb: (s: PluginSnapshot) => void): () => void;
  reloadPlugins(): Promise<PluginSnapshot>;
  openPluginsDir(dir?: string): void;
  createPlugin(): Promise<string>;
  restoreExamples(): Promise<PluginSnapshot>;
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Settings>): Promise<Settings>;
  onSettingsChanged(cb: (s: Settings) => void): () => void;
  setHotkey(accelerator: string): Promise<HotkeyResult>;
  suspendHotkey(suspended: boolean): void;
  openSettings(): void;
  hideOverlay(): void;
  onOverlayShown(cb: () => void): () => void;
}
