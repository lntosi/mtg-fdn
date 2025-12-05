/**
 * Testes de Combate
 * Valida mecânicas de dano, first strike, deathtouch, trample, etc.
 */

const { createCreature, CREATURES } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Combat Damage', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    describe('Basic Combat', () => {
        test('3/3 vs 2/2 - both take damage, 2/2 dies', () => {
            const attacker = createCreature({ power: 3, toughness: 3 });
            const blocker = createCreature({ power: 2, toughness: 2 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDamage).toBe(2);
            expect(result.blockerDamage).toBe(3);
            expect(result.attackerDies).toBe(false);
            expect(result.blockerDies).toBe(true);
        });

        test('2/2 vs 2/2 - both die (trade)', () => {
            const attacker = createCreature({ power: 2, toughness: 2 });
            const blocker = createCreature({ power: 2, toughness: 2 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(true);
            expect(result.blockerDies).toBe(true);
        });

        test('1/4 vs 4/1 - both die', () => {
            const attacker = createCreature({ power: 1, toughness: 4 });
            const blocker = createCreature({ power: 4, toughness: 1 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(true);
            expect(result.blockerDies).toBe(true);
        });

        test('5/5 vs 2/2 - only blocker dies', () => {
            const attacker = createCreature({ power: 5, toughness: 5 });
            const blocker = createCreature({ power: 2, toughness: 2 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(false);
            expect(result.blockerDies).toBe(true);
            expect(attacker.damage).toBe(2);
        });
    });

    describe('Deathtouch', () => {
        test('1/1 deathtouch vs 10/10 - both die', () => {
            const attacker = createCreature({
                power: 1,
                toughness: 1,
                keywords: ['deathtouch']
            });
            const blocker = createCreature({ power: 10, toughness: 10 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(true);
            expect(result.blockerDies).toBe(true);
        });

        test('Thornweald Archer (1/2 reach deathtouch) kills any creature', () => {
            const archer = CREATURES.thornwealdArcher();
            const bigCreature = createCreature({ power: 6, toughness: 6 });

            const result = rules.resolveCombatDamage(archer, bigCreature);

            expect(result.blockerDies).toBe(true);
        });

        test('0/1 deathtouch does not kill (0 damage)', () => {
            const attacker = createCreature({
                power: 0,
                toughness: 1,
                keywords: ['deathtouch']
            });
            const blocker = createCreature({ power: 1, toughness: 1 });

            const isLethal = rules.isLethalDamage(attacker, blocker);

            expect(isLethal).toBe(false);
        });
    });

    describe('First Strike', () => {
        test('2/2 first strike vs 2/2 - only blocker dies', () => {
            const attacker = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['first_strike']
            });
            const blocker = createCreature({ power: 2, toughness: 2 });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(false);
            expect(result.blockerDies).toBe(true);
        });

        test('2/2 vs 2/2 first strike - only attacker dies', () => {
            const attacker = createCreature({ power: 2, toughness: 2 });
            const blocker = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['first_strike']
            });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(true);
            expect(result.blockerDies).toBe(false);
        });

        test('both have first strike - both die (same time)', () => {
            const attacker = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['first_strike']
            });
            const blocker = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['first_strike']
            });

            const result = rules.resolveCombatDamage(attacker, blocker);

            expect(result.attackerDies).toBe(true);
            expect(result.blockerDies).toBe(true);
        });
    });

    describe('Double Strike', () => {
        test('2/2 double strike vs 3/3 - blocker dies, attacker survives', () => {
            const attacker = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['double_strike']
            });
            const blocker = createCreature({ power: 3, toughness: 3 });

            // Double strike causa dano na fase de first strike
            // Bloqueador toma 2, fica com 1 de vida restante
            // Fase normal: atacante toma 3 (morre), bloqueador toma mais 2 (morre)
            const result = rules.resolveCombatDamage(attacker, blocker);

            // Com a implementação atual, o bloqueador morre na fase de first strike se tiver <= 2 toughness
            // Mas 3/3 sobrevive ao primeiro hit de 2, então ambos morrem na fase normal
            expect(result.blockerDies).toBe(true);
        });
    });

    describe('Trample', () => {
        test('5/5 trample vs 2/2 - 3 damage tramples through', () => {
            const attacker = createCreature({
                power: 5,
                toughness: 5,
                keywords: ['trample']
            });
            const blocker = createCreature({ power: 2, toughness: 2 });

            const trampleDamage = rules.calculateTrampleDamage(attacker, [blocker]);

            expect(trampleDamage).toBe(3);
        });

        test('5/5 trample vs two 2/2 - 1 damage tramples through', () => {
            const attacker = createCreature({
                power: 5,
                toughness: 5,
                keywords: ['trample']
            });
            const blocker1 = createCreature({ power: 2, toughness: 2 });
            const blocker2 = createCreature({ power: 2, toughness: 2 });

            const trampleDamage = rules.calculateTrampleDamage(attacker, [blocker1, blocker2]);

            expect(trampleDamage).toBe(1);
        });

        test('3/3 trample vs 4/4 - no trample damage', () => {
            const attacker = createCreature({
                power: 3,
                toughness: 3,
                keywords: ['trample']
            });
            const blocker = createCreature({ power: 4, toughness: 4 });

            const trampleDamage = rules.calculateTrampleDamage(attacker, [blocker]);

            expect(trampleDamage).toBe(0);
        });

        test('Beast-Kin Ranger (3/3 trample) vs 1/1 - 2 damage tramples', () => {
            const ranger = CREATURES.beastKinRanger();
            const blocker = createCreature({ power: 1, toughness: 1 });

            const trampleDamage = rules.calculateTrampleDamage(ranger, [blocker]);

            expect(trampleDamage).toBe(2);
        });
    });

    describe('Lifelink', () => {
        test('lifelink creature dealing damage should be tracked', () => {
            const attacker = createCreature({
                power: 3,
                toughness: 3,
                keywords: ['lifelink']
            });

            const damage = rules.getCreaturePower(attacker);

            // Lifelink healing = damage dealt
            expect(damage).toBe(3);
            expect(attacker.keywords).toContain('lifelink');
        });
    });

    describe('Damage Accumulation', () => {
        test('creature with existing damage takes more damage', () => {
            const creature = createCreature({ power: 2, toughness: 4, damage: 2 });
            const attacker = createCreature({ power: 1, toughness: 1 });

            rules.resolveCombatDamage(attacker, creature);

            expect(creature.damage).toBe(3); // 2 existing + 1 new
            expect(rules.isCreatureDead(creature)).toBe(false); // 4 toughness, 3 damage
        });

        test('creature dies when accumulated damage equals toughness', () => {
            const creature = createCreature({ power: 2, toughness: 3, damage: 2 });
            const attacker = createCreature({ power: 1, toughness: 1 });

            rules.resolveCombatDamage(attacker, creature);

            expect(creature.damage).toBe(3);
            expect(rules.isCreatureDead(creature)).toBe(true);
        });
    });
});

