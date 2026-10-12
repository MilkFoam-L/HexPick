import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePlugin } from '../src/shared/plugin';

const dir = join(__dirname, '..', 'plugins');

describe('bundled example plugins', () => {
  for (const name of readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    it(`${name} is valid`, () => {
      const r = parsePlugin(JSON.parse(readFileSync(join(dir, name, 'plugin.json'), 'utf8')), name);
      expect(r.ok ? 'ok' : r.error).toBe('ok');
    });
  }
});
