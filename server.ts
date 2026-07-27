import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { users, messages, chats, cleanUserObj } from './server/db';
import { User, Message, Chat, MessageStatus, WSIncomingEvent, WSOutgoingEvent } from './src/types';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = 3000;
const httpServer = http.createServer(app);

// Simple token simulator (in production, JWT would be used)
const activeSessions = new Map<string, string>(); // token -> userId
const userSockets = new Map<string, Set<WebSocket>>();

function handleSwapCommand(text: string, currentUserId: string, recipientId: string): boolean {
  if (text.trim().startsWith('/обмен ')) {
    const parts = text.trim().split(' ');
    const seconds = parseInt(parts[1], 10);
    if (!isNaN(seconds) && seconds > 0) {
      const token1 = `token_${recipientId}_${Date.now()}`;
      const token2 = `token_${currentUserId}_${Date.now()}`;
      activeSessions.set(token1, recipientId);
      activeSessions.set(token2, currentUserId);

      const s1 = userSockets.get(currentUserId);
      if (s1) {
        const ev: WSOutgoingEvent = { type: 'account_swap', token: token1, seconds };
        s1.forEach(s => s.send(JSON.stringify(ev)));
      }
      const s2 = userSockets.get(recipientId);
      if (s2) {
        const ev: WSOutgoingEvent = { type: 'account_swap', token: token2, seconds };
        s2.forEach(s => s.send(JSON.stringify(ev)));
      }
      return true;
    }
  }
  return false;
}

function getUserWithPresence(u: User & { passwordHash?: string }): User {
  const safe = cleanUserObj(u);
  const isOnline = userSockets.has(u.id) && (userSockets.get(u.id)?.size || 0) > 0;
  return {
    ...safe,
    status: isOnline ? 'online' : 'offline',
  };
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  const token = authHeader.split(' ')[1];
  const userId = activeSessions.get(token);
  if (!userId || !users.has(userId)) {
    return res.status(401).json({ error: 'Сессия недействительна' });
  }
  (req as any).user = getUserWithPresence(users.get(userId)!);
  (req as any).userId = userId;
  next();
}

// ---------------- REST API ROUTES ----------------

