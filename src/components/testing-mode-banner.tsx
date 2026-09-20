import { TriangleAlert } from "lucide-react";
import { openAccessEnabled } from "@/lib/testing-mode";

/** Shown on every page while the site is open, so nobody forgets. */
export function TestingModeBanner() {
  if (!openAccessEnabled()) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-status-warn-bg px-4 py-2 text-center text-xs font-medium text-status-warn">
      <TriangleAlert size={14} className="shrink-0" />
      Open testing mode — no sign-in, and anyone with the link can see and edit every school&rsquo;s data. Set
      REQUIRE_LOGIN=true before real student records go in.
    </div>
  );
}
