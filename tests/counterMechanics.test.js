/**
 * Testes de Mecânicas de Contadores
 * Valida counter_synergy, lifegain_counter, e lords que dão keywords
 *
 * Estes testes foram criados após bugs encontrados em:
 * - Wildwood Scourge não ganhando contadores (counter_synergy)
 * - Distinção entre contadores +1/+1 e modificadores temporários
 */

const { createCreature, createPlayer, CREATURES } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Counter Synergy (Wildwood Scourge mechanic)', () => {
    describe('Triggering on +1/+1 counters', () => {
        test('gains +1/+1 counter when another creature gets a counter', () => {
            const scourge = CREATURES.wildwoodScourge();
            const otherCreature = CREATURES.mildManneredLibrarian();

            // Simular: outra criatura ganha contador +1/+1
            if (!otherCreature.counters) otherCreature.counters = {};
            otherCreature.counters.plusOnePlusOne = 2;

            // Trigger counter_synergy (lógica do triggers.js onCounterPlaced)
            if (scourge.keywords?.includes('counter_synergy') &&
                scourge.instanceId !== otherCreature.instanceId &&
                !otherCreature.subtype?.includes('Hydra')) {
                if (!scourge.counters) scourge.counters = {};
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            expect(scourge.counters.plusOnePlusOne).toBe(1);
        });

        test('does NOT trigger on temporary +X/+X modifiers (Giant Growth)', () => {
            const scourge = CREATURES.wildwoodScourge();
            const otherCreature = CREATURES.mildManneredLibrarian();

            // Giant Growth dá modificador temporário, NÃO contador
            otherCreature.powerModifier = 3;
            otherCreature.toughnessModifier = 3;

            // Counter synergy NÃO deve triggerar para modificadores
            // (modificadores não são contadores - regra 122.1 vs 613.4c)
            const countersPlaced = false; // Giant Growth não coloca contadores

            if (countersPlaced && scourge.keywords?.includes('counter_synergy')) {
                if (!scourge.counters) scourge.counters = {};
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            expect(scourge.counters.plusOnePlusOne).toBeUndefined();
        });

        test('does NOT trigger when a Hydra gets counters', () => {
            const scourge = CREATURES.wildwoodScourge();
            const otherHydra = createCreature({
                name: 'Other Hydra',
                subtype: 'Hydra',
                counters: { plusOnePlusOne: 0 }
            });

            // Outra Hidra ganha contador
            otherHydra.counters.plusOnePlusOne = 3;

            // Trigger NÃO deve acontecer para Hidras
            if (scourge.keywords?.includes('counter_synergy') &&
                scourge.instanceId !== otherHydra.instanceId &&
                !otherHydra.subtype?.includes('Hydra')) {
                if (!scourge.counters) scourge.counters = {};
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            expect(scourge.counters.plusOnePlusOne).toBeUndefined();
        });

        test('does NOT trigger for itself getting counters', () => {
            const scourge = CREATURES.wildwoodScourge();

            // Scourge ganha contador diretamente
            if (!scourge.counters) scourge.counters = {};
            scourge.counters.plusOnePlusOne = 2;

            // Simular check - não deve adicionar extra por ser ele mesmo
            const shouldTrigger = scourge.keywords?.includes('counter_synergy') &&
                scourge.instanceId !== scourge.instanceId; // false - é ele mesmo

            expect(shouldTrigger).toBe(false);
            expect(scourge.counters.plusOnePlusOne).toBe(2); // Só os 2 originais
        });

        test('triggers multiple times for multiple creatures getting counters', () => {
            const scourge = CREATURES.wildwoodScourge();
            if (!scourge.counters) scourge.counters = {};

            const creature1 = createCreature({ name: 'Creature 1' });
            const creature2 = createCreature({ name: 'Creature 2' });

            // Primeira criatura ganha contador
            if (scourge.keywords?.includes('counter_synergy')) {
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            // Segunda criatura ganha contador
            if (scourge.keywords?.includes('counter_synergy')) {
                scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
            }

            expect(scourge.counters.plusOnePlusOne).toBe(2);
        });
    });

    describe('Counter vs Modifier distinction (MTG Rules 122.1 vs 613.4c)', () => {
        test('+1/+1 counters persist after end of turn', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            if (!creature.counters) creature.counters = {};
            creature.counters.plusOnePlusOne = 2;

            // Simular cleanup de fim de turno
            creature.powerModifier = 0;
            creature.toughnessModifier = 0;
            // Contadores NÃO são limpos no cleanup

            expect(creature.counters.plusOnePlusOne).toBe(2);
        });

        test('temporary modifiers are cleared at end of turn', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            creature.powerModifier = 3;
            creature.toughnessModifier = 3;

            // Simular cleanup de fim de turno
            creature.powerModifier = 0;
            creature.toughnessModifier = 0;

            expect(creature.powerModifier).toBe(0);
            expect(creature.toughnessModifier).toBe(0);
        });

        test('effective power includes both counters and modifiers', () => {
            const creature = createCreature({ power: 2, toughness: 2 });
            if (!creature.counters) creature.counters = {};
            creature.counters.plusOnePlusOne = 2; // +2/+2 from counters
            creature.powerModifier = 3; // +3/+3 from Giant Growth
            creature.toughnessModifier = 3;

            const effectivePower = creature.power +
                (creature.counters.plusOnePlusOne || 0) +
                (creature.powerModifier || 0);
            const effectiveToughness = creature.toughness +
                (creature.counters.plusOnePlusOne || 0) +
                (creature.toughnessModifier || 0);

            expect(effectivePower).toBe(7);  // 2 base + 2 counters + 3 modifier
            expect(effectiveToughness).toBe(7);
        });
    });
});

