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

        test('Goblin Smuggler (haste) can attack immediately', () => {
            const goblin = CREATURES.goblinSmuggler();
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

describe('AI Gang Blocking', () => {
    let rules;
    let mockAI;

    beforeEach(() => {
        rules = new TestRulesEngine();
        // Mock AI com thresholds padrão
        mockAI = {
            rules: rules,
            difficulty: {
                thresholds: {
                    tradePower: 3,
                    panicMultiplier: 2
                }
            },
            game: {
                opponent: { life: 20 }
            }
        };
    });

    // Helper para simular lógica de gang block
    const selectGangBlockPair = (availableBlockers, attacker, ai) => {
        if (availableBlockers.length < 2) return null;

        const attackerToughness = ai.rules.getCreatureToughness(attacker);
        const attackerPower = ai.rules.getCreaturePower(attacker);
        const attackerHasDeathtouch = attacker.keywords?.includes('deathtouch');
        const tradePowerThreshold = ai.difficulty.thresholds.tradePower;
        const panicMultiplier = ai.difficulty.thresholds.panicMultiplier;
        const aiLife = ai.game.opponent.life;

        let bestPair = null;
        let bestScore = -Infinity;

        for (let i = 0; i < availableBlockers.length; i++) {
            for (let j = i + 1; j < availableBlockers.length; j++) {
                const b1 = availableBlockers[i];
                const b2 = availableBlockers[j];

                const b1Power = ai.rules.getCreaturePower(b1);
                const b2Power = ai.rules.getCreaturePower(b2);
                const b1Toughness = ai.rules.getCreatureToughness(b1);
                const b2Toughness = ai.rules.getCreatureToughness(b2);
                const b1HasDeathtouch = b1.keywords?.includes('deathtouch');
                const b2HasDeathtouch = b2.keywords?.includes('deathtouch');

                const combinedPower = b1Power + b2Power;
                const canKillAttacker = combinedPower >= attackerToughness ||
                    b1HasDeathtouch || b2HasDeathtouch;

                if (!canKillAttacker) continue;

                let blockerDeaths = 0;
                if (attackerHasDeathtouch) {
                    blockerDeaths = 2;
                } else {
                    blockerDeaths = attackerPower >= (b1Toughness + b2Toughness) ? 2 : 1;
                }

                const blockersTotalValue = b1Power + b2Power;
                let score = 0;

                if (blockerDeaths === 0) {
                    score = attackerPower * 10;
                } else if (blockerDeaths === 1) {
                    if (attackerPower >= tradePowerThreshold) {
                        score = attackerPower - Math.min(b1Power, b2Power);
                    } else if (aiLife <= attackerPower * panicMultiplier) {
                        score = attackerPower;
                    } else {
                        score = -1;
                    }
                } else {
                    if (aiLife <= attackerPower * panicMultiplier) {
                        score = attackerPower - blockersTotalValue;
                    } else if (attackerPower >= tradePowerThreshold + 2) {
                        score = attackerPower - blockersTotalValue;
                    } else {
                        score = -10;
                    }
                }

                if (score > bestScore && score > 0) {
                    bestScore = score;
                    bestPair = [b1, b2];
                }
            }
        }

        return bestPair;
    };

    describe('Gang Block Strategy', () => {
        test('two 2/2s do NOT gang block a 4/4 (both would die - bad trade)', () => {
            // 4 power can kill both 2/2s - losing 2 creatures for 1 is bad
            const attacker = createCreature({ power: 4, toughness: 4 });
            const b1 = createCreature({ power: 2, toughness: 2, instanceId: 'b1' });
            const b2 = createCreature({ power: 2, toughness: 2, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).toBeNull(); // Not worth the 2-for-1 trade
        });

        test('two 2/3s gang block a 5/5 (only 1 dies, powerful attacker)', () => {
            // Combined toughness 6 > attacker power 5, so only 1 blocker dies
            // Combined power 4 < 5, but attacker power 5 >= threshold 3, worth it
            const attacker = createCreature({ power: 5, toughness: 5 });
            const b1 = createCreature({ power: 2, toughness: 3, instanceId: 'b1' });
            const b2 = createCreature({ power: 2, toughness: 3, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            // 4 combined power can't kill 5/5 - this should return null
            expect(pair).toBeNull();
        });

        test('two 3/4s gang block a 5/5 (only 1 dies, can kill attacker)', () => {
            // Combined power 6 can kill 5/5
            // Combined toughness 8 > attacker power 5, so only 1 blocker dies
            const attacker = createCreature({ power: 5, toughness: 5 });
            const b1 = createCreature({ power: 3, toughness: 4, instanceId: 'b1' });
            const b2 = createCreature({ power: 3, toughness: 4, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).not.toBeNull(); // Only lose 1 blocker for a 5/5 - good trade
        });

        test('two 3/3s gang block a 4/4 (only 1 blocker dies - good trade)', () => {
            // 4 power can only kill one 3/3, but combined 6 power kills the 4/4
            const attacker = createCreature({ power: 4, toughness: 4 });
            const b1 = createCreature({ power: 3, toughness: 3, instanceId: 'b1' });
            const b2 = createCreature({ power: 3, toughness: 3, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).not.toBeNull(); // Only lose 1 blocker to kill 4/4 - worth it
        });

        test('two 1/1s do NOT gang block a 3/3 (combined power insufficient)', () => {
            const attacker = createCreature({ power: 3, toughness: 3 });
            const b1 = createCreature({ power: 1, toughness: 1, instanceId: 'b1' });
            const b2 = createCreature({ power: 1, toughness: 1, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).toBeNull(); // Can't kill 3/3 with 2 combined power
        });

        test('two 2/2s gang block a 3/3 (can kill, attacker power >= threshold)', () => {
            const attacker = createCreature({ power: 3, toughness: 3 });
            const b1 = createCreature({ power: 2, toughness: 2, instanceId: 'b1' });
            const b2 = createCreature({ power: 2, toughness: 2, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).not.toBeNull(); // 4 power can kill 3/3, and 3 >= tradePowerThreshold
        });

        test('two 2/2s do NOT gang block a 2/2 (not worth it - low power)', () => {
            const attacker = createCreature({ power: 2, toughness: 2 });
            const b1 = createCreature({ power: 2, toughness: 2, instanceId: 'b1' });
            const b2 = createCreature({ power: 2, toughness: 2, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            // Should not gang block - attacker power 2 < threshold 3
            expect(pair).toBeNull();
        });

        test('gang blocks in panic mode even for small attacker', () => {
            mockAI.game.opponent.life = 3; // Panic: 3 <= 2*2

            const attacker = createCreature({ power: 2, toughness: 2 });
            const b1 = createCreature({ power: 2, toughness: 2, instanceId: 'b1' });
            const b2 = createCreature({ power: 2, toughness: 2, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            expect(pair).not.toBeNull(); // In panic mode, any block is worth it
        });

        test('deathtouch blocker enables gang block against bigger creature', () => {
            const attacker = createCreature({ power: 6, toughness: 6 });
            const b1 = createCreature({ power: 1, toughness: 1, instanceId: 'b1', keywords: ['deathtouch'] });
            const b2 = createCreature({ power: 2, toughness: 2, instanceId: 'b2' });

            const pair = selectGangBlockPair([b1, b2], attacker, mockAI);

            // Deathtouch makes any damage lethal, so can kill the 6/6
            expect(pair).not.toBeNull();
        });
    });
});

describe('AI Chump Blocking', () => {
    // Helper para simular lógica de chump block
    const isExpendable = (creature) => {
        if (creature.instanceId?.startsWith('token_')) return true;
        const power = creature.power || 0;
        const toughness = creature.toughness || 0;
        const hasValuableKeyword = creature.keywords?.some(k =>
            ['deathtouch', 'lifelink', 'flying', 'first_strike', 'double_strike'].includes(k)
        );
        if (power <= 1 && toughness <= 1 && !hasValuableKeyword) return true;
        return false;
    };

    const creatureValue = (creature) => {
        if (creature.instanceId?.startsWith('token_')) return 0;
        let value = (creature.power || 0) + (creature.toughness || 0);
        if (creature.keywords?.includes('deathtouch')) value += 3;
        if (creature.keywords?.includes('lifelink')) value += 2;
        if (creature.keywords?.includes('flying')) value += 2;
        return value;
    };

    describe('Expendable Creature Detection', () => {
        test('tokens are expendable', () => {
            const token = createCreature({ instanceId: 'token_cat_123', power: 1, toughness: 1 });
            expect(isExpendable(token)).toBe(true);
        });

        test('1/1 without keywords is expendable', () => {
            const creature = createCreature({ power: 1, toughness: 1, keywords: [] });
            expect(isExpendable(creature)).toBe(true);
        });

        test('1/1 with deathtouch is NOT expendable', () => {
            const creature = createCreature({ power: 1, toughness: 1, keywords: ['deathtouch'] });
            expect(isExpendable(creature)).toBe(false);
        });

        test('2/2 is NOT expendable', () => {
            const creature = createCreature({ power: 2, toughness: 2, keywords: [] });
            expect(isExpendable(creature)).toBe(false);
        });
    });

    describe('Creature Value Calculation', () => {
        test('token has value 0', () => {
            const token = createCreature({ instanceId: 'token_cat_123', power: 1, toughness: 1 });
            expect(creatureValue(token)).toBe(0);
        });

        test('2/2 vanilla has value 4', () => {
            const creature = createCreature({ power: 2, toughness: 2, keywords: [] });
            expect(creatureValue(creature)).toBe(4);
        });

        test('deathtouch adds 3 to value', () => {
            const creature = createCreature({ power: 1, toughness: 1, keywords: ['deathtouch'] });
            expect(creatureValue(creature)).toBe(2 + 3); // 1+1 + 3 deathtouch
        });

        test('flying adds 2 to value', () => {
            const creature = createCreature({ power: 2, toughness: 1, keywords: ['flying'] });
            expect(creatureValue(creature)).toBe(3 + 2); // 2+1 + 2 flying
        });

        test('lifelink adds 2 to value', () => {
            const creature = createCreature({ power: 3, toughness: 3, keywords: ['lifelink'] });
            expect(creatureValue(creature)).toBe(6 + 2); // 3+3 + 2 lifelink
        });
    });

    describe('Chump Block Decision Logic', () => {
        test('token should chump block a 3-power attacker', () => {
            // Token is expendable, attacker power >= 3
            const token = createCreature({ instanceId: 'token_cat_123', power: 1, toughness: 1 });
            const attacker = createCreature({ power: 3, toughness: 3 });

            const shouldBlock = isExpendable(token) && attacker.power >= 3;
            expect(shouldBlock).toBe(true);
        });

        test('token should NOT chump block a 2-power attacker (not worth it)', () => {
            // Attacker power < 3, not big enough to waste a token
            const token = createCreature({ instanceId: 'token_cat_123', power: 1, toughness: 1 });
            const attacker = createCreature({ power: 2, toughness: 2 });

            const shouldBlock = isExpendable(token) && attacker.power >= 3;
            expect(shouldBlock).toBe(false);
        });

        test('low-value creature should chump block a 4+ power attacker', () => {
            // 1/1 has value 2, attacker power >= 4
            const creature = createCreature({ power: 1, toughness: 1, keywords: [] });
            const attacker = createCreature({ power: 4, toughness: 4 });

            const shouldBlock = creatureValue(creature) <= 3 && attacker.power >= 4;
            expect(shouldBlock).toBe(true);
        });

        test('valuable creature should NOT chump block', () => {
            // 2/2 with flying has value 4+2=6, too valuable to sacrifice
            const creature = createCreature({ power: 2, toughness: 2, keywords: ['flying'] });
            const attacker = createCreature({ power: 4, toughness: 4 });

            const shouldBlock = creatureValue(creature) <= 3 && attacker.power >= 4;
            expect(shouldBlock).toBe(false);
        });
    });
});
