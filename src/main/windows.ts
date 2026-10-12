import { app, BrowserWindow, screen, shell } from 'electron';
import { IPC } from '../shared/ipc';
import { pageUrl, preloadPath } from './paths';

const SECURE_PREFS = {
  preload: preloadPath(),
  sandbox: true,
  contextIsolation: true,
  nodeIntegration: false,
  spellcheck: false,
} as const;

function lockDown(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault();
  });
}

function load(win: BrowserWindow, page: 'index' | 'settings'): void {
  const { url, file } = pageUrl(page);
  void (url ? win.loadURL(url) : win.loadFile(file as string));
}

/** 全屏透明浮层：出现在鼠标所在屏幕，所有桌面空间和全屏应用之上。 */
export class OverlayWindow {
  private win: BrowserWindow | null = null;

  create(): void {
    const win = new BrowserWindow({
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      type: 'panel',
      webPreferences: { ...SECURE_PREFS, backgroundThrottling: false },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    lockDown(win);
    load(win, 'index');
    win.on('closed', () => (this.win = null));
    this.win = win;
  }

  get webContents() {
    return this.win?.webContents ?? null;
  }

  toggle(): void {
    if (this.win?.isVisible() && this.win.isFocused()) this.hide();
    else this.show();
  }

  show(): void {
    if (!this.win) this.create();
    const win = this.win as BrowserWindow;
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    win.setBounds(display.bounds);
    win.show();
    app.focus({ steal: true });
    win.focus();
    win.webContents.send(IPC.overlayShown);
  }

  hide(): void {
    if (!this.win?.isVisible()) return;
    this.win.hide();
    // 没有其它可见窗口时把焦点还给之前的应用
    if (!BrowserWindow.getAllWindows().some((w) => w.isVisible())) app.hide();
  }
}

export class SettingsWindow {
  private win: BrowserWindow | null = null;

  show(): void {
    if (this.win) {
      this.win.show();
      this.win.focus();
      return;
    }
    const win = new BrowserWindow({
      width: 720,
      height: 640,
      minWidth: 600,
      minHeight: 480,
      show: false,
      title: 'HexPick 设置',
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
      webPreferences: SECURE_PREFS,
    });
    lockDown(win);
    load(win, 'settings');
    win.once('ready-to-show', () => {
      win.show();
      app.focus({ steal: true });
    });
    win.on('closed', () => (this.win = null));
    this.win = win;
  }

  get webContents() {
    return this.win?.webContents ?? null;
  }
}

export const openPath = (p: string): void => void shell.openPath(p);
