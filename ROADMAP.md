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

### 1.8 Deck Pirates (Azul) ✅ IMPLEMENTADO

| Carta | Tipo | Efeito | Complexidade | Status |
|-------|------|--------|--------------|--------|
| Spectral Sailor | Criatura | Flash, Flying | Baixa | ✅ |
| Kitesail Corsair | Criatura | Flying enquanto ataca | Média | ✅ |
| Brineborn Cutthroat | Criatura | Flash, +1/+1 ao conjurar no turno do oponente | Alta | ✅ |
| Corsair Captain | Criatura | Lord (+1/+1 Piratas), ETB cria Treasure | Média | ✅ |
| Storm Fleet Spy | Criatura | Raid: compra carta | Média | ✅ |
| Bigfin Bouncer | Criatura | ETB bounce criatura do oponente | Média | ✅ |
| Skyship Buccaneer | Criatura | Flying, Raid: compra carta | Média | ✅ |
| Tolarian Terror | Criatura | Ward | Baixa | ✅ |
| Opt | Instant | Scry 1, compra carta | Média | ✅ |
| Cancel | Instant | Counterspell | Alta | ✅ |
| Eaten by Piranhas | Aura | Flash, remove habilidades, P/T vira 1/1 | Alta | ✅ |
| Pirate's Cutlass | Equipamento | +2/+1, auto-equipa em Pirata ao entrar | Média | ✅ |

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
- [x] **Reposicionar botão Conceder**: Movido para menu de configurações (tecla M)
- [x] **Linha de conexão atacante-defensor**: Linhas SVG conectando bloqueador ao atacante durante declaração de bloqueio
- [x] **Avatares com imagens reais**: Usar art_crop do Scryfall para mostrar imagens dos planeswalkers nos avatares em vez de emojis
- [x] **Linhas de bloqueio da IA**: Exibir setas conectando bloqueadores da IA aos atacantes do jogador (igual à visualização quando o jogador bloqueia)
- [x] **Responsividade ao zoom do navegador**: Melhorar layout quando usuário altera zoom do navegador (Ctrl+/-)
- [x] **Tamanho de fonte do histórico**: Permitir aumentar/diminuir tamanho da fonte no painel de histórico da partida
- [x] **Temas visuais**: 3 temas disponíveis (Roxo Místico, Clean, Alto Contraste) acessíveis via menu M
- [x] **Modo tela cheia**: Botão no menu de configurações (tecla M)
- [x] **Configurações de som**: Controle de volume e mute no menu de configurações
- [x] **Menu de configurações**: Tecla M abre menu com temas, som, tela cheia e opção de conceder
- [x] **Botão principal contextual**: Botão que muda texto e cor baseado no contexto (→ Combate, Resolver, Passar Prioridade, etc.)
- [x] **Filtro de mana por deck**: Pool de mana mostra apenas cores relevantes aos decks selecionados
- [x] **Opções de início de jogo**: Escolher quem começa (aleatório/jogador/IA) e modo de seleção de decks da IA
- [ ] **Responsividade mobile**: Adaptar para tablets/celulares

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
- [x] **Desfazer jogada**: Sistema de undo opcional (habilitável via Settings M) para desfazer ações do jogador
- [ ] **Replay de partida**: Salvar e rever partidas
- [ ] **Modo de treino**: Dicas e sugestões de jogadas

---

## 4. Melhorias de IA

### 4.1 Prioridade Alta

