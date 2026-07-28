import React, { useState, useEffect, useRef } from 'react';
import { X, User as UserIcon, AtSign, Check, LogOut, Camera, Palette, RotateCcw, Shield } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';
import { User as UserType } from '../types';
import { ProfileSkeleton } from './skeletons/ProfileSkeleton';

interface UserProfileModalProps {
  isOpen: boolean;
  currentUser: UserType;
  customBgColor: string;
  customTextColor: string;
  onBgColorChange: (color: string) => void;
  onTextColorChange: (color: string) => void;
  onResetColors: () => void;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserType) => void;
  onLogout: () => void;
  onOpenAdmin?: () => void;
}

export function UserProfileModal({
  isOpen,
  currentUser,
  customBgColor,
  customTextColor,
  onBgColorChange,
  onTextColorChange,
  onResetColors,
  onClose,
  onUserUpdated,
  onLogout,
  onOpenAdmin,
}: UserProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentUser.name);
    setUsername(currentUser.username);
    setAvatarUrl(currentUser.avatarUrl || '');
    setError(null);
    setSuccessMsg(null);
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const formattedUsername = username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`;
  const isUsernameValid = /^@[a-zA-Z0-9_]{3,20}$/.test(formattedUsername);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) {
      setError('Некорректный формат @username (буквы, цифры, от 3 символов)');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.updateProfile({
        name,
        username: formattedUsername,
        avatarUrl,
      });
      onUserUpdated(res.user);
      setSuccessMsg('Профиль успешно обновлен!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const bgSwatches = ['#ffffff', '#f4f4f5', '#09090b', '#0f172a', '#1e1b4b', '#14532d', '#701a75'];
  const textSwatches = ['#09090b', '#ffffff', '#38bdf8', '#f43f5e', '#a855f7', '#22c55e', '#eab308'];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Настройки</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <ProfileSkeleton />
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              {/* Avatar Section */}
              <div className="flex flex-col items-center text-center space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden shadow-sm hover:border-zinc-500 transition"
                >
                  <img
                    src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`}
                    alt="Аватар"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-medium">
                    <Camera className="w-5 h-5 mb-0.5" />
                    Изменить
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
                >
                  Загрузить
                </button>
              </div>

              {error && (
                <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Сохранено!</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Логин
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Theme & Color Customization */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <Palette className="w-4 h-4 text-purple-500" />
                    <span>Тема</span>
                  </div>
                  {(customBgColor || customTextColor) && (
                    <button
                      type="button"
                      onClick={onResetColors}
                      className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Сброс
                    </button>
                  )}
                </div>

                {/* Background Color Picker */}
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Фон
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm">
                      <input
                        type="color"
                        value={customBgColor || '#f4f4f5'}
                        onChange={(e) => onBgColorChange(e.target.value)}
                        className="absolute inset-0 w-12 h-12 -top-1 -left-1 cursor-pointer border-0"
                        title="Цвет"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {bgSwatches.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => onBgColorChange(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border transition ${
                            customBgColor === color ? 'ring-2 ring-purple-500 scale-110' : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text Color Picker */}
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Текст
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm">
                      <input
                        type="color"
                        value={customTextColor || '#09090b'}
                        onChange={(e) => onTextColorChange(e.target.value)}
                        className="absolute inset-0 w-12 h-12 -top-1 -left-1 cursor-pointer border-0"
                        title="Цвет"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {textSwatches.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => onTextColorChange(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border transition ${
                            customTextColor === color ? 'ring-2 ring-purple-500 scale-110' : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={saving || !isUsernameValid}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>

              {/* Admin Panel Button if admin */}
              {currentUser.isAdmin && onOpenAdmin && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Админка</span>
                  </button>
                </div>
              )}

              {/* Logout Button */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthToken(null);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Выход</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
