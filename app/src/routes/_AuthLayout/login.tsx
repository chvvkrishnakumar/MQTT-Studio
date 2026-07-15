import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_AuthLayout/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">Sign in</h2>
        <p className="mt-2 text-sm text-muted-foreground">Simple login page (stub)</p>
        <form className="mt-4 flex flex-col gap-3">
          <input className="input" placeholder="Email" />
          <input className="input" placeholder="Password" type="password" />
          <button className="mt-2 rounded bg-primary px-4 py-2 text-white">Sign in</button>
        </form>
      </div>
    </div>
  );
}