- [x] **Delay nas jogadas da IA**: Adicionar delays entre ações da IA para que o jogador consiga acompanhar o que está acontecendo
- [x] **Jogar instants durante turno do oponente**: Jogador pode jogar instants (como Elspeth's Smite) durante combate do oponente
- [x] **Janela de prioridade após bloqueadores**: Jogador pode responder após IA declarar bloqueadores (antes do dano de combate)
- [x] **Validação de alvos para instants**: Instants só aparecem na janela de prioridade se tiverem alvos válidos (ex: Elspeth's Smite só aparece se há atacantes/bloqueadores)
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

## 5. Beginner Box Completo - Decks Jumpstart

**Objetivo**: Implementar todos os 10 decks do Foundations Beginner Box.

### 5.0 Status Geral

| Deck | Cor | Tema | Status | Progresso |
|------|:---:|------|:------:|:---------:|
| Cats | W | Lifegain, Tokens | ✅ Completo | 100% |
| Goblins | R | Aggro, Lords | ✅ Completo | 100% |
| Vampires | B | Drain, Flying | ✅ Completo | 100% |
| Elves | G | Ramp, Lords | ✅ Completo | 100% |
| Pirates | U | Flash, Control | ✅ Completo | 100% |
| Healing | W | Lifegain triggers | ⬚ Pendente | 0% |
| Wizards | U | Draw, Bounce | ⬚ Pendente | 0% |
| Undead | B | Recursion, Sacrifice | ⬚ Pendente | 0% |
| Inferno | R | Dragons, Treasure | ⬚ Pendente | 0% |
| Primal | G | +1/+1 counters, Fight | ⬚ Pendente | 0% |

**Progresso Total: 5/10 decks (50%)**

### 5.1 Deck Healing (Branco) - Prioridade Alta

| Carta | Tipo | Mecânica Principal | Complexidade | Status |
|-------|------|-------------------|:------------:|:------:|
| Ancestor Dragon | Criatura | Lifegain em ataque | Média | ⬚ |
| Ajani's Pridemate | Criatura | +1/+1 quando ganha vida | Alta | ⬚ |
| Dazzling Angel | Criatura | Flying, Lifegain | Baixa | ⬚ |
| Bishop's Soldier | Criatura | Lifelink | Baixa | ⬚ |
| Herald of Faith | Criatura | Flying, Lifegain em ataque | Média | ⬚ |
| Inspiring Overseer | Criatura | Flying, ETB draw + life | Média | ⬚ |
| Twinblade Paladin | Criatura | Double strike condicional | Alta | ⬚ |
| Hinterland Sanctifier | Criatura | Proteção | Média | ⬚ |
| Quick-Draw Katana | Equipamento | First strike, equip ETB | Média | ⬚ |
| Adamant Will | Instant | Indestructible, +1/+0 | Baixa | ⬚ |
| Deadly Riposte | Instant | Dano + Lifegain | Baixa | ⬚ |
| Prayer of Binding | Enchantment | Exílio temporário | Alta | ⬚ |

**Mecânicas novas necessárias**: Lifegain triggers, Double strike condicional

### 5.2 Deck Primal (Verde) - Prioridade Alta

| Carta | Tipo | Mecânica Principal | Complexidade | Status |
|-------|------|-------------------|:------------:|:------:|
| Aggressive Mammoth | Criatura | Dá trample a todos | Média | ⬚ |
| Wildwood Scourge | Criatura | +1/+1 quando outro ganha counter | Alta | ⬚ |
| Bear Cub | Criatura | Vanilla 2/2 | Baixa | ⬚ |
| Druid of the Cowl | Criatura | Tap for mana | Baixa | ⬚ |
| Magnigoth Sentry | Criatura | Reach | Baixa | ⬚ |
| Mild-Mannered Librarian | Criatura | Trample condicional | Média | ⬚ |
| Thrashing Brontodon | Criatura | Sacrifica: destrói artefato/encantamento | Média | ⬚ |
| Bite Down | Instant | Fight | Alta | ⬚ |
| Giant Growth | Instant | +3/+3 | Baixa | ⬚ |
| Biogenic Upgrade | Sorcery | Distribui +1/+1 counters | Média | ⬚ |
| New Horizons | Enchantment | Aura em land + counter | Média | ⬚ |

**Mecânicas novas necessárias**: Fight, Counter distribution

### 5.3 Deck Inferno (Vermelho) - Prioridade Média

| Carta | Tipo | Mecânica Principal | Complexidade | Status |
|-------|------|-------------------|:------------:|:------:|
| Terror of Mount Velus | Criatura | Dragon, double strike a todos | Alta | ⬚ |
| Firespitter Whelp | Criatura | Dragon, damage trigger | Média | ⬚ |
| Rapacious Dragon | Criatura | Dragon, ETB treasure | Média | ⬚ |
| Dragonlord's Servant | Criatura | Reduz custo de Dragons | Alta | ⬚ |
| Fire Elemental | Criatura | Vanilla 5/4 | Baixa | ⬚ |
| Kargan Dragonrider | Criatura | Flying condicional (dragons) | Média | ⬚ |
| Skyraker Giant | Criatura | Reach | Baixa | ⬚ |
| Carnelian Orb of Dragonkind | Artifact | Mana + haste para Dragons | Alta | ⬚ |
| Fiery Annihilation | Sorcery | 5 dano | Baixa | ⬚ |
| Scorching Dragonfire | Instant | 3 dano + exile | Média | ⬚ |
| Seize the Spoils | Sorcery | Discard, draw, treasure | Média | ⬚ |

**Mecânicas novas necessárias**: Cost reduction, Dragon synergy, Exile on damage

### 5.4 Deck Wizards (Azul) - Prioridade Média

| Carta | Tipo | Mecânica Principal | Complexidade | Status |
|-------|------|-------------------|:------------:|:------:|
| Mystic Archaeologist | Criatura | Draw ativado | Média | ⬚ |
| Clinquant Skymage | Criatura | Flying, prowess-like | Média | ⬚ |
| Erudite Wizard | Criatura | ETB scry | Baixa | ⬚ |
| Icewind Elemental | Criatura | ETB tap | Média | ⬚ |
| Mischievous Mystic | Criatura | ETB bounce own | Média | ⬚ |
| Burrog Befuddler | Criatura | Flash, ETB -1/-0 | Média | ⬚ |
| Exclusion Mage | Criatura | ETB bounce opponent | Média | ⬚ |
| Arcane Epiphany | Instant | Draw 3 | Baixa | ⬚ |
| Fleeting Distraction | Instant | -1/-0, draw | Baixa | ⬚ |
| Into the Roil | Instant | Bounce, kicker draw | Média | ⬚ |
| Quick Study | Instant | Draw 2 | Baixa | ⬚ |
| Starlight Snare | Enchantment | Tap down | Média | ⬚ |

**Mecânicas novas necessárias**: Kicker, Prowess-like triggers

### 5.5 Deck Undead (Preto) - Prioridade Baixa (mais complexo)

| Carta | Tipo | Mecânica Principal | Complexidade | Status |
|-------|------|-------------------|:------------:|:------:|
| Death Baron | Criatura | Lord Skeletons/Zombies + deathtouch | Alta | ⬚ |
| Reassembling Skeleton | Criatura | Recursão do cemitério | Alta | ⬚ |
| Diregraf Ghoul | Criatura | Entra virado | Baixa | ⬚ |
| Hungry Ghoul | Criatura | Death trigger +1/+1 | Média | ⬚ |
| Crow of Dark Tidings | Criatura | Mill on ETB/death | Média | ⬚ |
| Maalfeld Twins | Criatura | Death: cria tokens | Alta | ⬚ |
| Skeleton Archer | Criatura | ETB damage | Média | ⬚ |
| Suspicious Shambler | Criatura | Can't block, death trigger | Média | ⬚ |
| Cemetery Recruitment | Sorcery | Recursão + draw | Média | ⬚ |
| Deadly Plot | Instant | Destroy + surveil | Média | ⬚ |
| Eaten Alive | Sorcery | Sacrifice + exile | Alta | ⬚ |
| Undying Malice | Instant | Return on death | Alta | ⬚ |

**Mecânicas novas necessárias**: Graveyard recursion, Sacrifice costs, Mill, Surveil

### 5.6 Estimativa de Esforço

| Deck | Esforço Estimado | Mecânicas Reutilizáveis |
|------|:----------------:|------------------------|
| Healing | ~3 horas | Lifelink, ETB, Counters |
| Primal | ~3 horas | Counters, Trample, Tap for mana |
| Inferno | ~4 horas | Treasure (de Pirates), ETB |
| Wizards | ~3 horas | Flash, Bounce, Scry (de Pirates) |
| Undead | ~5 horas | Death triggers (parcial de Vampires) |

**Total estimado: 15-20 horas de desenvolvimento**

### 5.7 Outras Funcionalidades

- [ ] **Deck builder básico**: Montar decks customizados com cartas disponíveis
- [ ] **Estatísticas**: Win rate, cartas mais jogadas, etc.
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
- [x] **Modo Debug**: Comandos para acelerar testes manuais via console (`window.debug`)
  - ✅ Comprar carta específica por nome (`debug.draw()`, `debug.drawAny()`)
  - ✅ Setar vida de qualquer jogador (`debug.setLife()`)
  - ✅ Adicionar mana ao pool (`debug.addMana()`, `debug.fullMana()`)
  - ✅ Pular para fase específica (`debug.setPhase()`, `debug.skipTo()`)
  - ✅ Forçar mão inicial (`debug.setHand()`, `debug.clearHand()`)
  - ✅ Colocar carta direto no campo de batalha (`debug.addToBattlefield()`)
  - ✅ Comandos auxiliares: `debug.state()`, `debug.battlefield()`, `debug.hand()`, `debug.kill()`, `debug.setupCombat()`

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

### Fase 5 - Primeiro Deck Adicional ✅ CONCLUÍDA
1. ✅ Deck Pirates (Azul) com mecânicas: Flash, Raid, Counterspell, Bounce, Scry, Equipment

### Fase 6 - Beginner Box Completo (5 decks restantes)

**Ordem sugerida** (do mais simples ao mais complexo):

1. **Healing (W)** - Reutiliza muita coisa de Cats
   - Lifegain triggers (Ajani's Pridemate)
   - Equipment (Quick-Draw Katana)

2. **Primal (G)** - Similar a Elves
   - Fight mechanic (Bite Down)
   - Counter distribution

3. **Inferno (R)** - Similar a Goblins
   - Dragon synergies
   - Cost reduction
   - Treasure tokens (já implementado)

4. **Wizards (U)** - Similar a Pirates
   - Kicker mechanic
   - Mais bounce/draw

5. **Undead (B)** - Mais complexo, deixar por último
   - Graveyard recursion
   - Sacrifice costs
   - Mill/Surveil

### Fase 7 - Polish Final
1. Estatísticas de partidas
2. PWA / Offline
3. Temas visuais

---

## Para Avaliar Futuramente

Itens que precisam de revisão ou decisão sobre manter/modificar/remover:

### UX/Interface
- **Hover duplo nas cartas da mão**: Atualmente há zoom CSS local (carta aumenta 2.8x no lugar) E preview lateral direito com detalhes da carta. Ambos funcionam simultaneamente ao passar o mouse - avaliar se manter os dois (o preview lateral mostra texto/efeito mais legível), manter apenas um, ou unificar a experiência.

---

*Última atualização: Dezembro 2025*
