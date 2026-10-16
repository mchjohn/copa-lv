# 08 — Lançamento e edição de resultados

## 1. Context & Objective

Painel de partidas por rodada; modal para definir colocações distintas `1..size`; persistir `points_earned` via função pura; marcar partida `completed`. Edição permitida somente se o torneio está `in_progress`.

## 2. Inputs / Outputs & Types

```ts
export function pointsForPlacement(args: {
  tournamentK: PlayersPerMatch
  matchSize: 2 | 3 | 4
  placement: number
}): number

export function assertValidPlacements(
  playerIds: readonly Uuid[],
  placements: ReadonlyArray<{ playerId: Uuid; placement: number }>,
): void
```

Tabela de pontos (ADR-10):

```
matchSize 2 → placement 1:1, 2:0
matchSize 3 → 1:2, 2:1, 3:0
matchSize 4 → 1:3, 2:2, 3:1, 4:0
```

`tournamentK` **não** altera a tabela se `matchSize` já for o tamanho real da partida. (O caso k=4 com 3 players usa `matchSize=3` → 2/1/0.) Se `tournamentK` e `matchSize` forem inconsistentes (ex. k=2 e matchSize=4), lançar `VALIDATION` `Partida incompatível com a modalidade.` Regras de consistência:

- `k=2` ⇒ `matchSize === 2`
- `k=3` ⇒ `matchSize === 3`
- `k=4` ⇒ `matchSize === 3 || matchSize === 4`

`SaveMatchResultInput` (spec 03).

API: `saveMatchResult(input): Promise<void>`

Query keys: `['matches', tournamentId]`, `['match', matchId]`, `['leaderboard', tournamentId]`.

### Fetch do painel

Uma query: matches do torneio `ORDER BY round_number ASC, created_at ASC`, com `match_players` + join `players` (nome, avatar).

Tipo UI:

```ts
interface MatchCard {
  match: Match
  players: Array<{
    playerId: Uuid
    name: string
    avatar_url: string
    placement: number | null
    points_earned: number | null
  }>
}
```

Ordenar players no card: se pending, `name` ASC; se completed, `placement` ASC.

## 3. Step-by-Step Logic & Rules

### `pointsForPlacement`

1. Validar consistência k vs matchSize (acima).
2. Validar `placement` inteiro em `1..matchSize`.
3. Arrays:
   - size 2: `[1, 0][placement-1]`
   - size 3: `[2, 1, 0][placement-1]`
   - size 4: `[3, 2, 1, 0][placement-1]`

### `assertValidPlacements`

1. `placements.length === playerIds.length`.
2. Set de `playerId` em placements **igual** ao set de `playerIds` (sem extra, sem falta).
3. Set de `placement` === `{1, 2, …, size}` (sem duplicata, sem furo).

Falha → `VALIDATION` `Defina colocações distintas do 1º ao último.`

### `saveMatchResult`

1. `assertAdmin`.
2. Load match + tournament + match_players.
3. Se match/tournament ausente → `NOT_FOUND`.
4. Se `tournament.status !== 'in_progress'` → `MATCH_NOT_EDITABLE` (vale para pending e completed).
5. `assertValidPlacements`.
6. `matchSize = match_players.length` as 2|3|4 (se 1 ou >4 → `VALIDATION`).
7. Para cada placement, `points = pointsForPlacement({ tournamentK, matchSize, placement })`.
8. Update **cada** `match_players` row: `placement`, `points_earned`.
9. Update match `status = 'completed'` **sempre** (mesmo se já era `completed`). O UPDATE é obrigatório para disparar Realtime na spec 09 (touch da row). Recalc de pontos é permitido em `in_progress`.
10. Toast: primeira conclusão `Resultado salvo.`; se já completed `Resultado atualizado.`
11. Invalidate matches + leaderboard.

Não recalcular outras partidas. Não atualizar a view (é derivada).

### UI

- Agrupar cards por `Rodada {n}`.
- Badge partida: `Pendente` (amarelo/amber) se pending; `Concluído` (green `#22c55e`) se completed.
- Card mostra avatares + nomes; se completed, placement e pontos (`1º · 3 pts`).
- CTA admin: `Lançar resultado` (pending) ou `Editar resultado` (completed) — ambos abrem o mesmo modal.
- Modal: para cada jogador, `Select` de colocação. Opções `1º`, `2º`, … `Nº`. Ao escolher um valor já usado por outro jogador, **limpar** o select do outro (não permitir duplicata no estado local).
- Submit disabled enquanto algum jogador está sem colocação.
- Visitante: cards visíveis, sem CTAs.
- Torneio `completed`: somente leitura (spec 10); `saveMatchResult` recusa.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Empate tentado (dois 1º) | submit impossível; se API chamada direto, `VALIDATION` |
| Partida 3 em k=4 | pontos 2/1/0 |
| Partida 4 em k=4 | 3/2/1/0 |
| Editar 1º↔2º | points_earned reescritos; leaderboard muda |
| Torneio completed | `MATCH_NOT_EDITABLE` |
| Draft (não deveria haver matches) | se houver dado órfão, `MATCH_NOT_EDITABLE` |
| Race: dois admins (não há; uma conta) | last write wins |
| `placement` 0 | `VALIDATION` |
| Anon | sem modal |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Vitest `pointsForPlacement` matriz completa (k, size, placement) incluindo throw em inconsistência.
- [ ] Vitest `assertValidPlacements` aceita permutação 2,1,3 e rejeita 1,1,2 e 1,2.
- [ ] Save pending → match `completed` e points corretos no banco.
- [ ] Re-save troca pontos; view soma o novo valor (não duplica).
- [ ] Save com torneio `completed` falha.
- [ ] UI agrupa por rodada; badges corretos.
- [ ] Modal impede placements duplicados na UI.
- [ ] Anônimo não vê botões de lançar/editar.
- [ ] Toasts `Resultado salvo.` / `Resultado atualizado.`
