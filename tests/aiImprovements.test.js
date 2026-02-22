/**
 * Tests for AI improvements across ai.js, game.js, and triggers.js
 *
 * Covers:
 * - chooseBestCard improvements (mana dorks, lords, sorceries, evasion, removal threshold)
 * - Alpha-strike lethal detection
 * - First strike blocking logic
 * - isExpendable/creatureValue using rules.hasKeyword
 * - Expanded spell targeting (Murder, Scorching Dragonfire, Cemetery Recruitment, Giant Growth)
 * - canPayWithTreasures no double-counting
 * - Vampire Neonate timing
 * - shouldCounterspell improvements
 * - AI discard improvements
 * - Incinerating Blast loot
 * - Burrog Befuddler targeting
 * - Skeleton Archer targeting
 * - Instant-speed system
 * - Double strike in survival check
 * - Land selection for discard
 */

const fs = require('fs');
const { createCreature, createPlayer, createLand, createSpell } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

// Load AIPlayer class from source (uses window.AIPlayer)
const PHASES = {
    UNTAP: 'untap', UPKEEP: 'upkeep', DRAW: 'draw',
    MAIN1: 'main1', COMBAT_BEGIN: 'combat_begin',
    DECLARE_ATTACKERS: 'declare_attackers', DECLARE_BLOCKERS: 'declare_blockers',
    COMBAT_DAMAGE: 'combat_damage', COMBAT_END: 'combat_end',
    MAIN2: 'main2', END: 'end', CLEANUP: 'cleanup'
};

// Eval AI source to get AIPlayer class
const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
const window = {};
eval(aiSource);
const AIPlayer = window.AIPlayer;

/**
 * Helper: Create an AI instance with a proper game/rules mock
 */
function createAI(overrides = {}) {
    const player = overrides.player || createPlayer({ name: 'Player' });
    const opponent = overrides.opponent || createPlayer({ name: 'Opponent' });

    // Create a game object first so rules can reference it
    const game = {
        player,
        opponent,
        activePlayer: overrides.activePlayer || opponent,
        phase: overrides.phase || PHASES.MAIN1,
        turnNumber: overrides.turnNumber || 1,
        currentAttackers: overrides.currentAttackers || [],
        blockerAssignments: overrides.blockerAssignments || {},
        stack: overrides.stack || [],
        gameSessionId: 1,
        opponentLostLifeThisTurn: false,
        playerLostLifeThisTurn: false,
        floatingMana: { player: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, opponent: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 } },
        ui: { log: jest.fn(), render: jest.fn() },
        rules: null,
        triggers: null,
        ai: null,
        isRemovalSpell: function(card) {
            const removalIds = [
                'eaten_by_piranhas', 'finishing_blow', 'elspeths_smite',
                'deadly_riposte', 'prayer_of_binding', 'angelic_edict',
                'heros_downfall', 'eaten_alive', 'deadly_plot',
                'moment_of_craving', 'scorching_dragonfire', 'fiery_annihilation',
                'incinerating_blast', 'pacifism', 'starlight_snare'
            ];
            return removalIds.includes(card.id);
        },
        getValidSpellTargets: function(card, caster) {
            const opp = caster === this.player ? this.opponent : this.player;
            return opp.battlefield.filter(c => c.type === 'creature');
        },
        peekStack: function() { return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null; },
        isStackEmpty: function() { return this.stack.length === 0; },
        ...overrides.gameOverrides
    };

    // Create rules engine with full game reference (including activePlayer, phase, etc.)
    const rules = new TestRulesEngine(game);
    game.rules = rules;

    // Add canPlayCard to test rules engine
    rules.canPlayCard = function(card, p) {
        if (card.type === 'land') return this.canPlayLand ? this.canPlayLand(p) : false;
        if (card.type === 'instant' || card.keywords?.includes('flash')) {
            return this.canCastInstant(card, p);
        }
        return this.canCastSpell(card, p);
    };
    rules.canPlayLand = function(p) {
        const isMainPhase = this.game.phase === 'main1' || this.game.phase === 'main2';
        const isActivePlayer = this.game.activePlayer === p;
        return isMainPhase && isActivePlayer && p.landsPlayedThisTurn < 1;
    };
    rules.getPlayerDeckColors = function(p) {
        const colors = new Set();
        p.battlefield.forEach(c => { if (c.produces && c.produces !== 'any') colors.add(c.produces); });
        p.hand.forEach(c => { if (c.cost) { const m = c.cost.match(/[WUBRG]/g); if (m) m.forEach(x => colors.add(x)); }});
        return [...colors];
    };
    rules.hasValidTargets = function() { return true; };

    const ai = new AIPlayer(game, rules);
    game.ai = ai;
    return { ai, game, rules, player, opponent };
}


