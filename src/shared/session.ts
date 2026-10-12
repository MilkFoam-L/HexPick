/**
 * 海克斯大乱斗选择流程的纯函数状态机。
 * 一局 = rules.screens 次选择；每次先掷品质，三张同档；每张卡可刷新；本局出现过的不再出现；
 * 第 1、2 次不会都是白银；白银/黄金轮可能有一张“金色刷新”卡，刷新时升一档。
 * 随机数由调用方注入，状态全部不可变。
 */
import { RARITIES, type PickItem, type PickPlugin, type Rarity } from './plugin';

export type Rng = () => number;

export interface Card {
  readonly item: PickItem;
  readonly rarity: Rarity;
  readonly rerollsLeft: number;
  readonly golden: boolean;
}

export interface Screen {
  readonly tier: Rarity;
  readonly cards: readonly Card[];
}

export interface PickRecord {
  readonly item: PickItem;
  readonly rarity: Rarity;
}

export type Phase = 'choosing' | 'picked' | 'summary' | 'empty';

export interface Session {
  readonly phase: Phase;
  readonly screenIndex: number;
  readonly tiers: readonly Rarity[];
  readonly seen: readonly string[];
  readonly picks: readonly PickRecord[];
  readonly current: Screen | null;
  readonly pickedIndex: number | null;
}

export interface Ctx {
  readonly plugin: PickPlugin;
  /** 跨局已移除的条目（removeAfterPick） */
  readonly retired: ReadonlySet<string>;
  readonly rng: Rng;
}

const fits = (item: PickItem, tier: Rarity): boolean => (item.rarity ?? tier) === tier;

export function nextTier(r: Rarity): Rarity {
  return RARITIES[Math.min(RARITIES.indexOf(r) + 1, RARITIES.length - 1)];
}

function weightedIndex(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.min(Math.floor(rng() * weights.length), weights.length - 1);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function sample(items: readonly PickItem[], count: number, rng: Rng): PickItem[] {
  const pool = [...items];
  const out: PickItem[] = [];
  while (out.length < count && pool.length > 0) {
    const i = weightedIndex(pool.map((it) => it.weight), rng);
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

/** fresh：本局没出现过的；fallback：出现过但没被选中的（fresh 不够时兜底）。已选中/已移除的永不出现。 */
function pools(ctx: Ctx, s: Pick<Session, 'seen' | 'picks'>): { fresh: PickItem[]; fallback: PickItem[] } {
  const picked = new Set(s.picks.map((p) => p.item.id));
  const base = ctx.plugin.items.filter((it) => !ctx.retired.has(it.id) && !picked.has(it.id));
  if (ctx.plugin.rules.noRepeat === 'none') return { fresh: base, fallback: [] };
  const seen = new Set(s.seen);
  return { fresh: base.filter((it) => !seen.has(it.id)), fallback: base.filter((it) => seen.has(it.id)) };
}

/** 只在确实有条目可出的品质里掷骰，避免掷出棱彩却没有棱彩条目。 */
export function rollTier(ctx: Ctx, pool: readonly PickItem[], banned: readonly Rarity[]): Rarity {
  const viable = RARITIES.filter((r) => pool.some((it) => fits(it, r)));
  const allowed = viable.filter((r) => !banned.includes(r));
  const tiers = allowed.length > 0 ? allowed : viable;
  return tiers[weightedIndex(tiers.map((r) => ctx.plugin.rules.rarityWeights[r]), ctx.rng)];
}

/** 按优先级依次取：本局新条目且符合品质 → 兜底条目且符合品质 → 其余新条目 → 其余兜底条目 */
function takeInOrder(groups: readonly (readonly PickItem[])[], count: number, rng: Rng): PickItem[] {
  const out: PickItem[] = [];
  for (const g of groups) {
    if (out.length >= count) break;
    out.push(...sample(g.filter((it) => !out.includes(it)), count - out.length, rng));
  }
  return out;
}

function buildScreen(ctx: Ctx, s: Session): Screen | null {
  const { fresh, fallback } = pools(ctx, s);
  if (fresh.length + fallback.length === 0) return null;
  const banned: Rarity[] = s.screenIndex === 1 && s.tiers[0] === 'silver' ? ['silver'] : [];
  const tier = rollTier(ctx, fresh.length > 0 ? fresh : fallback, banned);
  const count = Math.min(ctx.plugin.rules.drawCount, fresh.length + fallback.length);
  const items = takeInOrder(
    [fresh.filter((it) => fits(it, tier)), fallback.filter((it) => fits(it, tier)), fresh, fallback],
    count,
    ctx.rng,
  );
  const goldenAt =
    tier !== 'prismatic' && ctx.rng() < ctx.plugin.rules.goldenRerollChance ? Math.floor(ctx.rng() * items.length) : -1;
  return {
    tier,
    cards: items.map((item, i) => ({
      item,
      rarity: item.rarity ?? tier,
      rerollsLeft: ctx.plugin.rules.rerollsPerCard,
      golden: i === goldenAt && ctx.plugin.rules.rerollsPerCard > 0,
    })),
  };
}

function withScreen(ctx: Ctx, s: Session): Session {
  const screen = buildScreen(ctx, s);
  if (!screen) return { ...s, phase: s.picks.length > 0 ? 'summary' : 'empty', current: null, pickedIndex: null };
  return {
    ...s,
    phase: 'choosing',
    current: screen,
    pickedIndex: null,
    tiers: [...s.tiers, screen.tier],
    seen: [...s.seen, ...screen.cards.map((c) => c.item.id)],
  };
}

export function startSession(ctx: Ctx): Session {
  const blank: Session = { phase: 'choosing', screenIndex: 0, tiers: [], seen: [], picks: [], current: null, pickedIndex: null };
  return withScreen(ctx, blank);
}

export function rerollCard(ctx: Ctx, s: Session, index: number): Session {
  const card = s.current?.cards[index];
  if (s.phase !== 'choosing' || !s.current || !card || card.rerollsLeft <= 0) return s;
  const shown = new Set(s.current.cards.map((c) => c.item.id));
  const { fresh, fallback } = pools(ctx, s);
  const f = fresh.filter((it) => !shown.has(it.id));
  const b = fallback.filter((it) => !shown.has(it.id));
  const target = card.golden ? nextTier(card.rarity) : card.rarity;
  const byTier = (r: Rarity) => [f.filter((it) => fits(it, r)), b.filter((it) => fits(it, r))];
  const [next] = takeInOrder([...byTier(target), ...byTier(card.rarity), f, b], 1, ctx.rng);
  if (!next) return s;
  const replaced: Card = { item: next, rarity: next.rarity ?? target, rerollsLeft: card.rerollsLeft - 1, golden: false };
  return {
    ...s,
    current: { ...s.current, cards: s.current.cards.map((c, i) => (i === index ? replaced : c)) },
    seen: [...s.seen, next.id],
  };
}

export function pickCard(s: Session, index: number): Session {
  const card = s.current?.cards[index];
  if (s.phase !== 'choosing' || !card) return s;
  return { ...s, phase: 'picked', pickedIndex: index, picks: [...s.picks, { item: card.item, rarity: card.rarity }] };
}

/** 选完后进入下一次选择；本局次数用完则进入总结。 */
export function advance(ctx: Ctx, s: Session): Session {
  if (s.phase !== 'picked') return s;
  const screenIndex = s.screenIndex + 1;
  if (screenIndex >= ctx.plugin.rules.screens) return { ...s, phase: 'summary', current: null, pickedIndex: null, screenIndex };
  return withScreen(ctx, { ...s, screenIndex });
}
