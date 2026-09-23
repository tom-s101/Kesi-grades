import { Skeleton } from "@/components/ui/loader";

/**
 * The fallback shown while any page under /(app) renders. It stands in
 * for the top bar too, so the header doesn't vanish and reappear on
 * every navigation.
 */
export default function AppLoading() {
  return (
    <div className="flex-1" aria-busy="true" aria-label="Loading">
      <div className="border-b border-border px-4 py-3 lg:px-8 lg:py-4">
        <Skeleton className="h-6 w-40 lg:h-7 lg:w-56" />
      </div>
      <div className="space-y-4 p-4 lg:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
