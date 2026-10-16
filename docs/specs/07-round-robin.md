# 07 — Motor Round Robin (geração de chaves)

## 1. Context & Objective

Ao clicar “Gerar Chaves e Iniciar Torneio”, transicionar `draft` → `in_progress` e persistir todas as partidas `C(n, k_efetivo)` empacotadas em rodadas de forma **100% determinística**.

Núcleo: funções puras em `src/domain/round-robin.ts` + testes Vitest **antes** da API Supabase.

## 2. Inputs / Outputs & Types

```ts
import type { Uuid, PlayersPerMatch, CombinationMatch } from '@/types/domain'

export function effectiveMatchSize(n: number, k: PlayersPerMatch): PlayersPerMatch {
  if (k === 4 && n === 3) return 3
  return k
}

export function canGenerateKeys(n: number, k: PlayersPerMatch): boolean {
  if (k === 2) return n >= 2
  if (k === 3) return n >= 3
  return n >= 3 // k === 4
}

export function combinations<T>(items: readonly T[], k: number): T[][] {
  // cada resultado é um array de length k
  // ordem: lexicográfica sobre os índices do array de entrada
}

export function packRounds(matches: readonly Uuid[][]): CombinationMatch[] {
  // matches[i] = playerIds da i-ésima combinação (já ordenados)
}

export function generateBracket(
  playerIds: readonly Uuid[],
  k: PlayersPerMatch,
): CombinationMatch[]
```

`generateBracket` é a fachada usada pela API.

Persistência: `startTournament(tournamentId: Uuid): Promise<void>` em `src/features/tournaments/start-tournament.ts`.

## 3. Step-by-Step Logic & Rules

### 3.1 Funções puras (ordem de implementação)

**A. `combinations(items, k)`**

- Se `k < 1` ou `k > items.length`, retornar `[]` (a fachada não chama nesse estado inválido exceto testes).
- Algoritmo iterativo ou recursivo clássico: índices crescentes `i0 < i1 < … < i(k-1)`.
- Cada combinação copia `items[i]` **na ordem dos índices** (não reordenar dentro da combinação além da ordem de `items`).

**B. Ordenação de jogadores**

```ts
const sorted = [...playerIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
```

Comparação lexicográfica de string UUID (formato canônico lowercase com hífens). **Não** usar locale.

**C. `effectiveMatchSize(n, k)`**

- `n === 3 && k === 4` → `3`
- senão → `k`

**D. `packRounds(matches)`**

Estado: `Map<roundNumber, Set<playerId>>` ocupação.

Para cada `playerIds` em `matches` (ordem do array):

1. `round = 1`
2. Enquanto existir jogador de `playerIds` já presente em `occupied.get(round)`, `round += 1`
3. Registrar todos os playerIds em `occupied[round]`
4. Emitir `{ playerIds, roundNumber: round }`

**E. `generateBracket(playerIds, k)`**

```
n = playerIds.length
if (!canGenerateKeys(n, k)) throw DomainError('NOT_ENOUGH_PLAYERS', ...)
sorted = sortUuid(playerIds)
size = effectiveMatchSize(n, k)
raw = combinations(sorted, size)
return packRounds(raw)
```

Cada `playerIds` em `raw` já está em ordem de `sorted`.

**F. Cardinalidade**

`raw.length === C(n, size)` onde `C(n,s) = n! / (s!(n-s)!)` (usar implementação inteira nos testes, não float).

Caso especial `n=3,k=4`: `C(3,3) = 1`.

### 3.2 Persistência `startTournament`

Executar **nesta ordem**; abortar se qualquer passo falhar (sem “meio start” visível: compensar).

1. `assertAdmin`.
2. Load tournament by id. 0 rows → `NOT_FOUND`.
3. Se `status !== 'draft'` → `TOURNAMENT_NOT_DRAFT`.
4. Load roster `player_id[]`. `n = length`.
5. `k = asPlayersPerMatch(tournament.players_per_match)`.
6. Se `!canGenerateKeys(n, k)` → `NOT_ENOUGH_PLAYERS`.
7. `bracket = generateBracket(playerIds, k)`.
8. Checar de novo `status === 'draft'` (race): `UPDATE tournaments SET status = 'in_progress' WHERE id = $id AND status = 'draft'`. Se `count === 0` → `TOURNAMENT_NOT_DRAFT`.
9. Insert `matches`: para cada item de `bracket`, uma row `{ tournament_id, round_number, status: 'pending' }`. Capturar ids na **mesma ordem** que `bracket` (insert um-a-um em loop, ou insert batch se a API devolver rows na ordem enviada — **obrigatório preservar ordem**: preferir loop sequencial).
10. Insert `match_players`: para cada partida, um row por player `{ match_id, player_id, placement: null, points_earned: null }`.
11. Se passo 9 ou 10 falhar: `DELETE FROM matches WHERE tournament_id = id` e `UPDATE tournaments SET status = 'draft' WHERE id` (compensação). Relançar erro.
12. Toast `Chaves geradas. Campeonato iniciado.` Invalidate `['tournaments', id]`, `['matches', id]`.

