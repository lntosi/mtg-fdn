# Card Validation Checklist

Este documento rastreia o status de validação de todas as cartas do jogo.

## Processo de Validação

Para validar uma carta corretamente, siga estes passos:

### 1. Consultar Scryfall
- Acesse `https://scryfall.com/card/fdn/[número]` ou busque pelo nome
- Anote o texto oficial em inglês da carta
- Verifique: tipo, subtipo, custo de mana, poder/resistência, keywords, habilidades

### 2. Comparar com cards.js
- Verifique se `id`, `name`, `type`, `subtype`, `cost`, `cmc`, `power`, `toughness` estão corretos
- Verifique se `keywords` inclui todas as habilidades da carta
- Verifique se `text` reflete o texto oficial (pode ser em português)

### 3. Verificar Implementação
Para cada tipo de habilidade, verificar o arquivo correspondente:

| Tipo | Onde Verificar |
|------|----------------|
| **Keywords simples** | `rules.js` → `getCreatureKeywords()`, `canBlock()`, `canAttack()` |
| **ETB triggers** | `triggers.js` → `resolveETB()` |
| **Death triggers** | `triggers.js` → `onCreatureDeath()` |
| **Combat triggers** | `triggers.js` → `onBeginCombat()`, `onDeclareAttackers()` |
| **End step triggers** | `triggers.js` → `onEndStep()` |
| **Activated abilities** | `game.js` → `canActivateAbility()`, `activateAbility()` |
| **Static effects (lords)** | `rules.js` → `calculateBonuses()` |
| **Spell effects** | `game.js` → `resolveSpell()` |
| **Cost reduction** | `rules.js` → `hasEnoughMana()`, `payMana()` |

### 4. Testar em Jogo (Opcional)
- Usar comandos debug para adicionar carta à mão/campo
- Verificar se comportamento corresponde ao esperado

### 5. Atualizar Status
- ✓ = Texto oficial verificado E implementação correta
- ⚠ = Ainda não verificado contra Scryfall
- ✗ = Bug conhecido (descrever nas notas)
- \- = Carta vanilla (só stats, sem habilidades)

---

## Legenda

| Status | Significado |
|--------|-------------|
| ✓ | Validado e funcionando |
| ⚠ | Precisa verificar |
| ✗ | Bug conhecido |
| - | Vanilla (sem habilidade especial) |

## Tipos de Habilidade

| Tipo | Descrição |
|------|-----------|
| **Keyword** | Habilidade estática (flying, lifelink, etc.) |
| **ETB** | Entra em campo (enters the battlefield) |
| **Death** | Quando morre |
| **Combat** | Início do combate ou ao atacar/bloquear |
| **Activated** | Custo para ativar (tap, mana) |
| **Triggered** | Dispara em condição específica |
| **Static** | Efeito permanente enquanto em campo |
| **Spell** | Efeito de mágica (instant/sorcery) |
| **Aura** | Encantamento que anexa a permanente |

---

## CATS (Branco)

| Card | Tipo | Habilidade | Status | Notas |
|------|------|------------|--------|-------|
| Plains | Land | Produz W | ✓ | |
| Uncharted Haven | Land | Produz cor escolhida, entra virado | ✓ | Jogador escolhe cor ao entrar |
| Savannah Lions | Creature | - | - | Vanilla 2/1 |
| Leonin Vanguard | Creature | Combat trigger | ✓ | +1/+1 e 1 vida se 3+ criaturas |
| Helpful Hunter | Creature | ETB (etb_draw) | ✓ | Compra carta ao entrar |
| Leonin Skyhunter | Creature | Keyword (flying) | ✓ | |
| Ingenious Leonin | Creature | Activated (3W) | ✓ | **Corrigido**: cálculo de mana era 3, agora 4 |
| Prideful Parent | Creature | Keyword + ETB | ⚠ | Vigilance + cria token Cat |
| Felidar Savior | Creature | Keyword + ETB | ✓ | **Corrigido**: botão confirmar sem estilo |
| Jazal Goldmane | Creature | Keyword + Activated | ⚠ | First strike + 3WW buff atacantes |
| Moment of Triumph | Instant | Spell (buff) | ✓ | +2/+2 e 2 vida |
| Pacifism | Aura | Static | ⚠ | Impede atacar/bloquear |
| Elspeth's Smite | Instant | Spell (removal) | ✓ | Exile atacante/bloqueador |
| Angelic Edict | Sorcery | Spell (removal) | ⚠ | Exile criatura ou encantamento |

