import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  X,
  FileText,
  Download,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Video,
  Palette,
  Paintbrush,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Chat, Message, User } from '../types';
import { MessageHistorySkeleton } from './skeletons/MessageHistorySkeleton';
import { api } from '../lib/api';

interface ChatWindowProps {
  chat: Chat;
  currentUser: User;
  messages: Message[];
  loadingMessages: boolean;
  isTyping: boolean;
  onBackMobile: () => void;
  onSendMessage: (
    text: string,
    media?: { mediaUrl: string; mediaType: 'image' | 'video' | 'file'; fileName?: string; fileSize?: string }
  ) => void;
  onTyping: (isTyping: boolean) => void;
  onLoadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  onEditMessage?: (messageId: string, text: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onPinMessage?: (chatId: string, messageId: string | null) => void;
  onSetChatBackground?: (chatId: string, bgPhotoUrl: string | null) => void;
}

export function ChatWindow({
  chat,
  currentUser,
  messages,
  loadingMessages,
  isTyping,
  onBackMobile,
  onSendMessage,
  onTyping,
  onLoadMoreMessages,
  hasMoreMessages,
  onEditMessage,
  onDeleteMessage,
  onDeleteChat,
  onPinMessage,
  onSetChatBackground,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    mediaUrl: string;
    mediaType: 'image' | 'video' | 'file';
    fileName: string;
    fileSize: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [bgInputUrl, setBgInputUrl] = useState('');
  const [bgTab, setBgTab] = useState<'colors' | 'photos' | 'custom'>('colors');
  const [customHexColor, setCustomHexColor] = useState('#1e1b4b');
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const participant = chat.participant;

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, selectedMedia]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Notify server about typing
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        const fileSizeFormatted =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} МБ`
            : `${Math.round(file.size / 1024)} КБ`;

        const res = await api.uploadFile({
          fileName: file.name,
          fileData,
          fileType: file.type,
          fileSize: fileSizeFormatted,
        });

        setSelectedMedia(res);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBgFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        if (onSetChatBackground) {
          onSetChatBackground(chat.id, fileData);
        }
        setBgModalOpen(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Wallpaper upload error:', err);
    } finally {
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !selectedMedia) return;

    onSendMessage(text, selectedMedia || undefined);
    setInputText('');
    setSelectedMedia(null);
    onTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !onEditMessage) return;
    onEditMessage(editingMessage.id, editingMessage.text);
    setEditingMessage(null);
    setActiveMessageMenuId(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  let currentDate = '';
  let currentGroup: Message[] = [];

  for (const msg of messages) {
    const dLabel = formatDateLabel(msg.createdAt);
    if (dLabel !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate, msgs: currentGroup });
      }
      currentDate = dLabel;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length > 0) {
    groupedMessages.push({ date: currentDate, msgs: currentGroup });
  }

  const pinnedMsg = chat.pinnedMessage;

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-950/50 relative transition-all">
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src={
                participant.avatarUrl ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${participant.username}`
              }
              alt={participant.name}
              className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                participant.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            />
            {participant.badge === '1' && (
              <span
                title="Подтвержден"
                className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center border border-white dark:border-zinc-900"
              >
                1
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                {participant.name}
                {participant.badge === '1' && (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-bold px-1 rounded-sm">
                    1
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
              {isTyping ? (
                <span className="text-sky-500 dark:text-sky-400 font-medium animate-pulse">
                  печатает...
                </span>
              ) : participant.status === 'online' ? (
                <span className="text-emerald-600 dark:text-emerald-400">в сети</span>
              ) : (
                <span>был(а) недавно</span>
              )}
            </p>
          </div>
        </div>

        {/* Chat Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showHeaderMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-30 text-xs">
              <button
                onClick={() => {
                  setShowHeaderMenu(false);
                  setShowDeleteChatConfirm(true);
                }}
                className="w-full px-3.5 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2 font-medium"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                Удалить чат
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pinned Message Bar */}
      {pinnedMsg && (
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3 z-10 shrink-0 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Pin className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-[11px] text-amber-600 dark:text-amber-400">
                Закрепленное сообщение
              </span>
              <p className="truncate text-zinc-700 dark:text-zinc-300">
                {pinnedMsg.text || (pinnedMsg.mediaUrl ? 'Медиа файл' : 'Сообщение')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onPinMessage && onPinMessage(chat.id, null)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
            title="Открепить"
          >
            <PinOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 z-10">
        {loadingMessages ? (
          <MessageHistorySkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md flex items-center justify-center">
              <Send className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Начните диалог с пользователем {participant.name}
            </p>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="text-center py-2">
                <button
                  onClick={onLoadMoreMessages}
                  className="px-3 py-1 bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 text-xs rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                >
                  Загрузить предыдущие сообщения
                </button>
              </div>
            )}

            {groupedMessages.map((group, idx) => (
              <div key={idx} className="space-y-3">
                {/* Date divider */}
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-md text-[11px] font-medium text-zinc-500 dark:text-zinc-400 rounded-full shadow-2xs">
                    {group.date}
                  </span>
                </div>

                {group.msgs.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;
                  const isMenuOpen = activeMessageMenuId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex items-end gap-1.5 ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isMine && (
                        <img
                          src={
                            participant.avatarUrl ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${participant.username}`
                          }
                          alt={participant.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                        />
                      )}

                      {/* Small dot action button on hover */}
                      <div className={`relative flex items-center ${isMine ? 'order-first' : 'order-last'}`}>
                        <button
                          onClick={() =>
                            setActiveMessageMenuId(isMenuOpen ? null : msg.id)
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full transition"
                        >
                          <span className="block w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-500 transition" />
                        </button>

                        {/* Message Action Context Menu */}
                        {isMenuOpen && (
                          <div
                            className={`absolute bottom-6 ${
                              isMine ? 'right-0' : 'left-0'
                            } w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-30 text-xs`}
                          >
                            {isMine && (
                              <button
                                onClick={() => {
                                  setEditingMessage({ id: msg.id, text: msg.text });
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                                Изменить
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (onPinMessage) {
                                  onPinMessage(
                                    chat.id,
                                    chat.pinnedMessage?.id === msg.id ? null : msg.id
                                  );
                                }
                                setActiveMessageMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
                            >
                              <Pin className="w-3.5 h-3.5 text-amber-500" />
                              {chat.pinnedMessage?.id === msg.id ? 'Открепить' : 'Закрепить'}
                            </button>

                            {(isMine || currentUser.isAdmin) && (
                              <button
                                onClick={() => {
                                  if (onDeleteMessage) onDeleteMessage(msg.id);
                                  setActiveMessageMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Удалить
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Bubble Container */}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-2.5 shadow-2xs space-y-1.5 ${
                          isMine
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-zinc-200/60 dark:border-zinc-700/60'
                        }`}
                      >
                        {/* Inline Edit Form */}
                        {editingMessage?.id === msg.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingMessage.text}
                              onChange={(e) =>
                                setEditingMessage({ ...editingMessage, text: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg focus:outline-none"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 text-[11px]">
                              <button
                                onClick={() => setEditingMessage(null)}
                                className="px-2 py-0.5 rounded text-zinc-400 hover:text-white dark:hover:text-black"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="px-2.5 py-0.5 bg-blue-600 text-white rounded font-medium"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Photos */}
                            {msg.mediaUrl && msg.mediaType === 'image' && (
                              <div className="overflow-hidden rounded-xl cursor-pointer max-w-sm">
                                <img
                                  src={msg.mediaUrl}
                                  alt={msg.fileName || 'Фотография'}
                                  onClick={() => setPreviewImageModal(msg.mediaUrl!)}
                                  className="w-full max-h-72 object-cover rounded-xl transition hover:opacity-95"
                                />
                              </div>
                            )}

                            {/* Videos */}
                            {msg.mediaUrl && msg.mediaType === 'video' && (
                              <div className="overflow-hidden rounded-xl max-w-sm">
                                <video
                                  src={msg.mediaUrl}
                                  controls
                                  className="w-full max-h-72 rounded-xl object-cover"
                                />
                              </div>
                            )}

                            {/* Files (APK, TXT, PDF, ZIP, etc.) */}
                            {msg.mediaUrl && msg.mediaType === 'file' && (
                              <a
                                href={msg.mediaUrl}
                                download={msg.fileName || 'file'}
                                className={`flex items-center gap-3 p-2.5 rounded-xl transition border ${
                                  isMine
                                    ? 'bg-zinc-800 dark:bg-zinc-200 border-zinc-700 dark:border-zinc-300'
                                    : 'bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600/50'
                                }`}
                              >
                                <div className="p-2 bg-zinc-700 dark:bg-zinc-300 rounded-lg text-white dark:text-zinc-900 shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">
                                    {msg.fileName || 'Документ'}
                                  </p>
                                  <p className="text-[10px] opacity-70 font-mono">
                                    {msg.fileSize || 'Файл'}
                                  </p>
                                </div>
                                <Download className="w-4 h-4 shrink-0 opacity-80" />
                              </a>
                            )}

                            {msg.text && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words px-1">
                                {msg.text}
                              </p>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] font-mono px-1 ${
                                isMine ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'
                              }`}
                            >
                              {msg.isEdited && <span className="italic opacity-80">изм.</span>}
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                <span className="shrink-0">
                                  {msg.status === 'read' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
                                  ) : msg.status === 'delivered' ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <img
                  src={
                    participant.avatarUrl ||
                    `https://api.dicebear.com/7.x/identicon/svg?seed=${participant.username}`
                  }
                  alt={participant.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 px-3.5 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Selected Media Preview Badge */}
      {selectedMedia && (
        <div className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {selectedMedia.mediaType === 'image' ? (
              <img
                src={selectedMedia.mediaUrl}
                alt="Предпросмотр"
                className="w-10 h-10 object-cover rounded-lg border shrink-0"
              />
            ) : selectedMedia.mediaType === 'video' ? (
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                <Video className="w-5 h-5 text-purple-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{selectedMedia.fileName}</p>
              <p className="text-[10px] text-zinc-400">{selectedMedia.fileSize}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedMedia(null)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*,.heic,.heif,.pdf,.doc,.docx,.txt,.zip,.rar,.apk,.xlsx,.pptx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={bgFileInputRef}
        accept="image/*"
        onChange={handleBgFileSelect}
        className="hidden"
      />

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0 z-20"
      >
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-transparent focus-within:border-zinc-300 dark:focus-within:border-zinc-700 transition">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shrink-0 disabled:opacity-50"
            title="Прикрепить"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={uploading ? 'Загрузка...' : 'Сообщение...'}
            disabled={uploading}
            className="flex-1 px-2 py-2 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedMedia) || uploading}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl transition disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>



      {/* Custom Delete Chat Confirmation Modal */}
      {showDeleteChatConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-950/60 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Удалить чат?</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Удалить переписку с <strong>{participant.name}</strong>?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowDeleteChatConfirm(false)}
                className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-200 font-medium text-xs rounded-xl transition"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowDeleteChatConfirm(false);
                  if (onDeleteChat) {
                    onDeleteChat(chat.id);
                  }
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 text-white p-2 hover:bg-white/20 rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageModal}
              alt="Просмотр"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
