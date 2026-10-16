import { Link, Outlet } from 'react-router'
import { AuthHeaderSlot } from '@/features/auth/AuthHeaderSlot'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-primary"
          >
            COPA LV
          </Link>
          <AuthHeaderSlot />
        </div>
      </header>
      <Outlet />
      <footer className="mt-auto border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        COPA LV
      </footer>
    </div>
  )
}
