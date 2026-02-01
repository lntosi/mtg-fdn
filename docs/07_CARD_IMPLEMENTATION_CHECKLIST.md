# Checklist Mestre de Implementação de Cartas

Este documento define os pontos de verificação para cada tipo de carta no jogo.

---

## Índice

1. [Criaturas](#1-criaturas)
2. [Instants e Sorceries](#2-instants-e-sorceries)
3. [Enchantments (Auras)](#3-enchantments-auras)
4. [Artifacts (Equipment)](#4-artifacts-equipment)
5. [Lands](#5-lands)

---

## 1. Criaturas

### 1.1 Criaturas Vanilla (sem habilidades)

| Verificação | Arquivo | Função/Local |
|-------------|---------|--------------|
| Definição completa | cards.js | `{ id, name, type, subtype, cost, cmc, power, toughness, qty }` |

**Cartas vanilla:** Bear Cub, Fire Elemental, Goblin Assailant

---

### 1.2 Criaturas com Keywords de Combate

| Verificação | Arquivo | Função/Local |
|-------------|---------|--------------|
| Keywords no array | cards.js | `keywords: ["flying", "lifelink", ...]` |
| (automático) | rules.js | `getCreatureKeywords()` processa automaticamente |

**Keywords suportadas:** flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, flash, ward, hexproof, indestructible

---

### 1.3 Criaturas com ETB (Enter the Battlefield)

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Keyword ou card.id | cards.js | `keywords: ["etb_draw"]` ou usar `id` |
| 2 | Handler do ETB | triggers.js | `resolveETB()` |
| 3 | Chamada ao ETB | game.js | `triggers.resolveETB(card, player)` em `resolvePermanent()` |

#### Matriz de ETBs

| Criatura | Keyword/ID | triggers.js | Status |
|----------|------------|:-----------:|:------:|
| Helpful Hunter | `etb_draw` | ✅ | ✅ |
| Elvish Visionary | `etb_draw` | ✅ | ✅ |
| Vampire Spawn | `etb_drain_2` | ✅ | ✅ |
| Prideful Parent | `etb_cat_token` | ✅ | ✅ |
| Dwynen's Elite | `dwynen_elite` (id) | ✅ | ✅ |
| Felidar Savior | `etb_counter_two` | ✅ | ✅ |
| Bigfin Bouncer | `bigfin_bouncer` (id) | ✅ | ✅ |
| Inspiring Overseer | `inspiring_overseer` (id) | ✅ | ✅ |
| Hinterland Sanctifier | `etb_gain_life_1` | ✅ | ✅ |
| Rapacious Dragon | `etb_treasure_2` | ✅ | ✅ |
| Skeleton Archer | `skeleton_archer` (id) | ✅ | ✅ |
| Virus Beetle | `etb_discard_opponent` | ✅ | ✅ |
| Gravedigger / Rot Hulk | `etb_return_creature` / `etb_return_zombie_battlefield` | ✅ | ✅ |
| Exclusion Mage | `exclusion_mage` (id) | ✅ | ✅ |
| Icewind Elemental | `icewind_elemental` (id) | ✅ | ✅ |
| Burrog Befuddler | `burrog_befuddler` (id) | ✅ | ✅ |
| Terror of Mount Velus | `terror_of_mount_velus` (id) | ✅ | ✅ |

---

### 1.4 Criaturas com Death Triggers

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Identificar por id | cards.js | Usar `id` único |
| 2 | Handler do death | triggers.js | `onCreatureDeath()` |

#### Matriz de Death Triggers

| Criatura | ID | triggers.js | Status |
|----------|------------|:-----------:|:------:|
| Crossway Troublemakers | `crossway_troublemakers` | ✅ | ✅ |
| Maalfeld Twins | `maalfeld_twins` | ✅ | ✅ |
| Crow of Dark Tidings | `crow_of_dark_tidings` | ✅ | ✅ |
| Mild-Mannered Librarian | `mild_mannered_librarian` | ✅ | ✅ |

---

### 1.5 Criaturas com Combat Triggers

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Identificar trigger | cards.js | `keywords` ou `id` |
| 2 | Handler correto | triggers.js | Ver tabela abaixo |

#### Tipos de Combat Triggers

| Trigger | Função em triggers.js | Quando dispara |
|---------|----------------------|----------------|
| Begin Combat | `onBeginCombat()` | Início da fase de combate |
| Declare Attackers | `onDeclareAttackers()` | Após declarar atacantes |
| When Attacks | `onDeclareAttackers()` | Criatura específica ataca |

#### Matriz de Combat Triggers

| Criatura | Tipo | Função | Status |
|----------|------|--------|:------:|
| Battle-Rattle Shaman | Begin Combat | `onBeginCombat()` | ✅ |
| Leonin Vanguard | Begin Combat | `onBeginCombat()` | ✅ |
| Herald of Faith | When Attacks | `onDeclareAttackers()` | ✅ |
| Ancestor Dragon | When Attacks | `onDeclareAttackers()` | ✅ |
| Firespitter Whelp | When Attacks | `onDeclareAttackers()` | ✅ |
| Erudite Wizard | When Attacks | `onDeclareAttackers()` | ✅ |
| Storm Fleet Spy | Raid (ETB) | `resolveETB()` | ✅ |
| Skyship Buccaneer | Raid (ETB) | `resolveETB()` | ✅ |

---

### 1.6 Criaturas com End Step Triggers

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Identificar por id | cards.js | Usar `id` |
| 2 | Handler | triggers.js | `onEndStep()` |

#### Matriz de End Step Triggers

| Criatura | Condição | triggers.js | Status |
|----------|----------|:-----------:|:------:|
| Stromkirk Bloodthief | Oponente perdeu vida | ✅ | ✅ |

---

### 1.7 Criaturas com Spell Cast Triggers

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Identificar por id/keyword | cards.js | `draw_counter`, `second_draw_faerie`, etc. |
| 2 | Handler | triggers.js | `onSpellCast()` ou `onCardDrawn()` |

#### Matriz de Spell/Draw Triggers

| Criatura | Trigger | Função | Status |
|----------|---------|--------|:------:|
| Brineborn Cutthroat | Opponent spell | `onSpellCast()` | ✅ |
| Clinquant Skymage | Second draw | `onCardDrawn()` | ✅ |
| Mischievous Mystic | Second draw | `onCardDrawn()` | ✅ |

---

### 1.8 Criaturas com Activated Abilities

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definir carta | cards.js | Usar `id` único |
| 2 | Verificar se pode ativar | game.js | `canActivateAbility()` |
| 3 | Executar habilidade | game.js | `activateAbility()` |
| 4 | IA usar habilidade | ai.js | `shouldActivateAbility()` |

#### Matriz de Activated Abilities

| Criatura | Custo | canActivate | activate | AI | Status |
|----------|-------|:-----------:|:--------:|:--:|:------:|
| Llanowar Elves | {T} | ✅ (tap_for_mana) | auto | N/A | ✅ |
| Druid of the Cowl | {T} | ✅ (tap_for_mana) | auto | N/A | ✅ |
| Vampire Neonate | {2}, {T} | ✅ | ✅ | ✅ | ✅ |
| Spectral Sailor | {3}{U} | ✅ | ✅ | ✅ | ✅ |
| Jazal Goldmane | {3}{W}{W} | ✅ | ✅ | ✅ | ✅ |
| Wildheart Invoker | {8} | ✅ | ✅ | ✅ | ✅ |
| Goblin Smuggler | {T} | ✅ | ✅ | ❌ (Main2) | ✅ |
| Mystic Archaeologist | {3}{U}{U} | ✅ | ✅ | ✅ | ✅ |
| Reassembling Skeleton | {1}{B} (graveyard) | ✅ | ✅ | ❌ | ✅ |
| Thrashing Brontodon | {1}, Sac | ✅ | ✅ | ❌ | ✅ |
| Dropkick Bomber | {R}, {T} | ✅ | ✅ | ❌ | ✅ |

---

### 1.9 Criaturas com Static Effects (Lords, Conditionals)

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Keyword de lord | cards.js | `goblin_lord`, `elf_lord`, etc. |
| 2 | Calcular bônus | rules.js | `calculateBonuses()` |
| 3 | Keywords condicionais | rules.js | `getCreatureKeywords()` |

#### Matriz de Lords

| Criatura | Keyword | Bônus | calculateBonuses | Status |
|----------|---------|-------|:----------------:|:------:|
| Dropkick Bomber | `goblin_lord` | Goblins +1/+1 | ✅ | ✅ |
| Elvish Archdruid | `elf_lord` | Elves +1/+1 | ✅ | ✅ |
| Corsair Captain | `pirate_lord` | Pirates +1/+1 | ✅ | ✅ |
| Death Baron | `zombie_skeleton_lord` | Z/S +1/+1 + deathtouch | ✅ | ✅ |
| Aggressive Mammoth | (id) | All creatures trample | ✅ | ✅ |

#### Matriz de Conditional Keywords

| Criatura | Condição | Keyword | getCreatureKeywords | Status |
|----------|----------|---------|:-------------------:|:------:|
| Twinblade Paladin | Life >= starting | double_strike | ✅ | ✅ |
| Kargan Dragonrider | Control Dragon | flying | ✅ | ✅ |
| Kitesail Corsair | Attacking | flying | ✅ | ✅ |

---

### 1.10 Criaturas com Cost Reduction

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Keyword | cards.js | `dragon_cost_reduction`, `wizard_discount` |
| 2 | Aplicar redução | rules.js | `hasEnoughMana()` ou `getEffectiveCost()` |

#### Matriz de Cost Reduction

| Criatura | Keyword | Afeta | rules.js | Status |
|----------|---------|-------|:--------:|:------:|
| Dragonlord's Servant | `dragon_cost_reduction` | Dragons | ✅ | ✅ |
| Goblin Electromancer | `wizard_discount` | Instants/Sorceries | ✅ | ✅ |
| Tolarian Terror | (próprio) | Self | ✅ | ✅ |

---

## 2. Instants e Sorceries

Ver documento separado: [06_SPELL_TARGETING_CHECKLIST.md](06_SPELL_TARGETING_CHECKLIST.md)

### Resumo de Funções

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Precisa de alvo? | game.js | `spellNeedsTarget()` |
| 2 | Tem alvos válidos? | rules.js | `hasValidTargets()` |
| 3 | Quais são os alvos? | game.js | `getValidSpellTargets()` |
| 4 | Resolver com alvo | game.js | `resolveSpellWithTarget()` |
| 5 | Resolver sem alvo | game.js | `resolveSpell()` |

---

## 3. Enchantments (Auras)

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definição | cards.js | `type: "enchantment", subtype: "Aura", keywords: ["enchant"]` |
| 2 | Alvos válidos | game.js | `playAura()` - define `validTargets` |
| 3 | Anexar ao alvo | game.js | `attachAura()` |
| 4 | Aplicar efeitos | rules.js | `applyAuraEffects()` |
| 5 | ETB da aura | triggers.js | `resolveETB()` (chamado por attachAura) |
| 6 | IA escolher alvo | ai.js | `chooseBestAuraTarget()` |

### Matriz de Auras

| Aura | playAura | attachAura | applyAuraEffects | ETB | AI | Status |
|------|:--------:|:----------:|:----------------:|:---:|:--:|:------:|
| Pacifism | ✅ | ✅ | ✅ (can't attack/block) | N/A | ✅ | ✅ |
| Untamed Hunger | ✅ | ✅ | ✅ (+2/+1, menace) | N/A | ✅ | ✅ |
| Eaten by Piranhas | ✅ | ✅ | ✅ (0/1, loses abilities) | N/A | ✅ | ✅ |
| Prayer of Binding | ✅ | ✅ | ✅ (exile) | ✅ (gain life) | ✅ | ✅ |
| Starlight Snare | ✅ | ✅ | ✅ (freeze) | ✅ (tap) | ✅ | ✅ |
| New Horizons | ✅ | ✅ | ✅ (mana) | ✅ (+1/+1 counter) | ✅ | ✅ |

---

## 4. Artifacts

### 4.1 Equipment

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definição | cards.js | `type: "artifact", subtype: "Equipment", keywords: ["equipment"]` |
| 2 | Auto-equip ETB | triggers.js | `resolveETB()` para equipamentos com auto-attach |
| 3 | Aplicar bônus estáticos | rules.js | `calculateBonuses()` |
| 4 | Aplicar keywords | rules.js | `getCreatureKeywords()` |
| 5 | Bônus condicionais | rules.js | Verificar condição (ex: "durante seu turno") |
| 6 | Habilidade Equip | game.js | `canActivateAbility()` + `activateAbility()` |
| 7 | Desanexar | game.js | `detachFromCreature()` |

#### Matriz de Equipment

| Equipment | ETB | Bônus | Condição | canActivate | Status |
|-----------|:---:|:-----:|:--------:|:-----------:|:------:|
| Pirate's Cutlass | ✅ (auto-attach Pirate) | +2/+1 | Sempre | ✅ | ✅ |
| Quick-Draw Katana | ❌ (sem ETB) | +2/+0, first strike | **Seu turno** | ✅ | ✅ |

---

### 4.2 Mana Rocks (Artefatos que produzem mana)

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definição | cards.js | `keywords: ["tap_for_mana"], produces: "X"` |
| 2 | Produzir mana | rules.js | `calculateAvailableMana()` |
| 3 | **Efeito condicional** | Se mana tiver efeito especial, verificar: |
| 3a | Escolha do jogador | game.js | Método para perguntar se quer usar |
| 3b | Verificar se pode pagar SEM | game.js | Calcular mana disponível sem o artefato |
| 3c | Aplicar efeito | game.js/rules.js | Setar flag e aplicar efeito |
| 3d | **Visual feedback** | ui.js | Exibir keyword/efeito concedido corretamente |

#### Matriz de Mana Rocks

| Artifact | Produz | Efeito Condicional | Escolha | Visual | Status |
|----------|:------:|:------------------:|:-------:|:------:|:------:|
| Carnelian Orb | {R} | Dragon ganha haste | ✅ `handleCarnelianOrb()` | ✅ `hasHasteFromOrb` | ✅ |
| Treasure Token | any | Sacrifício | N/A (auto) | N/A | ✅ |

**Regra MTG importante:** Se o mana de uma fonte COM efeito condicional é gasto em um spell elegível, o efeito DEVE ser aplicado (não é opcional). A escolha é apenas sobre QUAL fonte de mana usar.

---

### 4.3 Artefatos com Habilidades Ativadas

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definição | cards.js | Usar `id` único |
| 2 | Verificar se pode ativar | game.js | `canActivateAbility()` |
| 3 | Executar habilidade | game.js | `activateAbility()` |
| 4 | Validar alvo (se tiver) | game.js | Verificar `hasTargetPermanent` etc. |
| 5 | Sacrifício (se necessário) | game.js | Remover do battlefield |
| 6 | IA usar habilidade | ai.js | `shouldActivateAbility()` |

#### Matriz de Activated Abilities

| Artifact | Custo | Efeito | canActivate | activate | AI | Status |
|----------|:-----:|:------:|:-----------:|:--------:|:--:|:------:|
| Goblin Firebomb | {7}, T, Sac | Destroy permanent | ✅ | ✅ | ⚠️ default | ⚠️ |

**Nota:** Goblin Firebomb funciona para jogador humano, mas IA usa lógica `default` (não avalia inteligentemente quando sacrificar).

---

### 4.4 Tokens de Artefato

| Token | Gerado por | Habilidade | Status |
|-------|-----------|------------|:------:|
| Treasure Token | Rapacious Dragon, Seize the Spoils, Spectral Sailor, etc. | Sac: add any color | ✅ |

---

### Verificações Críticas para Artefatos com Efeitos Condicionais

**Ao implementar um artefato que produz mana com efeito condicional:**

```markdown
[ ] 1. O jogador tem escolha se tiver mana suficiente sem o artefato?
[ ] 2. Se não tiver mana suficiente, o artefato é usado automaticamente?
[ ] 3. O efeito é aplicado corretamente quando o mana é gasto?
[ ] 4. O visual reflete o efeito (ex: sem overlay de summoning sickness se tem haste)?
[ ] 5. A IA usa o artefato de forma inteligente?
```

---

## 5. Lands

| # | Verificação | Arquivo | Função |
|---|-------------|---------|--------|
| 1 | Definição | cards.js | `type: "land", produces: "W"` |
| 2 | Tap para mana | rules.js | `calculateAvailableMana()` |
| 3 | ETB (se especial) | triggers.js | `resolveETB()` |

### Matriz de Lands

| Land | Produces | Enters Tapped | ETB | Status |
|------|----------|:-------------:|:---:|:------:|
| Plains/Island/etc | W/U/B/R/G | ❌ | N/A | ✅ |
| Uncharted Haven | any (escolha) | ✅ | ✅ (escolher cor) | ✅ |

---

## Template para Nova Carta

### Antes de Implementar

```markdown
[ ] 1. Buscar no Scryfall: https://api.scryfall.com/cards/named?fuzzy=CARD_NAME
[ ] 2. Identificar tipo e habilidades
[ ] 3. Determinar quais funções precisam ser modificadas (ver seção relevante acima)
```

### Após Implementar

```markdown
[ ] 1. Testar manualmente no jogo
[ ] 2. Verificar se IA consegue usar a carta
[ ] 3. Rodar `npm test` (140 testes devem passar)
[ ] 4. Atualizar este documento se necessário
```

---

## Histórico de Bugs Encontrados

| Data | Carta | Problema | Causa Raiz |
|------|-------|----------|------------|
| Fev 2026 | Giant Growth | Não selecionava alvo | Faltava em `getValidSpellTargets()` |
| Fev 2026 | Fleeting Distraction | Não selecionava alvo | Faltava em `getValidSpellTargets()` |
| Fev 2026 | Into the Roil | Não selecionava alvo | Faltava em `getValidSpellTargets()` |
| Fev 2026 | Angelic Edict | Prioridade sem alvos | Faltava em `hasValidTargets()` |
| Fev 2026 | Carnelian Orb | Escolha ignorada + visual errado | Não verificava se podia pagar sem Orb; UI não checava `hasHasteFromOrb` |

---

*Última atualização: Fevereiro 2026*
