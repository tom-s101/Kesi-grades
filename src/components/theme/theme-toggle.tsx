"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("kesi-theme", theme);
  } catch {
    /* private browsing / storage disabled — theme just won't persist */
  }
}

/** The theme showing right now: what ThemeScript stamped on <html>, else the OS preference. */
function currentTheme(): Theme {
  const stamped = document.documentElement.getAttribute("data-theme") as Theme | null;
  if (stamped) return stamped;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Both icons are always drawn and CSS shows the right one (see
 * .kesi-when-dark / .kesi-when-light in globals.css). The server can't
 * know a phone is in dark mode, so choosing the icon in React made the
 * server and the browser draw different things — a hydration error on
 * every dark-mode page load.
 */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-soft transition-colors hover:bg-surface-sunken hover:text-text",
        className,
      )}
    >
      <Sun size={16} className="kesi-when-dark" />
      <Moon size={16} className="kesi-when-light" />
    </button>
  );
}
