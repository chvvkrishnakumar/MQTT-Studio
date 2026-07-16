import { createFileRoute } from '@tanstack/react-router';
import Explorer from '@/features/explorer/explorer';

export const Route = createFileRoute('/_ConnectionLayout/explore/$connectionId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { connectionId } = Route.useParams();
  return <Explorer connectionId={connectionId} />;
}
