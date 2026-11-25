import { setHostReact } from './host.js';
import type {
  PluginContext,
  PluginModule,
  SandboxContext,
  SandboxPluginModule,
  StartResult,
} from './types.js';

export type * from './types.js';
export type * from './events.js';
export {
  validateManifest,
  assertManifest,
  isSafeRelative,
  checkNetworkPattern,
  PLUGIN_ID,
  PERMISSIONS,
  SUPPORTED_API,
} from './manifest.js';
export { ui } from './sandbox-ui.js';
export type { ManifestProblem } from './manifest.js';

// definePlugin is the plugin's default export. It hands the app's React to the SDK's JSX runtime
// and hooks before your start() runs.
//
//   export default definePlugin({
//     start(ctx) {
//       ctx.registerSlot('sidebar.footer', () => <p>Hello</p>);
//     },
//   });
export function definePlugin(plugin: PluginModule): PluginModule;
export function definePlugin(
  start: (ctx: PluginContext) => StartResult | Promise<StartResult>,
): PluginModule;
export function definePlugin(
  p: PluginModule | ((ctx: PluginContext) => StartResult | Promise<StartResult>),
): PluginModule {
  const start = typeof p === 'function' ? p : p.start.bind(p);
  return {
    start(ctx) {
      setHostReact(ctx.React);
      return start(ctx);
    },
  };
}

// defineSandboxPlugin is the default export of a plugin whose manifest says "sandbox": true. It
// runs in a worker without React or the page: render functions return UINode data (see ui).
//
//   export default defineSandboxPlugin(async (ctx) => {
//     await ctx.panels.register({ id: 'hi', title: 'Hi', icon: '👋', render: () => ui.text('Hello') });
//   });
export function defineSandboxPlugin(plugin: SandboxPluginModule): SandboxPluginModule;
export function defineSandboxPlugin(start: (ctx: SandboxContext) => void | Promise<void>): SandboxPluginModule;
export function defineSandboxPlugin(
  p: SandboxPluginModule | ((ctx: SandboxContext) => void | Promise<void>),
): SandboxPluginModule {
  return typeof p === 'function' ? { start: p } : p;
}
