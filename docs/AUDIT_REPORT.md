# MTG Jumpstart Foundations — Deep Code Audit Report

**Date**: 2026-02-11
**Agents**: 5 (rules-auditor, ai-analyst, arch-reviewer, card-checker, edge-hunter)
**Total Findings**: 60+ | Cross-referenced and deduplicated

---

## CRITICAL (4 findings)

| # | Finding | Source | File | Impact |
|---|---------|--------|------|--------|
| C1 | ~~**No two-step first strike/double strike combat damage**~~ | Rules Auditor | `rules.js:810-994` | **FIXED** ✅ Refactored `resolveCombatDamage()` into proper two-step system: first strike damage → death checks → normal damage. Dead creatures don't deal damage in step 2. Double strike correctly deals in both steps. |
| C2 | ~~**State-based actions not checked as batch**~~ | Rules Auditor | `game.js:2717-2745` | **FIXED** ✅ Deaths deduplicated and processed as batch in `resolveCombat()`. `_checkDeaths()` now uses Set-based tracking to prevent duplicates. |
| C3 | ~~**Treasure tokens invisible to mana system**~~ | Edge Hunter | `triggers.js:230-238` | **FIXED** ✅ Added `produces: 'any'`, `canSacrificeForMana: true`, `isToken: true` to token creation + treasure handling in `calculateAvailableMana()`. |
| C4 | ~~**Tokens persist in graveyard — recursion can target them**~~ | Edge Hunter + Rules Auditor | `game.js:2748-2773` | **FIXED** ✅ Tokens now removed from graveyard after death triggers fire. Added `isToken: true` to all token types. Also fixed `Date.now()` instanceId collisions (M5). |

### C1: No Two-Step First Strike/Double Strike Combat Damage — FIXED ✅

- **MTG Rule**: 510.4, 702.7a, 702.4a
- **Fix applied**: Refactored `resolveCombatDamage()` into a proper two-step system:
  1. `_dealCombatDamageStep(..., isFirstStrikeStep=true)` — only first_strike/double_strike creatures deal damage
  2. `_checkDeaths()` — marks creatures killed by first strike damage (batch SBA)
  3. `_dealCombatDamageStep(..., isFirstStrikeStep=false)` — non-first-strike + double_strike deal damage, skipping dead creatures
  4. `_checkDeaths()` — marks final deaths
- **Key fixes**: Blocker with first_strike now kills non-first-strike attacker before it deals damage. Double strike deals power in each step (not 2x in one). Trample recalculates after first strike kills. Helper methods: `_getCombatKeywords()`, `_buildStepDamageMap()`, `_checkDeaths()`.

### C2: State-Based Actions Not Checked as a Batch — FIXED ✅

- **MTG Rule**: 704.3, 117.5
- **Fix applied**: Two improvements:
  1. `_checkDeaths()` in rules.js uses `Set`-based dead creature tracking to prevent duplicates and batch-check all combatants simultaneously
  2. `resolveCombat()` in game.js now deduplicates `creaturesDied` with `new Set()` before processing deaths
  3. Also added defender lifelink tracking (previously missing)

### C3: Treasure Tokens Invisible to Mana System

- **What's wrong**: `_createTreasureToken()` creates tokens WITHOUT `produces: 'any'` or `canSacrificeForMana: true`. The `calculateAvailableMana()` in `rules.js:343-388` never checks for `sacrifice_for_mana` keyword on artifacts — it only checks lands and `tap_for_mana` creatures.
- **Evidence**: CLAUDE.md documents that tokens need `produces: 'any'` and `canSacrificeForMana: true`, but `_createTreasureToken()` only has `keywords: ['sacrifice_for_mana']`.
- **Suggested fix**: Add `produces: 'any', canSacrificeForMana: true` to the token in `_createTreasureToken()`, AND add Treasure token handling in `calculateAvailableMana()`.

### C4: Tokens Persist in Graveyard

