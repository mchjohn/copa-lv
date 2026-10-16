# 05 — Gestão global de jogadores

## 1. Context & Objective

CRUD do banco global em `/players`. Cadastro prévio (nome + avatar), unicidade case-insensitive, fallback DiceBear Avataaars, exclusão somente se o jogador não estiver em nenhum torneio.

## 2. Inputs / Outputs & Types

Rota: `/players` → `src/features/players/PlayersPage.tsx`

Módulos:

- `src/domain/player-name.ts`
- `src/domain/dicebear.ts`
- `src/features/players/players-api.ts`

```ts
export function normalizePlayerName(raw: string): string {
  // 1. trim
  // 2. replace /\s+/g com ' '
  // 3. NÃO alterar case (persistir como o admin digitou após colapsar espaços)
}

export function isValidPlayerName(normalized: string): boolean {
  return normalized.length >= 1 && normalized.length <= 40
}

export function dicebearAvatarUrl(normalizedName: string): string {
  const seed = encodeURIComponent(normalizedName)
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`
}

export interface CreatePlayerInput {
  name: string
  file: File | null
}

export interface UpdatePlayerInput {
  id: Uuid
  name: string
  file: File | null
  replaceAvatar: boolean
}
```

Upload: `supabase.storage.from('avatars').upload(objectPath, file, { upsert: false, contentType })`.

`objectPath`: `${crypto.randomUUID()}.${ext}` onde `ext ∈ {jpg, jpeg, png, webp}` minúsculo (jpeg → jpg permitido no path).

URL pública: `supabase.storage.from('avatars').getPublicUrl(objectPath).data.publicUrl`.

Query keys: `['players']`, `['players', id]`, `['player-tournament-count', playerId]`.

## 3. Step-by-Step Logic & Rules

### Listar

1. `SELECT * FROM players ORDER BY lower(name) ASC`.
2. Card/linha: avatar 40px, nome, ações se `isAdmin`.

### Criar

1. `assertAdmin`.
2. `name = normalizePlayerName(raw)`.
3. Se `!isValidPlayerName` → `VALIDATION` `Informe um nome com até 40 caracteres.`
4. Se `file`:
   - MIME deve ser `image/jpeg | image/png | image/webp`; senão `VALIDATION` `Imagem inválida. Use JPG, PNG ou WebP.`
   - `file.size <= 2 * 1024 * 1024`; senão `VALIDATION` `A imagem deve ter no máximo 2 MB.`
   - upload no bucket `avatars`; `avatar_url` = public URL.
5. Se `file === null`: `avatar_url = dicebearAvatarUrl(name)`.
6. `INSERT players { name, avatar_url }`. Unique violation → `PLAYER_NAME_TAKEN`.
7. Toast `Jogador cadastrado.` Invalidate `['players']`.

Modal “novo jogador” também é usado em `06` (criar torneio). **Reutilizar** `createPlayer` da API; após sucesso, devolver o `Player` criado para o parent adicionar ao roster local.

### Editar

1. `assertAdmin`.
2. Normalizar/validar nome (mesmo create).
3. Avatar:
   - `replaceAvatar === false`: manter `avatar_url`.
   - `replaceAvatar === true` e `file`: upload novo; persistir nova URL. **Não** é obrigatório deletar o objeto antigo no Storage (v1: orphan ok).
   - `replaceAvatar === true` e `file === null`: setar `avatar_url = dicebearAvatarUrl(name)` (volta ao gerado).
4. Se o nome mudou e o avatar atual **é** URL DiceBear (host `api.dicebear.com` e path contém `/avataaars/`), atualizar `avatar_url` para o seed novo **mesmo sem** `replaceAvatar`. Se o avatar é upload (host do Supabase Storage), **não** alterar a imagem só por causa do nome.
5. `UPDATE players SET name, avatar_url WHERE id`.
6. Toast `Jogador atualizado.`

Edição de nome é permitida mesmo se o jogador estiver em torneios (ADR-08).

### Excluir

1. `assertAdmin`.
2. `SELECT count(*) FROM tournament_players WHERE player_id = id`.
3. Se `count > 0` → `PLAYER_IN_TOURNAMENT` (não chamar DELETE).
4. DELETE player. Toast `Jogador excluído.`
5. UI: botão Excluir abre `AlertDialog` `Excluir {name}? Esta ação não pode ser desfeita.`

### Formulário

- Nome: input text, required.
- Avatar: file opcional + preview. Sem arquivo no create: preview DiceBear ao vivo quando o nome normalizado tem length ≥ 1 (`<img src={dicebearAvatarUrl(name)} />`).
- Submit: “Salvar”.

## 4. Edge Cases & Error Handling

| Caso | Comportamento |
| --- | --- |
| `"  Ana  Maria "` | persiste `"Ana Maria"` |
| `"ana"` vs `"Ana"` existentes | `PLAYER_NAME_TAKEN` |
| Nome `""` ou só espaços | `VALIDATION` |
| Nome 41 chars após normalize | `VALIDATION` |
| Jogador só em torneio `completed` | delete **bloqueado** (qualquer vínculo) |
| Jogador em nenhum torneio | delete ok |
| Upload falha | não inserir player; toast erro Storage mapeado `VALIDATION` |
| DiceBear offline | persistir URL mesmo assim; `<img>` quebra → fallback UI: iniciais em círculo (2 letras do nome) |
| Concorrência dois creates mesmo nome | um `23505` → `PLAYER_NAME_TAKEN` |
| Visitante | página visível read-only; sem botões |

## 5. Acceptance Criteria / Verification Checklist

- [ ] Vitest: `normalizePlayerName('  a   b  ') === 'a b'`
- [ ] Vitest: `dicebearAvatarUrl('Ana')` contém `avataaars` e `seed=Ana`
- [ ] Create sem foto grava URL DiceBear; com foto grava URL do bucket `avatars`
- [ ] Duplicate case-insensitive recusado
- [ ] Delete com vínculo recusado; sem vínculo apaga
- [ ] Rename com avatar DiceBear regenera seed; com upload mantém URL
- [ ] `/players` anônimo lista; sem “Novo jogador”
- [ ] Admin vê criar/editar/excluir; toasts conforme mensagens
- [ ] Modal de create reutilizável exporta `CreatePlayerDialog` com `onCreated: (p: Player) => void`
