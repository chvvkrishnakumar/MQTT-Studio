import { createFileRoute, Link, Outlet, useParams } from '@tanstack/react-router';
import { Compass, Plus, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useStudio } from '@/features/explorer/store';
import type { ConnStatus } from '@shared/schema';

export const Route = createFileRoute('/_ConnectionLayout')({
  loader: () => window.api.connections.list(),
  component: ConnectionLayout,
});

const DOT: Record<ConnStatus, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500',
  reconnecting: 'bg-amber-500',
  disconnected: 'bg-muted-foreground/40',
  error: 'bg-destructive',
};

function ConnectionLayout() {
  const connections = Route.useLoaderData();
  const statuses = useStudio((s) => s.statuses);
  const selectedId = useParams({ strict: false }).connectionId;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="glass z-10 flex items-center gap-2.5 border-b px-5 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 shadow-sm">
          <Radio className="size-4 text-primary-foreground" />
        </div>
        <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-base font-semibold text-transparent">
          MQTT Studio
        </h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[280px] shrink-0 flex-col border-r bg-sidebar">
          <div className="p-3">
            <Button asChild className="w-full justify-start">
              <Link to="/$connectionId" params={{ connectionId: 'new' }}>
                <Plus className="size-4" /> New connection
              </Link>
            </Button>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-2">
            {connections.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No connections yet.
              </p>
            )}
            {connections.map((c) => {
              const status = statuses[c.id] ?? 'disconnected';
              return (
                <div
                  key={c.id}
                  className={cn(
                    'group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/40',
                    selectedId === c.id && 'bg-accent',
                  )}
                >
                  <span className={cn('size-2 shrink-0 rounded-full', DOT[status])} />
                  <Link
                    to="/$connectionId"
                    params={{ connectionId: c.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.host}:{c.port}
                    </div>
                  </Link>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-7 opacity-0 group-hover:opacity-100"
                    title="Open explorer"
                  >
                    <Link to="/explore/$connectionId" params={{ connectionId: c.id }}>
                      <Compass className="size-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </nav>

          <div className="border-t p-3 text-xs text-muted-foreground">
            <Badge variant="outline">{connections.length} saved</Badge>
          </div>
        </aside>

        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
