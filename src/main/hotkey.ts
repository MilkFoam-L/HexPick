import { globalShortcut } from 'electron';

/** 管理唯一的全局快捷键；录制新快捷键时可暂停，避免按下旧组合键时弹出浮层。 */
export class Hotkey {
  private accelerator: string | null = null;
  private suspended = false;

  constructor(private readonly onPress: () => void) {}

  /** 注册成功返回 true；失败时保持原快捷键不变 */
  set(accelerator: string): boolean {
    const prev = this.accelerator;
    if (prev) globalShortcut.unregister(prev);
    let ok = false;
    try {
      ok = globalShortcut.register(accelerator, this.onPress);
    } catch (e) {
      console.warn('[hotkey] 注册异常：', e);
    }
    if (ok) {
      this.accelerator = accelerator;
      if (this.suspended) globalShortcut.unregister(accelerator);
      return true;
    }
    if (prev && !this.suspended) globalShortcut.register(prev, this.onPress);
    return false;
  }

  get registered(): string | null {
    return this.accelerator;
  }

  suspend(suspended: boolean): void {
    if (suspended === this.suspended) return;
    this.suspended = suspended;
    if (!this.accelerator) return;
    if (suspended) globalShortcut.unregister(this.accelerator);
    else globalShortcut.register(this.accelerator, this.onPress);
  }

  dispose(): void {
    globalShortcut.unregisterAll();
  }
}
