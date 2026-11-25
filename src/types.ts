// The contract between WhatsZori and a plugin (plugin API 2). Mirrors
// frontend/src/plugin-core/types.ts in the app; when one changes, the other has to follow.
import type * as ReactNS from 'react';
import type {
  ButtonHTMLAttributes,
  ComponentType,
  ForwardRefExoticComponent,
  InputHTMLAttributes,
  ReactNode,
  RefAttributes,
} from 'react';
import type { PluginEventName, PluginEvents } from './events.js';

export type Permission =
  | 'messages'
  | 'contacts'
  | 'media'
  | 'composer'
  | 'notifications'
  | 'clipboard'
  | 'files'
  | 'chats.manage'
  | 'presence'
  | 'network';

export interface PluginChat {
  jid: string;
  name: string;
  isGroup: boolean;
  muted: boolean;
  pinned: boolean;
  archived: boolean;
  unread: number;
}

export interface PluginMedia {
  mime?: string;
  fileName?: string;
  size?: number;
  width?: number;
  height?: number;
  // seconds (voice, video)
  duration?: number;
  caption?: string;
}

export interface PluginMessage {
  pk: string;
  chatJid: string;
  senderJid: string;
  senderName: string;
  fromMe: boolean;
  timestamp: number;
  // text, image, video, document, voice, sticker, poll
  kind: string;
  text: string;
  editedAt?: number;
  deleted?: { byName: string; at: number };
  replyTo?: { pk: string; senderName: string; text: string };
  forwarded?: boolean;
  media?: PluginMedia;
}

export interface PluginContact {
  jid: string;
  name: string;
  phone: string;
}

export interface PluginMember {
  jid: string;
  name: string;
  admin: boolean;
}

export interface PluginChatInfo {
  jid: string;
  name: string;
  about: string;
  phone?: string;
  members?: PluginMember[];
  createdAt?: number;
}

export interface PluginMe {
  jid: string | null;
  name: string;
  phone: string;
  about: string;
}

export interface PluginSearchHit {
  chatJid: string;
  chatName: string;
  message: PluginMessage;
}

export interface PluginChange {
  chatJid: string;
  chatName: string;
  change: 'deleted' | 'edited';
  at: number;
  message: PluginMessage;
}

export interface PluginTheme {
  scheme: 'light' | 'dark';
  // '#rrggbb'
  accent: string;
}

// a desktop notification in WhatsZori's own notification window
export interface PluginNotification {
  id: string;
  // empty for summaries ("12 new messages")
  chatJid: string;
  title: string;
  body: string;
  avatarUrl: string;
  isGroup: boolean;
  at: number;
  // Reply and Mark as read make sense (a message, not a summary)
  hasActions: boolean;
}

export interface NotificationControls {
  open(): void;
  markRead(): void;
  reply(text: string): void;
  dismiss(): void;
}

// a file waiting in the attachment preview
export interface PluginAttachment {
  name: string;
  mime: string;
  size: number;
  // image | video | file
  kind: string;
  // where the preview loads it from
  url: string;
}

export interface SlotProps {
  // icons next to the sidebar title
  'sidebar.header': Record<string, never>;
  // under the chat list
  'sidebar.footer': Record<string, never>;
  'chat.header.actions': { chat: PluginChat };
  // a small mark next to a chat's name in the list
  'chatList.item.badge': { chat: PluginChat };
  // a strip above the messages of the open chat
  'conversation.banner': { chat: PluginChat };
  // a block in the contact / group info panel
  'chatInfo.sections': { chat: PluginChat };
  'message.accessories': { message: PluginMessage };
  'message.contextMenu': { message: PluginMessage; close: () => void };
  // buttons in the photo / video viewer's top bar
  'mediaViewer.actions': { message: PluginMessage };
  'composer.actions': { chatJid: string; insertText: (text: string) => void };
  // buttons on the file shown in the attachment preview
  'attach.preview.actions': {
    file: PluginAttachment;
    replace: (file: Blob, name: string) => Promise<void>;
    remove: () => void;
  };
  // Settings → Plugins → Plugin settings
  'settings.sections': Record<string, never>;
  // replaces the whole notification card; the first plugin wins, and a crashing card falls back
  // to the stock one
  'notification.card': { notification: PluginNotification; controls: NotificationControls };
  // extra bits inside the stock card, under the text
  'notification.accessories': { notification: PluginNotification };
}

