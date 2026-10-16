import { Link, NavLink, Outlet } from 'react-router'
import { AuthHeaderSlot } from '@/features/auth/AuthHeaderSlot'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium transition-colors hover:text-foreground',
    isActive ? 'text-cyan-400' : 'text-muted-foreground',
  )

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              to="/tournaments"
              className="text-lg font-semibold tracking-tight text-primary"
            >
              COPA LV
            </Link>
            <nav className="hidden items-center gap-4 md:flex">
              <NavLink to="/tournaments" className={navLinkClass}>
                Campeonatos
              </NavLink>
              <NavLink to="/players" className={navLinkClass}>
                Jogadores
              </NavLink>
            </nav>
          </div>
          <AuthHeaderSlot />
        </div>
        <nav
          className="container mx-auto flex max-w-6xl gap-4 border-t border-border/40 px-4 py-2 md:hidden"
          aria-label="Navegação principal"
        >
          <NavLink to="/tournaments" className={navLinkClass}>
            Campeonatos
          </NavLink>
          <NavLink to="/players" className={navLinkClass}>
            Jogadores
          </NavLink>
        </nav>
      </header>
      <Outlet />
      <footer className="mt-auto border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        COPA LV
      </footer>
    </div>
  )
}
