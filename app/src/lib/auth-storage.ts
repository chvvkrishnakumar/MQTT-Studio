/**
 * Single source of truth for client-side auth persistence.
 *
 * Auth state is intentionally kept to TWO keys only:
 *   - `token` — the bearer/session token (owned by axiosClient: cookie + localStorage)
 *   - `user`  — the authenticated user object (owned here)
 *
 * The old setup mirrored the token across `accessToken` / `refreshToken` /
 * `token` and stored a separate `userId`, which was redundant and easy to
 * desync. Everything now flows through the helpers below so there is exactly
 * one place that reads and writes each key.
 */
import { getAuthToken, setAuthToken } from "@/services/axiosClient";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  image?: string | null;
}

const USER_KEY = "user";

/** The persisted user, or null when absent/corrupt/incomplete. */
export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist the full user object. */
export function setStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage unavailable (private mode, SSR) — ignore
  }
}

/** Merge a partial update into the persisted user. No-op when not logged in. */
export function patchStoredUser(patch: Partial<AuthUser>): AuthUser | null {
  const current = getStoredUser();
  if (!current) return null;
  const next = { ...current, ...patch };
  setStoredUser(next);
  return next;
}

/** Clear all auth state (user + token, including the cookie mirror). */
export async function clearStoredAuth(): Promise<void> {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  await setAuthToken(null);
}

export { getAuthToken, setAuthToken };
