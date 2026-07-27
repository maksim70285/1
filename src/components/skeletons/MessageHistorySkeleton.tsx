export function MessageHistorySkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Date badge skeleton */}
      <div className="flex justify-center my-2">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>

      {/* Incoming message 1 */}
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl rounded-bl-sm p-3.5 space-y-2 w-52">
          <div className="h-3.5 w-3/4 bg-zinc-300 dark:bg-zinc-700 rounded" />
          <div className="h-3.5 w-1/2 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
      </div>

      {/* Outgoing message 1 */}
      <div className="flex justify-end">
        <div className="bg-zinc-300 dark:bg-zinc-700 rounded-2xl rounded-br-sm p-3.5 space-y-2 w-48 max-w-[80%]">
          <div className="h-3.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-3.5 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>

      {/* Incoming message 2 */}
      <div className="flex items-end gap-2 max-w-[80%]">
        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="bg-zinc-200 dark:bg-zinc-800 rounded-2xl rounded-bl-sm p-3.5 space-y-2 w-64">
          <div className="h-3.5 w-5/6 bg-zinc-300 dark:bg-zinc-700 rounded" />
          <div className="h-3.5 w-1/3 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
      </div>

      {/* Outgoing message 2 */}
      <div className="flex justify-end">
        <div className="bg-zinc-300 dark:bg-zinc-700 rounded-2xl rounded-br-sm p-3.5 space-y-2 w-36 max-w-[80%]">
          <div className="h-3.5 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    </div>
  );
}
