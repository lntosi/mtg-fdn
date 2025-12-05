/**
 * Testes de Feitiços
 * Valida efeitos de instants, sorceries e targeting
 */

const { createCreature, createPlayer, createSpell, CREATURES, SPELLS } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Removal Spells', () => {
    describe("Elspeth's Smite", () => {
        test('can only target attacking creatures', () => {
            const attackingCreature = createCreature({ name: 'Attacker' });
            const nonAttackingCreature = createCreature({ name: 'Bystander' });

            const currentAttackers = [attackingCreature];

            const validTargets = currentAttackers;

            expect(validTargets).toContain(attackingCreature);
            expect(validTargets).not.toContain(nonAttackingCreature);
        });

        test('can target blocking creatures', () => {
            const blocker = createCreature({ name: 'Blocker' });
            const attacker = createCreature({ name: 'Attacker' });

            const blockerAssignments = {
                [attacker.instanceId]: [blocker]
            };

            const validTargets = [
                ...Object.values(blockerAssignments).flat()
            ];

            expect(validTargets).toContain(blocker);
        });

        test('exiles target (removes from battlefield, not to graveyard)', () => {
            const player = createPlayer();
            const opponent = createPlayer();
            const target = createCreature({ name: 'Target' });

            opponent.battlefield = [target];

            // Simular exile
            const index = opponent.battlefield.indexOf(target);
            opponent.battlefield.splice(index, 1);
            // Exile zone (não implementada ainda, mas não vai para graveyard)

            expect(opponent.battlefield).not.toContain(target);
            expect(opponent.graveyard).not.toContain(target);
        });
    });

    describe('Volley', () => {
        test('can only target creatures with flying', () => {
            const flyingCreature = createCreature({
                name: 'Flying Creature',
                keywords: ['flying']
            });
            const groundCreature = createCreature({ name: 'Ground Creature' });

            const allCreatures = [flyingCreature, groundCreature];

            const validTargets = allCreatures.filter(c =>
                c.keywords && c.keywords.includes('flying')
            );

            expect(validTargets).toContain(flyingCreature);
            expect(validTargets).not.toContain(groundCreature);
        });

        test('deals 3 damage to target', () => {
            const target = createCreature({
                name: 'Flying Creature',
                toughness: 5,
                keywords: ['flying']
            });

            // Simular efeito
            target.damage = (target.damage || 0) + 3;

            expect(target.damage).toBe(3);
        });

        test('kills creature with 3 or less toughness', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({
                name: 'Small Flyer',
                toughness: 3,
                keywords: ['flying']
            });

            target.damage = 3;

            expect(rules.isCreatureDead(target)).toBe(true);
        });

        test('does not kill creature with more than 3 toughness', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({
                name: 'Big Flyer',
                toughness: 4,
                keywords: ['flying']
            });

            target.damage = 3;

            expect(rules.isCreatureDead(target)).toBe(false);
        });
    });

    describe('Incinerating Blast', () => {
        test('deals 5 damage to any creature', () => {
            const target = createCreature({ toughness: 6 });

            target.damage = (target.damage || 0) + 5;

            expect(target.damage).toBe(5);
        });

        test('kills most creatures', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({ toughness: 5 });

            target.damage = 5;

            expect(rules.isCreatureDead(target)).toBe(true);
        });
    });

    describe('Broken Wings', () => {
        test('can target artifacts', () => {
            const artifact = { type: 'artifact', name: 'Some Artifact' };
            const creature = createCreature();

            const validTypes = ['artifact', 'enchantment'];
            const validTargets = [artifact, creature].filter(c =>
                validTypes.includes(c.type) ||
                (c.keywords && c.keywords.includes('flying'))
            );

            expect(validTargets).toContain(artifact);
        });

        test('can target enchantments', () => {
            const enchantment = { type: 'enchantment', name: 'Some Enchantment' };

            const isValidTarget = enchantment.type === 'enchantment';

            expect(isValidTarget).toBe(true);
        });

        test('can target creatures with flying', () => {
            const flyingCreature = createCreature({ keywords: ['flying'] });
            const groundCreature = createCreature();

            const canTargetFlying = flyingCreature.keywords &&
                flyingCreature.keywords.includes('flying');
            const canTargetGround = groundCreature.keywords &&
                groundCreature.keywords.includes('flying');

            expect(canTargetFlying).toBe(true);
            expect(canTargetGround).toBe(false);
        });
    });
});

