/**
 * Frontend RBAC helpers — mirror the backend's `requireRole`.
 *
 * Use these to conditionally render UI (e.g. admin-only buttons). They are NOT
 * a security boundary — the backend still enforces every write — but they keep
 * the UI honest about what the current user can do in the active organization.
 */
import type { ReactNode } from "react";
import { useOrg } from "@/lib/org-context";

/** The current user's roles in the active organization. */
export function useRoles(): string[] {
  return useOrg().roles;
}

/** True when the user holds at least one of the given roles (or any role when none given). */
export function useHasRole(...allowed: string[]): boolean {
  const roles = useOrg().roles;
  if (allowed.length === 0) return roles.length > 0;
  return roles.some((r) => allowed.includes(r));
}

/**
 * Renders `children` only when the user has one of `roles`; otherwise renders
 * `fallback` (default: nothing).
 */
export function RequireRole({
  roles,
  children,
  fallback = null,
}: {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const ok = useHasRole(...roles);
  return <>{ok ? children : fallback}</>;
}
