export function UserSearchSkeleton() {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between p-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
            </div>
          </div>
          <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
