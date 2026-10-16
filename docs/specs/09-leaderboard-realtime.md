# 09 — Leaderboard e Realtime

## 1. Context & Objective

Tabela de classificação por torneio, posição determinística, atualização ao vivo via Supabase Realtime e invalidate após mutações. Render na página `/tournaments/:id` (coluna principal abaixo ou ao lado das partidas).

## 2. Inputs / Outputs & Types

```ts
export function rankLeaderboard(rows: readonly LeaderboardRow[]): RankedLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points
    if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins
    if (a.matches_played !== b.matches_played) return a.matches_played - b.matches_played
    return a.player_name.localeCompare(b.player_name, 'pt-BR')
  })
  return sorted.map((row, index) => ({ ...row, position: index + 1 }))
}
```

Fetch:

```ts
supabase.from('view_leaderboard').select('*').eq('tournament_id', id)
```

Não confiar na ordem retornada.

Arquivos:

- `src/domain/leaderboard.ts` — `rankLeaderboard`
- `src/features/leaderboard/use-leaderboard.ts` — query + realtime
- `src/features/leaderboard/LeaderboardTable.tsx`

Query key: `['leaderboard', tournamentId]`

Colunas UI (nesta ordem): `Posição`, `Jogador`, `Partidas`, `Vitórias`, `Pontos`.

Jogador: avatar 32px + `player_name`.

## 3. Step-by-Step Logic & Rules

### Query

1. `useQuery` fetch view filtrada pelo `tournament_id`.
2. `select: rankLeaderboard`.
3. Após `saveMatchResult` e `startTournament` e `finalizeTournament`: `invalidateQueries({ queryKey: ['leaderboard', id] })`.

### Realtime

No mount do hook `useLeaderboard(tournamentId)`:

```ts
const channel = supabase
  .channel(`leaderboard:${tournamentId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, refetch)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, refetch)
  .subscribe()
```

`match_players` **não** tem `tournament_id`. Estratégia determinística:

1. Subscrever `match_players` sem filter **é proibido** (ruído global).
2. Em vez disso: subscrever só `matches` filtrado por `tournament_id` **e** um segundo canal por `match_id` conhecido **ou** refetch quando `matches` muda (update de status) **e** invalidar também no `onSettled` de `saveMatchResult` (caminho local).
3. Complemento: após spec 02, Realtime em `match_players` com filter não é possível por FK. **Regra final:** canal único em `matches` (`tournament_id=eq.…`, event `*`) + invalidate local nas mutations. Isso cobre save de resultado (update `matches.status` e re-save também faz update na row). **Obrigatório** no `saveMatchResult` dar `UPDATE matches SET status = 'completed'` mesmo quando já `completed` (touch na row) para disparar realtime a outros browsers. Spec 08 deve incluir esse touch — se a row já é completed, ainda assim enviar UPDATE (`status=completed` + opcionalmente nenhum outro campo). Implementador: no passo 9 de 08, sempre UPDATE a row `matches`.

Cleanup: `supabase.removeChannel(channel)` no unmount.

`refetch` = `queryClient.invalidateQueries({ queryKey: ['leaderboard', tournamentId] })` e também `['matches', tournamentId]`.

### UI tabela

- Usar componente `Table` shadcn.
- Linha: `layout` animation Framer Motion (`layout` prop no `tr` via `motion.tr`) para troca de posição.
- Empate nos 3 primeiros critérios: desempate `player_name`; **posições distintas** (2, 3, 4… nunca “T2”).
- Empty: se roster vazio (não deveria em in_progress): `Sem jogadores.`
- Números: `matches_played`, `total_wins`, `total_points` como inteiros (view COUNT/SUM). Coerce `Number(...)` se o driver devolver string.

### Onde renderiza

- `in_progress` e `completed`: leaderboard visível.
- `draft`: não mostrar tabela de pontos (ou mostrar roster simples — spec 06; **não** usar a view como classificação).

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Player no roster sem partida completed | 0 / 0 / 0, ainda entra no rank (desempate nome) |
| Dois players 0 pontos | ordem alfabética pt-BR |
| Realtime disconnect | TanStack refetchOnWindowFocus default cobre; não mostrar modal de erro de socket |
| Channel error | `console.error`; UI permanece com último snapshot |
| `total_points` numeric vs int | `Number` na borda do mapper view → `LeaderboardRow` |
| Visitante | vê a tabela; recebe realtime (SELECT público) |

Mapper view:

```ts
function toLeaderboardRow(raw: Record<string, unknown>): LeaderboardRow {
  return {
    tournament_id: String(raw.tournament_id),
    player_id: String(raw.player_id),
    player_name: String(raw.player_name),
    player_avatar: String(raw.player_avatar),
    matches_played: Number(raw.matches_played),
    total_wins: Number(raw.total_wins),
    total_points: Number(raw.total_points),
  }
}
```

## 5. Acceptance Criteria / Verification Checklist

- [ ] Vitest `rankLeaderboard`: pontos > vitórias > menos partidas > nome.
- [ ] Vitest: dois nomes, mesmos stats → ordem `localeCompare pt-BR`; positions 1 e 2.
- [ ] Tabela tem as 5 colunas na ordem especificada.
- [ ] Save resultado (outro tab ou invalidate) atualiza pontos sem reload manual.
- [ ] `saveMatchResult` em partida já completed faz UPDATE em `matches` (touch realtime).
- [ ] Unmount remove o channel.
- [ ] Draft não mostra leaderboard ranqueado.
- [ ] `motion.tr` com `layout` nas linhas.
- [ ] Anônimo vê a tabela.
