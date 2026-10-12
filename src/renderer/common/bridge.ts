import type { HexpickBridge } from '../../shared/ipc';

let cached: Promise<HexpickBridge> | null = null;

/** Electron 中由 preload 注入；浏览器演示模式下用内置示例插件模拟。 */
export function getBridge(): Promise<HexpickBridge> {
  if (!cached) {
    cached = (async () => {
      if (window.hexpick) return window.hexpick;
      if (__WEB_DEMO__) return (await import('./demoBridge')).createDemoBridge();
      throw new Error('HexPick bridge 未注入');
    })();
  }
  return cached;
}
