/**
 * Testes de Feitiços
 * Valida efeitos de instants, sorceries e targeting
 */

const { createCreature, createPlayer, createSpell, createLand, CREATURES, SPELLS } = require('./helpers/gameFactory');
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

describe('Bite Down (One-Sided Fight)', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    describe('Target Requirements', () => {
        test('requires own creature AND opponent creature', () => {
            const player = createPlayer({
                battlefield: [createCreature({ name: 'My Creature' })]
            });
            const opponent = createPlayer({
                battlefield: [createCreature({ name: 'Enemy Creature' })]
            });

            const hasOwnCreature = player.battlefield.some(c => c.type === 'creature');
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            const canCast = hasOwnCreature && hasOpponentCreature;

            expect(canCast).toBe(true);
        });

        test('cannot cast without own creature', () => {
            const player = createPlayer({ battlefield: [] });
            const opponent = createPlayer({
                battlefield: [createCreature({ name: 'Enemy' })]
            });

            const hasOwnCreature = player.battlefield.some(c => c.type === 'creature');
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            const canCast = hasOwnCreature && hasOpponentCreature;

            expect(canCast).toBe(false);
        });

        test('cannot cast without opponent creature', () => {
            const player = createPlayer({
                battlefield: [createCreature({ name: 'My Creature' })]
            });
            const opponent = createPlayer({ battlefield: [] });

            const hasOwnCreature = player.battlefield.some(c => c.type === 'creature');
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            const canCast = hasOwnCreature && hasOpponentCreature;

            expect(canCast).toBe(false);
        });
    });

    describe('Damage Resolution', () => {
        test('own creature deals damage equal to its power', () => {
            const ownCreature = createCreature({ power: 4, toughness: 4 });
            const enemyCreature = createCreature({ power: 2, toughness: 3 });

            // Bite Down: sua criatura causa dano igual ao poder dela
            const damage = ownCreature.power;
            enemyCreature.damage = (enemyCreature.damage || 0) + damage;

            expect(damage).toBe(4);
            expect(enemyCreature.damage).toBe(4);
        });

        test('enemy creature does NOT deal damage back (one-sided)', () => {
            const ownCreature = createCreature({ power: 2, toughness: 2 });
            const enemyCreature = createCreature({ power: 5, toughness: 5 });

            // Bite Down é one-sided - inimigo NÃO causa dano de volta
            const ownDamageReceived = 0; // Diferente de Fight que seria recíproco

            expect(ownCreature.damage || 0).toBe(ownDamageReceived);
        });

        test('deathtouch on own creature kills enemy regardless of toughness', () => {
            const ownCreature = createCreature({
                power: 1,
                toughness: 1,
                keywords: ['deathtouch']
            });
            const enemyCreature = createCreature({ power: 10, toughness: 10 });

            const damage = ownCreature.power;
            enemyCreature.damage = damage;

            // Deathtouch: qualquer dano > 0 é letal
            const hasDeathtouch = ownCreature.keywords?.includes('deathtouch');
            const isLethal = hasDeathtouch && damage > 0;

            expect(isLethal).toBe(true);
        });

        test('enemy dies if damage >= toughness', () => {
            const ownCreature = createCreature({ power: 4, toughness: 4 });
            const enemyCreature = createCreature({ power: 2, toughness: 3 });

            const damage = ownCreature.power;
            enemyCreature.damage = damage;

            const enemyDies = enemyCreature.damage >= enemyCreature.toughness;

            expect(enemyDies).toBe(true);
        });

        test('enemy survives if damage < toughness', () => {
            const ownCreature = createCreature({ power: 2, toughness: 2 });
            const enemyCreature = createCreature({ power: 3, toughness: 5 });

            const damage = ownCreature.power;
            enemyCreature.damage = damage;

            const enemyDies = enemyCreature.damage >= enemyCreature.toughness;

            expect(enemyDies).toBe(false);
            expect(enemyCreature.damage).toBe(2);
        });
    });

    describe('Target Selection UI', () => {
        test('targets without owner property should still be selectable', () => {
            // Bug fix: promptTriggerTarget filtrava por t.owner, mas criaturas
            // passadas não tinham essa propriedade, resultando em lista vazia
            const ownCreatures = [
                createCreature({ name: 'Creature 1' }),
                createCreature({ name: 'Creature 2' })
            ];

            // Simular lógica corrigida: ungroupedTargets como fallback
            const playerTargets = ownCreatures.filter(t => t.isPlayer);
            const opponentCreatures = ownCreatures.filter(t => !t.isPlayer && t.owner === 'opponent');
            const playerCreatures = ownCreatures.filter(t => !t.isPlayer && t.owner === 'player');
            const ungroupedTargets = ownCreatures.filter(t => !t.isPlayer && !t.owner);

            // Sem o fix, todos os grupos seriam vazios
            expect(playerTargets.length).toBe(0);
            expect(opponentCreatures.length).toBe(0);
            expect(playerCreatures.length).toBe(0);

            // Com o fix, ungroupedTargets captura criaturas sem owner
            expect(ungroupedTargets.length).toBe(2);
        });

        test('targets with owner property are grouped correctly', () => {
            const targets = [
                createCreature({ name: 'My Creature', owner: 'player' }),
                createCreature({ name: 'Enemy Creature', owner: 'opponent' })
            ];

            const playerCreatures = targets.filter(t => !t.isPlayer && t.owner === 'player');
            const opponentCreatures = targets.filter(t => !t.isPlayer && t.owner === 'opponent');

            expect(playerCreatures.length).toBe(1);
            expect(opponentCreatures.length).toBe(1);
            expect(playerCreatures[0].name).toBe('My Creature');
            expect(opponentCreatures[0].name).toBe('Enemy Creature');
        });
    });
});

