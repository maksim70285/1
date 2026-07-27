import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Trash2,
  CheckCircle2,
  UserX,
  AlertTriangle,
  Terminal,
  Server,
  RefreshCw,
  Copy,
  Check,
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export function AdminModal({ isOpen, onClose, onRefreshData }: AdminModalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'wipe' | 'vds'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const verifiedCount = users.filter((u) => u.badge === '1').length;

  const handleToggleBadge = async (userId: string, currentBadge?: string) => {
    try {
      const newBadge = currentBadge ? null : '1';
      await api.setAdminBadge(userId, newBadge);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, badge: newBadge || undefined } : u))
      );
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Не удалось обновить значок пользователя');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить аккаунт ${userName}? Это действие необратимо.`)) {
      return;
    }
    try {
      await api.deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMsg(`Пользователь ${userName} успешно удален`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления пользователя');
    }
  };

  const handleWipeMessenger = async () => {
    if (
      !confirm(
        'ВНИМАНИЕ! Вы собираетесь полностью очистить мессенджер! Все сообщения, переписки и обычные аккаунты будут удалены. Продолжить?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await api.wipeMessenger();
      alert('Мессенджер успешно очищен');
      onClose();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Ошибка очистки мессенджера');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const debianGuideContent = `# Полное руководство по деплою мессенджера на VDS (Debian 13)

## 1. Обновление системы и установка зависимостей
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx ufw

## 2. Установка Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

## 3. Загрузка и сборка проекта
sudo mkdir -p /var/www/messenger
sudo chown -R $USER:$USER /var/www/messenger
git clone https://github.org/your-username/messenger.git /var/www/messenger
cd /var/www/messenger
npm install
npm run build

## 4. Настройка фоновой службы (Systemd)
Создайте файл /etc/systemd/system/messenger.service:

[Unit]
Description=Messenger Node.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/messenger
ExecStart=/usr/bin/npm run start
Restart=always
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target

Запустите службу:
sudo systemctl daemon-reload
sudo systemctl enable messenger
sudo systemctl start messenger

## 5. Настройка Nginx Reverse Proxy и WebSockets
Отредактируйте /etc/nginx/sites-available/default:

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

Проверьте и перезапустите Nginx:
sudo nginx -t
sudo systemctl reload nginx

## 6. Получение бесплатного SSL-сертификата (HTTPS / WSS)
sudo certbot --nginx -d yourdomain.com

## 7. Настройка Фаервола (UFW)
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                Дашборд Администратора
                <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono font-medium">
                  @admin
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Логин: <code className="font-mono font-semibold">@admin</code> | Пароль:{' '}
                <code className="font-mono font-semibold">admin</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 pt-2 gap-1 sm:gap-2 shrink-0 bg-white dark:bg-zinc-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-500" />
            Дашборд & Инструкция
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" />
            Пользователи & Значки (1) ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('wipe')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'wipe'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Очистка мессенджера
          </button>

          <button
            onClick={() => setActiveTab('vds')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'vds'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-500" />
            Деплой на VDS
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center justify-between">
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
                    <Users className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Всего</span>
                  </div>
                  <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                    {users.length}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Пользователей</p>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <Award className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Значки</span>
                  </div>
                  <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                    {verifiedCount}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Верифицировано (1)</p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Статус</span>
                  </div>
                  <div className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                    Активен
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Режим контроля</p>
                </div>
              </div>

              {/* Comprehensive Instruction Block */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Инструкция Администратора Мессенджера
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      1. Вход и Права Суперадмина
                    </h4>
                    <p>
                      Вы вошли как главный администратор (<code className="font-mono text-purple-600 dark:text-purple-400">@admin</code>).
                      Вам доступны исключительные полномочия: от выдачи значков верификации «1» до полной очистки данных.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-500" />
                      2. Выдача и Отзыв Значков Верификации («1»)
                    </h4>
                    <p>
                      Перейдите на вкладку <strong>«Пользователи & Значки»</strong>. Нажмите кнопку <strong>«Выдать 1»</strong> напротив любого аккаунта.
                      У пользователя на аватарке и рядом с именем сразу же появится зелёный бейдж <span className="font-bold text-emerald-600">1</span>.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      3. Модерация и Очистка Сообщений
                    </h4>
                    <p>
                      Администратор имеет возможность редактировать или удалять любые сообщения в любом диалоге, а также удалять спам-аккаунты и нежелательные переписки в 1 клик.
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-1">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      4. Полная Сброс / Очистка
                    </h4>
                    <p>
                      Вкладка <strong>«Очистка мессенджера»</strong> позволяет полностью очистить историю диалогов, при этом учетная запись администратора сохраняется.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Управляйте пользователями, выдавайте значки верификации (цифра 1) или удаляйте профили:
                </span>
                <button
                  onClick={loadUsers}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Обновить список"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`
                          }
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                        {u.badge === '1' && (
                          <span
                            title="Подтвержден (1)"
                            className="absolute -top-1 -right-1 bg-emerald-500 text-white w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center border border-white dark:border-zinc-900 shadow-xs"
                          >
                            1
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-semibold truncate">{u.name}</h4>
                          {u.isAdmin && (
                            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 font-semibold px-1.5 py-0.2 rounded-md">
                              Админ
                            </span>
                          )}
                          {u.badge === '1' && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md">
                              Галочка 1
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono truncate">{u.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleBadge(u.id, u.badge)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1 ${
                          u.badge === '1'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {u.badge === '1' ? 'Забрать 1' : 'Выдать 1'}
                      </button>

                      {!u.isAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                          title="Удалить аккаунт"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wipe' && (
            <div className="space-y-4 border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400">
                    Полная очистка всей базы мессенджера
                  </h3>
                  <p className="text-xs text-red-600/90 dark:text-red-300/80 leading-relaxed">
                    Данное действие немедленно удалит все существующие диалоги, текстовые и медиа
                    сообщения, а также все зарегистрированные обычные аккаунты пользователей. Аккаунт
                    администратора останется активным.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleWipeMessenger}
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Полностью очистить мессенджер
                </button>
              </div>
            </div>
          )}

          {activeTab === 'vds' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  <span>Пошаговая инструкция по деплою на VDS (Debian 13)</span>
                </div>
                <button
                  onClick={() => copyToClipboard(debianGuideContent, 'vds-guide')}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200"
                >
                  {copiedSection === 'vds-guide' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Скопировано!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Скопировать инструкцию
                    </>
                  )}
                </button>
              </div>

              <div className="bg-zinc-900 text-zinc-100 font-mono text-[11px] p-4 rounded-xl overflow-x-auto leading-relaxed border border-zinc-800 max-h-96">
                <pre>{debianGuideContent}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
