# MTG Jumpstart Foundations - Roadmap

Este documento mapeia o desenvolvimento do jogo.

---

## Status Atual

**5 de 10 decks implementados (50%)**

| Deck | Cor | Status |
|------|:---:|:------:|
| Cats | W | ✅ |
| Goblins | R | ✅ |
| Vampires | B | ✅ |
| Elves | G | ✅ |
| Pirates | U | ✅ |
| Healing | W | ⬚ |
| Primal | G | ⬚ |
| Inferno | R | ⬚ |
| Wizards | U | ⬚ |
| Undead | B | ⬚ |

**Funcionalidades principais**: Todas implementadas (mulligan, stack, prioridade, contadores, etc.)

---

## Próximos Passos

### 1. Decks Restantes (Prioridade Principal)

Ordem sugerida (do mais simples ao mais complexo):

#### 1.1 Healing (Branco) - ~3h
Reutiliza mecânicas de Cats. Mecânicas novas:
- **Lifegain triggers** (Ajani's Pridemate: +1/+1 quando ganha vida)
- **Double strike condicional** (Twinblade Paladin)
- **Exílio temporário** (Prayer of Binding)

| Carta | Tipo | Mecânica | Complexidade |
|-------|------|----------|:------------:|
| Ajani's Pridemate | Criatura | +1/+1 quando ganha vida | Alta |
| Twinblade Paladin | Criatura | Double strike condicional | Alta |
| Inspiring Overseer | Criatura | Flying, ETB draw + life | Média |
| Prayer of Binding | Enchantment | Exílio temporário | Alta |
| Quick-Draw Katana | Equipamento | First strike, auto-equip | Baixa* |

*Sistema de Equipment já implementado (Pirate's Cutlass). Requer apenas configuração.

#### 1.2 Primal (Verde) - ~3h
Similar a Elves. Mecânicas novas:
- **Fight** (Bite Down)
- **Distribuição de counters** (Biogenic Upgrade)
- **Lord global** (Aggressive Mammoth dá trample a todos)

| Carta | Tipo | Mecânica | Complexidade |
|-------|------|----------|:------------:|
| Aggressive Mammoth | Criatura | Dá trample a todos | Média |
| Wildwood Scourge | Criatura | +1/+1 quando outro ganha counter | Alta |
| Bite Down | Instant | Fight | Alta |
| Giant Growth | Instant | +3/+3 | Baixa |
| Biogenic Upgrade | Sorcery | Distribui counters | Média |

#### 1.3 Inferno (Vermelho) - ~4h
Similar a Goblins. Mecânicas novas:
- **Dragon synergies** (Kargan Dragonrider)
- **Cost reduction** (Dragonlord's Servant)
- Reutiliza Treasure tokens

| Carta | Tipo | Mecânica | Complexidade |
|-------|------|----------|:------------:|
| Terror of Mount Velus | Criatura | Dá double strike a todos | Alta |
| Dragonlord's Servant | Criatura | Reduz custo de Dragons | Média* |
| Rapacious Dragon | Criatura | ETB cria Treasure | Média |
| Scorching Dragonfire | Instant | 3 dano + exile | Média |

*Redução de custo já implementada (Tolarian Terror). Requer adaptação para Dragons.

#### 1.4 Wizards (Azul) - ~3h
Similar a Pirates. Mecânicas novas:
- **Kicker** (Into the Roil)
- **Prowess-like** (Clinquant Skymage)

| Carta | Tipo | Mecânica | Complexidade |
|-------|------|----------|:------------:|
| Mystic Archaeologist | Criatura | Draw ativado | Média |
| Clinquant Skymage | Criatura | Prowess-like | Média |
| Into the Roil | Instant | Bounce + kicker draw | Média |
| Arcane Epiphany | Instant | Draw 3 | Baixa |

#### 1.5 Undead (Preto) - ~5h (mais complexo)
Mecânicas mais avançadas:
- **Graveyard recursion** (Reassembling Skeleton)
- **Sacrifice costs** (Eaten Alive)
- **Death triggers** (Maalfeld Twins)
- **Mill/Surveil** (Crow of Dark Tidings)

| Carta | Tipo | Mecânica | Complexidade |
|-------|------|----------|:------------:|
| Death Baron | Criatura | Lord + deathtouch | Alta |
| Reassembling Skeleton | Criatura | Recursão | Alta |
| Maalfeld Twins | Criatura | Death: cria tokens | Alta |
| Eaten Alive | Sorcery | Sacrifice + exile | Alta |

---

### 2. Melhorias de IA

#### 2.1 Essencial
- [x] **Sequenciamento de cartas condicionais**: IA segura cartas com ETBs condicionais (Bloodtithe Collector, Raid) para Main Phase 2
- [ ] **Uso de remoções**: IA usar feitiços de remoção estrategicamente
- [ ] **Avaliação de trades**: IA calcular melhor trocas de combate
- [ ] **Timing de instants**: IA jogar instants no momento certo

#### 2.2 Níveis de Dificuldade

Sistema de dificuldade com 3 níveis que afetam o comportamento estratégico da IA:

| Nível | Nome | Comportamento |
|:-----:|------|---------------|
| 🟢 | **Aprendiz** (Fácil) | Ataques subótimos, não bloqueia bem, não guarda mana para instants |
| 🟡 | **Mago** (Normal) | Joga corretamente, decisões balanceadas |
| 🔴 | **Planeswalker** (Difícil) | Bluffa, guarda remoção, faz trades inteligentes, antecipa jogadas |

**Implementação sugerida:**
- [ ] Seletor de dificuldade na tela inicial (após escolha de decks)
- [ ] Classe `AIDifficulty` com estratégias por nível
- [ ] Parâmetros ajustáveis: agressividade, avaliação de trades, uso de remoções

#### 2.3 Desejável
- [ ] **Velocidade configurável**: Ajustar velocidade das jogadas da IA
- [ ] **Personalidade por deck**: IA agressiva (Goblins) vs controladora (Pirates)

---

### 3. Refatoração Incremental (Em Andamento)

**Objetivo**: Separar responsabilidades do `game.js` para facilitar adição de novos decks.

**Estratégia**: Refatoração conservadora - extrair apenas o necessário, manter `game.js` como coordenador.

#### Fase 1: Extrair Triggers (ATUAL)
- [x] Criar `js/triggers.js` para centralizar:
  - ETB effects (enters-the-battlefield)
  - Death triggers
  - Combat triggers (raid, etc.)
  - Lord bonuses
- [x] Manter `game.js` chamando `TriggerManager`
- [x] Rodar testes após extração

#### Fase 2: Avaliar Necessidade (Após Decks)
Após implementar os 5 decks restantes, avaliar se vale extrair:
- [ ] `combat.js` - Sistema de combate
- [ ] `stack.js` - Pilha e prioridade

**Benefício esperado**: Ao adicionar novo deck, basta editar `triggers.js` para novos ETBs em vez de navegar pelo `game.js` inteiro.

---

### 4. Pendências Menores

#### UI/UX
- [ ] **Responsividade mobile**: Adaptar para tablets/celulares

#### Técnico
- [ ] **Tratamento de erros**: Capturar e logar erros graciosamente

---

## Ideias Futuras (sem compromisso)

Itens que podem ou não ser implementados:

- **Modo de treino**: Dicas e sugestões de jogadas para iniciantes
- **Estatísticas**: Win rate, cartas mais jogadas
- **Conquistas**: Achievements por realizar certas ações
- **Torneio vs IA**: Melhor de 3, melhor de 5
- **Multiplayer local**: Dois jogadores no mesmo computador
- **Deck builder**: Montar decks customizados

---

## Histórico de Implementação

<details>
<summary>Clique para expandir - Funcionalidades já implementadas</summary>

### Decks Completos (5/10)
- ✅ Cats (W) - Lifegain, Tokens, Lords
- ✅ Goblins (R) - Aggro, Lords, Haste
- ✅ Vampires (B) - Drain, Flying, Death triggers
- ✅ Elves (G) - Ramp, Lords, Mana dorks
- ✅ Pirates (U) - Flash, Raid, Counterspell, Bounce, Scry, Equipment, Ward

### Gameplay
- ✅ Sistema de seleção de alvo genérico
- ✅ Stack básico e sistema de prioridade
- ✅ Mulligan (London Mulligan)
- ✅ Fases de combate detalhadas
- ✅ Atribuição de dano a múltiplos bloqueadores (Regra 510.1c)
- ✅ Descarte para 7 cartas
- ✅ Morte por deck vazio
- ✅ Contadores (+1/+1, -1/-1)
- ✅ Visualização de dano em criaturas
- ✅ Sistema de undo opcional

### UI/UX
- ✅ Preview de carta ampliado
- ✅ Indicador de mana por cor
- ✅ Histórico de log expandido
- ✅ Tooltip de keywords
- ✅ Animações de combate
- ✅ Efeitos visuais de dano
- ✅ Drag & drop para cartas
- ✅ Zoom no cemitério (modal)
- ✅ Linhas de conexão atacante-bloqueador
- ✅ Personalização do jogador (nome + avatar)
- ✅ Vida inicial configurável
- ✅ Temas visuais (3 opções)
- ✅ Menu de configurações (tecla M)
- ✅ Modo tela cheia
- ✅ Configurações de som

### Técnico
- ✅ Testes unitários (Jest) - 135 testes
- ✅ Validação de cartas via Scryfall
- ✅ Modo Debug completo
- ✅ Ward mechanic (Tolarian Terror)
- ✅ Equipment system (Pirate's Cutlass: ETB + Equip)
- ✅ Modais arrastáveis padronizados

</details>

---

*Última atualização: Dezembro 2025*
