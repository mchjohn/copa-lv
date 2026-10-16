import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/app/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { PlayersPage } from '@/features/players/PlayersPage'

function HomePage() {
  return (
    <main className="flex flex-col justify-center items-center gap-4 mx-auto px-4 py-8 max-w-6xl min-h-[50svh] text-center container">
      <h1 className="font-semibold text-primary text-3xl tracking-tight">
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
          <Route path="/players" element={<PlayersPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
