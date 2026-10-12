import { Fragment, type ReactNode } from 'react';
import { parseMarkup, type MarkupNode } from '../../shared/markup';

function render(nodes: readonly MarkupNode[]): ReactNode {
  return nodes.map((n, i) => {
    if (n.type === 'text') return <Fragment key={i}>{n.text}</Fragment>;
    if (n.type === 'br') return <br key={i} />;
    const kids = render(n.children);
    if (n.tag === 'b') return <b key={i}>{kids}</b>;
    if (n.tag === 'i') return <i key={i}>{kids}</i>;
    if (n.tag === 'color') return <span key={i} style={{ color: n.color }}>{kids}</span>;
    return <span key={i} className={`hx-${n.tag}`}>{kids}</span>;
  });
}

/** 渲染卡片描述标签（<gold> <keyword> 等），全部走 React 文本节点，不使用 innerHTML。 */
export function RichText({ text }: { text?: string }) {
  if (!text) return null;
  return <>{render(parseMarkup(text))}</>;
}
