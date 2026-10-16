import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}
