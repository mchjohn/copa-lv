# 02 — Banco de dados (Supabase / PostgreSQL)

## 1. Context & Objective

Definir o schema canônico, RLS, Storage, view de leaderboard e publicação Realtime. Aplicar via SQL no projeto Supabase (SQL Editor ou migration `supabase/migrations/`). Esta spec **não** implementa UI.

Fonte de produto: seções 2–3 de `docs/especificacao_do_projeto.md`, fechadas pelos ADRs 02, 04, 07–09.

## 2. Inputs / Outputs & Types

### Extensões

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid (geralmente já ativa)
```

Não exigir `citext`. Unicidade de nome via índice em `lower(name)`.

### Tabelas

#### `tournaments`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `title` | `text` | NOT NULL, CHECK `length(btrim(title)) > 0` |
| `game_name` | `text` | NOT NULL, CHECK `length(btrim(game_name)) > 0` |
| `game_image_url` | `text` | NOT NULL, CHECK `length(game_image_url) > 0` |
| `players_per_match` | `integer` | NOT NULL, CHECK `IN (2, 3, 4)` |
| `include_final_match` | `boolean` | NOT NULL, default `true` quando `players_per_match = 4` na app; migration pode usar `default false` + trigger/app — **app** seta `true` no insert se k=4 (ADR-12) |
| `status` | `text` | NOT NULL, default `'draft'`, CHECK `IN ('draft', 'in_progress', 'completed')` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Índice: `tournaments_status_created_at_idx` em `(status, created_at DESC)`.

#### `players`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | NOT NULL, CHECK `name <> ''` AND `name = btrim(name)` |
| `avatar_url` | `text` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Índice único: `players_name_lower_uidx` em `(lower(name))`.

A app **deve** persistir o nome já normalizado (ADR-08). O CHECK `btrim` rejeita leading/trailing space; não colapsa espaços internos no banco — a função `normalizePlayerName` (spec 05) é obrigatória antes do INSERT/UPDATE.

#### `tournament_players`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `tournament_id` | `uuid` | NOT NULL, FK `tournaments(id)` ON DELETE CASCADE |
| `player_id` | `uuid` | NOT NULL, FK `players(id)` ON DELETE **RESTRICT** |

Nota: a spec narrativa dizia CASCADE em `player_id`. ADR-08 proíbe delete de jogador vinculado; FK **RESTRICT** alinha o banco a essa regra. Unique `(tournament_id, player_id)`.

`created_at timestamptz NOT NULL default now()`.

#### `matches`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `tournament_id` | `uuid` | NOT NULL, FK `tournaments(id)` ON DELETE CASCADE |
| `round_number` | `integer` | NOT NULL, CHECK `round_number >= 1` — **ordem na fila 1 TV** (classificatória `1..M`; final `M+1` se existir) |
| `phase` | `text` | NOT NULL, default `'qualifying'`, CHECK `IN ('qualifying', 'final')` |
| `status` | `text` | NOT NULL, default `'pending'`, CHECK `IN ('pending', 'completed')` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

Índice: `(tournament_id, round_number)`.

Índice parcial único: no máximo uma final por torneio — `matches_one_final_per_tournament_uidx` UNIQUE `(tournament_id) WHERE phase = 'final'`.

#### `match_players`

| Coluna | Tipo | Constraints |
| --- | --- | --- |
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `match_id` | `uuid` | NOT NULL, FK `matches(id)` ON DELETE CASCADE |
| `player_id` | `uuid` | NOT NULL, FK `players(id)` ON DELETE RESTRICT |
| `placement` | `integer` | NULLABLE, CHECK `placement IS NULL OR placement BETWEEN 1 AND 4` |
| `points_earned` | `integer` | NULLABLE, CHECK `points_earned IS NULL OR points_earned >= 0` |

Constraints:

- UNIQUE `(match_id, player_id)`
- UNIQUE parcial: `(match_id, placement) WHERE placement IS NOT NULL`
- CHECK: `(placement IS NULL AND points_earned IS NULL) OR (placement IS NOT NULL AND points_earned IS NOT NULL)`

### View `view_leaderboard`

SQL canônica (não alterar aliases):

```sql
CREATE OR REPLACE VIEW view_leaderboard AS
SELECT
  tp.tournament_id,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar,
  COUNT(mp.id) FILTER (WHERE m.status = 'completed' AND m.phase = 'qualifying') AS matches_played,
  COUNT(mp.id) FILTER (WHERE mp.placement = 1 AND m.status = 'completed' AND m.phase = 'qualifying') AS total_wins,
  COALESCE(SUM(mp.points_earned) FILTER (WHERE m.status = 'completed' AND m.phase = 'qualifying'), 0) AS total_points
