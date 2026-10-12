import type { CSSProperties } from 'react';
import { BUILTIN_BACKGROUNDS, GAME_ICON_PATTERN, isAssetPath, RARITIES, type PickPlugin } from '../../shared/plugin';

/** 插件资源相对路径 → 可加载的 URL */
export const assetUrl = (baseUrl: string, path: string): string => baseUrl + path.split('/').map(encodeURIComponent).join('/');

/**
 * 应用自带的游戏素材（assets/game）。转成绝对地址：
 * 相对地址放进 CSS 变量后会按样式表所在目录解析，打包后会错指到 assets/ 下。
 */
export const gameAsset = (path: string): string => new URL(`${import.meta.env.BASE_URL}game/${path}`, document.baseURI).href;

export const iconIsImage = (icon: string | undefined): icon is string =>
  !!icon && (isAssetPath(icon) || GAME_ICON_PATTERN.test(icon));

/** 图标 → 图片地址：lol:名称 用内置强化图标，其它图片路径相对插件目录 */
export function iconUrl(baseUrl: string, icon: string): string {
  return GAME_ICON_PATTERN.test(icon) ? gameAsset(`icons/${icon.slice(4)}.png`) : assetUrl(baseUrl, icon);
}

export function backgroundUrl(baseUrl: string, bg: string): string | null {
  if (bg === 'none') return null;
  return (BUILTIN_BACKGROUNDS as readonly string[]).includes(bg) ? gameAsset(`bg/${bg}.jpg`) : assetUrl(baseUrl, bg);
}

/** 把插件 theme 转成 CSS 变量，覆盖默认的海克斯配色 */
export function themeStyle(plugin: PickPlugin): CSSProperties {
  const c = plugin.theme.colors;
  const vars: Record<string, string> = {};
  for (const r of RARITIES) {
    const color = c[r];
    if (!color) continue;
    vars[`--glow-${r}`] = color;
  }
  if (c.background) vars['--hx-dim'] = c.background;
  if (c.accent) vars['--hx-accent'] = c.accent;
  if (c.text) vars['--hx-text'] = c.text;
  if (plugin.theme.font) vars['--hx-font-display'] = plugin.theme.font;
  return vars as CSSProperties;
}

/** 名字 → 稳定的色相，用于没有头像图片时的字母头像 */
export function hueOf(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 360;
  return h;
}
