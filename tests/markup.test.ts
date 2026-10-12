import { describe, expect, it } from 'vitest';
import { markupToHtml, parseMarkup } from '../src/shared/markup';
import { renderTemplate } from '../src/shared/template';

describe('markup', () => {
  it('renders game-style tags', () => {
    expect(markupToHtml('获得<gold>1750 金币</gold>和<keyword>护盾</keyword><br>(<ap>+60% AP</ap>)')).toBe(
      '获得<span class="hx-gold">1750 金币</span>和<span class="hx-keyword">护盾</span><br>(<span class="hx-ap">+60% AP</span>)',
    );
  });

  it('supports nesting and custom colours', () => {
    expect(markupToHtml('<b>超<color value="#ff5577">辣</color></b>')).toBe('<b>超<span style="color:#ff5577">辣</span></b>');
  });

  it('escapes unknown tags and html instead of rendering them', () => {
    expect(markupToHtml('<script>alert(1)</script> & <img src=x onerror=1>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;img src=x onerror=1&gt;',
    );
  });

  it('rejects colour values that could inject css', () => {
    expect(markupToHtml('<color value="red;background:url(x)">a</color>')).toBe(
      '&lt;color value=&quot;red;background:url(x)&quot;&gt;a&lt;/color&gt;',
    );
  });

  it('auto-closes unclosed tags and keeps stray closers as text', () => {
    expect(parseMarkup('<gold>a')).toEqual([{ type: 'tag', tag: 'gold', children: [{ type: 'text', text: 'a' }] }]);
    expect(markupToHtml('a</gold>')).toBe('a&lt;/gold&gt;');
  });
});

describe('renderTemplate', () => {
  const scope = { title: '<火锅>', description: '<gold>辣</gold>', data: { price: 120, empty: '' }, rarity: 'prismatic' };

  it('escapes double braces and renders markup for triple braces', () => {
    expect(renderTemplate('<h1>{{title}}</h1><p>{{{description}}}</p>', scope)).toBe(
      '<h1>&lt;火锅&gt;</h1><p><span class="hx-gold">辣</span></p>',
    );
  });

  it('reads nested data and handles sections', () => {
    expect(renderTemplate('{{#data.price}}¥{{data.price}}{{/data.price}}{{#data.empty}}X{{/data.empty}}{{^data.empty}}无{{/data.empty}}', scope)).toBe(
      '¥120无',
    );
  });

  it('supports nested sections with different keys', () => {
    expect(renderTemplate('{{#title}}[{{#rarity}}{{rarity}}{{/rarity}}]{{/title}}', scope)).toBe('[prismatic]');
  });

  it('does not walk the prototype chain', () => {
    expect(renderTemplate('{{constructor}}{{title.length}}', scope)).toBe('');
  });
});
