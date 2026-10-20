import { cn } from "@/lib/utils";

/**
 * Loading vocabulary for the app.
 *
 * Three pieces, used consistently: a `Skeleton` block that stands in
 * for content whose shape we know, a `Spinner` for a control that's
 * working, and the morphing squares (`PageLoader`, `LoadingOverlay`)
 * for a whole screen that has nothing to show yet. All CSS — no
 * JavaScript runs to animate them, which matters on the phones these
 * are actually used on.
 */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-kesi-shimmer rounded-md", className)}
      {...props}
    />
  );
}

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 10) }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent align-[-0.125em] opacity-70",
        className,
      )}
    />
  );
}

/**
 * Four squares wandering and changing shape — the loader from the camp
 * registration site, in KESI green. Keyframes in globals.css.
 */
export function MorphLoader({ className, size = 128 }: { className?: string; size?: number }) {
  // Drawn at 128px and scaled, so a small one moves exactly the same way;
  // the negative margin gives back the space the scaling frees up.
  const scale = size / 128;
  return (
    <div
      aria-hidden
      className={cn("relative flex h-32 w-32 shrink-0 items-center justify-center", className)}
      style={scale === 1 ? undefined : { transform: `scale(${scale})`, margin: -(128 - size) / 2 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("kesi-morph absolute h-5 w-5", i % 2 ? "bg-brand-strong" : "bg-brand")}
          style={{ animationName: `kesi-morph-${i}`, animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

/** A whole screen (or the content area) with nothing on it yet. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20" role="status" aria-live="polite">
      <MorphLoader />
      <p className="text-sm font-medium text-text-soft">{label}…</p>
    </div>
  );
}

/**
 * One part of a page that's still on its way — the rest of the page is
 * already showing. Used as a Suspense fallback, so a teacher sees what
 * has arrived and that more is coming.
 */
export function SectionLoader({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-1 py-10", className)}
    >
      <MorphLoader size={64} />
      <p className="text-xs font-medium text-text-faint">{label}…</p>
    </div>
  );
}

/**
 * Covers everything while something takes over the whole screen —
 * signing in, say. Same squares, on a veil over the page.
 */
export function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-surface/95 backdrop-blur-sm"
    >
      <MorphLoader />
      <p className="text-sm font-medium text-text">{label}</p>
    </div>
  );
}

/** Rows of shimmering placeholder lines, for a list whose length we don't know. */
export function SkeletonList({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