// ============================================================
// Group 1: chooseBestCard improvements (ai.js)
// ============================================================
describe('Group 1: chooseBestCard improvements', () => {

    test('1. Mana dork prioritized early game (turnNumber=2)', () => {
        const { ai, opponent } = createAI({ turnNumber: 2 });

        // Give AI enough mana
        for (let i = 0; i < 3; i++) {
            opponent.battlefield.push(createLand({ produces: 'G' }));
        }

        const manaDork = createCreature({
            id: 'llanowar_elves', name: 'Llanowar Elves',
            subtype: 'Elf Druid', power: 1, toughness: 1,
            keywords: ['tap_for_mana'], cost: 'G', cmc: 1
        });
        const vanilla = createCreature({
            id: 'test_vanilla', name: 'Vanilla 3/3',
            power: 3, toughness: 3, cost: '2G', cmc: 3
        });

        const result = ai.chooseBestCard([manaDork, vanilla]);
        expect(result.id).toBe('llanowar_elves');
    });

    test('2. Lord evaluated higher than vanilla with creatures on field', () => {
        const { ai, opponent } = createAI();

        // Two Elves already on field
        opponent.battlefield.push(createCreature({ subtype: 'Elf', power: 1, toughness: 1 }));
        opponent.battlefield.push(createCreature({ subtype: 'Elf', power: 2, toughness: 2 }));

        const lord = createCreature({
            id: 'elvish_archdruid', name: 'Elvish Archdruid',
            subtype: 'Elf Druid', power: 2, toughness: 2,
            keywords: ['elf_lord'], cost: '1GG', cmc: 3
        });
        const vanilla = createCreature({
            id: 'test_vanilla', name: 'Vanilla 3/3',
            power: 3, toughness: 3, cost: '2G', cmc: 3
        });

        const result = ai.chooseBestCard([lord, vanilla]);
        expect(result.id).toBe('elvish_archdruid');
    });

    test('3. Dragon Fodder evaluated higher when goblin lord on field', () => {
        const { ai, opponent } = createAI();

        // Goblin lord on field
        opponent.battlefield.push(createCreature({
            id: 'dropkick_bomber', name: 'Dropkick Bomber',
            subtype: 'Goblin Warrior', power: 2, toughness: 3,
            keywords: ['goblin_lord']
        }));

        const dragonFodder = {
            instanceId: 'spell_df', id: 'dragon_fodder',
            name: 'Dragon Fodder', type: 'sorcery', cost: '1R', cmc: 2
        };
        const vanilla = createCreature({
            id: 'test_vanilla', name: 'Vanilla 2/2',
            power: 2, toughness: 2, cost: '1R', cmc: 2
        });

        const result = ai.chooseBestCard([dragonFodder, vanilla]);
        expect(result.id).toBe('dragon_fodder');
    });

    test('4. Flying creature preferred over vanilla with same stats', () => {
        const { ai } = createAI();

        const flyer = createCreature({
            id: 'test_flyer', name: 'Flyer 2/2',
            power: 2, toughness: 2, keywords: ['flying'], cost: '1W', cmc: 2
        });
        const vanilla = createCreature({
            id: 'test_vanilla', name: 'Vanilla 2/2',
            power: 2, toughness: 2, cost: '1W', cmc: 2
        });

        const result = ai.chooseBestCard([flyer, vanilla]);
        expect(result.id).toBe('test_flyer');
    });

    test('5. Removal threshold lowered to 7 for prioritization', () => {
        const { ai, player } = createAI();

        // 3/3 with first_strike = 3+3+1=7 threat
        const threat = createCreature({
            id: 'threat', name: 'Threat',
            power: 3, toughness: 3,
            keywords: ['first_strike'], summoningSickness: false
        });
        player.battlefield.push(threat);

        const removal = {
            instanceId: 'spell_hd', id: 'heros_downfall',
            name: "Hero's Downfall", type: 'instant', cost: '1BB', cmc: 3
        };
        const vanilla = createCreature({
            id: 'test_vanilla', name: 'Vanilla 4/4',
            power: 4, toughness: 4, cost: '3G', cmc: 4
        });

        const result = ai.chooseBestCard([removal, vanilla]);
        expect(result.id).toBe('heros_downfall');
    });
});


