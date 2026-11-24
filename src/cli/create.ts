import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGIN_ID } from '../manifest.js';

const here = dirname(fileURLToPath(import.meta.url));
const templates = resolve(here, '..', '..', 'templates');

export interface CreateOptions {
  dir: string;
  id?: string;
  name?: string;
  author?: string;
  sdkVersion: string;
}

// "My cool plugin" -> "my-cool-plugin"
export function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|-+$/g, '')
    .slice(0, 64);
}

export async function create(o: CreateOptions): Promise<{ dir: string; id: string }> {
  const dir = resolve(o.dir);
  const id = o.id ?? slug(basename(dir));
  if (!PLUGIN_ID.test(id)) throw new Error(`"${id}" can't be a plugin id; pass --id`);
  if (existsSync(dir) && (await readdir(dir)).length > 0) throw new Error(`${dir} isn't empty`);
  const name = o.name ?? id.replace(/[-_.]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const vars: Record<string, string> = {
    id,
    name,
    author: o.author ?? '',
    sdkVersion: o.sdkVersion,
  };
  await copyTemplate(join(templates, 'basic'), dir, vars);
  return { dir, id };
}

async function copyTemplate(from: string, to: string, vars: Record<string, string>): Promise<void> {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from)) {
    const src = join(from, entry);
    // npm drops .gitignore from published packages, so the template keeps it as _gitignore
    const dest = join(to, entry === '_gitignore' ? '.gitignore' : entry);
    if ((await stat(src)).isDirectory()) {
      await copyTemplate(src, dest, vars);
      continue;
    }
    const text = await readFile(src, 'utf8');
    await writeFile(dest, text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m));
  }
}