FROM tournament_players tp
JOIN players p ON tp.player_id = p.id
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m ON mp.match_id = m.id AND m.tournament_id = tp.tournament_id
GROUP BY tp.tournament_id, p.id, p.name, p.avatar_url;
```

**Não** depender de `ORDER BY` na view para posição (PostgreSQL não garante ordem da view para clientes). Sort na app (spec 09).

Tipos da view (para `03`):

```ts
interface LeaderboardRow {
  tournament_id: string
  player_id: string
  player_name: string
  player_avatar: string
  matches_played: number
  total_wins: number
  total_points: number
}
```

Grants: `GRANT SELECT ON view_leaderboard TO anon, authenticated`.

### Storage

Dois buckets **públicos** (leitura anônima da URL):

| Bucket | Uso | Limite | MIME |
| --- | --- | --- | --- |
| `avatars` | avatar de jogador | 2 MiB | `image/jpeg`, `image/png`, `image/webp` |
| `game-covers` | capa do jogo | 5 MiB | `image/jpeg`, `image/png`, `image/webp` |

Policies Storage:

- `SELECT`: `true` (público)
- `INSERT` / `UPDATE` / `DELETE`: `auth.role() = 'authenticated'`
- Path sugerido: `{user_id}/{uuid}.{ext}` **ou** `{entity_id}/{uuid}.{ext}` — usar `{uuid}.{ext}` na raiz do bucket (simples). Nome de objeto = `gen_random_uuid()` + extensão minúscula.

### RLS (todas as tabelas)

Habilitar RLS em `tournaments`, `players`, `tournament_players`, `matches`, `match_players`.

Para cada tabela:

```sql
CREATE POLICY select_public ON <table> FOR SELECT USING (true);
CREATE POLICY write_authenticated ON <table>
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- repetir padrões equivalentes para UPDATE e DELETE:
-- UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated')
-- DELETE USING (auth.role() = 'authenticated')
```

Views usam security invoker/definer: no Supabase recente, `view_leaderboard` deve ser criada com `security_invoker = true` se disponível, para respeitar RLS das bases. Se a versão não suportar, `GRANT SELECT` + RLS nas tabelas-base já permite SELECT público.

### Realtime

Adicionar à publication `supabase_realtime`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
```

`replica identity default` (PK) é suficiente.

### Outputs desta spec

Arquivo `supabase/migrations/YYYYMMDDHHMMSS_init.sql` contendo **todo** o DDL acima (extensão, tabelas, índices, view, RLS, grants, storage via `storage.buckets` insert, policies de storage, publication).

Depois: `supabase gen types typescript --linked > src/types/database.ts` (ou `--project-id`). Documentar o comando no README do repo em uma linha.

## 3. Step-by-Step Logic & Rules

1. Criar migration única `init` na ordem: tables → indexes → FKs já inline → view → RLS enable + policies → grants → buckets + storage policies → realtime publication.
2. Não criar triggers de pontuação: pontos são escritos pela app (spec 08).
3. Não criar enum PostgreSQL nativo; usar `text` + CHECK (mais simples de gerar types).
4. `tournament_players.player_id` ON DELETE RESTRICT (ADR-08).
5. `matches` / `match_players` CASCADE a partir do torneio (ADR-06 delete).
6. Seed: **zero** linhas de negócio. Admin user **não** é SQL; cria-se no Dashboard Auth.
7. Após aplicar, gerar `src/types/database.ts`.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| Insert `players.name` duplicado case-insensitive | Unique violation `23505` → app mapeia `PLAYER_NAME_TAKEN` |
| Delete player com roster | FK RESTRICT `23503` → `PLAYER_IN_TOURNAMENT` |
| `placement` duplicado na mesma match | Unique parcial `23505` |
| `placement` sem `points_earned` | CHECK violation `23514` |
| Anon tenta INSERT | RLS nega (erro PostgREST); app mapeia `UNAUTHORIZED` |
| Bucket inexistente no upload | Falha Storage; app não cria bucket em runtime |
| View JOIN: player no roster sem partidas | `matches_played = 0`, `total_wins = 0`, `total_points = 0` |
| match_players ligado a match de **outro** torneio | Impossível se a app só insere matches do torneio; a view filtra `m.tournament_id = tp.tournament_id` |

Não criar funções PL/pgSQL nesta spec.

## 5. Acceptance Criteria / Verification Checklist

- [ ] Migration aplica em projeto limpo sem erro.
- [ ] `players_per_match` 1 ou 5 falha CHECK.
- [ ] `status` `'live'` falha CHECK.
- [ ] Dois players `"Ana"` e `"ana"` falham unique.
- [ ] Anon: SELECT em todas as tabelas e na view funciona; INSERT falha.
- [ ] Authenticated: INSERT/UPDATE/DELETE funcionam nas cinco tabelas.
- [ ] DELETE em `tournaments` remove `matches`, `match_players`, `tournament_players`.
- [ ] DELETE em `players` com linha em `tournament_players` falha.
- [ ] Buckets `avatars` e `game-covers` existem e são públicos para leitura.
- [ ] `src/types/database.ts` gerado contém as cinco tabelas + view.
- [ ] Tables `matches`, `match_players`, `tournaments` na publication realtime.
- [ ] View retorna uma linha por `(tournament_id, player_id)` do roster, inclusive com zero partidas.
