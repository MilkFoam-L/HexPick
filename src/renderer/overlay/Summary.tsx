import type { CSSProperties } from 'react';
import type { LoadedPlugin } from '../../shared/ipc';
import type { PickRecord } from '../../shared/session';
import { CardFace } from './CardFace';

/** 局末总结：本局选中的强化，用缩小的原版卡面展示 */
export function Summary({ lp, picks }: { lp: LoadedPlugin; picks: readonly PickRecord[] }) {
  return (
    <ol className="hx-summary">
      {picks.map((p, i) => (
        <li key={p.item.id} className={`hx-card hx-card--${p.rarity} is-static`} style={{ '--i': i } as CSSProperties}>
          <CardFace card={{ item: p.item, rarity: p.rarity, golden: false }} lp={lp} index={i} />
        </li>
      ))}
    </ol>
  );
}
