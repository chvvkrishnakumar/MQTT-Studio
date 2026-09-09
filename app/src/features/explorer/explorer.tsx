import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Activity, PanelLeft, PanelLeftClose, Pause, Play, Plug, PlugZap, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { parseError } from '@/lib/error-hints';
import type { Connection, ConnStatus } from '@shared/schema';
import { useStudio } from './store';
import { useTabs } from './tabs-store';
import { useSelection } from './selection-store';
import { useExports } from './exports-store';
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
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [msgRate, setMsgRate] = useState(0);
  const prevCountRef = useRef(0);
  // Selection is kept per connection in a store that outlives this component:
  // switching tabs remounts the Explorer, and a local state would forget the
  // topic (and drop back to the empty "select a topic" pane) on return.
  const selected = useSelection((s) => s.selected[connectionId]);
  const select = useSelection((s) => s.select);
  const setSelected = (topic?: string) => select(connectionId, topic);

  // Topics with a live export running (any topic in this connection), so the
  // tree can flag what's recording even when it isn't the selected topic.
  const exportingTopics = useExports(
    useShallow((s) =>
      Object.values(s.byKey)
        .filter((e) => e.connectionId === connectionId)
        .map((e) => e.topic),
    ),
  );
  const exporting = useMemo(() => new Set(exportingTopics), [exportingTopics]);

  const topics = useStudio((s) => s.topics[connectionId]);
  const status = useStudio((s) => s.statuses[connectionId] ?? 'disconnected');
  const error = useStudio((s) => s.errors[connectionId]);
  const paused = useStudio((s) => s.paused);
  const setPaused = useStudio((s) => s.setPaused);
  const clearTopics = useStudio((s) => s.clearTopics);
  const sidebarCollapsed = useStudio((s) => s.sidebarCollapsed);
  const toggleSidebar = useStudio((s) => s.toggleSidebar);
  const openTab = useTabs((s) => s.open);

  useEffect(() => {
    window.api.connections.get(connectionId).then((c) => setConnection(c ?? null));
  }, [connectionId]);

  // Reset the error dismissal when the error changes or clears.
  useEffect(() => {
    setErrorDismissed(false);
  }, [error]);

  // This is the visible connection: register its tab and stream it live. The
  // previously-active connection keeps ingesting silently in the background;
  // leaving the explorer (cleanup) silences everything.
  useEffect(() => {
    openTab(connectionId);
    window.api.mqtt.setActive(connectionId);
    return () => void window.api.mqtt.setActive(null);
  }, [connectionId, openTab]);

  const connected = status === 'connected';
  const live = selected ? topics?.[selected] : undefined;
  // Keep banner stable across auto-reconnect cycles: show when we have an
  // error regardless of whether status is 'error' or 'reconnecting' (the
  // manager now preserves the error string during retries). Without this,
  // the banner would flicker error -> hidden -> error every reconnectPeriod.
  const showError = !!error && !errorDismissed;
  // Auto-reconnect enabled → show steady retry indicator instead of toggling
  // with status. Previous `status==='reconnecting'` toggled every 1s causing flicker.
  const isRetrying = !!showError && (connection?.reconnectPeriod ?? 0) > 0;
  // Banner now stays mounted as 'error'; manager suppresses 'reconnecting' while in error
  const indicatorStatus: ConnStatus = showError ? 'error' : status;
  const parsedError = useMemo(
    () =>
      parseError(error, {
        protocol: connection?.protocol,
        protocolVersion: connection?.protocolVersion,
        host: connection?.host,
        port: connection?.port,
      }),
    [error, connection?.protocol, connection?.protocolVersion, connection?.host, connection?.port],
  );

  // Total messages received this session across all topics.
  const totalMsgs = useMemo(
    () => Object.values(topics ?? {}).reduce((sum, t) => sum + t.count, 0),
    [topics],
  );

  // Message rate: compute messages/sec over a 1s sliding window.
  useEffect(() => {
    prevCountRef.current = totalMsgs;
    const interval = setInterval(() => {
      const delta = totalMsgs - prevCountRef.current;
      prevCountRef.current = totalMsgs;
      setMsgRate(delta);
    }, 1000);
    return () => clearInterval(interval);
  }, [totalMsgs]);

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
      <header className="glass z-10 flex items-center gap-2.5 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Show connections' : 'Hide connections'}
        >
          {sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
        <span className={cn('size-2.5 rounded-full', STATUS_STYLE[indicatorStatus])} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {connection?.name ?? 'Connection'}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {connection && `${connection.protocol}://${connection.host}:${connection.port}`}
          </div>
        </div>
        <Badge variant="outline" className="ml-1 capitalize">
          {indicatorStatus}
        </Badge>

        {connected && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            <span className="tabular-nums">{totalMsgs} msgs</span>
            {msgRate > 0 && (
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {msgRate}/s
              </Badge>
            )}
          </div>
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
        </div>
      </header>

      {showError && (
        <div className="flex items-start gap-2.5 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-destructive">{parsedError.title}</div>
              {isRetrying && (
                <span className="inline-flex items-center gap-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                  Retrying…
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{parsedError.hint}</div>
            {isRetrying && (
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.api.mqtt.disconnect(connectionId)}
                >
                  Stop retrying
                </Button>
                <span className="self-center text-[11px] text-muted-foreground/70">
                  or set Reconnect Period to 0 in Advanced to disable auto-reconnect
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setErrorDismissed(true)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            title="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

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
              <TopicTree
                topics={topics ?? {}}
                selected={selected}
                exporting={exporting}
                onSelect={setSelected}
              />
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
