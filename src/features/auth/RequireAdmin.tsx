import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '@/features/auth/auth-context'

function RequireAdminSkeleton() {
  return (
    <div className="flex flex-col justify-center space-y-3 mx-auto px-4 py-8 max-w-6xl min-h-[60dvh] container">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="bg-muted rounded-lg h-10 animate-pulse"
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
