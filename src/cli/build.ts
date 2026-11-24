import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { assertManifest } from '../manifest.js';
import type { PluginManifest } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));
// dist/cli -> dist
const sdkDist = resolve(here, '..');

// Everything React-ish in a plugin resolves to the SDK's forwarders, so the bundle never carries
// a React of its own and uses the app's instead.
const SDK_FILES: Record<string, string> = {
  '@whatszori/plugin-sdk': 'index.js',
  '@whatszori/plugin-sdk/react': 'react.js',
  '@whatszori/plugin-sdk/jsx-runtime': 'jsx-runtime.js',
  '@whatszori/plugin-sdk/jsx-dev-runtime': 'jsx-runtime.js',
  react: 'react.js',
  'react/jsx-runtime': 'jsx-runtime.js',
  'react/jsx-dev-runtime': 'jsx-runtime.js',
};

const sdkResolver: esbuild.Plugin = {
  name: 'whatszori-sdk',
  setup(b) {
    const names = Object.keys(SDK_FILES).map((n) => n.replace(/[/.]/g, '\\$&'));
    b.onResolve({ filter: new RegExp(`^(${names.join('|')})$`) }, (args) => ({
      path: join(sdkDist, SDK_FILES[args.path]),
    }));
    b.onResolve({ filter: /^react-dom(\/.*)?$/ }, () => ({
      errors: [{ text: 'react-dom is not available to plugins: render through slots instead' }],
    }));
  },
};

export interface BuildOptions {
  // the plugin project (where manifest.json is)
  root: string;
  // the folder the plugin folder goes into; <outDir>/<id>/
  outDir: string;
  minify?: boolean;
  watch?: boolean;
  onRebuild?: (ok: boolean, errors: string[]) => void;
}

export interface BuildResult {
  manifest: PluginManifest;
  folder: string;
  stop?: () => Promise<void>;
}

const ENTRIES = ['src/index.tsx', 'src/index.ts', 'src/index.jsx', 'src/index.js', 'index.tsx', 'index.ts'];

export async function readProjectManifest(root: string): Promise<PluginManifest> {
  const file = join(root, 'manifest.json');
  if (!existsSync(file)) throw new Error(`no manifest.json in ${root}`);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    throw new Error(`manifest.json isn't valid JSON: ${(err as Error).message}`);
  }
  return assertManifest(raw);
}

export function findEntry(root: string): string {
  for (const e of ENTRIES) if (existsSync(join(root, e))) return join(root, e);
  throw new Error(`no entry file; create one of: ${ENTRIES.join(', ')}`);
}

export async function build(o: BuildOptions): Promise<BuildResult> {
  const root = resolve(o.root);
  const manifest = await readProjectManifest(root);
  const main = manifest.main ?? 'index.js';
  const folder = join(resolve(o.outDir), manifest.id);
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });

  const options: esbuild.BuildOptions = {
    absWorkingDir: root,
    entryPoints: [findEntry(root)],
    outfile: join(folder, main),
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    jsxImportSource: '@whatszori/plugin-sdk',
    minify: !!o.minify,
    sourcemap: o.watch ? 'inline' : false,
    legalComments: 'eof',
    logLevel: 'silent',
    banner: { js: `// ${manifest.name} ${manifest.version}, built with @whatszori/plugin-sdk` },
    plugins: [sdkResolver],
  };

  const finish = async () => {
    // $schema is only for editors
    const clean: Record<string, unknown> = { ...manifest, main };
    delete clean.$schema;
    await writeFile(join(folder, 'manifest.json'), JSON.stringify(clean, null, 2) + '\n');
    // anything in assets/ ships next to the script, reachable with import.meta.url
    if (existsSync(join(root, 'assets'))) await cp(join(root, 'assets'), join(folder, 'assets'), { recursive: true });
  };

  if (!o.watch) {
    try {
      await esbuild.build(options);
    } catch (err) {
      throw new Error(formatErrors(err));
    }
    await finish();
    return { manifest, folder };
  }

  const ctx = await esbuild.context({
    ...options,
    plugins: [
      sdkResolver,
      {
        name: 'whatszori-report',
        setup(b) {
          b.onEnd(async (r) => {
            if (r.errors.length === 0) await finish();
            o.onRebuild?.(r.errors.length === 0, r.errors.map((e) => esbuildMessage(e)));
          });
        },
      },
    ],
  });
  await ctx.watch();
  return { manifest, folder, stop: () => ctx.dispose() };
}

function esbuildMessage(e: esbuild.Message): string {
  const at = e.location ? `${e.location.file}:${e.location.line}:${e.location.column}: ` : '';
  return at + e.text;
}

function formatErrors(err: unknown): string {
  const errors = (err as { errors?: esbuild.Message[] }).errors;
  if (errors?.length) return errors.map(esbuildMessage).join('\n');
  return err instanceof Error ? err.message : String(err);
}
