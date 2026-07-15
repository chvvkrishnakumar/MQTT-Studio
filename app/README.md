# Frontend Base

A lean, standalone Vite + React + TanStack Router starter — the UI half of a
quick-start setup. It ships the plumbing you'd otherwise rebuild every project
(auth, theming, routing, data fetching, a component kit) and nothing
app-specific, so you start at feature work.

It's an **independent base** — it can talk to the companion backend base (auth
is pre-wired to it) but doesn't depend on its data model. Point it at any API.

## Pre-wired

- **Auth** — email/password login & register, route guards, persisted session
  (`src/modules/auth`, `src/utils/auth.ts`)
- **Theming** — `next-themes` + `.dark` design tokens, with a sidebar toggle
- **Routing** — TanStack file-based routes, split into public (`_AuthLayout`)
  and guarded (`_MainLayout`) areas, plus app-wide 404 / error boundary
- **Data fetching** — TanStack Query + an axios client with token handling
  (`src/services/axiosClient.ts`)
- **Typed API client (optional)** — orval generates hooks + zod schemas from an
  OpenAPI spec (`npm run orval`)
- **Component kit** — shadcn/ui (Radix + Tailwind v4), all token-themed
- **Multi-tenancy** — `OrgProvider`/`useOrg` (`src/lib/org-context.tsx`) expose
  the active organization + the user's role; `_MainLayout` guards on an active
  org and shows an org switcher; org-less users are routed to `/onboarding`
  (`src/modules/organization`)
- **RBAC** — `useHasRole` / `<RequireRole>` (`src/lib/rbac.tsx`) to gate UI by
  role (mirrors the backend; not a security boundary)
- **File uploads** — `useUpload` (`src/lib/use-upload.ts`) + `<FileUpload>`
  (`src/components/file-upload.tsx`) wrapping the backend `/files` endpoints

## Getting started

```bash
npm install
npm run dev        # http://localhost:5174
```

`.env`:

```
VITE_APP_NAME=Base
VITE_API_BASE_URL=http://localhost:3000
```

## Where to build

- **Public pages** → add routes under `src/routes/_AuthLayout/`
- **Authenticated app** → add routes under `src/routes/_MainLayout/`; the home
  page is `src/routes/_MainLayout/index.tsx` and nav links live in
  `src/routes/_MainLayout.tsx`
- **API calls** → either hand-write hooks with `axiosClient`, or point
  `orval.config.ts` at your backend and run `npm run orval` to generate typed
  react-query hooks + zod schemas into `src/services/`

## Auth & organizations

Email/password via the backend (Better Auth), wired in `src/utils/auth.ts`.
`_MainLayout`'s `beforeLoad` validates the session (redirect to `/home` if none)
**and** the active organization (redirect to `/onboarding` if none).

Onboarding flow: a new user registers with **no org**, lands on `/onboarding` to
create one (becoming owner), or follows an emailed invite to
`/accept-invitation/<id>` to join an existing org. `useOrg()` exposes
`memberships`, `activeOrg`, `role`, and `setActiveOrg`; switching reloads so all
queries refetch under the new tenant.

Regenerate the typed client after backend changes: start the backend, then
`ORVAL_OPENAPI_TARGET=http://127.0.0.1:<port>/documentation/json npm run orval`.
