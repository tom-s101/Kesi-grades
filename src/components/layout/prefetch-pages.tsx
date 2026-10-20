"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Connection = { saveData?: boolean; effectiveType?: string };

/**
 * Loads the other main pages in the background once the current one has
 * arrived, so tapping Attendance or Grades shows it straight away instead
 * of waiting on the server. Each is kept for the `staleTimes.static`
 * window in next.config.ts; saving anything clears them, so a teacher
 * never sees their own changes go missing.
 *
 * Done with `<Link prefetch>` rather than `router.prefetch()`: in this
 * version of Next.js the router call only fetches a dynamic page's outer
 * shell, while a Link with prefetch={true} fetches the whole page with its
 * data. Links are only prefetched while on screen, so these sit inside the
 * viewport but are invisible, take no clicks and are hidden from screen
 * readers — on a phone the real menu links are tucked away in the closed
 * drawer and would never be.
 *
 * Holds off on phones that have asked to save data or are on a very slow
 * connection — there it would compete with the page they're looking at.
 */
export function PrefetchPages({ hrefs }: { hrefs: string[] }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") return;

    // Wait for the phone to be idle, so this never slows the page that's
    // actually on screen.
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed bottom-0 left-0 h-px w-px opacity-0">
      {hrefs
        .filter((href) => pathname !== href && !pathname.startsWith(href + "/"))
        .map((href) => (
          // Each one a single pixel in the same spot: it has to count as
          // on screen to be prefetched, and must not be clipped away.
          <Link key={href} href={href} prefetch={true} tabIndex={-1} className="absolute inset-0 block h-px w-px" />
        ))}
    </div>
  );
}
