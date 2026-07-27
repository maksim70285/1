import { User, Message, Chat, MessageStatus } from '../src/types';

export interface ChatRecord {
  id: string;
  participantIds: [string, string];
  updatedAt: string;
  pinnedMessageId?: string | null;
  bgPhotoUrl?: string | null;
}

// In-memory data store for real registered users, messages, and chats
export const users: Map<string, User & { passwordHash: string }> = new Map();
export const messages: Map<string, Message> = new Map();
export const chats: Map<string, ChatRecord> = new Map();

// Seed Default Admin Account
const adminUser = {
  id: 'usr_admin',
  username: '@admin',
  email: 'admin@app.local',
  passwordHash: 'admin',
  name: 'Администратор',
  avatarUrl: '',
  status: 'offline' as const,
  createdAt: new Date().toISOString(),
  badge: '1',
  isAdmin: true,
};
users.set(adminUser.id, adminUser);

export function cleanUserObj(u: User & { passwordHash?: string }): User {
  const { passwordHash, ...safe } = u;
  return safe;
}


