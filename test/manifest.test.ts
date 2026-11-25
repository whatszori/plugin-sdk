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

describe('manifest, plugin API 2', () => {
  const base = { id: 'x', name: 'X', version: '1.0.0', apiVersion: 2 };
  it('accepts permissions, sites, settings and a sandbox', () => {
    expect(
      validateManifest({
        ...base,
        permissions: ['messages', 'network'],
        network: ['api.example.com', '*.cdn.org', 'localhost:11434'],
        settings: [{ key: 'token', type: 'password', label: 'Token' }],
        sandbox: true,
        icon: 'icon.svg',
        minAppVersion: '0.1.0',
      }),
    ).toEqual([]);
  });

  it('refuses what the app refuses', () => {
    const msg = (m: object) => validateManifest({ ...base, ...m }).map((p) => p.message).join('; ');
    expect(msg({ permissions: ['teleport'] })).toMatch(/unknown permission/);
    expect(msg({ network: ['api.example.com'] })).toMatch(/add "network"/);
    expect(msg({ permissions: ['network'], network: ['*.com'] })).toMatch(/too broad/);
    expect(msg({ permissions: ['network'], network: ['https://api.example.com'] })).toMatch(/without https/);
    expect(msg({ permissions: ['network'], network: ['8.8.8.8'] })).toMatch(/IP address/);
    expect(msg({ settings: [{ key: 'k', type: 'select', label: 'K' }] })).toMatch(/needs options/);
    expect(msg({ apiVersion: 3 })).toMatch(/plugin API 2/);
    expect(msg({ apiVersion: undefined, permissions: ['messages'] })).toMatch(/need "apiVersion": 2/);
    expect(validateManifest({ ...base, minAppVersion: '9.0.0' }, undefined, '0.2.0')[0].message).toMatch(/9\.0\.0 or newer/);
  });
});