---

## GOBLINS (Vermelho)

| Card | Tipo | Habilidade | Status | Notas |
|------|------|------------|--------|-------|
| Mountain | Land | Produz R | ✓ | |
| Uncharted Haven | Land | Produz cor escolhida, entra virado | ✓ | Jogador escolhe cor ao entrar |
| Frenzied Goblin | Creature | Combat trigger + Activated | ⚠ | Pagar R para impedir bloqueio |
| Swab Goblin | Creature | - | - | Vanilla 2/2 |
| Raging Redcap | Creature | Keyword (double_strike) | ✓ | |
| Goblin Smuggler | Creature | Keyword + Activated | ⚠ | Haste + T: unblockable poder ≤2 |
| Battle-Rattle Shaman | Creature | Combat trigger (may) | ✓ | **Corrigido**: era obrigatório, agora opcional |
| Dropkick Bomber | Creature | Static (lord) + Activated | ✓ | +1/+1 outros Goblins + R: flying/sacrifice |
| Kindled Fury | Instant | Spell (buff) | ✓ | +1/+0 e first strike |
| Dragon Fodder | Sorcery | Spell (tokens) | ⚠ | Cria 2 tokens Goblin |
| Volley Veteran | Creature | ETB (damage) | ✓ | Dano = número de Goblins |
| Incinerating Blast | Sorcery | Spell (damage) | ✓ | 5 dano a criatura/planeswalker |
| Goblin Oriflamme | Enchantment | Static | ⚠ | Atacantes +1/+0 |
| Goblin Firebomb | Artifact | Activated | ⚠ | Flash + 7,T,Sac: destroy permanente |

---

## VAMPIRES (Preto)

| Card | Tipo | Habilidade | Status | Notas |
|------|------|------------|--------|-------|
| Swamp | Land | Produz B | ✓ | |
| Uncharted Haven | Land | Produz cor escolhida, entra virado | ✓ | Jogador escolhe cor ao entrar |
| Vampire Neonate | Creature | Activated (2,T) | ⚠ | Drain 1 vida |
| Vampire Interloper | Creature | Keyword + Static | ✓ | Flying + não pode bloquear |
| Stromkirk Bloodthief | Creature | End step trigger | ⚠ | +1/+1 em vampiro se oponente perdeu vida |
| Highborn Vampire | Creature | - | - | Vanilla 4/3 |
| Vampire Spawn | Creature | ETB (drain) | ✓ | Drain 2 vida |
| Bloodtithe Collector | Creature | Keyword + ETB | ⚠ | Flying + força descarte condicional |
| Vengeful Bloodwitch | Creature | Death trigger | ✓ | **Corrigido**: era life loss trigger, agora death |
| Crossway Troublemakers | Creature | Static + Death trigger | ⚠ | Vampiros têm deathtouch/lifelink + pay 2 life draw |
| Moment of Craving | Instant | Spell (removal + life) | ✓ | -2/-2 e ganha 2 vida |
| Offer Immortality | Instant | Spell (buff) | ⚠ | Indestructible + counter se vampiro |
| Hero's Downfall | Instant | Spell (removal) | ✓ | Destroy criatura/planeswalker |
| Untamed Hunger | Aura | Static | ⚠ | +2/+1 e menace |

---

## ELVES (Verde)

