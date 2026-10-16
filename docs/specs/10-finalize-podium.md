# 10 — Encerramento e pódio

## 1. Context & Objective

Botão “Finalizar Campeonato” transiciona `in_progress` → `completed` somente se todas as partidas **obrigatórias** estão `completed` (classificatória inteira + grande final, se `include_final_match`). Na página encerrada, exibir pódio hierárquico (1º centro mais alto, 2º esquerda, 3º direita) com avatar, nome e pontuação exibida conforme ADR-12.

## 2. Inputs / Outputs & Types

```ts
export function canFinalize(
  matches: readonly { status: MatchStatus; phase: MatchPhase }[],
  includeFinalMatch: boolean,
): boolean {
  const qualifying = matches.filter((m) => m.phase === 'qualifying')
  const final = matches.filter((m) => m.phase === 'final')
  if (qualifying.length === 0) return false
  if (!qualifying.every((m) => m.status === 'completed')) return false
  if (!includeFinalMatch) return true
  return final.length === 1 && final[0].status === 'completed'
}

export interface PodiumSlot {
  position: 1 | 2 | 3
  row: RankedLeaderboardRow | FinalPodiumRow | null
}

export interface FinalPodiumRow {
  player_id: Uuid
  player_name: string
  player_avatar: string
  placement: 1 | 2 | 3
  total_points: number // points_earned na final (exibição)
}

export function podiumSlotsFromFinal(
  finalMatchPlayers: readonly FinalPodiumRow[],
): [PodiumSlot, PodiumSlot, PodiumSlot]

export function podiumSlotsFromLeaderboard(
  ranked: readonly RankedLeaderboardRow[],
): [PodiumSlot, PodiumSlot, PodiumSlot]

export function podiumSlots(args: {
  includeFinalMatch: boolean
  finalCompleted: boolean
  finalMatchPlayers: readonly FinalPodiumRow[]
  rankedQualifying: readonly RankedLeaderboardRow[]
}): [PodiumSlot, PodiumSlot, PodiumSlot] {
  // se includeFinalMatch && finalCompleted → podiumSlotsFromFinal (top 3 placements)
  // senão → podiumSlotsFromLeaderboard (top 3 pontos classificatórios)
}
```

Ordem de render visual (esquerda → centro → direita): **2º, 1º, 3º**.

API: `finalizeTournament(tournamentId: Uuid): Promise<void>`

Não existe `reopenTournament`.

## 3. Step-by-Step Logic & Rules

### Finalizar

1. `assertAdmin`.
2. Load tournament. `NOT_FOUND` se ausente.
3. Se `status !== 'in_progress'` → `VALIDATION` `Só é possível finalizar um campeonato em andamento.`
4. Load matches (todas as fases). Se `!canFinalize(matches, tournament.include_final_match)` → `TOURNAMENT_NOT_COMPLETABLE`.
5. `UPDATE tournaments SET status = 'completed' WHERE id AND status = 'in_progress'`. `count === 0` → `VALIDATION` (race).
6. Toast `Campeonato finalizado.`
7. Invalidate tournament + leaderboard + matches.

Botão:

- Visível: `isAdmin && status === 'in_progress'`.
- Disabled se `!canFinalize` com ajuda:
  - classificatória incompleta: `Conclua todas as partidas classificatórias.`
  - final pendente: `Lance o resultado da grande final para finalizar.`
  - sem final obrigatória: `Lance o resultado de todas as partidas para finalizar.`
- Confirm: `Encerrar "{title}"? Os resultados não poderão mais ser editados.`

### Página completed

- Leaderboard classificatório permanece (spec 09).
- Partidas read-only (sem lançar/editar).
- **Pódio no topo** da página, acima do leaderboard.
- Fonte do pódio (ADR-12):
  - Com grande final concluída: jogadores com `placement` 1, 2, 3 na partida `final` (nomes/avatars da final; pontos exibidos = `points_earned` da final).
  - Sem grande final: top 3 do `rankLeaderboard` na classificação (`total_points` classificatórios).
- Animação de revelação (Framer Motion):
  1. container `initial={{ opacity: 0, y: 16 }}` `animate={{ opacity: 1, y: 0 }}` duration 0.4
  2. slots stagger 0.15s ordem: 2º, 3º, depois 1º (centro por último para “revelar o campeão”)
- Alturas relativas (desktop):
  - 1º: coluna `h-56` / `translateY(0)`
  - 2º: `h-44`
  - 3º: `h-36`
- Mobile: mesmas proporções, flex row `items-end` `justify-center` `gap-3`.
- Slot: avatar ≥ 64px (1º: 96px), nome, pontos + sufixo ` pts`, medalha textual `1º` `2º` `3º`.
- Fundo do pedestal: 1º purple `#8b5cf6`, 2º slate, 3º cyan `#22d3ee` (opacidade 0.3 no bloco).

### Menos de 3 jogadores no ranking / final

- Elenco pequeno ou final com k=2: slot 3º com `row: null` → placeholder `—` sem avatar. Ainda renderizar 3 colunas.
- Nunca inventar 4º no pódio. 4º+ só na tabela classificatória.

### Delete

Admin ainda pode excluir torneio completed (spec 06).

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Classificatória com partida pending | botão disabled; API `TOURNAMENT_NOT_COMPLETABLE` |
| `include_final_match` true, final não criada ainda | não deveria ocorrer se 08 disparou `ensureFinalMatch`; se ocorrer, `canFinalize` false |
| Final pending | disabled; mensagem da grande final |
| `include_final_match` false | finalizar após classificatória completa |
| Zero matches | `canFinalize` false |
| Já completed | botão ausente; API recusa |
| Empate na final (impossível — placements distintos) | — |
| Empate de pontos no leaderboard (sem final) | `rankLeaderboard`; pódio segue `position` 1/2/3 |
| Visitante | vê pódio; sem finalizar |
| Clique duplo finalizar | botão `isPending`; segundo request falha no WHERE status |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Vitest `canFinalize` cobre qualifying-only, qualifying+final, pending em cada fase.
- [ ] Vitest `podiumSlots` com final: placements 1-3 da final; sem final: top 3 leaderboard.
- [ ] Vitest ordem array visual `[2,1,3]`.
- [ ] Finalize com pending falha e não muda status.
- [ ] Finalize com todas obrigatórias completed → `completed`; resultados deixam de ser editáveis (08).
- [ ] Pódio: DOM order visual 2-1-3; 1º maior.
- [ ] n=2 / k=2 sem final: terceiro slot placeholder.
- [ ] Animação stagger presente (motion).
- [ ] Confirm dialog antes do update.
- [ ] Sem ação de reabrir.
