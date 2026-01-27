# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Principles

1. **Prefer robust solutions** - Centralize logic, reuse existing methods
2. **Follow existing patterns** - Check how similar features are already implemented in the codebase
3. **Check for architectural inconsistencies** - When implementing or debugging cards, verify:
   - ETB effects are in `triggers.js`, not inline in `game.js`
   - Similar effects use keywords (e.g., `etb_cat_token`) instead of `card.id` checks
   - Code is in the correct file according to the Architecture section below
4. **Never commit or push automatically** - Always wait for user to request commit. When asked, provide simplified commands:
   ```bash
   git add <files>
   git commit -m "type: short description"
   ```

**Rules reference** (`docs/MagicCompRules 20251114.txt`): Consult only when implementing new game mechanics or fixing rules-related bugs. Not needed for UI, CSS, refactoring, or general code changes.

**Forge reference** (https://github.com/Card-Forge/forge): Optional reference for complex MTG mechanics.

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
- `RulesEngine` - Validates plays, calculates mana, resolves combat damage
- `GameUI` - Renders cards, handles clicks, manages graveyard/exile modals
- `AIPlayer` - Decides which cards to play, attackers, blockers

**Game Flow:**
1. Player selects 1-2 decks → 20 or 40-card library (AI mirrors player's deck count)
2. Turn phases: Untap → Upkeep → Draw → Main1 → Combat → Main2 → End
3. Combat: declareAttackers → promptForBlockers → resolveCombat
4. AI turn executed via executeAITurn() → continueAfterBlocking() → finishAITurn()

**Card Images:** Fetched from Scryfall API via ImageManager with rate limiting and caching.

**Stack System:** Basic stack implementation for spells/abilities with priority passing:
- `addToStack(item, controller)` - Add spell/ability to stack
- `resolveTopOfStack()` - Resolve top item
- `passPriority()` - Pass priority to other player
- `isStackEmpty()`, `canRespond(player)` - Check stack state
- **Stack Badge**: Shows `[N]` on priority button with hover dropdown listing all items (LIFO order)

**AI Action Delays:** AI has built-in delays between actions for better visibility:
- Phase transitions: 500-800ms
- Playing cards: 600-1200ms
- Combat decisions: 800-1200ms

**Priority Windows:** Player receives priority windows to respond with instants:
- Configurable stops: Upkeep, Begin Combat, After Attackers, After Blockers, End Step
- Separate settings for your turn vs opponent's turn (Settings menu → Priority Stops)
- When AI casts spells (always)
- Auto-pass if no valid responses available
- `priorityStops` object in GameState controls behavior, persists to localStorage

## Settings Menu (ESC key)

Press ESC to open settings menu (two-column layout, draggable by title):

**Left Column:**
- **Sound**: Toggle on/off, SFX volume (default 70%), Music volume (default 80%)
- **Display**: Log panel toggle, Fullscreen button
- **Debug**: Export/Copy game log

**Right Column:**
- **Priority Stops**: Configure when you get priority windows (Arena-style)
  - Your Turn: Upkeep, Begin Combat, After Attackers, After Blockers, End Step
  - Opponent Turn: Same options with different defaults

**Footer:**
- **Reset Defaults**: Restores all settings (SFX 70%, Music 80%, Log OFF)
- **Restart/Concede**: Game control buttons

Settings persist in localStorage.

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
- **etb_cat_token**: Create a 1/1 Cat creature token (Prideful Parent)
- **etb_drain_2**: Opponent loses 2 life, you gain 2 life (Vampire Spawn)
- **etb_treasure**: Create a Treasure token
- **goblin_lord**, **elf_lord**, **pirate_lord**: Other creatures of that type get +1/+1
- **flying_when_attacking**: Has flying only while attacking
- **counterspell**: Counter target spell on the stack
- **equipment**: Artifact that attaches to creatures
- **enchant**: Aura that attaches to creatures
- **raid**, **raid_draw**: Effects that trigger if attacked this turn
- **scry_N**: Look at top N cards and choose to keep or bottom (e.g., `scry_1`, `scry_2`)
- **draw_N**: Draw N cards when spell resolves (e.g., `draw_1`, `draw_2`)
- **sacrifice_for_mana**: Can sacrifice for mana of any color (Treasure Token)
- **enters_tapped**: Creature enters the battlefield tapped (Diregraf Ghoul)
- **etb_discard_opponent**: Opponent discards a card on ETB (Virus Beetle)
- **etb_return_zombie**: Return Zombie or Skeleton from graveyard to hand (Gravedigger variant)
- **etb_return_creature**: Return target creature from graveyard to hand (Gravedigger)
- **etb_return_zombie_battlefield**: Return Zombie/Skeleton from graveyard to battlefield (Rot Hulk)
- **zombie_skeleton_lord**: Gives +1/+1 and deathtouch to Zombies and Skeletons (Death Baron)
- **dragon_cost_reduction**: Dragons cost {1} less (Dragonlord's Servant)
- **wizard_discount**: Instants and sorceries cost {1} less (Goblin Electromancer)
- **draw_counter**: Gets +1/+1 counter when drawing second card each turn (Clinquant Skymage)
- **second_draw_faerie**: Creates 1/1 Faerie token on second draw each turn (Mischievous Mystic)
- **counterspell_creature**: Only counters creature spells (Essence Scatter)
- **lifegain_counter**: Gets +1/+1 counter when you gain life (Ajani's Pridemate)
- **double_strike_above_starting**: Has double strike if life >= starting life (Twinblade Paladin)

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
- Implement handler in `triggers.js` → `TriggerManager.resolveETB()` method

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

## Adding Individual Cards - Complete Checklist

This is the authoritative guide for implementing any new card. Follow this checklist step-by-step.

### Step 0: Fetch Official Card Data from Scryfall

**ALWAYS start here.** Never implement a card without verifying against Scryfall.

```bash
# Via API (preferred - returns JSON)
curl "https://api.scryfall.com/cards/named?fuzzy=Card+Name"

# Via Web (for visual reference)
https://scryfall.com/search?q=name:"Card Name" set:fdn
```

**Data to extract:**
| Field | Scryfall JSON | cards.js field |
|-------|---------------|----------------|
| Name | `name` | `name` |
| Mana cost | `mana_cost` | `cost` (e.g., "{2}{W}" → "2W") |
| CMC | `cmc` | `cmc` |
| Type line | `type_line` | `type` + `subtype` |
| Power/Toughness | `power`, `toughness` | `power`, `toughness` |
| Oracle text | `oracle_text` | `text` (can translate) |
| Keywords | `keywords[]` | `keywords[]` |

### Step 1: Define Card in `cards.js`

**Required fields by card type:**

```javascript
// CREATURE
{
  id: "card_name",           // snake_case, unique
  name: "Card Name",         // Exact Scryfall name
  type: "creature",
  subtype: "Human Soldier",  // From type_line after "—"
  cost: "2W",                // Mana cost without braces
  cmc: 3,                    // Converted mana cost
  power: 2,
  toughness: 3,
  keywords: ["flying"],      // Combat keywords only
  text: "Card text...",      // Portuguese or English
  qty: 1                     // Copies in deck
}

// INSTANT / SORCERY
{
  id: "spell_name",
  name: "Spell Name",
  type: "instant",           // or "sorcery"
  cost: "1R",
  cmc: 2,
  text: "Spell effect...",
  qty: 1
}

// ENCHANTMENT (Aura)
{
  id: "aura_name",
  name: "Aura Name",
  type: "enchantment",
  subtype: "Aura",
  cost: "1W",
  cmc: 2,
  keywords: ["enchant"],     // Required for auras
  text: "Enchant creature...",
  qty: 1
}

// ARTIFACT (Equipment)
{
  id: "equipment_name",
  name: "Equipment Name",
  type: "artifact",
  subtype: "Equipment",
  cost: "2",
  cmc: 2,
  keywords: ["equipment"],   // Required for equipment
  text: "Equipped creature...",
  qty: 1
}

// LAND
{
  id: "basic_land",
  name: "Plains",
  type: "land",
  produces: "W",             // Single color
  qty: 8
}
// OR for special lands:
{
  id: "special_land",
  name: "Uncharted Haven",
  type: "land",
  produces: "any",           // Triggers color choice ETB
  enters_tapped: true,
  qty: 1
}
```

### Step 2: Classify Card Abilities and Route to Correct File

Use this decision tree to determine where to implement each ability:

```
Card has ability?
│
├─ STATIC ABILITY (always active while on battlefield)
│   ├─ Lord bonus (+1/+1 to type)     → rules.js: calculateBonuses()
│   ├─ Global keyword (all X have Y)  → rules.js: getCreatureKeywords()
│   ├─ Conditional keyword (if X)     → rules.js: getCreatureKeywords()
│   └─ Cost reduction                 → rules.js: hasEnoughMana()
│
├─ TRIGGERED ABILITY (when event happens)
│   ├─ ETB (enters battlefield)       → triggers.js: resolveETB()
│   ├─ Death (when dies)              → triggers.js: onCreatureDeath()
│   ├─ Combat begin                   → triggers.js: onBeginCombat()
│   ├─ Attack declared                → triggers.js: onDeclareAttackers()
│   ├─ End step                       → triggers.js: onEndStep()
│   ├─ Spell cast                     → triggers.js: onSpellCast()
│   └─ Lifegain (future)              → triggers.js: onLifeGain()
│
├─ ACTIVATED ABILITY ({cost}: effect)
│   ├─ Tap for mana                   → Use keyword: tap_for_mana
│   └─ Other activated                → game.js: canActivateAbility() + activateAbility()
│
└─ SPELL EFFECT (instant/sorcery)
    ├─ Needs target                   → game.js: resolveSpellWithTarget()
    ├─ No target                      → game.js: resolveSpell()
    └─ Target validation              → rules.js: hasValidTargets()
```

### Step 3: Implementation by Ability Type

#### 3A. Simple Combat Keywords
Just add to `keywords` array in cards.js. No code needed.

Supported: `flying`, `lifelink`, `deathtouch`, `trample`, `first_strike`, `double_strike`, `vigilance`, `haste`, `reach`, `menace`, `flash`, `ward`, `hexproof`, `indestructible`

#### 3B. ETB Triggers → `triggers.js`

**Prefer keywords for reusable effects:**
```javascript
// In cards.js - add keyword
keywords: ["flying", "etb_draw"]

// In triggers.js - resolveETB() method
if (card.keywords?.includes('etb_draw')) {
    this.rules.drawCard(controller);
    this.ui.log(`${card.name}: ${controller.name} comprou uma carta`);
}
```

**Use card.id only for complex/unique effects:**
```javascript
// Complex ETB with targeting (Bigfin Bouncer)
if (card.id === 'bigfin_bouncer') {
    await this._handleBigfinBouncerETB(card, controller, opponent);
}
```

#### 3C. Death Triggers → `triggers.js`

```javascript
// In triggers.js - onCreatureDeath() method
onCreatureDeath(deadCard, owner) {
    // Check all permanents that care about deaths
    const allPlayers = [this.player, this.opponent];
    allPlayers.forEach(player => {
        player.battlefield.forEach(card => {
            if (card.id === 'vengeful_bloodwitch') {
                // Drain 1 when any creature dies
            }
        });
    });
}
```

#### 3D. Static Effects (Lords, Conditionals) → `rules.js`

```javascript
// In rules.js - calculateBonuses()
if (card.id === 'elvish_archdruid') {
    owner.battlefield.forEach(c => {
        if (c !== card && c.subtype?.includes('Elf')) {
            c.lordBonus = (c.lordBonus || 0) + 1;
        }
    });
}

// In rules.js - getCreatureKeywords() for conditional keywords
if (creature.id === 'kargan_dragonrider') {
    if (controller.battlefield.some(c => c.subtype?.includes('Dragon'))) {
        keywords.push('flying');
    }
}
```

#### 3E. Activated Abilities → `game.js`

```javascript
// In game.js - canActivateAbility()
case 'spectral_sailor':
    const mana = this.rules.calculateAvailableMana(player);
    return mana.U >= 1 && (mana.U + mana.any) >= 4 && !card.tapped;

// In game.js - activateAbility()
case 'spectral_sailor':
    this.payColoredMana({ U: 1 }, player);
    this.payGenericMana(3, player);
    this.rules.drawCard(player);
    this.ui.log(`${card.name}: ${player.name} comprou uma carta`);
    break;
```

#### 3F. Instant/Sorcery Spells → `game.js` + `rules.js`

```javascript
// In rules.js - hasValidTargets() - REQUIRED for instants with targets
case 'moment_of_craving':
    return opponent.battlefield.some(c => c.type === 'creature');

// In game.js - resolveSpellWithTarget() or resolveSpell()
case 'moment_of_craving':
    target.toughnessModifier = (target.toughnessModifier || 0) - 2;
    target.powerModifier = (target.powerModifier || 0) - 2;
    caster.life += 2;
    this.ui.log(`${card.name}: -2/-2 em ${target.name}, ${caster.name} ganhou 2 vidas`);
    break;
```

### Step 4: Verify Implementation

Run through this checklist:

- [ ] **Scryfall verified**: Card data matches official oracle text
- [ ] **cards.js complete**: All required fields present
- [ ] **Keywords correct**: Combat keywords in array, internal keywords if needed
- [ ] **Trigger location**: ETB/death/combat in triggers.js, NOT in game.js
- [ ] **Keyword pattern**: Reusable effects use keywords, not card.id
- [ ] **Target validation**: Instants have `hasValidTargets()` entry if needed
- [ ] **AI support**: AI can use the card (check `ai.js` if special handling needed)
- [ ] **Tests pass**: `npm test` shows all 140+ tests passing

### Step 5: Update Documentation

After implementing, update:
- [ ] `docs/03_CARD_VALIDATION.md` - Add card to deck table with ✓ status
- [ ] `CLAUDE.md` - Add new keywords to Internal Keywords list if created

---

## Adding New Decks - Complete Guide

This guide ensures consistent implementation when adding new decks.

### Workflow Overview

```
1. cards.js     → Define all cards (follow individual card checklist above)
2. triggers.js  → Add ETBs, combat triggers, end-of-turn triggers
3. game.js      → Add activated abilities (if any)
4. rules.js     → Add instant targeting validation (if any)
5. Run tests    → npm test
```

### Step 1: Add Cards to `cards.js`

Add deck to `CARD_DATABASE` following existing patterns:

```javascript
healing: [
    // Terrenos (8)
    { id: "plains", name: "Plains", type: "land", produces: "W", qty: 8 },

    // Criaturas (12)
    { id: "ajani_pridemate", name: "Ajani's Pridemate", type: "creature",
      subtype: "Cat Soldier", cost: "1W", cmc: 2, power: 2, toughness: 2,
      text: "Sempre que você ganhar vida, coloque um contador +1/+1 em Ajani's Pridemate.",
      qty: 1 },

    // Feitiços (4)
    { id: "revitalize", name: "Revitalize", type: "instant", cost: "1W", cmc: 2,
      text: "Ganhe 3 vidas. Compre uma carta.", qty: 1 },
]
```

**Card ID Convention**: `snake_case` matching card name (e.g., `ajani_pridemate`)

### Step 2: Add Triggers to `triggers.js`

**This is the PRIMARY file for new mechanics.** All triggers go here.

#### ETB Effects (enters-the-battlefield)

Add to `resolveETB()` method:

```javascript
// === HEALING DECK TRIGGERS ===

// Inspiring Overseer - ETB draw + gain 1 life
if (card.id === 'inspiring_overseer') {
    this.rules.drawCard(controller);
    controller.life += 1;
    this.ui.log(`${card.name}: ${controller.name} comprou e ganhou 1 vida`);
}
```

**Keyword-based ETBs** (reusable across cards):
```javascript
// etb_gain_life_3 - gain 3 life on ETB
if (card.keywords?.includes('etb_gain_life_3')) {
    controller.life += 3;
    this.ui.log(`${card.name}: ${controller.name} ganhou 3 vidas`);
}
```

#### Lifegain Triggers (Healing deck mechanic)

Create new method for lifegain triggers:

```javascript
/**
 * Called whenever a player gains life
 * @param {Object} player - Player who gained life
 * @param {number} amount - Amount of life gained
 */
onLifeGain(player, amount) {
    player.battlefield.forEach(card => {
        // Ajani's Pridemate - +1/+1 counter when you gain life
        if (card.id === 'ajani_pridemate') {
            if (!card.counters) card.counters = {};
            card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
            this.ui.log(`Ajani's Pridemate ganha um contador +1/+1`);
        }

        // Twinblade Paladin - has double strike if life >= starting
        if (card.id === 'twinblade_paladin') {
            // Check handled in rules.js getCreatureKeywords()
        }
    });
    this.ui.render();
}
```

Then call from game.js wherever life is gained.

#### Combat Triggers

Add to appropriate method in TriggerManager:

| Method | When Called | Example Cards |
|--------|-------------|---------------|
| `onBeginCombat(controller)` | Start of combat | Battle-Rattle Shaman |
| `onDeclareAttackers(attackers, player)` | After attackers declared | Leonin Vanguard |
| `onEndStep(controller)` | End phase | Stromkirk Bloodthief |

#### Fight Mechanic (Primal deck)

Add new method:

```javascript
/**
 * Fight - two creatures deal damage to each other
 * @param {Object} creature1 - First creature
 * @param {Object} creature2 - Second creature
 */
