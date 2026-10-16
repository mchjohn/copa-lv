# 04 — Autenticação e gates de UI

## 1. Context & Objective

Login de **um** administrador via email/senha (Supabase Auth). Visitantes anônimos leem tudo. Mutações (botões de criar/editar/excluir, uploads, gerar chaves, resultados, finalizar) só renderizam e só executam com sessão.

Não existe registro público. Não existe “esqueci a senha” na v1 (Admin reseta no Dashboard).

## 2. Inputs / Outputs & Types

### Rotas

| Path | Acesso | Página |
| --- | --- | --- |
| `/login` | público; se já autenticado, redirect `/` | `src/features/auth/LoginPage.tsx` |
| demais rotas | público leitura | specs 05–11 |

Não existe rota `/admin`. Não existe layout separado “só admin”.

### Contratos

```ts
interface AuthSession {
  userId: Uuid
  email: string
}

interface LoginInput {
  email: string
  password: string
}

interface AuthApi {
  signIn(input: LoginInput): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
  subscribe(cb: (session: AuthSession | null) => void): () => void
}
```

Hook: `useAuth(): { session: AuthSession | null; isAdmin: boolean; isLoading: boolean }`

`isAdmin === session !== null` (ADR-02).

Módulo: `src/features/auth/auth-api.ts` usando `supabase.auth`.

### UI login

Campos: email (type email, required), senha (type password, required), submit “Entrar”.

Erros de credencial: toast + texto no form: `E-mail ou senha inválidos.` Mapear `Invalid login credentials` do Auth para essa string. Demais erros Auth: toast com `VALIDATION` / mensagem genérica `Não foi possível entrar.`

### Header (spec 11 detalha visual)

- Sem sessão: link “Entrar” → `/login`
- Com sessão: email truncado + botão “Sair”

## 3. Step-by-Step Logic & Rules

1. `AuthProvider` em `providers.tsx`:
   - no mount: `supabase.auth.getSession()`
   - `onAuthStateChange` atualiza estado
   - `isLoading` true até o primeiro `getSession` resolver
2. `signIn`: `supabase.auth.signInWithPassword({ email: email.trim(), password })`. Sucesso → `navigate('/')` replace.
3. `signOut`: `supabase.auth.signOut()` → toast `Sessão encerrada.` → se estava em página de mutação, permanece (UI vira read-only). Não forçar redirect.
4. Guard de mutação **client-side** (não substitui RLS):
   ```ts
   export function assertAdmin(isAdmin: boolean): void {
     if (!isAdmin) throw new DomainError('UNAUTHORIZED', 'Faça login para executar esta ação.')
   }
   ```
   Toda mutation function (`useMutation`) chama `assertAdmin` **antes** do write.
5. Componentes de escrita: `{isAdmin && <Button>...</Button>}`. Visitante não vê o botão.
6. `/login` autenticado: `<Navigate to="/" replace />`.
7. Não usar `persistSession: false`. Default do client (localStorage) permanece.
8. Email do admin **não** é hardcoded. Qualquer user Auth criado no Dashboard entra como admin.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Senha errada | Form error + toast; não limpar email |
| Rede | Toast `Não foi possível entrar.` |
| Sessão expira no meio de um save | RLS 401/403 → `UNAUTHORIZED` + toast; `onAuthStateChange` zera session; botões desaparecem |
| Duplo submit login | Disable botão enquanto `isPending` |
| Visitante acessa `/login` | Formulário normal |
| Usuário autenticado abre `/login` | Redirect `/` |
| `isLoading` true | Header não pisca “Entrar” então “Sair”: mostrar skeleton 32px no slot de auth |
| Tab múltiplas | `onAuthStateChange` sincroniza logout |

Não implementar MFA, OAuth, magic link.

## 5. Acceptance Criteria / Verification Checklist

- [ ] Sem login: páginas de listagem abrem; nenhum botão de criar/editar/excluir/gerar/finalizar visível.
- [ ] Login válido redireciona para `/` e mostra “Sair”.
- [ ] Login inválido não redireciona; mensagem `E-mail ou senha inválidos.`
- [ ] Logout remove ações de escrita sem crash.
- [ ] Anon INSERT via client falha (RLS) mesmo se alguém chamar a API direto.
- [ ] `assertAdmin(false)` lança `DomainError` code `UNAUTHORIZED`.
- [ ] `/login` com sessão → `/`.
- [ ] Não existe tela de cadastro.
