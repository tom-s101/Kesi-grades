import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { openAccessEnabled } from "@/lib/testing-mode";

const SCHOOLS = [
  { name: "Agbalite", note: "Campus 1" },
  { name: "Binuangan", note: "Campus 2" },
  { name: "Pinagbayanan", note: "Campus 3" },
  { name: "Sulong Ipil", note: "Campus 4" },
  { name: "Baraas", note: "Campus 5" },
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

export default function MarketingHome() {
  // While the site is open for testing there's no login to send people
  // to — the dashboard is the front door.
  const openAccess = openAccessEnabled();
  const entryHref = openAccess ? "/dashboard" : "/login";
  const entryLabel = openAccess ? "Open the dashboard" : "Staff Login";

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
          <Link
            href={entryHref}
            className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
          >
            {entryLabel}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-grain">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-kesi-rise">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-raised px-3 py-1 text-xs font-medium text-text-soft">
              <Sprout size={13} className="text-brand" /> Five campuses, one record book
            </span>
            <h1 className="mt-5 font-display text-5xl font-medium leading-[1.05] tracking-tight text-text md:text-6xl">
              Grading and attendance,
              <br /> without the paperwork.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-text-soft">
              KESI replaces the quarter-end scramble of ledgers and spreadsheets with one
              DepEd-aligned system built for Agbalite, Binuangan, Pinagbayanan, Sulong&nbsp;Ipil,
              and Baraas — from Kindergarten through Grade 5.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={entryHref}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-strong"
              >
                Go to my dashboard <ArrowUpRight size={16} />
              </Link>
              <span className="text-sm text-text-faint">
                SY 2026&ndash;2027 &middot; August 3 &ndash; May 21
              </span>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full bg-brand-soft/70 blur-2xl" aria-hidden />
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
          <h2 className="font-display text-2xl font-medium text-text">The five campuses</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
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
          <Link href={entryHref} className="text-brand hover:underline">
            {entryLabel} &rarr;
          </Link>
        </div>
      </footer>
    </div>
  );
}
