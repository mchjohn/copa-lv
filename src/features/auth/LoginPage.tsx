import type { AuthError } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/features/auth/auth-api'
import { useAuth } from '@/features/auth/auth-context'
import { mapAuthSignInError } from '@/features/auth/map-auth-sign-in-error'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  if (!isLoading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setIsPending(true)
    try {
      await authApi.signIn({ email, password })
      navigate('/', { replace: true })
    } catch (err) {
      const authError = err as AuthError
      const mapped = mapAuthSignInError(authError)
      if (mapped.formMessage) setFormError(mapped.formMessage)
      toast.error(mapped.toastMessage)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="flex flex-col justify-center gap-6 mx-auto p-6 max-w-md min-h-dvh">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>
            Acesso restrito ao administrador do campeonato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                aria-invalid={formError ? true : undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                aria-invalid={formError ? true : undefined}
              />
            </div>
            {formError ? (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            ) : null}
            <Button type="submit" className="w-full min-h-10" disabled={isPending}>
              {isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-sm text-center">
        <Link to="/" className="text-primary hover:underline">
          Voltar ao início
        </Link>
      </p>
    </main>
  )
}
