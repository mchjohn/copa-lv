# Specs SDD — COPA LV

Specs executáveis para implementação por IA. Cada arquivo cobre **uma capacidade isolada**.

| Fonte | Papel |
| --- | --- |
| [`docs/especificacao_do_projeto.md`](../especificacao_do_projeto.md) | Visão de produto |
| [`docs/specs/`](./) | **Fonte de verdade de implementação.** Em conflito pontual com a spec narrativa, estas specs ganham. |
| [`docs/specs/00-decisoes.md`](./00-decisoes.md) | ADRs travados (não reabrir em PRs de feature) |

## Template obrigatório

Toda spec de capacidade (`01`–`11`) contém exatamente estas seções, nesta ordem:

1. Context & Objective
2. Inputs / Outputs & Types
3. Step-by-Step Logic & Rules
4. Edge Cases & Error Handling
5. Acceptance Criteria / Verification Checklist

## Ordem de implementação

```
01-stack-tooling
  → 02-database
    → 03-domain-types
      → 04-auth
        → 05-players
          → 06-tournaments
            → 07-round-robin
              → 08-match-results
                → 09-leaderboard-realtime
                  → 10-finalize-podium

01-stack-tooling → 11-ui-shell  (paralelo após 01; rotas finais alinhadas com 04–10)
```

Não pule `07` para implementar UI de partidas: o motor de partidas (3 classificatórias/jogador + fila 1 TV) é função pura + testes Vitest **antes** da persistência.

## Índice

| Spec | Capacidade | Depende de |
| --- | --- | --- |
| [00-decisoes.md](./00-decisoes.md) | ADRs | — |
| [01-stack-tooling.md](./01-stack-tooling.md) | Vite, Tailwind, shadcn, Router, Query, Motion, Supabase client | 00 |
| [02-database.md](./02-database.md) | DDL, RLS, Storage, view, Realtime | 00, 01 |
| [03-domain-types.md](./03-domain-types.md) | Contratos TS, erros canônicos | 02 |
| [04-auth.md](./04-auth.md) | Login admin, gates de UI | 01, 02, 03 |
| [05-players.md](./05-players.md) | CRUD jogadores, avatar | 03, 04 |
| [06-tournaments.md](./06-tournaments.md) | Draft, roster, listagens, delete | 05 |
| [07-round-robin.md](./07-round-robin.md) | Classificatória 3×/jogador, fila 1 TV, grande final | 06 |
| [08-match-results.md](./08-match-results.md) | Lançar/editar resultado | 07 |
| [09-leaderboard-realtime.md](./09-leaderboard-realtime.md) | Tabela + Realtime | 08 |
| [10-finalize-podium.md](./10-finalize-podium.md) | Finalizar + pódio | 09 |
| [11-ui-shell.md](./11-ui-shell.md) | Shell, paleta, rotas, motion | 01 (+ alinhamento 04–10) |

## Regras para a IA implementadora

1. Implementar **uma spec por vez**. Não misturar motor de chaves com UI de pódio.
2. Não inventar colunas, rotas, status ou pontos fora destas specs.
3. Funções puras de domínio (`normalizePlayerName`, `buildQualifyingMatches`, `scheduleSequentialOneTv`, `pointsForPlacement`, `rankLeaderboard`) vivem em `src/domain/` e são cobertas por Vitest.
4. UI em português do Brasil. Código (identificadores) em inglês.
5. Não instalar dependências não listadas em `01-stack-tooling.md`.
