/**
 * Keeps the site's server awake.
 *
 * Netlify puts the server to sleep after a few minutes with no visitors,
 * and the next teacher to open the site then waits several extra
 * seconds while it starts up again. Touching it every five minutes
 * means there's almost always one already running.
 *
 * Costs about 9,000 function calls a month, well inside the free
 * allowance. Netlify runs it on the schedule below by itself; nothing
 * to set up.
 */
declare const Netlify: { env: { get(name: string): string | undefined } } | undefined;

export default async function keepWarm() {
  const site =
    (typeof Netlify !== "undefined" ? Netlify.env.get("URL") : undefined) ?? process.env.URL;
  if (!site) return new Response("no site URL", { status: 500 });

  const res = await fetch(new URL("/api/ping", site), { cache: "no-store" });
  return new Response(`ping ${res.status}`);
}

export const config = { schedule: "*/5 * * * *" };
