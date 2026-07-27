export function ChatListSkeleton() {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 sm:p-4">
          {/* Avatar Skeleton */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-300 dark:bg-zinc-700" />
          </div>

          {/* Text Content Skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-md shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