fight(creature1, creature2) {
    const power1 = this.rules.getCreaturePower(creature1);
    const power2 = this.rules.getCreaturePower(creature2);

    creature1.damage = (creature1.damage || 0) + power2;
    creature2.damage = (creature2.damage || 0) + power1;

    this.ui.log(`${creature1.name} e ${creature2.name} lutam!`);

    // Check for deaths
    this.game.checkCreatureDeath(creature1, /* owner */);
    this.game.checkCreatureDeath(creature2, /* owner */);
}
```

### Step 3: Add Activated Abilities to `game.js`

Only for cards with tap/mana activation costs.

In `canActivateAbility(card, player)`:
```javascript
case 'mystic_archaeologist':
    // 3UU: Draw two cards
    const mana = this.rules.calculateAvailableMana(player);
    return mana.U >= 2 && (mana.U + mana.any) >= 5;
```

In `activateAbility(card, player)`:
```javascript
case 'mystic_archaeologist':
    this.payColoredMana({ U: 2 }, player);
    this.payGenericMana(3, player);
    card.tapped = true;
    this.rules.drawCard(player);
    this.rules.drawCard(player);
    this.ui.log(`${card.name}: ${player.name} comprou 2 cartas`);
    break;
```

### Step 4: Update `rules.js` for Instants

In `hasValidTargets(card, player, gameState)`:

```javascript
// Bite Down - requires own creature AND opponent creature (fight)
case 'bite_down':
    return player.battlefield.some(c => c.type === 'creature') &&
           opponent.battlefield.some(c => c.type === 'creature');
