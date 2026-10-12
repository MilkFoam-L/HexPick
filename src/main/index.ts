import { app, Notification } from 'electron';
import { IPC } from '../shared/ipc';
import { Hotkey } from './hotkey';
import { registerIpc } from './ipcHandlers';
import { bundledPluginsDir, pluginsRoot, settingsFile } from './paths';
import { handlePluginScheme, registerPluginScheme } from './pluginProtocol';
import { PluginStore } from './pluginStore';
import { SettingsStore } from './settingsStore';
import { AppTray } from './tray';
import { openPath, OverlayWindow, SettingsWindow } from './windows';

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  registerPluginScheme();
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  app.dock?.hide();

  const settings = new SettingsStore(settingsFile());
  const plugins = new PluginStore(pluginsRoot(), bundledPluginsDir(), new Set(settings.get().disabledPlugins));
  const overlay = new OverlayWindow();
  const settingsWindow = new SettingsWindow();
  const hotkey = new Hotkey(() => overlay.toggle());

  handlePluginScheme(pluginsRoot);
  await plugins.start();
  overlay.create();

  const tray = new AppTray({
    show: () => overlay.show(),
    choosePlugin: (id) => {
      settings.update({ lastPluginId: id });
      overlay.show();
    },
    openPluginsDir: () => openPath(pluginsRoot()),
    reloadPlugins: () => void plugins.reload(),
    openSettings: () => settingsWindow.show(),
    quit: () => app.quit(),
  });
  const refreshTray = () => tray.update(settings.get(), plugins.get(), hotkey.registered !== null);

  const broadcast = (channel: string, payload: unknown) => {
    overlay.webContents?.send(channel, payload);
    settingsWindow.webContents?.send(channel, payload);
  };
  plugins.on('changed', (snap) => {
    broadcast(IPC.pluginsChanged, snap);
    refreshTray();
  });
  settings.on('changed', (s) => {
    broadcast(IPC.settingsChanged, s);
    plugins.setDisabled(new Set(s.disabledPlugins));
    app.setLoginItemSettings({ openAtLogin: s.launchAtLogin });
    refreshTray();
  });

  registerIpc({ settings, plugins, hotkey, overlay, settingsWindow, onHotkeyChanged: refreshTray });

  if (!hotkey.set(settings.get().hotkey)) {
    new Notification({ title: 'HexPick', body: '快捷键注册失败，可能被其它应用占用。请在设置里换一个组合键。' }).show();
    settingsWindow.show();
  }
  refreshTray();

  // 已在运行时再次打开应用 = 呼出浮层
  app.on('second-instance', () => overlay.show());
  app.on('will-quit', () => {
    hotkey.dispose();
    plugins.stop();
  });
  // 菜单栏应用：关闭所有窗口不退出
  app.on('window-all-closed', () => undefined);
}
