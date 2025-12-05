/**
 * Testes de Lords e Efeitos Estáticos
 * Valida que criaturas "lord" dão bônus corretos a outras criaturas do mesmo tipo
 */

const { createCreature, createPlayer, createGameState, CREATURES } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

describe('Dropkick Bomber - Goblin Lord', () => {
    let rules;
    let gameState;

    beforeEach(() => {
        gameState = createGameState();
        rules = new TestRulesEngine(gameState);
    });

    test('Dropkick Bomber has correct stats (2/3)', () => {
        const bomber = CREATURES.dropkickBomber();

        expect(bomber.power).toBe(2);
        expect(bomber.toughness).toBe(3);
        expect(bomber.keywords).toContain('goblin_lord');
    });

    test('other Goblins get +1/+1 from Dropkick Bomber', () => {
        const bomber = CREATURES.dropkickBomber();
        const redcap = CREATURES.ragingRedcap();
        const swabGoblin = CREATURES.swabGoblin();

        gameState.player.battlefield = [bomber, redcap, swabGoblin];

        // Raging Redcap base: 1/2, with Dropkick Bomber: 2/3
        const redcapPower = rules.getCreaturePower(redcap);
        const redcapToughness = rules.getCreatureToughness(redcap);

        expect(redcapPower).toBe(2); // 1 + 1 from Dropkick Bomber
        expect(redcapToughness).toBe(3); // 2 + 1 from Dropkick Bomber

        // Swab Goblin base: 2/2, with Dropkick Bomber: 3/3
        const swabPower = rules.getCreaturePower(swabGoblin);
        const swabToughness = rules.getCreatureToughness(swabGoblin);

        expect(swabPower).toBe(3); // 2 + 1 from Dropkick Bomber
        expect(swabToughness).toBe(3); // 2 + 1 from Dropkick Bomber
    });

    test('Dropkick Bomber does not buff itself', () => {
        const bomber = CREATURES.dropkickBomber();

        gameState.player.battlefield = [bomber];

        const bomberPower = rules.getCreaturePower(bomber);
        const bomberToughness = rules.getCreatureToughness(bomber);

        expect(bomberPower).toBe(2); // Base power, no self-buff
        expect(bomberToughness).toBe(3); // Base toughness, no self-buff
    });

    test('Dropkick Bomber does not buff non-Goblins', () => {
        const bomber = CREATURES.dropkickBomber();
        const elf = CREATURES.llanowarElves(); // Elf, not Goblin

        gameState.player.battlefield = [bomber, elf];

        const elfPower = rules.getCreaturePower(elf);
        const elfToughness = rules.getCreatureToughness(elf);

        expect(elfPower).toBe(1); // Base power, no buff
        expect(elfToughness).toBe(1); // Base toughness, no buff
    });

    test('Dropkick Bomber does not buff opponent Goblins', () => {
        const playerBomber = CREATURES.dropkickBomber();
        const opponentGoblin = CREATURES.frenziedGoblin();

        gameState.player.battlefield = [playerBomber];
        gameState.opponent.battlefield = [opponentGoblin];

        const goblinPower = rules.getCreaturePower(opponentGoblin);
        const goblinToughness = rules.getCreatureToughness(opponentGoblin);

        expect(goblinPower).toBe(1); // Base power, no buff from opponent's Bomber
        expect(goblinToughness).toBe(1); // Base toughness, no buff
    });

    test('multiple Dropkick Bombers stack bonuses', () => {
        const bomber1 = CREATURES.dropkickBomber();
        const bomber2 = CREATURES.dropkickBomber();
        bomber2.instanceId = 'bomber_2'; // Different instance
        const redcap = CREATURES.ragingRedcap();

        gameState.player.battlefield = [bomber1, bomber2, redcap];

        // Raging Redcap base: 1/2, with 2x Dropkick Bomber: 3/4
        const redcapPower = rules.getCreaturePower(redcap);
        const redcapToughness = rules.getCreatureToughness(redcap);

        expect(redcapPower).toBe(3); // 1 + 1 + 1 from two Bombers
        expect(redcapToughness).toBe(4); // 2 + 1 + 1 from two Bombers
    });
});

