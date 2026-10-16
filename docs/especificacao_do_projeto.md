# 🎮 Documentação de Especificação do Projeto: **COPA LAGOINHA DE VIDEOGAME - COPA LV**

## 1. 🎯 Visão Geral da Aplicação
A aplicação é uma plataforma gerenciadora de campeonatos de eSports / retrogaming. O sistema permite cadastrar campeonatos, gerenciar um banco global de jogadores, definir formatos de partida (**1v1, 3 Players ou 4 Players**), gerar automaticamente as chaves e rodadas no sistema **Round Robin (Todos Contra Todos)**, registrar resultados e manter uma tabela de classificação (**Leaderboard**) e pódio atualizados em tempo real.

---

## 2. 🔐 Autenticação e Permissões (RBAC)

- **Administrador (Autenticado via Supabase Auth):**
  - Conta única/restrita de administração.
  - Permissão total (CRUD) em campeonatos, jogadores, partidas, lançamento e edição de resultados.
- **Visitante / Público (Não Autenticado):**
  - Acesso **apenas leitura (Read-Only)** a toda a aplicação.
  - Pode visualizar campeonatos ativos, histórico, partidas, pódio e a tabela de classificação em tempo real.
- **Políticas de Segurança (RLS - Row Level Security):**
  - **SELECT:** Público (`true` para qualquer usuário).
  - **INSERT / UPDATE / DELETE:** Somente usuários autenticados (`auth.role() = 'authenticated'`).

---

## 3. 🗄️ Estrutura de Banco de Dados (Supabase / PostgreSQL)

### 3.1. Tabelas Principais

1. **`tournaments`**
   - `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
   - `title`: `text` (ex: "Copa Turok 2 - Edição de Aniversário")
   - `game_name`: `text` (ex: "Turok 2: Seeds of Evil")
   - `game_image_url`: `text` (URL da imagem enviada para o Supabase Storage)
   - `players_per_match`: `integer` (2, 3 ou 4)
   - `status`: `text` (`'draft'`, `'in_progress'`, `'completed'`)
   - `created_at`: `timestamptz` (default: `now()`)

2. **`players`** (Banco Global de Jogadores)
   - `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
   - `name`: `text` (Único e obrigatório)
   - `avatar_url`: `text` (URL do upload customizado ou URL gerada via DiceBear)
   - `created_at`: `timestamptz` (default: `now()`)

3. **`tournament_players`** (Tabela N:N - Participantes do Torneio)
   - `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
   - `tournament_id`: `uuid` (FK -> `tournaments.id` ON DELETE CASCADE)
   - `player_id`: `uuid` (FK -> `players.id` ON DELETE CASCADE)
   - `created_at`: `timestamptz` (default: `now()`)
   - *Constraint:* Unique (`tournament_id`, `player_id`)

4. **`matches`**
   - `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
   - `tournament_id`: `uuid` (FK -> `tournaments.id` ON DELETE CASCADE)
   - `round_number`: `integer` (Número da rodada)
   - `status`: `text` (`'pending'`, `'completed'`)
   - `created_at`: `timestamptz` (default: `now()`)

5. **`match_players`**
   - `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
   - `match_id`: `uuid` (FK -> `matches.id` ON DELETE CASCADE)
   - `player_id`: `uuid` (FK -> `players.id` ON DELETE RESTRICT)
   - `placement`: `integer` (1, 2, 3 ou 4 - Posição do jogador na partida)
   - `points_earned`: `integer` (Pontuação obtida na partida)

---

### 3.2. View SQL para o Leaderboard (`view_leaderboard`)
Criação de uma View para agregar a pontuação em tempo real por torneio:

```sql
CREATE OR REPLACE VIEW view_leaderboard AS
SELECT 
  tp.tournament_id,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar,
  COUNT(mp.id) FILTER (WHERE m.status = 'completed') AS matches_played,
  COUNT(mp.id) FILTER (WHERE mp.placement = 1 AND m.status = 'completed') AS total_wins,
  COALESCE(SUM(mp.points_earned) FILTER (WHERE m.status = 'completed'), 0) AS total_points