- **MTG Rule**: 704.5d, 111.7
- **What's wrong**: When a token creature dies, it goes through `destroyPermanent` which pushes it to `owner.graveyard` (line 2772). Per Rule 704.5d: "If a token is in a zone other than the battlefield, it ceases to exist."
- **Expected behavior**: Tokens should momentarily go to the graveyard (triggering death triggers) and then cease to exist. Currently, they accumulate in graveyard arrays, which could affect cards that look at the graveyard (Gravedigger, Rise Again could return tokens to hand).
- **Suggested fix**: After a token goes to graveyard and triggers fire, remove it. Mark tokens with `isToken: true` and periodically clean them from non-battlefield zones.

---

## HIGH (8 findings)

| # | Finding | Source | File | Impact |
|---|---------|--------|------|--------|
| H1 | ~~**`exileOnDeath` flag never cleared**~~ | Edge Hunter | `game.js:3730-3740` | **FIXED** ✅ Added `c.exileOnDeath = false` to cleanup step. |
| H2 | ~~**`markedForDeath` flag never checked**~~ | Edge Hunter | `game.js:1396, 2717` | **FIXED** ✅ `checkCreatureDeath()` now checks `markedForDeath` first and destroys/exiles accordingly. |
| H3 | ~~**AI blocks deathtouch with valuable creatures**~~ | AI Analyst | `ai.js:1072-1105` | **FIXED** ✅ `blockerDies` now accounts for attacker's deathtouch. |
| H4 | ~~**AI ignores first strike advantage in trade evaluation**~~ | AI Analyst | `ai.js:666-677` | **FIXED** ✅ AI now evaluates first strike/double strike/deathtouch in both attack and canDie/canKill checks. |
| H5 | ~~**Trample doesn't account for pre-existing damage**~~ | Rules Auditor + Edge Hunter | `rules.js:948-961` | **FIXED** ✅ Trample now uses `Math.max(0, toughness - existing_damage)` for lethal calculation. |
| H6 | **Ward implementation possibly disconnected** | Rules Auditor | `rules.js:1381-1410` | `getWardCost()`/`canPayWard()` methods exist but may not be called from targeting code paths in game.js. |
| H7 | ~~**Suspicious Shambler ability unimplemented**~~ | Edge Hunter | `cards.js:280` | **FIXED** ✅ Added `canActivateGraveyardAbility()` and `activateGraveyardAbility()` for Shambler. Pays {4}{B}{B}, exiles from graveyard, creates two 2/2 Zombie tokens. AI can use it too via `useGraveyardAbilities()`. |
| H8 | ~~**Event listener leak in setupDropZones**~~ | Arch Reviewer | `ui.js:1049-1066` | **FIXED** ✅ Added `_dropZonesInitialized` guard to prevent duplicate listeners. |

### H1: `exileOnDeath` Flag Never Cleared

- **Scenario**: Scorching Dragonfire hits a creature for 3 damage, sets `exileOnDeath = true`. The creature survives (e.g., 3/4). Next turn, the creature takes 1 damage in combat and dies normally.
- **Expected**: Creature goes to graveyard (the exile effect was this turn only).
- **Actual**: `exileOnDeath` flag is never cleared during cleanup. The cleanup step (line 3730-3740) clears `damage`, `powerModifier`, `toughnessModifier`, `temporaryKeywords`, `mustBeBlocked` — but NOT `exileOnDeath`.
- **Fix**: Add `c.exileOnDeath = false;` to the cleanup step at line 3738.

### H2: `markedForDeath` Flag Never Checked

- **Scenario**: Bite Down with a deathtouch creature deals damage and sets `enemyTarget.markedForDeath = true`. A 1-power deathtouch creature Bite Downs a 1/5 — it deals 1 damage, sets `markedForDeath`, but `checkCreatureDeath` sees 1 damage < 5 toughness and the creature survives.
- **Fix**: Add `if (creature.markedForDeath) { await this.destroyPermanent(creature, owner); delete creature.markedForDeath; return; }` at the start of `checkCreatureDeath()`.

