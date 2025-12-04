# MTG Jumpstart Foundations - Roadmap de Desenvolvimento

Este documento mapeia os efeitos de cartas pendentes e melhorias futuras para o jogo.

---

## 1. Efeitos de Cartas Pendentes

### 1.1 Prioridade Alta - Feitiços de Remoção

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Elspeth's Smite | Cats | Exila criatura atacante ou bloqueadora | Média |
| Angelic Edict | Cats | Exila criatura ou encantamento | Média |
| Hero's Downfall | Vampires | Destrói criatura (já funciona parcial) | Baixa |
| Broken Wings | Elves | Destrói artefato, encantamento ou voador | Média |
| Felling Blow | Elves | Destrói criatura com flying | Baixa |

### 1.2 Prioridade Alta - Feitiços de Dano

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Volley | Goblins | 3 dano a criatura com flying | Baixa |
| Incinerating Blast | Goblins | 5 dano a criatura | Baixa |
| Kindled Fury | Goblins | +1/+0 e first strike até fim do turno | Média |
| Moment of Triumph | Cats | +2/+2 até fim do turno (falta o buff) | Média |
| Moment of Craving | Vampires | -2/-2 até fim do turno (melhorar seleção alvo) | Média |

### 1.3 Prioridade Média - ETB Triggers

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Dwynen's Elite | Elves | Cria token 1/1 Elf se controla outro Elfo | Baixa |
| Elvish Regrower | Elves | Devolve terreno do cemitério para mão | Média |
| Bloodtithe Collector | Vampires | Oponente descarta se perdeu vida | Média |

### 1.4 Prioridade Média - Restrições e Regras

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Vampire Interloper | Vampires | Não pode bloquear | Baixa |
| Leonin Vanguard | Cats | Ganha 1 vida ao atacar com outra criatura | Média |
| Frenzied Goblin | Goblins | Pague R ao atacar: impede bloqueio | Alta |

### 1.5 Prioridade Média - Triggers de Fase/Turno

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Battle-Rattle Shaman | Goblins | Início combate: criatura ganha +2/+0 | Média |
| Stromkirk Bloodthief | Vampires | Fim turno: +1/+1 counter em vampiro se oponente perdeu vida | Alta |
| Vengeful Bloodwitch | Vampires | Ganha vida quando oponente perde vida | Alta |

### 1.6 Prioridade Baixa - Habilidades Ativadas

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Jazal Goldmane | Cats | 3WW: atacantes ganham +X/+X | Alta |
| Goblin Smuggler | Goblins | T: criatura com poder ≤2 não pode ser bloqueada | Alta |
| Vampire Neonate | Vampires | 2, T: drena 1 vida | Média |
| Elvish Archdruid | Elves | T: add G por cada Elfo (falta mana) | Média |
| Wildheart Invoker | Elves | 8: criatura ganha +5/+5 e trample | Alta |
| Veteran's Goblin Firebomb | Goblins | 1, T, Sacrifica: 2 dano | Alta |

### 1.7 Prioridade Baixa - Feitiços Complexos

| Carta | Deck | Efeito | Complexidade |
|-------|------|--------|--------------|
| Snakeskin Veil | Elves | +1/+1 counter e hexproof | Média |
| Offer Immortality | Vampires | Indestrutível, +1/+1 se vampiro | Alta |
| Joraga Invocation | Elves | Todas criaturas +3/+3 e devem ser bloqueadas | Alta |

---

## 2. Melhorias de Interface (UI/UX)

### 2.1 Prioridade Alta

- [ ] **Indicador de mana por cor**: Mostrar mana disponível separado por cor (W, U, B, R, G)
- [ ] **Preview de carta ampliado**: Área fixa para ver carta em tamanho grande ao passar mouse
- [ ] **Histórico de log expandido**: Painel lateral com log completo da partida
- [ ] **Indicador de turno mais visível**: Destacar claramente de quem é o turno

### 2.2 Prioridade Média

