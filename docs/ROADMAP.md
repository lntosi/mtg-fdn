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

Para implementação dos 5 decks restantes, consulte o plano detalhado em [`04_FUTURE_DECKS_PLAN.md`](04_FUTURE_DECKS_PLAN.md).

Ordem sugerida (do mais simples ao mais complexo):

| Ordem | Deck | Mecânica Nova | Esforço |
|:-----:|------|---------------|:-------:|
| 1 | Healing (W) | Lifegain triggers | ⭐⭐ |
| 2 | Inferno (R) | Dragon cost reduction | ⭐⭐ |
| 3 | Primal (G) | Fight | ⭐⭐⭐ |
| 4 | Wizards (U) | Kicker | ⭐⭐⭐ |
| 5 | Undead (B) | Graveyard recursion | ⭐⭐⭐⭐ |

---

### 2. Melhorias de IA

#### 2.1 Essencial
- [x] **Sequenciamento de cartas condicionais**: IA segura cartas com ETBs condicionais (Bloodtithe Collector, Raid) para Main Phase 2
- [ ] **Uso de remoções**: IA usar feitiços de remoção estrategicamente
- [ ] **Avaliação de trades**: IA calcular melhor trocas de combate
- [ ] **Timing de instants**: IA jogar instants no momento certo
- [ ] **Criaturas com poder 0**: IA não deveria atacar com criaturas sem poder (ex: Vampire Neonate 0/3)
- [ ] **Uso de habilidades ativadas**: IA deveria priorizar habilidades ativadas quando vantajosas (ex: Vampire Neonate drena 1 vida por 2 mana em vez de atacar com 0 dano)

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

#### Fase 1: Extrair Triggers (CONCLUÍDA)
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
- [x] **Tratamento de erros**: Sistema de logs com captura automática de erros JS (LogManager)

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
- ✅ Menu de configurações (tecla ESC) com layout duas colunas
- ✅ Modo tela cheia
- ✅ Configurações de som (efeitos + música de fundo separados)
- ✅ Modais arrastáveis padronizados (incluindo Settings)
- ✅ Símbolos de mana MTG reais no preview
- ✅ Indicador de stack (hourglass) para permanentes pendentes
- ✅ Stack badge com hover dropdown no botão de prioridade
- ✅ Preview aprimorado com display de dano/buffs (base → atual → efetivo)
- ✅ Aura badges no preview de criaturas encantadas
- ✅ Priority stops configuráveis (estilo Arena)

### Técnico
- ✅ Testes unitários (Jest) - 140 testes
- ✅ Validação de cartas via Scryfall
- ✅ Modo Debug completo
- ✅ Ward mechanic (Tolarian Terror)
- ✅ Equipment system (Pirate's Cutlass: ETB + Equip)
- ✅ Sistema de logs exportável (LogManager)
- ✅ Captura automática de erros JavaScript

</details>

---

## Atualizações Recentes (Dezembro 2025)

### Validação Completa de Cartas
Todos os 5 decks foram validados contra a API do Scryfall:

| Deck | Status | Bugs Corrigidos |
|------|--------|-----------------|
| Cats | ✅ | Elspeth's Smite (era exile direto, agora 3 dano + exile) |
| Goblins | ✅ | Incinerating Blast (5→6 dano + loot), Goblin Firebomb (custo e efeito) |
| Vampires | ✅ | Offer Immortality (efeito completo), Crossway Troublemakers (death trigger) |
| Elves | ✅ | Felling Blow (one-sided fight completo) |
| Pirates | ✅ | Eaten by Piranhas (Flash + targeting), Ward funcional |

### Mecânicas Robustas Implementadas
- **Must Be Blocked** (Joraga Invocation) - IA respeita obrigatoriedade
- **Hexproof Targeting** - Inclui hexproof temporário (Snakeskin Veil)
- **Yes/No Prompts** - Para efeitos opcionais do jogador
- **Loot Interativo** - Jogador escolhe carta para descartar

### Documentação Reorganizada
- `docs/01_TESTING.md` - Guia de testes automatizados
- `docs/02_DEBUG.md` - Comandos de debug
- `docs/03_CARD_VALIDATION.md` - Status de validação das cartas
- `docs/04_FUTURE_DECKS_PLAN.md` - Plano para 5 decks restantes
- `docs/ROADMAP.md` - Este arquivo
- `docs/MagicCompRules 20251114.txt` - Regras oficiais do Magic

### Bug Fixes Recentes
- Haste funciona corretamente para ataques e tap abilities
- Marcação de dano em combate em criaturas sobreviventes
- Summoning sickness só aplica a criaturas (não enchantments/artifacts)
- Vengeful Bloodwitch não dispara duplo quando morre
- Lord bonuses exibidos corretamente no log exportado

### Novas Funcionalidades (Dezembro 2025)

#### Stack Badge com Hover Dropdown
- Badge `[N]` no botão "Passar Prioridade" mostra quantidade de itens na pilha
- Hover expande dropdown com lista completa (LIFO order)
- Topo da pilha destacado em dourado

#### Priority Stops Configuráveis (estilo Arena)
- Janelas de prioridade em: Upkeep, Início Combate, Após Atacantes, Após Bloqueadores, End Step
- Configurações separadas para seu turno e turno do oponente
- Auto-pass quando não há respostas válidas

#### Settings Modal Redesenhado
- Layout em duas colunas (Som/Exibição/Debug | Priority Stops)
- Modal arrastável pelo título
- Botão "Resetar Padrão" (SFX 70%, Música 80%, Log OFF, Undo OFF)

---

*Última atualização: Dezembro 2025*