### H3: AI Blocks Deathtouch with Valuable Creatures

- **Scenario**: Player attacks with a 1/1 deathtouch creature. AI has a 5/5 available to block. The blocker loop checks: `attackerDies = (5 >= 1) = true`, `blockerDies = (1 >= 5) = false`. Condition 1 matches (kill attacker without dying), so AI blocks with the 5/5.
- **What's wrong**: The `blockerDies` check doesn't account for the attacker's deathtouch. A 1/1 deathtouch will kill the 5/5 blocker.
- **Fix**: Modify: `const blockerDies = attackerPower >= blockerToughness || this.rules.hasKeyword(attacker, 'deathtouch', true);`

### H4: AI Ignores First Strike Advantage in Trade Evaluation

- **Scenario**: AI has a 2/2 first-striker. Opponent has only a 2/2 vanilla creature as potential blocker. AI evaluates `canDie = true` (2 >= 2) and `canKill = true` (2 >= 2), treating it as an even trade. But first strike means AI's creature would kill the blocker before taking damage, surviving the combat.
- **Fix**: When checking `canDie`, also check if attacker has first_strike/double_strike AND blocker lacks first_strike. If so, attacker kills blocker first and survives.

### H5: Trample Doesn't Account for Pre-Existing Damage

- **MTG Rule**: 510.1c, 702.19c
- **Scenario**: A blocker has 4 toughness but has already taken 2 damage from a spell. A 6/6 trample attacker is blocked by this damaged creature. Only 2 damage is needed to be lethal (4 - 2), so 4 should trample through. But the code uses full toughness (4), so only 2 tramples.
- **Fix**: Change line 952 to: `return sum + Math.max(0, this.getCreatureToughness(b) - (b.damage || 0));`

### H6: Ward Implementation Possibly Disconnected

- **MTG Rule**: 702.21a
- **What's wrong**: Ward is defined as a triggered ability. The `getWardCost()` and `canPayWard()` methods exist in rules.js but may not be called when targeting happens in game.js (`resolveSpellWithTarget`, aura attachment, etc.).
- **Fix**: Audit all targeting code paths in game.js and verify Ward check is invoked.

### H7: Suspicious Shambler Ability Unimplemented — FIXED ✅

- **Fix applied**: Added `suspicious_shambler` case to `canActivateGraveyardAbility()` (checks {4}{B}{B} mana, sorcery speed: main phase + stack empty) and `activateGraveyardAbility()` (pays mana, exiles from graveyard, creates two 2/2 Zombie tokens via `_createZombieToken()`). Also added `useGraveyardAbilities()` to AI so opponent can use it.

### H8: Event Listener Leak in setupDropZones

- **What's wrong**: `setupDropZones()` adds `dragover` and `drop` event listeners to the battlefield element on every render. New listeners accumulate.
- **Fix**: Add a guard (`if (battlefield._dropZonesInitialized) return;`) or use event delegation on a stable parent element.

---

## MEDIUM (14 findings)

