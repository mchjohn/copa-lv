# 07 — Motor de partidas (classificatória 3× + fila 1 TV)

## 1. Context & Objective

Ao clicar “Gerar Chaves e Iniciar Torneio”, transicionar `draft` → `in_progress` e persistir todas as partidas **classificatórias** (`M = (N × 3) / k`), cada uma com `k` jogadores, ordenadas para execução **sequencial em 1 TV** com revezamento justo.

Núcleo: funções puras em `src/domain/round-robin.ts` + testes Vitest **antes** da API Supabase.

Contexto de produto: evento ~3 h, **12 jogadores**, **1 tela** — ver ADR-03 a ADR-05 e ADR-12.

## 2. Inputs / Outputs & Types

```ts
import type { Uuid, PlayersPerMatch, MatchPhase } from '@/types/domain'

export function qualifyingMatchCount(n: number, k: PlayersPerMatch): number {
  return (n * 3) / k
}

export function canGenerateKeys(n: number, k: PlayersPerMatch): boolean {
  // ADR-04
}

export function buildQualifyingMatches(
  playerIds: readonly Uuid[],
  k: PlayersPerMatch,
): Uuid[][] {
  // length === qualifyingMatchCount(n, k); cada item length === k
}

export function scheduleSequentialOneTv(matches: readonly Uuid[][]): ScheduledMatch[] {
  // roundNumber 1..matches.length; uma partida por round
}

export interface ScheduledMatch {
  playerIds: Uuid[]
  roundNumber: number
  phase: MatchPhase // sempre 'qualifying' aqui
}

export function generateBracket(
  playerIds: readonly Uuid[],
  k: PlayersPerMatch,
): ScheduledMatch[]

export function buildFinalMatch(
  topPlayerIds: readonly Uuid[], // length === k, já na ordem do rank
  afterRoundNumber: number,
): ScheduledMatch // phase 'final', roundNumber === afterRoundNumber + 1
```

`generateBracket` é a fachada usada por `startTournament`.

Persistência: `startTournament(tournamentId: Uuid): Promise<void>` em `src/features/tournaments/start-tournament.ts`.

Criação da final (após classificatória): `ensureFinalMatch(tournamentId: Uuid): Promise<void>` em `src/features/tournaments/ensure-final-match.ts` (disparada pela spec 08 ao concluir a última classificatória se `include_final_match`).

## 3. Step-by-Step Logic & Rules

### 3.1 Funções puras (ordem de implementação)

**A. `qualifyingMatchCount(n, k)`**

- Retornar `(n * 3) / k` assumindo pré-condição `canGenerateKeys`.
- Implementação inteira (não float).

**B. `canGenerateKeys(n, k)`** (ADR-04)

- `k = 2`: `n >= 2` e `(n * 3) % 2 === 0`
- `k = 3`: `n >= 3` e `(n * 3) % 3 === 0` (equivalente a `n` inteiro qualquer ≥ 3)
- `k = 4`: `n >= 4` e `(n * 3) % 4 === 0`

Não chamar backtracking aqui; apenas regras fechadas +, nos testes, `generateBracket` valida existência.

**C. Ordenação de jogadores**

```ts
const sorted = [...playerIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
```

Comparação lexicográfica de string UUID. **Não** usar `localeCompare`.

**D. `buildQualifyingMatches(sorted, k)`**

Objetivo: produzir exatamente `M = qualifyingMatchCount(n, k)` arrays de tamanho `k` tal que cada id em `sorted` apareça **exatamente 3 vezes** no multiset união de todas as chaves.

Algoritmo determinístico — **backtracking**:

1. `target = 3` aparições por jogador; `counts` map zerado.
2. `matches = []`.
3. `search()`:
   - Se `matches.length === M`: sucesso se todo `counts[id] === 3`; senão falha.
   - Gerar candidatos: todas as combinações de `k` ids distintos com `counts[id] < 3`, na **ordem lexicográfica** dos índices em `sorted` (reutilizar helper `combinations` interno se útil).
   - Para cada candidato na ordem: incrementar counts, push, recursar; ao falhar, backtrack.
4. Se nenhuma solução: lançar `DomainError('NOT_ENOUGH_PLAYERS', …)` (não deveria ocorrer quando ADR-04 passa; testar `n=12` nas três modalidades).

**E. `scheduleSequentialOneTv(matches)`**

Entrada: `matches` na ordem estável produzida por `buildQualifyingMatches` (índice original `0..M-1` preservado para desempate).

Estado: `lastRound[playerId]` = último `roundNumber` em que jogou, ou `0` se nunca.

Enquanto houver partidas não agendadas:

1. Para cada partida candidata `P`, calcular `bottleneck(P) = min_{p ∈ P} (currentRound - lastRound[p])` onde jogadores que nunca jogaram tratam `lastRound[p] = 0` e `currentRound = scheduled.length + 1` **antes** de atribuir — na prática, para a primeira partida todos têm “espera” máxima; usar `wait(p) = scheduled.length - (lastRound[p] || 0)` com `lastRound` inicial 0 e após cada assign atualizar para o `roundNumber` atribuído.
2. Escolher a partida com **maior** `bottleneck` (prioriza quem mais espera no grupo).
3. Desempate 1: menor tupla lexicográfica de UUIDs da chave.
4. Desempate 2: menor índice original em `matches`.
5. Atribuir `roundNumber = scheduled.length + 1`, atualizar `lastRound` dos jogadores, remover da pilha.

Emitir `{ playerIds, roundNumber, phase: 'qualifying' }`.

Invariantes:

- `roundNumber` único e contínuo `1..M`.
- Cada partida mantém o mesmo multiset de jogadores da entrada (apenas reordena na fila).

**F. `generateBracket(playerIds, k)`**

