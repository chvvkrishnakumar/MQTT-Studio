import { createFileRoute, useRouter } from '@tanstack/react-router';
import ConnectionForm from '@/features/connection/forms';
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

  const onSubmit = async (data: ConnectionDraft) => {
    const saved = await window.api.connections.save(
      connectionId === 'new' ? data : { ...data, id: connectionId },
    );
    await router.invalidate();
    router.navigate({ to: '/explore/$connectionId', params: { connectionId: saved.id } });
  };

  return (
    <ConnectionForm
      key={connectionId}
      defaultValues={connection}
      onSubmit={onSubmit}
      onCancel={() => router.navigate({ to: '/' })}
    />
  );
}