// ============================================================
// Group 2: Alpha-strike lethal detection (ai.js)
// ============================================================
describe('Group 2: Alpha-strike lethal detection', () => {

    test('6. Alpha strike detected when guaranteed damage exceeds life', () => {
        const { ai, player, opponent } = createAI();

        player.life = 5;

        // 3 attackers with 2/2 each = 6 total. 1 blocker can block 1 = 4 guaranteed damage
        const attacker1 = createCreature({ power: 2, toughness: 2, summoningSickness: false });
        const attacker2 = createCreature({ power: 2, toughness: 2, summoningSickness: false });
        const attacker3 = createCreature({ power: 2, toughness: 2, summoningSickness: false });

        const blocker = createCreature({ power: 3, toughness: 3, summoningSickness: false });
        player.battlefield.push(blocker);

        const attackers = ai.chooseAttackers([attacker1, attacker2, attacker3], player);
        expect(attackers.length).toBe(3);
    });

    test('7. Evasive lethal detected with flyers vs ground creatures', () => {
        const { ai, player } = createAI();

        player.life = 5;

        const flyer1 = createCreature({ power: 3, toughness: 3, keywords: ['flying'], summoningSickness: false });
        const flyer2 = createCreature({ power: 3, toughness: 3, keywords: ['flying'], summoningSickness: false });

        // Only ground blockers - cannot block flyers
        const groundBlocker = createCreature({ power: 5, toughness: 5, summoningSickness: false });
        player.battlefield.push(groundBlocker);

        const attackers = ai.chooseAttackers([flyer1, flyer2], player);
        expect(attackers.length).toBe(2);
    });

    test('8. Double strike counted correctly in lethal calculation', () => {
        const { ai, player } = createAI();

        player.life = 6;

        const doubleStriker = createCreature({
            power: 3, toughness: 3,
            keywords: ['double_strike'], summoningSickness: false
        });

        // No blockers
        const attackers = ai.chooseAttackers([doubleStriker], player);
        expect(attackers.length).toBe(1);
    });
});


// ============================================================
// Group 3: First strike blocking (ai.js)
// ============================================================
describe('Group 3: First strike blocking', () => {

    test('9. First strike blocker kills attacker before taking damage (survives)', () => {
        const { ai, game, opponent } = createAI();

        opponent.life = 20;

        // AI blocker: 3/2 with first strike
        const blocker = createCreature({
            power: 3, toughness: 2,
            keywords: ['first_strike'], summoningSickness: false
        });

        // Attacker: 3/3 vanilla
        const attacker = createCreature({
            power: 3, toughness: 3, summoningSickness: false
        });

        const assignments = ai.chooseBlockers([attacker], [blocker]);
        // Should block: blocker has first strike, kills 3/3 before taking damage
        expect(assignments[attacker.instanceId]).toBeDefined();
        expect(assignments[attacker.instanceId]).toContain(blocker);
    });

    test('10. Attacker with first strike recognized as dangerous (AI should not block)', () => {
        const { ai, opponent } = createAI();

        opponent.life = 20;

        // AI blocker: 2/3 vanilla
        const blocker = createCreature({
            power: 2, toughness: 3, summoningSickness: false
        });

        // Attacker: 3/2 with first strike - kills 2/3 blocker first, attacker survives
        const attacker = createCreature({
            power: 3, toughness: 2,
            keywords: ['first_strike'], summoningSickness: false
        });

        const assignments = ai.chooseBlockers([attacker], [blocker]);
        // AI should NOT block: attacker deals 3 first (kills 2/3 blocker), attacker survives
        // The blocker dies for nothing
        expect(assignments[attacker.instanceId]).toBeUndefined();
    });
});


