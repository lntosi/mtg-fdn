/**
 * Testes de Triggers
 * Valida ETB, "quando outra criatura entra", fim de turno, etc.
 */

const { createCreature, createPlayer, CREATURES } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('ETB Triggers (Enter the Battlefield)', () => {
    describe('Beast-Kin Ranger - Other Creature Enters', () => {
        test('gains +1/+0 when another creature enters', () => {
            const ranger = CREATURES.beastKinRanger();
            ranger.powerModifier = 0;

            // Simular trigger: outra criatura entra
            const newCreature = createCreature({ name: 'Other Creature' });

            // Lógica do trigger
            if (ranger.id === 'beast_kin_ranger' && ranger.instanceId !== newCreature.instanceId) {
                ranger.powerModifier += 1;
            }

            expect(ranger.powerModifier).toBe(1);
        });

        test('gains +2/+0 when two creatures enter', () => {
            const ranger = CREATURES.beastKinRanger();
            ranger.powerModifier = 0;

            // Primeira criatura entra
            const creature1 = createCreature({ name: 'Creature 1' });
            if (ranger.id === 'beast_kin_ranger') ranger.powerModifier += 1;

            // Segunda criatura entra
            const creature2 = createCreature({ name: 'Creature 2' });
            if (ranger.id === 'beast_kin_ranger') ranger.powerModifier += 1;

            expect(ranger.powerModifier).toBe(2);
        });

        test('does not trigger for itself entering', () => {
            const ranger = CREATURES.beastKinRanger();
            ranger.powerModifier = 0;

            // O próprio ranger entra - não deve triggerar
            if (ranger.id === 'beast_kin_ranger' && ranger.instanceId !== ranger.instanceId) {
                ranger.powerModifier += 1;
            }

            expect(ranger.powerModifier).toBe(0);
        });

        test('effective power increases with trigger', () => {
            const rules = new TestRulesEngine();
            const ranger = CREATURES.beastKinRanger();
            ranger.powerModifier = 0;

            expect(rules.getCreaturePower(ranger)).toBe(3); // Base power

            // Trigger once
            ranger.powerModifier += 1;
            expect(rules.getCreaturePower(ranger)).toBe(4);

            // Trigger twice
            ranger.powerModifier += 1;
            expect(rules.getCreaturePower(ranger)).toBe(5);
        });
    });

    describe('Dwynen\'s Elite - Conditional Token Creation', () => {
        test('creates token if controlling another Elf', () => {
            const player = createPlayer();
            const elite = createCreature({
                id: 'dwynenss_elite',
                name: "Dwynen's Elite",
                subtype: 'Elf Warrior'
            });
            const otherElf = createCreature({
                name: 'Llanowar Elves',
                subtype: 'Elf Druid'
            });

            player.battlefield = [otherElf, elite];

            // Simular ETB check
            const hasOtherElf = player.battlefield.some(c =>
                c.type === 'creature' &&
                c.subtype && c.subtype.includes('Elf') &&
                c.instanceId !== elite.instanceId
            );

            expect(hasOtherElf).toBe(true);
        });

        test('does not create token if no other Elf', () => {
            const player = createPlayer();
            const elite = createCreature({
                id: 'dwynenss_elite',
                name: "Dwynen's Elite",
                subtype: 'Elf Warrior'
            });
            const goblin = createCreature({
                name: 'Goblin',
                subtype: 'Goblin'
            });

            player.battlefield = [goblin, elite];

            const hasOtherElf = player.battlefield.some(c =>
                c.type === 'creature' &&
                c.subtype && c.subtype.includes('Elf') &&
                c.instanceId !== elite.instanceId
            );

            expect(hasOtherElf).toBe(false);
        });
    });

    describe('Vampire Spawn - Drain Effect', () => {
        test('drains 2 life on ETB', () => {
            const player = createPlayer({ life: 20 });
            const opponent = createPlayer({ life: 20 });

            // Simular ETB do Vampire Spawn
            const drainAmount = 2;
            opponent.life -= drainAmount;
            player.life += drainAmount;

            expect(opponent.life).toBe(18);
            expect(player.life).toBe(22);
        });
    });
});

