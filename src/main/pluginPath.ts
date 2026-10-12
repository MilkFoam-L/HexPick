import { realpath } from 'node:fs/promises';
import { extname, join, sep } from 'node:path';
import { isSafeRelativePath } from '../shared/plugin';

/** 插件只允许提供这些静态资源 */
const ALLOWED_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif',
  '.mp3', '.wav', '.ogg', '.m4a', '.woff', '.woff2', '.ttf', '.otf',
]);

/** 解析 hexpick-plugin://p/<文件夹>/<相对路径>，返回插件目录内的真实文件路径；越界返回 null。 */
export async function resolvePluginFile(root: string, url: string): Promise<string | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.host !== 'p') return null;
  const [dirEnc, ...rest] = u.pathname.replace(/^\//, '').split('/');
  let dir: string;
  let rel: string;
  try {
    dir = decodeURIComponent(dirEnc ?? '');
    rel = rest.map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
  if (!dir || dir.includes('/') || dir.startsWith('.') || !isSafeRelativePath(rel)) return null;
  if (!ALLOWED_EXT.has(extname(rel).toLowerCase())) return null;
  try {
    const realRoot = await realpath(join(root, dir));
    const real = await realpath(join(realRoot, rel));
    return real.startsWith(realRoot + sep) ? real : null; // 防止符号链接指向插件目录之外
  } catch {
    return null;
  }
}