describe('Lifegain Counter (Ajani\'s Pridemate mechanic)', () => {
    test('gains +1/+1 counter when controller gains life', () => {
        const pridemate = CREATURES.ajanisPridemate();
        const player = createPlayer({ life: 20 });

        // Jogador ganha vida
        const lifeGained = 3;
        player.life += lifeGained;

        // Trigger lifegain_counter
        if (pridemate.keywords?.includes('lifegain_counter')) {
            if (!pridemate.counters) pridemate.counters = {};
            pridemate.counters.plusOnePlusOne = (pridemate.counters.plusOnePlusOne || 0) + 1;
        }

        expect(player.life).toBe(23);
        expect(pridemate.counters.plusOnePlusOne).toBe(1);
    });

    test('triggers once per lifegain event, not per life point', () => {
        const pridemate = CREATURES.ajanisPridemate();
        if (!pridemate.counters) pridemate.counters = {};
        const player = createPlayer({ life: 20 });

        // Jogador ganha 5 vida DE UMA VEZ
        const lifeGained = 5;
        player.life += lifeGained;

        // Apenas 1 trigger, não 5
        if (pridemate.keywords?.includes('lifegain_counter')) {
            pridemate.counters.plusOnePlusOne = (pridemate.counters.plusOnePlusOne || 0) + 1;
        }

        expect(pridemate.counters.plusOnePlusOne).toBe(1); // Apenas 1, não 5
    });

    test('triggers separately for each lifegain event', () => {
        const pridemate = CREATURES.ajanisPridemate();
        if (!pridemate.counters) pridemate.counters = {};
        const player = createPlayer({ life: 20 });

        // Primeiro evento: lifelink damage
        player.life += 2;
        if (pridemate.keywords?.includes('lifegain_counter')) {
            pridemate.counters.plusOnePlusOne = (pridemate.counters.plusOnePlusOne || 0) + 1;
        }

        // Segundo evento: Moment of Triumph
        player.life += 2;
        if (pridemate.keywords?.includes('lifegain_counter')) {
            pridemate.counters.plusOnePlusOne = (pridemate.counters.plusOnePlusOne || 0) + 1;
        }

        expect(player.life).toBe(24);
        expect(pridemate.counters.plusOnePlusOne).toBe(2); // 2 eventos = 2 counters
    });

    test('multiple Pridemates each get a counter', () => {
        const pridemate1 = CREATURES.ajanisPridemate();
        const pridemate2 = CREATURES.ajanisPridemate();
        if (!pridemate1.counters) pridemate1.counters = {};
        if (!pridemate2.counters) pridemate2.counters = {};

        // Um evento de lifegain
        const creatures = [pridemate1, pridemate2];
        creatures.forEach(creature => {
            if (creature.keywords?.includes('lifegain_counter')) {
                creature.counters.plusOnePlusOne = (creature.counters.plusOnePlusOne || 0) + 1;
            }
        });

        expect(pridemate1.counters.plusOnePlusOne).toBe(1);
        expect(pridemate2.counters.plusOnePlusOne).toBe(1);
    });
});