| # | Finding | Source | File |
|---|---------|--------|------|
| M1 | ~~**Duplicate main phase logic**~~ — AI's sophisticated logic in `ai.js:218-342` bypassed by simpler version in `game.js:4264-4306` | AI Analyst + Arch Reviewer | ai.js / game.js | **FIXED** ✅ `executeAIMainPhaseWithPriority()` now delegates to `ai.getNextCardToPlay()` with full treasure/mana reservation/aura validation. |
| M2 | **game.js is a 4545-line god file** with 6+ responsibilities | Arch Reviewer | game.js |
| M3 | **playCard() is 416 lines**, resolveSpellWithTarget() 411 lines, activateAbility() 469 lines | Arch Reviewer | game.js |
| M4 | ~~**Volley/Broken Wings miss conditional flying**~~ — use `c.keywords.includes('flying')` instead of `hasKeyword()` | Rules Auditor | `rules.js:194-208` | **FIXED** ✅ Now uses `this.hasKeyword(c, 'flying', false)`. |
| M5 | ~~**Token instanceId collisions**~~ — `Date.now()` without random suffix for treasures, cats, elves | Edge Hunter + Rules Auditor | `triggers.js:232-256` | **FIXED** ✅ All tokens now use `globalInstanceCounter++`. |
| M6 | **Goblin Smuggler ability never activated** — checked only in Main Phase 2, needs pre-combat | AI Analyst | `ai.js:506-509` |
| M7 | ~~**chooseBestCard ignores board state**~~ — always picks creatures over removal regardless of threats | AI Analyst | `ai.js:546-567` | **FIXED** ✅ Now evaluates enemy threat level; prioritizes removal when opponent has dominant creatures (threat >= 8). |
| M8 | ~~**Removal target selection ignores keywords**~~ — picks by raw power, not threat (flying, lifelink, lords) | AI Analyst | `ai.js:1226-1253` | **FIXED** ✅ New `_evaluateCreatureThreat()` weights flying +3, menace +2, double_strike +power, deathtouch +3, lifelink +2, lords +4, etc. |
| M9 | ~~**AI never uses counterspells**~~ — no priority response logic for AI | AI Analyst | ai.js (missing) | **FIXED** ✅ `aiDecideResponse()` now checks all counterspell keywords (Cancel, Essence Scatter, etc.) using `isCounterspell()` + `canCounterTarget()`. `shouldCounterspell()` evaluates value by counterspell type. |
| M10 | **wizard_discount too narrow** — only Arcane Epiphany benefits, not all instants/sorceries | Edge Hunter + Rules Auditor | `rules.js:499-506` |
| M11 | ~~**makeModalDraggable adds permanent document listeners**~~ | Arch Reviewer | `ui.js:4223-4247` | **NOT A BUG** — `_dragInitialized` guard already prevents duplicates; modals are static DOM elements. |
| M12 | **Duplicate equip logic** — pirates_cutlass and quick_draw_katana are near-identical 55-line blocks | Arch Reviewer | `game.js:3276-3393` |
| M13 | ~~**Vigilance check bypasses hasKeyword()**~~ — misses granted vigilance | Edge Hunter | `game.js:3772` | **FIXED** ✅ Now uses `this.rules.hasKeyword(attacker, 'vigilance', true)`. |
| M14 | **Inconsistent error handling** — some try/catch, mostly none. Failures can freeze game | Arch Reviewer | game.js various |

### M1: Duplicate Main Phase Logic

The actual main phase execution in `game.js:4264-4306` is a simplified version that bypasses most of the AI's sophisticated decision-making in `ai.playMainPhase()`. The AI's treasure handling, mana reservation for instants, and raid card holding are never used during the actual game loop.

**Fix**: Refactor `executeAIMainPhaseWithPriority()` to delegate card selection to the AI class.

### M2-M3: game.js God File / Giant Methods

game.js contains 6+ responsibilities: game state management, spell resolution (~400 lines), mana payment, activated abilities (~470 lines), combat flow, AI turn orchestration. Three methods exceed 400 lines each with massive switch statements.

**Fix**: Extract SpellResolver, CombatManager classes. Use dispatch tables for spell/ability switch statements.

### M4: Volley/Broken Wings Miss Conditional Flying

`hasValidTargets` checks for Volley and Broken Wings use `c.keywords && c.keywords.includes('flying')` which only checks base keywords. Misses creatures that gain flying from effects (Kargan Dragonrider, auras, etc.).

**Fix**: Replace with `this.hasKeyword(c, 'flying', false)` at lines 196 and 206.

### M5: Token instanceId Collisions

`_createTreasureToken()` uses `treasure_token_${Date.now()}` without additional uniqueness. If called twice in the same millisecond (common since `etb_treasure_two` calls it in a tight loop), both tokens get the same instanceId.

**Fix**: Use `globalInstanceCounter++` or add `Math.random()` suffix to all token creation methods.

### M6: Goblin Smuggler Ability Never Activated

