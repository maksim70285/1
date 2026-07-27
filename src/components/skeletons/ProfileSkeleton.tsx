export function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-md mx-auto">
      {/* Avatar Header */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
