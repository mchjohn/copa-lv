# 10 — Encerramento e pódio

## 1. Context & Objective

Botão “Finalizar Campeonato” transiciona `in_progress` → `completed` somente se todas as partidas estão `completed`. Na página de detalhe encerrado, exibir pódio hierárquico (1º centro mais alto, 2º esquerda, 3º direita) com avatar, nome e pontuação final, usando o mesmo ranking da spec 09.

## 2. Inputs / Outputs & Types

```ts
export function canFinalize(matches: readonly { status: MatchStatus }[]): boolean {
  return matches.length > 0 && matches.every((m) => m.status === 'completed')
}

export interface PodiumSlot {
  position: 1 | 2 | 3
  row: RankedLeaderboardRow | null
}

export function podiumSlots(ranked: readonly RankedLeaderboardRow[]): [PodiumSlot, PodiumSlot, PodiumSlot] {
  const at = (pos: 1 | 2 | 3): PodiumSlot => ({
    position: pos,
    row: ranked.find((r) => r.position === pos) ?? null,
  })
  return [at(2), at(1), at(3)]
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
4. Load matches. Se `!canFinalize` → `TOURNAMENT_NOT_COMPLETABLE`.
5. `UPDATE tournaments SET status = 'completed' WHERE id AND status = 'in_progress'`. `count === 0` → `VALIDATION` (race).
6. Toast `Campeonato finalizado.`
7. Invalidate tournament + leaderboard.

Botão:

- Visível: `isAdmin && status === 'in_progress'`.
- Disabled se `!canFinalize` com ajuda `Lance o resultado de todas as partidas para finalizar.`
- Confirm: `Encerrar "{title}"? Os resultados não poderão mais ser editados.`

### Página completed

- Leaderboard permanece (spec 09).
- Partidas read-only (sem lançar/editar).
- **Pódio no topo** da página, acima do leaderboard.
- Animação de revelação (Framer Motion):
  1. container `initial={{ opacity: 0, y: 16 }}` `animate={{ opacity: 1, y: 0 }}` duration 0.4
  2. slots stagger 0.15s ordem: 2º, 3º, depois 1º (centro por último para “revelar o campeão”)
- Alturas relativas (desktop):
  - 1º: coluna `h-56` / `translateY(0)`
  - 2º: `h-44`
  - 3º: `h-36`
- Mobile: mesmas proporções, flex row `items-end` `justify-center` `gap-3`.
- Slot: avatar ≥ 64px (1º: 96px), nome, `total_points` + sufixo ` pts`, medalha textual `1º` `2º` `3º`.
- Fundo do pedestal: 1º purple `#8b5cf6`, 2º slate, 3º cyan `#22d3ee` (opacidade 0.3 no bloco).

### Menos de 3 jogadores no ranking

- `n=2` (só k=2): slot 3º com `row: null` → placeholder `—` sem avatar. Ainda renderizar 3 colunas.
- Nunca inventar 4º no pódio. 4º+ só na tabela.

### Delete

Admin ainda pode excluir torneio completed (spec 06).

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Uma partida pending | botão disabled; API `TOURNAMENT_NOT_COMPLETABLE` |
| Zero matches | `canFinalize` false (não finalizar draft disfarçado) |
| Já completed | botão ausente; API recusa |
| Empate de pontos no topo | posição já resolvida por `rankLeaderboard`; pódio segue `position` 1/2/3 |
| Immagem avatar quebrada | fallback iniciais (igual spec 05) |
| Visitante | vê pódio; sem finalizar |
| Clique duplo finalizar | botão `isPending`; segundo request falha no WHERE status |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Vitest `canFinalize([])===false`; todos completed `true`; um pending `false`.
- [ ] Vitest `podiumSlots` ordem array `[2,1,3]`.
- [ ] Finalize com pending falha e não muda status.
- [ ] Finalize com todas completed → `completed`; resultados deixam de ser editáveis (08).
- [ ] Pódio: DOM order visual 2-1-3; 1º maior.
- [ ] n=2: terceiro slot placeholder.
- [ ] Animação stagger presente (motion).
- [ ] Confirm dialog antes do update.
- [ ] Sem ação de reabrir.
