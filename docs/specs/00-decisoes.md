# 00 — Decisões de arquitetura (ADRs)

Decisões **fechadas**. Specs `01`–`11` só as operacionalizam. Não reabrir sem atualizar este arquivo.

## ADR-01 — Stack frontend

Manter o template Vite + React 19 + TypeScript. Adicionar:

- Tailwind CSS v4
- shadcn/ui (Radix + Tailwind)
- React Router v7
- TanStack Query v5
- Framer Motion
- `@supabase/supabase-js`
- Types do banco: `supabase gen types typescript`

**Não** migrar para Next.js. **Não** usar TanStack Router, Zustand, Redux.

## ADR-02 — Autenticação

Uma conta admin (email + senha) criada manualmente no Supabase Dashboard.

- Qualquer sessão `authenticated` é administradora.
- Visitante anônimo: somente leitura.
- Rota `/login`. Sem magic link, PIN local ou tabela `admins`.
- RLS: `SELECT` público (`true`); `INSERT` / `UPDATE` / `DELETE` com `auth.role() = 'authenticated'`.

## ADR-03 — Round Robin = combinações C(n, k)

Cada subconjunto distinto de `k` jogadores joga **exatamente uma** partida.

- `k` efetivo = `players_per_match`, exceto o caso ADR-04.
- Jogadores ordenados por `id` UUID lexicográfico **antes** de gerar combinações.
- Empacotamento de rodadas: greedy determinístico (ADR-05).

## ADR-04 — Chave incompleta

Único caso permitido de partida com menos jogadores que `players_per_match`:

- `N = 3` e `players_per_match = 4` → gerar **uma** partida com `k_efetivo = 3` (pontos 2 / 1 / 0).

Bloquear “Gerar Chaves” se:

- `k = 2` e `N < 2`
- `k = 3` e `N < 3`
- `k = 4` e `N < 3`
- `k = 4` e `N = 2` (não gera chave de 2)

Mínimos: `k=2` → `N≥2`; `k=3` → `N≥3`; `k=4` → `N≥3`.

## ADR-05 — Rodadas e byes

Para cada partida na ordem das combinações, atribuir o menor `round_number >= 1` em que **nenhum** dos jogadores da partida já está alocado.

Jogador sem partida naquela rodada = **bye** (não criar partida extra, não atribuir pontos).

Não criar chaves de `k-1` para “fechar” rodada quando `N ≥ k`.

## ADR-06 — Ciclo de vida do torneio

```
draft → in_progress → completed
```

- Roster **congelado** ao gerar chaves (sem add/remove em `in_progress` / `completed`).
- **Proibido** regenerar chaves.
- **Proibido** reabrir `completed` → `in_progress`.
- **Proibido** “resetar para rascunho”.
- Editar resultado de partida: somente enquanto o torneio está `in_progress`.
- Admin **pode excluir** torneio em qualquer status (CASCADE apaga partidas e roster).
- Finalizar: somente se 100% das partidas estiverem `completed`.

## ADR-07 — Resultados de partida

- Colocações `1 .. size` distintas e obrigatórias. Sem empate de placement.
- `placement` e `points_earned` em `match_players` são `NULL` até a partida ficar `completed`.

## ADR-08 — Jogadores

- Nome único **case-insensitive**; `trim` + colapsar espaços internos (`\s+` → um espaço).
- Avatar: upload **ou** DiceBear estilo **somente `avataaars`**, seed = nome normalizado, URL remota persistida em `avatar_url`.
- **Delete** somente se o jogador **não** estiver em nenhum `tournament_players` (qualquer status).
- Edição de nome: sempre permitida (revalida unicidade).

## ADR-09 — Leaderboard

View SQL `view_leaderboard` agrega pontos. **Posição** é calculada na aplicação após sort estável:

`total_points DESC`, `total_wins DESC`, `matches_played ASC`, `player_name ASC`.

Atualização: Supabase Realtime (`postgres_changes` em `matches` e `match_players`) + `invalidateQueries` após mutações.

## ADR-10 — Pontuação

Função pura `pointsForPlacement({ tournamentK, matchSize, placement })`:

| Condição | 1º | 2º | 3º | 4º |
| --- | --- | --- | --- | --- |
| `matchSize = 2` (torneio k=2) | 1 | 0 | — | — |
| `matchSize = 3` (k=3 **ou** k=4 com 3 jogadores) | 2 | 1 | 0 | — |
| `matchSize = 4` (k=4 cheia) | 3 | 2 | 1 | 0 |

`points_earned` é persistido em `match_players` no save do resultado. A view apenas soma linhas de partidas `completed`.

## ADR-11 — Idioma e identificadores

UI: português do Brasil. Código, tabelas, rotas de arquivo, tipos: inglês.
