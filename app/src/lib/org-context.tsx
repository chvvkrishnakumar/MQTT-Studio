/**
 * Organization context — the frontend's single source of truth for the active
 * tenant and the current user's role within it.
 *
 * Mirrors the backend's multi-tenancy model:
 *   - `memberships`  — every org the user belongs to (for the switcher)
 *   - `activeOrg`    — the org the session is currently acting within (+ members)
 *   - `role`/`roles` — the user's role(s) in the active org (drives RBAC)
 *
 * Data comes from the generated org hooks; queries are gated on being logged in
 * so they don't fire (and 401) on public pages.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApiAuthOrganizationGetFullOrganizationQueryKey,
  getGetApiAuthOrganizationListQueryKey,
  useGetApiAuthOrganizationGetFullOrganization,
  useGetApiAuthOrganizationList,
  usePostApiAuthOrganizationSetActive,
} from "@/services/organizations";
import type {
  GetApiAuthOrganizationGetFullOrganization200Data,
  GetApiAuthOrganizationList200DataItem,
} from "@/services/hooks.schemas";
import { getStoredUser } from "@/lib/auth-storage";
import { resetActiveOrgCache } from "@/utils/org";

export type Organization = GetApiAuthOrganizationList200DataItem;
export type ActiveOrganization = GetApiAuthOrganizationGetFullOrganization200Data;

interface OrgContextValue {
  memberships: Organization[];
  activeOrg: ActiveOrganization | null;
  activeOrgId: string | null;
  /** Primary role of the current user in the active org (first of `roles`). */
  role: string | null;
  roles: string[];
  hasActiveOrg: boolean;
  isLoading: boolean;
  setActiveOrg: (organizationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const userId = getStoredUser()?.id;
  const enabled = !!userId;

  const listQuery = useGetApiAuthOrganizationList({ query: { enabled } });
  const fullQuery = useGetApiAuthOrganizationGetFullOrganization(undefined, {
    query: { enabled },
  });
  const setActive = usePostApiAuthOrganizationSetActive();

  const memberships = listQuery.data?.data ?? [];
  const activeOrg = fullQuery.data?.data ?? null;
  const activeOrgId = activeOrg?.id ?? null;

  const roles = useMemo(() => {
    const member = activeOrg?.members?.find((m) => m.userId === userId);
    return (member?.role ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }, [activeOrg, userId]);

  const value = useMemo<OrgContextValue>(
    () => ({
      memberships,
      activeOrg,
      activeOrgId,
      role: roles[0] ?? null,
      roles,
      hasActiveOrg: !!activeOrgId,
      isLoading: enabled && (listQuery.isLoading || fullQuery.isLoading),
      setActiveOrg: async (organizationId: string) => {
        await setActive.mutateAsync({ data: { organizationId } });
        // Drop the imperative guard cache so route `beforeLoad` re-resolves
        // the active org without a page reload.
        resetActiveOrgCache();
        // Refetch the org list + full org first so the switcher/role update,
        // then invalidate every other query so all tenant-scoped data reloads
        // under the new org.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getGetApiAuthOrganizationGetFullOrganizationQueryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: getGetApiAuthOrganizationListQueryKey(),
          }),
        ]);
        await queryClient.invalidateQueries();
      },
      refetch: async () => {
        await Promise.all([listQuery.refetch(), fullQuery.refetch()]);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberships, activeOrg, activeOrgId, roles, enabled, listQuery.isLoading, fullQuery.isLoading]
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within <OrgProvider>");
  return ctx;
}