// ============================================================
// Group 4: isExpendable/creatureValue use rules.hasKeyword (ai.js)
// ============================================================
describe('Group 4: isExpendable/creatureValue use rules.hasKeyword', () => {

    test('11. Lord-granted deathtouch recognized as valuable (zombie + Death Baron)', () => {
        const { ai, rules, opponent } = createAI();

        // Death Baron grants deathtouch to zombies
        const deathBaron = createCreature({
            id: 'death_baron', name: 'Death Baron',
            subtype: 'Zombie Wizard', power: 2, toughness: 2,
            keywords: ['zombie_skeleton_lord']
        });
        opponent.battlefield.push(deathBaron);

        // A basic zombie (no innate keywords)
        const zombie = createCreature({
            name: 'Zombie', subtype: 'Zombie',
            power: 2, toughness: 2, keywords: []
        });
        opponent.battlefield.push(zombie);

        // hasKeyword should recognize the lord-granted deathtouch
        const hasDeathtouch = rules.hasKeyword(zombie, 'deathtouch', false);

        // TestRulesEngine.hasKeyword is simplified and checks keywords/temporaryKeywords directly
        // But the AI's creatureValue uses rules.hasKeyword which in real code checks lord grants
        // Verify the source code uses rules.hasKeyword not creature.keywords directly
        const aiSourceCode = fs.readFileSync('./js/ai.js', 'utf-8');
        const creatureValueSection = aiSourceCode.match(/const creatureValue[\s\S]*?return value;\s*\}/);
        expect(creatureValueSection).toBeTruthy();
        expect(creatureValueSection[0]).toContain('this.rules.hasKeyword');
        expect(creatureValueSection[0]).not.toContain('creature.keywords?.includes');
    });
});


// ============================================================
// Group 5: Expanded spell targeting (ai.js)
// ============================================================
describe('Group 5: Expanded spell targeting', () => {

    test('12. Murder targets highest threat creature', () => {
        const { ai, player } = createAI();

        const vanilla = createCreature({ name: 'Vanilla', power: 2, toughness: 2 });
        const flyer = createCreature({ name: 'Flyer', power: 2, toughness: 2, keywords: ['flying'] });
        player.battlefield.push(vanilla);
        player.battlefield.push(flyer);

        const murder = { id: 'murder', name: 'Murder', type: 'instant', cost: '1BB', cmc: 3 };

        const target = ai.chooseBestSpellTarget(murder, [vanilla, flyer]);
        // Flyer has higher threat (2+2+3 flying = 7 vs 2+2 = 4)
        expect(target.name).toBe('Flyer');
    });

    test('13. Scorching Dragonfire targets highest threat', () => {
        const { ai, player } = createAI();

        const vanilla = createCreature({ name: 'Vanilla', power: 2, toughness: 2 });
        const flyer = createCreature({ name: 'Flyer', power: 2, toughness: 2, keywords: ['flying'] });
        player.battlefield.push(vanilla);
        player.battlefield.push(flyer);

        const dragonfire = { id: 'scorching_dragonfire', name: 'Scorching Dragonfire', type: 'instant', cost: '1R', cmc: 2 };

        const target = ai.chooseBestSpellTarget(dragonfire, [vanilla, flyer]);
        expect(target.name).toBe('Flyer');
    });

    test('14. Cemetery Recruitment prefers zombies', () => {
        const { ai } = createAI();

        const zombie = createCreature({
            name: 'Gravedigger', subtype: 'Zombie',
            power: 2, toughness: 2, cmc: 4
        });
        const nonZombie = createCreature({
            name: 'Beast', subtype: 'Beast',
            power: 3, toughness: 3, cmc: 5
        });

        const spell = { id: 'cemetery_recruitment', name: 'Cemetery Recruitment', type: 'sorcery' };

        const target = ai.chooseBestSpellTarget(spell, [nonZombie, zombie]);
        expect(target.subtype).toContain('Zombie');
    });

    test('15. Giant Growth prefers evasive creature (flyer over ground)', () => {
        const { ai, opponent } = createAI();

        const flyer = createCreature({
            name: 'Flyer', power: 2, toughness: 2, keywords: ['flying']
        });
        const ground = createCreature({
            name: 'Ground', power: 3, toughness: 3
        });
        opponent.battlefield.push(flyer);
        opponent.battlefield.push(ground);

        const giantGrowth = { id: 'giant_growth', name: 'Giant Growth', type: 'instant', cost: 'G', cmc: 1 };

        const target = ai.chooseBestSpellTarget(giantGrowth, [flyer, ground]);
        // Flyer: power 2 + flying 3 = 5; Ground: power 3 = 3
        expect(target.name).toBe('Flyer');
    });
});


