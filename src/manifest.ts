import type { PluginManifest } from './types.js';

// The same rules the app applies when it reads <config>/plugins/<id>/manifest.json (Go,
// internal/plugins/manifest.go), so a plugin that passes here isn't rejected there.
export const PLUGIN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

// the newest plugin API the app this SDK is for provides
export const SUPPORTED_API = 2;

export const PERMISSIONS: Record<string, string> = {
  messages: 'Read your messages, search them, and see edits and deletions as they happen',
  contacts: 'See your contacts, group members and your own profile',
  media: 'Show photos, videos and profile pictures from your chats',
  composer: 'Write into the message box and add attachments (you still press Send)',
  notifications: 'Show desktop notifications',
  clipboard: 'Copy text and pictures to the clipboard',
  files: 'Save files to your computer, in a place you pick',
  'chats.manage': 'Pin, mute and archive chats when you click its buttons (your phone sees this)',
  presence: 'See who is online and who is typing',
  network: 'Connect to the internet sites listed below',
};

const SETTING_TYPES = new Set(['text', 'password', 'textarea', 'toggle', 'select', 'number']);
const VERSION = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/;
const HOST = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export interface ManifestProblem {
  field: string;
  message: string;
}

const RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

// a path inside the plugin folder, the way the app's file server accepts it
export function isSafeRelative(p: string): boolean {
  if (!p || p.startsWith('/') || /[\\:\0]/.test(p)) return false;
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.' || seg === '..') return false;
    if (seg.endsWith('.') || seg.endsWith(' ')) return false;
    if (RESERVED.has(seg.split('.')[0].toUpperCase())) return false;
  }
  return true;
}

const LOCAL = new Set(['localhost', '127.0.0.1', '::1']);

// "api.example.com", "*.example.com", "localhost:11434"; why a pattern is refused, or null
export function checkNetworkPattern(p: string): string | null {
  if (typeof p !== 'string' || !p) return 'must be a host name';
  if (p.includes('/')) return 'only the host name, without https:// or a path';
  let host = p;
  const m = /^(.*):(\d+)$/.exec(p);
  if (m && !m[1].includes(':')) {
    host = m[1];
    const port = Number(m[2]);
    if (port < 1 || port > 65535) return 'bad port';
  }
  if (LOCAL.has(host)) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return 'use a host name, not an IP address';
  if (host !== host.toLowerCase() || !HOST.test(host)) return 'not a host name';
  if (!host.replace(/^\*\./, '').includes('.'))
    return 'too broad: name a site, like "api.example.com" or "*.example.com"';
  return null;
}

