import { EventEmitter } from 'node:events';
import { existsSync, watch, type FSWatcher } from 'node:fs';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LoadedPlugin, PluginLoadError, PluginSnapshot } from '../shared/ipc';
import { PLUGIN_SCHEME } from '../shared/ipc';
import { rewriteCssUrls } from '../shared/css';
import { parsePlugin } from '../shared/plugin';

const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_TEXT_BYTES = 64 * 1024;
const RELOAD_DEBOUNCE_MS = 300;

export const pluginBaseUrl = (dir: string): string => `${PLUGIN_SCHEME}://p/${encodeURIComponent(dir)}/`;

const sanitizeId = (dir: string): string => dir.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'plugin';

async function readLimited(file: string, max: number): Promise<string> {
  const s = await stat(file);
  if (s.size > max) throw new Error(`${file.split('/').pop()} 超过 ${Math.round(max / 1024)}KB`);
  return readFile(file, 'utf8');
}

const NEW_PLUGIN_TEMPLATE = {
  name: '我的插件',
  icon: '✨',
  description: '在这里写插件说明。保存文件后会自动生效。',
  layout: 'augment',
  rules: { screens: 1, drawCount: 3, rerollsPerCard: 1 },
  items: [
    { title: '第一项', description: '支持 <gold>金色</gold>、<keyword>关键词</keyword> 等描述标签', icon: '🍀', rarity: 'prismatic' },
    { title: '第二项', description: '不写 rarity 时跟随本轮品质', icon: '🎯' },
    { title: '第三项', icon: '🎲' },
    '也可以只写名字',
  ],
};

export class PluginStore extends EventEmitter {
  private snapshot: PluginSnapshot;
  private watcher: FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly root: string,
    private readonly bundledDir: string,
    private disabled: ReadonlySet<string>,
  ) {
    super();
    this.snapshot = { plugins: [], errors: [], rootPath: root };
  }

  get(): PluginSnapshot {
    return this.snapshot;
  }

  /** 首次运行时复制示例插件，之后加载并开始监听目录。 */
  async start(): Promise<void> {
    if (!existsSync(this.root)) {
      await mkdir(this.root, { recursive: true });
      await this.restoreExamples();
    }
    await this.reload();
    try {
      this.watcher = watch(this.root, { recursive: true }, () => this.scheduleReload());
    } catch (e) {
      console.warn('[plugins] 无法监听插件目录，需手动重新加载：', e);
    }
  }

  stop(): void {
    this.watcher?.close();
    if (this.timer) clearTimeout(this.timer);
  }

  setDisabled(disabled: ReadonlySet<string>): void {
    this.disabled = disabled;
    this.publish({ ...this.snapshot, plugins: this.snapshot.plugins.map((p) => ({ ...p, enabled: !disabled.has(p.plugin.id) })) });
  }

  /** 补齐缺失的示例插件和编写指南，不覆盖用户已有的文件。 */
  async restoreExamples(): Promise<void> {
    if (!existsSync(this.bundledDir)) return;
    for (const entry of await readdir(this.bundledDir, { withFileTypes: true })) {
      const target = join(this.root, entry.name);
      if (existsSync(target) || !(entry.isDirectory() || entry.isFile())) continue;
      await cp(join(this.bundledDir, entry.name), target, { recursive: true });
    }
  }

  /** 新建一个插件文件夹，返回文件夹路径。 */
  async createPlugin(): Promise<string> {
    let n = 1;
    while (existsSync(join(this.root, `my-plugin-${n}`))) n++;
    const dir = join(this.root, `my-plugin-${n}`);
    await mkdir(dir, { recursive: true });
    const manifest = { ...NEW_PLUGIN_TEMPLATE, id: `my-plugin-${n}`, name: `我的插件 ${n}` };
    await writeFile(join(dir, 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    return dir;
  }

  async reload(): Promise<PluginSnapshot> {
    const plugins: LoadedPlugin[] = [];
    const errors: PluginLoadError[] = [];
    let entries: string[] = [];
    try {
      entries = (await readdir(this.root, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();
    } catch (e) {
      errors.push({ dir: '.', error: `无法读取插件目录：${(e as Error).message}` });
    }
    const ids = new Set<string>();
    for (const dir of entries) {
      const result = await this.loadOne(dir);
      if ('error' in result) {
        if (result.error) errors.push({ dir, error: result.error });
        continue;
      }
      if (ids.has(result.plugin.id)) {
        errors.push({ dir, error: `插件 id「${result.plugin.id}」与其它插件重复` });
        continue;
      }
      ids.add(result.plugin.id);
      plugins.push(result);
    }
    this.publish({ plugins, errors, rootPath: this.root });
    return this.snapshot;
  }

  private async loadOne(dir: string): Promise<LoadedPlugin | { error: string | null }> {
    const folder = join(this.root, dir);
    const manifestPath = join(folder, 'plugin.json');
    if (!existsSync(manifestPath)) return { error: null }; // 不是插件的文件夹，静默跳过
    try {
      const raw: unknown = JSON.parse(await readLimited(manifestPath, MAX_MANIFEST_BYTES));
      const parsed = parsePlugin(raw, sanitizeId(dir));
      if (!parsed.ok) return { error: `plugin.json：${parsed.error}` };
      const { plugin } = parsed;
      const baseUrl = pluginBaseUrl(dir);
      const template = plugin.template ? await readLimited(join(folder, plugin.template), MAX_TEXT_BYTES) : undefined;
      const style = plugin.style ? rewriteCssUrls(await readLimited(join(folder, plugin.style), MAX_TEXT_BYTES), baseUrl) : undefined;
      return { plugin, dir, baseUrl, template, style, enabled: !this.disabled.has(plugin.id) };
    } catch (e) {
      const msg = e instanceof SyntaxError ? `plugin.json 不是合法 JSON：${e.message}` : (e as Error).message;
      return { error: msg };
    }
  }

  private scheduleReload(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.reload(), RELOAD_DEBOUNCE_MS);
  }

  private publish(s: PluginSnapshot): void {
    this.snapshot = s;
    this.emit('changed', s);
  }
}
