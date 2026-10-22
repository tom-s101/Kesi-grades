-- =====================================================================
-- Welcome tour.
--
-- The guided tour runs once, the first time a teacher signs in, and is
-- remembered on their account rather than one phone or browser — so
-- finishing (or skipping) it on one device means it doesn't greet them
-- again on another. "Take the tour" in the menu replays it any time.
--
-- Safe to re-run.
-- =====================================================================

alter table teachers add column if not exists tour_completed_at timestamptz;
