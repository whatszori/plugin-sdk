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

- **Every type in plugin API 2**: the context, permissions, slots and their props, commands,
  panels, views, typed events, the manifest and the app's stock components.
- **TSX and React hooks on the app's own React.** Plugins don't bundle React. The SDK forwards
  `react`, `react/jsx-runtime` and your JSX to the React instance WhatsZori hands over in
  `start()`, so hooks work inside the app's tree.
- **Sandboxed plugins** with `defineSandboxPlugin` and the `ui` builders, for plugins that should
  run isolated from the page.
- **`wz-plugin`**, a CLI built on esbuild: start a project, build a ready-to-share folder, rebuild
  into WhatsZori's plugins folder on every save (the app reloads it by itself), and sign releases.
- **A JSON schema** for `manifest.json`, so your editor checks it as you type.

## Quick start

```sh
npx @whatszori/plugin-sdk create my-plugin
cd my-plugin
npm install
npm run dev
```

`npm run dev` builds straight into WhatsZori's plugins folder and rebuilds on every save. Turn the
plugin on in **Settings → Plugins**: WhatsZori shows what it asks for, and after that reloads it
whenever its files change.

```
my-plugin/
  manifest.json      id, name, version, permissions, sites, settings (checked against the schema)
  src/index.tsx      your plugin
  assets/            optional; copied next to the script
  tsconfig.json      JSX goes through @whatszori/plugin-sdk
```

## The manifest

```json
{
  "id": "weather",
  "name": "Weather",
  "version": "1.0.0",
  "apiVersion": 2,
  "minAppVersion": "0.2.0",
  "icon": "icon.svg",
  "permissions": ["network", "composer"],
  "network": ["api.open-meteo.com", "geocoding-api.open-meteo.com"],
  "settings": [
    { "key": "city", "type": "text", "label": "City", "default": "Berlin" },
    { "key": "units", "type": "select", "label": "Units", "default": "c",
      "options": [{ "value": "c", "label": "°C" }, { "value": "f", "label": "°F" }] }
  ],
  "sandbox": true
}
```

- **`permissions`**: what the plugin needs. The user sees the list (in plain words) and allows it
  before the plugin runs. A later version that asks for more stays off until they allow it again.

  | Permission | Unlocks |
  |---|---|
  | `messages` | `data.messages/messagePage/search/editHistory/changes`, `events.onMessage/onEdited/onDeleted`, `msg:*` events |
  | `contacts` | `data.contacts`, `data.chatInfo`, `data.me` |
  | `media` | `data.mediaUrl`, `data.avatarUrl` |
  | `composer` | `composer.*`, `actions.insertIntoComposer` |
  | `notifications` | `notify(title, body)` |
  | `clipboard` | `clipboard.writeText/writeImage` |
  | `files` | `files.saveAs(blob, name)` |
  | `chats.manage` | `chats.pin/mute/archive`, only right after a click |
  | `presence` | `events.onTyping/onPresence` |
  | `network` | `net.fetch`, to the sites in `network` only |

- **`network`**: the sites `ctx.net.fetch` may reach, and nothing else: `api.example.com`,
  `*.example.com`, or `localhost:11434` (plain http only for localhost). WhatsZori's page has a
  Content-Security-Policy, so `window.fetch`, `XMLHttpRequest`, websockets and `import()` from the
  internet don't work for plugins; requests go through the app, which checks the address, drops
  cookies, follows redirects only within the list and refuses names that point at local
  addresses.
- **`settings`**: a form WhatsZori draws in Settings → Plugins (`text`, `password`, `textarea`,
  `toggle`, `select`, `number`). Read values with `await ctx.settings.get('city')`, typed and with
  the default, and listen with `ctx.settings.onChange`.
- **`apiVersion: 2`** turns all of this on. Without it the plugin gets the first API.
- **`sandbox: true`**: see below.

## CLI

