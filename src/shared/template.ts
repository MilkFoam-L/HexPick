/**
 * 自定义卡片模板（mustache 子集），不执行任何代码：
 *   {{key}}            转义输出，支持 a.b 路径
 *   {{{key}}}          按描述标签渲染（<gold> 等）后输出
 *   {{#key}}…{{/key}}  值非空时显示
 *   {{^key}}…{{/key}}  值为空时显示
 * 输出仍需在渲染端经过 sanitize。
 */
import { escapeHtml, markupToHtml } from './markup';

export type TemplateValue = string | number | boolean | undefined | null | TemplateScope;
export interface TemplateScope {
  readonly [key: string]: TemplateValue;
}

const SECTION = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const TRIPLE = /\{\{\{\s*([\w.]+)\s*\}\}\}/g;
const DOUBLE = /\{\{\s*([\w.]+)\s*\}\}/g;
const MAX_PASSES = 8;

function lookup(scope: TemplateScope, path: string): TemplateValue {
  let cur: TemplateValue = scope;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
    cur = (cur as TemplateScope)[key];
  }
  return cur;
}

const isPresent = (v: TemplateValue): boolean =>
  v !== undefined && v !== null && v !== false && v !== '' && typeof v !== 'object';

const asText = (v: TemplateValue): string => (isPresent(v) || v === 0 ? String(v) : '');

export function renderTemplate(tpl: string, scope: TemplateScope): string {
  let out = tpl;
  // 多轮展开以支持不同 key 的嵌套 section
  for (let i = 0; i < MAX_PASSES; i++) {
    const next = out.replace(SECTION, (_m, kind: string, key: string, body: string) =>
      (kind === '#') === isPresent(lookup(scope, key)) ? body : '',
    );
    if (next === out) break;
    out = next;
  }
  out = out.replace(TRIPLE, (_m, key: string) => markupToHtml(asText(lookup(scope, key))));
  return out.replace(DOUBLE, (_m, key: string) => escapeHtml(asText(lookup(scope, key))));
}
