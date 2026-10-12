/**
 * 卡片描述里的轻量标签，模仿游戏描述的配色：
 * <gold> <keyword> <ap> <ad> <heal> <shield> <true> <b> <i> <br> <color value="#hex">
 * 未知标签按普通文本显示。输出结构化节点（React 渲染）或安全 HTML（自定义模板）。
 */

export const STYLE_TAGS = ['gold', 'keyword', 'ap', 'ad', 'heal', 'shield', 'true', 'b', 'i', 'color'] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export type MarkupNode =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'br' }
  | { readonly type: 'tag'; readonly tag: StyleTag; readonly color?: string; readonly children: readonly MarkupNode[] };

const TOKEN = /<(\/?)([a-z]+)(?:\s+value="([^"]*)")?\s*\/?>/gi;
const COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20})$/i;

interface Frame {
  tag: StyleTag | null;
  color?: string;
  children: MarkupNode[];
}

const isStyleTag = (t: string): t is StyleTag => (STYLE_TAGS as readonly string[]).includes(t);

export function parseMarkup(src: string): MarkupNode[] {
  const stack: Frame[] = [{ tag: null, children: [] }];
  const top = () => stack[stack.length - 1];
  const pushText = (text: string) => {
    if (!text) return;
    const kids = top().children;
    const last = kids[kids.length - 1];
    if (last && last.type === 'text') kids[kids.length - 1] = { type: 'text', text: last.text + text };
    else kids.push({ type: 'text', text });
  };
  const closeTop = () => {
    const f = stack.pop() as Frame;
    top().children.push({ type: 'tag', tag: f.tag as StyleTag, color: f.color, children: f.children });
  };

  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    pushText(src.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    const [raw, slash, nameRaw, value] = m;
    const name = nameRaw.toLowerCase();
    if (name === 'br' && !slash) {
      top().children.push({ type: 'br' });
    } else if (!slash && isStyleTag(name) && (name !== 'color' || (value !== undefined && COLOR.test(value)))) {
      stack.push({ tag: name, color: name === 'color' ? value : undefined, children: [] });
    } else if (slash && stack.some((f, i) => i > 0 && f.tag === name)) {
      while (top().tag !== name) closeTop();
      closeTop();
    } else {
      pushText(raw);
    }
  }
  pushText(src.slice(last));
  while (stack.length > 1) closeTop();
  return stack[0].children;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function nodeToHtml(n: MarkupNode): string {
  if (n.type === 'text') return escapeHtml(n.text);
  if (n.type === 'br') return '<br>';
  const inner = n.children.map(nodeToHtml).join('');
  if (n.tag === 'b' || n.tag === 'i') return `<${n.tag}>${inner}</${n.tag}>`;
  if (n.tag === 'color') return `<span style="color:${n.color}">${inner}</span>`;
  return `<span class="hx-${n.tag}">${inner}</span>`;
}

export function markupToHtml(src: string): string {
  return parseMarkup(src).map(nodeToHtml).join('');
}
