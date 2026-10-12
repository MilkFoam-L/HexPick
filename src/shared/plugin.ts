/** 插件 = plugins/<目录>/plugin.json。这里是插件格式的唯一定义与校验入口。 */

export const RARITIES = ['silver', 'gold', 'prismatic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const LAYOUTS = ['augment', 'portrait', 'text'] as const;
export type Layout = (typeof LAYOUTS)[number];

export const THEME_COLOR_KEYS = ['silver', 'gold', 'prismatic', 'background', 'accent', 'text'] as const;
export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];
export const SOUND_KEYS = ['silver', 'gold', 'prismatic', 'pick'] as const;
export type SoundKey = (typeof SOUND_KEYS)[number];

/** 内置背景：abyss = 嚎哭深渊（海克斯大乱斗地图）场景图；none = 只暗化桌面 */
export const BUILTIN_BACKGROUNDS = ['abyss', 'none'] as const;
/** 引用内置的海克斯大乱斗强化图标，例如 "lol:adamant" */
export const GAME_ICON_PATTERN = /^lol:[a-z0-9_]{1,64}$/;

export const DEFAULT_LABELS: Readonly<Record<Rarity, string>> = { silver: '白银', gold: '黄金', prismatic: '棱彩' };
/** 官方未公布品质概率，默认值取社区实测（白银 50 / 黄金 45 / 棱彩 5）。 */
export const DEFAULT_RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = { silver: 50, gold: 45, prismatic: 5 };

export type DataValue = string | number | boolean;

export interface PickItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  /** emoji/短文本，或插件目录内的图片相对路径 */
  readonly icon?: string;
  readonly image?: string;
  /** 固定品质；不填则跟随本次选择掷出的品质 */
  readonly rarity?: Rarity;
  readonly weight: number;
  readonly tags: readonly string[];
  readonly data: Readonly<Record<string, DataValue>>;
}

export interface PluginRules {
  /** 一局的选择次数（游戏里是 4 次：3/7/11/15 级） */
  readonly screens: number;
  readonly drawCount: number;
  readonly rerollsPerCard: number;
  readonly rarityWeights: Readonly<Record<Rarity, number>>;
  /** 白银/黄金轮中某张卡获得“金色刷新”（刷新时升一档）的概率 */
  readonly goldenRerollChance: number;
  /** 选中的条目跨局移除，直到手动重置 */
  readonly removeAfterPick: boolean;
  /** 倒计时秒数，0 为关闭；到时自动随机选一张 */
  readonly pickTimer: number;
  /** session：本局展示过的条目不再出现（游戏规则）；none：只排除已选中的 */
  readonly noRepeat: 'session' | 'none';
}

export interface PluginTheme {
  readonly colors: Readonly<Partial<Record<ThemeColorKey, string>>>;
  readonly labels: Readonly<Record<Rarity, string>>;
  readonly font?: string;
  readonly sounds: Readonly<Partial<Record<SoundKey, string>>>;
  /** 内置背景名或插件目录内的图片，默认 abyss */
  readonly backgroundImage: string;
}

export interface PickPlugin {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  readonly description?: string;
  readonly layout: Layout;
  /** 自定义卡片模板文件（相对插件目录） */
  readonly template?: string;
  /** 自定义样式文件（相对插件目录） */
  readonly style?: string;
  readonly rules: PluginRules;
  readonly theme: PluginTheme;
  readonly items: readonly PickItem[];
}

export type ParseResult = { ok: true; plugin: PickPlugin } | { ok: false; error: string };

const LIMITS = {
  name: 40, title: 40, description: 500, pluginDescription: 200, icon: 200,
  items: 500, tags: 8, tag: 20, dataKeys: 30, dataString: 500, cssValue: 200, label: 12,
} as const;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DATA_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const CSS_UNSAFE = /[;{}<>\\]|url\s*\(/i;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRarity = (v: unknown): v is Rarity => typeof v === 'string' && (RARITIES as readonly string[]).includes(v);
const isLayout = (v: unknown): v is Layout => typeof v === 'string' && (LAYOUTS as readonly string[]).includes(v);

/** 看起来像图片文件路径（而不是 emoji） */
export const isAssetPath = (v: string): boolean => IMAGE_EXT.test(v);

/** 插件内相对路径：不能是绝对路径、不能越出插件目录、不能带协议 */
export function isSafeRelativePath(p: string): boolean {
  if (!p || p.length > 200 || p.includes('\0') || p.includes('\\')) return false;
  if (p.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(p)) return false;
  return p.split('/').every((seg) => seg !== '..' && seg !== '');
}

class PluginError extends Error {}

function checkIcon(icon: string | undefined, where: string): void {
  if (!icon) return;
  if (icon.startsWith('lol:') && !GAME_ICON_PATTERN.test(icon)) throw new PluginError(`${where}.icon 游戏图标格式应为 lol:名称`);
  if (isAssetPath(icon) && !isSafeRelativePath(icon)) throw new PluginError(`${where}.icon 必须是插件目录内的相对路径`);
}

function optText(o: Obj, key: string, max: number, where: string): string | undefined {
  const v = o[key];
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') throw new PluginError(`${where}.${key} 必须是字符串`);
  const t = v.trim();
  if (t.length > max) throw new PluginError(`${where}.${key} 超过 ${max} 个字符`);
  return t || undefined;
}

function reqText(o: Obj, key: string, max: number, where: string): string {
  const t = optText(o, key, max, where);
  if (!t) throw new PluginError(`${where}.${key} 不能为空`);
  return t;
}

function optPath(o: Obj, key: string, where: string): string | undefined {
  const v = optText(o, key, 200, where);
  if (v !== undefined && !isSafeRelativePath(v)) throw new PluginError(`${where}.${key} 必须是插件目录内的相对路径`);
  return v;
}

function num(o: Obj, key: string, min: number, max: number, fallback: number, integer: boolean): number {
  const v = o[key];
  if (v === undefined) return fallback;
  const bad = typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v));
  if (bad) throw new PluginError(`rules.${key} 必须是 ${min}~${max} 的${integer ? '整数' : '数字'}`);
  return v as number;
}