| Command | What it does |
|---|---|
| `wz-plugin create <folder> [--id] [--name] [--author]` | New project from the template |
| `wz-plugin dev` | Build into WhatsZori's plugins folder, rebuild on save; the app reloads it |
| `wz-plugin install [--minify] [--key file]` | Build into WhatsZori's plugins folder once |
| `wz-plugin build [--out dist] [--minify] [--key file]` | Build into `dist/<id>/`, ready to share or zip; `--key` signs it |
| `wz-plugin validate [folder]` | Check `manifest.json` the way the app does |
| `wz-plugin keygen [--out file]` | Make an Ed25519 signing key |
| `wz-plugin sign <folder> --key file` | Sign a built plugin folder (writes `signature.json`) |
| `wz-plugin verify <folder>` | Check a folder's signature the way the app does |

WhatsZori's folder is found the way the app finds it:

| OS | Folder |
|---|---|
| Windows | `%AppData%\whatszori` |
| Linux | `$XDG_CONFIG_HOME/whatszori` or `~/.config/whatszori` |
| macOS | `~/Library/Application Support/whatszori` |

`WHATSZORI_CONFIG_DIR` overrides it, for example to test against a separate profile.

The entry is `src/index.tsx` (or `.ts`, `.jsx`, `.js`). The output is one ES module, plus
`manifest.json` and `assets/`. `react-dom` is refused: render through slots instead.

### Signing

```sh
npx wz-plugin keygen                          # once; prints the key's fingerprint
npx wz-plugin build --key wz-plugin-signing.key
```

