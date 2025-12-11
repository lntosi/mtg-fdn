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

## CATS (Branco) - **VALIDADO COM SCRYFALL** ✓

| Card | Tipo | Habilidade | Scryfall | Status | Notas |
|------|------|------------|----------|--------|-------|
| Plains | Land | Produz W | ✓ | ✓ | Terreno básico |
| Uncharted Haven | Land | Enters tapped, escolhe cor | ✓ | ✓ | Jogador escolhe cor ao entrar |
| Savannah Lions | Creature 2/1 | - | ✓ | - | Vanilla W |
| Leonin Vanguard | Creature 1/1 | Combat trigger: 3+ criaturas → +1/+1 e 1 vida | ✓ | ✓ | `_handleLeoninVanguard()` em triggers.js |
| Helpful Hunter | Creature 1/1 | ETB: draw a card | ✓ | ✓ | `etb_draw` keyword |
| Leonin Skyhunter | Creature 2/2 | Flying | ✓ | ✓ | `flying` keyword |
| Ingenious Leonin | Creature 4/4 | {3}{W}: +1/+1 counter, Cat gets first strike | ✓ | ✓ | Habilidade ativada implementada |
| Prideful Parent | Creature 2/2 | Vigilance, ETB: create 1/1 Cat token | ✓ | ✓ | `vigilance` + `_createCatToken()` |
| Felidar Savior | Creature 2/3 | Lifelink, ETB: +1/+1 counter on up to 2 creatures | ✓ | ✓ | `lifelink` + `etb_counter_two` |
| Jazal Goldmane | Creature 4/4 | First strike, {3}{W}{W}: attackers get +X/+X | ✓ | ✓ | Legendary, habilidade ativada implementada |
| Moment of Triumph | Instant | +2/+2, gain 2 life | ✓ | ✓ | Buff + lifegain |
| Pacifism | Aura | Enchanted creature can't attack or block | ✓ | ✓ | `hasPacifism()` em rules.js |
| Elspeth's Smite | Instant | 3 damage to attacker/blocker, exile if dies | ✓ | ✓ | **Corrigido**: era exile direto, agora 3 dano + exile on death |
| Angelic Edict | Sorcery | Exile creature or enchantment | ✓ | ✓ | `exilePermanent()` |

*Todas as cartas do deck Cats foram validadas com Scryfall e implementadas corretamente.

---

## GOBLINS (Vermelho) - **VALIDADO COM SCRYFALL** ✓

| Card | Tipo | Habilidade | Scryfall | Status | Notas |
|------|------|------------|----------|--------|-------|
| Mountain | Land | Produz R | ✓ | ✓ | Terreno básico |
| Uncharted Haven | Land | Enters tapped, escolhe cor | ✓ | ✓ | Jogador escolhe cor ao entrar |
| Frenzied Goblin | Creature 1/1 | Attack trigger: pay {R} → creature can't block | ✓ | ✓ | `onFrenziedGoblinAttacks()` em triggers.js |
| Swab Goblin | Creature 2/2 | - | ✓ | - | Vanilla 1R |
| Raging Redcap | Creature 1/2 | Double strike | ✓ | ✓ | `double_strike` keyword |
| Goblin Smuggler | Creature 2/2 | Haste, {T}: power ≤2 can't be blocked | ✓ | ✓ | `haste` + habilidade ativada implementada |
| Battle-Rattle Shaman | Creature 2/2 | Combat: may give +2/+0 | ✓ | ✓ | `_handleBattleRattleShaman()` com canSkip |
| Dropkick Bomber | Creature 2/3 | Lord +1/+1, {R}: Goblin gains flying + sac on damage | ✓ | ✓ | `goblin_lord` + habilidade ativada |
| Kindled Fury | Instant | +1/+0 and first strike | ✓ | ✓ | Buff + `first_strike` temporário |
| Dragon Fodder | Sorcery | Create two 1/1 Goblin tokens | ✓ | ✓ | `resolveSpell()` cria 2 tokens |
| Volley Veteran | Creature 4/2 | ETB: damage = number of Goblins | ✓ | ✓ | ETB implementado em triggers.js |
| Incinerating Blast | Sorcery | 6 damage + optional loot | ✓ | ✓ | **Corrigido**: era 5 dano, agora 6 + loot |
| Goblin Oriflamme | Enchantment | Attacking creatures get +1/+0 | ✓ | ✓ | Static em `calculateBonuses()` |
| Goblin Firebomb | Artifact | Flash, {7},T,Sac: destroy permanent | ✓ | ✓ | **Corrigido**: era {1} e 2 dano, agora {7} e destroy |

*Todas as cartas do deck Goblins foram validadas com Scryfall e implementadas corretamente.

