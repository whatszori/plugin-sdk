#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { validateManifest } from '../manifest.js';
import { build, readProjectManifest } from './build.js';
import { create } from './create.js';
import { pluginsDir } from './paths.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, '..', '..', 'package.json'), 'utf8')) as {
  version: string;
};

const HELP = `wz-plugin ${pkg.version}: build plugins for WhatsZori

Usage:
  wz-plugin create <folder> [--id <id>] [--name <name>] [--author <name>]
      start a new plugin from the template
  wz-plugin build [--out <folder>] [--minify]
      bundle into <out>/<id>/ (default: dist), ready to copy into the plugins folder
  wz-plugin install [--minify]
      build straight into WhatsZori's plugins folder
  wz-plugin dev
      like install, and rebuild on every save; turn the plugin off and on in
      Settings → Plugins to load the new version
  wz-plugin validate [folder]
      check manifest.json

WhatsZori's folder is found the way the app finds it; WHATSZORI_CONFIG_DIR overrides it.
`;

const ok = (s: string) => console.log(`✓ ${s}`);
const fail = (s: string): never => {
  console.error(`✗ ${s}`);
  process.exit(1);
};

async function main(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      id: { type: 'string' },
      name: { type: 'string' },
      author: { type: 'string' },
      out: { type: 'string' },
      minify: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h' || values.help) {
    console.log(HELP);
    return;
  }
  const root = process.cwd();

  switch (cmd) {
    case 'create': {
      const target = positionals[0] ?? fail('create needs a folder name');
      const { dir, id } = await create({
        dir: target,
        id: values.id,
        name: values.name,
        author: values.author,
        sdkVersion: pkg.version,
      });
      ok(`created ${id} in ${dir}`);
      console.log(`\nNext:\n  cd ${target}\n  npm install\n  npm run dev`);
      return;
    }
    case 'build': {
      const out = resolve(values.out ?? 'dist');
      const r = await build({ root, outDir: out, minify: values.minify });
      ok(`built ${r.manifest.id} ${r.manifest.version} into ${r.folder}`);
      return;
    }
    case 'install': {
      const r = await build({ root, outDir: pluginsDir(), minify: values.minify });
      ok(`installed ${r.manifest.id} into ${r.folder}`);
      console.log('Turn it on in WhatsZori: Settings → Plugins.');
      return;
    }
    case 'dev': {
      const out = pluginsDir();
      const r = await build({
        root,
        outDir: out,
        watch: true,
        onRebuild: (good, errors) => {
          const t = new Date().toLocaleTimeString();
          if (good) ok(`${t} rebuilt; turn the plugin off and on in Settings → Plugins to reload`);
          else console.error(`✗ ${t}\n${errors.join('\n')}`);
        },
      });
      console.log(`Watching ${root}\nWriting to ${r.folder}\nPress Ctrl+C to stop.`);
      const stop = () => void r.stop?.().then(() => process.exit(0));
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
      return;
    }
    case 'validate': {
      const dir = resolve(positionals[0] ?? root);
      const file = join(dir, 'manifest.json');
      if (!existsSync(file)) fail(`no manifest.json in ${dir}`);
      let raw: unknown;
      try {
        raw = JSON.parse(readFileSync(file, 'utf8'));
      } catch (err) {
        fail(`manifest.json isn't valid JSON: ${(err as Error).message}`);
      }
      const problems = validateManifest(raw);
      if (problems.length) fail(problems.map((p) => `${p.field || 'manifest'}: ${p.message}`).join('\n  '));
      const m = await readProjectManifest(dir);
      ok(`${m.id} ${m.version} looks good`);
      return;
    }
    default:
      fail(`unknown command "${cmd}"; run wz-plugin --help`);
  }
}

main(process.argv.slice(2)).catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