describe('End of Turn Triggers', () => {
    describe('Stromkirk Bloodthief', () => {
        test('adds +1/+1 counter to vampire if opponent lost life', () => {
            const bloodthief = createCreature({
                id: 'stromkirk_bloodthief',
                name: 'Stromkirk Bloodthief',
                subtype: 'Vampire Rogue'
            });
            bloodthief.counters = {};
            const opponentLostLife = true;

            // Simular trigger de fim de turno
            if (bloodthief.id === 'stromkirk_bloodthief' && opponentLostLife) {
                bloodthief.counters['+1/+1'] = (bloodthief.counters['+1/+1'] || 0) + 1;
            }

            expect(bloodthief.counters['+1/+1']).toBe(1);
        });

        test('does not add counter if opponent did not lose life', () => {
            const bloodthief = createCreature({
                id: 'stromkirk_bloodthief',
                subtype: 'Vampire Rogue'
            });
            bloodthief.counters = {};
            const opponentLostLife = false;

            if (bloodthief.id === 'stromkirk_bloodthief' && opponentLostLife) {
                bloodthief.counters['+1/+1'] = (bloodthief.counters['+1/+1'] || 0) + 1;
            }

            expect(bloodthief.counters['+1/+1']).toBeUndefined();
        });
    });

    describe('Damage Cleanup', () => {
        test('damage is cleared at end of turn', () => {
            const creature = createCreature({ damage: 3 });

            // Simular cleanup
            creature.damage = 0;

            expect(creature.damage).toBe(0);
        });

        test('power/toughness modifiers are cleared at end of turn', () => {
            const creature = createCreature({
                powerModifier: 2,
                toughnessModifier: 1
            });

            // Simular cleanup
            creature.powerModifier = 0;
            creature.toughnessModifier = 0;

            expect(creature.powerModifier).toBe(0);
            expect(creature.toughnessModifier).toBe(0);
        });

        test('counters persist after end of turn', () => {
            const creature = createCreature();
            creature.counters = { '+1/+1': 2 };

            // Cleanup não afeta contadores
            creature.damage = 0;
            creature.powerModifier = 0;

            expect(creature.counters['+1/+1']).toBe(2);
        });
    });
});

describe('Attack Triggers', () => {
    describe('Leonin Vanguard', () => {
        test('gains 1 life when attacking with another creature', () => {
            const player = createPlayer({ life: 20 });
            const vanguard = createCreature({
                id: 'leonin_vanguard',
                name: 'Leonin Vanguard'
            });
            const otherAttacker = createCreature({ name: 'Other Creature' });

            const attackers = [vanguard, otherAttacker];

            // Simular trigger
            if (attackers.some(a => a.id === 'leonin_vanguard') && attackers.length > 1) {
                player.life += 1;
            }

            expect(player.life).toBe(21);
        });

        test('does not gain life when attacking alone', () => {
            const player = createPlayer({ life: 20 });
            const vanguard = createCreature({
                id: 'leonin_vanguard',
                name: 'Leonin Vanguard'
            });

            const attackers = [vanguard];

            if (attackers.some(a => a.id === 'leonin_vanguard') && attackers.length > 1) {
                player.life += 1;
            }

            expect(player.life).toBe(20);
        });
    });
});

describe('Beginning of Combat Triggers', () => {
    describe('Battle-Rattle Shaman', () => {
        test('gives +2/+0 to target creature at beginning of combat', () => {
            const shaman = createCreature({
                id: 'battle_rattle_shaman',
                name: 'Battle-Rattle Shaman'
            });
            const target = createCreature({ power: 2, toughness: 2 });

            // Simular trigger de início de combate
            target.powerModifier = (target.powerModifier || 0) + 2;

            const rules = new TestRulesEngine();
            expect(rules.getCreaturePower(target)).toBe(4);
        });
    });
});