---

## VAMPIRES (Preto) - **VALIDADO COM SCRYFALL** ✓

| Card | Tipo | Habilidade | Scryfall | Status | Notas |
|------|------|------------|----------|--------|-------|
| Swamp | Land | Produz B | ✓ | ✓ | Terreno básico |
| Uncharted Haven | Land | Enters tapped, escolhe cor | ✓ | ✓ | Jogador escolhe cor ao entrar |
| Vampire Neonate | Creature 0/3 | {2},{T}: drain 1 | ✓ | ✓ | Habilidade ativada em `canActivateAbility()` |
| Vampire Interloper | Creature 2/1 | Flying, can't block | ✓ | ✓ | `flying` + `cant_block` keywords |
| Stromkirk Bloodthief | Creature 2/2 | End step: +1/+1 on vampire if opponent lost life | ✓ | ✓ | `_handleStromkirkBloodthief()` em triggers.js |
| Highborn Vampire | Creature 4/3 | - | ✓ | - | Vanilla 3B |
| Vampire Spawn | Creature 2/3 | ETB: drain 2 | ✓ | ✓ | ETB em `resolveETB()` |
| Bloodtithe Collector | Creature 3/2 | Flying, ETB: opponent discards if lost life | ✓ | ✓ | `flying` + ETB condicional |
| Vengeful Bloodwitch | Creature 3/2 | Flying, menace, death: drain 1 on each death | ✓ | ✓ | `onCreatureDeath()` em triggers.js |
| Crossway Troublemakers | Creature 5/5 | Attacking vamps have deathtouch/lifelink, death: pay 2 life draw | ✓ | ✓ | Static em `getCreatureKeywords()` + death trigger implementado |
| Moment of Craving | Instant | -2/-2, gain 2 life | ✓ | ✓ | Spell em `resolveSpellWithTarget()` |
| Offer Immortality | Instant | Deathtouch + indestructible until end of turn | ✓ | ✓ | **Corrigido**: era +1/+1 se vampiro, agora deathtouch + indestructible |
| Hero's Downfall | Instant | Destroy creature or planeswalker | ✓ | ✓ | `destroyPermanent()` |
| Untamed Hunger | Aura | +2/+1 and menace | ✓ | ✓ | Aura em `calculateBonuses()` |

*Todas as cartas do deck Vampires foram validadas com Scryfall e implementadas corretamente.

---

## ELVES (Verde) - **VALIDADO COM SCRYFALL** ✓

| Card | Tipo | Habilidade | Scryfall | Status | Notas |
|------|------|------------|----------|--------|-------|
| Forest | Land | Produz G | ✓ | ✓ | Terreno básico |
| Uncharted Haven | Land | Enters tapped, escolhe cor | ✓ | ✓ | Jogador escolhe cor ao entrar |
| Llanowar Elves | Creature 1/1 | {T}: Add {G} | ✓ | ✓ | `tap_for_mana` keyword |
| Elvish Regrower | Creature 4/3 | ETB: return permanent from graveyard | ✓ | ✓ | ETB em `resolveETB()` |
| Dwynen's Elite | Creature 2/2 | ETB: create 1/1 Elf if you control another Elf | ✓ | ✓ | ETB condicional implementado |
| Beast-Kin Ranger | Creature 3/3 | Trample, +1/+0 when another creature enters | ✓ | ✓ | `trample` + trigger em triggers.js |
| Thornweald Archer | Creature 2/1 | Reach, Deathtouch | ✓ | ✓ | `reach` + `deathtouch` keywords |
| Elvish Archdruid | Creature 2/2 | Other Elves +1/+1, {T}: Add G for each Elf | ✓ | ✓ | Lord em `calculateBonuses()` + activated ability |
| Tajuru Pathwarden | Creature 5/4 | Vigilance, Trample | ✓ | ✓ | `vigilance` + `trample` keywords |
| Wildheart Invoker | Creature 4/3 | {8}: +5/+5 and trample | ✓ | ✓ | Activated ability implementada |
| Snakeskin Veil | Instant | +1/+1 counter, hexproof until end of turn | ✓ | ✓ | Spell em `resolveSpellWithTarget()` |
| Broken Wings | Instant | Destroy artifact, enchantment, or flying creature | ✓ | ✓ | `destroyPermanent()` |
| Felling Blow | Sorcery | +1/+1 counter on your creature, it deals damage = power | ✓ | ✓ | **Corrigido**: era destroy flying, agora one-sided fight |
| Joraga Invocation | Sorcery | +3/+3 and must be blocked | ✓ | ✓ | Implementado (must be blocked é limitação conhecida) |