describe('Elvish Archdruid - Elf Lord', () => {
    let rules;
    let gameState;

    beforeEach(() => {
        gameState = createGameState();
        rules = new TestRulesEngine(gameState);
    });

    test('Elvish Archdruid has correct stats (2/2)', () => {
        const archdruid = CREATURES.elvishArchdruid();

        expect(archdruid.power).toBe(2);
        expect(archdruid.toughness).toBe(2);
    });

    test('other Elves get +1/+1 from Elvish Archdruid', () => {
        const archdruid = CREATURES.elvishArchdruid();
        const llanowar = CREATURES.llanowarElves();
        const beastKin = CREATURES.beastKinRanger();

        gameState.player.battlefield = [archdruid, llanowar, beastKin];

        // Llanowar Elves base: 1/1, with Archdruid: 2/2
        const llanowarPower = rules.getCreaturePower(llanowar);
        const llanowarToughness = rules.getCreatureToughness(llanowar);

        expect(llanowarPower).toBe(2); // 1 + 1 from Archdruid
        expect(llanowarToughness).toBe(2); // 1 + 1 from Archdruid

        // Beast-Kin Ranger base: 3/3, with Archdruid: 4/4
        const beastKinPower = rules.getCreaturePower(beastKin);
        const beastKinToughness = rules.getCreatureToughness(beastKin);

        expect(beastKinPower).toBe(4); // 3 + 1 from Archdruid
        expect(beastKinToughness).toBe(4); // 3 + 1 from Archdruid
    });

    test('Elvish Archdruid does not buff itself', () => {
        const archdruid = CREATURES.elvishArchdruid();

        gameState.player.battlefield = [archdruid];

        const archdruidPower = rules.getCreaturePower(archdruid);
        const archdruidToughness = rules.getCreatureToughness(archdruid);

        expect(archdruidPower).toBe(2); // Base power
        expect(archdruidToughness).toBe(2); // Base toughness
    });

    test('Elvish Archdruid does not buff non-Elves', () => {
        const archdruid = CREATURES.elvishArchdruid();
        const goblin = CREATURES.frenziedGoblin();

        gameState.player.battlefield = [archdruid, goblin];

        const goblinPower = rules.getCreaturePower(goblin);
        const goblinToughness = rules.getCreatureToughness(goblin);

        expect(goblinPower).toBe(1); // Base power, no buff
        expect(goblinToughness).toBe(1); // Base toughness, no buff
    });
});

describe('Raging Redcap - Double Strike', () => {
    let rules;
    let gameState;

    beforeEach(() => {
        gameState = createGameState();
        rules = new TestRulesEngine(gameState);
    });

    test('Raging Redcap has correct stats (1/2 double_strike)', () => {
        const redcap = CREATURES.ragingRedcap();

        expect(redcap.power).toBe(1);
        expect(redcap.toughness).toBe(2);
        expect(redcap.keywords).toContain('double_strike');
    });

    test('Raging Redcap with Dropkick Bomber becomes 2/3 double_strike', () => {
        const bomber = CREATURES.dropkickBomber();
        const redcap = CREATURES.ragingRedcap();

        gameState.player.battlefield = [bomber, redcap];

        const redcapPower = rules.getCreaturePower(redcap);
        const redcapToughness = rules.getCreatureToughness(redcap);

        expect(redcapPower).toBe(2); // 1 + 1 from Bomber
        expect(redcapToughness).toBe(3); // 2 + 1 from Bomber
        expect(redcap.keywords).toContain('double_strike');
    });
});

describe('Lord Effects in Combat', () => {
    let rules;
    let gameState;

    beforeEach(() => {
        gameState = createGameState();
        rules = new TestRulesEngine(gameState);
    });

    test('Goblin with lord buff survives combat it would otherwise lose', () => {
        const bomber = CREATURES.dropkickBomber();
        const swabGoblin = CREATURES.swabGoblin(); // Base 2/2

        gameState.player.battlefield = [bomber, swabGoblin];

        // With Dropkick Bomber, Swab Goblin is 3/3
        // Combat vs a 2/2 attacker: Swab Goblin takes 2 damage but has 3 toughness
        const swabToughness = rules.getCreatureToughness(swabGoblin);
        swabGoblin.damage = 2;

        const isDead = rules.isCreatureDead(swabGoblin);

        expect(swabToughness).toBe(3);
        expect(isDead).toBe(false); // Survives because 3 toughness > 2 damage
    });

    test('removing lord makes creature die from existing damage', () => {
        const swabGoblin = CREATURES.swabGoblin(); // Base 2/2

        // Without Dropkick Bomber, Swab Goblin has 2 toughness
        gameState.player.battlefield = [swabGoblin];

        swabGoblin.damage = 2;
        const swabToughness = rules.getCreatureToughness(swabGoblin);
        const isDead = rules.isCreatureDead(swabGoblin);

        expect(swabToughness).toBe(2);
        expect(isDead).toBe(true); // Dies because 2 toughness = 2 damage
    });
});
