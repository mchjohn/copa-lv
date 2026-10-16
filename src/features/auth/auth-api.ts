import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Uuid } from '@/types/domain'

export interface AuthSession {
  userId: Uuid
  email: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthApi {
  signIn(input: LoginInput): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
  subscribe(cb: (session: AuthSession | null) => void): () => void
}

function mapSession(session: Session | null): AuthSession | null {
  if (!session?.user.email) return null
  return {
    userId: session.user.id,
    email: session.user.email,
  }
}

export const authApi: AuthApi = {
  async signIn(input) {
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    })
    if (error) throw error
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return mapSession(data.session)
  },

  subscribe(cb) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(mapSession(session))
    })
    return () => subscription.unsubscribe()
  },
}