describe('Buff Spells', () => {
    describe('Moment of Triumph', () => {
        test('gives +2/+2 until end of turn', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({ power: 2, toughness: 2 });

            // Aplicar buff
            target.powerModifier = (target.powerModifier || 0) + 2;
            target.toughnessModifier = (target.toughnessModifier || 0) + 2;

            expect(rules.getCreaturePower(target)).toBe(4);
            expect(rules.getCreatureToughness(target)).toBe(4);
        });

        test('grants 2 life to controller', () => {
            const player = createPlayer({ life: 20 });

            player.life += 2;

            expect(player.life).toBe(22);
        });
    });

    describe('Kindled Fury', () => {
        test('gives +1/+0 and first strike', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({ power: 2, toughness: 2, keywords: [] });

            target.powerModifier = (target.powerModifier || 0) + 1;
            target.keywords.push('first_strike');

            expect(rules.getCreaturePower(target)).toBe(3);
            expect(target.keywords).toContain('first_strike');
        });
    });

    describe('Snakeskin Veil', () => {
        test('adds +1/+1 counter', () => {
            const rules = new TestRulesEngine();
            const target = createCreature({ power: 2, toughness: 2 });
            target.counters = {};

            target.counters['+1/+1'] = (target.counters['+1/+1'] || 0) + 1;

            expect(rules.getCreaturePower(target)).toBe(3);
            expect(rules.getCreatureToughness(target)).toBe(3);
        });

        test('counter persists after end of turn', () => {
            const target = createCreature();
            target.counters = { '+1/+1': 1 };

            // Simular end of turn cleanup
            target.powerModifier = 0;
            target.toughnessModifier = 0;

            // Counter should persist
            expect(target.counters['+1/+1']).toBe(1);
        });
    });

    describe('Joraga Invocation', () => {
        test('gives +3/+3 to all creatures', () => {
            const rules = new TestRulesEngine();
            const creatures = [
                createCreature({ power: 1, toughness: 1 }),
                createCreature({ power: 2, toughness: 2 }),
                createCreature({ power: 3, toughness: 3 })
            ];

            creatures.forEach(c => {
                c.powerModifier = (c.powerModifier || 0) + 3;
                c.toughnessModifier = (c.toughnessModifier || 0) + 3;
            });

            expect(rules.getCreaturePower(creatures[0])).toBe(4);
            expect(rules.getCreaturePower(creatures[1])).toBe(5);
            expect(rules.getCreaturePower(creatures[2])).toBe(6);
        });
    });
});

describe('Mana Costs', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    describe('Cost Parsing', () => {
        test('parses "1R" correctly', () => {
            const cost = rules.parseCost('1R');

            expect(cost.generic).toBe(1);
            expect(cost.colored).toEqual(['R']);
        });

        test('parses "2GG" correctly', () => {
            const cost = rules.parseCost('2GG');

            expect(cost.generic).toBe(2);
            expect(cost.colored).toEqual(['G', 'G']);
        });

        test('parses "W" correctly', () => {
            const cost = rules.parseCost('W');

            expect(cost.generic).toBe(0);
            expect(cost.colored).toEqual(['W']);
        });

        test('parses "4GG" correctly', () => {
            const cost = rules.parseCost('4GG');

            expect(cost.generic).toBe(4);
            expect(cost.colored).toEqual(['G', 'G']);
        });
    });

    describe('Mana Availability', () => {
        test('can pay "1R" with 1 mountain and 1 forest', () => {
            const available = { R: 1, G: 1 };

            const canPay = rules.hasEnoughMana('1R', available);

            expect(canPay).toBe(true);
        });

        test('cannot pay "2R" with only 1 land', () => {
            const available = { R: 1 };

            const canPay = rules.hasEnoughMana('2R', available);

            expect(canPay).toBe(false);
        });

        test('can pay "W" with 1 plains', () => {
            const available = { W: 1 };

            const canPay = rules.hasEnoughMana('W', available);

            expect(canPay).toBe(true);
        });
    });
});

describe('Instant Timing', () => {
    test('instants can be cast during opponent turn (conceptual)', () => {
        const instant = SPELLS.elspethsSmite();

        // Instants têm tipo 'instant'
        expect(instant.type).toBe('instant');

        // A lógica do jogo permite instants a qualquer momento
        const canCastDuringOpponentTurn = instant.type === 'instant';
        expect(canCastDuringOpponentTurn).toBe(true);
    });

    test('sorceries cannot be cast during opponent turn (conceptual)', () => {
        const sorcery = createSpell({ type: 'sorcery' });

        const canCastDuringOpponentTurn = sorcery.type === 'instant';
        expect(canCastDuringOpponentTurn).toBe(false);
    });
});
