import { Skeleton } from "@/components/ui/loader";

/**
 * Shared fallback for the two data-entry screens, which have the same
 * shape: a bar of pickers, then a row per student.
 */
export function EntryLoading({ title }: { title: string }) {
  return (
    <div className="flex-1" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
      <div className="border-b border-border px-4 py-3 lg:px-8 lg:py-4">
        <Skeleton className="h-6 w-28 lg:h-7 lg:w-36" />
      </div>
      <div className="space-y-4 p-4 lg:p-8">
        <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-3 shadow-elev-1 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 rounded-lg sm:h-10" />
            ))}
          </div>
          <Skeleton className="h-8 w-56 rounded-full" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl sm:h-12" />
          ))}
        </div>
      </div>
    </div>
  );
}
