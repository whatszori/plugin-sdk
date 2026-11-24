// Backend events a plugin can listen to with ctx.onEvent. These are the raw payloads the app
// gets, so they carry more than PluginMessage / PluginChat.

export type MessageKind = 'text' | 'image' | 'video' | 'document' | 'voice' | 'sticker' | 'poll';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConnState = 'connected' | 'connecting' | 'reconnecting' | 'offline';

export interface MediaInfo {
  width?: number;
  height?: number;
  fileName?: string;
  size?: number;
  mime?: string;
  // seconds, for voice and video
  duration?: number;
  // 0..1 amplitudes, voice only
  waveform?: number[];
  caption?: string;
  // a video note
  round?: boolean;
  gif?: boolean;
  // nothing to download (view once that only the phone got)
  unavailable?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface DeletedInfo {
  byJid: string;
  byName: string;
  at: number;
}

export interface PollOption {
  name: string;
  votes: number;
  mine: boolean;
  voters: string[];
}

export interface PollInfo {
  name: string;
  options: PollOption[];
  // how many one person may pick; 0 = any number
  selectable: number;
  totalVoters: number;
}

export interface RawMessage {
  pk: string;
  id: string;
  chatJid: string;
  senderJid: string;
  senderName: string;
  fromMe: boolean;
  timestamp: number;
  kind: MessageKind;
  text: string;
  media?: MediaInfo;
  replyTo?: { pk: string; senderName: string; fromMe: boolean; kind: MessageKind; text: string };
  status?: MessageStatus;
  editedAt?: number;
  editCount?: number;
  deleted?: DeletedInfo;
  // the delete arrived before (or without) the message itself
  contentUnknown?: boolean;
  // forwarding score: 5+ is "forwarded many times"
  forwarded?: number;
  poll?: PollInfo;
  viewOnce?: boolean;
  reactions: Reaction[];
}

export interface RawChat {
  jid: string;
  name: string;
  isGroup: boolean;
  memberCount?: number;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
  unread: number;
  lastMessage: {
    pk: string;
    fromMe: boolean;
    senderName: string;
    kind: MessageKind;
    text: string;
    deleted: boolean;
    status?: MessageStatus;
  } | null;
  lastActivity: number;
  favorite?: boolean;
  lists?: number[];
  lastSeen?: number | null;
  online?: boolean;
}

export interface PluginEvents {
  // new messages, and messages that changed (votes on a poll come this way too)
  'msg:batch': { messages: RawMessage[] };
  'msg:status': { chatJid: string; pk: string; status: MessageStatus };
  'msg:edited': { chatJid: string; pk: string; text: string; editedAt: number; editCount: number };
  // deleted for everyone; purged = the content wasn't kept
  'msg:deleted': { chatJid: string; pk: string; deleted: DeletedInfo; purged: boolean };
  'msg:reaction': { chatJid: string; pk: string; reactions: Reaction[] };
  // deleted on this computer only
  'msg:removed': { chatJid: string; pks: string[] };
  'chat:update': { chat: RawChat };
  'chat:removed': { jid: string };
  'chat:cleared': { jid: string };
  'chat:typing': { chatJid: string; senderJid: string; senderName: string; typing: boolean };
  presence: { jid: string; online: boolean; lastSeen: number | null };
  'conn:state': { state: ConnState };
  'status:update': { jid: string };
}

export type PluginEventName = keyof PluginEvents;