| Card | Tipo | Habilidade | Status | Notas |
|------|------|------------|--------|-------|
| Forest | Land | Produz G | ✓ | |
| Uncharted Haven | Land | Produz cor escolhida, entra virado | ✓ | Jogador escolhe cor ao entrar |
| Llanowar Elves | Creature | Activated (tap_for_mana) | ✓ | T: Add G |
| Elvish Regrower | Creature | ETB (recursion) | ⚠ | Devolve permanente do cemitério |
| Dwynen's Elite | Creature | ETB (conditional token) | ✓ | Cria token se outro Elfo |
| Beast-Kin Ranger | Creature | Keyword + Triggered | ✓ | Trample + trigger quando criatura entra |
| Thornweald Archer | Creature | Keywords | ✓ | Reach + Deathtouch |
| Elvish Archdruid | Creature | Static (lord) + Activated | ⚠ | Elfos +1/+1 + T: add G por Elfo |
| Tajuru Pathwarden | Creature | Keywords | ✓ | Vigilance + Trample |
| Wildheart Invoker | Creature | Activated (8) | ✓ | 8: +5/+5 e trample |
| Snakeskin Veil | Instant | Spell (buff + protection) | ⚠ | +1/+1 counter + hexproof |
| Broken Wings | Instant | Spell (removal) | ✓ | Destroy artifact/enchant/flying |
| Felling Blow | Sorcery | Spell (removal) | ⚠ | Destroy flying creature |
| Joraga Invocation | Sorcery | Spell (mass buff) | ⚠ | +3/+3 e must be blocked |

---

## PIRATES (Azul) - **VALIDADO COM SCRYFALL** ✓

| Card | Tipo | Habilidade | Scryfall | Status | Notas |
|------|------|------------|----------|--------|-------|
| Island | Land | Produz U | ✓ | ✓ | Terreno básico |
| Uncharted Haven | Land | Produz cor escolhida, entra virado | ✓ | ✓ | Jogador escolhe cor ao entrar |
| Spectral Sailor | Creature 1/1 | Flash, Flying, {3}{U}: Draw | ✓ | ✓ | Habilidade ativada implementada |
| Kitesail Corsair | Creature 2/1 | Flying while attacking | ✓ | ✓ | `flying_when_attacking` em rules.js |
| Brineborn Cutthroat | Creature 2/1 | Flash, +1/+1 on spell during opponent's turn | ✓ | ✓ | Trigger em `onSpellCast()` |
| Corsair Captain | Creature 2/2 | ETB Treasure, Other Pirates +1/+1 | ✓ | ✓ | Lord em `calculateBonuses()` |
| Storm Fleet Spy | Creature 2/2 | Raid: draw a card | ✓ | ✓ | `raid_draw` em triggers.js |
| Bigfin Bouncer | Creature 3/2 | ETB bounce opponent creature | ✓ | ✓ | `etb_bounce` com prompt de alvo |
| Skyship Buccaneer | Creature 4/3 | Flying, Raid: draw | ✓ | ✓ | Flying + `raid_draw` |
| Tolarian Terror | Creature 5/5 | Cost reduction, Ward {2} | ✓ | ✓ | Custo e Ward totalmente implementados |
| Opt | Instant | Scry 1, Draw | ✓ | ✓ | Scry com escolha do jogador |
| Cancel | Instant | Counter target spell | ✓ | ✓ | `counterspell` keyword |
| Eaten by Piranhas | Aura | Flash, base 1/1, loses abilities | ✓ | ✓ | Flash + debuff implementado |
| Pirate's Cutlass | Equipment | ETB attach Pirate, +2/+1, Equip {2} | ✓ | ✓ | ETB + Equip implementados |

*Todas as cartas do deck Pirates foram validadas e implementadas.

---

## Resumo por Status

| Status | Quantidade | Percentual |
|--------|------------|------------|
| ✓ Validado | 42 | 60% |
| ⚠ Verificar | 23 | 33% |
| ✗ Bug conhecido | 0 | 0% |
| - Vanilla | 5 | 7% |
| **Total** | **70** | **100%** |

---

## Bugs Corrigidos (Histórico)

