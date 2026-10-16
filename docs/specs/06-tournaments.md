# 06 — Campeonatos (rascunho, roster, listagens, exclusão)

## 1. Context & Objective

CRUD de torneios em `draft`, seleção de participantes a partir do banco global, upload de capa, listagens por status. **Não** gerar chaves nesta spec (07). **Não** lançar resultados (08).

## 2. Inputs / Outputs & Types

### Rotas

| Path | Página |
| --- | --- |
| `/` e `/tournaments` | lista (tabs: Em andamento, Rascunhos, Encerrados) |
| `/tournaments/new` | criar |
| `/tournaments/:id` | detalhe (draft mostra roster + CTA gerar chaves se admin; in_progress/completed: specs 08–10) |
| `/tournaments/:id/edit` | **somente se `status === 'draft'`** — editar metadados + roster |

Redirect: `/` ≡ `/tournaments`.

```ts
export interface TournamentWithRoster extends Tournament {
  players: Player[]
}

export interface CreateTournamentInput {
  title: string
  game_name: string
  game_image_url: string // já resolvido (upload ou recusado)
  players_per_match: PlayersPerMatch
  playerIds: Uuid[]
}

export function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}
```

Query keys: `['tournaments']`, `['tournaments', id]`, `['tournament-roster', id]`.

Capa: bucket `game-covers`, max 5 MiB, MIME jpeg/png/webp. Path `{uuid}.{ext}`. **Capa é obrigatória** (coluna NOT NULL). Sem URL de DiceBear para jogo.

## 3. Step-by-Step Logic & Rules

### Listar

1. Fetch `tournaments` `ORDER BY created_at DESC`.
2. Tabs filtram `status`:
   - Em andamento → `in_progress`
   - Rascunhos → `draft`
   - Encerrados → `completed`
3. Card: `game_image_url` cover, `title`, `game_name`, badge modalidade (`1v1` se k=2, `3 Players` se k=3, `4 Players` se k=4), badge de status.
4. Clique → `/tournaments/:id`.

Badges status:

| status | label | variante |
| --- | --- | --- |
| `draft` | `Rascunho` | outline/slate |
| `in_progress` | `Em andamento` | cyan |
| `completed` | `Encerrado` | purple |

### Criar (`/tournaments/new`) — só `isAdmin`; senão redirect `/login`

1. Campos: título, nome do jogo, upload capa (obrigatório), modalidade radio `2 | 3 | 4` (default 4).
2. `title = normalizeTitle`; `game_name = normalizeTitle`. Ambos length 1–80 senão `VALIDATION`.
3. Upload capa **antes** do insert do torneio. Falha → não cria torneio.
4. Insert `tournaments` (`status` default draft).
5. Roster: multi-select da lista `players` (checkbox + busca por nome client-side, `includes` case-insensitive no nome normalizado).
6. Botão no modal: “Novo jogador” abre `CreatePlayerDialog`; `onCreated` adiciona o id ao set selecionado e invalida `['players']`.
7. `playerIds` pode ser vazio no create (draft incompleto permitido). Duplicatas no array: unique antes do insert.
8. Insert `tournament_players` uma linha por id. Se um `player_id` inválido: abortar e **apagar o torneio** recém-criado (compensação), toast `VALIDATION`.
9. Transação: PostgREST não tem tx multi-request. Ordem: insert tournament → insert roster. Compensação no passo 8. Documentar no código com comentário `// compensation: delete tournament if roster insert fails`.
10. Toast `Campeonato criado.` Navigate `/tournaments/:id`.

### Editar draft

1. Se `status !== 'draft'` → `TOURNAMENT_NOT_DRAFT` (não montar rota; Navigate para detalhe).
2. Permite alterar title, game_name, capa (novo upload substitui URL), `players_per_match`, roster (add/remove ids).
3. Roster replace: delete all `tournament_players` do torneio + insert conjunto novo **somente em draft**.
4. Mudar `players_per_match` em draft é permitido (ainda não há matches).

### Elenco congelado

Qualquer tentativa de insert/delete em `tournament_players` quando `status !== 'draft'` → a API da feature lança `ROSTER_FROZEN` **antes** do write (defesa em profundidade; spec 07 também).

### Excluir torneio

1. `assertAdmin`.
2. Permitido em **qualquer** status (ADR-06). AlertDialog: `Excluir "{title}"? Partidas e resultados serão apagados.`
3. `DELETE FROM tournaments WHERE id` (CASCADE).
4. Toast `Campeonato excluído.` Navigate `/tournaments`.
5. Objetos em `game-covers` podem ficar órfãos (v1 ok).

### Detalhe draft (admin)

- Lista roster (avatar + nome).
- Botão “Gerar Chaves e Iniciar Torneio” **existe** mas a implementação do click é spec 07. Nesta spec, o botão pode ficar **disabled** com tooltip `Implementado na spec 07` **somente se 07 ainda não foi feita**; quando 07 existir, o botão chama `startTournament(id)`.
- Visitante no draft: vê dados; sem botões de editar/gerar/excluir.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Visitante em `/tournaments/new` | redirect `/login` |
| Capa ausente no submit | `VALIDATION` `Envie a imagem de capa do jogo.` |
| Capa > 5 MB | `VALIDATION` |
| Roster com player deletado entre select e submit | insert FK falha → compensação delete tournament |
| Editar `/edit` de `in_progress` | Navigate detalhe; sem form |
| Lista vazia em uma tab | empty state `Nenhum campeonato nesta lista.` |
| Título só espaços | inválido após normalize |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Create grava tournament + N `tournament_players`.
- [ ] Create com falha no roster não deixa tournament órfão.
- [ ] Draft permite editar modalidade e roster; `in_progress` não.
- [ ] Delete `in_progress` remove matches (quando existirem, spec 07).
- [ ] Tabs filtram pelos três status.
- [ ] Modalidade 2 mostra badge `1v1`.
- [ ] Anônimo vê listas e detalhe draft; não vê New/Edit/Delete.
- [ ] `normalizeTitle` coberto por Vitest.
- [ ] Novo jogador no fluxo de create entra no roster selecionado sem sair da página.
