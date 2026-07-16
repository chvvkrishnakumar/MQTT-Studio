import { useEffect } from 'react';
import { createFileRoute, Outlet, useParams } from '@tanstack/react-router';
import TabStrip from '@/features/explorer/tab-strip';

// Standalone, full-screen layout for the live explorer — no connection sidebar.
// Hosts the Chrome-style tab strip above the active connection's explorer.
export const Route = createFileRoute('/_ExplorerLayout')({
  component: ExplorerLayout,
});

function ExplorerLayout() {
  const { connectionId } = useParams({ strict: false });

  // Leaving the explorer entirely silences every connection (no visible tab).
  useEffect(() => () => void window.api.mqtt.setActive(null), []);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-background to-muted/20">
      <TabStrip activeId={connectionId} />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
