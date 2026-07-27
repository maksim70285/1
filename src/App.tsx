import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Chat, Message, WSOutgoingEvent, WSIncomingEvent } from './types';
import { api, getAuthToken, setAuthToken } from './lib/api';
import { AuthView } from './components/AuthView';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { UserSearchModal } from './components/UserSearchModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminModal } from './components/AdminModal';
import { MessageSquare, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Messenger State
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);

  // Active Chat Messages State
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagePage, setMessagePage] = useState(1);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Custom Colors
  const [customBgColor, setCustomBgColor] = useState<string>(
    () => localStorage.getItem('app_custom_bg_color') || ''
  );
  const [customTextColor, setCustomTextColor] = useState<string>(
    () => localStorage.getItem('app_custom_text_color') || ''
  );

  const handleBgColorChange = (color: string) => {
    setCustomBgColor(color);
    if (color) localStorage.setItem('app_custom_bg_color', color);
    else localStorage.removeItem('app_custom_bg_color');
  };

  const handleTextColorChange = (color: string) => {
    setCustomTextColor(color);
    if (color) localStorage.setItem('app_custom_text_color', color);
    else localStorage.removeItem('app_custom_text_color');
  };

  const handleResetColors = () => {
    setCustomBgColor('');
    setCustomTextColor('');
    localStorage.removeItem('app_custom_bg_color');
    localStorage.removeItem('app_custom_text_color');
  };

  // Real-time State
  const [wsConnected, setWsConnected] = useState(false);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({}); // chatId -> isTyping
  const wsRef = useRef<WebSocket | null>(null);

  // Check auth session on load
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await api.getMe();
          setCurrentUser(res.user);
        } catch {
          // Token expired or invalid, reset auth state silently
          setAuthToken(null);
        }
      }
      setInitializing(false);
    };
    initAuth();
  }, []);

  // Fetch chat list when user is authenticated
  const loadChats = useCallback(async () => {
    if (!currentUser) return;
    setLoadingChats(true);
    try {
      const res = await api.getChats(400); // 400ms delay to clearly render Skeleton
      setChats(res.chats);
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser, loadChats]);

  // Connect WebSockets when authenticated
  useEffect(() => {
    if (!currentUser) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket: WebSocket | null = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setWsConnected(true);
      // Send auth event
      const authPayload: WSIncomingEvent = { type: 'auth', token };
      socket?.send(JSON.stringify(authPayload));
    };

    socket.onmessage = (event) => {
      try {
        const data: WSOutgoingEvent = JSON.parse(event.data);

        if (data.type === 'authenticated') {
          setWsConnected(true);
        }

        if (data.type === 'new_message') {
          const { message, chatId, clientMsgId } = data;

          // If message belongs to current active chat, append or update it
          if (activeChat && activeChat.id === chatId) {
            setMessages((prev) => {
              const targetClientMsgId = clientMsgId || message.clientMsgId;
              const exists = prev.some(
                (m) =>
                  m.id === message.id ||
                  (targetClientMsgId && (m.id === targetClientMsgId || m.clientMsgId === targetClientMsgId))
              );
              if (exists) {
                return prev.map((m) =>
                  m.id === message.id ||
                  (targetClientMsgId && (m.id === targetClientMsgId || m.clientMsgId === targetClientMsgId))
                    ? message
                    : m
                );
              }
              return [...prev, message];
            });

            // Mark as read immediately since user is in chat
            const markReadPayload: WSIncomingEvent = {
              type: 'mark_read',
              chatId,
              messageIds: [message.id],
            };
            wsRef.current?.send(JSON.stringify(markReadPayload));
          }

          // Update chat list last message & unread count
          setChats((prevChats) =>
            prevChats.map((c) => {
              if (c.id === chatId) {
                const isCurrentActive = activeChat && activeChat.id === chatId;
                return {
                  ...c,
                  lastMessage: message,
                  unreadCount: isCurrentActive ? 0 : c.unreadCount + 1,
                  updatedAt: message.createdAt,
                };
              }
              return c;
            }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          );
        }

        if (data.type === 'message_sent_ack') {
          const { message, clientMsgId } = data;
          setMessages((prev) => {
            const targetClientMsgId = clientMsgId || message.clientMsgId;
            const exists = prev.some(
              (m) =>
                m.id === message.id ||
                (targetClientMsgId && (m.id === targetClientMsgId || m.clientMsgId === targetClientMsgId))
            );
            if (exists) {
              return prev.map((m) =>
                m.id === message.id ||
                (targetClientMsgId && (m.id === targetClientMsgId || m.clientMsgId === targetClientMsgId))
                  ? message
                  : m
              );
            }
            return [...prev, message];
          });

          // Update last message in chat list
          setChats((prevChats) =>
            prevChats.map((c) => {
              if (c.id === message.chatId) {
                return { ...c, lastMessage: message, updatedAt: message.createdAt };
              }
              return c;
            })
          );
        }

        if (data.type === 'messages_read') {
          const { messageIds } = data;
          setMessages((prev) =>
            prev.map((m) => (messageIds.includes(m.id) ? { ...m, status: 'read' } : m))
          );
        }

        if (data.type === 'user_typing') {
          const { chatId, isTyping } = data;
          setTypingMap((prev) => ({ ...prev, [chatId]: isTyping }));
        }

        if (data.type === 'user_presence') {
          const { userId, status, lastSeen } = data;
          // Update chat participant status if present
          setChats((prevChats) =>
            prevChats.map((c) => {
              if (c.participant.id === userId) {
                return {
                  ...c,
                  participant: { ...c.participant, status, lastSeen },
                };
              }
              return c;
            })
          );

          if (activeChat && activeChat.participant.id === userId) {
            setActiveChat((prev) =>
              prev ? { ...prev, participant: { ...prev.participant, status, lastSeen } } : null
            );
          }
        }

        if (data.type === 'chat_deleted') {
          const { chatId } = data;
          setChats((prev) => prev.filter((c) => c.id !== chatId));
          if (activeChat && activeChat.id === chatId) {
            setActiveChat(null);
            setMessages([]);
          }
        }

        if (data.type === 'message_edited') {
          const { message } = data;
          setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
        }

        if (data.type === 'message_deleted') {
          const { messageId } = data;
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }

        if (data.type === 'chat_updated') {
          const { chatId, pinnedMessage, bgPhotoUrl } = data;
          setChats((prev) =>
            prev.map((c) => {
              if (c.id === chatId) {
                return {
                  ...c,
                  ...(pinnedMessage !== undefined ? { pinnedMessage: pinnedMessage || undefined } : {}),
                  ...(bgPhotoUrl !== undefined ? { bgPhotoUrl: bgPhotoUrl || undefined } : {}),
                };
              }
              return c;
            })
          );
          if (activeChat && activeChat.id === chatId) {
            setActiveChat((prev) =>
              prev
                ? {
                    ...prev,
                    ...(pinnedMessage !== undefined ? { pinnedMessage: pinnedMessage || undefined } : {}),
                    ...(bgPhotoUrl !== undefined ? { bgPhotoUrl: bgPhotoUrl || undefined } : {}),
                  }
                : null
            );
          }
        }
      } catch (err) {
        console.error('WS Error processing message:', err);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      socket?.close();
    };
  }, [currentUser, activeChat]);

  // Load chat messages when selecting a chat
  const handleSelectChat = async (chat: Chat) => {
    setActiveChat(chat);
    setLoadingMessages(true);
    setMessagePage(1);

    try {
      // 350ms delay for MessageHistorySkeleton
      const res = await api.getMessages(chat.id, 1, 20, 350);
      setMessages(res.messages);
      setHasMoreMessages(res.hasMore);

      // Reset unread count in local chat list
      setChats((prev) =>
        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
      );

      // Mark unread incoming messages as read via WS
      const unreadMsgIds = res.messages
        .filter((m) => m.receiverId === currentUser?.id && m.status !== 'read')
        .map((m) => m.id);

      if (unreadMsgIds.length > 0 && wsRef.current) {
        const markReadPayload: WSIncomingEvent = {
          type: 'mark_read',
          chatId: chat.id,
          messageIds: unreadMsgIds,
        };
        wsRef.current.send(JSON.stringify(markReadPayload));
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load more messages on scroll
  const handleLoadMoreMessages = async () => {
    if (!activeChat || !hasMoreMessages) return;
    const nextPage = messagePage + 1;
    try {
      const res = await api.getMessages(activeChat.id, nextPage, 20, 200);
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMoreMessages(res.hasMore);
      setMessagePage(nextPage);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

  // Send real-time text or media message
  const handleSendMessage = async (
    text: string,
    media?: { mediaUrl: string; mediaType: 'image' | 'file'; fileName?: string; fileSize?: string }
  ) => {
    if (!activeChat || !currentUser) return;

    const tempMsgId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg: Message = {
      id: tempMsgId,
      chatId: activeChat.id,
      senderId: currentUser.id,
      receiverId: activeChat.participant.id,
      text: text || '',
      mediaUrl: media?.mediaUrl,
      mediaType: media?.mediaType,
      fileName: media?.fileName,
      fileSize: media?.fileSize,
      status: 'sent',
      createdAt: new Date().toISOString(),
      clientMsgId: tempMsgId,
    };

    // Optimistically append to chat UI
    setMessages((prev) => {
      if (prev.some((m) => m.id === tempMsgId)) return prev;
      return [...prev, optimisticMsg];
    });

    // Update active chat timestamp
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? {
              ...c,
              updatedAt: optimisticMsg.createdAt,
              lastMessage: optimisticMsg,
            }
          : c
      )
    );

    // Send via WebSocket if available
    let sentViaWs = false;
    if (wsRef.current && wsConnected && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const sendPayload: WSIncomingEvent = {
          type: 'send_message',
          chatId: activeChat.id,
          text,
          recipientId: activeChat.participant.id,
          mediaUrl: media?.mediaUrl,
          mediaType: media?.mediaType,
          fileName: media?.fileName,
          fileSize: media?.fileSize,
          clientMsgId: tempMsgId,
        };
        wsRef.current.send(JSON.stringify(sendPayload));
        sentViaWs = true;
      } catch (err) {
        console.warn('WS send failed, falling back to REST API', err);
      }
    }

    // Fallback to REST API if WS wasn't available or failed
    if (!sentViaWs) {
      try {
        const res = await api.sendMessage(activeChat.id, {
          text,
          recipientId: activeChat.participant.id,
          mediaUrl: media?.mediaUrl,
          mediaType: media?.mediaType,
          fileName: media?.fileName,
          fileSize: media?.fileSize,
          clientMsgId: tempMsgId,
        });

        // Replace temp msg with real message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempMsgId || (m.clientMsgId && m.clientMsgId === tempMsgId) || m.id === res.message.id
              ? res.message
              : m
          )
        );
      } catch (err) {
        console.error('Failed to send message via REST:', err);
      }
    }
  };

  // Send real-time typing state
  const handleTyping = (isTyping: boolean) => {
    if (!activeChat || !wsRef.current || !wsConnected) return;
    const typingPayload: WSIncomingEvent = {
      type: 'typing',
      chatId: activeChat.id,
      recipientId: activeChat.participant.id,
      isTyping,
    };
    wsRef.current.send(JSON.stringify(typingPayload));
  };

  // Message Actions
  const handleEditMessage = async (messageId: string, text: string) => {
    try {
      const res = await api.editMessage(messageId, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? res.message : m))
      );
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChat?.id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handlePinMessage = async (chatId: string, messageId: string | null) => {
    try {
      const res = await api.pinMessage(chatId, messageId);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, pinnedMessage: res.pinnedMessage } : c))
      );
      if (activeChat?.id === chatId) {
        setActiveChat((prev) =>
          prev ? { ...prev, pinnedMessage: res.pinnedMessage } : null
        );
      }
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const handleSetChatBackground = async (chatId: string, bgPhotoUrl: string | null) => {
    try {
      const res = await api.setChatBackground(chatId, bgPhotoUrl);
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, bgPhotoUrl: res.bgPhotoUrl } : c))
      );
      if (activeChat?.id === chatId) {
        setActiveChat((prev) =>
          prev ? { ...prev, bgPhotoUrl: res.bgPhotoUrl } : null
        );
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'set_chat_bg',
            chatId,
            bgPhotoUrl,
          })
        );
      }
    } catch (err) {
      console.error('Failed to set chat background:', err);
    }
  };

  // Create chat from search modal
  const handleSelectUserFromSearch = async (targetUser: User) => {
    try {
      const res = await api.findOrCreateChat(targetUser.id);
      const chat = res.chat;

      // Add to chat list if not existing
      setChats((prev) => {
        const exists = prev.some((c) => c.id === chat.id);
        if (!exists) return [chat, ...prev];
        return prev;
      });

      handleSelectChat(chat);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const handleRefreshAdminData = async () => {
    if (currentUser) {
      try {
        const selfRes = await api.getMe();
        setCurrentUser(selfRes.user);
      } catch (err) {
        console.error(err);
      }
    }
    loadChats();
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView onSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div
      style={{
        ...(customBgColor ? { backgroundColor: customBgColor } : {}),
        ...(customTextColor ? { color: customTextColor } : {}),
      }}
      className="h-[100dvh] w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col overflow-hidden transition-colors"
    >
      {/* Desktop / Tablet / Mobile Responsive Main Layout Container */}
      <div
        className="flex-1 flex max-w-[1500px] w-full mx-auto my-0 sm:my-2 md:my-3 lg:my-4 sm:rounded-2xl lg:rounded-3xl border-0 sm:border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg overflow-hidden bg-white dark:bg-zinc-900"
        style={{
          ...(customBgColor ? { backgroundColor: customBgColor } : {}),
          ...(customTextColor ? { color: customTextColor } : {}),
        }}
      >
        {/* Chat List Sidebar */}
        <div
          className={`w-full md:w-80 lg:w-96 xl:w-[400px] shrink-0 h-full ${
            activeChat ? 'hidden md:block' : 'block'
          }`}
        >
          <ChatList
            chats={chats}
            activeChatId={activeChat?.id || null}
            loading={loadingChats}
            currentUser={currentUser}
            wsConnected={wsConnected}
            onSelectChat={handleSelectChat}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenAdmin={() => setIsAdminModalOpen(true)}
          />
        </div>

        {/* Chat Window Panel */}
        <div
          className={`flex-1 h-full ${
            activeChat ? 'block' : 'hidden md:flex flex-col items-center justify-center'
          }`}
        >
          {activeChat ? (
            <ChatWindow
              chat={activeChat}
              currentUser={currentUser}
              messages={messages}
              loadingMessages={loadingMessages}
              isTyping={!!typingMap[activeChat.id]}
              onBackMobile={() => setActiveChat(null)}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onLoadMoreMessages={handleLoadMoreMessages}
              hasMoreMessages={hasMoreMessages}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onDeleteChat={handleDeleteChat}
              onPinMessage={handlePinMessage}
              onSetChatBackground={handleSetChatBackground}
            />
          ) : (
            <div className="text-center p-8 space-y-3 max-w-sm">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 mx-auto flex items-center justify-center text-zinc-400">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                Выберите диалог
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Выберите чат из списка слева или найдите пользователя по его индивидуальному <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">@username</span>
              </p>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="mt-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-xl transition hover:opacity-90 inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Найти по @username</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={handleSelectUserFromSearch}
      />

      {/* Profile & Settings Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        currentUser={currentUser}
        customBgColor={customBgColor}
        customTextColor={customTextColor}
        onBgColorChange={handleBgColorChange}
        onTextColorChange={handleTextColorChange}
        onResetColors={handleResetColors}
        onClose={() => setIsProfileOpen(false)}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          setIsProfileOpen(false);
          setActiveChat(null);
        }}
      />

      {/* Admin Dashboard Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onRefreshData={handleRefreshAdminData}
      />
    </div>
  );
}
