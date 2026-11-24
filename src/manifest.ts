import type { PluginManifest } from './types.js';

// The same rules the app applies when it reads <config>/plugins/<id>/manifest.json, so a plugin
// that passes here isn't rejected there.
export const PLUGIN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

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

export function validateManifest(value: unknown, folder?: string): ManifestProblem[] {
  const out: ManifestProblem[] = [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [{ field: '', message: 'manifest.json must be a JSON object' }];
  }
  const m = value as Record<string, unknown>;
  const str = (k: string, required: boolean) => {
    const v = m[k];
    if (v === undefined) {
      if (required) out.push({ field: k, message: `"${k}" is required` });
      return undefined;
    }
    if (typeof v !== 'string') {
      out.push({ field: k, message: `"${k}" must be a string` });
      return undefined;
    }
    return v;
  };
  const id = str('id', true);
  if (id !== undefined) {
    if (!PLUGIN_ID.test(id) || id.includes('..'))
      out.push({ field: 'id', message: 'use letters, digits, ".", "-" and "_" (at most 128)' });
    else if (folder !== undefined && folder !== id)
      out.push({ field: 'id', message: `must match the folder name "${folder}"` });
  }
  const name = str('name', true);
  if (name !== undefined && !name.trim()) out.push({ field: 'name', message: 'must not be empty' });
  const version = str('version', true);
  if (version !== undefined && !/^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$/.test(version))
    out.push({ field: 'version', message: 'use a version like 1.0.0' });
  str('description', false);
  str('author', false);
  const main = str('main', false);
  if (main !== undefined && (!isSafeRelative(main) || !/\.m?js$/i.test(main)))
    out.push({ field: 'main', message: 'must be a .js or .mjs file inside the plugin folder' });
  return out;
}

export function assertManifest(value: unknown, folder?: string): PluginManifest {
  const problems = validateManifest(value, folder);
  if (problems.length) {
    throw new Error(
      'manifest.json:\n' +
        problems.map((p) => `  ${p.field ? p.field + ': ' : ''}${p.message}`).join('\n'),
    );
  }
  return value as PluginManifest;
}
