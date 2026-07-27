import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquarePlus, AtSign, User } from 'lucide-react';
import { api } from '../lib/api';
import { User as UserType } from '../types';
import { UserSearchSkeleton } from './skeletons/UserSearchSkeleton';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserType) => void;
}

export function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    // Trigger initial load or search on query change with debouncing
    const timer = setTimeout(() => {
      fetchUsers(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const fetchUsers = async (q: string) => {
    setLoading(true);
    try {
      // 500ms artificial delay to clearly demonstrate shimmer skeletons
      const res = await api.searchUsers(q, 500);
      setResults(res.users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по @username или имени..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 rounded-2xl text-sm focus:outline-none transition"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <UserSearchSkeleton />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center p-4 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                <AtSign className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {query ? 'Пользователи не найдены' : 'Введите @username для поиска'}
              </p>
              <p className="text-xs text-zinc-400 max-w-xs">
                Ищите других пользователей по их индивидуальному никнейму или имени
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {results.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="relative shrink-0">
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${u.username}`}
                        alt={u.name}
                        className="w-11 h-11 rounded-full object-cover bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${
                          u.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {u.name}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
                        {u.username}
                      </div>
                      {u.bio && (
                        <p className="text-xs text-zinc-400 truncate max-w-[200px] sm:max-w-xs mt-0.5">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className="shrink-0 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Написать</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
