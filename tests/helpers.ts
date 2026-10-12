import { parsePlugin, type PickPlugin } from '../src/shared/plugin';

/** 可复现的伪随机数（mulberry32） */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 依次返回给定序列的随机数，用完后循环 */
export function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

export function makePlugin(raw: Record<string, unknown>): PickPlugin {
  const r = parsePlugin({ name: '测试', ...raw }, 'test');
  if (!r.ok) throw new Error(r.error);
  return r.plugin;
}

export const names = (n: number, prefix = 'p'): string[] => Array.from({ length: n }, (_, i) => `${prefix}${i}`);