| Data | Card | Problema | Correção |
|------|------|----------|----------|
| 2025-12-11 | Pirate's Cutlass | ETB não permitia escolha de Pirata | Implementado prompt de seleção para múltiplos piratas |
| 2025-12-11 | Pirate's Cutlass | Habilidade Equip 2 não implementada | Implementado em canActivateAbility/activateAbility + UI |
| 2025-12-11 | Equipamentos (geral) | Não tinham renderização visual | Implementado sistema de badges e borda dourada |
| 2025-12-11 | Brineborn Cutthroat | Jogo congelava ao atacar | `currentPlayer` → `activePlayer` em triggers.js |
| 2025-12-11 | Spectral Sailor | Habilidade ativada não implementada | Implementado 3U: draw em canActivateAbility/activateAbility |
| 2025-12-11 | Tolarian Terror | Redução de custo não implementada | Implementado em hasEnoughMana/payMana |
| 2025-12-11 | Felidar Savior | Botão "Confirmar" sem estilo no modal | Adicionado CSS `.btn-trigger-confirm` |
| 2025-12-11 | Battle-Rattle Shaman | Habilidade obrigatória (deveria ser "may") | Alterado `canSkip: true` |
| 2025-12-11 | Ingenious Leonin | Cálculo de mana errado (3 em vez de 4) | Corrigido para `leoninTotalMana >= 4` |
| 2025-12-11 | Vengeful Bloodwitch | Trigger errado (life loss vs death) | Reimplementado como death trigger |
| 2025-12-11 | Uncharted Haven | Produzia qualquer cor (deveria escolher ao entrar) | Implementado prompt de escolha de cor |
| 2025-12-11 | Eaten by Piranhas | IA travava em loop tentando jogar sem alvos válidos | Adicionado `hasValidAuraTargets()` em `canCastSpell()` |
| 2025-12-11 | Eaten by Piranhas | Flash não funcionava (só jogava na main phase) | Cartas com Flash agora usam `canCastInstant()` |
| 2025-12-11 | Eaten by Piranhas | Só podia mirar criaturas do oponente | Agora pode mirar qualquer criatura |
| 2025-12-11 | Eaten by Piranhas | Stats fixos 1/1 ignoravam counters | Agora usa base 1/1 + counters + bônus |
| 2025-12-11 | Tolarian Terror | Ward {2} era apenas visual | Implementado prompt para jogador pagar Ward + IA paga automaticamente |
| 2025-12-11 | Modais/Prompts | Alguns modais não eram arrastáveis | Criado `makeModalDraggable()` para padronizar drag em todos os modais |

---

## Limitações Conhecidas

Mecânicas que estão parcialmente implementadas ou simplificadas:

| Mecânica | Carta(s) | Limitação | Impacto |
|----------|----------|-----------|---------|
| **Hexproof** | Snakeskin Veil (temp) | Proteção temporária não verificada em targeting | Baixo |
| **Must be blocked** | Joraga Invocation | Não força bloqueio | Médio |

---

## Prioridades de Validação

### Alta Prioridade
Cartas com mecânicas complexas que podem ter bugs:

1. **Crossway Troublemakers** - Múltiplos efeitos (static + death trigger + pay life)
2. **Stromkirk Bloodthief** - End step trigger condicional
3. **Frenzied Goblin** - Combat trigger com custo
4. **Goblin Firebomb** - Activated ability complexa

### Média Prioridade
Cartas com interações específicas:

- Auras (Pacifism, Untamed Hunger)
- Lords (Elvish Archdruid)
- Tokens (Dragon Fodder, Prideful Parent)

### Baixa Prioridade
Cartas simples ou já validadas:

- Vanilla creatures
- Spells de dano direto
- Keywords básicas

---

## Como Usar Este Documento

### Para solicitar validação:
- "Valide as cartas do deck Vampires"
- "Verifique todas as cartas com death triggers"
- "Audite as cartas com status ⚠"
- "Teste a interação de Crossway Troublemakers"

### Para reportar bug:
1. Descreva o comportamento esperado vs observado
2. Forneça screenshot se possível
3. Indique a carta e situação de jogo

### Para atualizar este documento:
Após correção de bug, mover card de ⚠/✗ para ✓ e adicionar entrada no histórico.
