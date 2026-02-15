# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Principles

1. **Prefer robust solutions** - Centralize logic, reuse existing methods
2. **Follow existing patterns** - Check how similar features are already implemented in the codebase
3. **Check for architectural inconsistencies** - When implementing or debugging cards, verify:
   - ETB effects are in `triggers.js`, not inline in `game.js`
   - Similar effects use keywords (e.g., `etb_cat_token`) instead of `card.id` checks
   - Code is in the correct file according to the Architecture section below
4. **Never commit or push automatically** - Always wait for user to request commit

**Rules reference** (`docs/MagicCompRules 20251114.txt`): Consult only when implementing new game mechanics or fixing rules-related bugs. Not needed for UI, CSS, refactoring, or general code changes.

**Detailed guides** (consult when needed):
- `docs/07_CARD_IMPLEMENTATION_CHECKLIST.md` — Step-by-step guide for adding new cards
- `docs/06_SPELL_TARGETING_CHECKLIST.md` — Instant/sorcery targeting validation
- `docs/PITFALLS.md` — Common bugs and their fixes (library convention, counterspells, async/await, etc.)
- `docs/AUDIT_REPORT.md` — Code audit findings and fix status

## Project Overview

MTG Jumpstart Foundations - A browser-based Magic: The Gathering game for learning purposes. Single-player vs AI using all 10 Jumpstart decks from the Foundations Beginner Box (Cats, Goblins, Vampires, Elves, Pirates, Healing, Inferno, Undead, Primal, Wizards).

## Running the Game

Open `index.html` directly in a browser. No build system, server, or dependencies required - pure vanilla JavaScript.

## Architecture

**Core Game Flow:**
- `main.js` - Entry point, creates GameState instance
- `game.js` - Main game state and turn flow controller (GameState class)
- `triggers.js` - **TriggerManager**: ETBs, death triggers, combat triggers, end-of-turn triggers
- `rules.js` - MTG rules engine: phases, mana payment, combat damage, keywords
- `ai.js` - AI opponent logic for playing cards and combat decisions
- `ui.js` - DOM manipulation, rendering, event handling (GameUI class)
- `cards.js` - Card database (CARD_DATABASE) with all 10 decks
- `sounds.js` - SoundManager (Pixabay audio)
- `images.js` - ImageManager (Scryfall API for card images and avatars)

**Key Classes:**
- `GameState` - Central state: players, phase, turn number, combat state
- `TriggerManager` - **All card triggers centralized here** (ETBs, death triggers, combat triggers)
- `RulesEngine` - Validates plays, calculates mana, resolves combat damage (two-step first strike)
- `GameUI` - Renders cards, handles clicks, manages graveyard/exile modals
- `AIPlayer` - Decides which cards to play, attackers, blockers, mulligan decisions

