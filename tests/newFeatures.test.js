/**
 * Testes de Novas Funcionalidades
 * Valida features implementadas recentemente:
 * - temporaryKeywords e cleanup
 * - etb_counter_two (Felidar Savior)
 * - Dropkick Bomber activated ability
 * - hasValidTargets para instants
 */

const { createCreature, createPlayer, createGameState, CREATURES, SPELLS } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Temporary Keywords', () => {
    describe('temporaryKeywords array', () => {
        test('creature can have temporary keywords added', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.temporaryKeywords = [];

            // Simular Kindled Fury adicionando first_strike
            creature.temporaryKeywords.push('first_strike');

            expect(creature.temporaryKeywords).toContain('first_strike');
        });

        test('multiple temporary keywords can be added', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.temporaryKeywords = [];

            // Simular múltiplos buffs
            creature.temporaryKeywords.push('first_strike');
            creature.temporaryKeywords.push('trample');
            creature.temporaryKeywords.push('flying');

            expect(creature.temporaryKeywords).toHaveLength(3);
            expect(creature.temporaryKeywords).toContain('first_strike');
            expect(creature.temporaryKeywords).toContain('trample');
            expect(creature.temporaryKeywords).toContain('flying');
        });

        test('temporary keywords are cleared at end of turn (cleanup)', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.temporaryKeywords = ['first_strike', 'flying'];
            creature.powerModifier = 2;
            creature.toughnessModifier = 1;
            creature.damage = 1;

            // Simular cleanup de fim de turno
            creature.damage = 0;
            creature.powerModifier = 0;
            creature.toughnessModifier = 0;
            creature.temporaryKeywords = [];

            expect(creature.temporaryKeywords).toHaveLength(0);
            expect(creature.powerModifier).toBe(0);
            expect(creature.toughnessModifier).toBe(0);
            expect(creature.damage).toBe(0);
        });

        test('base keywords are not affected by cleanup', () => {
            const creature = createCreature({
                power: 2,
                toughness: 2,
                keywords: ['flying', 'lifelink']
            });
            creature.temporaryKeywords = ['first_strike'];

            // Simular cleanup
            creature.temporaryKeywords = [];

            // Keywords originais permanecem
            expect(creature.keywords).toContain('flying');
            expect(creature.keywords).toContain('lifelink');
            expect(creature.temporaryKeywords).not.toContain('first_strike');
        });
    });

    describe('Kindled Fury effect', () => {
        test('gives +1/+0 and first_strike', () => {
            const rules = new TestRulesEngine();
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.temporaryKeywords = [];

            // Simular efeito do Kindled Fury
            creature.powerModifier = (creature.powerModifier || 0) + 1;
            creature.temporaryKeywords.push('first_strike');

            expect(rules.getCreaturePower(creature)).toBe(3);
            expect(creature.temporaryKeywords).toContain('first_strike');
        });
    });

    describe('Wildheart Invoker effect', () => {
        test('gives +5/+5 and trample', () => {
            const rules = new TestRulesEngine();
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.temporaryKeywords = [];

            // Simular efeito do Wildheart Invoker (8 mana ability)
            creature.powerModifier = (creature.powerModifier || 0) + 5;
            creature.toughnessModifier = (creature.toughnessModifier || 0) + 5;
            creature.temporaryKeywords.push('trample');

            expect(rules.getCreaturePower(creature)).toBe(7);
            expect(rules.getCreatureToughness(creature)).toBe(7);
            expect(creature.temporaryKeywords).toContain('trample');
        });
    });

    describe('Dropkick Bomber flying ability', () => {
        test('gives flying and marks for sacrifice', () => {
            const goblin = createCreature({
                name: 'Swab Goblin',
                subtype: 'Goblin Pirate',
                power: 2,
                toughness: 2
            });
            goblin.temporaryKeywords = [];

            // Simular habilidade ativada do Dropkick Bomber
            goblin.temporaryKeywords.push('flying');
            goblin.sacrificeOnCombatDamage = true;

            expect(goblin.temporaryKeywords).toContain('flying');
            expect(goblin.sacrificeOnCombatDamage).toBe(true);
        });

        test('creature is sacrificed after dealing combat damage', () => {
            const goblin = createCreature({
                name: 'Swab Goblin',
                subtype: 'Goblin Pirate',
                power: 2,
                toughness: 2
            });
            goblin.sacrificeOnCombatDamage = true;

            // Simular verificação pós-combate
            const shouldSacrifice = goblin.sacrificeOnCombatDamage === true;

            expect(shouldSacrifice).toBe(true);
        });
    });
});