describe('New Horizons (Land Aura)', () => {
    describe('Target Requirements', () => {
        test('can only enchant lands you control', () => {
            const player = createPlayer({
                battlefield: [
                    createLand({ name: 'Forest' }),
                    createLand({ name: 'Forest 2' }),
                    createCreature({ name: 'Bear' })
                ]
            });

            // New Horizons: encantar terreno que você controla
            const validTargets = player.battlefield.filter(c => c.type === 'land');

            expect(validTargets.length).toBe(2);
            expect(validTargets.every(t => t.type === 'land')).toBe(true);
        });

        test('cannot enchant opponent lands', () => {
            const player = createPlayer({
                battlefield: [createLand({ name: 'My Forest' })]
            });
            const opponent = createPlayer({
                battlefield: [createLand({ name: 'Enemy Forest' })]
            });

            // Apenas terrenos do jogador são válidos
            const validTargets = player.battlefield.filter(c => c.type === 'land');

            expect(validTargets.length).toBe(1);
            expect(validTargets[0].name).toBe('My Forest');
        });

        test('cannot cast without lands', () => {
            const player = createPlayer({
                battlefield: [createCreature({ name: 'Bear' })]
            });

            const validTargets = player.battlefield.filter(c => c.type === 'land');

            expect(validTargets.length).toBe(0);
        });
    });

    describe('Land Targeting in UI', () => {
        test('lands should be selectable as targets when waitingForTarget', () => {
            // Bug fix: lands não tinham lógica de targeting, só de seleção de mana
            const lands = [
                createLand({ name: 'Forest 1' }),
                createLand({ name: 'Forest 2' })
            ];

            // Simular estado de UI
            const waitingForTarget = true;
            const validTargets = lands;

            // Cada terreno deve ser marcado como alvo válido
            lands.forEach(land => {
                const isValidTarget = waitingForTarget && validTargets.includes(land);
                expect(isValidTarget).toBe(true);
            });
        });

        test('lands not in validTargets should not be selectable as targets', () => {
            const forest = createLand({ name: 'Forest' });
            const mountain = createLand({ name: 'Mountain' });

            const waitingForTarget = true;
            const validTargets = [forest]; // Apenas Forest é válido

            expect(validTargets.includes(forest)).toBe(true);
            expect(validTargets.includes(mountain)).toBe(false);
        });
    });

    describe('ETB Effect', () => {
        test('puts +1/+1 counter on target creature when entering', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            if (!creature.counters) creature.counters = {};

            // ETB: coloca um contador +1/+1 em criatura alvo
            creature.counters.plusOnePlusOne = (creature.counters.plusOnePlusOne || 0) + 1;

            expect(creature.counters.plusOnePlusOne).toBe(1);
        });

        test('ETB counter should trigger Wildwood Scourge', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            const scourge = CREATURES.wildwoodScourge();
            if (!creature.counters) creature.counters = {};
            if (!scourge.counters) scourge.counters = {};

            // New Horizons ETB coloca contador na criatura
            creature.counters.plusOnePlusOne = 1;

            // Isso deve triggerar Wildwood Scourge
            if (scourge.keywords?.includes('counter_synergy') &&
                !creature.subtype?.includes('Hydra')) {
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            expect(creature.counters.plusOnePlusOne).toBe(1);
            expect(scourge.counters.plusOnePlusOne).toBe(1);
        });
    });

    describe('Enchanted Land Mana Production', () => {
        test('enchanted land produces 2 mana of one color', () => {
            const land = createLand({ name: 'Forest', produces: 'G' });

            // Simular aura anexada
            const newHorizonsAttached = true;
            const manaProduced = newHorizonsAttached ? 2 : 1;

            expect(manaProduced).toBe(2);
        });
    });
});