```

### Step 5: Run Tests

```bash
npm test
```

All 140 tests must pass before committing.

### Step 6: Check for Architectural Inconsistencies

Before finishing, verify consistency across the codebase:

| Check | Correct Pattern | Wrong Pattern |
|-------|-----------------|---------------|
| ETB location | `triggers.js` → `resolveETB()` | Inline in `game.js` |
| Reusable effects | `keywords: ["etb_cat_token"]` | `if (card.id === 'prideful_parent')` |
| Land ETBs | Call `triggers.resolveETB(card, player)` | Handle directly in `game.js` |
| Combat triggers | `triggers.js` → `onBeginCombat()` | Inline in combat flow |

**Why this matters:**
- **Reutilização**: Keywords permitem que novas cartas usem efeitos existentes sem modificar código
- **Previsibilidade**: Ao ler `cards.js`, deve-se entender o comportamento da carta pelos keywords
- **Manutenção**: Menos lugares para modificar = menos bugs

**Common mistakes to avoid:**
```javascript
// ❌ WRONG - card-specific check for reusable effect
if (card.id === 'prideful_parent') {
    this._createCatToken(controller);
}

// ✅ CORRECT - keyword-based check
if (card.keywords?.includes('etb_cat_token')) {
    this._createCatToken(controller);
}
```

---

### Deck-Specific Implementation Notes

All 10 decks are now fully implemented. Below are key mechanics for each of the 5 newer decks:

#### Healing (W) - Lifegain Triggers ✅
- `onLifeGain(player, amount)` in triggers.js handles lifegain triggers
- Ajani's Pridemate: +1/+1 counter on lifegain (lifegain_counter keyword)
- Twinblade Paladin: conditional double strike when life >= starting life

#### Primal (G) - Fight Mechanic ✅
- Bite Down: One-sided fight (your creature deals damage to target)
- Giant Growth, Snakeskin Veil: Combat tricks with targeting
- Aggressive Mammoth: Gives all creatures trample

#### Inferno (R) - Dragon Synergies ✅
- Dragonlord's Servant: Dragons cost {1} less (dragon_cost_reduction)
- Kargan Dragonrider: Gets flying when you control a Dragon
- Terror of Mount Velus: Double strike dragon finisher

#### Wizards (U) - Draw Triggers & Kicker ✅
- Clinquant Skymage: +1/+1 counter on second draw (draw_counter)
- Mischievous Mystic: Creates Faerie on second draw (second_draw_faerie)
- Into the Roil: Kicker for additional draw
- Essence Scatter: Counterspell creatures only (counterspell_creature)
- Goblin Electromancer: Instants/sorceries cost {1} less (wizard_discount)

#### Undead (B) - Graveyard Recursion ✅
- Gravedigger: Return creature from graveyard to hand (etb_return_creature)
- Rot Hulk: Return Zombie/Skeleton to battlefield (etb_return_zombie_battlefield)
- Death Baron: Lord for Zombies and Skeletons with deathtouch (zombie_skeleton_lord)
- Rise Again: Sorcery to reanimate creatures
- Diregraf Ghoul: Enters tapped (enters_tapped keyword)

---

### Common Patterns Reference

**Create Token:**
```javascript
// Use globalInstanceCounter from cards.js for unique IDs
controller.battlefield.push({
    instanceId: `token_name_${globalInstanceCounter++}`,
    name: 'Token Name',
    type: 'creature',
    subtype: 'Type',
    power: 1,
    toughness: 1,
    summoningSickness: true
});
```

**Add Counter:**
```javascript
if (!card.counters) card.counters = {};
card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
```

**Temporary Buff (until end of turn):**
```javascript
card.powerModifier = (card.powerModifier || 0) + 2;
card.toughnessModifier = (card.toughnessModifier || 0) + 2;
// Cleared automatically in cleanup step
```

**Mark Life Lost (for triggers):**
```javascript
if (opponent === this.player) {
    this.game.playerLostLifeThisTurn = true;
} else {
    this.game.opponentLostLifeThisTurn = true;
}
```

**Player Choice (human vs AI):**
```javascript
if (controller === this.player) {
    // Human: show UI prompt
    const target = await this.ui.promptTriggerTarget({ ... });
} else {
    // AI: automatic choice (usually strongest/weakest)
    const target = validTargets.sort((a, b) =>
        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
    )[0];
}
```

---

## Common Pitfalls and Lessons Learned

This section documents bugs encountered during development and their fixes. Review before implementing new features.

### Critical: Library Array Convention

**The library array uses the END as the top of the deck.**

```javascript
// ✅ CORRECT - drawCard() uses pop() from the END
const card = player.library.pop();  // Draws from top

