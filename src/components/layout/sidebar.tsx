"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Sidebar({
  isHeadTeacher,
  isMasterAdmin,
}: {
  isHeadTeacher: boolean;
  isMasterAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isMasterAdmin;
    if (item.leadershipOnly) return isHeadTeacher || isMasterAdmin;
    return true;
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand-strong"
                : "text-text-soft hover:bg-surface-sunken hover:text-text",
            )}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/brand/kesi-logo.jpg" alt="KESI" width={28} height={28} className="rounded-full" />
          <span className="font-display text-sm font-medium text-text">KESI</span>
        </Link>
        <button onClick={() => setOpen((o) => !o)} className="text-text-soft">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <aside
        className={cn(
          "z-40 w-64 shrink-0 border-r border-border bg-surface-raised",
          "lg:flex lg:flex-col lg:py-6",
          open ? "flex flex-col py-4" : "hidden lg:flex",
        )}
      >
        <Link href="/dashboard" className="mb-6 hidden items-center gap-2.5 px-5 lg:flex">
          <Image src="/brand/kesi-logo.jpg" alt="KESI" width={32} height={32} className="rounded-full" />
          <div>
            <p className="font-display text-sm font-medium leading-tight text-text">KESI</p>
            <p className="text-[11px] text-text-faint">Katutubo Excel Schools</p>
          </div>
        </Link>
        {nav}
        <div className="mt-auto px-3 pt-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-text-soft transition-colors hover:bg-status-bad-bg hover:text-status-bad"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
