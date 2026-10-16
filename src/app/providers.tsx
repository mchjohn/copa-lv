import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { AppRouter } from '@/app/router'
import { AuthProvider } from '@/features/auth/auth-context'

export function Providers({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children ?? <AppRouter />}
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}