Não inserir `round_number = 0`. Não criar byes como rows.

### 3.3 UI

- Botão visível só se `isAdmin && status === 'draft'`.
- Disabled se `!canGenerateKeys(n, k)` com texto de ajuda: `Inclua pelo menos {min} jogadores.` onde `min` é 2 se k=2, senão 3.
- Confirm dialog: `Gerar chaves para {n} jogadores? O elenco será congelado.`
- Após sucesso, a página de detalhe passa a mostrar rodadas (spec 08 pode completar o painel; 07 deve listar partidas pending agrupadas por `round_number` asc, jogadores por nome).

## 4. Edge Cases & Error Handling

| Caso | Esperado |
| --- | --- |
| `k=2, n=2` | 1 partida, round 1, 2 players |
| `k=2, n=3` | `C(3,2)=3` partidas. Packing: round 1 uma partida (2 players, 1 bye); outras partidas em rounds seguintes. Nunca 2 partidas no mesmo round (só 3 players). |
| `k=2, n=4` | `C(4,2)=6`. Round 1 pode ter 2 partidas disjuntas. |
| `k=3, n=3` | 1 partida size 3, round 1 |
| `k=3, n=2` | `NOT_ENOUGH_PLAYERS` |
| `k=4, n=3` | 1 partida size 3 (não 4), round 1 |
| `k=4, n=2` | `NOT_ENOUGH_PLAYERS` |
| `k=4, n=4` | `C(4,4)=1` partida com 4 |
| `k=4, n=5` | `C(5,4)=5` partidas de **4** (não criar chave de 3). Cada round comporta no máx 1 partida (5 players, 4 jogam, 1 bye). |
| IDs fora de ordem na entrada | saída idêntica à entrada já sorted — teste com shuffle |
| Duas chamadas start | a segunda recebe `TOURNAMENT_NOT_DRAFT` |
| Visitante | botão ausente; API `UNAUTHORIZED` |
| `status=completed` | `TOURNAMENT_NOT_DRAFT` |
| Combinations stability | mesmos IDs → mesmos `roundNumber` e mesmos grupos |

Fixture obrigatória de packing (`k=2`, ids `['a','b','c','d']` **após sort**; usar UUIDs reais no teste, aqui ilustrativo):

Se `sorted = [A,B,C,D]` com `A<B<C<D`, combinações 1v1 na ordem lex:

1. AB
2. AC
3. AD
4. BC
5. BD
6. CD

Packing greedy:

1. AB → round 1
2. AC → round 2 (A ocupado r1)
3. AD → round 3 (A em r1 e r2)
4. BC → round 3? B livre r1? B está em r1 (AB). C livre r1. BC precisa round sem B e C: r1 tem B → skip; r2 tem A,C → skip; r3 tem A,D → B e C livres → **round 3**
5. BD → …
6. CD → …

O teste **não** deve copiar uma tabela “inventada”: deve **executar** `packRounds` e travar o snapshot do resultado (Vitest `expect(result).toEqual(...)` gerado uma vez a partir da função, depois commitado). Incluir o snapshot explícito no teste após a primeira execução local.

Para revisão humana, o invariante a assertar sempre:

- União de players por round: conjuntos disjuntos.
- Toda combinação aparece exatamente uma vez.
- `roundNumber >= 1`.
- `max(round)` é o mínimo greedy (não precisa provar otimalidade global além do algoritmo especificado).

## 5. Acceptance Criteria / Verification Checklist

- [ ] Arquivo `src/domain/round-robin.ts` sem imports de React/Supabase.
- [ ] Vitest `combinations` de `[1,2,3,4], k=2` tem length 6 e primeira `[1,2]` última `[3,4]`.
- [ ] Vitest `canGenerateKeys` cobre a matriz k×n de 1..5.
- [ ] Vitest `effectiveMatchSize(3,4)===3`, `(5,4)===4`, `(4,4)===4`.
- [ ] Vitest shuffle de IDs → mesmo `generateBracket`.
- [ ] Vitest packing: nenhum player repetido no mesmo `roundNumber`.
- [ ] Vitest `n=5,k=4` → 5 matches, todas `playerIds.length===4`.
- [ ] `startTournament` em draft com roster válido cria `C(n,size)` rows em `matches` e `size` rows cada em `match_players` com nulls.
- [ ] Tournament `status` vira `in_progress`.
- [ ] Segunda chamada falha sem duplicar matches (compensação ou guard).
- [ ] `n` insuficiente não altera status.
- [ ] Confirm dialog + toast de sucesso.
- [ ] Roster não pode ser editado após sucesso (UI 06 + API `ROSTER_FROZEN`).
