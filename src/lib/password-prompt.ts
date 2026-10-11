/**
 * Set when a teacher answers "Not now" to the change-password prompt,
 * holding their id. Signing in again clears it, so the prompt comes
 * back once per sign-in until they choose their own password — it's an
 * offer, never a gate.
 */
export const PASSWORD_LATER_COOKIE = "kesi-pw-later";