function parseWeights(v: unknown): Record<Rarity, number> {
  if (v === undefined) return { ...DEFAULT_RARITY_WEIGHTS };
  if (!isObj(v)) throw new PluginError('rules.rarityWeights 必须是对象');
  const out = { ...DEFAULT_RARITY_WEIGHTS };
  for (const r of RARITIES) {
    const w = v[r];
    if (w === undefined) continue;
    if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) throw new PluginError(`rules.rarityWeights.${r} 必须是非负数`);
    out[r] = w;
  }
  if (RARITIES.every((r) => out[r] === 0)) throw new PluginError('rules.rarityWeights 不能全为 0');
  return out;
}

function parseRules(v: unknown): PluginRules {
  const o = v === undefined ? {} : v;
  if (!isObj(o)) throw new PluginError('rules 必须是对象');
  if (o.removeAfterPick !== undefined && typeof o.removeAfterPick !== 'boolean') {
    throw new PluginError('rules.removeAfterPick 必须是 true 或 false');
  }
  if (o.noRepeat !== undefined && o.noRepeat !== 'session' && o.noRepeat !== 'none') {
    throw new PluginError('rules.noRepeat 只能是 session 或 none');
  }
  return {
    screens: num(o, 'screens', 1, 10, 4, true),
    drawCount: num(o, 'drawCount', 1, 5, 3, true),
    rerollsPerCard: num(o, 'rerollsPerCard', 0, 9, 1, true),
    rarityWeights: parseWeights(o.rarityWeights),
    goldenRerollChance: num(o, 'goldenRerollChance', 0, 1, 0.15, false),
    removeAfterPick: o.removeAfterPick === true,
    pickTimer: num(o, 'pickTimer', 0, 600, 0, true),
    noRepeat: o.noRepeat === 'none' ? 'none' : 'session',
  };
}

function cssValue(v: unknown, where: string): string {
  if (typeof v !== 'string' || !v.trim() || v.length > LIMITS.cssValue || CSS_UNSAFE.test(v)) {
    throw new PluginError(`${where} 不是合法的 CSS 值`);
  }
  return v.trim();
}

function parseTheme(v: unknown): PluginTheme {
  const o = v === undefined ? {} : v;
  if (!isObj(o)) throw new PluginError('theme 必须是对象');
  const colors: Partial<Record<ThemeColorKey, string>> = {};
  if (o.colors !== undefined) {
    if (!isObj(o.colors)) throw new PluginError('theme.colors 必须是对象');
    for (const k of THEME_COLOR_KEYS) if (o.colors[k] !== undefined) colors[k] = cssValue(o.colors[k], `theme.colors.${k}`);
  }
  const labels = { ...DEFAULT_LABELS };
  if (o.labels !== undefined) {
    if (!isObj(o.labels)) throw new PluginError('theme.labels 必须是对象');
    for (const r of RARITIES) {
      const t = optText(o.labels, r, LIMITS.label, 'theme.labels');
      if (t) labels[r] = t;
    }
  }
  const sounds: Partial<Record<SoundKey, string>> = {};
  if (o.sounds !== undefined) {
    if (!isObj(o.sounds)) throw new PluginError('theme.sounds 必须是对象');
    for (const k of SOUND_KEYS) {
      const p = optPath(o.sounds, k, 'theme.sounds');
      if (p) sounds[k] = p;
    }
  }
  const bg = optText(o, 'backgroundImage', 200, 'theme') ?? 'abyss';
  const builtin = (BUILTIN_BACKGROUNDS as readonly string[]).includes(bg);
  if (!builtin && !(isSafeRelativePath(bg) && isAssetPath(bg))) {
    throw new PluginError(`theme.backgroundImage 只能是 ${BUILTIN_BACKGROUNDS.join(' / ')} 或插件目录内的图片`);
  }
  return {
    colors,
    labels,
    font: o.font === undefined ? undefined : cssValue(o.font, 'theme.font'),
    sounds,
    backgroundImage: bg,
  };
}

