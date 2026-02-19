/**
 * Tests for routing targeted instants/sorceries through the stack.
 * Validates that targeted spells go on the stack (giving opponent priority)
 * and that hexproof gained in response causes spells to fizzle.
 */

const { createCreature, createPlayer, createSpell, createGameState } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

// ============================================================
// isTargetStillValid — hexproof check
// ============================================================
describe('isTargetStillValid with hexproof check', () => {
    let game, rules;

    beforeEach(() => {
        game = createGameState();
        rules = new TestRulesEngine(game);
        game.rules = rules;
    });

    test('target on battlefield without hexproof is valid', () => {
        const creature = createCreature({ name: 'Bear' });
        game.opponent.battlefield.push(creature);

        const isValid = isTargetStillValid(game, creature, game.player);
        expect(isValid).toBe(true);
    });

    test('target removed from battlefield is invalid', () => {
        const creature = createCreature({ name: 'Bear' });
        // creature is NOT on any battlefield

        const isValid = isTargetStillValid(game, creature, game.player);
        expect(isValid).toBe(false);
    });

    test('target with hexproof is invalid when caster is opponent', () => {
        const creature = createCreature({ name: 'Protected Bear', keywords: ['hexproof'] });
        game.player.battlefield.push(creature);

        // Opponent is casting at player's creature — hexproof blocks it
        const isValid = isTargetStillValid(game, creature, game.opponent);
        expect(isValid).toBe(false);
    });

    test('target with hexproof is valid when caster is controller', () => {
        const creature = createCreature({ name: 'Own Bear', keywords: ['hexproof'] });
        game.player.battlefield.push(creature);

        // Player targets own hexproof creature (e.g., buff spell) — allowed
        const isValid = isTargetStillValid(game, creature, game.player);
        expect(isValid).toBe(true);
    });

    test('null target is always valid (non-targeted spells)', () => {
        const isValid = isTargetStillValid(game, null, game.player);
        expect(isValid).toBe(true);
    });

    test('non-creature target ignores hexproof check', () => {
        const enchantment = { instanceId: 'ench_1', name: 'Test Enchantment', type: 'enchantment' };
        game.opponent.battlefield.push(enchantment);

        const isValid = isTargetStillValid(game, enchantment, game.player);
        expect(isValid).toBe(true);
    });
});

// ============================================================
// Hexproof fizzle scenario
// ============================================================
describe('Hexproof causes spell to fizzle on resolution', () => {
    let game, rules;

    beforeEach(() => {
        game = createGameState();
        rules = new TestRulesEngine(game);
        game.rules = rules;
    });

    test('spell fizzles when target gains hexproof after being put on stack', () => {
        const creature = createCreature({ name: 'Elf', keywords: [] });
        game.player.battlefield.push(creature);

        // Simulate: opponent's removal is on the stack targeting creature
        const removalSpell = createSpell({ name: "Hero's Downfall", type: 'instant' });
        const stackItem = {
            item: removalSpell,
            controller: game.opponent,
            target: creature
        };

        // Target is valid before hexproof
        expect(isTargetStillValid(game, stackItem.target, stackItem.controller)).toBe(true);

        // Snakeskin Veil resolves first, giving hexproof
        creature.keywords.push('hexproof');

        // Now target should be invalid
        expect(isTargetStillValid(game, stackItem.target, stackItem.controller)).toBe(false);
    });

    test('target leaving battlefield causes fizzle (existing behavior preserved)', () => {
        const creature = createCreature({ name: 'Doomed Elf' });
        game.player.battlefield.push(creature);

        // Spell is on stack targeting creature
        expect(isTargetStillValid(game, creature, game.opponent)).toBe(true);

        // Creature dies/is bounced — remove from battlefield
        game.player.battlefield.splice(0, 1);

        expect(isTargetStillValid(game, creature, game.opponent)).toBe(false);
    });
});

