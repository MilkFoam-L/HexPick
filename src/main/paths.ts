import { app } from 'electron';
import { join } from 'node:path';

export const pluginsRoot = (): string => join(app.getPath('userData'), 'plugins');
export const settingsFile = (): string => join(app.getPath('userData'), 'settings.json');

/** 随应用打包的示例插件 */
export const bundledPluginsDir = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'plugins') : join(app.getAppPath(), 'plugins');

export const resourcesDir = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'resources') : join(app.getAppPath(), 'resources');

export const preloadPath = (): string => join(__dirname, '../preload/index.js');

/** 开发时走 electron-vite dev server，打包后读本地文件 */
export function pageUrl(page: 'index' | 'settings'): { url?: string; file?: string } {
  const dev = process.env.ELECTRON_RENDERER_URL;
  if (dev) return { url: `${dev}/${page}.html` };
  return { file: join(__dirname, `../renderer/${page}.html`) };
}
