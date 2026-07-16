import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pause, Play, Plug, PlugZap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import type { Connection, ConnStatus } from '@shared/schema';
import { useStudio } from './store';
import { useTabs } from './tabs-store';
import TopicTree from './topic-tree';
import TopicDetail from './topic-detail';
import PublishPanel from './publish-panel';

const STATUS_STYLE: Record<ConnStatus, string> = {
  connected: 'bg-emerald-500 shadow-[0_0_10px_2px] shadow-emerald-500/50',
  connecting: 'bg-amber-500 animate-pulse',
  reconnecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-muted-foreground/60',
  error: 'bg-destructive shadow-[0_0_10px_2px] shadow-destructive/50',
};

export default function Explorer({ connectionId }: { connectionId: string }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  // Selection is kept per connection: this component is reused across tabs
  // (only the `connectionId` prop changes), so a single `selected` would leak
  // one tab's topic into another and show the wrong/empty detail.
  const [selectedByConn, setSelectedByConn] = useState<Record<string, string | undefined>>({});
  const selected = selectedByConn[connectionId];
  const setSelected = useCallback(
    (topic?: string) => setSelectedByConn((prev) => ({ ...prev, [connectionId]: topic })),
    [connectionId],
  );

  const topics = useStudio((s) => s.topics[connectionId]);
  const status = useStudio((s) => s.statuses[connectionId] ?? 'disconnected');
  const error = useStudio((s) => s.errors[connectionId]);
  const paused = useStudio((s) => s.paused);
  const setPaused = useStudio((s) => s.setPaused);
  const clearTopics = useStudio((s) => s.clearTopics);
  const openTab = useTabs((s) => s.open);

  useEffect(() => {
    window.api.connections.get(connectionId).then((c) => setConnection(c ?? null));
  }, [connectionId]);

  // This is the visible connection: register its tab and stream it live. The
  // previously-active connection keeps ingesting silently in the background.
  useEffect(() => {
    openTab(connectionId);
    window.api.mqtt.setActive(connectionId);
  }, [connectionId, openTab]);

  const connected = status === 'connected';
  const live = selected ? topics?.[selected] : undefined;

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    window.api.mqtt.pause(next);
  };

  const clear = () => {
    clearTopics(connectionId);
    window.api.mqtt.clear(connectionId);
    setSelected(undefined);
  };

  return (
    <div className="flex h-full flex-col text-foreground">
      <header className="glass z-10 flex items-center gap-3 border-b px-4 py-2.5">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span className={cn('size-2.5 rounded-full', STATUS_STYLE[status])} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {connection?.name ?? 'Connection'}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {connection && `${connection.protocol}://${connection.host}:${connection.port}`}
          </div>
        </div>
        <Badge variant="outline" className="ml-1 capitalize">
          {status}
        </Badge>
        {status === 'error' && error && (
          <span className="max-w-[280px] truncate text-xs text-destructive" title={error}>
            {error}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {connected ? (
            <Button variant="outline" size="sm" onClick={() => window.api.mqtt.disconnect(connectionId)}>
              <Plug className="size-4" /> Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => window.api.mqtt.connect(connectionId)}>
              <PlugZap className="size-4" /> Connect
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={togglePause}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="ghost" size="icon" onClick={clear} title="Clear topics">
            <Trash2 className="size-4" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={40} minSize={20}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Topics
              </span>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {Object.keys(topics ?? {}).length}
              </Badge>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <TopicTree topics={topics ?? {}} selected={selected} onSelect={setSelected} />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <TopicDetail connectionId={connectionId} topic={selected} live={live} />
            </div>
            <PublishPanel connectionId={connectionId} topic={selected} disabled={!connected} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