// ✅ CORRECT - Put card on bottom
player.library.unshift(card);  // Bottom of library

// ✅ CORRECT - Look at top card
const topCard = player.library[player.library.length - 1];

// ❌ WRONG - These assume index 0 is top
player.library.shift();  // This removes from BOTTOM
player.library.push(card);  // This adds to TOP (if trying to put on bottom)
player.library[0];  // This is the BOTTOM card
```

**Bug Example (Opt/Scry):** Scry was putting card on bottom using `push()` but player still drew it because `drawCard()` uses `pop()` - both operated on the same end.

### Counterspell Handling

**Counterspells must be excluded from `needsPlayerTargeting` logic.**

```javascript
// ✅ CORRECT - In game.js playCard()
const isCounterspell = this.isCounterspell(card);
const needsPlayerTargeting = player === this.player && !isCounterspell && (
    ((card.type === 'instant' || card.type === 'sorcery') && this.spellNeedsTarget(card)) ||
    (card.type === 'enchantment' && card.subtype === 'Aura')
);
```

**Bug:** Cancel counterspell stayed in hand after use because `spellNeedsTarget()` returned true, causing the card to not be moved to graveyard.

### Flash Creatures in Priority Windows

**Flash creatures must appear as valid plays during priority windows.**

In `getValidInstantPlays()` in game.js:
```javascript
// Check for flash creatures
player.hand.forEach(card => {
    if (card.type === 'creature' && card.keywords?.includes('flash')) {
        if (this.rules.hasEnoughMana(card, player)) {
            validPlays.push(card);
        }
    }
});
```

**Bug:** Flash creatures like Spectral Sailor didn't appear in priority window because only instants were being checked.

### Combat State Cleanup

**Dead creatures must be filtered from combat arrays after damage resolution.**

```javascript
// In resolveCombatDamage(), after processing damage:
this.currentAttackers = this.currentAttackers.filter(attacker =>
    this.player.battlefield.includes(attacker) ||
    this.opponent.battlefield.includes(attacker)
);
this.ui.selectedAttackers = [];
this.blockerAssignments = {};
this.ui.render();
```

**Bug:** Purple combat rectangles remained on screen because dead creatures were still referenced in `currentAttackers` array.

### Aura Effects Must Be Applied

**Adding an aura keyword isn't enough - effects must be implemented in `applyAuraEffects()`.**

```javascript
// In rules.js - applyAuraEffects()
case 'eaten_by_piranhas':
    // Base creature becomes 0/1
    creature.powerModifier = (creature.powerModifier || 0) - creature.power;
    creature.toughnessModifier = (creature.toughnessModifier || 0) - (creature.toughness - 1);
    // Remove all abilities
    creature.abilitiesRemoved = true;
    break;