**Game Flow:**
1. Player selects 1-2 decks → 20 or 40-card library (AI mirrors player's deck count)
2. Turn phases: Untap → Upkeep → Draw → Main1 → Combat → Main2 → End
3. Combat: declareAttackers → promptForBlockers → resolveCombat (two-step damage with SBA batch)
4. AI turn executed via executeAITurn() → continueAfterBlocking() → finishAITurn()

**Stack System:** Basic stack implementation for spells/abilities with priority passing:
- `addToStack(item, controller)` / `resolveTopOfStack()` / `passPriority()`
- AI responds via `aiDecideResponse()` → supports all counterspells (Cancel, Essence Scatter, etc.)

**Library Convention:** `player.library` uses END as top of deck. `pop()` draws, `unshift()` puts on bottom. See `docs/PITFALLS.md` for details.

## File Responsibilities

| File | What Goes Here | What Does NOT Go Here |
|------|----------------|----------------------|
| `cards.js` | Card definitions, keywords | Game logic, triggers |
| `triggers.js` | ETBs, death triggers, combat triggers, end-step triggers | Spell resolution, combat damage |
| `game.js` | Game flow, spell resolution, activated abilities, combat flow | Static effects, mana calculation |
| `rules.js` | Mana calculation, damage calculation, keyword checks, lord bonuses, hasValidTargets | Triggers, game state changes |
| `ai.js` | AI decisions for playing cards, attacking, blocking | Rule enforcement |
| `ui.js` | DOM rendering, event handlers, modals, prompts | Game logic |

## MTG Keywords Implemented

### Combat Keywords (shown in preview panel)
flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, flash, ward, hexproof, indestructible

### Internal Keywords (not shown in preview, used for game logic)
- **tap_for_mana**: Creature taps for mana (Llanowar Elves, Druid of the Cowl)
- **etb_draw**, **etb_bounce**, **etb_counter_two**, **etb_cat_token**, **etb_drain_2**, **etb_treasure**: Various ETB effects
- **etb_discard_opponent**, **etb_return_zombie**, **etb_return_creature**, **etb_return_zombie_battlefield**: More ETBs
- **etb_x_counters**: Enters with X +1/+1 counters (Wildwood Scourge)
- **goblin_lord**, **elf_lord**, **pirate_lord**: Other creatures of that type get +1/+1
- **zombie_skeleton_lord**: +1/+1 and deathtouch to Zombies/Skeletons (Death Baron)
- **flying_when_attacking**: Has flying only while attacking
- **counterspell**, **counterspell_creature**: Counter spells on the stack
- **equipment**, **enchant**: Artifact/Aura that attaches to creatures
- **raid**, **raid_draw**: Effects that trigger if attacked this turn
- **scry_N**, **draw_N**: Scry/draw N cards when spell resolves
- **sacrifice_for_mana**: Can sacrifice for mana of any color (Treasure Token)
- **enters_tapped**: Creature enters the battlefield tapped
- **dragon_cost_reduction**: Dragons cost {1} less
- **wizard_discount**: Instants and sorceries cost {1} less
- **draw_counter**: +1/+1 counter on every card draw (Clinquant Skymage)
- **second_draw_faerie**: Creates 1/1 Faerie on second draw each turn
- **lifegain_counter**: +1/+1 counter when you gain life (Ajani's Pridemate)
- **double_strike_above_starting**: Has double strike if life >= starting life
- **counter_synergy**: +1/+1 counter when counters placed on other non-Hydra creatures
- **graveyard_return**, **graveyard_create_zombies**: Graveyard activated abilities

### Adding Keywords to New Cards

- **Combat keywords**: Add to `keywords` array in cards.js (auto-displayed in preview)
- **ETB effects**: Add keyword + handler in `triggers.js` → `resolveETB()`
- **Activated abilities**: Add `hasActivatedAbility: true` in `cards.js` + use card `id` in `game.js` → `canActivateAbility()` + `activateAbility()`. Add `activationTiming: "combat"` for combat-only abilities.
- **Temporary keywords**: Use `card.temporaryKeywords` array, cleared at end of turn
- **Instant targeting**: Update `rules.js` → `hasValidTargets()` for every instant with targets

## Ability Routing Decision Tree

```
Card has ability?
├─ STATIC (always active)        → rules.js: calculateBonuses() / getCreatureKeywords()
├─ TRIGGERED (when event)        → triggers.js: resolveETB() / onCreatureDeath() / onBeginCombat() / onEndStep()
├─ ACTIVATED ({cost}: effect)    → game.js: canActivateAbility() + activateAbility()
└─ SPELL EFFECT (instant/sorc)   → game.js: resolveSpell() / resolveSpellWithTarget() + rules.js: hasValidTargets()
```

## Common Patterns

**Create Token:**
```javascript
controller.battlefield.push({
    instanceId: `token_name_${globalInstanceCounter++}`,
    name: 'Token Name', type: 'creature', subtype: 'Type',
    power: 1, toughness: 1, summoningSickness: true, isToken: true
});
```

**Add Counter:**
```javascript
if (!card.counters) card.counters = {};
card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
```

**Temporary Buff:** `card.powerModifier = (card.powerModifier || 0) + 2;` (cleared in cleanup step)

**Player Choice (human vs AI):**
```javascript
if (controller === this.player) {
    const target = await this.ui.promptTriggerTarget({ ... });
} else {
    const target = validTargets.sort((a, b) =>
        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
    )[0];
}
```

## UI Notes

- **Optimized for 70-80% browser zoom**
- **Preview panel**: Right side, 420px width, shows enlarged card on hover
- **Card sizes**: Hand 122x170, Lands 84x117, Other permanents 70x98
- **Tapped cards**: Horizontal margin (creatures 24px, lands 16px)
- **Avatars**: Scryfall art_crop from planeswalker cards (cats→ajani, goblins→chandra, vampires→liliana, elves→nissa, pirates→jace)
- **Settings**: ESC key opens settings (sound, display, priority stops). Persists to localStorage.

## Testing

```bash
npm test                           # Run all 215+ unit tests
node tools/validate-cards.js       # Validate cards against Scryfall
node tools/validate-cards.js --missing  # Check cards without tests
```

## Debug Commands (browser console)

```javascript
debug.setupCombat()                // Creates combat scenario
debug.fullMana()                   // Gives 10 of each mana
debug.addToBattlefield("Card")     // Add creature to your field
debug.draw("Card")                 // Draw specific card
debug.drawAny("Card")              // Draw from any deck
debug.state()                      // Full game state
debug.battlefield("both")          // All creatures
debug.setLife(5, "opponent")       // Set life total
debug.setPhase("MAIN1")           // Jump to phase
debug.help()                       // List all commands
```
