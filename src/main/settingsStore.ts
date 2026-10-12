import { EventEmitter } from 'node:events';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '../shared/settings';

/** settings.json 读写；写入先落临时文件再 rename，避免写一半崩溃导致文件损坏。 */
export class SettingsStore extends EventEmitter {
  private current: Settings;

  constructor(private readonly file: string) {
    super();
    this.current = this.read();
  }

  get(): Settings {
    return this.current;
  }

  update(patch: unknown): Settings {
    const next = mergeSettings(this.current, patch);
    if (JSON.stringify(next) === JSON.stringify(this.current)) return this.current;
    this.current = next;
    this.write();
    this.emit('changed', next);
    return next;
  }

  private read(): Settings {
    try {
      return mergeSettings(DEFAULT_SETTINGS, JSON.parse(readFileSync(this.file, 'utf8')));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('[settings] 读取失败，使用默认设置：', e);
      return DEFAULT_SETTINGS;
    }
  }

  private write(): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.current, null, 2));
      renameSync(tmp, this.file);
    } catch (e) {
      console.error('[settings] 保存失败：', e);
    }
  }
}