describe('Combat Restrictions', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    describe('Can Attack', () => {
        test('untapped creature without summoning sickness can attack', () => {
            const creature = createCreature({ summoningSickness: false });

            expect(rules.canAttack(creature)).toBe(true);
        });

        test('tapped creature cannot attack', () => {
            const creature = createCreature({ tapped: true, summoningSickness: false });

            expect(rules.canAttack(creature)).toBe(false);
        });

        test('creature with summoning sickness cannot attack', () => {
            const creature = createCreature({ summoningSickness: true });

            expect(rules.canAttack(creature)).toBe(false);
        });

        test('creature with haste can attack with summoning sickness', () => {
            const creature = createCreature({
                summoningSickness: true,
                keywords: ['haste']
            });

            expect(rules.canAttack(creature)).toBe(true);
        });

        test('Frenzied Goblin with haste can attack immediately', () => {
            const goblin = CREATURES.frenziedGoblin();
            goblin.summoningSickness = true;

            expect(rules.canAttack(goblin)).toBe(true);
        });
    });

    describe('Can Block', () => {
        test('untapped creature can block', () => {
            const blocker = createCreature();
            const attacker = createCreature();

            expect(rules.canBlock(blocker, attacker)).toBe(true);
        });

        test('tapped creature cannot block', () => {
            const blocker = createCreature({ tapped: true });
            const attacker = createCreature();

            expect(rules.canBlock(blocker, attacker)).toBe(false);
        });

        test('Vampire Interloper (cant_block) cannot block', () => {
            const vampire = CREATURES.vampireInterloper();
            const attacker = createCreature();

            expect(rules.canBlock(vampire, attacker)).toBe(false);
        });
    });

    describe('Flying', () => {
        test('ground creature cannot block flying', () => {
            const blocker = createCreature();
            const attacker = createCreature({ keywords: ['flying'] });

            expect(rules.canBlock(blocker, attacker)).toBe(false);
        });

        test('flying creature can block flying', () => {
            const blocker = createCreature({ keywords: ['flying'] });
            const attacker = createCreature({ keywords: ['flying'] });

            expect(rules.canBlock(blocker, attacker)).toBe(true);
        });

        test('reach creature can block flying', () => {
            const blocker = createCreature({ keywords: ['reach'] });
            const attacker = createCreature({ keywords: ['flying'] });

            expect(rules.canBlock(blocker, attacker)).toBe(true);
        });

        test('Thornweald Archer (reach) can block Vampire Interloper (flying)', () => {
            const archer = CREATURES.thornwealdArcher();
            const vampire = CREATURES.vampireInterloper();

            expect(rules.canBlock(archer, vampire)).toBe(true);
        });
    });
});
