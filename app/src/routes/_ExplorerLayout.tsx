import { createFileRoute, Outlet } from '@tanstack/react-router';

// Standalone, full-screen layout for the live explorer — no connection sidebar.
export const Route = createFileRoute('/_ExplorerLayout')({
  component: () => <Outlet />,
});
