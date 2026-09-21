import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Sprout } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { openAccessEnabled } from "@/lib/testing-mode";

const SCHOOLS = [
  { name: "Agbalite", note: "Campus 1" },
  { name: "Binuangan", note: "Campus 2" },
  { name: "Pinagbayanan", note: "Campus 3" },
  { name: "Sulong Ipil", note: "Campus 4" },
  { name: "Baraas", note: "Campus 5" },
  { name: "Kaupawan", note: "Campus 6 · Grades 6–12" },
];

const STEPS = [
  {
    n: "01",
    title: "Teachers record what they already do",
    body: "Quiz scores, homework, exam results, and daily attendance — entered weekly from a phone, in raw scores or percentages, whichever is easier.",
  },
  {
    n: "02",
    title: "Grades compute themselves",
    body: "85% quarterly exam, 12% quizzes, 3% homework & participation — weighted automatically, every quarter, with DepEd-aligned remarks.",
  },
  {
    n: "03",
    title: "Admins see everything, instantly",
    body: "Filter by school, grade, teacher, or subject. Spot missing entries, attendance risks, and passing rates before report cards are due.",
  },
];

/**
 * The two doors into the app.
 *
 * Deliberately plain <a> elements, not next/link: tapping one is a real
 * browser navigation, so the phone shows its own loading indicator
 * while the dashboard renders. A client-side link into a heavy server
 * page looks like a dead button on a slow connection.
 */
function EntryChoice() {
  return (
    <div id="enter" className="mt-8 scroll-mt-24 rounded-2xl border border-border-strong bg-surface-raised/80 p-5 shadow-sm">
      <p className="font-display text-base font-medium text-text">Who&rsquo;s coming in?</p>
      <p className="mt-1 text-sm text-text-soft">
        Pick one to open the record book. You can switch at any time from the top bar.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href="/enter?as=teacher"
          className="group flex items-start gap-3 rounded-xl bg-brand p-4 text-left text-on-brand transition-colors hover:bg-brand-strong"
        >
          <GraduationCap size={20} className="mt-0.5 shrink-0 opacity-90" />
          <span className="flex-1">
            <span className="flex items-center gap-1.5 font-medium">
              I&rsquo;m a teacher
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-on-brand/75">
              Enter scores and attendance, and fix student details.
            </span>
          </span>
        </a>
        <a
          href="/enter?as=admin"
          className="group flex items-start gap-3 rounded-xl border border-border-strong bg-surface p-4 text-left text-text transition-colors hover:border-brand hover:bg-surface-sunken"
        >
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand" />
          <span className="flex-1">
            <span className="flex items-center gap-1.5 font-medium">
              I&rsquo;m an admin
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-text-soft">
              Rosters, classes, teachers, reports, and every campus.
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}

export default function MarketingHome() {
  // While the site is open for testing there's no login to send people
  // to — they pick a role instead and go straight in.
  const openAccess = openAccessEnabled();

  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/kesi-logo.jpg"
            alt="KESI logo"
            width={36}
            height={36}
            className="rounded-full"
          />
          <span className="font-display text-base font-medium tracking-tight text-text">
            Katutubo Excel Schools
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {openAccess ? (
            <a
              href="#enter"
              className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Enter
            </a>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
            >
              Staff Login
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grain">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-kesi-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-raised px-3 py-1 text-xs font-medium text-text-soft">
              <Sprout size={13} className="text-brand" /> Six campuses, one record book
            </span>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-text md:text-6xl">
              Grading and attendance,
              <br /> without the paperwork.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-text-soft">
              KESI replaces the quarter-end scramble of ledgers and spreadsheets with one
              DepEd-aligned system built for Agbalite, Binuangan, Pinagbayanan, Sulong&nbsp;Ipil,
              Baraas, and Kaupawan.
            </p>

            {openAccess ? (
              <EntryChoice />
            ) : (
              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-on-brand shadow-sm transition-colors hover:bg-brand-strong"
                >
                  Staff Login <ArrowRight size={16} />
                </Link>
              </div>
            )}

            <p className="mt-4 text-sm text-text-faint">
              SY 2026&ndash;2027 &middot; August 3 &ndash; May 21
            </p>
          </div>

          <div className="relative flex items-center justify-center">
            <div
              className="pointer-events-none absolute h-72 w-72 rounded-full bg-brand-soft/70 blur-2xl"
              aria-hidden
            />
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border border-border-strong bg-surface-raised p-6 shadow-xl shadow-black/5 md:h-80 md:w-80">
              <Image
                src="/brand/kesi-logo.jpg"
                alt="Katutubo Excel Schools logo — a sprout growing from an open book"
                width={280}
                height={280}
                priority
                className="h-full w-full rounded-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Schools */}
      <section className="border-y border-border bg-surface-sunken/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="font-display text-2xl font-medium text-text">The six campuses</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {SCHOOLS.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-brand"
              >
                <p className="text-xs uppercase tracking-wide text-text-faint">{s.note}</p>
                <p className="mt-1 font-display text-lg font-medium text-text">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-2xl font-medium text-text">How it works</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-display text-4xl text-brand-soft [-webkit-text-stroke:1.5px_var(--brand)] [color:transparent]">
                {s.n}
              </span>
              <h3 className="mt-3 font-display text-lg font-medium text-text">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-text-faint sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Katutubo Excel Schools</span>
          {openAccess ? (
            <a href="#enter" className="text-brand hover:underline">
              Enter the record book &rarr;
            </a>
          ) : (
            <Link href="/login" className="text-brand hover:underline">
              Staff Login &rarr;
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