- [ ] **Animações de combate**: Cartas se movendo ao atacar/bloquear
- [ ] **Efeitos visuais de dano**: Flash vermelho quando jogador/criatura recebe dano
- [ ] **Arrastar cartas**: Drag & drop para jogar cartas e atribuir bloqueadores
- [ ] **Zoom no cemitério**: Ver cartas do cemitério em tamanho maior
- [ ] **Tooltip de keywords**: Explicação ao passar mouse sobre flying, lifelink, etc.

### 2.3 Prioridade Baixa

- [ ] **Temas visuais**: Diferentes battlemats/temas de cores
- [ ] **Modo tela cheia**: Otimização para fullscreen
- [ ] **Responsividade mobile**: Adaptar para tablets/celulares
- [ ] **Configurações de som**: Controle de volume, mute individual

---

## 3. Melhorias de Gameplay

### 3.1 Prioridade Alta

- [ ] **Sistema de seleção de alvo genérico**: Para feitiços que precisam escolher alvo
- [ ] **Pilha (Stack)**: Implementar stack para responder a feitiços/habilidades
- [ ] **Prioridade**: Sistema de passar prioridade entre jogadores
- [ ] **Mulligan**: Opção de trocar mão inicial

### 3.2 Prioridade Média

- [ ] **Fases de combate detalhadas**: Beginning of combat, end of combat triggers
- [ ] **Descarte para tamanho de mão**: Descartar até 7 cartas no fim do turno
- [ ] **Morte por deck vazio**: Perder ao tentar comprar de deck vazio
- [ ] **Contadores**: Sistema visual de contadores +1/+1, -1/-1, etc.

### 3.3 Prioridade Baixa

- [ ] **Replay de partida**: Salvar e rever partidas
- [ ] **Desfazer jogada**: Undo para erros do jogador
- [ ] **Modo de treino**: Dicas e sugestões de jogadas

---

## 4. Melhorias de IA

### 4.1 Prioridade Alta

- [ ] **Avaliação de board state**: IA avaliar vantagem de campo
- [ ] **Uso de remoções**: IA usar feitiços de remoção estrategicamente
- [ ] **Timing de feitiços**: IA jogar instants no momento certo

### 4.2 Prioridade Média

- [ ] **Blefe e conservação**: IA guardar cartas para momentos críticos
- [ ] **Avaliação de trades**: IA calcular melhor trocas de combate
- [ ] **Níveis de dificuldade**: Fácil, Médio, Difícil

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

### 6.2 Prioridade Média

- [ ] **Cache de imagens offline**: Service Worker para modo offline
- [ ] **Testes automatizados**: Testes para regras e mecânicas
- [ ] **Refatoração de código**: Separar melhor responsabilidades

### 6.3 Prioridade Baixa

- [ ] **PWA**: Transformar em Progressive Web App instalável
- [ ] **Multiplayer local**: Dois jogadores no mesmo computador
- [ ] **Exportar/Importar save**: Backup de partidas salvas

---

## Ordem Sugerida de Implementação

### Fase 1 - Completar Mecânicas Básicas
1. Sistema de seleção de alvo genérico
2. Feitiços de dano (Volley, Incinerating Blast)
3. Feitiços de remoção (Broken Wings, Felling Blow)
4. Restrições simples (Vampire Interloper)
5. ETB triggers faltantes (Dwynen's Elite)

### Fase 2 - Melhorar Experiência
1. Indicador de mana por cor
2. Tooltip de keywords
3. Animações básicas de combate
4. Histórico de log expandido

### Fase 3 - Completar Cartas Complexas
1. Triggers de fase (Battle-Rattle Shaman)
2. Habilidades ativadas básicas (Vampire Neonate)
3. Feitiços de buff temporário (Moment of Triumph completo)

### Fase 4 - IA e Polish
1. IA usar remoções
2. Níveis de dificuldade
3. Efeitos visuais de dano
4. Configurações de som

### Fase 5 - Expansão
1. Mais decks
2. Estatísticas
3. PWA / Offline

---

*Última atualização: Dezembro 2024*