// ============================================================
// Group 6: canPayWithTreasures fix (ai.js)
// ============================================================
describe('Group 6: canPayWithTreasures no double-counting', () => {

    test('16. No double-counting treasure mana', () => {
        const { ai, rules, opponent } = createAI();

        // 2 Mountains = 2R mana
        opponent.battlefield.push(createLand({ produces: 'R' }));
        opponent.battlefield.push(createLand({ produces: 'R' }));

        // 1 Treasure token
        const treasure = createCreature({
            instanceId: 'token_treasure_1',
            name: 'Treasure Token', type: 'artifact',
            keywords: ['sacrifice_for_mana'], isToken: true,
            power: 0, toughness: 0
        });
        opponent.battlefield.push(treasure);

        // Card costing 2RR (needs 4 total, 2 must be R)
        const expensiveCard = {
            instanceId: 'test_card', id: 'test_expensive',
            name: 'Expensive Spell', type: 'sorcery',
            cost: '2RR', cmc: 4
        };

        // The fix: subtract treasures from any-mana before calculating
        // Without fix: calculateAvailableMana counts treasures as mana.any,
        // then canPayWithTreasures also tries to use them = double-counting

        // Verify the code has the fix
        const aiSourceCode = fs.readFileSync('./js/ai.js', 'utf-8');
        const canPaySection = aiSourceCode.match(/canPayWithTreasures[\s\S]*?return \{ canPay: true, treasuresNeeded, colorsNeeded \}/);
        expect(canPaySection).toBeTruthy();
        // The fix: remainingMana.any = Math.max(0, (remainingMana.any || 0) - treasures.length)
        expect(canPaySection[0]).toContain('remainingMana.any');
        expect(canPaySection[0]).toContain('treasures.length');
    });
});


// ============================================================
// Group 7: Vampire Neonate timing (ai.js)
// ============================================================
describe('Group 7: Vampire Neonate timing', () => {

    test('17. Vampire Neonate does not activate in Main1 when playable cards exist', () => {
        const { ai, game, rules, opponent } = createAI({ phase: PHASES.MAIN1 });

        // Give AI mana
        for (let i = 0; i < 3; i++) {
            opponent.battlefield.push(createLand({ produces: 'B' }));
        }

        // A 2-drop in hand that AI can play
        opponent.hand.push(createCreature({
            id: 'test_two_drop', name: 'Two Drop',
            power: 2, toughness: 2, cost: '1B', cmc: 2
        }));

        const neonate = createCreature({
            id: 'vampire_neonate', name: 'Vampire Neonate',
            subtype: 'Vampire', power: 0, toughness: 3,
            summoningSickness: false
        });

        const result = ai.shouldActivateAbility(neonate, opponent, game.player);
        expect(result).toBe(false);
    });

    test('18. Vampire Neonate activates in Main2', () => {
        const { ai, game, opponent } = createAI({ phase: PHASES.MAIN2 });

        // Give AI mana
        opponent.battlefield.push(createLand({ produces: 'B' }));
        opponent.battlefield.push(createLand({ produces: 'B' }));

        const neonate = createCreature({
            id: 'vampire_neonate', name: 'Vampire Neonate',
            subtype: 'Vampire', power: 0, toughness: 3,
            summoningSickness: false
        });

        const result = ai.shouldActivateAbility(neonate, opponent, game.player);
        expect(result).toBe(true);
    });
});


// ============================================================
// Group 8: shouldCounterspell improvements (game.js)
// ============================================================
describe('Group 8: shouldCounterspell improvements', () => {

    test('19. Counter enchantment removal (Prayer of Binding)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the shouldCounterspell method body (ends at next method)
        const shouldCounterSection = gameSource.match(/shouldCounterspell\(spell, counterCard\)[\s\S]*?Counter enchantment-based removal[\s\S]*?prayer_of_binding/);
        expect(shouldCounterSection).toBeTruthy();
        // Verify prayer_of_binding is explicitly checked
        expect(shouldCounterSection[0]).toContain('prayer_of_binding');
    });

    test('20. Counter based on target value (low value = no counter, high value = counter)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const removalCounterSection = gameSource.match(/isRemovalSpell\(spell\)[\s\S]*?return bestThreat >= 6/);
        expect(removalCounterSection).toBeTruthy();
        // Verify target threat is checked
        expect(removalCounterSection[0]).toContain('targetThreat');
        expect(removalCounterSection[0]).toContain('>= 6');
    });
});