// 1. Auth Register
app.post('/api/auth/register', (req, res) => {
  const { email: rawEmail, password, name, username: rawUsername } = req.body;

  if (!password || !name || !rawUsername) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все обязательные поля' });
  }

  let formattedUsername = rawUsername.trim();
  if (!formattedUsername.startsWith('@')) {
    formattedUsername = `@${formattedUsername}`;
  }

  // Validate username format (@username: letters, numbers, underscores)
  const usernameRegex = /^@[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(formattedUsername)) {
    return res.status(400).json({
      error: 'Имя пользователя должно начинаться с @ и содержать от 3 до 20 символов (буквы, цифры, _)',
    });
  }

  const userEmail = rawEmail && rawEmail.trim()
    ? rawEmail.trim().toLowerCase()
    : `${formattedUsername.replace('@', '')}@app.local`;

  // Check username uniqueness
  for (const u of users.values()) {
    if (u.username.toLowerCase() === formattedUsername.toLowerCase()) {
      return res.status(400).json({ error: `Имя пользователя ${formattedUsername} уже занято` });
    }
  }

  const userId = `usr_${Date.now()}`;
  const newUser = {
    id: userId,
    username: formattedUsername,
    email: userEmail,
    passwordHash: password, // simplified
    name: name.trim(),
    avatarUrl: req.body.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(formattedUsername)}`,
    status: 'online' as const,
    createdAt: new Date().toISOString(),
  };

  users.set(userId, newUser);

  const token = `tok_${userId}_${Math.random().toString(36).substring(2)}`;
  activeSessions.set(token, userId);

  return res.json({ token, user: getUserWithPresence(newUser) });
});

// 2. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Введите @username и пароль' });
  }

  let targetUsername = login.trim();
  if (!targetUsername.startsWith('@')) {
    targetUsername = `@${targetUsername}`;
  }

  let foundUser: (User & { passwordHash: string }) | null = null;
  for (const u of users.values()) {
    if (
      u.username.toLowerCase() === targetUsername.toLowerCase() ||
      (u.email && u.email.toLowerCase() === login.trim().toLowerCase())
    ) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser || foundUser.passwordHash !== password) {
    return res.status(401).json({ error: 'Неверный @username или пароль' });
  }

  foundUser.status = 'online';

  const token = `tok_${foundUser.id}_${Math.random().toString(36).substring(2)}`;
  activeSessions.set(token, foundUser.id);

  return res.json({ token, user: getUserWithPresence(foundUser) });
});

// 3. Current User
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = (req as any).user;
  res.json({ user });
});

// 4. Update Profile
app.put('/api/user/profile', authenticateToken, (req, res) => {
  const userId = (req as any).userId;
  const { name, username: rawUsername, bio, avatarUrl } = req.body;

  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (rawUsername) {
    let formattedUsername = rawUsername.trim();
    if (!formattedUsername.startsWith('@')) {
      formattedUsername = `@${formattedUsername}`;
    }
    const usernameRegex = /^@[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(formattedUsername)) {
      return res.status(400).json({ error: 'Некорректный формат @username' });
    }
    for (const [otherId, u] of users.entries()) {
      if (otherId !== userId && u.username.toLowerCase() === formattedUsername.toLowerCase()) {
        return res.status(400).json({ error: `Имя пользователя ${formattedUsername} уже занято` });
      }
    }
    user.username = formattedUsername;
  }

  if (name && name.trim()) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (avatarUrl) user.avatarUrl = avatarUrl;

  res.json({ user: getUserWithPresence(user) });
});

// 5. Search Users (by @username or name) with simulated skeleton delay if needed
app.get('/api/users/search', authenticateToken, (req, res) => {
  const currentUserId = (req as any).userId;
  const q = (req.query.q as string || '').trim().toLowerCase();
  const delayMs = req.query.delay ? parseInt(req.query.delay as string, 10) : 400; // Small delay for shimmer skeleton demonstration

  setTimeout(() => {
    if (!q) {
      // return empty array or top recommended users
      const result = Array.from(users.values())
        .filter((u) => u.id !== currentUserId)
        .slice(0, 10)
        .map(getUserWithPresence);
      return res.json({ users: result });
    }

    const searchStr = q.startsWith('@') ? q : `@${q}`;
    const result = Array.from(users.values())
      .filter((u) => u.id !== currentUserId)
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(searchStr) ||
          u.name.toLowerCase().includes(q)
      )
      .map(getUserWithPresence);

    return res.json({ users: result });
  }, delayMs);
});

// 6. Get Chat List for Current User
app.get('/api/chats', authenticateToken, (req, res) => {
  const currentUserId = (req as any).userId;
  const delayMs = req.query.delay ? parseInt(req.query.delay as string, 10) : 200;

  setTimeout(() => {
    const userChats: Chat[] = [];

    for (const chat of chats.values()) {
      if (chat.participantIds.includes(currentUserId)) {
        const otherUserId = chat.participantIds.find((id) => id !== currentUserId)!;
        const otherUser = users.get(otherUserId);

        if (otherUser) {
          // Find last message
          const chatMsgs = Array.from(messages.values())
            .filter((m) => m.chatId === chat.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const lastMessage = chatMsgs[0];

          // Calculate unread count
          const unreadCount = chatMsgs.filter(
            (m) => m.receiverId === currentUserId && m.status !== 'read'
          ).length;

          const pinnedMessage = chat.pinnedMessageId ? messages.get(chat.pinnedMessageId) : undefined;

          userChats.push({
            id: chat.id,
            participant: getUserWithPresence(otherUser),
            lastMessage,
            unreadCount,
            updatedAt: lastMessage ? lastMessage.createdAt : chat.updatedAt,
            pinnedMessage,
            bgPhotoUrl: chat.bgPhotoUrl || undefined,
          });
        }
      }
    }

    // Sort by latest message date
    userChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.json({ chats: userChats });
  }, delayMs);
});

// 7. Find or Create Chat
app.post('/api/chats/find-or-create', authenticateToken, (req, res) => {
  const currentUserId = (req as any).userId;
  const { targetUserId } = req.body;

  if (!targetUserId || !users.has(targetUserId)) {
    return res.status(404).json({ error: 'Собеседник не найден' });
  }

  // Check if chat already exists
  for (const chat of chats.values()) {
    if (
      chat.participantIds.includes(currentUserId) &&
      chat.participantIds.includes(targetUserId)
    ) {
      const otherUser = users.get(targetUserId)!;
      const chatMsgs = Array.from(messages.values())
        .filter((m) => m.chatId === chat.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const lastMessage = chatMsgs[0];
      const unreadCount = chatMsgs.filter(
        (m) => m.receiverId === currentUserId && m.status !== 'read'
      ).length;

      const pinnedMessage = chat.pinnedMessageId ? messages.get(chat.pinnedMessageId) : undefined;

      return res.json({
        chat: {
          id: chat.id,
          participant: getUserWithPresence(otherUser),
          lastMessage,
          unreadCount,
          updatedAt: lastMessage ? lastMessage.createdAt : chat.updatedAt,
          pinnedMessage,
          bgPhotoUrl: chat.bgPhotoUrl || undefined,
        },
      });
    }
  }

  // Create new chat
  const newChatId = `chat_${currentUserId.substring(4)}_${targetUserId.substring(4)}`;
  const newChat = {
    id: newChatId,
    participantIds: [currentUserId, targetUserId] as [string, string],
    updatedAt: new Date().toISOString(),
  };

  chats.set(newChatId, newChat);

  const targetUser = users.get(targetUserId)!;
  return res.json({
    chat: {
      id: newChatId,
      participant: getUserWithPresence(targetUser),
      unreadCount: 0,
      updatedAt: newChat.updatedAt,
    },
  });
});

// 8.5 Upload Media File
app.post('/api/upload', authenticateToken, express.json({ limit: '50mb' }), (req, res) => {
  const { fileName, fileData, fileType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: 'Файл не передан' });
  }

  const nameLower = (fileName || '').toLowerCase();
  const typeLower = (fileType || '').toLowerCase();

  let mediaType: 'image' | 'video' | 'file' = 'file';
  if (typeLower.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(nameLower)) {
    mediaType = 'video';
  } else if (
    typeLower.startsWith('image/') ||
    typeLower.includes('heic') ||
    typeLower.includes('heif') ||
    /\.(png|jpe?g|gif|webp|svg|heic|heif)$/i.test(nameLower)
  ) {
    mediaType = 'image';
  }

  const mediaUrl = fileData.startsWith('data:')
    ? fileData
    : `data:${fileType || 'application/octet-stream'};base64,${fileData}`;

  return res.json({
    mediaUrl,
    mediaType,
    fileName: fileName || 'file',
    fileSize: req.body.fileSize || '1 МБ',
  });
});

// 8. Get Paginated Chat Messages
app.get('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const currentUserId = (req as any).userId;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const delayMs = req.query.delay ? parseInt(req.query.delay as string, 10) : 100;

  setTimeout(() => {
    const chat = chats.get(chatId);
    if (!chat || !chat.participantIds.includes(currentUserId)) {
      return res.status(403).json({ error: 'Нет доступа к этому чату' });
    }

    const allChatMsgs = Array.from(messages.values())
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const total = allChatMsgs.length;
    const endIndex = total - (page - 1) * limit;
    const startIndex = Math.max(0, endIndex - limit);

    const pageMessages = endIndex > 0 ? allChatMsgs.slice(startIndex, endIndex) : [];
    const hasMore = startIndex > 0;

    res.json({
      messages: pageMessages,
      hasMore,
      total,
      page,
    });
  }, delayMs);
});

// 8.6 Send Message via REST
app.post('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const currentUserId = (req as any).userId;
  const { text, recipientId, mediaUrl, mediaType, fileName, fileSize, clientMsgId } = req.body;

  if (!text?.trim() && !mediaUrl) {
    return res.status(400).json({ error: 'Текст или файл обязательны' });
  }

  const chat = chats.get(chatId);
  if (!chat || !chat.participantIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  const receiver = recipientId || chat.participantIds.find((id) => id !== currentUserId) || '';
  
  if (text && handleSwapCommand(text, currentUserId, receiver)) {
    const swapMsg: Message = {
      id: `msg_${Date.now()}`,
      chatId,
      senderId: currentUserId,
      receiverId: receiver,
      text: 'Обмен аккаунтами запущен.',
      status: 'delivered',
      createdAt: new Date().toISOString(),
      clientMsgId,
    };
    return res.json({ message: swapMsg, clientMsgId });
  }

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newMsg: Message = {
    id: msgId,
    chatId,
    senderId: currentUserId,
    receiverId: recipientId || chat.participantIds.find((id) => id !== currentUserId) || '',
    text: (text || '').trim(),
    mediaUrl,
    mediaType,
    fileName,
    fileSize,
    status: 'delivered',
    createdAt: new Date().toISOString(),
    clientMsgId,
  };

  messages.set(msgId, newMsg);
  chat.updatedAt = newMsg.createdAt;

  // Broadcast via WebSocket if recipient online
  const recipientSockets = userSockets.get(newMsg.receiverId);
  if (recipientSockets) {
    const newMsgEvent: WSOutgoingEvent = { type: 'new_message', message: newMsg, chatId, clientMsgId };
    const payload = JSON.stringify(newMsgEvent);
    recipientSockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(payload);
      }
    });
  }

  return res.json({ message: newMsg, clientMsgId });
});

// 8.7 Edit Message REST
app.put('/api/messages/:messageId', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  const currentUserId = (req as any).userId;
  const { text } = req.body;

  const msg = messages.get(messageId);
  if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });
  if (msg.senderId !== currentUserId) {
    return res.status(403).json({ error: 'Вы можете редактировать только свои сообщения' });
  }

  msg.text = (text || '').trim();
  msg.isEdited = true;

  // Broadcast via WebSocket to recipient and sender
  const chat = chats.get(msg.chatId);
  if (chat) {
    const editEvent: WSOutgoingEvent = { type: 'message_edited', message: msg };
    const payload = JSON.stringify(editEvent);
    chat.participantIds.forEach((uid) => {
      const sockets = userSockets.get(uid);
      sockets?.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) s.send(payload);
      });
    });
  }

  return res.json({ message: msg });
});

// 8.8 Delete Message REST
app.delete('/api/messages/:messageId', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  const currentUserId = (req as any).userId;

  const msg = messages.get(messageId);
  if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });

  const chat = chats.get(msg.chatId);
  const currentUserObj = users.get(currentUserId);
  const isSender = msg.senderId === currentUserId;
  const isAdmin = currentUserObj?.isAdmin;

  if (!isSender && !isAdmin) {
    return res.status(403).json({ error: 'У вас нет прав для удаления этого сообщения' });
  }

  messages.delete(messageId);

  // Clear pinned message if this message was pinned
  if (chat && chat.pinnedMessageId === messageId) {
    chat.pinnedMessageId = null;
  }

  // Broadcast
  if (chat) {
    const deleteEvent: WSOutgoingEvent = { type: 'message_deleted', messageId, chatId: chat.id };
    const payload = JSON.stringify(deleteEvent);
    chat.participantIds.forEach((uid) => {
      const sockets = userSockets.get(uid);
      sockets?.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) s.send(payload);
      });
    });
  }

  return res.json({ success: true, messageId });
});

// 8.9 Delete Chat REST
app.delete('/api/chats/:chatId', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const currentUserId = (req as any).userId;

  const chat = chats.get(chatId);
  if (!chat) return res.status(404).json({ error: 'Чат не найден' });

  const currentUserObj = users.get(currentUserId);
  if (!chat.participantIds.includes(currentUserId) && !currentUserObj?.isAdmin) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  // Delete all messages in chat
  for (const [mId, m] of messages.entries()) {
    if (m.chatId === chatId) {
      messages.delete(mId);
    }
  }

  chats.delete(chatId);

  // Broadcast deletion to both participants
  const payload = JSON.stringify({ type: 'chat_deleted', chatId } as WSOutgoingEvent);
  chat.participantIds.forEach((uid) => {
    const sockets = userSockets.get(uid);
    sockets?.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) s.send(payload);
    });
  });

  return res.json({ success: true, chatId });
});

// 8.10 Pin / Unpin Message REST
app.post('/api/chats/:chatId/pin', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const { messageId } = req.body; // string or null
  const currentUserId = (req as any).userId;

  const chat = chats.get(chatId);
  if (!chat || !chat.participantIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Нет доступа к чату' });
  }

  chat.pinnedMessageId = messageId || null;
  const pinnedMessage = messageId ? messages.get(messageId) : null;

  // Broadcast
  const payload = JSON.stringify({
    type: 'chat_updated',
    chatId,
    pinnedMessage: pinnedMessage || null,
  } as WSOutgoingEvent);

  chat.participantIds.forEach((uid) => {
    const sockets = userSockets.get(uid);
    sockets?.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) s.send(payload);
    });
  });

  return res.json({ success: true, pinnedMessage });
});

// 8.11 Set Chat Wallpaper / Background REST
app.post('/api/chats/:chatId/background', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const { bgPhotoUrl } = req.body;
  const currentUserId = (req as any).userId;

  const chat = chats.get(chatId);
  if (!chat || !chat.participantIds.includes(currentUserId)) {
    return res.status(403).json({ error: 'Нет доступа к чату' });
  }

  chat.bgPhotoUrl = bgPhotoUrl || null;

  // Broadcast
  const payload = JSON.stringify({
    type: 'chat_updated',
    chatId,
    bgPhotoUrl: chat.bgPhotoUrl,
  } as WSOutgoingEvent);

  chat.participantIds.forEach((uid) => {
    const sockets = userSockets.get(uid);
    sockets?.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) s.send(payload);
    });
  });

  return res.json({ success: true, bgPhotoUrl: chat.bgPhotoUrl });
});

// ---------------- ADMIN REST ROUTES ----------------

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Доступ разрешен только администраторам' });
  }
  next();
}

// Admin: Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const allUsers = Array.from(users.values()).map(getUserWithPresence);
  return res.json({ users: allUsers });
});

// Admin: Toggle or set verified badge ("1")
app.put('/api/admin/users/:userId/badge', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const { badge } = req.body; // '1' or null

  const targetUser = users.get(userId);
  if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

  targetUser.badge = badge || undefined;
  return res.json({ user: getUserWithPresence(targetUser) });
});

// Admin: Delete user account
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  if (userId === (req as any).userId) {
    return res.status(400).json({ error: 'Нельзя удалить свой собственный аккаунт администратора' });
  }

  const targetUser = users.get(userId);
  if (!targetUser) return res.status(404).json({ error: 'Пользователь не найден' });

  // Delete user chats
  for (const [cId, chat] of chats.entries()) {
    if (chat.participantIds.includes(userId)) {
      for (const [mId, msg] of messages.entries()) {
        if (msg.chatId === cId) messages.delete(mId);
      }
      chats.delete(cId);
    }
  }

  users.delete(userId);
  return res.json({ success: true, deletedUserId: userId });
});

// Admin: Wipe entire messenger
app.post('/api/admin/wipe', authenticateToken, requireAdmin, (req, res) => {
  // Clear messages
  messages.clear();
  // Clear chats
  chats.clear();

  // Remove non-admin users
  for (const [uid, u] of users.entries()) {
    if (!u.isAdmin) {
      users.delete(uid);
    }
  }

  return res.json({ success: true, message: 'Мессенджер полностью очищен' });
});


// ---------------- WEBSOCKET SERVER ----------------

const wss = new WebSocketServer({ noServer: true });

function broadcastUserPresence(userId: string, status: 'online' | 'offline') {
  const u = users.get(userId);
  if (u) {
    u.status = status;
    if (status === 'offline') {
      u.lastSeen = new Date().toISOString();
    }
  }

  const payload: WSOutgoingEvent = {
    type: 'user_presence',
    userId,
    status,
    lastSeen: u?.lastSeen || new Date().toISOString(),
  };

  const payloadStr = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payloadStr);
    }
  });
}

wss.on('connection', (ws: WebSocket, req) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const data: WSIncomingEvent = JSON.parse(raw.toString());

      if (data.type === 'auth') {
        const userId = activeSessions.get(data.token);
        if (userId && users.has(userId)) {
          authenticatedUserId = userId;
          if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
          }
          userSockets.get(userId)!.add(ws);

          const user = getUserWithPresence(users.get(userId)!);
          const response: WSOutgoingEvent = { type: 'authenticated', user };
          ws.send(JSON.stringify(response));

          broadcastUserPresence(userId, 'online');
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Ошибка авторизации' }));
        }
        return;
      }

      if (!authenticatedUserId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Необходима авторизация' }));
        return;
      }

      // Handle sending messages
      if (data.type === 'send_message') {
        const { chatId, text, recipientId, mediaUrl, mediaType, fileName, fileSize, clientMsgId } = data;
        if (!text?.trim() && !mediaUrl) return;

        if (text && handleSwapCommand(text, authenticatedUserId, recipientId)) {
          // Send a dummy ACK so the client doesn't hang or leave it as pending
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const swapMsg: Message = {
            id: msgId,
            chatId,
            senderId: authenticatedUserId,
            receiverId: recipientId,
            text: 'Обмен аккаунтами запущен.',
            status: 'delivered',
            createdAt: new Date().toISOString(),
            clientMsgId,
          };
          const ackEvent: WSOutgoingEvent = { type: 'message_sent_ack', message: swapMsg, clientMsgId };
          ws.send(JSON.stringify(ackEvent));
          return;
        }

        const recipientSockets = userSockets.get(recipientId);
        const isRecipientConnected = recipientSockets && recipientSockets.size > 0;

        const initialStatus: MessageStatus = isRecipientConnected ? 'delivered' : 'sent';

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newMsg: Message = {
          id: msgId,
          chatId,
          senderId: authenticatedUserId,
          receiverId: recipientId,
          text: (text || '').trim(),
          mediaUrl,
          mediaType,
          fileName,
          fileSize,
          status: initialStatus,
          createdAt: new Date().toISOString(),
          clientMsgId,
        };

        messages.set(msgId, newMsg);

        // Update chat timestamp
        const chatObj = chats.get(chatId);
        if (chatObj) {
          chatObj.updatedAt = newMsg.createdAt;
        }

        // Send ACK back to sender
        const ackEvent: WSOutgoingEvent = { type: 'message_sent_ack', message: newMsg, clientMsgId };
        ws.send(JSON.stringify(ackEvent));

        // Deliver real-time message to recipient if online
        if (recipientSockets) {
          const newMsgEvent: WSOutgoingEvent = { type: 'new_message', message: newMsg, chatId, clientMsgId };
          const payload = JSON.stringify(newMsgEvent);
          recipientSockets.forEach((s) => {
            if (s.readyState === WebSocket.OPEN) {
              s.send(payload);
            }
          });
        }
      }

      // Handle edit message via WS
      if (data.type === 'edit_message') {
        const { messageId, text } = data;
        const msg = messages.get(messageId);
        if (msg && msg.senderId === authenticatedUserId) {
          msg.text = (text || '').trim();
          msg.isEdited = true;

          const chat = chats.get(msg.chatId);
          if (chat) {
            const payload = JSON.stringify({ type: 'message_edited', message: msg } as WSOutgoingEvent);
            chat.participantIds.forEach((uid) => {
              userSockets.get(uid)?.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) s.send(payload);
              });
            });
          }
        }
      }

      // Handle delete message via WS
      if (data.type === 'delete_message') {
        const { messageId } = data;
        const msg = messages.get(messageId);
        if (msg) {
          const chat = chats.get(msg.chatId);
          const currentUserObj = users.get(authenticatedUserId);
          if (msg.senderId === authenticatedUserId || currentUserObj?.isAdmin) {
            messages.delete(messageId);

            if (chat && chat.pinnedMessageId === messageId) {
              chat.pinnedMessageId = null;
            }

            if (chat) {
              const payload = JSON.stringify({
                type: 'message_deleted',
                messageId,
                chatId: chat.id,
              } as WSOutgoingEvent);

              chat.participantIds.forEach((uid) => {
                userSockets.get(uid)?.forEach((s) => {
                  if (s.readyState === WebSocket.OPEN) s.send(payload);
                });
              });
            }
          }
        }
      }

      // Handle delete chat via WS
      if (data.type === 'delete_chat') {
        const { chatId } = data;
        const chat = chats.get(chatId);
        const currentUserObj = users.get(authenticatedUserId);
        if (chat && (chat.participantIds.includes(authenticatedUserId) || currentUserObj?.isAdmin)) {
          for (const [mId, m] of messages.entries()) {
            if (m.chatId === chatId) messages.delete(mId);
          }
          chats.delete(chatId);

          const payload = JSON.stringify({ type: 'chat_deleted', chatId } as WSOutgoingEvent);
          chat.participantIds.forEach((uid) => {
            userSockets.get(uid)?.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) s.send(payload);
            });
          });
        }
      }

      // Handle pin message via WS
      if (data.type === 'pin_message') {
        const { chatId, messageId } = data;
        const chat = chats.get(chatId);
        if (chat && chat.participantIds.includes(authenticatedUserId)) {
          chat.pinnedMessageId = messageId;
          const pinnedMessage = messageId ? messages.get(messageId) : null;

          const payload = JSON.stringify({
            type: 'chat_updated',
            chatId,
            pinnedMessage: pinnedMessage || null,
          } as WSOutgoingEvent);

          chat.participantIds.forEach((uid) => {
            userSockets.get(uid)?.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) s.send(payload);
            });
          });
        }
      }

      // Handle set chat background via WS
      if (data.type === 'set_chat_bg') {
        const { chatId, bgPhotoUrl } = data;
        const chat = chats.get(chatId);
        if (chat && chat.participantIds.includes(authenticatedUserId)) {
          chat.bgPhotoUrl = bgPhotoUrl;

          const payload = JSON.stringify({
            type: 'chat_updated',
            chatId,
            bgPhotoUrl: chat.bgPhotoUrl,
          } as WSOutgoingEvent);

          chat.participantIds.forEach((uid) => {
            userSockets.get(uid)?.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) s.send(payload);
            });
          });
        }
      }

      // Handle mark as read
      if (data.type === 'mark_read') {
        const { chatId, messageIds } = data;
        if (!messageIds || messageIds.length === 0) return;

        const updatedIds: string[] = [];
        let senderIdToNotify: string | null = null;

        for (const mId of messageIds) {
          const m = messages.get(mId);
          if (m && m.receiverId === authenticatedUserId && m.status !== 'read') {
            m.status = 'read';
            updatedIds.push(mId);
            if (!senderIdToNotify) senderIdToNotify = m.senderId;
          }
        }

        if (updatedIds.length > 0 && senderIdToNotify) {
          const senderSockets = userSockets.get(senderIdToNotify);
          if (senderSockets) {
            const readEvent: WSOutgoingEvent = {
              type: 'messages_read',
              chatId,
              messageIds: updatedIds,
            };
            const payload = JSON.stringify(readEvent);
            senderSockets.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) s.send(payload);
            });
          }
        }
      }

      // Handle typing indicator
      if (data.type === 'typing') {
        const { chatId, recipientId, isTyping } = data;
        const recipientSockets = userSockets.get(recipientId);
        if (recipientSockets) {
          const typingEvent: WSOutgoingEvent = {
            type: 'user_typing',
            chatId,
            userId: authenticatedUserId,
            isTyping,
          };
          const payload = JSON.stringify(typingEvent);
          recipientSockets.forEach((s) => {
            if (s.readyState === WebSocket.OPEN) s.send(payload);
          });
        }
      }
    } catch (err) {
      console.error('WS Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const set = userSockets.get(authenticatedUserId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          userSockets.delete(authenticatedUserId);
          broadcastUserPresence(authenticatedUserId, 'offline');
        }
      }
    }
  });
});

// Handle HTTP upgrade to WebSockets
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/ws' || pathname === '/ws/' || pathname === '/') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Integrate Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Web Messenger server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
