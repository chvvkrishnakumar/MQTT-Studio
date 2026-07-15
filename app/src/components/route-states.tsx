import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** App-wide 404. Used as the router's defaultNotFoundComponent. */
export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-5xl font-bold tracking-tight">404</p>
      <p className="text-muted-foreground">
        We couldn’t find what you’re looking for.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}

/** App-wide error boundary view. Used as the router's defaultErrorComponent. */
export function ErrorState({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Unexpected error"}
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
