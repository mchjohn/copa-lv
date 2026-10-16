import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authApi } from '@/features/auth/auth-api'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'

export function AuthHeaderSlot({ className }: { className?: string }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        className={cn('bg-muted rounded-lg w-28 h-8 animate-pulse shrink-0', className)}
        aria-hidden
      />
    )
  }

  if (!session) {
    return (
      <Link
        to="/login"
        className={cn(
          'inline-flex items-center min-h-10 font-medium text-primary text-sm hover:underline',
          className,
        )}
      >
        Entrar
      </Link>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 max-w-[min(100%,280px)]', className)}>
      <span
        className="text-muted-foreground text-sm truncate"
        title={session.email}
      >
        {session.email}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          void authApi.signOut().then(() => {
            toast.success('Sessão encerrada.')
          })
        }}
      >
        Sair
      </Button>
    </div>
  )
}