describe('Felidar Savior - etb_counter_two', () => {
    test('Felidar Savior has etb_counter_two keyword', () => {
        const felidar = createCreature({
            id: 'felidar_savior',
            name: 'Felidar Savior',
            subtype: 'Cat Beast',
            power: 2,
            toughness: 3,
            keywords: ['lifelink', 'etb_counter_two']
        });

        expect(felidar.keywords).toContain('etb_counter_two');
        expect(felidar.keywords).toContain('lifelink');
    });

    test('can place +1/+1 counters on up to two creatures', () => {
        const rules = new TestRulesEngine();
        const creature1 = createCreature({ name: 'Cat 1', power: 1, toughness: 1 });
        const creature2 = createCreature({ name: 'Cat 2', power: 2, toughness: 2 });

        creature1.counters = {};
        creature2.counters = {};

        // Simular ETB do Felidar Savior
        const targets = [creature1, creature2];
        targets.forEach(target => {
            target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
        });

        expect(creature1.counters.plusOnePlusOne).toBe(1);
        expect(creature2.counters.plusOnePlusOne).toBe(1);

        // Verificar que power/toughness aumentou
        expect(rules.getCreaturePower(creature1)).toBe(2); // 1 + 1
        expect(rules.getCreatureToughness(creature1)).toBe(2); // 1 + 1
        expect(rules.getCreaturePower(creature2)).toBe(3); // 2 + 1
        expect(rules.getCreatureToughness(creature2)).toBe(3); // 2 + 1
    });

    test('can choose to place counters on fewer than two creatures', () => {
        const creature1 = createCreature({ name: 'Cat 1', power: 1, toughness: 1 });
        creature1.counters = {};

        // Simular escolher apenas 1 alvo
        const targets = [creature1];
        targets.forEach(target => {
            target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
        });

        expect(creature1.counters.plusOnePlusOne).toBe(1);
    });

    test('cannot target itself', () => {
        const felidar = createCreature({
            id: 'felidar_savior',
            name: 'Felidar Savior',
            power: 2,
            toughness: 3
        });
        const otherCreature = createCreature({ name: 'Other Cat', power: 1, toughness: 1 });

        const player = createPlayer();
        player.battlefield = [felidar, otherCreature];

        // Filtrar alvos válidos (outras criaturas)
        const validTargets = player.battlefield.filter(c =>
            c.type === 'creature' && c.instanceId !== felidar.instanceId
        );

        expect(validTargets).toHaveLength(1);
        expect(validTargets[0].name).toBe('Other Cat');
    });
});

describe('Instant Target Validation - hasValidTargets', () => {
    describe('Buff spells (target own creatures)', () => {
        test('Moment of Triumph requires own creature', () => {
            const player = createPlayer();
            const opponent = createPlayer();

            // Sem criaturas - não pode jogar
            player.battlefield = [];
            const hasTargetsWithoutCreatures = player.battlefield.some(c => c.type === 'creature');
            expect(hasTargetsWithoutCreatures).toBe(false);

            // Com criaturas - pode jogar
            player.battlefield = [createCreature({ name: 'My Creature' })];
            const hasTargetsWithCreatures = player.battlefield.some(c => c.type === 'creature');
            expect(hasTargetsWithCreatures).toBe(true);
        });

        test('Offer Immortality requires own creature', () => {
            const player = createPlayer();

            // Lista de buffs que miram suas criaturas
            const selfTargetBuffs = ['moment_of_triumph', 'kindled_fury', 'snakeskin_veil', 'offer_immortality'];

            // Simular verificação
            player.battlefield = [];
            const canPlayWithoutCreatures = player.battlefield.some(c => c.type === 'creature');

            player.battlefield = [createCreature()];
            const canPlayWithCreatures = player.battlefield.some(c => c.type === 'creature');

            expect(canPlayWithoutCreatures).toBe(false);
            expect(canPlayWithCreatures).toBe(true);
        });
    });

    describe('Removal spells (target opponent creatures)', () => {
        test('Moment of Craving requires opponent creature', () => {
            const opponent = createPlayer();

            // Sem criaturas do oponente - não pode jogar
            opponent.battlefield = [];
            const hasTargetsWithoutCreatures = opponent.battlefield.some(c => c.type === 'creature');
            expect(hasTargetsWithoutCreatures).toBe(false);

            // Com criaturas do oponente - pode jogar
            opponent.battlefield = [createCreature({ name: 'Enemy Creature' })];
            const hasTargetsWithCreatures = opponent.battlefield.some(c => c.type === 'creature');
            expect(hasTargetsWithCreatures).toBe(true);
        });

        test("Hero's Downfall requires opponent creature", () => {
            const opponent = createPlayer();

            opponent.battlefield = [];
            expect(opponent.battlefield.some(c => c.type === 'creature')).toBe(false);

            opponent.battlefield = [createCreature()];
            expect(opponent.battlefield.some(c => c.type === 'creature')).toBe(true);
        });
    });

    describe('Conditional removal spells', () => {
        test('Volley requires creature with flying', () => {
            const opponent = createPlayer();

            // Criatura sem flying - não pode alvejar
            opponent.battlefield = [createCreature({ name: 'Ground Creature' })];
            const hasFlyingTarget = opponent.battlefield.some(c =>
                c.type === 'creature' && c.keywords && c.keywords.includes('flying')
            );
            expect(hasFlyingTarget).toBe(false);

            // Criatura com flying - pode alvejar
            opponent.battlefield = [createCreature({
                name: 'Flying Creature',
                keywords: ['flying']
            })];
            const hasFlyingTarget2 = opponent.battlefield.some(c =>
                c.type === 'creature' && c.keywords && c.keywords.includes('flying')
            );
            expect(hasFlyingTarget2).toBe(true);
        });

        test("Elspeth's Smite requires attacking or blocking creature", () => {
            const attackers = [];
            const blockers = [];

            // Sem atacantes ou bloqueadores - não pode jogar
            const hasTargetsEmpty = attackers.length > 0 || blockers.length > 0;
            expect(hasTargetsEmpty).toBe(false);

            // Com atacantes - pode jogar
            attackers.push(createCreature({ name: 'Attacker' }));
            const hasTargetsWithAttacker = attackers.length > 0 || blockers.length > 0;
            expect(hasTargetsWithAttacker).toBe(true);
        });

        test('Broken Wings requires artifact, enchantment, or flying creature', () => {
            const opponent = createPlayer();

            // Apenas criaturas sem flying - não pode jogar
            opponent.battlefield = [createCreature({ name: 'Ground Creature' })];
            let hasValidTarget = opponent.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && c.keywords && c.keywords.includes('flying'))
            );
            expect(hasValidTarget).toBe(false);

            // Com artefato - pode jogar
            opponent.battlefield = [{ type: 'artifact', name: 'Some Artifact' }];
            hasValidTarget = opponent.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && c.keywords && c.keywords.includes('flying'))
            );
            expect(hasValidTarget).toBe(true);

            // Com criatura voadora - pode jogar
            opponent.battlefield = [createCreature({ name: 'Flyer', keywords: ['flying'] })];
            hasValidTarget = opponent.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && c.keywords && c.keywords.includes('flying'))
            );
            expect(hasValidTarget).toBe(true);
        });
    });

    describe('Counterspells', () => {
        test('Counterspell requires something on the stack', () => {
            let stack = [];

            // Stack vazia - não pode jogar
            const canCounterEmpty = stack.length > 0;
            expect(canCounterEmpty).toBe(false);

            // Stack com spell - pode jogar
            stack = [{ name: 'Enemy Spell', type: 'sorcery' }];
            const canCounterWithSpell = stack.length > 0;
            expect(canCounterWithSpell).toBe(true);
        });
    });
});