*Todas as cartas do deck Elves foram validadas com Scryfall e implementadas corretamente.

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
| Opt | Instant | Scry 1, Draw | ✓ | ✓ | Scry com imagem completa da carta |
| Cancel | Instant | Counter target spell | ✓ | ✓ | `counterspell` keyword |
| Eaten by Piranhas | Aura | Flash, base 1/1, loses abilities | ✓ | ✓ | Flash + debuff implementado |
| Pirate's Cutlass | Equipment | ETB attach Pirate, +2/+1, Equip {2} | ✓ | ✓ | ETB + Equip implementados |

*Todas as cartas do deck Pirates foram validadas e implementadas.

---

## Resumo por Status

| Status | Quantidade | Percentual |
|--------|------------|------------|
| ✓ Validado | 64 | 91% |
| ⚠ Verificar | 0 | 0% |
| ✗ Bug conhecido | 0 | 0% |
| - Vanilla | 6 | 9% |
| **Total** | **70** | **100%** |

**Decks 100% validados:** Pirates (Azul), Cats (Branco), Goblins (Vermelho), Vampires (Preto), Elves (Verde)

🎉 **TODOS OS 5 DECKS VALIDADOS COM SCRYFALL!**

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
| 2025-12-11 | Opt (Scry) | Modal de Scry mostrava apenas nome da carta | Implementado exibição da imagem completa via Scryfall |
| 2025-12-11 | Elspeth's Smite | Exilava diretamente em vez de causar dano | Corrigido: 3 dano + exile on death flag |
| 2025-12-11 | Incinerating Blast | Causava 5 dano sem loot | Corrigido: 6 dano + loot opcional (IA faz automaticamente) |
| 2025-12-11 | Goblin Firebomb | ID errado e custo {1} causando 2 dano | Corrigido: custo {7}, T, Sac: destroy target permanent |
| 2025-12-11 | Offer Immortality | Dava +1/+1 se vampiro + indestructible | Corrigido: agora dá deathtouch + indestructible |
| 2025-12-11 | Crossway Troublemakers | Death trigger não implementado | Implementado: pay 2 life draw quando vampiro morre |
| 2025-12-11 | Felling Blow | Era "destroy flying creature" | Corrigido: one-sided fight (+1/+1, dano = poder) |
| 2025-12-11 | Joraga Invocation | "Must be blocked" não implementado | Implementado: flag `mustBeBlocked` + validação + IA respeita |
| 2025-12-11 | Snakeskin Veil | Hexproof temporário não verificado em targeting | Implementado: `canBeTargetedBy()` verifica hexproof |
| 2025-12-11 | Felling Blow | Ordem de alvos invertida (oponente antes de sua) | Corrigido: fluxo especial para ordem correta |
| 2025-12-11 | Incinerating Blast | Loot era automático para IA, não existia para jogador | Implementado: prompt Yes/No + escolha de carta para jogador |

---

## Limitações Conhecidas

Mecânicas que estão parcialmente implementadas ou simplificadas:

| Mecânica | Carta(s) | Limitação | Impacto |
|----------|----------|-----------|---------|
| ~~**Hexproof**~~ | ~~Snakeskin Veil (temp)~~ | ~~Proteção temporária não verificada em targeting~~ | ✅ Corrigido |
| ~~**Must be blocked**~~ | ~~Joraga Invocation~~ | ~~Não força bloqueio~~ | ✅ Corrigido |

**Nenhuma limitação conhecida restante!** Todas as mecânicas foram implementadas de forma robusta.

---

## Prioridades de Validação

### ✅ TODAS AS PRIORIDADES CONCLUÍDAS

1. ~~**Crossway Troublemakers** (Vampires) - Múltiplos efeitos (static + death trigger + pay life)~~ ✓
2. ~~**Stromkirk Bloodthief** (Vampires) - End step trigger condicional~~ ✓
3. ~~**Bloodtithe Collector** (Vampires) - ETB condicional com descarte~~ ✓
4. ~~**Elvish Archdruid** (Elves) - Lord + tap for mana por elfo~~ ✓
5. ~~**Joraga Invocation** (Elves) - Mass buff + must be blocked~~ ✓
6. ~~**Felling Blow** (Elves) - One-sided fight~~ ✓

### Todos os Decks Validados
1. ~~**PIRATES (Azul)**~~ ✓ VALIDADO
2. ~~**CATS (Branco)**~~ ✓ VALIDADO
3. ~~**GOBLINS (Vermelho)**~~ ✓ VALIDADO
4. ~~**VAMPIRES (Preto)**~~ ✓ VALIDADO
5. ~~**ELVES (Verde)**~~ ✓ VALIDADO

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
