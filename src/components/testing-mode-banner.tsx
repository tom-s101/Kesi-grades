import { TriangleAlert } from "lucide-react";

/** Shown on every page while DISABLE_AUTH=true so nobody forgets it's on. */
export function TestingModeBanner() {
  if (process.env.DISABLE_AUTH !== "true") return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-status-warn-bg px-4 py-2 text-center text-xs font-medium text-status-warn">
      <TriangleAlert size={14} />
      Testing mode — sign-in is disabled and everyone sees every school&rsquo;s data. Set DISABLE_AUTH=false before real students&rsquo; data goes in.
    </div>
  );
}
