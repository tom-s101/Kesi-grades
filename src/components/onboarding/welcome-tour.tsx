"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MorphLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";
import { markTourDone } from "@/app/(app)/tour-actions";
import { buildTourSteps, type TourAudience } from "@/components/onboarding/tour-steps";
import { START_TOUR_EVENT } from "@/components/onboarding/tour-events";

/** Space around the highlighted part, between it and the card, and from the screen edge. */
const PAD = 8;
const GAP = 16;
const EDGE = 12;
const CARD_MAX_WIDTH = 384;
/** Below this width the menu lives behind ☰ (the sidebar's lg breakpoint). */
const COMPACT_QUERY = "(max-width: 1023.98px)";
/** How long to wait for a page and its part to appear before showing the step centred. */
const FIND_TIMEOUT_MS = 5000;
/** …or this long, while the page is visibly still loading. */
const SLOW_PAGE_TIMEOUT_MS = 15000;

type Box = { x: number; y: number; w: number; h: number };
type Placement = "below" | "above" | "right" | "left" | "pinned" | "center";

const onRoute = (pathname: string, route: string) => pathname === route || pathname.startsWith(route + "/");
const doneKey = (teacherId: string) => `kesi-tour-done:${teacherId}`;

/**
 * The welcome tour: a spotlight on one part of the page at a time and a
 * card beside it, pointing at it, saying what it's for — walking from
 * page to page (it opens each one itself) through the things a teacher
 * does every day. Next / Back / Skip, the arrow keys and Esc all work.
 *
 * Starts by itself the first time someone signs in (after the
 * change-password offer, if that's showing), and from "Take the tour"
 * in the menu any time after.
 */
