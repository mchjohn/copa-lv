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

## ADR-03 — Fase classificatória: 3 partidas por jogador (isonomia)

O formato **não** é mais “todos contra todos” via `C(n, k)`. O evento tipo COPA LV (referência: **12 jogadores**, **1 TV**, ~**3 h**) usa uma **fase classificatória** com carga fixa por atleta:

- Cada jogador inscrito joga **exatamente 3 partidas** classificatórias.
- Cada partida classificatória tem **exatamente `k`** jogadores (`k = players_per_match`: 2, 3 ou 4).
- Total de partidas classificatórias:

  `M = (N × 3) / k`  (inteiro obrigatório)

  Exemplos com **N = 12**:

  | Modalidade | k | M |
  | --- | --- | --- |
  | 1v1 | 2 | 18 |
  | 3 Players | 3 | 12 |
  | 4 Players | 4 | 9 |

- O motor de geração (spec 07) **monta** `M` chaves distintas (pares/trios/quartetos) tal que a contagem de aparições por jogador seja 3, de forma **100% determinística** (jogadores ordenados por UUID antes de qualquer escolha; desempates lexicográficos fixos).
- **Não** usar byes na classificatória: se não existir agendamento válido, bloquear “Gerar Chaves” (`NOT_ENOUGH_PLAYERS`).

## ADR-04 — Elegibilidade do elenco (validação matemática)

Bloquear “Gerar Chaves” quando:

| k | Mínimo de jogadores | Condição extra |
| --- | --- | --- |
| 2 | `N ≥ 2` | `(N × 3) % 2 === 0` |
| 3 | `N ≥ 3` | `(N × 3) % 3 === 0` |
| 4 | `N ≥ 4` | `(N × 3) % 4 === 0` |

Mensagem canônica (toast): `Número de jogadores incompatível com a modalidade. Cada jogador deve jogar exatamente 3 partidas classificatórias.`

**Revoga** o caso legado `N = 3` com `k = 4` e chave de 3 jogadores. Na classificatória, partida de modalidade 4 Players tem sempre **4** participantes.

O elenco de referência do produto é **N = 12** (valida as três modalidades acima).

## ADR-05 — Execução 1 TV (fila sequencial e revezamento)

Cenário físico: **uma única tela (TV)**. Na classificatória:

- Existe **no máximo uma partida em execução** por vez na fila operacional.
- `matches.round_number` na fase classificatória é a **ordem de exibição/execução** (`1 .. M`), não rodada paralela.
- Após montar as `M` chaves, o motor aplica `scheduleSequentialOneTv` (spec 07): reordena as partidas para **revezamento justo** — priorizar, a cada passo, a partida cujo jogador “mais esperando” (maior intervalo desde a última aparição na fila) tenha o menor atraso relativo ao grupo (heurística bottleneck documentada na spec 07). Empate → ordem lexicográfica dos UUIDs da chave; segundo empate → índice estável da geração.

**Não** empacotar várias partidas no mesmo `round_number` por ausência de conflito de jogadores (modelo antigo paralelo). Com 1 TV, **uma partida por `round_number`** na classificatória.

## ADR-06 — Ciclo de vida do torneio

```
draft → in_progress → completed
```

- Roster **congelado** ao gerar chaves (sem add/remove em `in_progress` / `completed`).
- **Proibido** regenerar chaves classificatórias.
- **Proibido** reabrir `completed` → `in_progress`.
- **Proibido** “resetar para rascunho”.
- Editar resultado de partida: somente enquanto o torneio está `in_progress`.
- Admin **pode excluir** torneio em qualquer status (CASCADE apaga partidas e roster).
- Finalizar: somente se **100%** das partidas obrigatórias estiverem `completed` (classificatória + grande final, se habilitada — ADR-12).

## ADR-07 — Resultados de partida

- Colocações `1 .. size` distintas e obrigatórias. Sem empate de placement.
- `placement` e `points_earned` em `match_players` são `NULL` até a partida ficar `completed`.

## ADR-08 — Jogadores

- Nome único **case-insensitive**; `trim` + colapsar espaços internos (`\s+` → um espaço).
- Avatar: upload **ou** DiceBear estilo **somente `avataaars`**, seed = nome normalizado, URL remota persistida em `avatar_url`.
- **Delete** somente se o jogador **não** estiver em nenhum `tournament_players` (qualquer status).
- Edição de nome: sempre permitida (revalida unicidade).

## ADR-09 — Leaderboard

View SQL `view_leaderboard` agrega pontos **somente de partidas `phase = 'qualifying'`** e `status = 'completed'`. A grande final **não** entra na soma da tabela classificatória (ADR-12).

**Posição** na tabela é calculada na aplicação após sort estável:

`total_points DESC`, `total_wins DESC`, `matches_played ASC`, `player_name ASC`.

Atualização: Supabase Realtime (`postgres_changes` em `matches` e `match_players`) + `invalidateQueries` após mutações.

## ADR-10 — Pontuação

Função pura `pointsForPlacement({ tournamentK, matchSize, placement })`:

| Condição | 1º | 2º | 3º | 4º |
| --- | --- | --- | --- | --- |
| `matchSize = 2` (torneio k=2) | 1 | 0 | — | — |
| `matchSize = 3` (k=3) | 2 | 1 | 0 | — |
| `matchSize = 4` (k=4) | 3 | 2 | 1 | 0 |

Na classificatória, `matchSize === k` sempre. Na grande final (`phase = 'final'`), `matchSize === k` com os `k` melhores do leaderboard classificatório.

`points_earned` é persistido em `match_players` no save do resultado. A view apenas soma linhas de partidas classificatórias `completed`.

## ADR-11 — Idioma e identificadores

UI: português do Brasil. Código, tabelas, rotas de arquivo, tipos: inglês.

## ADR-12 — Grande final (opcional; padrão em 4 Players)

- Coluna `tournaments.include_final_match` (boolean). **Default na criação:** `true` se `players_per_match = 4`, senão `false`. Editável apenas em `draft`.
- Quando `include_final_match = true`, após a **última** partida classificatória passar a `completed`, o sistema cria **uma** partida `phase = 'final'` com os **`k` primeiros** do `rankLeaderboard` (critérios ADR-09) no momento da criação. `round_number = M + 1` (continua a fila 1 TV).
- **Pódio oficial** (spec 10): se existir partida final `completed`, posições **1º–3º** vêm das colocações **1–3** dessa partida (`placement` 1 → campeão). Se `include_final_match = false`, pódio = top 3 do leaderboard classificatório (comportamento legado agregado).
- Finalizar campeonato exige classificatória completa **e**, se `include_final_match`, a final `completed`.
- Pontos da final **não** alteram `view_leaderboard` (classificação exibida permanece a da fase classificatória).
