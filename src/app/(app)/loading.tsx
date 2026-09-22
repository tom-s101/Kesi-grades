/**
 * Shown while a page under /(app) renders on the server. Without this,
 * tapping a nav item on a phone leaves the old screen up with no sign
 * anything is happening, which reads as a dead button.
 */
export default function AppLoading() {
  return (
    <div className="flex-1 animate-pulse space-y-5 p-4 lg:p-8" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded-lg bg-surface-sunken" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface-raised" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-surface-raised" />
    </div>
  );
}
