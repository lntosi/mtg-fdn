# MTG Jumpstart Foundations - Roadmap

Este documento mapeia o desenvolvimento do jogo.

---

## Status Atual

**BETA** - Fase de testes com jogadores selecionados

Todas as funcionalidades foram implementadas. O projeto está em fase de testes e correção de bugs reportados pelos beta testers.

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

## Fase Beta

### Como Reportar Bugs

Beta testers com acesso ao repositório podem:
1. Abrir uma **Issue** no GitHub descrevendo o bug
2. Incluir o **log da partida** (ESC → Debug → Export Log)
3. Descrever os **passos para reproduzir**

### Bugs Conhecidos

*Nenhum bug em aberto no momento.*

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
- ✅ Mill mechanic
- ✅ Leaves-the-battlefield triggers (Prayer of Binding)
- ✅ Undying effect (Undying Malice)
- ✅ Modal spells (Deadly Plot)
- ✅ Sacrifice costs (Eaten Alive)

### Sistema de Jogo
- ✅ Stack e sistema de prioridade
- ✅ Mulligan (London Mulligan)
- ✅ Fases de combate detalhadas
- ✅ Atribuição de dano a múltiplos bloqueadores
- ✅ Contadores (+1/+1)
- ✅ Dano em criaturas (cleanup automático)
- ✅ Tokens (Cat, Elf, Goblin, Faerie, Zombie, Treasure)
- ✅ Exílio com retorno condicional

### IA
- ✅ IA inteligente com avaliação de trades
- ✅ Habilidades ativadas
- ✅ Reserva de mana para instantes
- ✅ Verificação de sobrevivência (crack-back check)
- ✅ Mulligan inteligente (London Mulligan com avaliação de mão)

### UI/UX
- ✅ Preview de carta ampliado
- ✅ Indicador de mana por cor
- ✅ Stack badge com hover dropdown
- ✅ Priority stops configuráveis (estilo Arena)
- ✅ Menu de configurações (ESC)
- ✅ Personalização do jogador (nome + avatar)
- ✅ Modal de seleção de alvo com agrupamento
- ✅ Sistema de som e música

---

## Ideias Futuras (Pós-1.0)

Funcionalidades que podem ser consideradas após a versão estável:

- Estatísticas (win rate, cartas mais jogadas)
- Conquistas/Achievements
- Torneio vs IA (melhor de 3/5)
- Multiplayer local
- Deck builder customizado

---

## Histórico de Atualizações

### Fevereiro 2026 - Beta Release

**Entrada em fase Beta:**
- Todos os 10 decks validados contra listas oficiais do Beginner Box
- Deck Undead completamente reescrito com cartas oficiais
- UI de seleção de alvo melhorada (agrupamento + avatares)
- 140 testes unitários passando

### Fevereiro 2026 - Melhorias de IA

**IA unificada com perfil "Planeswalker Equilibrado":**
- Usa habilidades ativadas
- Reserva mana para instantes
- Avalia trades de forma equilibrada
- Verificação de sobrevivência ao contra-ataque

### Fevereiro 2026 - Auditoria Completa de Decks

**Varredura completa dos 10 decks** com correções robustas:

| Deck | Correções |
|------|-----------|
| Inferno | Firespitter Whelp - trigger condition corrigida; Mountain qty corrigido |
| Wizards | Into the Roil - kicker implementado; Starlight Snare - freeze_aura; Essence Scatter removido |
| Primal | New Horizons - ETB de Aura; Felling Blow - counter trigger; Forest qty corrigido |
| Undead | Deck completamente reescrito com lista oficial |
| Elves | Elvish Archdruid - keyword `elf_lord` adicionada |
| Cats, Goblins, Vampires, Pirates, Healing | Nenhum bug encontrado |

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
- ✅ Undead (B) - Graveyard recursion, Zombie/Skeleton lords, Mill

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
