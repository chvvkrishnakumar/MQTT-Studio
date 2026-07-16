import { useCallback, useEffect, useState } from 'react';
import type { Connection, ConnectionDraft } from '@shared/schema';

/** Load + mutate persisted connections (SQLite via IPC). */
export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setConnections(await window.api.connections.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (draft: ConnectionDraft) => {
      const saved = await window.api.connections.save(draft);
      await reload();
      return saved;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await window.api.connections.remove(id);
      await reload();
    },
    [reload],
  );

  return { connections, loading, reload, save, remove };
}