```

**Bug:** Eaten by Piranhas was attached but didn't apply its "base 0/1, loses abilities" effect.

### Treasure Token Mana

**Treasure tokens need both the keyword AND proper mana production setup.**

```javascript
// Token definition must include:
{
    instanceId: `treasure_token_${globalInstanceCounter++}`,
    name: 'Treasure Token',
    type: 'artifact',
    subtype: 'Treasure',
    keywords: ['sacrifice_for_mana'],
    produces: 'any',  // Critical for mana calculation
    canSacrificeForMana: true
}
```

**Bug:** Treasure tokens weren't contributing to available mana because `produces: 'any'` was missing.

### Spell Keyword Processing Order

**Generic keywords (scry, draw) should be processed BEFORE card-specific switch.**

```javascript
async resolveSpell(card, caster) {
    // === PROCESS GENERIC KEYWORDS FIRST ===
    if (card.keywords) {
        const scryKeyword = card.keywords.find(k => k.startsWith('scry_'));
        if (scryKeyword) {
            const amount = parseInt(scryKeyword.split('_')[1]) || 1;
            await this.handleScry(caster, amount);
        }
        const drawKeyword = card.keywords.find(k => k.startsWith('draw_'));
        if (drawKeyword) {
            const amount = parseInt(drawKeyword.split('_')[1]) || 1;
            this.handleDraw(caster, amount);
        }
    }

    // === CARD-SPECIFIC EFFECTS (if any beyond keywords) ===
    switch (card.id) {
        // Only for cards that need additional logic beyond keywords
    }
}
```

**Lesson:** Using `scry_1` and `draw_1` keywords instead of card-specific code (`case 'opt':`) makes the code reusable for future cards with similar effects.

### Target Validation for Instants

**Every instant that targets must have a `hasValidTargets()` entry.**

```javascript
// In rules.js - hasValidTargets()
hasValidTargets(card, player, gameState) {
    const opponent = player === gameState.player ? gameState.opponent : gameState.player;

    switch (card.id) {
        // Buff spells - need own creatures
        case 'moment_of_triumph':
        case 'snakeskin_veil':
            return player.battlefield.some(c => c.type === 'creature');

        // Removal - need opponent creatures
        case 'moment_of_craving':
        case 'heros_downfall':
            return opponent.battlefield.some(c => c.type === 'creature');

        // Conditional targeting
        case 'volley':
            return opponent.battlefield.some(c =>
                c.type === 'creature' &&
                this.getCreatureKeywords(c, opponent).includes('flying')
            );

        default:
            return true;
    }
}
```

**Bug:** Priority windows appeared when player had no valid targets, wasting time and confusing players.

### Death Trigger Duplication

**Avoid triggering death effects multiple times for the same death.**

```javascript
// Track processed deaths
if (deadCard._deathProcessed) return;
deadCard._deathProcessed = true;

