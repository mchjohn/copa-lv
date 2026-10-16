# 01 — Stack e tooling

## 1. Context & Objective

Configurar o app Vite existente para a stack travada em ADR-01, sem implementar domínio. Objetivo: um skeleton que builda, com path aliases, env tipado, cliente Supabase e providers globais, pronto para as specs `02`–`11`.

**Não fazer nesta spec:** tabelas, telas de negócio, Round Robin.

## 2. Inputs / Outputs & Types

### Inputs

- Repo: Vite 8 + React 19 + TypeScript (`package.json` atual).
- Credenciais locais (nunca commitadas):

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Arquivo `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env` e `.env.local` permanecem no `.gitignore`.

### Outputs (artefatos obrigatórios)

| Artefato | Caminho |
| --- | --- |
| Cliente Supabase | `src/lib/supabase.ts` |
| Query client | `src/lib/query-client.ts` |
| Alias `@/` | `tsconfig.app.json` + `vite.config.ts` → `src/` |
| CSS global + tokens | `src/index.css` (Tailwind v4 `@import "tailwindcss"`) |
| Providers | `src/app/providers.tsx` |
| Router root | `src/app/router.tsx` (rotas placeholder até `11`) |
| UI primitives shadcn | `src/components/ui/` |
| Toaster | `src/components/ui/sonner.tsx` (ou equivalente shadcn) |

### Dependências permitidas (exatas de propósito, versões major)

**runtime:** `react`, `react-dom`, `react-router` (v7), `@tanstack/react-query`, `@supabase/supabase-js`, `framer-motion`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`

**dev:** `tailwindcss` v4, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `jsdom`, `tw-animate-css` (se o scaffold shadcn exigir)

shadcn: inicializar com o CLI oficial contra Vite + Tailwind v4. Componentes mínimos nesta spec: `button`, `input`, `label`, `dialog`, `badge`, `toast/sonner`, `dropdown-menu`, `separator`, `avatar`, `card`, `table`, `select`, `tabs`.

**Proibido:** Next.js, axios, zustand, redux, styled-components, MUI, TanStack Router.

### Types

```ts
export type Uuid = string

export function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}
```

`src/lib/supabase.ts` exporta `supabase` criado com `createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('VITE_SUPABASE_ANON_KEY'))`.

Após `02-database`, tipos gerados em `src/types/database.ts` (não inventar esse arquivo agora se o gen ainda não rodou; a spec `03` consome).

## 3. Step-by-Step Logic & Rules

1. Instalar Tailwind v4 via plugin oficial Vite (`@tailwindcss/vite`) em `vite.config.ts`. Remover CSS de template em `src/App.css` do bootstrap (não deixar o counter Vite).
2. Configurar `@` → `src` em `vite.config.ts` (`resolve.alias`) e `tsconfig.app.json` (`paths`).
3. Inicializar shadcn (style: default, base color: slate, CSS variables: true, dark mode: class no `html`).
4. Forçar dark mode: `document.documentElement.classList.add('dark')` no boot (`src/main.tsx`). Sem toggle de tema.
5. Tokens em `src/index.css` (CSS variables). Paleta canônica (RGB/HSL equivalentes):
   - `--background`: `#0f172a`
   - `--foreground`: slate-100
   - `--primary` / acento neon: cyan `#22d3ee`
   - `--accent` purple: `#8b5cf6`
   - `--success` neon green: `#22c55e`
   - `--destructive`: vermelho acessível sobre dark
6. Criar `QueryClient` com `staleTime: 30_000`, `retry: 1`. Provider em `providers.tsx`.
7. `BrowserRouter` + `QueryClientProvider` + `Toaster` (posição `top-right`, tema dark).
8. `src/main.tsx` renderiza `Providers` → `Router`. Substituir o conteúdo de `App.tsx` por um export re-export do router **ou** deletar `App.tsx` se o router for a raiz (uma única raiz).
9. Adicionar script `"test": "vitest"` e `"test:run": "vitest run"`. Config Vitest: environment `jsdom`, alias `@` igual ao Vite.
10. Pasta `src/domain/` vazia com `.gitkeep` (funções puras entram nas specs 05 e 07).
11. Pasta `src/features/` vazia com `.gitkeep`.
12. Não commitar service role key. Somente anon key no client.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Env ausente em `dev` | `requireEnv` lança no import do cliente; a app não monta um client “meio” configurado. |
| Env ausente em `build` | `vite build` pode passar; falha em runtime no boot. Documentar no README do repo (frase única: copiar `.env.example`). |
| HMR + Tailwind | Classes shadcn devem gerar CSS; se `@source` for necessário no Tailwind v4, incluir `./src/**/*.{ts,tsx}`. |
| Conflito React Compiler (já no template) | Manter o plugin Babel existente; não desligar. |

Erros de tooling não usam o union de domínio (`03`). Falhas de boot são `Error` nativo.

## 5. Acceptance Criteria / Verification Checklist

- [ ] `npm run build` (`tsc -b && vite build`) passa após as mudanças.
- [ ] `npm run test:run` executa Vitest (pode ser suíte vazia, exit 0).
- [ ] `src/lib/supabase.ts` existe e usa apenas anon key.
- [ ] `.env.example` listado; secrets não estão no git.
- [ ] Alias `import { cn } from '@/lib/utils'` resolve (`cn` = `twMerge(clsx(...))`).
- [ ] `html` tem class `dark`; fundo da página é `#0f172a`.
- [ ] Componentes shadcn listados existem em `src/components/ui/`.
- [ ] Nenhuma dependência fora da lista permitida.
- [ ] Template Vite (counter, logos) removido da UI raiz.
- [ ] Providers: Router + Query + Toaster montados uma vez.
