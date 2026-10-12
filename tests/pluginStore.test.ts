import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePluginFile } from '../src/main/pluginPath';
import { PluginStore } from '../src/main/pluginStore';
import { rewriteCssUrls } from '../src/shared/css';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'hexpick-'));
  const write = (rel: string, content: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  return { root, write };
}

describe('PluginStore', () => {
  it('loads valid folders, reports broken ones and skips non-plugin folders', async () => {
    const { root, write } = fixture();
    write('food/plugin.json', JSON.stringify({ name: '吃', items: ['面'], template: 'card.html', style: 's.css' }));
    write('food/card.html', '<h1>{{title}}</h1>');
    write('food/s.css', '.c{background:url(assets/bg.png)} .d{background:url("../../x.png")}');
    write('broken/plugin.json', '{ not json');
    write('invalid/plugin.json', JSON.stringify({ name: 'x', items: [] }));
    write('zz-dup/plugin.json', JSON.stringify({ id: 'food', name: '重复', items: ['a'] }));
    write('random/readme.txt', 'hi');
    const store = new PluginStore(root, join(root, 'none'), new Set(['food']));
    const snap = await store.reload();
    expect(snap.plugins.map((p) => p.dir)).toEqual(['food']);
    const food = snap.plugins[0];
    expect(food.enabled).toBe(false);
    expect(food.template).toBe('<h1>{{title}}</h1>');
    expect(food.style).toBe('.c{background:url("hexpick-plugin://p/food/assets/bg.png")} .d{background:url("")}');
    expect(snap.errors.map((e) => e.dir).sort()).toEqual(['broken', 'invalid', 'zz-dup']);
  });

  it('creates a new plugin skeleton that loads cleanly', async () => {
    const { root } = fixture();
    const store = new PluginStore(root, join(root, 'none'), new Set());
    await store.createPlugin();
    const snap = await store.reload();
    expect(snap.errors).toEqual([]);
    expect(snap.plugins[0].plugin.id).toBe('my-plugin-1');
  });

  it('restores bundled examples and the guide without overwriting user files', async () => {
    const { root, write } = fixture();
    write('bundled/demo/plugin.json', JSON.stringify({ name: '示例', items: ['a'] }));
    write('bundled/README.md', '# guide');
    write('user/demo/plugin.json', JSON.stringify({ name: '我改过', items: ['b'] }));
    const store = new PluginStore(join(root, 'user'), join(root, 'bundled'), new Set());
    await store.restoreExamples();
    const snap = await store.reload();
    expect(snap.plugins[0].plugin.name).toBe('我改过');
    expect(readFileSync(join(root, 'user/README.md'), 'utf8')).toBe('# guide');
  });
});

describe('rewriteCssUrls', () => {
  it('keeps data urls and rewrites relative ones', () => {
    expect(rewriteCssUrls("a{b:url('data:image/png;base64,AA')}", 'x://p/a/')).toBe('a{b:url("data:image/png;base64,AA")}');
    expect(rewriteCssUrls('a{b:url(https://evil.example/a.png)}', 'x://p/a/')).toBe('a{b:url("")}');
  });
});

describe('resolvePluginFile', () => {
  it('serves allowed files inside the plugin folder only', async () => {
    const { root, write } = fixture();
    write('food/assets/a.png', 'x');
    write('food/plugin.json', '{}');
    write('secret.png', 'x');
    symlinkSync(join(root, 'secret.png'), join(root, 'food/assets/link.png'));
    const ok = await resolvePluginFile(root, 'hexpick-plugin://p/food/assets/a.png');
    expect(ok?.endsWith('/food/assets/a.png')).toBe(true);
    for (const bad of [
      'hexpick-plugin://p/food/plugin.json',
      'hexpick-plugin://p/food/../secret.png',
      'hexpick-plugin://p/food/%2E%2E/secret.png',
      'hexpick-plugin://p/..%2Fsecret.png/x.png',
      'hexpick-plugin://p/food/assets/link.png',
      'hexpick-plugin://q/food/assets/a.png',
      'not a url',
    ]) {
      expect(await resolvePluginFile(root, bad)).toBeNull();
    }
  });
});
