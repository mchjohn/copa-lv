# 03 — Contratos de domínio (TypeScript)

## 1. Context & Objective

Centralizar tipos, erros e mapeamento PostgREST → domínio. Todo feature importar daqui (e de `src/types/database.ts`), nunca redeclarei unions de status.

## 2. Inputs / Outputs & Types

Arquivos:

- `src/types/database.ts` — gerado (spec 02). Não editar à mão.
- `src/types/domain.ts` — tipos da app.
- `src/types/errors.ts` — erros canônicos.
- `src/lib/map-supabase-error.ts` — mapper.

```ts
export type Uuid = string

export type TournamentStatus = 'draft' | 'in_progress' | 'completed'
export type MatchStatus = 'pending' | 'completed'
export type PlayersPerMatch = 2 | 3 | 4

export interface Player {
  id: Uuid
  name: string
  avatar_url: string
  created_at: string
}

export interface Tournament {
  id: Uuid
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
  status: TournamentStatus
  created_at: string
}

export interface TournamentPlayer {
  id: Uuid
  tournament_id: Uuid
  player_id: Uuid
  created_at: string
}

export interface Match {
  id: Uuid
  tournament_id: Uuid
  round_number: number
  status: MatchStatus
  created_at: string
}

export interface MatchPlayer {
  id: Uuid
  match_id: Uuid
  player_id: Uuid
  placement: number | null
  points_earned: number | null
}

export interface LeaderboardRow {
  tournament_id: Uuid
  player_id: Uuid
  player_name: string
  player_avatar: string
  matches_played: number
  total_wins: number
  total_points: number
}

export interface RankedLeaderboardRow extends LeaderboardRow {
  position: number
}

export type DomainErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'PLAYER_NAME_TAKEN'
  | 'PLAYER_IN_TOURNAMENT'
  | 'TOURNAMENT_NOT_DRAFT'
  | 'ROSTER_FROZEN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'MATCH_NOT_EDITABLE'
  | 'TOURNAMENT_NOT_COMPLETABLE'
  | 'NOT_FOUND'

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly details?: Record<string, unknown>
  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}

export interface CombinationMatch {
  playerIds: Uuid[]
  roundNumber: number
}

export type PointsTable = readonly number[]
```

Mensagens de `DomainError` (pt-BR, para toast):

| code | message |
| --- | --- |
| `UNAUTHORIZED` | `Faça login para executar esta ação.` |
| `VALIDATION` | específica no `message` (ex. nome vazio) |
| `PLAYER_NAME_TAKEN` | `Já existe um jogador com este nome.` |
| `PLAYER_IN_TOURNAMENT` | `Não é possível excluir um jogador vinculado a um campeonato.` |
| `TOURNAMENT_NOT_DRAFT` | `Só é possível alterar o elenco em campeonatos em rascunho.` |
| `ROSTER_FROZEN` | `O elenco deste campeonato está congelado.` |
| `NOT_ENOUGH_PLAYERS` | `Número de jogadores insuficiente para gerar as chaves.` |
| `MATCH_NOT_EDITABLE` | `Resultados só podem ser lançados enquanto o campeonato está em andamento.` |
| `TOURNAMENT_NOT_COMPLETABLE` | `Finalize somente quando todas as partidas tiverem resultado.` |
| `NOT_FOUND` | `Registro não encontrado.` |

### DTOs de escrita (app → Supabase)

```ts
export interface PlayerInsert {
  name: string
  avatar_url: string
}

export interface PlayerUpdate {
  name?: string
  avatar_url?: string
}

export interface TournamentInsert {
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
}

export interface SaveMatchResultInput {
  matchId: Uuid
  placements: ReadonlyArray<{ playerId: Uuid; placement: number }>
}
```

`TournamentInsert` não inclui `status` (default `'draft'`).

## 3. Step-by-Step Logic & Rules

1. `src/types/domain.ts` reexporta shapes **iguais** às colunas; `players_per_match` estreita para `2 \| 3 \| 4` com type guard:

```ts
export function asPlayersPerMatch(n: number): PlayersPerMatch {
  if (n === 2 || n === 3 || n === 4) return n
  throw new DomainError('VALIDATION', 'Modalidade inválida.')
}
```

2. `mapSupabaseError(error: { code?: string; message: string; status?: number }): DomainError`:
   - `status === 401` ou `status === 403` → `UNAUTHORIZED`
   - `code === '42501'` (RLS) → `UNAUTHORIZED`
   - `code === '23505'` e constraint/mensagem contém `players_name` → `PLAYER_NAME_TAKEN`
   - `code === '23503'` → `PLAYER_IN_TOURNAMENT` se a operação for delete de player; senão `VALIDATION`
   - `code === 'PGRST116'` (0 rows `.single()`) → `NOT_FOUND`
   - default → `VALIDATION` com `error.message`

3. Helpers de status:

```ts
export const isDraft = (s: TournamentStatus) => s === 'draft'
export const isInProgress = (s: TournamentStatus) => s === 'in_progress'
export const isCompleted = (s: TournamentStatus) => s === 'completed'
```

4. Não colocar lógica de Round Robin neste arquivo (spec 07).

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| `Database['public']['Tables']` diverge do domain | Re-gerar types; domain faz assert em runtime só em `players_per_match` e statuses via guards nas bordas de fetch |
| Fetch retorna `status` inesperado | Guard lança `VALIDATION` |
| `mapSupabaseError` recebe `null` | Não chamar; caller verifica `error` do client |
| Unique de `match_players` placement | Mapper pode deixar `VALIDATION`; spec 08 valida **antes** do write |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Arquivos `domain.ts`, `errors.ts`, `map-supabase-error.ts` existem.
- [ ] Union `DomainErrorCode` contém exatamente os 10 códigos listados.
- [ ] `DomainError` é `instanceof Error`.
- [ ] Teste Vitest: `23505` + nome de constraint de players → `PLAYER_NAME_TAKEN`.
- [ ] Teste: `42501` → `UNAUTHORIZED`.
- [ ] Teste: `PGRST116` → `NOT_FOUND`.
- [ ] `asPlayersPerMatch(4)` ok; `asPlayersPerMatch(5)` lança `VALIDATION`.
- [ ] Nenhum feature declara outro union de `TournamentStatus`.
