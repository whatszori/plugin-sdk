// The contract between WhatsZori and a plugin. Mirrors frontend/src/plugin-core/types.ts in the
// app; when one changes, the other has to follow.
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

export interface PluginChat {
  jid: string;
  name: string;
  isGroup: boolean;
  muted: boolean;
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

export interface SlotProps {
  'sidebar.header': Record<string, never>;
  'sidebar.footer': Record<string, never>;
  'chat.header.actions': { chat: PluginChat };
  'message.accessories': { message: PluginMessage };
  'message.contextMenu': { message: PluginMessage; close: () => void };
  'composer.actions': { chatJid: string; insertText: (text: string) => void };
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

// The app's stock components. Using them keeps a plugin in step with whatever theme is on.
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
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

export interface PluginUI {
  Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
  IconButton: ForwardRefExoticComponent<IconButtonProps & RefAttributes<HTMLButtonElement>>;
  Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
  MenuItem: ComponentType<MenuItemProps>;
  Toggle: ComponentType<ToggleProps>;
}

export interface PluginContext {
  // the plugin's folder name
  readonly pluginId: string;
  // the app's own React; the SDK's JSX runtime and hooks use it for you
  React: typeof ReactNS;
  ui: PluginUI;
  registerSlot<N extends SlotName>(name: N, component: SlotComponent<N>): Unregister;
  onEvent<E extends PluginEventName>(event: E, handler: (payload: PluginEvents[E]) => void): Unregister;
  onEvent(event: string, handler: (payload: unknown) => void): Unregister;
  actions: {
    openChat(jid: string): void;
    // adds text to the open chat's message box; the user still presses send
    insertIntoComposer(text: string): void;
    toast(text: string): void;
  };
  // read-only: a plugin can look, but sending is always the user's click
  data: {
    chats(): PluginChat[];
    activeChat(): string | null;
    // the latest messages, oldest first, at most 200
    messages(jid: string, limit?: number): Promise<PluginMessage[]>;
  };
  // small strings (up to 64 KB), for the plugin's own settings block
  settings: {
    all(): Promise<Record<string, string>>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
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

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  // the module to load, relative to the plugin folder; index.js when left out
  main?: string;
}

export type StartResult = void | Unregister;

export interface PluginModule {
  start(ctx: PluginContext): StartResult | Promise<StartResult>;
}
