import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

function HomePage() {
  return (
    <main className="mx-auto flex min-h-[50svh] max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-primary">
        COPA LV
      </h1>
      <p className="text-muted-foreground">
        Campeonatos round robin — em construção conforme specs.
      </p>
    </main>
  )
}

function LoginPlaceholderPage() {
  return (
    <main className="mx-auto flex min-h-[50svh] max-w-md flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="text-sm text-muted-foreground">
        Tela de login (spec 04).
      </p>
    </main>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
