export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface User {
  id: string;
  username: string; // e.g. @ivan
  email?: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  status: 'online' | 'offline';
  lastSeen?: string;
  createdAt: string;
  badge?: string; // e.g. "1" for verified checkmark/badge
  isAdmin?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'file';
  fileName?: string;
  fileSize?: string;
  status: MessageStatus;
  createdAt: string;
  isEdited?: boolean;
  isPinned?: boolean;
  clientMsgId?: string;
}

export interface Chat {
  id: string;
  participant: User;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
  pinnedMessage?: Message;
  bgPhotoUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// WebSocket Event Types
export type WSIncomingEvent =
  | { type: 'auth'; token: string }
  | {
      type: 'send_message';
      chatId: string;
      text: string;
      recipientId: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'file';
      fileName?: string;
      fileSize?: string;
      clientMsgId?: string;
    }
  | { type: 'edit_message'; messageId: string; text: string }
  | { type: 'delete_message'; messageId: string }
  | { type: 'pin_message'; chatId: string; messageId: string | null }
  | { type: 'delete_chat'; chatId: string }
  | { type: 'set_chat_bg'; chatId: string; bgPhotoUrl: string | null }
  | { type: 'mark_read'; chatId: string; messageIds: string[] }
  | { type: 'typing'; chatId: string; recipientId: string; isTyping: boolean };

export type WSOutgoingEvent =
  | { type: 'authenticated'; user: User }
  | { type: 'error'; message: string }
  | { type: 'new_message'; message: Message; chatId: string; clientMsgId?: string }
  | { type: 'message_sent_ack'; message: Message; clientMsgId?: string }
  | { type: 'message_edited'; message: Message }
  | { type: 'message_deleted'; messageId: string; chatId: string }
  | { type: 'chat_deleted'; chatId: string }
  | { type: 'chat_updated'; chatId: string; pinnedMessage?: Message | null; bgPhotoUrl?: string | null }
  | { type: 'messages_read'; chatId: string; messageIds: string[] }
  | { type: 'user_typing'; chatId: string; userId: string; isTyping: boolean }
  | { type: 'user_presence'; userId: string; status: 'online' | 'offline'; lastSeen: string };

