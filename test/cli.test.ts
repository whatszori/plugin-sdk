import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PluginContext, SlotName } from '../src/types.js';

const root = resolve(import.meta.dirname, '..');
const cli = join(root, 'dist', 'cli', 'index.js');
const run = (args: string[], cwd: string, env: NodeJS.ProcessEnv = {}) =>
  execFileSync(process.execPath, [cli, ...args], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });

describe('wz-plugin', () => {
  beforeAll(() => {
    // the CLI runs from dist, like it does once installed
    execFileSync(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.build.json'], { cwd: root });
  }, 60_000);

  it('creates, builds and installs a plugin that runs on the app React', async () => {
    const work = mkdtempSync(join(tmpdir(), 'wz-sdk-'));
    run(['create', 'hello-world', '--name', 'Hello world'], work);
    const project = join(work, 'hello-world');
    const manifest = JSON.parse(readFileSync(join(project, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({ id: 'hello-world', name: 'Hello world', version: '0.1.0' });
    expect(existsSync(join(project, '.gitignore'))).toBe(true);

    expect(run(['validate'], project)).toMatch(/looks good/);
    expect(run(['build'], project)).toMatch(/built hello-world/);
    const out = join(project, 'dist', 'hello-world');
    const bundle = readFileSync(join(out, 'index.js'), 'utf8');
    // no React of its own inside
    expect(bundle).not.toMatch(/react\.production|__SECRET_INTERNALS/);
    expect(bundle.length).toBeLessThan(30_000);
    const built = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
    expect(built.main).toBe('index.js');
    expect(built.$schema).toBeUndefined();

    // install goes to <config>/plugins/<id>
    const cfg = join(work, 'cfg');
    run(['install'], project, { WHATSZORI_CONFIG_DIR: cfg });
    expect(existsSync(join(cfg, 'plugins', 'hello-world', 'index.js'))).toBe(true);

    // load it like the app does and render its slots
    const slots = new Map<SlotName, React.ComponentType<never>>();
    const events: string[] = [];
    const Btn = ({ label }: { label: string }) => React.createElement('button', null, label);
    const ctx = {
      pluginId: 'hello-world',
      React,
      ui: { IconButton: Btn, MenuItem: Btn, Input: () => React.createElement('input'), Button: Btn, Toggle: Btn },
      registerSlot: (name: SlotName, c: React.ComponentType<never>) => {
        slots.set(name, c);
        return () => slots.delete(name);
      },
      onEvent: (name: string) => {
        events.push(name);
        return () => {};
      },
      actions: { openChat() {}, insertIntoComposer() {}, toast() {} },
      data: { chats: () => [], activeChat: () => null, messages: async () => [] },
      settings: { all: async () => ({}), set: async () => {}, delete: async () => {} },
      storage: { get: async () => null, set: async () => {}, delete: async () => {}, keys: async () => [] },
      log: { info() {}, warn() {}, error() {} },
    } as unknown as PluginContext;
    const mod = await import(pathToFileURL(join(out, 'index.js')).href);
    await mod.default.start(ctx);
    expect([...slots.keys()].sort()).toEqual(['composer.actions', 'message.contextMenu', 'settings.sections']);
    expect(events).toEqual(['msg:batch']);
    const html = renderToString(React.createElement(slots.get('composer.actions')!));
    expect(html).toContain('Insert “Hi!”');
  }, 60_000);

  it('explains a bad manifest', () => {
    const work = mkdtempSync(join(tmpdir(), 'wz-sdk-'));
    run(['create', 'broken'], work);
    const project = join(work, 'broken');
    execFileSync(process.execPath, ['-e', `require('fs').writeFileSync('manifest.json', JSON.stringify({ id: 'x y', name: 'B', version: '1' }))`], { cwd: project });
    expect(() => run(['build'], project)).toThrow(/id: use letters[\s\S]*version: use a version/);
  });
});