function compareVersions(a: string, b: string): number {
  const n = (v: string) => v.split(/[-+]/)[0].split('.').map(Number);
  const [x, y] = [n(a), n(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0) ? -1 : 1;
  return 0;
}

export function validateManifest(value: unknown, folder?: string, appVersion?: string): ManifestProblem[] {
  const out: ManifestProblem[] = [];
  const add = (field: string, message: string) => out.push({ field, message });
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [{ field: '', message: 'manifest.json must be a JSON object' }];
  }
  const m = value as Record<string, unknown>;
  const str = (k: string, required: boolean) => {
    const v = m[k];
    if (v === undefined) {
      if (required) add(k, `"${k}" is required`);
      return undefined;
    }
    if (typeof v !== 'string') {
      add(k, `"${k}" must be a string`);
      return undefined;
    }
    return v;
  };
  const id = str('id', true);
  if (id !== undefined) {
    if (!PLUGIN_ID.test(id) || id.includes('..')) add('id', 'use letters, digits, ".", "-" and "_" (at most 128)');
    else if (folder !== undefined && folder !== id) add('id', `must match the folder name "${folder}"`);
  }
  const name = str('name', true);
  if (name !== undefined && !name.trim()) add('name', 'must not be empty');
  const version = str('version', true);
  if (version !== undefined && !VERSION.test(version)) add('version', 'use a version like 1.0.0');
  str('description', false);
  str('author', false);
  const main = str('main', false);
  if (main !== undefined && (!isSafeRelative(main) || !/\.m?js$/i.test(main)))
    add('main', 'must be a .js or .mjs file inside the plugin folder');
  const icon = str('icon', false);
  if (icon !== undefined && (!isSafeRelative(icon) || !/\.(png|svg|jpe?g|webp)$/i.test(icon)))
    add('icon', 'must be a .png, .svg, .jpg or .webp file inside the plugin folder');
  const homepage = str('homepage', false);
  if (homepage !== undefined && !homepage.startsWith('https://')) add('homepage', 'must start with https://');

  const api = m.apiVersion ?? 1;
  if (typeof api !== 'number' || !Number.isInteger(api) || api < 1) add('apiVersion', 'must be 1 or 2');
  else if (api > SUPPORTED_API) add('apiVersion', `WhatsZori provides plugin API ${SUPPORTED_API}`);
  const minApp = str('minAppVersion', false);
  if (minApp !== undefined) {
    if (!VERSION.test(minApp)) add('minAppVersion', 'use a version like 0.2.0');
    else if (appVersion && compareVersions(appVersion, minApp) < 0)
      add('minAppVersion', `needs WhatsZori ${minApp} or newer (this is ${appVersion})`);
  }
  const v2 = ['permissions', 'network', 'settings', 'sandbox'].filter((k) => m[k] !== undefined);
  if (api === 1 && v2.length) add(v2[0], `${v2.join(', ')} need "apiVersion": 2`);

  const perms = m.permissions;
  const listed = new Set<string>();
  if (perms !== undefined) {
    if (!Array.isArray(perms)) add('permissions', 'must be a list');
    else
      for (const p of perms) {
        if (typeof p !== 'string' || !(p in PERMISSIONS))
          add('permissions', `unknown permission ${JSON.stringify(p)}; known: ${Object.keys(PERMISSIONS).join(', ')}`);
        else if (listed.has(p)) add('permissions', `"${p}" is listed twice`);
        listed.add(String(p));
      }
  }
  const network = m.network;
  if (network !== undefined) {
    if (!Array.isArray(network)) add('network', 'must be a list of host names');
    else {
      for (const d of network) {
        const why = checkNetworkPattern(d as string);
        if (why) add('network', `${JSON.stringify(d)}: ${why}`);
      }
      if (network.length && !listed.has('network')) add('permissions', 'network lists sites, so add "network" here');
    }
  }
  if (listed.has('network') && !(Array.isArray(network) && network.length))
    add('network', 'the "network" permission needs the sites it connects to');

  const settings = m.settings;
  if (settings !== undefined) {
    if (!Array.isArray(settings)) add('settings', 'must be a list of fields');
    else {
      const keys = new Set<string>();
      settings.forEach((s, i) => {
        const f = s as Record<string, unknown>;
        const at = `settings[${i}]`;
        if (typeof f?.key !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(f.key))
          add(at, 'key must be 1 to 64 letters, digits, "_", "." or "-"');
        else if (keys.has(f.key)) add(at, `key "${f.key}" is used twice`);
        else keys.add(f.key);
        if (!SETTING_TYPES.has(f?.type as string))
          add(at, 'type must be text, password, textarea, toggle, select or number');
        if (typeof f?.label !== 'string' || !f.label.trim()) add(at, 'label is missing');
        if (f?.type === 'select' && !(Array.isArray(f.options) && f.options.length)) add(at, 'a select needs options');
      });
    }
  }
  if (m.sandbox !== undefined && typeof m.sandbox !== 'boolean') add('sandbox', 'must be true or false');
  return out;
}

export function assertManifest(value: unknown, folder?: string): PluginManifest {
  const problems = validateManifest(value, folder);
  if (problems.length) {
    throw new Error(
      'manifest.json:\n' + problems.map((p) => `  ${p.field ? p.field + ': ' : ''}${p.message}`).join('\n'),
    );
  }
  return value as PluginManifest;
}