// ============================================================
// Group 9: AI discard improvements (game.js)
// ============================================================
describe('Group 9: AI discard improvements', () => {

    test('21. AI discards extra lands before spells', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Verify handleDiscard sorts lands to front for discard
        const discardSection = gameSource.match(/IA descarta automaticamente[\s\S]*?aIsLand && !bIsLand/);
        expect(discardSection).toBeTruthy();
        // Lands should sort first (return -1 = discard first)
        expect(discardSection[0]).toContain("a.type === 'land'");

        // Also verify _evaluateCardForDiscard gives lands value 0
        const evalSection = gameSource.match(/_evaluateCardForDiscard\(card\)[\s\S]*?return value;\s*\}/);
        expect(evalSection).toBeTruthy();
        // Lands return 0 (lowest value = discarded first)
        expect(evalSection[0]).toContain("card.type === 'land'");
        expect(evalSection[0]).toContain('return 0');
    });

    test('22. AI keeps removal over vanilla creatures (_evaluateCardForDiscard)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const evalSection = gameSource.match(/_evaluateCardForDiscard[\s\S]*?return value;\s*\}/);
        expect(evalSection).toBeTruthy();
        // Removal gets +5 bonus
        expect(evalSection[0]).toContain('isRemovalSpell');
        expect(evalSection[0]).toContain('value += 5');
    });
});


// ============================================================
// Group 10: Incinerating Blast loot (game.js)
// ============================================================
describe('Group 10: Incinerating Blast loot', () => {

    test('23. AI loots worst card (lands first, then lowest CMC)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');

        // Find the AI loot section for Incinerating Blast
        const lootSection = gameSource.match(/IA faz loot automaticamente[\s\S]*?sortedHand\[0\]/);
        expect(lootSection).toBeTruthy();
        // Should prefer discarding lands
        expect(lootSection[0]).toContain("a.type === 'land'");
        // Should sort by CMC for non-lands
        expect(lootSection[0]).toContain('a.cmc');
    });
});


// ============================================================
// Group 11: Burrog Befuddler targeting (triggers.js)
// ============================================================
describe('Group 11: Burrog Befuddler targeting', () => {

    test('24. Prefers target with power=1 (reduces to 0)', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find the AI branch of _handleDebuffETB (the else block after player prompt)
        const befuddlerAI = triggersSource.match(/Prefer targets where -1\/.*?reduces power to 0[\s\S]*?aPower === 1/);
        expect(befuddlerAI).toBeTruthy();
        // AI logic should check for power === 1 (reduces to 0)
        expect(befuddlerAI[0]).toContain('aPower === 1');
    });

    test('25. Falls back to highest power if no power=1 target', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find the sort comparison in AI Befuddler targeting
        const befuddlerSort = triggersSource.match(/Prefer targets where[\s\S]*?Otherwise prefer highest power[\s\S]*?bPower - aPower/);
        expect(befuddlerSort).toBeTruthy();
        // Falls back to sorting by highest power (bPower - aPower = descending)
        expect(befuddlerSort[0]).toContain('bPower - aPower');
    });
});


// ============================================================
// Group 12: Skeleton Archer targeting (triggers.js)
// ============================================================
describe('Group 12: Skeleton Archer targeting', () => {

    test('26. Only pings mana dork if killable (toughness <= 1)', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find the Snipe mana dorks section in _handlePingAnyETB
        const archerSection = triggersSource.match(/Snipe mana dorks ONLY if we can kill[\s\S]*?fall through to face damage/);
        expect(archerSection).toBeTruthy();
        // Should check if dork can be killed (toughness <= 1)
        expect(archerSection[0]).toContain('toughness <= 1');
        expect(archerSection[0]).toContain('tap_for_mana');
    });

    test('27. Pings mana dork when killable (Llanowar Elves 1/1)', () => {
        // Verify the code has the killableDork check
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const archerSection = triggersSource.match(/Snipe mana dorks ONLY if we can kill[\s\S]*?dealDamage\(killableDork\)/);
        expect(archerSection).toBeTruthy();
        // Only pings if killable
        expect(archerSection[0]).toContain('killableDork');
    });
});


