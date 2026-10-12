import { Menu, nativeImage, Tray } from 'electron';
import { join } from 'node:path';
import { formatAccelerator } from '../shared/hotkey';
import type { PluginSnapshot } from '../shared/ipc';
import type { Settings } from '../shared/settings';
import { resourcesDir } from './paths';

export interface TrayActions {
  show(): void;
  choosePlugin(id: string): void;
  openPluginsDir(): void;
  reloadPlugins(): void;
  openSettings(): void;
  quit(): void;
}

export class AppTray {
  private readonly tray: Tray;

  constructor(private readonly actions: TrayActions) {
    const icon = nativeImage.createFromPath(join(resourcesDir(), 'trayTemplate.png'));
    icon.setTemplateImage(true);
    this.tray = new Tray(icon);
    this.tray.setToolTip('HexPick');
  }

  update(settings: Settings, plugins: PluginSnapshot, hotkeyOk: boolean): void {
    const enabled = plugins.plugins.filter((p) => p.enabled);
    const hotkeyLabel = hotkeyOk ? formatAccelerator(settings.hotkey) : '快捷键不可用';
    const menu = Menu.buildFromTemplate([
      { label: `呼出 HexPick　${hotkeyLabel}`, click: () => this.actions.show() },
      {
        label: '插件',
        submenu: enabled.length
          ? enabled.map((p) => ({
              label: `${p.plugin.icon && p.plugin.icon.length <= 4 ? `${p.plugin.icon} ` : ''}${p.plugin.name}`,
              type: 'radio' as const,
              checked: p.plugin.id === settings.lastPluginId,
              click: () => this.actions.choosePlugin(p.plugin.id),
            }))
          : [{ label: '没有可用插件', enabled: false }],
      },
      ...(plugins.errors.length ? [{ label: `⚠️ ${plugins.errors.length} 个插件加载失败`, click: () => this.actions.openSettings() }] : []),
      { type: 'separator' },
      { label: '打开插件目录', click: () => this.actions.openPluginsDir() },
      { label: '重新加载插件', click: () => this.actions.reloadPlugins() },
      { label: '设置…', accelerator: 'Command+,', click: () => this.actions.openSettings() },
      { type: 'separator' },
      { label: '退出 HexPick', accelerator: 'Command+Q', click: () => this.actions.quit() },
    ]);
    this.tray.setContextMenu(menu);
  }
}
