"use client";

import { useState } from "react";
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

/**
 * Reads the theme ThemeScript already stamped on <html> before hydration.
 * Only correct on the client — the lazy initializer runs during the
 * client's hydration render too, so no post-mount effect/setState is
 * needed. Server and client can legitimately disagree here (the server
 * has no window), so the rendered icon is wrapped with
 * suppressHydrationWarning below.
 */
function initialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const current = document.documentElement.getAttribute("data-theme") as Theme | null;
  if (current) return current;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
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
      <span suppressHydrationWarning>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</span>
    </button>
  );
}
