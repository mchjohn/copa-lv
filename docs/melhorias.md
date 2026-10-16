# Melhorias
- [ ] Ao adicionar um jogador via tela de criação de campeonato, o campeonato não deve ser criado, somente após o usuário clicar em criar campeonato.
- [ ] Adicone o numero sequencial na listagem de jogadores
- [ ] No select de modalidade, exibir regra conforme seleção
- [x] Verifique as chamadas de rotas, parece que está ocorrendo chamadas desnecessárias. Também ocorre chamdas recursivas, por exemplo ao tentar gerar chaves
- [ ] Adicione espaçamento nos botões de todos os modais.
- [ ] Adicione a opção de adicionar todos os jogadores a um campeonato
- [ ] Altere a UI para ter uma cor mais dark por exemplo #0a0908
- [ ] A tab de Em andamento | Rascunho | Encerrado está com um contraste na borda ruim ao ser selecionada
- [ ] Nova regra:
Atue como um Arquiteto de Software e especialista em Spec-Driven Development (SDD). 

Preciso que você atualize os documentos de especificação técnica (SDD) e as regras de negócio da aplicação "Game Tournament Hub" com base em uma nova definição estrutural para campeonatos baseados em tempo e número de telas (1 TV, 3 horas de evento, 12 jogadores).

Por favor, atualize o escopo do algoritmo de geração de partidas e as regras do torneio para seguir rigorosamente este novo modelo:

1. **Nova Regra de Quantidade de Partidas por Jogador (Garantia de Isonomia):**
   - Independentemente do modo escolhido (1v1, 3 Players ou 4 Players), cada jogador inscrito deve participar exatamente de **3 partidas** na fase classificatória.
   - O algoritmo de distribuição de vagas deve calcular o total de partidas com base na fórmula: `(Número de Jogadores * 3) / Jogadores por Partida (k)`.
   - Isso resulta obrigatoriamente em:
     - **Modo 1v1 (2 players):** 18 partidas no total.
     - **Modo 3 Players:** 12 partidas no total.
     - **Modo 4 Players:** 9 partidas no total.

2. **Dinâmica de Execução (Cenário 1 TV / Sequencial):**
   - Como o evento possui apenas 1 tela física (TV), as partidas da fase classificatória rodam de forma estritamente sequencial.
   - O sistema de agendamento/sorteio deve garantir o revezamento justo de modo que os jogadores não fiquem exaustos esperando muito tempo entre uma partida e outra, permitindo que todos completem suas 3 partidas classificatórias.

3. **Fase Final (Opcional ou Padrão para 4 Players):**
   - Ao final das partidas classificatórias, o Leaderboard deve filtrar os melhores colocados para uma partida final (ex: Grande Final com os 4 melhores no modo 4 Players) para definir o pódio oficial.

Por favor, reescreva/ajuste os trechos afetados da especificação técnica (regras de negócio, fluxo de geração de chaves e validações) refletindo esta nova abordagem matemática e de UX para o torneio.