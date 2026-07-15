/**
 * Imperative organization helpers for route guards (`beforeLoad` runs outside
 * React, so it can't use the org hooks). Resolves the session's active
 * organization; the result is cached for the app's lifetime so guards are cheap.
 * Call `resetActiveOrgCache()` after creating/switching/leaving an org.
 */
import { getApiAuthOrganizationGetFullOrganization } from "@/services/organizations";
import type { GetApiAuthOrganizationGetFullOrganization200Data } from "@/services/hooks.schemas";

export type ActiveOrg = GetApiAuthOrganizationGetFullOrganization200Data;

let activeOrgCheck: Promise<ActiveOrg | null> | null = null;

async function fetchActiveOrg(): Promise<ActiveOrg | null> {
  try {
    const res = await getApiAuthOrganizationGetFullOrganization();
    return res?.data ?? null;
  } catch {
    // No active org / transient error → treat as "no org" for guarding.
    return null;
  }
}

/** Returns the active organization (with members) or null. Cached; `force` bypasses. */
export function ensureActiveOrg(force = false): Promise<ActiveOrg | null> {
  if (force) activeOrgCheck = null;
  activeOrgCheck ??= fetchActiveOrg();
  return activeOrgCheck;
}

/** Drop the cached active-org check (after create/switch/leave). */
export function resetActiveOrgCache(): void {
  activeOrgCheck = null;
}
