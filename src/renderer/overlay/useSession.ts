import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LoadedPlugin } from '../../shared/ipc';
import { advance, pickCard, rerollCard, startSession, type Ctx, type Session } from '../../shared/session';

const rng = (): number => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
const retiredKey = (id: string) => `hexpick.retired.${id}`;

function loadRetired(id: string): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(retiredKey(id)) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveRetired(id: string, ids: readonly string[]): void {
  try {
    if (ids.length) localStorage.setItem(retiredKey(id), JSON.stringify(ids));
    else localStorage.removeItem(retiredKey(id));
  } catch (e) {
    console.warn('[session] 保存已移除条目失败', e);
  }
}

interface Entry {
  readonly sig: string;
  readonly session: Session;
}

export type SessionEvent = { type: 'reveal'; session: Session } | { type: 'reroll' } | { type: 'pick' };

export interface SessionApi {
  readonly session: Session | null;
  readonly retiredCount: number;
  reroll(index: number): void;
  pick(index: number): void;
  next(): void;
  restart(): void;
  resetRetired(): void;
}

/** 每个插件各自保留一局进度；插件内容变化（热更新）后自动开新局。 */
export function useSession(lp: LoadedPlugin | null, onEvent: (e: SessionEvent) => void): SessionApi {
  const [entries, setEntries] = useState<Readonly<Record<string, Entry>>>({});
  const [retired, setRetired] = useState<Readonly<Record<string, readonly string[]>>>({});

  const id = lp?.plugin.id ?? null;
  const sig = useMemo(() => (lp ? JSON.stringify(lp.plugin) : ''), [lp]);
  const retiredIds = useMemo(() => (id ? (retired[id] ?? loadRetired(id)) : []), [id, retired]);
  const ctx = useMemo<Ctx | null>(
    () => (lp ? { plugin: lp.plugin, retired: new Set(retiredIds), rng } : null),
    [lp, retiredIds],
  );
  const entry = id ? entries[id] : undefined;
  const session = entry && entry.sig === sig ? entry.session : null;

  const commit = useCallback(
    (s: Session) => {
      if (id) setEntries((prev) => ({ ...prev, [id]: { sig, session: s } }));
    },
    [id, sig],
  );

  const begin = useCallback(() => {
    if (!ctx) return;
    const s = startSession(ctx);
    commit(s);
    onEvent({ type: 'reveal', session: s });
  }, [ctx, commit, onEvent]);

  useEffect(() => {
    if (ctx && !session) begin();
  }, [ctx, session, begin]);

  const setRetiredFor = useCallback(
    (ids: readonly string[]) => {
      if (!id) return;
      saveRetired(id, ids);
      setRetired((prev) => ({ ...prev, [id]: ids }));
    },
    [id],
  );

  return {
    session,
    retiredCount: retiredIds.length,
    reroll: (i) => {
      if (!ctx || !session) return;
      const s = rerollCard(ctx, session, i);
      if (s === session) return;
      commit(s);
      onEvent({ type: 'reroll' });
    },
    pick: (i) => {
      if (!ctx || !session) return;
      const s = pickCard(session, i);
      if (s === session) return;
      commit(s);
      onEvent({ type: 'pick' });
      const picked = s.picks[s.picks.length - 1].item.id;
      if (ctx.plugin.rules.removeAfterPick && !retiredIds.includes(picked)) setRetiredFor([...retiredIds, picked]);
    },
    next: () => {
      if (!ctx || !session) return;
      const s = advance(ctx, session);
      if (s === session) return;
      commit(s);
      if (s.phase === 'choosing') onEvent({ type: 'reveal', session: s });
    },
    restart: begin,
    resetRetired: () => {
      setRetiredFor([]);
      if (id) setEntries((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)));
    },
  };
}
