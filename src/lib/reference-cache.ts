import "server-only";
import { cache } from "react";

/**
 * Two layers of caching for the tables that never change during a
 * session — schools, grade levels, subjects, the school year and its
 * quarters.
 *
 * Before this, every page paid for them again, and several paid twice
 * (the top bar and the page body each asked independently). On a phone
 * talking to Singapore that's a few hundred milliseconds of pure
 * round-trip per navigation, which is most of why changing a filter
 * felt slow.
 *
 * `cache()` from React collapses repeats inside one render. The TTL map
 * below survives between requests on a warm server instance. Only use
 * it for rows that are identical for every user: all five reference
 * tables are readable by any signed-in person with no per-user
 * filtering (see 0004_rls.sql), so there's nothing to leak.
 */

type Entry = { expires: number; value: unknown };

const store = new Map<string, Entry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function cacheReference<T>(key: string, load: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): () => Promise<T> {
  // The React cache() wrapper has to sit outside, so repeat calls in
  // one render share a single in-flight promise even on a cold entry.
  return cache(async () => {
    const hit = store.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;

    const value = await load();
    store.set(key, { expires: Date.now() + ttlMs, value });
    return value;
  });
}

/** Drops cached reference data after something edits it. */
export function clearReferenceCache(key?: string) {
  if (key) store.delete(key);
  else store.clear();
}
