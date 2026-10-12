import type { CSSProperties } from 'react';
import type { LoadedPlugin } from '../../shared/ipc';
import type { Rarity } from '../../shared/plugin';
import { gameAsset, hueOf, iconIsImage, iconUrl } from '../common/theme';
import type { FaceCard } from './CardFace';
import { RichText } from './RichText';

export interface BodyProps {
  readonly card: FaceCard;
  readonly lp: LoadedPlugin;
}

function Glyph({ icon, baseUrl }: { icon?: string; baseUrl: string }) {
  if (iconIsImage(icon)) return <img className="hx-glyph-img" src={iconUrl(baseUrl, icon)} alt="" draggable={false} />;
  if (icon) return <span className="hx-glyph-text">{icon}</span>;
  return <img className="hx-glyph-img" src={gameAsset('icons/genericabilityaugmenticon_gold.png')} alt="" draggable={false} />;
}

function TierLabel({ rarity, lp }: { rarity: Rarity; lp: LoadedPlugin }) {
  return <span className="hx-tier">{lp.plugin.theme.labels[rarity]}</span>;
}

function Tags({ tags }: { tags: readonly string[] }) {
  if (!tags.length) return null;
  return (
    <span className="hx-tags">
      {tags.map((t) => (
        <span key={t} className="hx-tag">{t}</span>
      ))}
    </span>
  );
}

/** 游戏原样：图标徽章 + 名称 + 分隔饰线 + 效果描述 + 品质 */
export function AugmentBody({ card, lp }: BodyProps) {
  const { item } = card;
  return (
    <span className="hx-aug">
      <span className="hx-aug__medal">
        <span className="hx-tex hx-tex--iconback" aria-hidden />
        <Glyph icon={item.image ?? item.icon} baseUrl={lp.baseUrl} />
      </span>
      <span className="hx-aug__title">{item.title}</span>
      <span className="hx-rule" aria-hidden />
      <span className="hx-aug__desc">
        <RichText text={item.description} />
      </span>
      <Tags tags={item.tags} />
      <TierLabel rarity={card.rarity} lp={lp} />
    </span>
  );
}

/** 点人用：大头像（图片或按名字着色的首字头像） */
export function PortraitBody({ card, lp }: BodyProps) {
  const { item } = card;
  const pic = item.image ?? (iconIsImage(item.icon) ? item.icon : undefined);
  const style = { '--avatar-hue': hueOf(item.title) } as CSSProperties;
  return (
    <span className="hx-portrait">
      <span className="hx-portrait__avatar" style={style}>
        <span className="hx-tex hx-tex--iconback" aria-hidden />
        {pic ? (
          <img src={iconUrl(lp.baseUrl, pic)} alt="" draggable={false} />
        ) : (
          <span className="hx-portrait__initial">{item.icon ?? Array.from(item.title)[0]}</span>
        )}
      </span>
      <span className="hx-portrait__name">{item.title}</span>
      <span className="hx-rule" aria-hidden />
      <span className="hx-portrait__desc">
        <RichText text={item.description} />
      </span>
      <Tags tags={item.tags} />
      <TierLabel rarity={card.rarity} lp={lp} />
    </span>
  );
}

/** 投屏用：大字 */
export function TextBody({ card, lp }: BodyProps) {
  const { item } = card;
  return (
    <span className="hx-text">
      {item.icon && !iconIsImage(item.icon) && <span className="hx-text__icon">{item.icon}</span>}
      <span className="hx-text__title">{item.title}</span>
      <span className="hx-text__desc">
        <RichText text={item.description} />
      </span>
      <TierLabel rarity={card.rarity} lp={lp} />
    </span>
  );
}
