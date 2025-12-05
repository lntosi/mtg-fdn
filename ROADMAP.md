# MTG Jumpstart Foundations - Roadmap de Desenvolvimento

Este documento mapeia os efeitos de cartas pendentes e melhorias futuras para o jogo.

---

## 1. Efeitos de Cartas Pendentes

### 1.1 Prioridade Alta - Feitiços de Remoção

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Elspeth's Smite | Cats | Exila criatura atacante ou bloqueadora | Média | ✅ |
| Angelic Edict | Cats | Exila criatura ou encantamento | Média | ✅ |
| Hero's Downfall | Vampires | Destrói criatura (já funciona parcial) | Baixa | ✅ |
| Broken Wings | Elves | Destrói artefato, encantamento ou voador | Média | ✅ |
| Felling Blow | Elves | Destrói criatura com flying | Baixa | ✅ |

### 1.2 Prioridade Alta - Feitiços de Dano

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Volley | Goblins | 3 dano a criatura com flying | Baixa | ✅ |
| Incinerating Blast | Goblins | 5 dano a criatura | Baixa | ✅ |
| Kindled Fury | Goblins | +1/+0 e first strike até fim do turno | Média | ✅ |
| Moment of Triumph | Cats | +2/+2 até fim do turno (falta o buff) | Média | ✅ |
| Moment of Craving | Vampires | -2/-2 até fim do turno (melhorar seleção alvo) | Média | ✅ |

### 1.3 Prioridade Média - ETB Triggers

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Dwynen's Elite | Elves | Cria token 1/1 Elf se controla outro Elfo | Baixa | ✅ |
| Elvish Regrower | Elves | Devolve terreno do cemitério para mão | Média | ✅ |
| Bloodtithe Collector | Vampires | Oponente descarta se perdeu vida | Média | ✅ |

### 1.4 Prioridade Média - Restrições e Regras

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Vampire Interloper | Vampires | Não pode bloquear | Baixa | ✅ |
| Leonin Vanguard | Cats | Ganha 1 vida ao atacar com outra criatura | Média | ✅ |
| Frenzied Goblin | Goblins | Pague R ao atacar: impede bloqueio | Alta | ✅ |

### 1.5 Prioridade Média - Triggers de Fase/Turno

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Battle-Rattle Shaman | Goblins | Início combate: criatura ganha +2/+0 | Média | ✅ |
| Stromkirk Bloodthief | Vampires | Fim turno: +1/+1 counter em vampiro se oponente perdeu vida | Alta | ✅ |
| Vengeful Bloodwitch | Vampires | Ganha vida quando oponente perde vida | Alta | ✅ |

### 1.6 Prioridade Baixa - Habilidades Ativadas

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Jazal Goldmane | Cats | 3WW: atacantes ganham +X/+X | Alta | ✅ |
| Goblin Smuggler | Goblins | T: criatura com poder ≤2 não pode ser bloqueada | Alta | ✅ |
| Vampire Neonate | Vampires | 2, T: drena 1 vida | Média | ✅ |
| Elvish Archdruid | Elves | T: add G por cada Elfo (floating mana) | Média | ✅ |
| Wildheart Invoker | Elves | 8: criatura ganha +5/+5 e trample | Alta | ✅ |
| Veteran's Goblin Firebomb | Goblins | 1, T, Sacrifica: 2 dano | Alta | ✅ |

### 1.7 Prioridade Baixa - Feitiços Complexos

| Carta | Deck | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Snakeskin Veil | Elves | +1/+1 counter e hexproof | Média | ✅ |
| Offer Immortality | Vampires | Indestrutível, +1/+1 se vampiro | Alta | ✅ |
| Joraga Invocation | Elves | Todas criaturas +3/+3 e devem ser bloqueadas | Alta | ✅ |

---

## 2. Melhorias de Interface (UI/UX)

### 2.1 Prioridade Alta ✅ CONCLUÍDA

- [x] **Indicador de mana por cor**: Mostrar mana disponível separado por cor (W, U, B, R, G)
- [x] **Preview de carta ampliado**: Área fixa para ver carta em tamanho grande ao passar mouse
- [x] **Histórico de log expandido**: Painel lateral com log completo da partida
- [x] **Indicador de turno mais visível**: Destacar claramente de quem é o turno
- [x] **Indicador visual de summoning sickness**: Ícone 💤 e brilho amarelo para indicar criaturas com summoning sickness

### 2.2 Prioridade Média ✅ CONCLUÍDA

- [x] **Animações de combate**: Cartas se movendo ao atacar/bloquear
- [x] **Efeitos visuais de dano**: Flash vermelho quando jogador/criatura recebe dano
- [x] **Arrastar cartas**: Drag & drop para jogar cartas no campo de batalha
- [x] **Zoom no cemitério**: Ver cartas do cemitério em tamanho maior (modal com clique)
- [x] **Tooltip de keywords**: Explicação ao passar mouse sobre flying, lifelink, etc.
- [x] **Botão de Conceder**: Opção para conceder a partida ao oponente

