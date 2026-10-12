/**
 * 自定义模板输出的白名单净化。内容安全策略已禁止脚本，这里再移除一切可执行或外链的元素和属性，
 * 并把相对图片路径解析到插件目录。
 */
const ALLOWED_TAGS = new Set([
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'b', 'i', 'em', 'strong', 'small', 'u', 's', 'mark', 'sub', 'sup',
  'br', 'hr', 'ul', 'ol', 'li', 'img', 'figure', 'figcaption', 'section', 'header', 'footer', 'article', 'aside',
  'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'dl', 'dt', 'dd', 'style',
]);
const ALLOWED_ATTRS = new Set(['class', 'style', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan', 'role']);
const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i;

function resolveSrc(src: string, baseUrl: string): string | null {
  const s = src.trim();
  if (SAFE_DATA_IMAGE.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('/') || s.split('/').includes('..')) return null;
  return baseUrl + s;
}

function clean(el: Element, baseUrl: string): void {
  for (const child of [...el.children]) {
    const tag = child.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      const keep = ALLOWED_ATTRS.has(name) || name.startsWith('aria-') || name.startsWith('data-');
      if (!keep || (name === 'style' && /url\s*\(|expression|@import/i.test(attr.value))) child.removeAttribute(attr.name);
    }
    if (tag === 'img') {
      const src = resolveSrc(child.getAttribute('src') ?? '', baseUrl);
      if (src) child.setAttribute('src', src);
      else child.remove();
      continue;
    }
    if (tag === 'style' && /@import|url\s*\(\s*['"]?\s*[a-z]+:/i.test(child.textContent ?? '')) {
      child.remove();
      continue;
    }
    clean(child, baseUrl);
  }
}

export function sanitizeTemplateHtml(html: string, baseUrl: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  clean(doc.body, baseUrl);
  return doc.body.innerHTML;
}
