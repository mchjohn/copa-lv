import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/app/AppLayout'
import { NotFoundPage } from '@/app/NotFoundPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { PlayersPage } from '@/features/players/PlayersPage'
import { TournamentDetailPage } from '@/features/tournaments/TournamentDetailPage'
import { TournamentEditPage } from '@/features/tournaments/TournamentEditPage'
import { TournamentNewPage } from '@/features/tournaments/TournamentNewPage'
import { TournamentsPage } from '@/features/tournaments/TournamentsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/tournaments" replace />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/new" element={<TournamentNewPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route
            path="/tournaments/:id/edit"
            element={<TournamentEditPage />}
          />
          <Route path="/players" element={<PlayersPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