`signature.json` covers every file in the built folder. WhatsZori shows the key's fingerprint
when the user allows the plugin, refuses to run a plugin whose files changed after signing, and
asks again when a later version is signed with a different key. Keep the key file private (the
template's `.gitignore` already skips `*.key`) and backed up.

## API

`definePlugin` takes your `start(ctx)` (or `{ start }`) and becomes the module's default export.
`start` may be async. Return a function to clean up. Everything registered through `ctx` (slots,
commands, panels, views, formatters, tools, styles, dialogs, event handlers) is removed for you
when the plugin is turned off. Calls marked with a permission throw unless the manifest lists it.

| `ctx.` | |
|---|---|
| `pluginId`, `apiVersion`, `permissions` | who you are and what you were allowed |
| `React` | the app's React (the SDK uses it for you) |
| `ui.Button`, `IconButton`, `Input`, `MenuItem`, `Toggle`, `Avatar`, `Badge`, `Spinner`, `Segmented`, `Tooltip`, `Dialog`, `Popover` | stock components that follow the user's theme |
| `ui.addStyles(css)` | a stylesheet that goes away with the plugin; use the `--wz-*` variables |
| `ui.openDialog({ title, render, footer })`, `ui.confirm({...})`, `ui.showMenu(at, items)` | dialogs and menus |
| `registerSlot(name, Component)` | put a component in one of the slots below |
| `commands.register({ id, title, shortcut, when, run })` | shows up in the command palette (Ctrl+Shift+P) |
| `panels.register({ id, title, icon, render })`, `panels.open(id)` | a side panel next to the chat, with a header button |
| `views.register({ id, title, icon, render })`, `views.open(id)` | a whole screen with an icon in the sidebar |
| `messages.registerFormatter((text, message) => node)` | draw message text yourself (return null to pass) |
| `editor.registerTool({ id, label, icon, apply })` | a one-click tool in the photo editor |
| `events.onMessage`, `onEdited`, `onDeleted` *(messages)*, `onTyping`, `onPresence` *(presence)*, `onChatOpened`, `onThemeChanged` | typed events |
| `onEvent(name, handler)` | raw backend events: `msg:batch`, `chat:update`, `presence`, … |
| `actions.openChat`, `jumpTo(jid, pk)`, `toast`, `openSettings` | navigate |
| `composer.get/set/insert/reply/addAttachment` *(composer)* | the message box; sending stays the user's click |
| `chats.pin/mute/archive` *(chats.manage)* | after a click only |
| `data.chats()`, `data.activeChat()` | the chat list |
| `data.messages`, `messagePage`, `search`, `editHistory`, `changes` *(messages)* | history, paged |
| `data.contacts`, `chatInfo`, `me` *(contacts)*; `data.mediaUrl`, `avatarUrl` *(media)* | people and pictures |
| `app.version`, `app.theme()`, `app.layout()` | where you run |
| `notify(title, body)` *(notifications)* | a desktop notification, at most one every few seconds |
| `clipboard.writeText/writeImage` *(clipboard)*, `files.saveAs(blob, name)` *(files)* | out of the app |
| `net.fetch(url, init)` *(network)* | fetch-shaped, to the manifest's sites only |
| `settings.get/set/all/delete/onChange` | the manifest's form, typed, plus keys of your own |
| `storage.get/set/delete/keys` | your own key-value store, up to 1 MB per value |
| `log.info/warn/error` | console, tagged with your plugin id |

There's no way to send a message. A plugin can fill the message box or add an attachment to the
preview, but sending is always the user's click. That's deliberate: WhatsZori doesn't do bulk
sending or auto-replies.

### Slots

| Slot | Props | Where |
|---|---|---|
| `sidebar.header` | none | next to the sidebar title |
| `sidebar.footer` | none | under the chat list |
| `chat.header.actions` | `{ chat }` | the open chat's header |
| `chatList.item.badge` | `{ chat }` | next to a chat's name in the list |
| `conversation.banner` | `{ chat }` | a strip above the messages |
| `chatInfo.sections` | `{ chat }` | the contact / group info panel |
| `message.accessories` | `{ message }` | under a message |
| `message.contextMenu` | `{ message, close }` | the message menu; use `ctx.ui.MenuItem` |
| `mediaViewer.actions` | `{ message }` | the photo and video viewer's top bar |
| `composer.actions` | `{ chatJid, insertText }` | next to the emoji button |
| `attach.preview.actions` | `{ file, replace, remove }` | on the file in the attachment preview |
| `settings.sections` | none | Settings → Plugins → Plugin settings |
| `notification.card` | `{ notification, controls }` | replaces WhatsZori's notification card |
| `notification.accessories` | `{ notification }` | inside the stock notification card |

A component that throws is hidden and logged. The rest of the app keeps working.

## Sandboxed plugins

With `"sandbox": true` the plugin runs in a worker: no DOM, no access to the page, and every way
to the network removed before your code loads. The context is the same, except that every call
is async and render functions return data instead of components:

```ts
import { defineSandboxPlugin, ui } from '@whatszori/plugin-sdk';

export default defineSandboxPlugin(async (ctx) => {
  let count = 0;
  await ctx.panels.register({
    id: 'counter',
    title: 'Counter',
    icon: '🔢',
    render: () =>
      ui.stack([
        ui.heading(`Clicked ${count} times`),
        ui.button('Click', () => {
          count++;
          ctx.invalidate(); // draw again
        }),
      ]),
  });
});
```

`ui` has `text`, `heading`, `stack`, `row`, `button`, `iconButton`, `menuItem`, `input`,
`textarea`, `toggle`, `select`, `badge`, `image`, `list`, `code`, `link`, `progress`, `spinner` and
`divider`. Pictures only come from `data:`/`blob:` URLs or `ctx.data.mediaUrl`, links only go to
the manifest's sites. Not available in a sandbox: `React`, `ui.addStyles`, text formatters,
editor tools and `when` on commands. A sandboxed plugin must be one file (the CLI's build is).

### Good to know

- Create components and contexts inside `start()` or in render, not at the top of the module:
  the app's React isn't known until `start()` runs. The SDK tells you if you get this wrong.
- Libraries that import `react` work and get the app's React. Ones that need `react-dom` don't.
- An in-page plugin runs inside the app's page. WhatsZori checks every call against the
  permissions, but a plugin written to misbehave could get around that; the approval dialog
  says so. If your plugin doesn't need the page, make it sandboxed.

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
