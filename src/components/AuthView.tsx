import React, { useState, useRef } from 'react';
import { AtSign, Lock, UserCheck, ArrowRight, Camera, Upload } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';
import { User as UserType } from '../types';

interface AuthViewProps {
  onSuccess: (user: UserType) => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAvatarUrl, setRegAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Live username validation feedback
  const formattedRegUsername = regUsername.trim()
    ? regUsername.trim().startsWith('@')
      ? regUsername.trim()
      : `@${regUsername.trim()}`
    : '';

  const isUsernameValid = formattedRegUsername.length >= 3 && /^@[a-zA-Z0-9_]{3,20}$/.test(formattedRegUsername);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setRegAvatarUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !loginPassword) {
      setError('Заполните @username и пароль');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ login: loginInput, password: loginPassword });
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regUsername || !regPassword) {
      setError('Заполните все обязательные поля');
      return;
    }
    if (!isUsernameValid) {
      setError('Имя пользователя должно быть формата @username (буквы, цифры, от 3 символов)');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        name: regName,
        username: formattedRegUsername,
        password: regPassword,
        ...(regAvatarUrl ? { avatarUrl: regAvatarUrl } : {}),
      });
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center p-4 sm:p-6 md:p-8">
      {/* Header - Single 1 */}
      <div className="max-w-md mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-3xl font-extrabold shadow-md">
          1
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Регистрация
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 text-xs sm:text-sm rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  @username
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="@username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Вход...' : 'Войти'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Avatar Selector from Gallery */}
              <div className="flex flex-col items-center justify-center space-y-2 pb-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden hover:border-zinc-500 transition"
                >
                  {regAvatarUrl ? (
                    <img src={regAvatarUrl} alt="Аватар" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200">
                      <Camera className="w-6 h-6 mb-0.5" />
                      <span className="text-[10px]">Фото</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-medium">
                    Выбрать
                  </div>
                </button>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {regAvatarUrl ? 'Аватар выбран' : 'Выберите аватар из галереи'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Имя
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ваше имя"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    @username <span className="text-red-500">*</span>
                  </label>
                  {regUsername.trim() && (
                    <span
                      className={`text-[11px] ${
                        isUsernameValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}
                    >
                      {isUsernameValid ? 'Допустим' : 'Мин. 3 символа'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="@username"
                    required
                    className={`w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                      regUsername.trim()
                        ? isUsernameValid
                          ? 'border-emerald-300 dark:border-emerald-800 focus:ring-emerald-500'
                          : 'border-amber-300 dark:border-amber-800 focus:ring-amber-500'
                        : 'border-zinc-200 dark:border-zinc-700/60 focus:ring-zinc-900'
                    }`}
                  />
                </div>
                {formattedRegUsername && (
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Ваш адрес: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{formattedRegUsername}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isUsernameValid}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Зарегистрироваться'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
