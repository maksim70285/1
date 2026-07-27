import { User, AuthResponse, Chat, Message } from '../types';

let authToken: string | null = localStorage.getItem('wm_auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('wm_auth_token', token);
  } else {
    localStorage.removeItem('wm_auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem('wm_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      setAuthToken(null);
    }
    throw new Error(data.error || 'Произошла ошибка при запросе к серверу');
  }

  return data as T;
}

export const api = {
  // Auth
  register: (data: { email?: string; password: string; name: string; username: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { login: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  uploadFile: (data: { fileName: string; fileData: string; fileType?: string; fileSize?: string }) =>
    request<{ mediaUrl: string; mediaType: 'image' | 'video' | 'file'; fileName: string; fileSize: string }>(
      '/api/upload',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // Profile
  updateProfile: (data: { name?: string; username?: string; bio?: string; avatarUrl?: string }) =>
    request<{ user: User }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Users Search
  searchUsers: (query: string, delay = 200) =>
    request<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}&delay=${delay}`),

  // Chats
  getChats: (delay = 200) => request<{ chats: Chat[] }>(`/api/chats?delay=${delay}`),

  findOrCreateChat: (targetUserId: string) =>
    request<{ chat: Chat }>('/api/chats/find-or-create', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    }),

  getMessages: (chatId: string, page = 1, limit = 20, delay = 100) =>
    request<{ messages: Message[]; hasMore: boolean; total: number; page: number }>(
      `/api/chats/${chatId}/messages?page=${page}&limit=${limit}&delay=${delay}`
    ),

  sendMessage: (
    chatId: string,
    data: {
      text: string;
      recipientId: string;
      mediaUrl?: string;
      mediaType?: 'image' | 'video' | 'file';
      fileName?: string;
      fileSize?: string;
      clientMsgId?: string;
    }
  ) =>
    request<{ message: Message; clientMsgId?: string }>(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editMessage: (messageId: string, text: string) =>
    request<{ message: Message }>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }),

  deleteMessage: (messageId: string) =>
    request<{ success: boolean; messageId: string }>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    }),

  deleteChat: (chatId: string) =>
    request<{ success: boolean; chatId: string }>(`/api/chats/${chatId}`, {
      method: 'DELETE',
    }),

  pinMessage: (chatId: string, messageId: string | null) =>
    request<{ success: boolean; pinnedMessage: Message | null }>(`/api/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    }),

  setChatBackground: (chatId: string, bgPhotoUrl: string | null) =>
    request<{ success: boolean; bgPhotoUrl: string | null }>(`/api/chats/${chatId}/background`, {
      method: 'POST',
      body: JSON.stringify({ bgPhotoUrl }),
    }),

  // Admin APIs
  getAdminUsers: () => request<{ users: User[] }>('/api/admin/users'),

  setAdminBadge: (userId: string, badge: string | null) =>
    request<{ user: User }>(`/api/admin/users/${userId}/badge`, {
      method: 'PUT',
      body: JSON.stringify({ badge }),
    }),

  deleteAdminUser: (userId: string) =>
    request<{ success: boolean; deletedUserId: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  wipeMessenger: () =>
    request<{ success: boolean; message: string }>('/api/admin/wipe', {
      method: 'POST',
    }),
};

