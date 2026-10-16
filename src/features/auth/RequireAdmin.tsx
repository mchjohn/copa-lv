import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/auth-context'

function RequireAdminSkeleton() {
  return (
    <div className="container mx-auto max-w-6xl space-y-3 px-4 py-8">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="h-10 animate-pulse rounded-lg bg-muted"
          style={{ width: `${100 - i * 6}%` }}
        />
      ))}
    </div>
  )
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <RequireAdminSkeleton />
  if (!isAdmin) return <Navigate to="/login" replace />
  return children
}
