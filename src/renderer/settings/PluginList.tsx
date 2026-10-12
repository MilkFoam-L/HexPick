import type { HexpickBridge, PluginSnapshot } from '../../shared/ipc';
import type { Settings } from '../../shared/settings';

const LAYOUT_LABEL = { augment: '强化卡', portrait: '头像', text: '大字' } as const;

export function PluginList({ bridge, snapshot, settings }: { bridge: HexpickBridge; snapshot: PluginSnapshot; settings: Settings }) {
  const toggle = (id: string, enabled: boolean) => {
    const set = new Set(settings.disabledPlugins);
    if (enabled) set.delete(id);
    else set.add(id);
    void bridge.setSettings({ disabledPlugins: [...set] });
  };

  return (
    <>
      <ul className="plugins">
        {snapshot.plugins.map(({ plugin, dir, enabled, template }) => (
          <li key={plugin.id} className={`plugin ${enabled ? '' : 'is-off'}`}>
            <span className="plugin__icon" aria-hidden>
              {plugin.icon && plugin.icon.length <= 4 ? plugin.icon : '⬢'}
            </span>
            <span className="plugin__main">
              <span className="plugin__name">{plugin.name}</span>
              <span className="plugin__meta">
                {plugin.items.length} 项 · {template ? '自定义模板' : LAYOUT_LABEL[plugin.layout]} · 一局 {plugin.rules.screens} 次 · {dir}/
              </span>
            </span>
            <button type="button" className="link" onClick={() => bridge.openPluginsDir(dir)}>
              打开
            </button>
            <label className="switch" aria-label={`启用 ${plugin.name}`}>
              <input type="checkbox" checked={enabled} onChange={(e) => toggle(plugin.id, e.target.checked)} />
              <span />
            </label>
          </li>
        ))}
        {snapshot.plugins.length === 0 && <li className="plugin is-empty">插件目录里还没有插件。</li>}
      </ul>

      {snapshot.errors.length > 0 && (
        <ul className="errors" aria-label="加载失败的插件">
          {snapshot.errors.map((e) => (
            <li key={e.dir}>
              <b>{e.dir}/</b> {e.error}
            </li>
          ))}
        </ul>
      )}

      <div className="row-actions">
        <button type="button" className="btn btn--primary" onClick={() => void bridge.createPlugin()}>
          新建插件
        </button>
        <button type="button" className="btn" onClick={() => bridge.openPluginsDir()}>
          打开插件目录
        </button>
        <button type="button" className="btn" onClick={() => void bridge.reloadPlugins()}>
          重新加载
        </button>
        <button type="button" className="btn" onClick={() => void bridge.restoreExamples()}>
          恢复示例插件
        </button>
        <button type="button" className="btn" onClick={() => bridge.openPluginsDir('README.md')}>
          插件编写指南
        </button>
      </div>
      <p className="hint">插件目录：{snapshot.rootPath}。保存文件后自动生效。</p>
    </>
  );
}
