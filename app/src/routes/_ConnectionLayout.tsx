import { useState } from 'react';
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useParams,
  useRouter,
} from '@tanstack/react-router';
import {
  Compass,
  Copy,
  MoreVertical,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Trash2,
} from 'lucide-react';
import appIcon from '@/assets/icon.png';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { resolveColor } from '@/lib/colors';
import { useStudio } from '@/features/explorer/store';
import { useTabs } from '@/features/explorer/tabs-store';
import TabStrip from '@/features/explorer/tab-strip';
import type { Connection, ConnStatus } from '@shared/schema';

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
  const openTabs = useTabs((s) => s.tabs);
  const router = useRouter();
  const selectedId = useParams({ strict: false }).connectionId;
  const inExplorer = useLocation({ select: (l) => l.pathname.startsWith('/explore') });
  const [collapsed, setCollapsed] = useState(false);

  const duplicate = async (c: Connection) => {
    const { id: _id, ...rest } = c;
    const saved = await window.api.connections.save({ ...rest, name: `${c.name} copy` });
    await router.invalidate();
    router.navigate({ to: '/$connectionId', params: { connectionId: saved.id } });
  };

  const remove = async (c: Connection) => {
    await window.api.connections.remove(c.id);
    await router.invalidate();
    if (selectedId === c.id) router.navigate({ to: '/' });
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="glass z-10 flex items-center gap-2.5 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Show connections' : 'Hide connections'}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
        <img src={appIcon} alt="MQTT Studio" className="size-8 shrink-0 rounded-lg shadow-sm" />
        <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-base font-semibold text-transparent">
          MQTT Studio
        </h1>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200',
            collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-[280px]',
          )}
        >
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
            {connections.map((c) => (
              <ConnectionRow
                key={c.id}
                c={c}
                status={statuses[c.id] ?? 'disconnected'}
                selected={selectedId === c.id}
                onDuplicate={() => duplicate(c)}
                onDelete={() => remove(c)}
              />
            ))}
          </nav>

          <div className="border-t p-3 text-xs text-muted-foreground">
            <Badge variant="outline">{connections.length} saved</Badge>
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {openTabs.length > 0 && <TabStrip activeId={inExplorer ? selectedId : undefined} />}
          <div className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ConnectionRow({
  c,
  status,
  selected,
  onDuplicate,
  onDelete,
}: {
  c: Connection;
  status: ConnStatus;
  selected: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-md py-2 pl-3 pr-1 transition-colors hover:bg-foreground/5',
        selected && 'bg-foreground/10',
      )}
    >
      <span
        className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: resolveColor(c.color) }}
      />
      <span className={cn('size-2 shrink-0 rounded-full', DOT[status])} />
      <Link to="/$connectionId" params={{ connectionId: c.id }} className="min-w-0 flex-1">
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            title="More"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy className="size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setConfirm(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{c.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the connection and its stored message history. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
