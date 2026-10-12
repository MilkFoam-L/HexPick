/** 浏览器演示用的假 bridge：直接读取仓库里的示例插件，资源由 vite.web.config.ts 挂在 /plugins/ 下。 */
import { rewriteCssUrls } from '../../shared/css';
import type { HexpickBridge, LoadedPlugin, PluginLoadError, PluginSnapshot } from '../../shared/ipc';
import { parsePlugin } from '../../shared/plugin';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '../../shared/settings';

const manifests = import.meta.glob('../../../plugins/*/plugin.json', { eager: true, import: 'default' });
const texts = import.meta.glob('../../../plugins/*/*.{html,css}', { eager: true, query: '?raw', import: 'default' }) as Record<
  string,
  string
>;

function load(): PluginSnapshot {
  const plugins: LoadedPlugin[] = [];
  const errors: PluginLoadError[] = [];
  for (const [path, raw] of Object.entries(manifests)) {
    const dir = path.split('/').slice(-2)[0];
    const r = parsePlugin(raw, dir.replace(/[^A-Za-z0-9_-]/g, '_'));
    if (!r.ok) {
      errors.push({ dir, error: r.error });
      continue;
    }
    const baseUrl = `/plugins/${encodeURIComponent(dir)}/`;
    const text = (f?: string) => (f ? texts[`../../../plugins/${dir}/${f}`] : undefined);
    const style = text(r.plugin.style);
    plugins.push({
      plugin: r.plugin,
      dir,
      baseUrl,
      template: text(r.plugin.template),
      style: style ? rewriteCssUrls(style, baseUrl) : undefined,
      enabled: true,
    });
  }
  return { plugins, errors, rootPath: '(演示模式)' };
}

export function createDemoBridge(): HexpickBridge {
  const snapshot = load();
  let settings: Settings = { ...DEFAULT_SETTINGS, lastPluginId: new URLSearchParams(location.search).get('plugin') };
  const settingsListeners = new Set<(s: Settings) => void>();
  const noop = () => undefined;
  return {
    getPlugins: async () => snapshot,
    onPluginsChanged: () => noop,
    reloadPlugins: async () => snapshot,
    openPluginsDir: noop,
    createPlugin: async () => '',
    restoreExamples: async () => snapshot,
    getSettings: async () => settings,
    setSettings: async (patch) => {
      settings = mergeSettings(settings, patch);
      settingsListeners.forEach((l) => l(settings));
      return settings;
    },
    onSettingsChanged: (cb) => {
      settingsListeners.add(cb);
      return () => settingsListeners.delete(cb);
    },
    setHotkey: async (acc) => {
      settings = mergeSettings(settings, { hotkey: acc });
      settingsListeners.forEach((l) => l(settings));
      return { ok: true, settings };
    },
    suspendHotkey: noop,
    openSettings: noop,
    hideOverlay: noop,
    onOverlayShown: () => noop,
  };
}
