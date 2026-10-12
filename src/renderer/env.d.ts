import type { HexpickBridge } from '../shared/ipc';

declare global {
  interface Window {
    hexpick?: HexpickBridge;
  }
  /** 浏览器演示模式（vite.web.config.ts）为 true，Electron 构建为 false */
  const __WEB_DEMO__: boolean;
}

export {};
