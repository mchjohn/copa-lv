# COPA LV

Plataforma para gerenciar campeonatos de eSports / retrogaming da **Copa Lagoinha de Videogame**. Cadastro de jogadores, torneios em formato **Round Robin** (todos contra todos), lançamento de resultados, classificação em tempo real e pódio.

Visitantes navegam em modo leitura; administradores autenticados fazem CRUD e operam partidas.

## Funcionalidades

- **Jogadores** — banco global com avatar (upload ou DiceBear)
- **Torneios** — rascunho, roster, modalidades 1v1 / 3 / 4 jogadores por partida
- **Chaves** — geração automática de combinações e rodadas (domínio puro + testes)
- **Resultados** — registrar e editar colocações por partida
- **Leaderboard** — tabela agregada com atualização via Supabase Realtime
- **Finalização** — encerrar torneio e exibir pódio

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8 |
| UI | Tailwind CSS v4, shadcn/ui, Framer Motion |
| Dados | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Estado servidor | TanStack Query v5 |
| Rotas | React Router v8 |
| Testes | Vitest, Testing Library |

Decisões travadas: [`docs/specs/00-decisoes.md`](docs/specs/00-decisoes.md).

## Pré-requisitos

- Node.js 20+
- Projeto no [Supabase](https://supabase.com) com Auth (conta admin criada no Dashboard)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, para migrations e `gen types`)

## Configuração local

1. Instale dependências:

   ```bash
   npm install
   ```

2. Copie o exemplo de variáveis e preencha a URL e a anon key do projeto:

   ```bash
   cp .env.example .env
   ```

   | Variável | Descrição |
   | --- | --- |
   | `VITE_SUPABASE_URL` | URL do projeto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) — nunca use service role no client |

3. Aplique o schema no banco. O DDL canônico está em [`supabase/migrations/20251016180000_init.sql`](supabase/migrations/20251016180000_init.sql) (SQL Editor do Supabase ou `supabase db push` com projeto linkado). Detalhes em [`docs/specs/02-database.md`](docs/specs/02-database.md).

4. Gere os tipos TypeScript do banco (após o schema aplicado):

   ```bash
   supabase gen types typescript --linked > src/types/database.ts
   ```

5. Suba o app:

   ```bash
   npm run dev
   ```

Rotas principais: `/tournaments`, `/players`, `/login`.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Typecheck + build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest em modo watch |
| `npm run test:run` | Vitest uma vez (CI) |

## Estrutura do código

```
src/
  app/           # layout, router, providers
  components/    # UI compartilhada e primitives shadcn
  domain/        # lógica pura (round robin, pontos, leaderboard, …)
  features/      # telas e APIs por capacidade (auth, players, tournaments, …)
  lib/           # Supabase, env, query client, utils
  types/         # contratos de domínio e (gerado) database.ts
docs/
  especificacao_do_projeto.md   # visão de produto
  specs/                        # specs SDD de implementação (fonte de verdade)
```

## Permissões

- **Público (anônimo):** somente leitura (RLS `SELECT` liberado).
- **Autenticado:** qualquer sessão válida do Supabase Auth atua como admin (CRUD completo).

Políticas e tabelas: spec [`04-auth`](docs/specs/04-auth.md) e [`02-database`](docs/specs/02-database.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/especificacao_do_projeto.md`](docs/especificacao_do_projeto.md) | Requisitos e visão de produto |
| [`docs/specs/README.md`](docs/specs/README.md) | Índice das specs SDD e ordem de implementação |
| [`docs/specs/00-decisoes.md`](docs/specs/00-decisoes.md) | ADRs (stack, round robin, pontuação, ciclo de vida) |

Em conflito pontual entre a spec narrativa e `docs/specs/`, **as specs numeradas prevalecem**.
