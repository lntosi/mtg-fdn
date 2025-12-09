# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Official MTG Rules Reference

The official Magic: The Gathering Comprehensive Rules are available at `docs/MagicCompRules 20251114.txt`. Use this as the authoritative source for any rules questions or implementation decisions.

## Forge as Implementation Reference

When implementing new features, fixing bugs, or solving complex MTG mechanics, use **Forge** (https://github.com/Card-Forge/forge) as a reference implementation. Forge is a mature, open-source MTG game engine with robust solutions for:

- Priority system and stack resolution
- Combat phases and damage assignment
- Keyword abilities and triggered effects
- State-based actions
- Complex card interactions

**How to use Forge as reference:**
1. Search the Forge repository for relevant code patterns
2. Adapt solutions to our vanilla JavaScript architecture
3. Simplify where appropriate for our learning-focused scope
4. Maintain consistency with our existing codebase style

Note: Forge is written in Java, so implementations need to be adapted to JavaScript. Focus on the logic and algorithms rather than direct code translation.

## Project Overview

MTG Jumpstart Foundations - A browser-based Magic: The Gathering game for learning purposes. Single-player vs AI using 5 Jumpstart decks from the Foundations Beginner Box (Cats, Goblins, Vampires, Elves, Pirates).

## Running the Game

Open `index.html` directly in a browser. No build system, server, or dependencies required - pure vanilla JavaScript.

## Architecture

**Core Game Flow:**
- `main.js` - Entry point, creates GameState instance
- `game.js` - Main game state and turn flow controller (GameState class)
- `rules.js` - MTG rules engine: phases, mana payment, combat damage, keywords
- `ai.js` - AI opponent logic for playing cards and combat decisions
- `ui.js` - DOM manipulation, rendering, event handling (GameUI class)
- `cards.js` - Card database (CARD_DATABASE) with all 5 decks
- `sounds.js` - SoundManager (Pixabay audio)
- `images.js` - ImageManager (Scryfall API for card images and avatars)

**Key Classes:**
- `GameState` - Central state: players, phase, turn number, combat state. Has persistence via localStorage (saveGame/restoreGame)
- `RulesEngine` - Validates plays, calculates mana, resolves combat damage
- `GameUI` - Renders cards, handles clicks, manages graveyard popup
- `AIPlayer` - Decides which cards to play, attackers, blockers

**Game Flow:**
1. Player selects 2 decks → combined 40-card library
2. Turn phases: Untap → Upkeep → Draw → Main1 → Combat → Main2 → End
3. Combat: declareAttackers → promptForBlockers → resolveCombat
4. AI turn executed via executeAITurn() → continueAfterBlocking() → finishAITurn()

**Card Images:** Fetched from Scryfall API via ImageManager with rate limiting and caching.

**Persistence:** Game auto-saves to localStorage on key actions, restores on page reload.

**Stack System:** Basic stack implementation for spells/abilities with priority passing:
- `addToStack(item, controller)` - Add spell/ability to stack
- `resolveTopOfStack()` - Resolve top item
- `passPriority()` - Pass priority to other player
- `isStackEmpty()`, `canRespond(player)` - Check stack state

**AI Action Delays:** AI has built-in delays between actions for better visibility:
- Phase transitions: 500-800ms
- Playing cards: 600-1200ms
- Combat decisions: 800-1200ms

**Priority Windows:** Player receives priority windows to respond with instants:
- After AI declares blockers (before combat damage)
- When AI casts spells
- At end of opponent's turn
- Auto-pass if no valid responses available

## Settings Menu (M key)

Press M to open settings menu with:
- **Themes**: Roxo Místico (default), Clean, Alto Contraste
- **Sound**: Toggle on/off, volume slider
- **Fullscreen**: Toggle fullscreen mode
- **Concede**: Forfeit current game

Settings persist in localStorage.

## Debug Mode

Debug commands available via browser console (`window.debug.*`):

```javascript
// Card manipulation
debug.addToHand("Card Name")           // Add card to hand
debug.addToBattlefield("Card Name")    // Add card to battlefield
debug.addToBattlefield("Card", "opponent") // Add to opponent's field

// Game state
debug.setLife(10)                      // Set player life
debug.setLife(5, "opponent")           // Set opponent life
debug.addMana("W", 3)                  // Add mana to pool
debug.fullMana()                       // Add 10 of each mana

// Turn control
debug.setPhase("DECLARE_ATTACKERS")    // Jump to phase
debug.nextTurn()                       // Advance turn
debug.setupCombat()                    // Quick combat scenario

// Info
debug.state()                          // Show game state
debug.battlefield()                    // List creatures
debug.hand()                           // Show hand
debug.help()                           // Show all commands
```

## Avatars

Player and AI avatars use Scryfall art_crop images from planeswalker cards (versões com artes mais focadas no rosto):
- jace: Jace Beleren
- chandra: Chandra Nalaar
- liliana: Liliana, Dreadhorde General
- gideon: Gideon Blackblade
- nissa: Nissa Revane
- ajani: Ajani Goldmane

AI avatar is chosen based on deck theme (cats→ajani, goblins→chandra, vampires→liliana, elves→nissa, pirates→jace).

## Damage Display System

Creatures display damage taken visually:
- **Effective Toughness**: Shows `power/effective_toughness` where effective = toughness - damage
- **Damaged Stats**: Red background on P/T display with pulse animation
- **Damage Badge**: Purple badge showing `-X` damage marked (positioned above stats)
- **Border Indicator**: Red pulsing border on damaged creatures
- Damage clears automatically at end of turn (cleanup step)

Example: A 3/3 creature with 2 damage shows as `3/1` with red stats and a `-2` badge.

## UI/Layout Notes

- **Optimized for 70-80% browser zoom**: The layout works best at reduced zoom levels. Full 100% zoom support would require deeper layout refactoring (Arena-style fan hand, stacked lands, etc.) - deferred to future development.
- **Preview panel**: Right side panel shows enlarged card on hover (420px width, 480px image)
- **Hand card hover**: Reduced zoom (1.4x) to avoid visual clutter alongside preview panel
- **Contextual main button**: Changes text/color based on game state (Passar Turno, Ir para Combate, etc.)

## MTG Keywords Implemented

### Combat Keywords (shown in preview panel)
flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, flash, ward, hexproof, indestructible

### Internal Keywords (not shown in preview, used for game logic)
- **tap_for_mana**: Creature can tap for mana (e.g., Llanowar Elves)
- **etb_draw**: Draw a card when enters battlefield
- **etb_bounce**: Return target creature to owner's hand
- **etb_counter_two**: Put +1/+1 counter on up to two other creatures (Felidar Savior)
- **etb_treasure**: Create a Treasure token
- **goblin_lord**, **elf_lord**, **pirate_lord**: Other creatures of that type get +1/+1
- **flying_when_attacking**: Has flying only while attacking
- **counterspell**: Counter target spell on the stack
- **equipment**: Artifact that attaches to creatures
- **enchant**: Aura that attaches to creatures
- **raid**, **raid_draw**: Effects that trigger if attacked this turn
- **scry**: Look at top card(s) and choose to keep or bottom

### Keyword Display System (Preview Panel)

Keywords are displayed in the right-side preview panel with visual distinction:

| Type | CSS Class | Appearance | When Used |
|------|-----------|------------|-----------|
| **Original** | `.keyword-badge` | Purple solid | Keywords in card's `keywords` array |
| **Permanent effect** | `.keyword-badge.keyword-added` | Green, dashed border | Added by Auras, Lords, Equipment |
| **Temporary** | `.keyword-badge.keyword-temporary` | Faded green, italic | Added until end of turn (combat tricks) |

Only combat-relevant keywords are shown. Internal keywords (lords, etb_, etc.) are hidden.

### Adding Keywords to New Cards

**For combat keywords** (flying, deathtouch, etc.):
- Add to `keywords` array in card definition
- Will automatically appear in preview panel

**For ETB effects**:
- Add keyword like `etb_draw`, `etb_bounce`, `etb_counter_two`
- Implement handler in `game.js` → `resolveETB()` function

**For activated abilities** (costs mana/tap):
- Use card's `id` directly (not a keyword)
- Implement in `game.js` → `canActivateAbility()` and `activateAbility()`
- Example: `jazal_goldmane`, `vampire_neonate`, `dropkick_bomber`

**For temporary keywords** (combat tricks):
- Use `card.temporaryKeywords = []` array
- Push keywords: `target.temporaryKeywords.push('first_strike')`
- Cleared automatically at end of turn in cleanup step
- Example: Kindled Fury gives first_strike, Dropkick Bomber gives flying

### Instant Targeting Validation

When adding new instants, update `rules.js` → `hasValidTargets()` to ensure:
- Buff spells check for own creatures
- Removal spells check for opponent creatures
- Prevents priority window appearing when no valid targets exist