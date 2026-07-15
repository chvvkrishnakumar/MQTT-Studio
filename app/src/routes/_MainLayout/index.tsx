import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_MainLayout/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>You can render your component here</div>
}
