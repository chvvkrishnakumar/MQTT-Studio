import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_ConnectionLayout/')({
  component: Welcome,
});

function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Radio className="size-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Welcome to MQTT Studio</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create a connection to a broker, then open the explorer to watch topics and
          history update live.
        </p>
      </div>
      <Button asChild>
        <Link to="/$connectionId" params={{ connectionId: 'new' }}>
          <Plus className="size-4" /> New connection
        </Link>
      </Button>
    </div>
  );
}
