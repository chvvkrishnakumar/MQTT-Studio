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

/** Tab strip rendered above the explorer panel — sits in its own thin row
 *  right below the top nav bar, between the sidebar (left) and the explorer
 *  content (below). Flat buttons match the reduced chrome around them. */
export default function TabStrip({ activeId }: { activeId?: string }) {
  const navigate = useNavigate();
  const tabs = useTabs((s) => s.tabs);
  const close = useTabs((s) => s.close);
  const statuses = useStudio((s) => s.statuses);
  const [names, setNames] = useState<Record<string, Connection>>({});

  // Resolve tab labels from persisted connections.
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
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {tabs.map((id) => {
        const active = id === activeId;
        const status = statuses[id] ?? 'disconnected';
        const name = names[id]?.name ?? 'Connection';
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigate({ to: '/explore/$connectionId', params: { connectionId: id } })}
            className={cn(
              'group flex max-w-[160px] min-w-[90px] shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
            )}
          >
            <span className={cn('size-1.5 shrink-0 rounded-full', DOT[status])} />
            <span className="truncate">{name}</span>
            <span
              onClick={(e) => onClose(e, id)}
              className="ml-auto grid size-4 shrink-0 place-items-center rounded opacity-0 transition group-hover:opacity-100 hover:bg-foreground/10"
              aria-label={`Close ${name}`}
            >
              <X className="size-3" />
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => navigate({ to: '/' })}
        title="New connection"
        className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}