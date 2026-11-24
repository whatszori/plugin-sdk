import { setHostReact } from './host.js';
import type { PluginContext, PluginModule, StartResult } from './types.js';

export type * from './types.js';
export type * from './events.js';
export { validateManifest, assertManifest, isSafeRelative, PLUGIN_ID } from './manifest.js';
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