export type SlotName = keyof SlotProps;
export type SlotComponent<N extends SlotName> = ComponentType<SlotProps[N]>;
export type Unregister = () => void;

export interface Command {
  // unique within the plugin
  id: string;
  title: string;
  // "Ctrl+Shift+K", "Mod+K" (Ctrl, or Cmd on a Mac), "Alt+1"; needs Ctrl, Alt or Mod (or an F
  // key), and can't be one of WhatsZori's own (Ctrl+K, Ctrl+N, Ctrl+F, ...)
  shortcut?: string;
  // extra words the palette matches
  keywords?: string[];
  // hidden from the palette (and the shortcut does nothing) while this says false
  when?: () => boolean;
  run: () => void | Promise<void>;
}

export interface Panel {
  id: string;
  title: string;
  // an emoji, or an element
  icon?: ReactNode;
  // a button for it in the chat header (default true)
  button?: boolean;
  render: ComponentType<{ chat: PluginChat; close: () => void }>;
}

export interface View {
  id: string;
  title: string;
  icon: ReactNode;
  render: ComponentType<{ close: () => void }>;
}

// return something to draw the message text yourself, or null to leave it to WhatsZori
export type TextFormatter = (text: string, message: PluginMessage) => ReactNode | null | undefined;

export interface EditorTool {
  id: string;
  label: string;
  // an emoji or a small element
  icon?: ReactNode;
  // runs on the whole picture each time it's drawn; keep it synchronous and quick
  apply: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void;
}

export interface MenuEntryInput {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface DialogOptions {
  title: string;
  width?: number;
  render: ComponentType<{ close: () => void }>;
  footer?: ComponentType<{ close: () => void }>;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string> | [string, string][] | Headers;
  body?: string | Blob | ArrayBuffer | Uint8Array | URLSearchParams | null;
  // milliseconds; default 30 s, at most 2 min
  timeout?: number;
}

export interface PluginResponse {
  ok: boolean;
  status: number;
  statusText: string;
  // after redirects
  url: string;
  headers: Headers;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
}

export type SettingValue = string | number | boolean;

// ---- the app's stock components ----

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  // also the tooltip and the accessible name
  label: string;
  // a shortcut shown in the tooltip, like "Ctrl K"
  hint?: string;
  icon: ReactNode;
  size?: 'sm' | 'md';
  active?: boolean;
  tooltip?: boolean;
  tooltipPlacement?: 'top' | 'bottom';
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  trailing?: ReactNode;
}

// for the message.contextMenu slot
export interface MenuItemProps {
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface AvatarProps {
  name: string;
  // loads the picture when given (and the plugin has the media permission)
  jid?: string;
  size?: number;
  group?: boolean;
  online?: boolean;
}

export interface BadgeProps {
  count: number;
  muted?: boolean;
}

export interface SpinnerProps {
  size?: number;
  label?: string;
}

export interface SegmentedProps<T extends string = string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}

export interface TooltipProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export interface PopoverProps {
  open: boolean;
  // an element's rectangle
  anchor: DOMRect | null;
  onClose: () => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  ariaLabel?: string;
  children: ReactNode;
}

export interface PluginUI {
  Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
  IconButton: ForwardRefExoticComponent<IconButtonProps & RefAttributes<HTMLButtonElement>>;
  Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
  MenuItem: ComponentType<MenuItemProps>;
  Toggle: ComponentType<ToggleProps>;
  Avatar: ComponentType<AvatarProps>;
  Badge: ComponentType<BadgeProps>;
  Spinner: ComponentType<SpinnerProps>;
  Segmented: ComponentType<SegmentedProps>;
  Tooltip: ComponentType<TooltipProps>;
  Dialog: ComponentType<DialogProps>;
  Popover: ComponentType<PopoverProps>;
  // a <style> that goes away with the plugin; use the app's --wz-* variables to follow the theme
  addStyles(css: string): Unregister;
  openDialog(opts: DialogOptions): { close: () => void };
  confirm(opts: ConfirmOptions): Promise<boolean>;
  // a menu at an element, a rectangle or a point
  showMenu(at: Element | DOMRect | { x: number; y: number }, items: MenuEntryInput[]): void;
}

