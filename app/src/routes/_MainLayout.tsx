import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_MainLayout')({
  component: MainLayout,
})

function MainLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">MQTT Studio</h1>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}