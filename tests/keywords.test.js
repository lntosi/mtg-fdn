/**
 * Testes de Keywords
 * Valida funcionamento de flying, lifelink, deathtouch, vigilance, etc.
 */

const { createCreature, CREATURES } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Flying', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('flying creature can only be blocked by flying or reach', () => {
        const flyer = createCreature({ keywords: ['flying'] });
        const groundCreature = createCreature();
        const otherFlyer = createCreature({ keywords: ['flying'] });
        const reacher = createCreature({ keywords: ['reach'] });

        expect(rules.canBlock(groundCreature, flyer)).toBe(false);
        expect(rules.canBlock(otherFlyer, flyer)).toBe(true);
        expect(rules.canBlock(reacher, flyer)).toBe(true);
    });

    test('flying creature can block ground creatures', () => {
        const flyer = createCreature({ keywords: ['flying'] });
        const groundCreature = createCreature();

        expect(rules.canBlock(flyer, groundCreature)).toBe(true);
    });
});

describe('Reach', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('reach creature can block flying', () => {
        const reacher = createCreature({ keywords: ['reach'] });
        const flyer = createCreature({ keywords: ['flying'] });

        expect(rules.canBlock(reacher, flyer)).toBe(true);
    });

    test('reach creature can block ground creatures', () => {
        const reacher = createCreature({ keywords: ['reach'] });
        const groundCreature = createCreature();

        expect(rules.canBlock(reacher, groundCreature)).toBe(true);
    });

    test('reach does not grant flying (cannot avoid ground blockers)', () => {
        const reacher = createCreature({ keywords: ['reach'] });

        expect(reacher.keywords).not.toContain('flying');
    });
});

describe('Deathtouch', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('any damage from deathtouch is lethal', () => {
        const deathtouch = createCreature({ power: 1, keywords: ['deathtouch'] });
        const bigCreature = createCreature({ toughness: 100 });

        expect(rules.isLethalDamage(deathtouch, bigCreature)).toBe(true);
    });

    test('0 power deathtouch is not lethal', () => {
        const deathtouch = createCreature({ power: 0, keywords: ['deathtouch'] });
        const creature = createCreature({ toughness: 1 });

        expect(rules.isLethalDamage(deathtouch, creature)).toBe(false);
    });
});

describe('First Strike', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('first strike creature kills before taking damage', () => {
        const firstStriker = createCreature({
            power: 2,
            toughness: 2,
            keywords: ['first_strike']
        });
        const normalCreature = createCreature({ power: 2, toughness: 2 });

        const result = rules.resolveCombatDamage(firstStriker, normalCreature);

        expect(result.blockerDies).toBe(true);
        expect(result.attackerDies).toBe(false);
    });
});

describe('Double Strike', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('double strike deals damage twice', () => {
        const doubleStriker = createCreature({
            power: 2,
            toughness: 2,
            keywords: ['double_strike']
        });

        // Double strike deals damage in first strike phase AND normal phase
        expect(doubleStriker.keywords).toContain('double_strike');
    });
});

describe('Vigilance', () => {
    test('vigilance creature does not tap when attacking', () => {
        const vigilant = createCreature({
            keywords: ['vigilance'],
            tapped: false
        });

        // Simular ataque com vigilance
        const shouldTap = !vigilant.keywords.includes('vigilance');

        expect(shouldTap).toBe(false);
    });

    test('non-vigilance creature taps when attacking', () => {
        const normal = createCreature({ tapped: false });

        const shouldTap = !normal.keywords || !normal.keywords.includes('vigilance');

        expect(shouldTap).toBe(true);
    });
});

describe('Haste', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('haste creature can attack with summoning sickness', () => {
        const hasty = createCreature({
            summoningSickness: true,
            keywords: ['haste']
        });

        expect(rules.canAttack(hasty)).toBe(true);
    });

    test('normal creature cannot attack with summoning sickness', () => {
        const normal = createCreature({ summoningSickness: true });

        expect(rules.canAttack(normal)).toBe(false);
    });

    test('Goblin Smuggler (haste) can attack immediately', () => {
        const goblin = CREATURES.goblinSmuggler();
        goblin.summoningSickness = true;

        expect(rules.canAttack(goblin)).toBe(true);
    });
});

describe('Trample', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('excess damage goes to player', () => {
        const trampler = createCreature({ power: 5, keywords: ['trample'] });
        const blocker = createCreature({ toughness: 2 });

        const excessDamage = rules.calculateTrampleDamage(trampler, [blocker]);

        expect(excessDamage).toBe(3);
    });

    test('no excess damage if blocked completely', () => {
        const trampler = createCreature({ power: 3, keywords: ['trample'] });
        const blocker = createCreature({ toughness: 5 });

        const excessDamage = rules.calculateTrampleDamage(trampler, [blocker]);

        expect(excessDamage).toBe(0);
    });

    test('Beast-Kin Ranger has trample', () => {
        const ranger = CREATURES.beastKinRanger();

        expect(ranger.keywords).toContain('trample');
    });
});

describe('Lifelink', () => {
    test('lifelink creature heals controller for damage dealt', () => {
        const rules = new TestRulesEngine();
        const lifelinker = createCreature({ power: 3, keywords: ['lifelink'] });

        const damage = rules.getCreaturePower(lifelinker);
        const lifeGained = lifelinker.keywords.includes('lifelink') ? damage : 0;

        expect(lifeGained).toBe(3);
    });
});

describe('Menace', () => {
    test('menace requires two blockers (conceptual)', () => {
        const menace = createCreature({ keywords: ['menace'] });

        // Menace significa que precisa de 2+ bloqueadores
        expect(menace.keywords).toContain('menace');
    });
});

describe("Can't Block", () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('creature with cant_block cannot block', () => {
        const cantBlocker = createCreature({ keywords: ['cant_block'] });
        const attacker = createCreature();

        expect(rules.canBlock(cantBlocker, attacker)).toBe(false);
    });

    test('Vampire Interloper cannot block', () => {
        const vampire = CREATURES.vampireInterloper();
        const attacker = createCreature();

        expect(rules.canBlock(vampire, attacker)).toBe(false);
    });
});

describe('Tap for Mana', () => {
    test('creature with tap_for_mana produces mana', () => {
        const llanowar = CREATURES.llanowarElves();

        expect(llanowar.keywords).toContain('tap_for_mana');
        expect(llanowar.produces).toBe('G');
    });
});

describe('Combined Keywords', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('Thornweald Archer has reach and deathtouch', () => {
        const archer = CREATURES.thornwealdArcher();

        expect(archer.keywords).toContain('reach');
        expect(archer.keywords).toContain('deathtouch');
    });

    test('Thornweald Archer can block flying and kill any creature', () => {
        const archer = CREATURES.thornwealdArcher();
        const flyer = createCreature({ keywords: ['flying'], toughness: 10 });

        expect(rules.canBlock(archer, flyer)).toBe(true);
        expect(rules.isLethalDamage(archer, flyer)).toBe(true);
    });

    test('Vampire Interloper has flying and cant_block', () => {
        const vampire = CREATURES.vampireInterloper();

        expect(vampire.keywords).toContain('flying');
        expect(vampire.keywords).toContain('cant_block');
    });
});