export interface EventHelpers {
  // a message arrived or was sent (history from the phone isn't included unless asked) [messages]
  onMessage(fn: (m: PluginMessage) => void, opts?: { history?: boolean }): Unregister;
  onEdited(fn: (e: { chatJid: string; pk: string; text: string; editedAt: number }) => void): Unregister;
  onDeleted(fn: (e: { chatJid: string; pk: string; byName: string; at: number }) => void): Unregister;
  onChatOpened(fn: (jid: string | null) => void): Unregister;
  // [presence]
  onTyping(
    fn: (e: { chatJid: string; senderJid: string; senderName: string; typing: boolean }) => void,
  ): Unregister;
  onPresence(fn: (e: { jid: string; online: boolean; lastSeen: number | null }) => void): Unregister;
  onThemeChanged(fn: (t: PluginTheme) => void): Unregister;
}

// Calls marked [permission] throw unless the manifest lists that permission and the user allowed
// it. Everything else works for every plugin.
export interface PluginContext {
  // the plugin's folder name
  readonly pluginId: string;
  // the API this WhatsZori provides
  readonly apiVersion: number;
  // what the user allowed this plugin
  readonly permissions: readonly Permission[];
  // the app's own React; the SDK's JSX runtime and hooks use it for you
  React: typeof ReactNS;
  ui: PluginUI;
  registerSlot<N extends SlotName>(name: N, component: SlotComponent<N>): Unregister;
  // raw backend events; msg:* need [messages], presence and chat:typing need [presence]
  onEvent<E extends PluginEventName>(event: E, handler: (payload: PluginEvents[E]) => void): Unregister;
  onEvent(event: string, handler: (payload: unknown) => void): Unregister;
  events: EventHelpers;
  // shown in the command palette (Ctrl+Shift+P), optionally with a shortcut
  commands: {
    register(cmd: Command): Unregister;
    run(id: string): Promise<void>;
  };
  // a side panel next to the conversation, like Contact info
  panels: {
    register(panel: Panel): Unregister;
    open(id: string): void;
    close(): void;
  };
  // a whole screen of your own, with an icon in the sidebar
  views: {
    register(view: View): Unregister;
    open(id: string): void;
    close(): void;
  };
  messages: {
    registerFormatter(fn: TextFormatter): Unregister;
  };
  // a one-click tool in the photo editor
  editor: {
    registerTool(tool: EditorTool): Unregister;
  };
  actions: {
    openChat(jid: string): void;
    // scroll to a message and flash it
    jumpTo(jid: string, pk: string): void;
    toast(text: string): void;
    openSettings(): void;
    // adds text to the open chat's message box; the user still presses send [composer]
    insertIntoComposer(text: string): void;
  };
  // the open chat's message box [composer]
  composer: {
    get(): { chatJid: string; text: string } | null;
    set(text: string): void;
    insert(text: string): void;
    reply(pk: string): void;
    // opens the attachment preview; the user still presses Send
    addAttachment(file: Blob, name?: string): Promise<void>;
  };
  // things your phone sees too; only right after the user clicks [chats.manage]
  chats: {
    pin(jid: string, on: boolean): Promise<void>;
    mute(jid: string, on: boolean): Promise<void>;
    archive(jid: string, on: boolean): Promise<void>;
  };
  // read-only: a plugin can look, but sending is always the user's click
  data: {
    chats(): PluginChat[];
    activeChat(): string | null;
    // oldest first [messages]
    messages(jid: string, opts?: number | { before?: string; limit?: number }): Promise<PluginMessage[]>;
    // a page (at most 200) older than `before`; page back with the first message's pk [messages]
    messagePage(
      jid: string,
      opts?: { before?: string; limit?: number },
    ): Promise<{ messages: PluginMessage[]; hasMore: boolean }>;
    // the same full-text search the app uses [messages]
    search(query: string, opts?: { jid?: string }): Promise<PluginSearchHit[]>;
    editHistory(pk: string): Promise<{ text: string; at: number }[]>;
    // the Deleted & edited feed [messages]
    changes(opts?: {
      kind?: 'deleted' | 'edited';
      before?: { at: number; pk: string };
      limit?: number;
    }): Promise<{ items: PluginChange[]; hasMore: boolean }>;
    // [contacts]
    contacts(): Promise<PluginContact[]>;
    chatInfo(jid: string): Promise<PluginChatInfo>;
    me(): PluginMe;
    // [media]
    mediaUrl(pk: string, thumb?: boolean): string;
    avatarUrl(jid: string, full?: boolean): string;
  };
  app: {
    readonly version: string;
    theme(): PluginTheme;
    layout(): 'classic' | 'rail';
  };
  // a desktop notification, at most one every few seconds [notifications]
  notify(title: string, body: string): Promise<void>;
  // [clipboard]
  clipboard: {
    writeText(text: string): Promise<void>;
    writeImage(png: Blob): Promise<void>;
  };
  // [files]
  files: {
    // the save dialog; the chosen path, or null when cancelled
    saveAs(file: Blob, name: string): Promise<string | null>;
  };
  // [network]
  net: {
    // only to the sites in the manifest's "network" (window.fetch is blocked for plugins)
    fetch(url: string | URL, init?: FetchInit): Promise<PluginResponse>;
  };
  // the manifest's settings form (typed, with defaults) plus free keys of your own
  settings: {
    all(): Promise<Record<string, string>>;
    get<T extends SettingValue = SettingValue>(key: string): Promise<T | undefined>;
    set(key: string, value: SettingValue): Promise<void>;
    delete(key: string): Promise<void>;
    onChange(fn: (key: string, value: SettingValue | undefined) => void): Unregister;
  };
  // the plugin's own key-value store, up to 1 MB per value
  storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };
  log: {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
}

