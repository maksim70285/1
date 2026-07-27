import React, { useState } from 'react';
import { Search, UserPlus, Settings, MessageSquare, Check, CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { Chat, User } from '../types';
import { ChatListSkeleton } from './skeletons/ChatListSkeleton';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  loading: boolean;
  currentUser: User;
  wsConnected: boolean;
  onSelectChat: (chat: Chat) => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onOpenAdmin?: () => void;
}

export function ChatList({
  chats,
  activeChatId,
  loading,
  currentUser,
  wsConnected,
  onSelectChat,
  onOpenSearch,
  onOpenProfile,
  onOpenAdmin,
}: ChatListProps) {
  const [filterText, setFilterText] = useState('');

  const filteredChats = chats.filter((c) => {
    const p = c.participant;
    const search = filterText.toLowerCase().trim();
    return (
      !search ||
      p.name.toLowerCase().includes(search) ||
      p.username.toLowerCase().includes(search) ||
      (c.lastMessage && c.lastMessage.text.toLowerCase().includes(search))
    );
  });

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800/80">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 p-1 -ml-1 cursor-pointer hover:opacity-80 transition min-w-0"
          >
            <div className="relative shrink-0">
              <img
                src={
                  currentUser.avatarUrl ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.username}`
                }
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
              {currentUser.badge === '1' && (
                <span
                  title="Подтвержден"
                  className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center border border-white dark:border-zinc-900"
                >
                  1
                </span>
              )}
            </div>
            <div className="min-w-0 pr-1">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                {currentUser.name}
                {currentUser.badge === '1' && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-bold px-1 rounded-sm">
                    1
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {currentUser.isAdmin && onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                title="Панель администратора"
                className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-full transition"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onOpenSearch}
              title="Найти собеседника"
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Local Filter Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
          />
        </div>
      </div>

      {/* Chat List Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ChatListSkeleton />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {filterText ? 'Ничего не найдено' : 'Нет чатов'}
            </p>
            {!filterText && (
              <button
                onClick={onOpenSearch}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-medium transition hover:opacity-90"
              >
                Поиск
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredChats.map((c) => {
              const isActive = c.id === activeChatId;
              const p = c.participant;
              const lm = c.lastMessage;
              const isOutgoing = lm?.senderId === currentUser.id;

              return (
                <button
                  key={c.id}
                  onClick={() => onSelectChat(c)}
                  className={`w-full flex items-center gap-3 p-3.5 sm:p-4 text-left transition ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800/90'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        p.avatarUrl ||
                        `https://api.dicebear.com/7.x/identicon/svg?seed=${p.username}`
                      }
                      alt={p.name}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                        p.status === 'online'
                          ? 'bg-emerald-500'
                          : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}
                    />
                    {p.badge === '1' && (
                      <span
                        title="Подтвержден"
                        className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center border border-white dark:border-zinc-900"
                      >
                        1
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                          {p.name}
                          {p.badge === '1' && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-bold px-1 rounded-sm">
                              1
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 shrink-0 font-mono">
                        {formatTimestamp(c.updatedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {isOutgoing && lm && (
                          <span className="shrink-0 text-zinc-400">
                            {lm.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                        <span className="truncate">
                          {lm
                            ? lm.mediaType === 'image'
                              ? `📷 ${lm.text || 'Фото'}`
                              : lm.mediaType === 'video'
                              ? `🎥 ${lm.text || 'Видео'}`
                              : lm.mediaType === 'file'
                              ? `📎 ${lm.fileName || lm.text || 'Файл'}`
                              : lm.text
                            : 'Создан'}
                        </span>
                      </div>

                      {c.unreadCount > 0 && (
                        <div className="w-2.5 h-2.5 bg-sky-500 rounded-full shrink-0 shadow-sm shadow-sky-500/20" title={`${c.unreadCount} новых`} />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