### 2.3 Prioridade Baixa ✅ CONCLUÍDA

- [x] **Personalização do jogador**: No início da partida, permitir ao jogador inserir seu nome e selecionar um avatar entre 6 planeswalkers tradicionais (incluindo 2 femininos). Nome salvo no localStorage para próxima sessão.
- [x] **Vida inicial configurável**: Opção para definir vida inicial (10, 20, 30 ou 40) na seleção de decks. Padrão: 20
- [x] **Ícone do cemitério**: Substituir sigla "GY" por ícone de tumba/lápide 🪦
- [x] **Reposicionar botão Conceder**: Movido para canto superior esquerdo como botão flutuante (menos propenso a cliques acidentais)
- [x] **Linha de conexão atacante-defensor**: Linhas SVG conectando bloqueador ao atacante durante declaração de bloqueio
- [x] **Avatares com imagens reais**: Usar art_crop do Scryfall para mostrar imagens dos planeswalkers nos avatares em vez de emojis
- [ ] **Responsividade ao zoom do navegador**: Melhorar layout quando usuário altera zoom do navegador (Ctrl+/-)
- [ ] **Tamanho de fonte do histórico**: Permitir aumentar/diminuir tamanho da fonte no painel de histórico da partida
- [ ] **Temas visuais**: Diferentes battlemats/temas de cores
- [ ] **Modo tela cheia**: Otimização para fullscreen
- [ ] **Responsividade mobile**: Adaptar para tablets/celulares
- [ ] **Configurações de som**: Controle de volume, mute individual

---

## 3. Melhorias de Gameplay

### 3.1 Prioridade Alta ✅ CONCLUÍDA

- [x] **Sistema de seleção de alvo genérico**: Para feitiços que precisam escolher alvo
- [x] **Pilha (Stack)**: Implementar stack para responder a feitiços/habilidades (estrutura básica implementada)
- [x] **Prioridade**: Sistema de passar prioridade entre jogadores (estrutura básica implementada)
- [x] **Mulligan**: Opção de trocar mão inicial
- [x] **Tela de fim de jogo**: Ao terminar, mostrar opções para "Ver campo de batalha" (permite apenas hover/inspeção) ou "Voltar ao menu de seleção de deck"

### 3.2 Prioridade Média ✅ CONCLUÍDA

- [x] **Fases de combate detalhadas**: Beginning of combat, end of combat triggers
- [x] **Descarte para tamanho de mão**: Descartar até 7 cartas no fim do turno
- [x] **Morte por deck vazio**: Perder ao tentar comprar de deck vazio
- [x] **Contadores**: Sistema visual de contadores +1/+1, -1/-1, etc.
- [x] **Visualização de dano em criaturas**: Mostrar toughness efetiva (toughness - dano) em vermelho, com indicador de dano marcado e borda pulsante. Dano limpo no fim do turno.

### 3.3 Prioridade Baixa

- [x] **Seleção manual de bloqueadores**: Jogador escolhe bloqueador e depois clica no atacante que quer bloquear (em vez de atribuição automática)
- [ ] **Replay de partida**: Salvar e rever partidas
- [ ] **Desfazer jogada**: Undo para erros do jogador
- [ ] **Modo de treino**: Dicas e sugestões de jogadas

---

## 4. Melhorias de IA

### 4.1 Prioridade Alta