// ---- sandboxed plugins ("sandbox": true) ----

// The UI a sandboxed plugin returns from render functions; WhatsZori draws it with its own
// components. Pictures only from data:/blob: URLs or ctx.data.mediaUrl, links only to the sites in
// the manifest.
export type UINode =
  | string
  | null
  | undefined
  | false
  | { t: 'text'; text: string; muted?: boolean; bold?: boolean; size?: 'sm' | 'md' | 'lg' }
  | { t: 'heading'; text: string }
  | { t: 'stack'; gap?: number; children: UINode[] }
  | {
      t: 'row';
      gap?: number;
      wrap?: boolean;
      align?: 'start' | 'center' | 'end' | 'between';
      children: UINode[];
    }
  | {
      t: 'button';
      label: string;
      onClick?: () => void;
      variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
      disabled?: boolean;
      icon?: string;
    }
  | { t: 'iconButton'; label: string; icon: string; onClick?: () => void; active?: boolean }
  | { t: 'menuItem'; label: string; icon?: string; onClick?: () => void; danger?: boolean }
  | {
      t: 'input';
      value?: string;
      placeholder?: string;
      label?: string;
      onChange?: (v: string) => void;
      onSubmit?: (v: string) => void;
    }
  | { t: 'textarea'; value?: string; placeholder?: string; rows?: number; onChange?: (v: string) => void }
  | { t: 'toggle'; label: string; description?: string; checked: boolean; onChange?: (v: boolean) => void }
  | {
      t: 'select';
      value: string;
      options: { value: string; label: string }[];
      onChange?: (v: string) => void;
    }
  | { t: 'badge'; text: string }
  | { t: 'image'; src: string; alt?: string; width?: number; height?: number; radius?: number }
  | {
      t: 'list';
      items: { key: string; title: string; subtitle?: string; right?: string; onClick?: () => void }[];
    }
  | { t: 'code'; text: string }
  | { t: 'link'; text: string; href: string }
  | { t: 'progress'; value: number }
  | { t: 'spinner' }
  | { t: 'divider' };

