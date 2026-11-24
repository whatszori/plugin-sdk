import { describe, expect, it } from 'vitest';
import { isSafeRelative, validateManifest } from '../src/manifest.js';

const fields = (m: unknown, folder?: string) => validateManifest(m, folder).map((p) => p.field);

describe('manifest', () => {
  it('accepts a good one', () => {
    expect(validateManifest({ id: 'quick-replies', name: 'Quick replies', version: '1.0.0' })).toEqual([]);
    expect(validateManifest({ id: 'a.b_c', name: 'X', version: '0.1.0-beta.1', main: 'lib/main.mjs' })).toEqual([]);
  });

  it('reports what the app would refuse', () => {
    expect(fields({})).toEqual(['id', 'name', 'version']);
    expect(fields({ id: '../x', name: 'X', version: '1.0.0' })).toEqual(['id']);
    expect(fields({ id: 'x', name: ' ', version: 'one' })).toEqual(['name', 'version']);
    expect(fields({ id: 'x', name: 'X', version: '1.0.0', main: '../evil.js' })).toEqual(['main']);
    expect(fields({ id: 'x', name: 'X', version: '1.0.0', main: 'index.ts' })).toEqual(['main']);
    expect(fields({ id: 'x', name: 'X', version: '1.0.0' }, 'y')).toEqual(['id']);
    expect(fields([])).toEqual(['']);
  });

  it('safe paths match the app file server', () => {
    expect(isSafeRelative('a/b.js')).toBe(true);
    for (const bad of ['', '/a.js', 'a\\b.js', 'c:x.js', 'a/../b.js', './a.js', 'a./b.js', 'CON.js', 'lpt1/x.js'])
      expect(isSafeRelative(bad), bad).toBe(false);
  });
});
