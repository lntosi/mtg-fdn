# MTG Jumpstart Foundations - Roadmap

Este documento mapeia o desenvolvimento do jogo.

---

## Status Atual

**Projeto COMPLETO** - Todos os 10 decks implementados e validados ✅

| Deck | Cor | Status | Última Validação |
|------|:---:|:------:|:----------------:|
| Cats | W | ✅ | Fev 2026 |
| Goblins | R | ✅ | Fev 2026 |
| Vampires | B | ✅ | Fev 2026 |
| Elves | G | ✅ | Fev 2026 |
| Pirates | U | ✅ | Fev 2026 |
| Healing | W | ✅ | Fev 2026 |
| Primal | G | ✅ | Fev 2026 |
| Inferno | R | ✅ | Fev 2026 |
| Wizards | U | ✅ | Fev 2026 |
| Undead | B | ✅ | Fev 2026 |

**Testes**: 140 testes unitários passando ✅

---

## Funcionalidades Implementadas

### Mecânicas de Cartas (100%)
- ✅ ETB triggers (enters-the-battlefield)
- ✅ Death triggers
- ✅ Combat triggers (raid, attack triggers, begin combat)
- ✅ End-of-turn triggers
- ✅ Lifegain triggers (Ajani's Pridemate, etc.)
- ✅ Spell cast triggers (Brineborn Cutthroat, Firespitter Whelp)
- ✅ Counter placement triggers (Wildwood Scourge)
- ✅ Lord bonuses (tribal +1/+1)
- ✅ Conditional keywords (flying when attacking, double strike above starting life)
- ✅ Kicker mechanic (Into the Roil)
- ✅ Freeze aura (Starlight Snare - tap + prevent untap)
- ✅ Graveyard activated abilities (Reassembling Skeleton)
- ✅ Multi-target spells (Biogenic Upgrade - 1-3 targets)
- ✅ Equipment system (auto-equip ETB + equip ability)
- ✅ Aura effects (buffs, debuffs, ability removal)
- ✅ Ward mechanic
- ✅ Fight mechanic (Felling Blow)
- ✅ Counterspells (creature-only e genérico)
- ✅ Cost reduction (Dragons, Wizards)
- ✅ Scry mechanic
- ✅ Leaves-the-battlefield triggers (Prayer of Binding)

### Sistema de Jogo
- ✅ Stack e sistema de prioridade
- ✅ Mulligan (London Mulligan)
- ✅ Fases de combate detalhadas
- ✅ Atribuição de dano a múltiplos bloqueadores
- ✅ Contadores (+1/+1)
- ✅ Dano em criaturas (cleanup automático)
- ✅ Tokens (Cat, Elf, Goblin, Faerie, Treasure)
- ✅ Exílio com retorno condicional

---

## Itens Pendentes (Opcional)

### 1. Melhorias de IA

#### Implementado
- [x] Níveis de dificuldade (Aprendiz, Mago, Planeswalker)
- [x] `attackWithZeroPower`: IA não ataca com criaturas power 0 (Mago+)
- [x] `useActivatedAbilities`: IA usa habilidades ativadas (Mago+)
- [x] Sequenciamento de ETBs condicionais (Main Phase 2)

#### Pendente (ver `05_AI_DIFFICULTY_PLAN.md`)
- [ ] `holdManaForInstants`: Reservar mana para respostas (Planeswalker)
- [ ] `evaluateTrades`: Avaliação inteligente de trades
- [ ] `aggressiveness`: Thresholds dinâmicos por dificuldade
- [ ] Targeting subótimo para Aprendiz
- [ ] Velocidade configurável das jogadas da IA

### 2. UI/UX
- [ ] Responsividade mobile/tablet
- [ ] Modo de treino com dicas

### 3. Refatoração (Baixa Prioridade)
- [ ] Extrair `combat.js` do `game.js`
- [ ] Extrair `stack.js` do `game.js`

*Nota: A refatoração não é necessária para o funcionamento do jogo. Seria útil apenas para futuras expansões.*

---

## Ideias Futuras (Sem Compromisso)

- Estatísticas (win rate, cartas mais jogadas)
- Conquistas/Achievements
- Torneio vs IA (melhor de 3/5)
- Multiplayer local
- Deck builder customizado

---

## Histórico de Atualizações

### Fevereiro 2026 - Auditoria Completa de Decks

**Varredura completa dos 10 decks** com correções robustas:

| Deck | Correções |
|------|-----------|
| Inferno | Firespitter Whelp - trigger condition corrigida |
| Wizards | Into the Roil - kicker implementado; Starlight Snare - freeze_aura |
| Primal | New Horizons - ETB de Aura; Felling Blow - counter trigger; Biogenic Upgrade - multi-target |
| Undead | Reassembling Skeleton - graveyard ability implementada |
| Elves | Elvish Archdruid - keyword `elf_lord` adicionada |
| Cats, Goblins, Vampires, Pirates, Healing | Nenhum bug encontrado |

**Novas funcionalidades:**
- Sistema de habilidades ativadas do cemitério (UI com botão no modal)
- Sistema de kicker com prompt para jogador
- Freeze aura (tap + prevent untap)
- Aura ETB effects (attachAura chama resolveETB)
- Multi-target selection (promptMultiTarget)
- Música de fundo com crossfade seamless

### Janeiro 2026 - UI e Seleção de Decks

- Redesign da seleção de decks em grid visual
- Stack badge com hover dropdown
- Priority stops configuráveis (estilo Arena)
- Settings modal em duas colunas
- Sistema de som otimizado (OGG, 6 efeitos)

### Dezembro 2025 - Validação de Cartas

- Validação completa dos 5 primeiros decks contra Scryfall API
- Correções de efeitos de cartas
- Must be blocked, hexproof targeting, loot interativo
- Documentação reorganizada

<details>
<summary>Ver histórico completo de funcionalidades</summary>

### Decks Completos (10/10) ✅
- ✅ Cats (W) - Lifegain, Tokens, Lords
- ✅ Goblins (R) - Aggro, Lords, Haste
- ✅ Vampires (B) - Drain, Flying, Death triggers
- ✅ Elves (G) - Ramp, Lords, Mana dorks
- ✅ Pirates (U) - Flash, Raid, Counterspell, Bounce, Scry, Equipment, Ward
- ✅ Healing (W) - Lifegain triggers, Pridemate, Twinblade Paladin
- ✅ Primal (G) - Fight, Giant Growth, Trample lords
- ✅ Inferno (R) - Dragons, Cost reduction, Haste synergy
- ✅ Wizards (U) - Draw triggers, Kicker, Spell discount
- ✅ Undead (B) - Graveyard recursion, Zombie/Skeleton lords

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
- ✅ Menu de configurações (ESC)
- ✅ Modo tela cheia
- ✅ Configurações de som separadas
- ✅ Modais arrastáveis
- ✅ Símbolos de mana MTG reais
- ✅ Stack badge com hover dropdown
- ✅ Priority stops configuráveis

### Técnico
- ✅ Testes unitários (Jest) - 140 testes
- ✅ Validação de cartas via Scryfall
- ✅ Modo Debug completo
- ✅ Sistema de logs exportável

</details>

---

*Última atualização: Fevereiro 2026*
