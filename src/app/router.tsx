import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/app/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'

function HomePage() {
  return (
    <main className="container mx-auto flex min-h-[50svh] max-w-6xl flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-primary">
        COPA LV
      </h1>
      <p className="text-muted-foreground">
        Campeonatos round robin — em construção conforme specs.
      </p>
    </main>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