`shouldActivateAbility` returns `false` for goblin_smuggler with the comment "Na Main Phase 2 não faz sentido". Activated abilities are only checked in Main Phase 2, but Smuggler needs pre-combat activation.

**Fix**: Move combat-relevant ability activation to before combat, or add a `usePreCombatAbilities()` method.

### M7: chooseBestCard Ignores Board State

Card selection always prioritizes creatures over all non-creature spells regardless of board state. AI plays a 2/2 instead of using Murder on opponent's 6/6.

**Fix**: Add threat assessment: if opponent has dominant creatures, prioritize removal.

### M8: Removal Target Selection Ignores Keywords

Target selection only considers raw power. A 2/2 flyer is more dangerous than a 3/3 vanilla, but AI picks the 3/3.

**Fix**: Add keyword weighting: `threatValue = power + (hasFlying ? 3 : 0) + (hasLifelink ? 2 : 0) + (hasDoubleStrike ? power : 0) + (isLord ? 4 : 0)`

### M9: AI Never Uses Counterspells — FIXED ✅

**Fix applied**: `aiDecideResponse()` now uses generic counterspell detection via `isCounterspell()` + `canCounterTarget()` instead of hardcoded `c.id === 'cancel'`. Supports Cancel (any spell), Essence Scatter (creatures only), and future counterspells. `shouldCounterspell()` evaluates value differently by counterspell type (Essence Scatter: CMC >= 3 creatures; Cancel: CMC >= 4 creatures, removal, big spells).

### M10: wizard_discount Too Narrow

The code checks if the SPELL being cast has `wizard_discount` keyword (only Arcane Epiphany). Goblin Electromancer should give a global discount to all instants/sorceries, but its effect is dead code.

**Fix**: Change cost reduction to check if player controls a creature with wizard_discount and the spell is instant/sorcery.

### M11: makeModalDraggable Permanent Listeners

Each call adds `mousemove` and `mouseup` listeners to `document` that are never removed. Document accumulates orphaned handlers.

**Fix**: Store listener references and remove them when modal is closed.

### M12: Duplicate Equip Logic

`pirates_cutlass` and `quick_draw_katana` case blocks are nearly identical (~55 lines each), differing only in card name strings.

**Fix**: Extract a generic `equipToCreature(card, player, equipName, equipCost)` helper.

### M13: Vigilance Check Bypasses hasKeyword()

`declareAttackers()` checks `!attacker.keywords || !attacker.keywords.includes('vigilance')` which only checks the static keywords array. Misses vigilance from temporaryKeywords, auras, equipment, or other effects.

**Fix**: Use `this.rules.hasKeyword(attacker, 'vigilance', true)`.

### M14: Inconsistent Error Handling

Some methods use try/catch (resolveCombat), most have none. Some errors are logged as `[ERRO]` but execution continues. No consistent strategy.

**Fix**: Define an error boundary strategy. Wrap main phase-advance loop so errors don't freeze the game.

---

## LOW (10 findings)

| # | Finding | Source |
|---|---------|--------|
| L1 | **AI deathtouch not valued in attack decisions** — 1/1 deathtouch trading with 5/5 is excellent but AI won't attack | AI Analyst |
| L2 | **AI trample excess damage not leveraged** — trampler that dies but deals 5+ damage might be worth sending | AI Analyst |
| L3 | **AI chump blocks too aggressively at high life** — chump blocks 3/3 at 20 life with token | AI Analyst |
| L4 | ~~**AI doesn't play lands in Main Phase 2**~~ — land drop only checked in phase 1 | AI Analyst | **FIXED** ✅ (R7 — AI now plays lands in Main Phase 2 before abilities) |
| L5 | ~~**AI mana dork priority not handled**~~ — plays big creatures over ramp in early turns | AI Analyst | **FIXED** ✅ (R7 — `_evaluateCardToPlay()` prioritizes mana dorks in early turns) |
| L6 | **Floating mana empties per phase not per step** — should empty between combat sub-steps (Rule 106.4) | Rules Auditor |
| L7 | **Bloodtithe Collector** missing "Noble" subtype (cosmetic) | Card Checker |
| L8 | **Highborn Vampire** missing "Warrior" subtype (cosmetic) | Card Checker |
| L9 | **Tajuru Pathwarden** missing "Ally" subtype (cosmetic) | Card Checker |
| L10 | ~~**Duplicate blocker entries**~~ in `creaturesDied` array — deathtouch + lethal damage can double-push | Edge Hunter | **FIXED** ✅ (by C1/C2 refactor — `_checkDeaths()` uses Set + `includes()` guard, `resolveCombat()` deduplicates with `new Set()`) |