export function WelcomeTour({
  audience,
  teacherId,
  autoStart,
}: {
  audience: TourAudience;
  teacherId: string;
  /** "unknown" when the account can't say (migration 0017 not run): the browser's own note decides. */
  autoStart: "yes" | "no" | "unknown";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => buildTourSteps(audience), [audience]);

  const [index, setIndex] = useState<number | null>(null);
  // What each step points at, once found — or that it couldn't be.
  // Keyed by step, so moving on needs no clearing up.
  const [found, setFound] = useState<{ key: string; el: Element } | null>(null);
  const [missed, setMissed] = useState<string | null>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [compact, setCompact] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const active = index !== null;
  const step = active ? steps[index] : null;
  const isLast = active && index === steps.length - 1;

  // --- Starting -------------------------------------------------------

  useEffect(() => {
    const start = () => setIndex(0);
    window.addEventListener(START_TOUR_EVENT, start);

    let poll: ReturnType<typeof setInterval> | undefined;
    let seenBefore = false;
    try {
      seenBefore = localStorage.getItem(doneKey(teacherId)) === "1";
    } catch {
      // Private browsing: the account's own record still decides.
    }
    const shouldStart = autoStart === "yes" || (autoStart === "unknown" && !seenBefore);
    if (shouldStart && !(autoStart === "yes" && seenBefore)) {
      // Wait for the change-password offer (or anything else that asks
      // to go first) to close, then begin.
      poll = setInterval(() => {
        if (document.querySelector("[data-blocks-tour]") || document.visibilityState !== "visible") return;
        clearInterval(poll);
        setIndex(0);
      }, 700);
    }
    return () => {
      window.removeEventListener(START_TOUR_EVENT, start);
      if (poll) clearInterval(poll);
    };
  }, [autoStart, teacherId]);

  // --- Screen size ----------------------------------------------------

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const update = () => {
      setCompact(mq.matches);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // --- Each step: open its page, then find what it points at ----------

  const targetName = step ? (compact && step.compactTarget) || step.target : undefined;
  const stepKey = step ? `${step.id}:${targetName ?? ""}` : "";
  const needsRoute = !!step?.route && !onRoute(pathname, step.route);
  const target = found && found.key === stepKey ? found.el : null;
  const searching = !!step && (needsRoute || (!!targetName && !target && missed !== stepKey));

  useEffect(() => {
    if (!step) return;
    if (needsRoute) {
      router.push(step.route!);
      return; // Runs again once the page has changed.
    }
    if (!targetName) return;

    const started = Date.now();
    const look = setInterval(() => {
      const el = document.querySelector(`[data-tour="${targetName}"]`);
      if (el && el.getClientRects().length > 0) {
        clearInterval(look);
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        setFound({ key: stepKey, el });
      } else if (
        Date.now() - started > FIND_TIMEOUT_MS &&
        // A page still showing its loader gets longer: it's on its way.
        !(document.querySelector("[role=status]:not([data-tour-loader])") && Date.now() - started < SLOW_PAGE_TIMEOUT_MS)
      ) {
        // Not on this page for this person (a teacher with no classes
        // yet, say): show the step centred rather than get stuck.
        clearInterval(look);
        setMissed(stepKey);
      }
    }, 120);
    return () => clearInterval(look);
  }, [step, targetName, stepKey, needsRoute, router]);

  // Follow the target as the page scrolls, resizes or settles.
  useEffect(() => {
    if (!target) return;
    let frame = 0;
    let last = "";
    const track = () => {
      const r = target.getBoundingClientRect();
      const key = `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}`;
      if (key !== last) {
        last = key;
        setRect({ x: r.left, y: r.top, w: r.width, h: r.height });
      }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [target]);

  // The card's real height, for placing it above or below its target.
  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [stepKey, searching, compact, viewport.w]);

  // --- Moving through ---------------------------------------------------

  const finish = useCallback(
    (completed: boolean) => {
      setIndex(null);
      try {
        localStorage.setItem(doneKey(teacherId), "1");
      } catch {
        // Fine — the account remembers.
      }
      void markTourDone().catch(() => undefined);
      if (completed && !onRoute(pathname, "/dashboard")) router.push("/dashboard");
    },
    [teacherId, pathname, router],
  );

  const next = useCallback(() => {
    if (index === null) return;
    if (index >= steps.length - 1) finish(true);
    else setIndex(index + 1);
  }, [index, steps.length, finish]);

  const back = useCallback(() => {
    if (index !== null && index > 0) setIndex(index - 1);
  }, [index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, back, finish]);

  useEffect(() => {
    if (active && !searching) nextRef.current?.focus({ preventScroll: true });
  }, [active, index, searching]);

  if (!active || !step || viewport.w === 0) return null;

  // --- Where everything goes --------------------------------------------

  const width = Math.min(CARD_MAX_WIDTH, viewport.w - EDGE * 2);
  const height = cardHeight || 220;

  // The spotlight, kept on screen even for parts taller than it.
  const spot: Box | null = target && rect
    ? (() => {
        const x = Math.max(rect.x - PAD, 4);
        const y = Math.max(rect.y - PAD, 4);
        const right = Math.min(rect.x + rect.w + PAD, viewport.w - 4);
        const bottom = Math.min(rect.y + rect.h + PAD, viewport.h - 4);
        return { x, y, w: Math.max(right - x, 0), h: Math.max(bottom - y, 0) };
      })()
    : null;

  let placement: Placement = "center";
  let left = (viewport.w - width) / 2;
  let top = (viewport.h - height) / 2;
  let arrow = 0;

  if (spot) {
    const clampX = (v: number) => Math.min(Math.max(v, EDGE), viewport.w - width - EDGE);
    const clampY = (v: number) => Math.min(Math.max(v, EDGE), viewport.h - height - EDGE);
    const below = viewport.h - (spot.y + spot.h) - GAP - EDGE;
    const above = spot.y - GAP - EDGE;
    const rightRoom = viewport.w - (spot.x + spot.w) - GAP - EDGE;
    const leftRoom = spot.x - GAP - EDGE;

    if (height <= below) {
      placement = "below";
      top = spot.y + spot.h + GAP;
      left = clampX(spot.x + spot.w / 2 - width / 2);
    } else if (height <= above) {
      placement = "above";
      top = spot.y - GAP - height;
      left = clampX(spot.x + spot.w / 2 - width / 2);
    } else if (width <= rightRoom) {
      placement = "right";
      left = spot.x + spot.w + GAP;
      top = clampY(spot.y + spot.h / 2 - height / 2);
    } else if (width <= leftRoom) {
      placement = "left";
      left = spot.x - GAP - width;
      top = clampY(spot.y + spot.h / 2 - height / 2);
    } else {
      // Taller than the screen allows (a whole grade sheet): the card
      // sits at the foot of the screen over it.
      placement = "pinned";
      top = viewport.h - height - EDGE;
      left = clampX(spot.x + spot.w / 2 - width / 2);
    }

    if (placement === "below" || placement === "above") {
      arrow = Math.min(Math.max(spot.x + spot.w / 2 - left, 22), width - 22);
    } else if (placement === "right" || placement === "left") {
      arrow = Math.min(Math.max(spot.y + spot.h / 2 - top, 22), height - 22);
    }
  }

  const Icon = step.icon;
  const body = (compact && step.compactBody) || step.body;
  const total = steps.length;
  const first = index === 0;

  return createPortal(
    <>
      {/* Taps outside the card do nothing: the tour leads, one step at a time. */}
      <div className="fixed inset-0 z-[60]" aria-hidden />

      {spot && !searching ? (
        <div
          aria-hidden
          className="kesi-tour-spotlight pointer-events-none fixed z-[61] rounded-xl"
          style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }}
        />
      ) : (
        <div aria-hidden className="kesi-tour-scrim pointer-events-none fixed inset-0 z-[61]" />
      )}

      {searching ? (
        <div className="fixed inset-0 z-[62] flex items-center justify-center" role="status" aria-live="polite" data-tour-loader>
          <MorphLoader size={72} />
          <span className="sr-only">Opening the next page…</span>
        </div>
      ) : (
        <div
          key={step.id}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kesi-tour-title"
          aria-describedby="kesi-tour-body"
          className="kesi-tour-card fixed z-[62] rounded-2xl border border-border bg-surface-raised p-5 shadow-elev-3"
          style={{ left, top, width }}
        >
          {(placement === "below" || placement === "above") && (
            <span
              aria-hidden
              className={cn(
                "absolute h-3.5 w-3.5 rotate-45 border-border bg-surface-raised",
                placement === "below" ? "-top-[7px] border-l border-t" : "-bottom-[7px] border-b border-r",
              )}
              style={{ left: arrow - 7 }}
            />
          )}
          {(placement === "right" || placement === "left") && (
            <span
              aria-hidden
              className={cn(
                "absolute h-3.5 w-3.5 rotate-45 border-border bg-surface-raised",
                placement === "right" ? "-left-[7px] border-b border-l" : "-right-[7px] border-r border-t",
              )}
              style={{ top: arrow - 7 }}
            />
          )}

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon size={18} strokeWidth={1.9} />
            </span>
            <span className="tabular text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              {first ? "Welcome" : `Step ${index} of ${total - 1}`}
            </span>
            <button
              type="button"
              onClick={() => finish(false)}
              aria-label="Close the tour"
              className="-mr-1.5 -mt-1 ml-auto rounded-lg p-1.5 text-text-faint transition-colors hover:bg-surface-sunken hover:text-text"
            >
              <X size={16} />
            </button>
          </div>

          <h2 id="kesi-tour-title" className="mt-3 font-display text-lg font-medium leading-snug tracking-tight text-text">
            {step.title}
          </h2>
          <p id="kesi-tour-body" className="mt-1.5 text-sm leading-relaxed text-text-soft">
            {body}
          </p>

          {!first && (
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-300"
                style={{ width: `${(index / (total - 1)) * 100}%` }}
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={() => finish(false)}
                className="mr-auto rounded-lg px-1 py-2 text-sm font-medium text-text-faint transition-colors hover:text-text"
              >
                {first ? "Skip for now" : "Skip tour"}
              </button>
            )}
            {isLast && <span className="mr-auto" />}
            {!first && !isLast && (
              <Button type="button" variant="secondary" size="sm" onClick={back} className="h-9 px-3" aria-label="Back">
                <ArrowLeft size={15} />
              </Button>
            )}
            <Button ref={nextRef} type="button" size="sm" onClick={next} className="h-9 px-4">
              {first ? (
                <>
                  Show me around <ArrowRight size={15} />
                </>
              ) : isLast ? (
                <>
                  <Check size={15} /> Finish
                </>
              ) : (
                <>
                  Next <ArrowRight size={15} />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
