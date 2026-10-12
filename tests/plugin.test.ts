import { describe, expect, it } from 'vitest';
import { DEFAULT_RARITY_WEIGHTS, isSafeRelativePath, parsePlugin } from '../src/shared/plugin';

describe('parsePlugin', () => {
  it('accepts the shortest form and fills game defaults', () => {
    const r = parsePlugin({ name: '点名', items: ['张三', '李四'] }, 'roll');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plugin.id).toBe('roll');
    expect(r.plugin.layout).toBe('augment');
    expect(r.plugin.items.map((i) => i.title)).toEqual(['张三', '李四']);
    expect(r.plugin.rules).toMatchObject({ screens: 4, drawCount: 3, rerollsPerCard: 1, noRepeat: 'session' });
    expect(r.plugin.rules.rarityWeights).toEqual(DEFAULT_RARITY_WEIGHTS);
    expect(r.plugin.theme.labels).toEqual({ silver: '白银', gold: '黄金', prismatic: '棱彩' });
    expect(r.plugin.theme.backgroundImage).toBe('abyss');
  });

  it('parses full items with rarity, data, tags and assets', () => {
    const r = parsePlugin(
      {
        id: 'food',
        name: '吃什么',
        layout: 'portrait',
        template: 'card.html',
        theme: { colors: { gold: '#ffcc00' }, labels: { prismatic: '本命' }, sounds: { pick: 'sounds/pick.mp3' }, backgroundImage: 'assets/bg.jpg' },
        items: [
          { id: 'hotpot', title: '火锅', rarity: 'prismatic', icon: 'assets/hotpot.png', tags: ['辣'], data: { price: 120, spicy: true } },
          { id: 'anchor', title: '坚定', icon: 'lol:adamant' },
        ],
      },
      'x',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plugin.items[0]).toMatchObject({ id: 'hotpot', rarity: 'prismatic', icon: 'assets/hotpot.png', data: { price: 120 } });
    expect(r.plugin.theme.labels.prismatic).toBe('本命');
    expect(r.plugin.theme.sounds.pick).toBe('sounds/pick.mp3');
    expect(r.plugin.theme.backgroundImage).toBe('assets/bg.jpg');
    expect(r.plugin.items[1].icon).toBe('lol:adamant');
  });

  it.each([
    [{ name: 'x', items: [] }, 'items'],
    [{ name: 'x', items: [{ title: 'a', rarity: 'diamond' }] }, 'rarity'],
    [{ name: 'x', items: [{ id: 'a', title: 'a' }, { id: 'a', title: 'b' }] }, '重复'],
    [{ name: 'x', items: ['a'], rules: { rarityWeights: { silver: 0, gold: 0, prismatic: 0 } } }, '全为 0'],
    [{ name: 'x', items: ['a'], rules: { drawCount: 9 } }, 'drawCount'],
    [{ name: 'x', items: ['a'], template: '../../etc/passwd' }, 'template'],
    [{ name: 'x', items: [{ title: 'a', image: '/etc/a.png' }] }, 'image'],
    [{ name: 'x', items: ['a'], theme: { colors: { gold: 'red;} body{display:none' } } }, 'CSS'],
    [{ name: 'x', items: ['a'], theme: { colors: { background: 'url(https://evil.example/x.png)' } } }, 'CSS'],
    [{ name: 'x', items: [{ title: 'a', data: { 'bad-key': 1 } }] }, '字段名'],
    [{ items: ['a'] }, 'name'],
    [{ name: 'x', items: ['a'], theme: { backgroundImage: 'https://evil.example/bg.png' } }, 'backgroundImage'],
    [{ name: 'x', items: ['a'], theme: { backgroundImage: 'notes.txt' } }, 'backgroundImage'],
    [{ name: 'x', items: [{ title: 'a', icon: 'lol:../x' }] }, 'lol:'],
  ])('rejects invalid plugin %#', (raw, keyword) => {
    const r = parsePlugin(raw, 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(keyword);
  });
});

describe('isSafeRelativePath', () => {
  it.each(['card.html', 'assets/a.png', 'a/b/c.svg'])('allows %s', (p) => expect(isSafeRelativePath(p)).toBe(true));
  it.each(['', '../a', 'a/../../b', '/abs', 'https://x/y.png', 'file:///a', 'a\\b', 'a//b'])('blocks %s', (p) =>
    expect(isSafeRelativePath(p)).toBe(false),
  );
});
