import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Connection, ConnStatus } from '@shared/schema';
import { useStudio } from './store';
import { useTabs } from './tabs-store';

const DOT: Record<ConnStatus, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500 animate-pulse',
  reconnecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-muted-foreground/50',
  error: 'bg-destructive',
};

/** Chrome-style strip of open explorer connections. The active tab is driven by
 *  the current route; only it streams live (see Explorer's `setActive` call). */
export default function TabStrip({ activeId }: { activeId?: string }) {
  const navigate = useNavigate();
  const tabs = useTabs((s) => s.tabs);
  const close = useTabs((s) => s.close);
  const statuses = useStudio((s) => s.statuses);
  const [names, setNames] = useState<Record<string, Connection>>({});

  // Resolve tab labels/colours from persisted connections.
  useEffect(() => {
    window.api.connections.list().then((list) => {
      setNames(Object.fromEntries(list.map((c) => [c.id, c])));
    });
  }, [tabs.length]);

  const onClose = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const next = close(id);
    // Closing a tab drops its broker connection entirely.
    window.api.mqtt.disconnect(id);
    if (id === activeId) {
      if (next) navigate({ to: '/explore/$connectionId', params: { connectionId: next } });
      else navigate({ to: '/' });
    }
  };

  return (
    <div className="glass flex items-stretch gap-1 border-b px-2 pt-1.5">
      <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
        {tabs.map((id) => {
          const active = id === activeId;
          const status = statuses[id] ?? 'disconnected';
          const name = names[id]?.name ?? 'Connection';
          return (
            <button
              key={id}
              type="button"
              onClick={() =>
                navigate({ to: '/explore/$connectionId', params: { connectionId: id } })
              }
              className={cn(
                'group flex max-w-[200px] min-w-[120px] items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-background font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-foreground/5',
              )}
            >
              <span className={cn('size-2 shrink-0 rounded-full', DOT[status])} />
              <span className="truncate">{name}</span>
              <span
                onClick={(e) => onClose(e, id)}
                className="ml-auto grid size-5 shrink-0 place-items-center rounded opacity-0 transition group-hover:opacity-100 hover:bg-foreground/10"
                aria-label={`Close ${name}`}
              >
                <X className="size-3.5" />
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => navigate({ to: '/' })}
        title="New connection"
        className="my-1 grid size-8 place-items-center self-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