function parseData(v: unknown, where: string): Record<string, DataValue> {
  if (v === undefined) return {};
  if (!isObj(v)) throw new PluginError(`${where}.data 必须是对象`);
  const keys = Object.keys(v);
  if (keys.length > LIMITS.dataKeys) throw new PluginError(`${where}.data 最多 ${LIMITS.dataKeys} 个字段`);
  const out: Record<string, DataValue> = {};
  for (const k of keys) {
    const val = v[k];
    if (!DATA_KEY_PATTERN.test(k)) throw new PluginError(`${where}.data.${k} 字段名只能用字母、数字、下划线`);
    const okType = typeof val === 'number' ? Number.isFinite(val) : typeof val === 'boolean' || typeof val === 'string';
    if (!okType) throw new PluginError(`${where}.data.${k} 只能是字符串、数字或布尔值`);
    if (typeof val === 'string' && val.length > LIMITS.dataString) throw new PluginError(`${where}.data.${k} 过长`);
    out[k] = val as DataValue;
  }
  return out;
}

function parseTags(v: unknown, where: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > LIMITS.tags) throw new PluginError(`${where}.tags 必须是最多 ${LIMITS.tags} 个字符串的数组`);
  return v.map((t) => {
    if (typeof t !== 'string' || !t.trim() || t.length > LIMITS.tag) throw new PluginError(`${where}.tags 中有非法标签`);
    return t.trim();
  });
}

function parseItem(raw: unknown, index: number): PickItem {
  const where = `items[${index}]`;
  // 最简写法：["张三", "李四"]
  if (typeof raw === 'string') {
    const title = raw.trim();
    if (!title || title.length > LIMITS.title) throw new PluginError(`${where} 名称为空或超过 ${LIMITS.title} 个字符`);
    return { id: `#${index}`, title, weight: 1, tags: [], data: {} };
  }
  if (!isObj(raw)) throw new PluginError(`${where} 必须是字符串或对象`);
  const id = raw.id === undefined ? `#${index}` : raw.id;
  if (typeof id !== 'string' || !id.trim()) throw new PluginError(`${where}.id 必须是非空字符串`);
  if (raw.rarity !== undefined && !isRarity(raw.rarity)) {
    throw new PluginError(`${where}.rarity 只能是 ${RARITIES.join(' / ')}`);
  }
  const weight = raw.weight === undefined ? 1 : raw.weight;
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) throw new PluginError(`${where}.weight 必须是正数`);
  const icon = optText(raw, 'icon', LIMITS.icon, where);
  checkIcon(icon, where);
  return {
    id: id.trim(),
    title: reqText(raw, 'title', LIMITS.title, where),
    description: optText(raw, 'description', LIMITS.description, where),
    icon,
    image: optPath(raw, 'image', where),
    rarity: raw.rarity as Rarity | undefined,
    weight,
    tags: parseTags(raw.tags, where),
    data: parseData(raw.data, where),
  };
}

export function parsePlugin(raw: unknown, fallbackId: string): ParseResult {
  try {
    if (!isObj(raw)) throw new PluginError('插件内容必须是 JSON 对象');
    const id = typeof raw.id === 'string' && ID_PATTERN.test(raw.id) ? raw.id : fallbackId;
    if (!ID_PATTERN.test(id)) throw new PluginError('id 只能包含字母、数字、- 和 _');
    if (raw.layout !== undefined && !isLayout(raw.layout)) throw new PluginError(`layout 只能是 ${LAYOUTS.join(' / ')}`);
    if (!Array.isArray(raw.items) || raw.items.length === 0) throw new PluginError('items 至少要有 1 个条目');
    if (raw.items.length > LIMITS.items) throw new PluginError(`items 最多 ${LIMITS.items} 个`);
    const items = raw.items.map(parseItem);
    const seen = new Set<string>();
    for (const it of items) {
      if (seen.has(it.id)) throw new PluginError(`条目 id 重复：${it.id}`);
      seen.add(it.id);
    }
    const icon = optText(raw, 'icon', LIMITS.icon, 'plugin');
    checkIcon(icon, 'plugin');
    return {
      ok: true,
      plugin: {
        id,
        name: reqText(raw, 'name', LIMITS.name, 'plugin'),
        icon,
        description: optText(raw, 'description', LIMITS.pluginDescription, 'plugin'),
        layout: isLayout(raw.layout) ? raw.layout : 'augment',
        template: optPath(raw, 'template', 'plugin'),
        style: optPath(raw, 'style', 'plugin'),
        rules: parseRules(raw.rules),
        theme: parseTheme(raw.theme),
        items,
      },
    };
  } catch (e) {
    if (e instanceof PluginError) return { ok: false, error: e.message };
    throw e;
  }
}
