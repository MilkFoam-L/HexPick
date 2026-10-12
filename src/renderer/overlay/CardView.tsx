import type { CSSProperties } from 'react';
import type { LoadedPlugin } from '../../shared/ipc';
import type { Card, Phase } from '../../shared/session';
import { gameAsset } from '../common/theme';
import { CardFace } from './CardFace';

export interface CardViewProps {
  readonly card: Card;
  readonly index: number;
  readonly lp: LoadedPlugin;
  readonly phase: Phase;
  readonly pickedIndex: number | null;
  readonly animKey: string;
  onPick(i: number): void;
  onReroll(i: number): void;
  onHover(i: number | null): void;
}

export function CardView(p: CardViewProps) {
  const { card, index, lp, phase } = p;
  const state = phase === 'picked' ? (p.pickedIndex === index ? 'is-picked' : 'is-dimmed') : '';
  const label = `${index + 1}. ${card.item.title}，${lp.plugin.theme.labels[card.rarity]}`;
  const rerollable = phase === 'choosing' && card.rerollsLeft > 0;
  const golden = card.golden && rerollable;
  // 刷新出来的卡用自下而上的擦出动画，而不是发牌动画
  const rerolled = card.rerollsLeft < lp.plugin.rules.rerollsPerCard;

  return (
    <div className="hx-slot" style={{ '--i': index } as CSSProperties}>
      <button
        key={p.animKey}
        type="button"
        className={`hx-card hx-card--${card.rarity} ${state} ${rerolled ? 'is-rerolled' : ''}`}
        aria-label={label}
        aria-pressed={p.pickedIndex === index}
        disabled={phase !== 'choosing' && p.pickedIndex !== index}
        onClick={() => p.onPick(index)}
        onMouseEnter={() => p.onHover(index)}
        onMouseLeave={() => p.onHover(null)}
        onFocus={() => p.onHover(index)}
      >
        <CardFace card={{ ...card, golden }} lp={lp} index={index} />
      </button>
      {lp.plugin.rules.rerollsPerCard > 0 && (
        <button
          type="button"
          className={`hx-reroll ${golden ? 'is-golden' : ''}`}
          disabled={!rerollable}
          onClick={() => p.onReroll(index)}
          aria-label={golden ? `金色刷新第 ${index + 1} 张（升一档）` : `刷新第 ${index + 1} 张`}
          title={golden ? '金色刷新：刷新后升一档' : '刷新这张卡'}
        >
          <img src={gameAsset('ui/reroll.png')} alt="" width={18} height={18} draggable={false} />
          <span>{card.rerollsLeft}</span>
        </button>
      )}
    </div>
  );
}
