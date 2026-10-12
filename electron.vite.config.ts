import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';

/**
 * 只在打包时注入内容安全策略：禁止内联脚本、外部网络和插件目录之外的资源。
 * 开发时 React Fast Refresh 需要内联脚本，所以 dev 不注入。
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: hexpick-plugin:",
  "media-src 'self' data: hexpick-plugin:",
  "font-src 'self' data: hexpick-plugin:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'hexpick-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { index: resolve('src/main/index.ts') },
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') },
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    base: './',
    publicDir: resolve('assets'),
    plugins: [react(), cspPlugin()],
    define: { __WEB_DEMO__: 'false' },
    build: {
      minify: 'esbuild',
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html'), settings: resolve('src/renderer/settings.html') },
      },
    },
  },
});
