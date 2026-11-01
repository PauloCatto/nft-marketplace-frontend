import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <h1 className="text-4xl font-bold tracking-tight text-emerald-400 mb-4">
        Jungle NFT Marketplace
      </h1>
      <p className="text-slate-400 max-w-md">
        Fundação técnica inicial configurada com TanStack Router, MSW v2 e Tailwind CSS v4.
      </p>
    </div>
  )
}
