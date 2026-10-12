import { describe, expect, it } from 'vitest';
import { advance, pickCard, rerollCard, startSession, type Ctx, type Session } from '../src/shared/session';
import { makePlugin, names, seeded, sequence } from './helpers';

const ctxOf = (raw: Record<string, unknown>, rng = seeded(1), retired: string[] = []): Ctx => ({
  plugin: makePlugin(raw),
  retired: new Set(retired),
  rng,
});

/** 选第一张并进入下一次选择 */
const pickAndAdvance = (ctx: Ctx, s: Session) => advance(ctx, pickCard(s, 0));

describe('一次选择', () => {
  it('offers drawCount cards that all share the rolled tier', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ctx = ctxOf({ items: names(30) }, seeded(seed));
      const s = startSession(ctx);
      expect(s.phase).toBe('choosing');
      expect(s.current?.cards).toHaveLength(3);
      expect(new Set(s.current?.cards.map((c) => c.rarity))).toEqual(new Set([s.current?.tier]));
    }
  });

  it('only rolls tiers that have items, so a fixed-rarity pool never shows an empty prismatic screen', () => {
    const items = names(5).map((t) => ({ title: t, rarity: 'silver' }));
    for (let seed = 0; seed < 30; seed++) {
      const s = startSession(ctxOf({ items, rules: { rarityWeights: { silver: 1, gold: 1, prismatic: 98 } } }, seeded(seed)));
      expect(s.current?.tier).toBe('silver');
    }
  });

  it('shows fixed prismatic favourites only on prismatic screens', () => {
    const items = [{ title: '火锅', rarity: 'prismatic' }, ...names(10).map((t) => ({ title: t, rarity: 'silver' }))];
    for (let seed = 0; seed < 50; seed++) {
      const s = startSession(ctxOf({ items, rules: { drawCount: 1 } }, seeded(seed)));
      const card = s.current!.cards[0];
      expect(card.item.title === '火锅').toBe(s.current!.tier === 'prismatic');
    }
  });

  it('respects rarity weights statistically', () => {
    let prismatic = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const s = startSession(ctxOf({ items: names(9) }, seeded(seed)));
      if (s.current?.tier === 'prismatic') prismatic++;
    }
    expect(prismatic / 2000).toBeGreaterThan(0.02);
    expect(prismatic / 2000).toBeLessThan(0.09);
  });

  it('never offers retired items', () => {
    const s = startSession(ctxOf({ items: names(4) }, seeded(3), ['#0', '#1']));
    expect(s.current?.cards.map((c) => c.item.id).sort()).toEqual(['#2', '#3']);
  });

  it('is empty when everything is retired', () => {
    expect(startSession(ctxOf({ items: ['a'] }, seeded(1), ['#0'])).phase).toBe('empty');
  });
});

describe('刷新', () => {
  it('replaces one card with an unseen item of the same tier and spends the reroll', () => {
    const ctx = ctxOf({ items: names(30), rules: { goldenRerollChance: 0 } }, seeded(7));
    const s = startSession(ctx);
    const r = rerollCard(ctx, s, 1);
    const before = s.current!.cards;
    const after = r.current!.cards;
    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(before.map((c) => c.item.id)).not.toContain(after[1].item.id);
    expect(after[1].rarity).toBe(before[1].rarity);
    expect(after[1].rerollsLeft).toBe(0);
    expect(rerollCard(ctx, r, 1)).toBe(r);
  });

  it('golden reroll upgrades the card one tier', () => {
    const items = [
      ...names(6, 's').map((t) => ({ title: t, rarity: 'silver' })),
      ...names(6, 'g').map((t) => ({ title: t, rarity: 'gold' })),
    ];
    const ctx = ctxOf({ items, rules: { goldenRerollChance: 1, rarityWeights: { silver: 1, gold: 0, prismatic: 0 } } }, seeded(2));
    const s = startSession(ctx);
    expect(s.current!.tier).toBe('silver');
    const goldenIndex = s.current!.cards.findIndex((c) => c.golden);
    expect(goldenIndex).toBeGreaterThanOrEqual(0);
    const r = rerollCard(ctx, s, goldenIndex);
    expect(r.current!.cards[goldenIndex].rarity).toBe('gold');
    expect(r.current!.cards[goldenIndex].golden).toBe(false);
  });

  it('never grants golden reroll on prismatic screens', () => {
    for (let seed = 0; seed < 30; seed++) {
      const s = startSession(
        ctxOf({ items: names(9), rules: { goldenRerollChance: 1, rarityWeights: { silver: 0, gold: 0, prismatic: 1 } } }, seeded(seed)),
      );
      expect(s.current!.cards.some((c) => c.golden)).toBe(false);
    }
  });
});

describe('一局', () => {
  it('runs rules.screens selections then shows a summary of picks', () => {
    const ctx = ctxOf({ items: names(40) }, seeded(11));
    let s = startSession(ctx);
    for (let i = 0; i < 3; i++) {
      s = pickAndAdvance(ctx, s);
      expect(s.phase).toBe('choosing');
      expect(s.screenIndex).toBe(i + 1);
    }
    s = pickAndAdvance(ctx, s);
    expect(s.phase).toBe('summary');
    expect(s.picks).toHaveLength(4);
  });

  it('does not repeat any item shown earlier in the session while fresh ones remain', () => {
    const ctx = ctxOf({ items: names(40) }, seeded(5));
    let s = startSession(ctx);
    const shown: string[] = [...s.current!.cards.map((c) => c.item.id)];
    s = rerollCard(ctx, s, 0);
    shown.push(s.current!.cards[0].item.id);
    for (let i = 0; i < 3; i++) {
      s = pickAndAdvance(ctx, s);
      for (const c of s.current!.cards) expect(shown).not.toContain(c.item.id);
      shown.push(...s.current!.cards.map((c) => c.item.id));
    }
  });

  it('falls back to seen-but-unpicked items when the pool runs dry, never re-offering a pick', () => {
    const ctx = ctxOf({ items: names(4) }, seeded(9));
    let s = startSession(ctx);
    for (let i = 0; i < 3; i++) {
      const picked = s.picks.map((p) => p.item.id);
      for (const c of s.current!.cards) expect(picked).not.toContain(c.item.id);
      s = pickAndAdvance(ctx, s);
    }
    expect(s.phase).toBe('choosing');
    expect(s.current!.cards).toHaveLength(1);
  });

  it('never makes the first two selections both silver', () => {
    for (let seed = 0; seed < 200; seed++) {
      const ctx = ctxOf({ items: names(30), rules: { rarityWeights: { silver: 95, gold: 5, prismatic: 0 } } }, seeded(seed));
      const s = pickAndAdvance(ctx, startSession(ctx));
      expect(s.tiers.slice(0, 2)).not.toEqual(['silver', 'silver']);
    }
  });

  it('ends early with a summary when nothing is left to offer', () => {
    const ctx = ctxOf({ items: ['a', 'b'], rules: { drawCount: 1, noRepeat: 'none' } }, sequence([0.1]));
    let s = startSession(ctx);
    s = pickAndAdvance(ctx, s);
    s = pickAndAdvance(ctx, s);
    expect(s.phase).toBe('summary');
    expect(s.picks).toHaveLength(2);
  });

  it('ignores invalid actions', () => {
    const ctx = ctxOf({ items: names(9) });
    const s = startSession(ctx);
    expect(advance(ctx, s)).toBe(s);
    expect(pickCard(s, 7)).toBe(s);
    const p = pickCard(s, 0);
    expect(pickCard(p, 1)).toBe(p);
    expect(rerollCard(ctx, p, 1)).toBe(p);
  });
});
