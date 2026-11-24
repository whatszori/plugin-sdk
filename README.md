<div align="center">

<h1>WhatsZori Plugin SDK</h1>

<p>Types, a JSX runtime and a CLI for building <a href="https://github.com/whatszori/WhatsZori">WhatsZori</a> plugins.</p>

<p>
  <a href="LICENSE.md"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-3d6fb4"></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6">
  <img alt="Node 20+" src="https://img.shields.io/badge/node-%E2%89%A520-5fa04e">
</p>

</div>

```tsx
import { definePlugin } from '@whatszori/plugin-sdk';
import { useState } from 'react';

export default definePlugin((ctx) => {
  ctx.registerSlot('composer.actions', () => {
    const [n, setN] = useState(0);
    return (
      <ctx.ui.IconButton
        label={`Wave (${n})`}
        icon="👋"
        onClick={() => {
          setN(n + 1);
          ctx.actions.insertIntoComposer('👋');
        }}
      />
    );
  });
});
```

## What you get

- **Every type in the plugin API**: the context, slots and their props, typed backend events,
  and the app's stock components (`Button`, `IconButton`, `Input`, `MenuItem`, `Toggle`).
- **TSX and React hooks on the app's own React.** Plugins don't bundle React. The SDK forwards
  `react`, `react/jsx-runtime` and your JSX to the React instance WhatsZori hands over in
  `start()`, so hooks work inside the app's tree.
- **`wz-plugin`**, a CLI built on esbuild: start a project, build a ready-to-share folder, or
  rebuild into WhatsZori's plugins folder on every save.
- **A JSON schema** for `manifest.json`, so your editor checks it as you type.

## Quick start

> The package isn't on npm yet. Until it is, clone this repo, run `npm install` and `npm link`
> there, then `npm link @whatszori/plugin-sdk` in your plugin.

```sh
npx @whatszori/plugin-sdk create my-plugin
cd my-plugin
npm install
npm run dev
```

`npm run dev` builds straight into WhatsZori's plugins folder and rebuilds on every save. Turn the
plugin on in **Settings → Plugins**. After a rebuild, turn it off and on to load the new code.

A new project looks like this:

```
my-plugin/
  manifest.json      id, name, version (checked against the schema)
  src/index.tsx      your plugin
  assets/            optional; copied next to the script
  tsconfig.json      JSX goes through @whatszori/plugin-sdk
```

## CLI

| Command | What it does |
|---|---|
| `wz-plugin create <folder> [--id] [--name] [--author]` | New project from the template |
| `wz-plugin dev` | Build into WhatsZori's plugins folder, rebuild on save |
| `wz-plugin install [--minify]` | Build into WhatsZori's plugins folder once |
| `wz-plugin build [--out dist] [--minify]` | Build into `dist/<id>/`, ready to share or zip |
| `wz-plugin validate [folder]` | Check `manifest.json` the way the app does |

WhatsZori's folder is found the way the app finds it:

| OS | Folder |
|---|---|
| Windows | `%AppData%\whatszori` |
| Linux | `$XDG_CONFIG_HOME/whatszori` or `~/.config/whatszori` |
| macOS | `~/Library/Application Support/whatszori` |

`WHATSZORI_CONFIG_DIR` overrides it, for example to test against a separate profile.

The entry is `src/index.tsx` (or `.ts`, `.jsx`, `.js`). The output is one ES module, plus
`manifest.json` and `assets/`. `react-dom` is refused: render through slots instead.

## API

`definePlugin` takes your `start(ctx)` (or `{ start }`) and becomes the module's default export.
`start` may be async. Return a function to clean up. Slots and event handlers registered through
`ctx` are removed for you when the plugin is turned off.

| `ctx.` | |
|---|---|
| `pluginId` | the plugin's folder name |
| `React` | the app's React (the SDK uses it for you) |
| `ui.Button`, `ui.IconButton`, `ui.Input`, `ui.MenuItem`, `ui.Toggle` | stock components that follow the user's theme |
| `registerSlot(name, Component)` | put a component in one of the slots below |
| `onEvent(name, handler)` | backend events, typed: `msg:batch`, `msg:edited`, `msg:deleted`, `chat:update`, `presence`, … |
| `actions.openChat(jid)` | open a chat |
| `actions.insertIntoComposer(text)` | add text to the message box |
| `actions.toast(text)` | a short in-app notice |
| `data.chats()`, `data.activeChat()`, `data.messages(jid, limit?)` | read-only chats and messages |
| `settings.all()`, `.set(key, value)`, `.delete(key)` | small strings for your settings block |
| `storage.get/set/delete/keys` | your own key-value store, up to 1 MB per value |
| `log.info/warn/error` | console, tagged with your plugin id |

There's no way to send a message. A plugin can fill the message box, but sending is always the
user's click. That's deliberate: WhatsZori doesn't do bulk sending or auto-replies.

### Slots

| Slot | Props | Where |
|---|---|---|
| `sidebar.header` | none | next to the sidebar title |
| `sidebar.footer` | none | under the chat list |
| `chat.header.actions` | `{ chat }` | the open chat's header |
| `message.accessories` | `{ message }` | under a message |
| `message.contextMenu` | `{ message, close }` | the message menu; use `ctx.ui.MenuItem` |
| `composer.actions` | `{ chatJid, insertText }` | next to the emoji button |
| `settings.sections` | none | Settings → Plugins → Plugin settings |
| `notification.card` | `{ notification, controls }` | replaces WhatsZori's notification card |
| `notification.accessories` | `{ notification }` | inside the stock notification card |

A component that throws is hidden and logged. The rest of the app keeps working.

### Good to know

- Create components and contexts inside `start()` or in render, not at the top of the module:
  the app's React isn't known until `start()` runs. The SDK tells you if you get this wrong.
- Libraries that import `react` work and get the app's React. Ones that need `react-dom` don't.
- Plugins run with the same rights as the app's own interface, and users have to turn each one
  on. Be the plugin you'd want to install.

## Developing the SDK

```sh
npm install
npm run check    # typecheck and tests (the CLI tests build and load a real plugin)
npm run build    # dist/
```

When the plugin API in WhatsZori changes (`frontend/src/plugin-core/types.ts`), update
`src/types.ts` and `src/events.ts` here to match.

## License

[MIT](LICENSE.md)
