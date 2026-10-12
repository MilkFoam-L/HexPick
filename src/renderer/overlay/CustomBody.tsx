import { useLayoutEffect, useRef } from 'react';
import { renderTemplate, type TemplateScope } from '../../shared/template';
import { sanitizeTemplateHtml } from '../common/sanitize';
import { iconIsImage, iconUrl } from '../common/theme';
import type { BodyProps } from './cardBodies';

/** 模板内可用的基础样式：描述标签配色。插件 CSS 追加在后面，可以覆盖。 */
const BASE_CSS = `
:host { display: block; height: 100%; color: var(--hx-text); font-family: var(--hx-font-body); }
* { box-sizing: border-box; }
.card { height: 100%; }
img { max-width: 100%; }
.hx-gold { color: #f0c75e; font-weight: 600; }
.hx-keyword { color: #fff; font-weight: 600; text-decoration: underline dotted rgba(255,255,255,.4); }
.hx-ap { color: #b48cff; } .hx-ad { color: #ff9a4a; } .hx-heal { color: #63d98a; }
.hx-shield { color: #b9dcff; } .hx-true { color: #fff; font-weight: 600; }
`;

export function CustomBody({ card, lp, index }: BodyProps & { index: number }) {
  const host = useRef<HTMLSpanElement>(null);
  const { item } = card;

  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !lp.template) return;
    const root = el.shadowRoot ?? el.attachShadow({ mode: 'open' });
    const scope: TemplateScope = {
      id: item.id,
      title: item.title,
      description: item.description,
      icon: iconIsImage(item.icon) ? undefined : item.icon,
      iconUrl: iconIsImage(item.icon) ? iconUrl(lp.baseUrl, item.icon) : undefined,
      image: item.image,
      tags: item.tags.join(' · '),
      rarity: card.rarity,
      rarityLabel: lp.plugin.theme.labels[card.rarity],
      golden: card.golden,
      index: index + 1,
      plugin: { name: lp.plugin.name, id: lp.plugin.id },
      data: item.data,
    };
    const html = sanitizeTemplateHtml(renderTemplate(lp.template, scope), lp.baseUrl);
    const style = document.createElement('style');
    style.textContent = BASE_CSS + (lp.style ?? '');
    const body = document.createElement('div');
    body.className = `card rarity-${card.rarity}`;
    body.innerHTML = html;
    root.replaceChildren(style, body);
  }, [card, lp, item, index]);

  return <span ref={host} className="hx-custom" />;
}
