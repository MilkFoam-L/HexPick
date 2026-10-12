import type { LoadedPlugin } from '../../shared/ipc';
import type { PickItem, Rarity } from '../../shared/plugin';
import { AugmentBody, PortraitBody, TextBody } from './cardBodies';
import { CustomBody } from './CustomBody';

export interface FaceCard {
  readonly item: PickItem;
  readonly rarity: Rarity;
  readonly golden: boolean;
}

function Body({ card, lp, index }: { card: FaceCard; lp: LoadedPlugin; index: number }) {
  if (lp.template) return <CustomBody card={card} lp={lp} index={index} />;
  if (lp.plugin.layout === 'portrait') return <PortraitBody card={card} lp={lp} />;
  if (lp.plugin.layout === 'text') return <TextBody card={card} lp={lp} />;
  return <AugmentBody card={card} lp={lp} />;
}

/**
 * 卡面按游戏的层级叠放海克斯大乱斗原版贴图：
 * 阴影 → 卡底 → 棱彩全息 → 内容 → 品质边框 → 悬停光泽 → 金色刷新扫光 → 未选中遮罩 → 选择界面特效
 */
export function CardFace({ card, lp, index }: { card: FaceCard; lp: LoadedPlugin; index: number }) {
  return (
    <>
      <span className="hx-tex hx-tex--shadow" aria-hidden />
      <span className="hx-tex hx-tex--bg" aria-hidden />
      {card.rarity === 'prismatic' && <span className="hx-tex hx-tex--holo" aria-hidden />}
      <span className="hx-card__content">
        <Body card={card} lp={lp} index={index} />
      </span>
      <span className="hx-tex hx-tex--frame" aria-hidden />
      <span className="hx-tex hx-tex--sheen" aria-hidden />
      {card.golden && <span className="hx-tex hx-tex--swipe" aria-hidden />}
      <span className="hx-tex hx-tex--notpicked" aria-hidden />
      {/* 游戏特效：悬停扫光、棱彩闪电（裁切在卡面内），出现闪光、选中光环与星芒 */}
      <span className="hx-card__clip" aria-hidden>
        <span className="hx-fx hx-fx--sweep" />
        {card.rarity === 'prismatic' && <span className="hx-fx hx-fx--lightning" />}
      </span>
      <span className="hx-fx hx-fx--flare" aria-hidden />
      <span className="hx-fx hx-fx--pulse" aria-hidden />
      <span className="hx-fx hx-fx--spark hx-fx--spark-a" aria-hidden />
      <span className="hx-fx hx-fx--spark hx-fx--spark-b" aria-hidden />
    </>
  );
}
