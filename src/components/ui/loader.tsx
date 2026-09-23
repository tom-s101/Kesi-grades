import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Loading vocabulary for the app.
 *
 * Three pieces, used consistently: a `Skeleton` block that stands in
 * for content whose shape we know, a `Spinner` for a control that's
 * working, and `PageLoader` for a whole screen that has nothing to
 * show yet. All CSS — no JavaScript runs to animate them, which
 * matters on the phones these are actually used on.
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

/** A whole screen with nothing on it yet — the KESI sprout, breathing. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
      <span className="relative flex h-14 w-14 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-kesi-pulse-ring rounded-full bg-brand-soft" />
        <span
          aria-hidden
          className="absolute inset-0 animate-kesi-pulse-ring rounded-full bg-brand-soft [animation-delay:0.9s]"
        />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised shadow-elev-1">
          <Sprout size={20} strokeWidth={1.75} className="animate-kesi-leaf text-brand" />
        </span>
      </span>
      <p className="text-sm text-text-faint">{label}…</p>
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
