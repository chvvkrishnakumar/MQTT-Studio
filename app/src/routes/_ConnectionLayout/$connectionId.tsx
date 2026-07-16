import { createFileRoute, useRouter } from '@tanstack/react-router';
import ConnectionForm from '@/features/connection/forms';
import { useStudio } from '@/features/explorer/store';
import type { ConnectionDraft } from '@shared/schema';

export const Route = createFileRoute('/_ConnectionLayout/$connectionId')({
  loader: ({ params }) =>
    params.connectionId === 'new' ? null : window.api.connections.get(params.connectionId),
  component: ConnectionFormPage,
});

function ConnectionFormPage() {
  const connection = Route.useLoaderData();
  const { connectionId } = Route.useParams();
  const router = useRouter();
  const status = useStudio((s) => s.statuses[connectionId]);

  const save = async (data: ConnectionDraft) => {
    const saved = await window.api.connections.save(
      connectionId === 'new' ? data : { ...data, id: connectionId },
    );
    await router.invalidate();
    return saved;
  };

  // Persist and stay put (create routes land on the new connection's editor).
  const onSave = async (data: ConnectionDraft) => {
    const saved = await save(data);
    if (connectionId === 'new') {
      router.navigate({ to: '/$connectionId', params: { connectionId: saved.id } });
    }
  };

  // Persist, open the broker connection, and jump to the live explorer.
  const onConnect = async (data: ConnectionDraft) => {
    const saved = await save(data);
    await window.api.mqtt.connect(saved.id);
    router.navigate({ to: '/explore/$connectionId', params: { connectionId: saved.id } });
  };

  return (
    <ConnectionForm
      key={connectionId}
      defaultValues={connection}
      status={connectionId === 'new' ? undefined : status}
      onSave={onSave}
      onConnect={onConnect}
      onOpen={() => router.navigate({ to: '/explore/$connectionId', params: { connectionId } })}
      onDisconnect={() => window.api.mqtt.disconnect(connectionId)}
      onCancel={() => router.navigate({ to: '/' })}
    />
  );
}
