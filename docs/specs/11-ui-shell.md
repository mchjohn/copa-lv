# 11 — UI shell, rotas, design system

## 1. Context & Objective

Casca visual única (dark eSports), navegação desktop/mobile, toasts, badges e motion transversais. Alinha rotas das specs 04–10. Pode iniciar após `01`; **fechar rotas** só quando 04–10 existirem.

## 2. Inputs / Outputs & Types

### Rotas (`src/app/router.tsx`)

| path | element | auth |
| --- | --- | --- |
| `/login` | `LoginPage` | público; redirect `/` se sessão |
| `/` | Navigate → `/tournaments` | público |
| `/tournaments` | `TournamentsPage` | público |
| `/tournaments/new` | `TournamentNewPage` | admin; senão `/login` |
| `/tournaments/:id` | `TournamentDetailPage` | público |
| `/tournaments/:id/edit` | `TournamentEditPage` | admin + draft; senão detalhe ou `/login` |
| `/players` | `PlayersPage` | público |
| `*` | `NotFoundPage` texto `Página não encontrada.` + link início | público |

Layout `src/app/AppLayout.tsx`: header + `<Outlet />` + footer mínimo `COPA LV`.

### Navegação

Header:

- Marca `COPA LV` → `/tournaments`
- Link `Campeonatos` → `/tournaments`
- Link `Jogadores` → `/players`
- Slot auth (spec 04)
- Mobile: menu hamburger (`Sheet` shadcn) com os mesmos links. Breakpoint `md` (768px): nav horizontal.

Link ativo: cor cyan, `aria-current="page"`.

### Tokens (já em 01; repetir para a IA de UI)

| Token | Valor |
| --- | --- |
| Background | `#0f172a` |
| Surface / card | `#1e293b` |
| Acento cyan | `#22d3ee` |
| Purple | `#8b5cf6` |
| Neon green | `#22c55e` |
| Texto | slate-100 |
| Texto muted | slate-400 |
| Radius card | `0.75rem` |
| Font | sans do shadcn (Inter se o scaffold puxar; senão system-ui). **Não** instalar fonte extra se Inter já vier. |

### Componentes compartilhados

| Componente | Path | Uso |
| --- | --- | --- |
| `StatusBadge` | `src/components/status-badge.tsx` | tournament + match |
| `EmptyState` | `src/components/empty-state.tsx` | listas vazias |
| `PageHeader` | `src/components/page-header.tsx` | título + description + actions |
| `RequireAdmin` | `src/features/auth/RequireAdmin.tsx` | wrapper de rotas write |
| `cn` | `src/lib/utils.ts` | classes |

Match badges (spec 08): Pendente amber; Concluído green.

Toasts (sonner): success (create/save), error (`DomainError.message`), sem duration custom < 2s (default sonner ok).

### Motion

- Dialog/Sheet: default shadcn (ok).
- Leaderboard: `layout` nas linhas (09).
- Pódio: stagger (10).
- Não animar a página inteira no route change (evita nausea em tablet).

## 3. Step-by-Step Logic & Rules

1. `AppLayout` `min-h-dvh` `bg-background` `text-foreground`.
2. Main: `container mx-auto max-w-6xl px-4 py-6`.
3. `RequireAdmin`: se `isLoading` → skeleton full-page 8 linhas; se `!isAdmin` → `<Navigate to="/login" replace />`.
4. `TournamentEditPage`: fetch tournament; se `!draft` → `<Navigate to={`/tournaments/${id}`} replace />`.
5. 404: não usar o template Vite.
6. Imagens: `object-cover`; capas nos cards `aspect-video`.
7. Acessibilidade: botões com texto visível ou `aria-label`; dialogs com título.
8. Toque: alvos ≥ 40px no mobile para CTAs primários.
9. Idioma: todas as strings de UI em pt-BR (incluindo `NotFound`, tabs, labels).
10. Favicon: pode permanecer o do Vite na v1 (não bloquear).

Mapear `DomainError` em mutations:

```ts
onError: (err) => {
  const message = err instanceof DomainError ? err.message : 'Algo deu errado.'
  toast.error(message)
}
```

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| ID inválido em `:id` | query `NOT_FOUND` → página `Campeonato não encontrado.` + link listas |
| Offline | TanStack mostra erro na query; `EmptyState` com `Falha ao carregar.` + retry |
| Viewport 375px | nav hamburger; pódio em row sem overflow horizontal (scale avatares) |
| Viewport 1280px | nav inline; detalhe torneio: grid `lg:grid-cols-[1fr_360px]` partidas \| leaderboard |
| Reduced motion | respeitar `prefers-reduced-motion`: pódio e layout animations `duration: 0` (Framer `useReducedMotion`) |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Todas as rotas da tabela existem e renderizam o layout.
- [ ] `/tournaments/new` anônimo → `/login`.
- [ ] Header marca + 2 links + auth; mobile hamburger.
- [ ] Fundo `#0f172a`; acentos cyan/purple/green usados em badges/CTA.
- [ ] `DomainError` vira `toast.error` com a mensagem da spec 03.
- [ ] 404 própria em pt-BR.
- [ ] Detalhe `lg+`: partidas e leaderboard lado a lado; mobile empilhado (partidas depois pódio/leaderboard no completed; em in_progress leaderboard acima ou abaixo — **regra:** mobile order: pódio se completed → leaderboard → partidas).
- [ ] `useReducedMotion` desliga stagger do pódio.
- [ ] Sem strings de UI em inglês (exceto nomes próprios COPA LV).
- [ ] Container não ultrapassa `max-w-6xl`.
