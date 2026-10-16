import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AuthHeaderSlot } from '@/features/auth/AuthHeaderSlot'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center min-h-10 font-medium hover:text-foreground text-sm transition-colors',
    isActive ? 'text-primary' : 'text-muted-foreground',
  )

function HeaderNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <NavLink
        to="/tournaments"
        className={navLinkClass}
        onClick={onNavigate}
      >
        Campeonatos
      </NavLink>
      <NavLink to="/players" className={navLinkClass} onClick={onNavigate}>
        Jogadores
      </NavLink>
    </>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex flex-col bg-background min-h-dvh text-foreground">
      <header className="border-border/60 border-b">
        <div className="flex justify-between items-center gap-4 mx-auto px-4 py-3 max-w-6xl container">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden size-10 shrink-0"
                    aria-label="Abrir menu de navegação"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="gap-6">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav
                  className="flex flex-col gap-1"
                  aria-label="Navegação principal"
                >
                  <HeaderNavLinks onNavigate={() => setMobileOpen(false)} />
                </nav>
                <div className="mt-auto pt-4 border-border border-t">
                  <AuthHeaderSlot className="flex-col items-stretch gap-3" />
                </div>
              </SheetContent>
            </Sheet>
            <Link
              to="/tournaments"
              className="font-semibold text-primary text-lg tracking-tight"
            >
              COPA LV
            </Link>
            <nav
              className="hidden md:flex items-center gap-4"
              aria-label="Navegação principal"
            >
              <HeaderNavLinks />
            </nav>
          </div>
          <AuthHeaderSlot className="hidden md:flex" />
        </div>
      </header>
      <Outlet />
      <footer className="mt-auto py-4 border-border/60 border-t text-muted-foreground text-xs text-center">
        COPA LV
      </footer>
    </div>
  )
}
