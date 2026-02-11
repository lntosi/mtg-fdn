# Common Pitfalls and Lessons Learned

This section documents bugs encountered during development and their fixes. Review before implementing new features.

## Critical: Library Array Convention

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

## Counterspell Handling

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

## Flash Creatures in Priority Windows

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

## Combat State Cleanup

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

## Aura Effects Must Be Applied

**Adding an aura keyword isn't enough - effects must be implemented in `applyAuraEffects()`.**

```javascript
// In rules.js - applyAuraEffects()
case 'eaten_by_piranhas':
    // Base creature becomes 0/1
    creature.powerModifier = (creature.powerModifier || 0) - creature.power;
    creature.toughnessModifier = (creature.toughnessModifier || 0) - (creature.toughness - 1);
    creature.abilitiesRemoved = true;
    break;
```

**Bug:** Eaten by Piranhas was attached but didn't apply its "base 0/1, loses abilities" effect.

## Treasure Token Mana

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
    canSacrificeForMana: true,
    isToken: true
}
```

**Bug:** Treasure tokens weren't contributing to available mana because `produces: 'any'` was missing.

## Spell Keyword Processing Order

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
    }
    // === CARD-SPECIFIC EFFECTS (if any beyond keywords) ===
    switch (card.id) { ... }
}
```

**Lesson:** Using `scry_1` and `draw_1` keywords instead of card-specific code makes the code reusable.

## Target Validation for Instants

**Every instant that targets must have a `hasValidTargets()` entry.**

**Bug:** Priority windows appeared when player had no valid targets, wasting time and confusing players.

## Death Trigger Duplication

**Avoid triggering death effects multiple times for the same death.**

```javascript
if (deadCard._deathProcessed) return;
deadCard._deathProcessed = true;
```

**Bug:** Vengeful Bloodwitch triggered twice when a creature died.

## Async/Await in Spell Resolution

**Spells with UI prompts (scry, targeting) must use async/await.**

**Bug:** Card was drawn before scry completed because `handleScry()` wasn't awaited.

## Button Cloning and Function References

**Clone buttons BEFORE defining functions that reference them.**

```javascript
// ✅ CORRECT - Clone first, then define function
const oldBtn = document.getElementById('btn-confirm');
const btnConfirm = oldBtn.cloneNode(true);
oldBtn.parentNode.replaceChild(btnConfirm, oldBtn);
const updateUI = () => {
    btnConfirm.disabled = remainingCounters > 0;  // References correct element
};
```

**Bug:** Biogenic Upgrade modal's confirm button never enabled because `updateUI()` was updating the old (cloned-out) button element.

## Counter Triggers: "One or More" Mechanic

**Cards like Wildwood Scourge trigger once per EVENT, not per counter.**

Biogenic Upgrade creates TWO events per creature (initial placement + doubling). Both call `onCounterPlaced()`.

**Bug:** Wildwood Scourge only gained 3 counters from Biogenic Upgrade instead of 6, because doubling wasn't calling `onCounterPlaced()`.