FROM tournament_players tp
JOIN players p ON tp.player_id = p.id
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m ON mp.match_id = m.id AND m.tournament_id = tp.tournament_id
GROUP BY tp.tournament_id, p.id, p.name, p.avatar_url
ORDER BY total_points DESC, total_wins DESC, matches_played ASC;
```

---

## 4. ⚖️ Regras de Negócio e Tabela de Pontuação

A pontuação é calculada automaticamente ao salvar o resultado de uma partida, levando em conta a **modalidade original do torneio** e o **número real de participantes na chave/partida**:

### 4.1. Partida em Formato Padrão (Chave Cheia)
| Modalidade do Torneio | 1º Lugar | 2º Lugar | 3º Lugar | 4º Lugar |
| :--- | :---: | :---: | :---: | :---: |
| **Mode 1v1 (2 Players)** | 1 pt | 0 pts | - | - |
| **Mode 3 Players (FFA)** | 2 pts | 1 pt | 0 pts | - |
| **Mode 4 Players (FFA)** | 3 pts | 2 pts | 1 pt | 0 pts |

### 4.2. Exceção de Chave Incompleta (Ajuste Dinâmico)
Se em um torneio de **3 ou 4 jogadores por partida** restarem participantes ímpares e uma partida precisar ser gerada com **3 jogadores**:

- **Torneio de 3 Players com chave de 3:** Mantém (2, 1, 0 pts).
- **Torneio de 4 Players onde a chave ficou com apenas 3 jogadores:**
  - 1º Lugar: **2 pontos**
  - 2º Lugar: **1 ponto**
  - 3º Lugar: **0 pontos**

---

## 5. 🚀 Funcionalidades Principais e Fluxos

### 5.1. Gestão Global de Jogadores (`/players`)
- Cadastro prévio de jogadores na base global (Nome e Upload de Avatar).
- Fallback de Avatar: Caso o usuário não envie foto, gerar automaticamente um avatar usando a API do [DiceBear (Bottts / Avataaars)](https://www.dicebear.com/guides/use-the-library-with-react/) usando o nome do jogador como *seed*.
- Validação: Nomes únicos e sem espaços em branco.
- Edição e remoção de jogadores (desde que não estejam vinculados a um campeonato em andamento).

### 5.2. Criação de Campeonato (`/tournaments/new`)
- Formulário com: Nome do Evento, Nome do Jogo, Imagem/Capa do Jogo e Modalidade (2, 3 ou 4 Players).
- Seleção de participantes a partir do Banco Global de Jogadores.
- Opção rápida para cadastrar um "novo jogador livre" direto no modal e já adicioná-lo ao torneio.

### 5.3. Algoritmo Round Robin (Geração de Chaves)
- Ao clicar em **"Gerar Chaves e Iniciar Torneio"**:
  1. O status do torneio muda de `'draft'` para `'in_progress'`.
  2. O sistema calcula a combinação de todos contra todos.
  3. Garante que cada jogador enfrente todos os outros adversários no número de partidas configurado por rodada.
  4. Insere os registros nas tabelas `matches` e `match_players`.

### 5.4. Lançamento e Edição de Resultados
- Painel de partidas agrupadas por rodadas com badges de status (`Pendente` / `Concluído`).
- Modal de resultado: Seleciona as colocações (1º ao N-ésimo) sem repetir posições.
- Ao salvar: Calcula e salva os `points_earned` de cada jogador e atualiza o status da partida para `'completed'`.
- Permitir edição de resultados a qualquer momento, o que recalcula instantaneamente os pontos do torneio.

### 5.5. Leaderboard e Pódio
- Tabela dinâmica atualizada via **Supabase Realtime** ou revalidação de dados.
- Colunas: `Posição`, `Jogador`, `Partidas Jogadas`, `Vitórias (1º lugares)`, `Pontuação Total`.
- Critérios de desempate:
  1. Maior Pontuação Total
  2. Maior número de Vitórias (1º Lugar)
  3. Menor número de Partidas Jogadas

### 5.6. Histórico e Encerramento
- Botão "Finalizar Campeonato" (muda status para `'completed'`).
- Na tela do histórico/detalhes de um campeonato finalizado:
  - Exibição de um **Pódio 3D / Hierárquico** no topo da tela em destaque (1º Lugar centralizado e mais alto, 2º à esquerda, 3º à direita) com os avatares, nomes e pontuação final.

---

## 6. 🎨 UI/UX & Design System

- **Tema:** Dark Mode / Esports / Gaming (Paleta escura `#0f172a` com acentos em Cyan/Neon Green/Purple `#8b5cf6`).
- **Responsividade:** Layout adaptável com navegação fluida tanto no Desktop quanto em Mobile (ideal para usar num tablet/celular durante o torneio).
- **Animações (Framer Motion / Tailwind):**
  - Transições suaves ao abrir modais.
  - Animação de entrada e troca de posições no Leaderboard (*Layout animations*).
  - Animação de revelação do Pódio na finalização do campeonato.
- **Feedback Visual:**
  - Badges coloridos para status de partida.
  - Toasts estilizados para ações de criação, erros de validação e salvamento de partidas.