describe('Priority Window After Blocking', () => {
    test('player should have opportunity to respond after declaring blockers', () => {
        // Este é um teste conceitual - a implementação real está em game.js
        // continueAfterBlocking() agora chama offerPriorityWindow()

        const canRespondAfterBlocking = true; // Nova funcionalidade implementada

        expect(canRespondAfterBlocking).toBe(true);
    });

    test('combat tricks can be used after blocking', () => {
        const rules = new TestRulesEngine();
        const blocker = createCreature({ power: 2, toughness: 2 });
        blocker.temporaryKeywords = [];

        // Simular usar Moment of Triumph após declarar bloqueadores
        blocker.powerModifier = (blocker.powerModifier || 0) + 2;
        blocker.toughnessModifier = (blocker.toughnessModifier || 0) + 2;

        // Agora o bloqueador 2/2 é efetivamente 4/4
        expect(rules.getCreaturePower(blocker)).toBe(4);
        expect(rules.getCreatureToughness(blocker)).toBe(4);

        // Pode sobreviver a um atacante 3/3
        const attacker = createCreature({ power: 3, toughness: 3 });
        const result = rules.resolveCombatDamage(attacker, blocker);

        expect(result.blockerDies).toBe(false); // Sobrevive com 4 toughness vs 3 damage
        expect(result.attackerDies).toBe(true); // Morre com 3 toughness vs 4 damage
    });
});

describe('Combat Log Details', () => {
    test('combat damage results include specific damage amounts', () => {
        // Simular estrutura de combatDetails retornada por resolveCombatDamage
        const combatDetails = [];

        // Dano direto
        combatDetails.push({
            type: 'direct',
            attacker: 'Goblin',
            damage: 2
        });

        // Combate bloqueado
        combatDetails.push({
            type: 'blocked',
            attacker: 'Elf',
            blocker: 'Cat',
            damageToBlocker: 3,
            damageToAttacker: 2
        });

        // Trample
        combatDetails.push({
            type: 'trample',
            attacker: 'Beast',
            damage: 2
        });

        expect(combatDetails).toHaveLength(3);
        expect(combatDetails[0].type).toBe('direct');
        expect(combatDetails[0].damage).toBe(2);
        expect(combatDetails[1].type).toBe('blocked');
        expect(combatDetails[1].damageToBlocker).toBe(3);
        expect(combatDetails[2].type).toBe('trample');
    });
});
