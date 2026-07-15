import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { NotFound, ErrorState } from './components/route-states';
import { getStoredUser } from './lib/auth-storage';

// Seed the router context from persisted state for an instant first paint.
// Guarded routes (_MainLayout) still re-validate the session server-side.
const user = getStoredUser();

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: ErrorState,
  context: {
    auth: {
      isAuthenticated: !!user,
      user,
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default router;
