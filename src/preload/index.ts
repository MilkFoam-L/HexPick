import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type HexpickBridge } from '../shared/ipc';

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const bridge: HexpickBridge = {
  getPlugins: () => ipcRenderer.invoke(IPC.pluginsGet),
  onPluginsChanged: (cb) => subscribe(IPC.pluginsChanged, cb),
  reloadPlugins: () => ipcRenderer.invoke(IPC.pluginsReload),
  openPluginsDir: (dir) => ipcRenderer.send(IPC.pluginsOpenDir, dir),
  createPlugin: () => ipcRenderer.invoke(IPC.pluginsCreate),
  restoreExamples: () => ipcRenderer.invoke(IPC.pluginsRestoreExamples),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  setSettings: (patch) => ipcRenderer.invoke(IPC.settingsSet, patch),
  onSettingsChanged: (cb) => subscribe(IPC.settingsChanged, cb),
  setHotkey: (acc) => ipcRenderer.invoke(IPC.hotkeySet, acc),
  suspendHotkey: (s) => ipcRenderer.send(IPC.hotkeySuspend, s),
  openSettings: () => ipcRenderer.send(IPC.settingsOpen),
  hideOverlay: () => ipcRenderer.send(IPC.overlayHide),
  onOverlayShown: (cb) => subscribe(IPC.overlayShown, () => cb()),
};

contextBridge.exposeInMainWorld('hexpick', bridge);
