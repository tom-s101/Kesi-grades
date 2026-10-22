"use client";

import { useEffect, useRef, useState } from "react";
import { Check, KeyRound, Loader2, X } from "lucide-react";
import { changePassword, remindAboutPasswordLater } from "@/app/(app)/account-actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/**
 * Change your password.
 *
 * Two ways in: straight after signing in while a teacher is still on
 * the shared starting password (`nudge`), where "Not now" is always
 * one tap away because changing is optional; and from "Change
 * password" in the sidebar, any time.
 */
export function ChangePasswordDialog({ nudge = false, onClose }: { nudge?: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  function dismiss() {
    // Only the post-sign-in prompt needs remembering; closing the one
    // opened from the sidebar just closes it.
    if (nudge && !done) void remindAboutPasswordLater();
    onClose();
  }

  useEffect(() => {
    firstField.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await changePassword(password, confirm).catch(() => ({
      ok: false as const,
      error: "Couldn't connect. Check your signal and try again.",
    }));
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    setTimeout(onClose, 1400);
  }

  return (
    <div
      // The welcome tour waits until this is closed.
      data-blocks-tour
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-sm animate-kesi-rise rounded-2xl border border-border bg-surface-raised p-6 shadow-elev-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            {done ? <Check size={20} /> : <KeyRound size={20} />}
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="-mr-2 -mt-2 rounded-lg p-1.5 text-text-faint transition-colors hover:bg-surface-sunken hover:text-text"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="mt-4">
            <h2 id="change-password-title" className="font-display text-xl font-medium text-text">
              Password changed
            </h2>
            <p className="mt-1 text-sm text-text-soft">Use your new password next time you sign in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4">
            <h2 id="change-password-title" className="font-display text-xl font-medium text-text">
              {nudge ? "Set your own password?" : "Change password"}
            </h2>
            <p className="mt-1 text-sm text-text-soft">
              {nudge
                ? "You're signed in with the shared starting password. Choose one only you know, so nobody else can sign in as you."
                : "Choose a new password of at least 8 characters."}
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  ref={firstField}
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Type it again</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-status-bad">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={dismiss}>
                {nudge ? "Not now" : "Cancel"}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" size={16} /> : "Save password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Offered once per sign-in while the teacher is on the starting password. */
export function PasswordPrompt() {
  const [open, setOpen] = useState(true);
  return open ? <ChangePasswordDialog nudge onClose={() => setOpen(false)} /> : null;
}