- [x] **Delay nas jogadas da IA**: Adicionar delays entre ações da IA para que o jogador consiga acompanhar o que está acontecendo
- [x] **Jogar instants durante turno do oponente**: Jogador pode jogar instants (como Elspeth's Smite) durante combate do oponente
- [ ] **Avaliação de board state**: IA avaliar vantagem de campo
- [ ] **Uso de remoções**: IA usar feitiços de remoção estrategicamente
- [ ] **Timing de feitiços**: IA jogar instants no momento certo

### 4.2 Prioridade Média

- [ ] **Blefe e conservação**: IA guardar cartas para momentos críticos
- [ ] **Avaliação de trades**: IA calcular melhor trocas de combate
- [ ] **Níveis de dificuldade**: Fácil, Médio, Difícil
- [ ] **Velocidade configurável**: Permitir ao jogador ajustar a velocidade das jogadas da IA (rápido/normal/lento)

### 4.3 Prioridade Baixa

- [ ] **Personalidade por deck**: IA agressiva (Goblins) vs controladora (Vampires)
- [ ] **Aprendizado**: IA adaptar a estratégias do jogador

---

## 5. Novos Conteúdos

### 5.1 Prioridade Média

- [ ] **Mais decks Jumpstart**: Adicionar outros decks do Foundations
- [ ] **Deck builder básico**: Montar decks customizados com cartas disponíveis
- [ ] **Estatísticas**: Win rate, cartas mais jogadas, etc.

### 5.2 Prioridade Baixa

- [ ] **Modo draft**: Simular draft entre os decks disponíveis
- [ ] **Conquistas**: Achievements por realizar certas ações
- [ ] **Torneio vs IA**: Melhor de 3, melhor de 5

---

## 6. Técnico / Infraestrutura

### 6.1 Prioridade Alta

- [ ] **Tratamento de erros**: Capturar e logar erros graciosamente
- [ ] **Validação de estado**: Garantir consistência do game state
- [x] **Testes unitários**: Testes automatizados para regras e mecânicas (Jest)
  - ✅ Testes de combate (dano, first strike, deathtouch, trample, double strike, lifelink)
  - ✅ Testes de keywords e interações (flying/reach, vigilance, haste, menace, cant_block)
  - ✅ Testes de mana e custos (parsing, disponibilidade)
  - ✅ Testes de triggers (ETB, fim de turno, "quando outra criatura entra", etc.)
  - ✅ Testes de efeitos de criaturas específicas (Beast-Kin Ranger, Thornweald Archer, etc.)
  - ✅ Testes de feitiços com alvo (Elspeth's Smite, Volley, buffs, etc.)
  - ✅ 97 testes automatizados em 4 arquivos de teste
  - ✅ Guia completo de execução em TESTING.md
- [x] **Validação de cartas via Scryfall**: Script para validar cartas contra a API do Scryfall
  - ✅ Verifica existência, mana cost, power/toughness, keywords
  - ✅ Identifica cartas sem cobertura de testes
  - ✅ Processo documentado em TESTING.md para adicionar novas cartas
- [ ] **Modo Debug**: Comandos para acelerar testes manuais
  - Comprar carta específica por nome
  - Setar vida de qualquer jogador
  - Adicionar mana ao pool
  - Pular para fase específica
  - Forçar mão inicial
  - Colocar carta direto no campo de batalha

### 6.2 Prioridade Média

- [ ] **Cache de imagens offline**: Service Worker para modo offline
- [ ] **Refatoração de código**: Separar melhor responsabilidades

### 6.3 Prioridade Baixa

- [ ] **PWA**: Transformar em Progressive Web App instalável
- [ ] **Multiplayer local**: Dois jogadores no mesmo computador
- [ ] **Exportar/Importar save**: Backup de partidas salvas

---

## Ordem Sugerida de Implementação

### Fase 1 - Completar Mecânicas Básicas ✅ CONCLUÍDA
1. ✅ Sistema de seleção de alvo genérico
2. ✅ Feitiços de dano (Volley, Incinerating Blast)
3. ✅ Feitiços de remoção (Broken Wings, Felling Blow)
4. ✅ Restrições simples (Vampire Interloper)
5. ✅ ETB triggers faltantes (Dwynen's Elite)

### Fase 2 - Melhorar Experiência ✅ CONCLUÍDA
1. ✅ Indicador de mana por cor
2. ✅ Tooltip de keywords
3. ✅ Animações básicas de combate
4. ✅ Histórico de log expandido
5. ✅ Preview de carta ampliado
6. ✅ Indicador de turno mais visível
7. ✅ Indicador visual de summoning sickness
8. ✅ Efeitos visuais de dano
9. ✅ Drag & drop para cartas

### Fase 3 - Completar Cartas Complexas ✅ CONCLUÍDA
1. ✅ Triggers de fase (Battle-Rattle Shaman, Stromkirk Bloodthief, Vengeful Bloodwitch)
2. ✅ Habilidades ativadas básicas (Vampire Neonate, Goblin Smuggler, Wildheart Invoker, Jazal Goldmane, Veteran's Goblin Firebomb)
3. ✅ Feitiços de buff temporário (Moment of Triumph completo)

### Fase 3.5 - Melhorias de Gameplay ✅ CONCLUÍDA
1. ✅ Sistema de mulligan com modal visual
2. ✅ Tela de fim de jogo melhorada (ver campo de batalha / jogar novamente)
3. ✅ Descarte para tamanho de mão (máximo 7 cartas)
4. ✅ Morte por deck vazio (mill)
5. ✅ Sistema visual de contadores (+1/+1, -1/-1)
6. ✅ Modo de visualização pós-jogo

### Fase 3.6 - Habilidades de Cartas e UI/UX ✅ CONCLUÍDA
1. ✅ Frenzied Goblin - habilidade de impedir bloqueio pagando R
2. ✅ Elvish Archdruid - produção de floating mana verde por elfo
3. ✅ Personalização do jogador (nome e avatar)
4. ✅ Vida inicial configurável (10/20/30/40)
5. ✅ Ícone do cemitério (tumba 🪦)
6. ✅ Reposicionamento do botão Conceder
7. ✅ Linhas de conexão atacante-bloqueador

### Fase 4 - IA e Polish
1. IA usar remoções
2. Níveis de dificuldade
3. Configurações de som

### Fase 5 - Expansão
1. Mais decks
2. Estatísticas
3. PWA / Offline

---

*Última atualização: Dezembro 2025*