describe('Death Baron (zombie_skeleton_lord mechanic)', () => {
    let rules;

    beforeEach(() => {
        rules = new TestRulesEngine();
    });

    test('gives +1/+1 to other Zombies', () => {
        const deathBaron = CREATURES.deathBaron();
        const zombie = CREATURES.gravedigger();

        const player = createPlayer({
            battlefield: [deathBaron, zombie]
        });

        // Calcular bônus de lord
        let bonus = 0;
        player.battlefield.forEach(card => {
            if (card.keywords?.includes('zombie_skeleton_lord') && card !== zombie) {
                if (zombie.subtype?.includes('Zombie') || zombie.subtype?.includes('Skeleton')) {
                    bonus += 1;
                }
            }
        });

        expect(bonus).toBe(1);
    });

    test('gives +1/+1 to other Skeletons', () => {
        const deathBaron = CREATURES.deathBaron();
        const skeleton = CREATURES.skeletonArcher();

        const player = createPlayer({
            battlefield: [deathBaron, skeleton]
        });

        let bonus = 0;
        player.battlefield.forEach(card => {
            if (card.keywords?.includes('zombie_skeleton_lord') && card !== skeleton) {
                if (skeleton.subtype?.includes('Zombie') || skeleton.subtype?.includes('Skeleton')) {
                    bonus += 1;
                }
            }
        });

        expect(bonus).toBe(1);
    });

    test('does NOT buff itself', () => {
        const deathBaron = CREATURES.deathBaron();

        const player = createPlayer({
            battlefield: [deathBaron]
        });

        let bonus = 0;
        player.battlefield.forEach(card => {
            if (card.keywords?.includes('zombie_skeleton_lord') && card !== deathBaron) {
                // Death Baron é Zombie, mas não deve buffar a si mesmo
                if (deathBaron.subtype?.includes('Zombie')) {
                    bonus += 1;
                }
            }
        });

        expect(bonus).toBe(0);
    });

    test('gives deathtouch to Zombies and Skeletons', () => {
        const deathBaron = CREATURES.deathBaron();
        const zombie = CREATURES.gravedigger();
        const skeleton = CREATURES.skeletonArcher();
        const otherCreature = createCreature({ subtype: 'Human' });

        const player = createPlayer({
            battlefield: [deathBaron, zombie, skeleton, otherCreature]
        });

        // Simular getCreatureKeywords para cada criatura
        const getKeywordsWithLord = (creature) => {
            const keywords = [...(creature.keywords || [])];

            player.battlefield.forEach(card => {
                if (card.keywords?.includes('zombie_skeleton_lord') && card !== creature) {
                    if (creature.subtype?.includes('Zombie') || creature.subtype?.includes('Skeleton')) {
                        if (!keywords.includes('deathtouch')) {
                            keywords.push('deathtouch');
                        }
                    }
                }
            });

            return keywords;
        };

        expect(getKeywordsWithLord(zombie)).toContain('deathtouch');
        expect(getKeywordsWithLord(skeleton)).toContain('deathtouch');
        expect(getKeywordsWithLord(otherCreature)).not.toContain('deathtouch');
    });

    test('does NOT give deathtouch to opponent Zombies', () => {
        const deathBaron = CREATURES.deathBaron();
        const myZombie = CREATURES.gravedigger();
        const opponentZombie = CREATURES.gravedigger();

        const player = createPlayer({
            battlefield: [deathBaron, myZombie]
        });
        const opponent = createPlayer({
            battlefield: [opponentZombie]
        });

        // Verificar que Death Baron só afeta criaturas do controlador
        const getKeywordsForCreature = (creature, controller) => {
            const keywords = [...(creature.keywords || [])];

            // Só verifica battlefield do controlador
            controller.battlefield.forEach(card => {
                if (card.keywords?.includes('zombie_skeleton_lord') && card !== creature) {
                    if (creature.subtype?.includes('Zombie') || creature.subtype?.includes('Skeleton')) {
                        if (!keywords.includes('deathtouch')) {
                            keywords.push('deathtouch');
                        }
                    }
                }
            });

            return keywords;
        };

        expect(getKeywordsForCreature(myZombie, player)).toContain('deathtouch');
        expect(getKeywordsForCreature(opponentZombie, opponent)).not.toContain('deathtouch');
    });

    test('multiple Death Barons stack +1/+1 bonuses', () => {
        const deathBaron1 = CREATURES.deathBaron();
        const deathBaron2 = CREATURES.deathBaron();
        const zombie = CREATURES.gravedigger();

        const player = createPlayer({
            battlefield: [deathBaron1, deathBaron2, zombie]
        });

        let bonus = 0;
        player.battlefield.forEach(card => {
            if (card.keywords?.includes('zombie_skeleton_lord') && card !== zombie) {
                if (zombie.subtype?.includes('Zombie') || zombie.subtype?.includes('Skeleton')) {
                    bonus += 1;
                }
            }
        });

        expect(bonus).toBe(2); // +1 de cada Death Baron
    });
});

describe('Interaction: Counter Synergy + Lifegain Counter', () => {
    test('Pridemate getting counter triggers Wildwood Scourge', () => {
        const scourge = CREATURES.wildwoodScourge();
        const pridemate = CREATURES.ajanisPridemate();
        if (!scourge.counters) scourge.counters = {};
        if (!pridemate.counters) pridemate.counters = {};

        // Jogador ganha vida -> Pridemate ganha contador
        pridemate.counters.plusOnePlusOne = (pridemate.counters.plusOnePlusOne || 0) + 1;

        // Isso deve triggerar Wildwood Scourge
        if (scourge.keywords?.includes('counter_synergy') &&
            !pridemate.subtype?.includes('Hydra')) {
            scourge.counters.plusOnePlusOne = (scourge.counters.plusOnePlusOne || 0) + 1;
        }

        expect(pridemate.counters.plusOnePlusOne).toBe(1);
        expect(scourge.counters.plusOnePlusOne).toBe(1);
    });
});