// a function made async: what crosses into a sandbox always comes back as a promise
export type Async<F> = F extends (...a: infer A) => infer R ? (...a: A) => Promise<Awaited<R>> : F;
export type AsyncAll<T> = { [K in keyof T]: Async<T[K]> };
type Off = () => Promise<void>;

// What a sandboxed plugin gets: the same names, every call async, render functions that return
// UINode instead of components, and no React, styles, formatters or editor tools.
export interface SandboxContext {
  readonly pluginId: string;
  readonly apiVersion: number;
  readonly permissions: readonly Permission[];
  readonly sandboxed: true;
  // draw every surface again after your state changed
  invalidate(): void;
  ui: {
    openDialog(opts: {
      title: string;
      width?: number;
      render: (props: { close: Off }) => UINode;
      footer?: (props: { close: Off }) => UINode;
    }): Promise<{ close: Off }>;
    confirm(opts: ConfirmOptions): Promise<boolean>;
  };
  registerSlot<N extends SlotName>(name: N, render: (props: AsyncAll<SlotProps[N]>) => UINode): Promise<Off>;
  onEvent<E extends PluginEventName>(event: E, handler: (payload: PluginEvents[E]) => void): Promise<Off>;
  events: { [K in keyof EventHelpers]: (...a: Parameters<EventHelpers[K]>) => Promise<Off> };
  commands: {
    // when() isn't available in a sandbox
    register(cmd: Omit<Command, 'when'>): Promise<Off>;
    run(id: string): Promise<void>;
  };
  panels: {
    register(panel: {
      id: string;
      title: string;
      icon?: string;
      button?: boolean;
      render: (props: { chat: PluginChat; close: Off }) => UINode;
    }): Promise<Off>;
    open(id: string): Promise<void>;
    close(): Promise<void>;
  };
  views: {
    register(view: { id: string; title: string; icon: string; render: (props: { close: Off }) => UINode }): Promise<Off>;
    open(id: string): Promise<void>;
    close(): Promise<void>;
  };
  actions: AsyncAll<PluginContext['actions']>;
  composer: AsyncAll<PluginContext['composer']>;
  chats: PluginContext['chats'];
  data: AsyncAll<PluginContext['data']>;
  app: { readonly version: string; theme(): Promise<PluginTheme>; layout(): Promise<'classic' | 'rail'> };
  notify: PluginContext['notify'];
  clipboard: PluginContext['clipboard'];
  files: PluginContext['files'];
  net: PluginContext['net'];
  settings: Omit<PluginContext['settings'], 'onChange'> & {
    onChange(fn: (key: string, value: SettingValue | undefined) => void): Promise<Off>;
  };
  storage: PluginContext['storage'];
  log: PluginContext['log'];
}

// ---- the manifest ----

export interface ManifestSetting {
  key: string;
  type: 'text' | 'password' | 'textarea' | 'toggle' | 'select' | 'number';
  label: string;
  description?: string;
  placeholder?: string;
  default?: SettingValue;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  // https only
  homepage?: string;
  // the module to load, relative to the plugin folder; index.js when left out
  main?: string;
  // .png, .svg, .jpg or .webp inside the plugin folder
  icon?: string;
  // 2 for everything in this SDK; left out means the first API
  apiVersion?: number;
  minAppVersion?: string;
  permissions?: Permission[];
  // sites ctx.net.fetch may reach: "api.example.com", "*.example.com", "localhost:11434"
  network?: string[];
  // a settings form WhatsZori draws in Settings → Plugins
  settings?: ManifestSetting[];
  // run in a worker without DOM or network, with a declarative UI
  sandbox?: boolean;
}

export type StartResult = void | Unregister;

export interface PluginModule {
  start(ctx: PluginContext): StartResult | Promise<StartResult>;
}

export interface SandboxPluginModule {
  start(ctx: SandboxContext): void | Promise<void>;
}
