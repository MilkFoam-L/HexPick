import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import { isValidAccelerator } from '../shared/hotkey';
import { IPC, type HotkeyResult } from '../shared/ipc';
import type { Hotkey } from './hotkey';
import type { PluginStore } from './pluginStore';
import type { SettingsStore } from './settingsStore';
import { openPath, type OverlayWindow, type SettingsWindow } from './windows';

export interface IpcDeps {
  readonly settings: SettingsStore;
  readonly plugins: PluginStore;
  readonly hotkey: Hotkey;
  readonly overlay: OverlayWindow;
  readonly settingsWindow: SettingsWindow;
  readonly onHotkeyChanged: () => void;
}

/** 只接受来自本应用窗口（本地页面或 dev server）的消息 */
function trusted(e: IpcMainEvent | IpcMainInvokeEvent): boolean {
  const url = e.senderFrame?.url ?? '';
  return url.startsWith('file://') || (!!process.env.ELECTRON_RENDERER_URL && url.startsWith(process.env.ELECTRON_RENDERER_URL));
}

const isDirName = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length < 200 && !v.includes('/') && !v.startsWith('.');

export function registerIpc(d: IpcDeps): void {
  const handle = (ch: string, fn: (...args: unknown[]) => unknown) =>
    ipcMain.handle(ch, (e, ...args) => {
      if (!trusted(e)) throw new Error('untrusted sender');
      return fn(...args);
    });
  const on = (ch: string, fn: (...args: unknown[]) => void) =>
    ipcMain.on(ch, (e, ...args) => {
      if (trusted(e)) fn(...args);
    });

  handle(IPC.pluginsGet, () => d.plugins.get());
  handle(IPC.pluginsReload, () => d.plugins.reload());
  handle(IPC.pluginsRestoreExamples, async () => {
    await d.plugins.restoreExamples();
    return d.plugins.reload();
  });
  handle(IPC.pluginsCreate, async () => {
    const dir = await d.plugins.createPlugin();
    openPath(dir);
    return dir;
  });
  on(IPC.pluginsOpenDir, (dir) => {
    const root = d.plugins.get().rootPath;
    openPath(isDirName(dir) ? `${root}/${dir}` : root);
  });

  handle(IPC.settingsGet, () => d.settings.get());
  handle(IPC.settingsSet, (patch) => {
    // 快捷键必须走 hotkeySet，确保先注册成功再保存
    const { hotkey: _ignored, ...rest } = (typeof patch === 'object' && patch ? patch : {}) as Record<string, unknown>;
    return d.settings.update(rest);
  });
  handle(IPC.hotkeySet, (acc): HotkeyResult => {
    if (!isValidAccelerator(acc)) return { ok: false, error: '无效的组合键' };
    if (!d.hotkey.set(acc)) return { ok: false, error: '注册失败：该组合键可能已被系统或其它应用占用' };
    const settings = d.settings.update({ hotkey: acc });
    d.onHotkeyChanged();
    return { ok: true, settings };
  });
  on(IPC.hotkeySuspend, (s) => d.hotkey.suspend(s === true));

  on(IPC.settingsOpen, () => d.settingsWindow.show());
  on(IPC.overlayHide, () => d.overlay.hide());
}
