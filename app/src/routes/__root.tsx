import { Outlet, createRootRoute } from '@tanstack/react-router';
import { NotFound, ErrorState } from '@/components/route-states';
import { useMqttBridge } from '@/features/explorer/use-bridge';

function Root() {
  // App-wide so connection statuses + live deltas flow on every screen.
  useMqttBridge();
  return <Outlet />;
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: ErrorState,
});
