"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signInWithName } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loader";

export function LoginFlow({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // A dropped connection rejects rather than returning an error, and
    // would otherwise leave the button spinning for good.
    const result = await signInWithName(name, password).catch(() => ({
      ok: false as const,
      error: "Couldn't connect. Check your signal and try again.",
    }));
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Straight on to the dashboard: the welcome screen stays up for
    // exactly as long as the dashboard takes to arrive, rather than
    // holding everyone for a fixed couple of seconds first.
    // (Signing in set cookies, which already clears the browser's cached
    // pages, so there's no stale signed-out copy to refresh.)
    setWelcomeName(result.firstName);
    router.replace(nextPath);
  }

  if (welcomeName) return <LoadingOverlay label={`Welcome, ${welcomeName}! Opening your dashboard…`} />;

  return (
    <form onSubmit={submit} className="w-full max-w-sm animate-kesi-rise">
      {loading && <LoadingOverlay label="Signing you in…" />}
      <h1 className="font-display text-2xl font-medium text-text">Sign in</h1>
      <p className="mt-1 text-sm text-text-soft">Type your full name and your password.</p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoFocus
            required
            autoComplete="username"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adam Santos"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-status-bad">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-6 w-full" size="lg" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" size={18} /> : "Log in"}
      </Button>
      <p className="mt-4 text-center text-xs text-text-faint">
        Forgot your password? Ask your head teacher or the admin to reset it.
      </p>
    </form>
  );
}
