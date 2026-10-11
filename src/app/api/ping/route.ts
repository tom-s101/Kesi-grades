/**
 * Target of the keep-warm job (netlify/functions/keep-warm.mts). Does
 * nothing on purpose: being asked is what keeps the server awake.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "cache-control": "no-store" } });
}