---

## CROSS-REFERENCES (findings confirmed by multiple agents)

| Finding | Confirmed By |
|---------|-------------|
| Trample + pre-existing damage (H5) | Rules Auditor #3 + Edge Hunter #10 |
| Tokens in graveyard (C4) | Rules Auditor #4 + Edge Hunter #2 |
| wizard_discount scope (M10) | Rules Auditor #14 + Edge Hunter #16 |
| Duplicate main phase (M1) | AI Analyst B1 + Arch Reviewer 1.1 |
| First strike combat (C1 + H4) | Rules Auditor #1 + AI Analyst A1 |
| Token instanceId (M5) | Rules Auditor #13 + Edge Hunter #7 |

---

## POSITIVE FINDINGS

- **Card database is excellent** — 200 cards across 10 decks, all stats verified against Scryfall. Zero gameplay-affecting data errors.
- **Mulligan logic is well-designed** — sound hand evaluation with London mulligan implementation.
- **Gang blocking correctly handles deathtouch** in ai.js.
- **Cleanup step is correctly implemented** for temporary modifiers.
- **Draw from empty library handled correctly**.

---

## TOP 5 RECOMMENDED FIXES (by impact)

1. ~~**Fix treasure token mana** (C3)~~ ✅ **DONE** — Added `produces: 'any'`, `canSacrificeForMana: true` to token creation + treasure handling in `calculateAvailableMana()`.

2. ~~**Clean tokens from graveyard** (C4)~~ ✅ **DONE** — Added `isToken: true` to all token types. Tokens removed from graveyard after death triggers in `destroyPermanent()` and `sacrificeCreature()`. Also fixed instanceId collisions (M5) by using `globalInstanceCounter++`.

3. ~~**Clear `exileOnDeath` in cleanup step** (H1)~~ ✅ **DONE** — Added `c.exileOnDeath = false` and `c.markedForDeath = false` to cleanup step.

4. ~~**Fix `markedForDeath` / deathtouch via Bite Down** (H2)~~ ✅ **DONE** — `checkCreatureDeath()` now checks `markedForDeath` first, handles exile path too.

5. ~~**Fix AI deathtouch blocking** (H3)~~ ✅ **DONE** — `blockerDies` now includes `attackerHasDeathtouch` check.

All 5 quick wins implemented. Tier 1-3 fixes complete (22 of 36 findings resolved: 21 fixed + 1 reclassified as NOT A BUG). 615/615 tests passing. Remaining: H6 (ward), M2/M3 (god file), M6/M10/M12/M14, L1-L3, L6-L9.

---

## FIX LOG

| Date | Findings Fixed | Files Changed |
|------|---------------|---------------|
| 2026-02-11 | C3, C4, H1, H2, H3, M5 | `triggers.js`, `game.js`, `rules.js`, `ai.js` |
| 2026-02-11 | H5, H8, M4, M13 | `rules.js`, `game.js`, `ui.js` |
| 2026-02-11 | M11 reclassified as NOT A BUG | — (already guarded by `_dragInitialized`) |
| 2026-02-11 | H4, M1, M7, M8 | `ai.js`, `game.js` |
| 2026-02-11 | C1, C2, H7, M9, L10 | `rules.js`, `game.js`, `ai.js` |
| 2026-02-22 | L4, L5 + 20 AI quality improvements (R7) | `ai.js`, `game.js`, `triggers.js` |
