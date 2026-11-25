# Changelog

## 0.2.0 (2026-11-25)

Plugin API 2, for WhatsZori 0.2.0.

- Manifest: `apiVersion`, `minAppVersion`, `icon`, `homepage`, `permissions`, `network`
  (the only sites `ctx.net.fetch` reaches), `settings` (a form the app draws) and `sandbox`;
  `validateManifest` and the JSON schema check all of it the way the app does
- Types for commands and the palette, side panels, whole-screen views, text formatters, photo
  editor tools, dialogs and menus, the new slots, typed events, paged history, search, contacts,
  media, notifications, clipboard, files and the network
- `defineSandboxPlugin`, `SandboxContext` and the `ui` builders for sandboxed plugins
- CLI: `keygen`, `sign`, `verify`, and `--key` on `build` and `install`; `dev` no longer asks
  you to turn the plugin off and on, the app reloads it
- The template uses API 2: permissions, a settings form, a command and a panel

## 0.1.0 (never published)

- Types for the whole plugin API: context, slots, stock UI components, typed backend events
- `definePlugin`, a JSX runtime and `react` forwarders that run on the app's React
- `wz-plugin` CLI: `create`, `build`, `install`, `dev`, `validate`
- Project template and a JSON schema for `manifest.json`
