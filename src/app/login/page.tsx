import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginFlow } from "@/components/auth/login-flow";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { openAccessEnabled } from "@/lib/testing-mode";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Nothing to log into while the site is open for testing — asking
  // for a password nobody has yet would just be a dead end.
  if (openAccessEnabled()) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-strong p-12 text-on-brand lg:flex bg-grain">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 p-1.5">
            <Image src="/brand/kesi-logo.jpg" alt="KESI" width={40} height={40} className="rounded-full object-cover" />
          </div>
          <span className="font-display text-lg tracking-tight">Katutubo Excel Schools</span>
        </div>
        <div className="max-w-md">
          <p className="font-display text-4xl font-medium leading-tight">
            One record book for five campuses.
          </p>
          <p className="mt-4 text-on-brand/75">
            Attendance, grading, and reporting for Agbalite, Binuangan, Pinagbayanan, Sulong Ipil,
            and Baraas — built so quarterly grades compute themselves.
          </p>
        </div>
        <p className="text-xs text-on-brand/60">
          Deped-aligned grading &middot; SY 2026&ndash;2027
        </p>
      </div>

      <div className="relative flex flex-col items-center justify-center p-6">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Image src="/brand/kesi-logo.jpg" alt="KESI" width={56} height={56} className="rounded-full" />
          <span className="font-display text-lg text-text">Katutubo Excel Schools</span>
        </div>
        <LoginFlow nextPath={next && next !== "/login" ? next : "/dashboard"} />
      </div>
    </div>
  );
}