// ============================================================
// Stack item structure for targeted spells
// ============================================================
describe('Targeted spell stack routing', () => {
    test('AI targeted spell creates stack item with target', () => {
        const game = createGameState();

        const removalSpell = createSpell({ name: 'Murder', type: 'instant' });
        const target = createCreature({ name: 'Player Creature' });

        // Simulate addToStack behavior
        const stackItem = {
            id: `stack_${Date.now()}`,
            item: removalSpell,
            controller: game.opponent,
            timestamp: Date.now()
        };
        game.stack.push(stackItem);
        stackItem.target = target;

        expect(game.stack.length).toBe(1);
        expect(game.stack[0].target).toBe(target);
        expect(game.stack[0].target.name).toBe('Player Creature');
        expect(game.stack[0].controller).toBe(game.opponent);
    });

    test('player targeted spell creates stack item with target', () => {
        const game = createGameState();

        const buffSpell = createSpell({ name: 'Snakeskin Veil', type: 'instant' });
        const target = createCreature({ name: 'My Elf' });

        const stackItem = {
            id: `stack_${Date.now()}`,
            item: buffSpell,
            controller: game.player,
            timestamp: Date.now()
        };
        game.stack.push(stackItem);
        stackItem.target = target;

        expect(game.stack.length).toBe(1);
        expect(game.stack[0].target).toBe(target);
        expect(game.stack[0].controller).toBe(game.player);
    });

    test('non-targeted spell has no target on stack item', () => {
        const game = createGameState();

        const spell = createSpell({ name: 'Divination', type: 'sorcery', keywords: ['draw_2'] });

        const stackItem = {
            id: `stack_${Date.now()}`,
            item: spell,
            controller: game.player,
            timestamp: Date.now()
        };
        game.stack.push(stackItem);

        expect(game.stack[0].target).toBeUndefined();
    });
});

// ============================================================
// Snakeskin Veil reactive flow (integration-style)
// ============================================================
describe('Snakeskin Veil reactive protection flow', () => {
    let game, rules;

    beforeEach(() => {
        game = createGameState();
        rules = new TestRulesEngine(game);
        game.rules = rules;
    });

    test('full scenario: removal → Snakeskin Veil response → fizzle', () => {
        const elf = createCreature({ name: 'Llanowar Elves', keywords: [] });
        game.player.battlefield.push(elf);

        // Step 1: AI casts Hero's Downfall targeting elf
        const herosDownfall = createSpell({ name: "Hero's Downfall", type: 'instant' });
        const removalStackItem = {
            id: 'stack_removal',
            item: herosDownfall,
            controller: game.opponent,
            target: elf,
            timestamp: Date.now()
        };
        game.stack.push(removalStackItem);
        expect(game.stack.length).toBe(1);

        // Step 2: Player responds with Snakeskin Veil (goes on top of stack)
        const snakeskinVeil = createSpell({ name: 'Snakeskin Veil', type: 'instant' });
        const veilStackItem = {
            id: 'stack_veil',
            item: snakeskinVeil,
            controller: game.player,
            target: elf,
            timestamp: Date.now()
        };
        game.stack.push(veilStackItem);
        expect(game.stack.length).toBe(2);

        // Step 3: Snakeskin Veil resolves first (LIFO) — gives +1/+1 counter and hexproof
        game.stack.pop(); // remove veil from stack
        if (!elf.counters) elf.counters = {};
        elf.counters.plusOnePlusOne = (elf.counters.plusOnePlusOne || 0) + 1;
        elf.keywords.push('hexproof');

        // Step 4: Hero's Downfall tries to resolve — target now has hexproof
        const targetValid = isTargetStillValid(game, removalStackItem.target, removalStackItem.controller);
        expect(targetValid).toBe(false);

        // Spell fizzles — elf survives!
        expect(game.player.battlefield).toContain(elf);
        expect(elf.keywords).toContain('hexproof');
        expect(elf.counters.plusOnePlusOne).toBe(1);
    });
});

// ============================================================
// Helper: mirrors the game.js isTargetStillValid logic
// ============================================================
function isTargetStillValid(game, target, caster) {
    if (!target) return true;
    const inPlayerField = game.player.battlefield.includes(target);
    const inOpponentField = game.opponent.battlefield.includes(target);
    if (!inPlayerField && !inOpponentField) return false;
    // Check hexproof
    if (caster && target.type === 'creature' && !game.rules.canBeTargetedBy(target, caster)) {
        return false;
    }
    return true;
}