// Process death triggers...
```

**Bug:** Vengeful Bloodwitch triggered twice when a creature died - once from the death check and once from cleanup.

### Async/Await in Spell Resolution

**Spells with UI prompts (scry, targeting) must use async/await.**

```javascript
// Function must be async
async resolveSpell(card, caster) {
    // Scry requires user input
    await this.handleScry(caster, 1);
    // Continue after user makes choice
    this.handleDraw(caster, 1);
}

// Callers must await
await this.resolveSpell(card, caster);
```

**Bug:** Card was drawn before scry completed because `handleScry()` wasn't awaited.

---

## Quick Reference: File Responsibilities

| File | What Goes Here | What Does NOT Go Here |
|------|----------------|----------------------|
| `cards.js` | Card definitions, keywords | Game logic, triggers |
| `triggers.js` | ETBs, death triggers, combat triggers, end-step triggers | Spell resolution, combat damage |
| `game.js` | Game flow, spell resolution, activated abilities, combat flow | Static effects, mana calculation |
| `rules.js` | Mana calculation, damage calculation, keyword checks, lord bonuses, hasValidTargets | Triggers, game state changes |
| `ai.js` | AI decisions for playing cards, attacking, blocking | Rule enforcement |
| `ui.js` | DOM rendering, event handlers, modals, prompts | Game logic |

---

## Testing Checklist

Before committing any card/deck changes:

```bash
# 1. Run all unit tests
npm test

# 2. Validate cards against Scryfall (if adding new cards)
node tools/validate-cards.js

# 3. Check for cards without tests
node tools/validate-cards.js --missing

# 4. Manual testing - minimum scenarios:
#    - Play the card normally
#    - Let AI play the card
#    - Test all targeting scenarios
#    - Test with stack interactions (if instant)
#    - Test cleanup at end of turn (if temporary effects)
```

---

## Debug Commands Reference

Open browser console (F12) during a game:

```javascript
// Quick setup for testing
debug.setupCombat()           // Creates combat scenario
debug.fullMana()              // Gives 10 of each mana
debug.addToBattlefield("Card Name")  // Add creature to your field

// Card management
debug.draw("Card")            // Draw specific card from your deck
debug.drawAny("Card")         // Draw from any deck
debug.addToHand("Card", "opponent")  // Add to opponent's hand

// Game state
debug.state()                 // Full game state
debug.battlefield("both")     // All creatures
debug.setLife(5, "opponent")  // Set opponent to 5 life
debug.setPhase("MAIN1")       // Jump to phase

// Helpers
debug.help()                  // List all commands
debug.listCards("pirates")    // List cards in deck
```