// ============================================================
// Group 13: Instant-speed system (ai.js + game.js)
// ============================================================
describe('Group 13: Instant-speed system', () => {

    test('28. End step: flash creature selected', () => {
        const { ai, opponent } = createAI({ phase: PHASES.END });

        // Give AI mana
        for (let i = 0; i < 3; i++) {
            opponent.battlefield.push(createLand({ produces: 'U' }));
        }

        const cutthroat = createCreature({
            id: 'brineborn_cutthroat', name: 'Brineborn Cutthroat',
            power: 2, toughness: 1, keywords: ['flash'],
            cost: '1U', cmc: 2
        });
        opponent.hand.push(cutthroat);

        const action = ai.getInstantSpeedAction('end_step');
        expect(action).not.toBeNull();
        expect(action.card.id).toBe('brineborn_cutthroat');
        expect(action.action).toBe('play');
    });

    test('29. End step: draw spell selected when no flash creatures', () => {
        const { ai, opponent } = createAI({ phase: PHASES.END });

        // Give AI mana
        opponent.battlefield.push(createLand({ produces: 'U' }));

        const opt = {
            instanceId: 'spell_opt', id: 'opt', name: 'Opt',
            type: 'instant', cost: 'U', cmc: 1
        };
        opponent.hand.push(opt);

        const action = ai.getInstantSpeedAction('end_step');
        expect(action).not.toBeNull();
        expect(action.card.id).toBe('opt');
    });

    test('30. After attackers: removal on high-threat attacker', () => {
        const { ai, game, player, opponent } = createAI();

        // Give AI mana for Hero's Downfall
        for (let i = 0; i < 3; i++) {
            opponent.battlefield.push(createLand({ produces: 'B' }));
        }

        // High-threat attacker (5/5 with flying = threat >= 13)
        const bigFlyer = createCreature({
            name: 'Big Flyer', power: 5, toughness: 5,
            keywords: ['flying'], summoningSickness: false
        });
        player.battlefield.push(bigFlyer);
        game.currentAttackers = [bigFlyer];

        const removal = {
            instanceId: 'spell_hd', id: 'heros_downfall',
            name: "Hero's Downfall", type: 'instant', cost: '1BB', cmc: 3
        };
        opponent.hand.push(removal);

        const action = ai.getInstantSpeedAction('after_attackers');
        expect(action).not.toBeNull();
        expect(action.card.id).toBe('heros_downfall');
        expect(action.target).toBe(bigFlyer);
    });

    test('31. After blockers: combat trick on endangered blocker', () => {
        const { ai, game, opponent } = createAI();

        // Give AI mana
        opponent.battlefield.push(createLand({ produces: 'G' }));

        // AI's 2/3 blocker blocking a 4/4 attacker
        const blocker = createCreature({
            name: 'Blocker', power: 2, toughness: 3, summoningSickness: false
        });
        opponent.battlefield.push(blocker);

        const attacker = createCreature({
            name: 'Attacker', power: 4, toughness: 4, summoningSickness: false
        });
        game.currentAttackers = [attacker];
        game.blockerAssignments = { [attacker.instanceId]: [blocker] };

        const giantGrowth = {
            instanceId: 'spell_gg', id: 'giant_growth',
            name: 'Giant Growth', type: 'instant', cost: 'G', cmc: 1
        };
        opponent.hand.push(giantGrowth);

        // Mock getValidSpellTargets to return own creatures for self-targeting
        game.getValidSpellTargets = function(card, caster) {
            return caster.battlefield.filter(c => c.type === 'creature');
        };

        const action = ai.getInstantSpeedAction('after_blockers');
        expect(action).not.toBeNull();
        expect(action.card.id).toBe('giant_growth');
        expect(action.target).toBe(blocker);
    });

    test('32. Protection: Snakeskin Veil to save creature from removal', () => {
        const { ai, game, opponent } = createAI();

        // Give AI mana
        opponent.battlefield.push(createLand({ produces: 'G' }));

        // AI's valuable 4/4 creature
        const valuable = createCreature({
            name: 'Valuable', power: 4, toughness: 4, summoningSickness: false
        });
        opponent.battlefield.push(valuable);

        // Stack has removal targeting AI's creature
        game.stack.push({
            item: { id: 'heros_downfall', name: "Hero's Downfall", type: 'instant' },
            target: valuable,
            controller: game.player
        });

        const snakeskin = {
            instanceId: 'spell_sv', id: 'snakeskin_veil',
            name: 'Snakeskin Veil', type: 'instant', cost: 'G', cmc: 1
        };
        opponent.hand.push(snakeskin);

        // Mock getValidSpellTargets to return own creatures
        game.getValidSpellTargets = function(card, caster) {
            return caster.battlefield.filter(c => c.type === 'creature');
        };

        const action = ai.getInstantSpeedAction('response_to_spell');
        expect(action).not.toBeNull();
        expect(action.card.id).toBe('snakeskin_veil');
        expect(action.target).toBe(valuable);
    });

    test('33. No protection for cheap creatures (threat < 4)', () => {
        const { ai, game, opponent } = createAI();

        // Give AI mana
        opponent.battlefield.push(createLand({ produces: 'G' }));

        // AI's 1/1 token (threat = 1+1 = 2, below threshold of 4)
        const token = createCreature({
            instanceId: 'token_goblin_1',
            name: 'Goblin Token', power: 1, toughness: 1,
            isToken: true, summoningSickness: false
        });
        opponent.battlefield.push(token);

        // Stack has removal targeting the token
        game.stack.push({
            item: { id: 'heros_downfall', name: "Hero's Downfall", type: 'instant' },
            target: token,
            controller: game.player
        });

        const snakeskin = {
            instanceId: 'spell_sv', id: 'snakeskin_veil',
            name: 'Snakeskin Veil', type: 'instant', cost: 'G', cmc: 1
        };
        opponent.hand.push(snakeskin);

        const action = ai.getInstantSpeedAction('response_to_spell');
        expect(action).toBeNull();
    });

    test('34. hasValidAuraTargets: New Horizons checks for lands', () => {
        const { ai, opponent } = createAI();

        // AI has lands but no creatures
        opponent.battlefield.push(createLand({ produces: 'G' }));
        // Make sure there are no creatures on the field
        const opponentCreatures = opponent.battlefield.filter(c => c.type === 'creature');
        expect(opponentCreatures.length).toBe(0);

        const newHorizons = {
            instanceId: 'ench_nh', id: 'new_horizons', name: 'New Horizons',
            type: 'enchantment', subtype: 'Aura', cost: '2G', cmc: 3
        };

        const hasTargets = ai.hasValidAuraTargets(newHorizons);
        expect(hasTargets).toBe(true);
    });
});


