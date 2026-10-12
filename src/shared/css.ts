import { isSafeRelativePath } from './plugin';

/** 把插件 CSS 里的相对 url() 改写成插件资源协议地址；越界路径直接移除。 */
export function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_m, _q: string, raw: string) => {
    const p = raw.trim();
    if (p.startsWith('data:')) return `url("${p}")`;
    return isSafeRelativePath(p) ? `url("${baseUrl}${p}")` : 'url("")';
  });
}
