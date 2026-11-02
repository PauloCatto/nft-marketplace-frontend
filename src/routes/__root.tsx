import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0] flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1F1510',
            border: '1px solid #3D2A1E',
            color: '#FAF5F0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}