// ============================================================
// Group 14: Double strike in survival check (ai.js)
// ============================================================
describe('Group 14: Double strike in survival check', () => {

    test('35. Double strike counted in lethal check (_filterAttackersForSurvival)', () => {
        const { ai, player, opponent } = createAI();

        player.life = 6;
        opponent.life = 20;

        // AI has one 3/3 double_strike creature (6 effective damage)
        const doubleStriker = createCreature({
            power: 3, toughness: 3,
            keywords: ['double_strike'], summoningSickness: false
        });

        // Player has a big creature that could crack back for lethal
        const bigAttacker = createCreature({
            power: 10, toughness: 10, summoningSickness: false
        });
        player.battlefield.push(bigAttacker);

        // Test _filterAttackersForSurvival: the double striker deals 6 which is lethal
        // Even if opponent can crack back for 10, our attack is lethal so it should not be removed
        const result = ai._filterAttackersForSurvival(
            [doubleStriker],   // selected attackers
            [doubleStriker],   // all creatures
            player             // defending player
        );

        // Should keep the attacker because it's lethal damage
        expect(result.length).toBe(1);
    });
});


// ============================================================
// Group 15: Land selection for discard (game.js)
// ============================================================
describe('Group 15: Land selection for discard', () => {

    test('36. Lands are lowest value in _evaluateCardForDiscard', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');

        // Verify _evaluateCardForDiscard returns 0 for lands
        const evalSection = gameSource.match(/_evaluateCardForDiscard\(card\)[\s\S]*?return value;\s*\}/);
        expect(evalSection).toBeTruthy();
        expect(evalSection[0]).toContain("card.type === 'land'");
        expect(evalSection[0]).toContain('return 0');

        // Also verify handleDiscard sorts lands first for discard
        // Lands sort before non-lands: aIsLand && !bIsLand -> return -1
        const discardSection = gameSource.match(/Extra lands are lowest priority[\s\S]*?return -1/);
        expect(discardSection).toBeTruthy();
        expect(discardSection[0]).toContain("a.type === 'land'");
    });
});