```
n = playerIds.length
if (!canGenerateKeys(n, k)) throw NOT_ENOUGH_PLAYERS
sorted = sortUuid(playerIds)
raw = buildQualifyingMatches(sorted, k)
return scheduleSequentialOneTv(raw)
```

**G. `buildFinalMatch(topPlayerIds, afterRoundNumber)`**

- `topPlayerIds.length === k` (validar; senão `VALIDATION`).
- Retornar uma única `ScheduledMatch`: `playerIds` na ordem do rank (não reordenar por UUID), `phase: 'final'`, `roundNumber: afterRoundNumber + 1`.

**H. Cardinalidade (N = 12, fixture obrigatória)**

| k | M | Aparições/jogador |
| --- | --- | --- |
| 2 | 18 | 3 |
| 3 | 12 | 3 |
| 4 | 9 | 3 |

Testes Vitest devem assertar `generateBracket` com 12 UUIDs fixos (snapshot commitado) para cada `k`: total de partidas, contagem por jogador === 3, `roundNumber` 1..M sem buracos, uma partida por round.

### 3.2 Persistência `startTournament`

Executar **nesta ordem**; abortar se qualquer passo falhar.

1. `assertAdmin`.
2. Load tournament by id. 0 rows → `NOT_FOUND`.
3. Se `status !== 'draft'` → `TOURNAMENT_NOT_DRAFT`.
4. Load roster `player_id[]`. `n = length`.
5. `k = asPlayersPerMatch(tournament.players_per_match)`.
6. Se `!canGenerateKeys(n, k)` → `NOT_ENOUGH_PLAYERS` (mensagem ADR-04).
7. `bracket = generateBracket(playerIds, k)`.
8. Checar de novo `status === 'draft'` (race): `UPDATE tournaments SET status = 'in_progress' WHERE id = $id AND status = 'draft'`. Se `count === 0` → `TOURNAMENT_NOT_DRAFT`.
9. Insert `matches`: para cada item de `bracket`, `{ tournament_id, round_number, status: 'pending', phase: 'qualifying' }`. Preservar ordem do array.
10. Insert `match_players` como antes (`placement` / `points_earned` null).
11. Compensação em falha 9/10: delete matches do torneio + `status = 'draft'`.
12. Toast `Chaves geradas. Campeonato iniciado.` Invalidate `['tournaments', id]`, `['matches', id]`.

**Não** inserir partida final no start. **Não** criar byes.

### 3.3 `ensureFinalMatch` (resumo; detalhe na spec 08)

1. Load tournament; se `!include_final_match` ou já existe match `phase = 'final'` → return.
2. Se alguma classificatória `pending` → return (ou `VALIDATION` se chamada manual).
3. `rank = rankLeaderboard(view_leaderboard rows)`; `top = rank.slice(0, k).map(r => r.player_id)`.
4. `M = max(round_number)` das classificatórias.
5. Insert final match + `match_players` via `buildFinalMatch(top, M)`.

### 3.4 UI (detalhe em 08)

- Botão visível só se `isAdmin && status === 'draft'`.
- Disabled se `!canGenerateKeys(n, k)` com ajuda: `Cada jogador precisa de 3 partidas classificatórias. Ajuste o elenco ou a modalidade.`
- No formulário de criação (spec 06): ao mudar modalidade, mostrar texto dinâmico com `M` para **N atual do roster** (ex.: `12 jogadores → 9 partidas na TV`).
- Confirm dialog: `Gerar {M} partidas classificatórias para {n} jogadores? O elenco será congelado.`

## 4. Edge Cases & Error Handling

| Caso | Esperado |
| --- | --- |
| `N=12, k=2` | 18 partidas; 3 aparições/jogador; rounds 1..18 |
| `N=12, k=3` | 12 partidas; rounds 1..12 |
| `N=12, k=4` | 9 partidas; rounds 1..9 |
| `k=2, n=3` | `canGenerateKeys` false `(9%2≠0)` |
| `k=4, n=3` | false (`n < 4`) |
| `k=4, n=5` | false `(15%4≠0)` |
| `k=2, n=2` | `M=3`; cada um joga 3 duelos (repetição de confronto permitida) |
| IDs fora de ordem na entrada | mesmo bracket que entrada sorted |
| Duas chamadas start | segunda `TOURNAMENT_NOT_DRAFT` |
| Backtracking sem solução | `NOT_ENOUGH_PLAYERS` (raro se ADR-04 ok) |
| Schedule fairness | teste: em fixture N=12 k=4, nenhum jogador tem gap > limite documentado no snapshot (assertar `maxGap` ≤ 4 ou valor do snapshot) |

Removidos do modelo: `effectiveMatchSize`, empacotamento paralelo `packRounds`, byes, `C(n,k)` como contagem total.

## 5. Acceptance Criteria / Verification Checklist

- [ ] `src/domain/round-robin.ts` sem imports de React/Supabase.
- [ ] Vitest `qualifyingMatchCount(12,4)===9`, `(12,3)===12`, `(12,2)===18`.
- [ ] Vitest `canGenerateKeys` matriz ADR-04 (inclui `n=12` true para k=2,3,4).
- [ ] Vitest `generateBracket` N=12: contagem 3 por jogador para cada k; snapshots de ordem da fila.
- [ ] Vitest `scheduleSequentialOneTv`: uma partida por `roundNumber`; permutação das mesmas chaves.
- [ ] `startTournament` cria `M` rows `phase=qualifying`; não cria final.
- [ ] `status` → `in_progress`; segunda chamada falha.
- [ ] `n` inválido não altera status.
- [ ] Confirm + toast; roster congelado (`ROSTER_FROZEN`).
- [ ] `ensureFinalMatch` após última classificatória cria 1 row `phase=final` com top `k` (spec 08 integração).
