"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function Sidebar({
  isHeadTeacher,
  isMasterAdmin,
  openAccess,
  schoolName,
  schoolYearLabel,
}: {
  isHeadTeacher: boolean;
  isMasterAdmin: boolean;
  /** No login to sign out of while the site is open for testing. */
  openAccess: boolean;
  schoolName?: string | null;
  schoolYearLabel?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isMasterAdmin;
    if (item.leadershipOnly) return isHeadTeacher || isMasterAdmin;
    return true;
  });

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            // A drawer left open would cover the page just asked for.
            onClick={() => setOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-text-soft hover:bg-surface-sunken hover:text-text",
            )}
          >
            {/* A rule at the edge, not just a tint — it reads as "you
                are here" at a glance in either theme. */}
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon size={17} strokeWidth={active ? 2.1 : 1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/brand/kesi-logo.jpg" alt="" width={28} height={28} className="rounded-full" />
          <span className="font-display text-sm font-medium tracking-tight text-text">KESI</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="-mr-1.5 rounded-lg p-1.5 text-text-soft transition-colors hover:bg-surface-sunken hover:text-text"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <aside
        className={cn(
          "z-30 w-64 shrink-0 border-border bg-surface-sunken/60",
          "lg:flex lg:flex-col lg:border-r lg:py-6",
          open ? "flex flex-col border-b py-3" : "hidden lg:flex",
        )}
      >
        <Link href="/dashboard" className="mb-7 hidden items-center gap-3 px-5 lg:flex">
          <Image
            src="/brand/kesi-logo.jpg"
            alt=""
            width={34}
            height={34}
            className="rounded-full ring-1 ring-border"
          />
          <span>
            <span className="block font-display text-sm font-medium leading-tight tracking-tight text-text">
              KESI
            </span>
            <span className="block text-[11px] leading-tight text-text-faint">Katutubo Excel Schools</span>
          </span>
        </Link>

        {nav}

        <div className="mt-auto space-y-1 px-3 pt-5">
          <p className="truncate px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
            {schoolName ?? "All campuses"}
          </p>
          {schoolYearLabel && (
            <p className="tabular px-3 text-[11px] text-text-faint">SY {schoolYearLabel}</p>
          )}
          {/* The loud banner across the top is gone, but leaving no
              trace at all would make it easy to ship this open. */}
          {openAccess && (
            <p className="flex items-center gap-1.5 px-3 pt-1 text-[11px] text-status-warn">
              <ShieldAlert size={12} className="shrink-0" />
              Open testing mode
            </p>
          )}
          {!openAccess && (
            <button
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-soft transition-colors hover:bg-status-bad-bg hover:text-status-bad"
            >
              <LogOut size={17} strokeWidth={1.75} /> Sign out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
