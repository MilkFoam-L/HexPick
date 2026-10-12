import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const PLUGINS_DIR = resolve('plugins');
const MIME: Record<string, string> = { '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };

/** 演示模式下把仓库 plugins/ 挂到 /plugins/，模拟 Electron 里的插件资源协议 */
function servePlugins(): Plugin {
  return {
    name: 'hexpick-demo-plugins',
    configureServer(server) {
      server.middlewares.use('/plugins', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]);
        const file = join(PLUGINS_DIR, rel);
        if (!file.startsWith(PLUGINS_DIR + sep) || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
        createReadStream(file).pipe(res);
      });
    },
  };
}

// 浏览器演示模式：不经过 Electron，直接用内置插件跑浮层 UI，方便调样式和截图。
export default defineConfig({
  root: resolve('src/renderer'),
  publicDir: resolve('assets'),
  plugins: [react(), servePlugins()],
  define: { __WEB_DEMO__: 'true' },
  server: { port: 5199, strictPort: true },
});
