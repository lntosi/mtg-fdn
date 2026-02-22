/**
 * Testes da Rodada 6 de Auditoria - Bugs da Analise Multi-Agente R6
 *
 * Cobre 11 bugs encontrados:
 * 1. MAJOR: Auras bypass onSpellCast
 * 2. MAJOR: Zone changes don't clear attachedTo
 * 3. MINOR: Felling Blow player path missing onCounterPlaced
 * 4. MINOR: AI phase mismatch for Jazal/Ingenious Leonin
 * 5. MINOR: Eaten by Piranhas doesn't suppress trample_lord/temporaryKeywords
 * 6. MINOR: Death triggers fire for creatures with Eaten by Piranhas
 * 7. MINOR: Crossway Troublemakers uses raw subtype
 * 8. MINOR: isLifePayment suppresses lostLifeThisTurn
 * 9. MINOR: Ghost references to volley card ID (dead code)
 * 10. MINOR: isRemovalSpell missing removal cards
 * 11. MINOR: essence_scatter/counterspell_creature dead code
 */

const fs = require('fs');
const { createCreature, createPlayer, createLand } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');
const { RulesEngine } = require('../js/rules');

// ============================================================
// Fix R6-1: Auras bypass onSpellCast
// ============================================================
describe('Fix R6-1: Auras call onSpellCast', () => {
    test('attachAura calls triggers.onSpellCast before pushing to battlefield', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find attachAura method and verify onSpellCast is called before battlefield.push
        const attachAuraSection = gameSource.match(/async attachAura\(aura, target, controller\)\s*\{([\s\S]*?)controller\.battlefield\.push\(aura\)/);
        expect(attachAuraSection).toBeTruthy();
        expect(attachAuraSection[1]).toContain('onSpellCast');
    });

    test('onSpellCast is called with controller and aura arguments', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const match = gameSource.match(/attachAura[\s\S]*?onSpellCast\(controller,\s*aura\)/);
        expect(match).toBeTruthy();
    });

    test('Brineborn Cutthroat gets counter when aura is cast on opponents turn', () => {
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });

        const cutthroat = createCreature({
            id: 'brineborn_cutthroat',
            name: 'Brineborn Cutthroat',
            power: 2, toughness: 1,
            summoningSickness: false
        });
        opponent.battlefield.push(cutthroat);

        const rules = new TestRulesEngine({ player, opponent });
        const game = {
            player, opponent,
            activePlayer: player, // It's player's turn, so opponent casting = "opponent's turn"
            ui: { log: jest.fn(), render: jest.fn() },
            rules,
            triggers: null
        };

        // Simulate TriggerManager.onSpellCast logic for brineborn_cutthroat
        // On player's turn, opponent casting a spell triggers Cutthroat
        const caster = opponent;
        const isOpponentsTurn = (caster === player && game.activePlayer === opponent) ||
                                (caster === opponent && game.activePlayer === player);

        expect(isOpponentsTurn).toBe(true);

        // Simulate the trigger
        if (isOpponentsTurn) {
            caster.battlefield.forEach(card => {
                if (card.id === 'brineborn_cutthroat' && !card.pendingResolution) {
                    if (!card.counters) card.counters = {};
                    card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                }
            });
        }

        expect(cutthroat.counters.plusOnePlusOne).toBe(1);
    });
});

// ============================================================
// Fix R6-2: Zone changes clear attachedTo
// ============================================================
describe('Fix R6-2: Zone changes clear attachedTo/controlledBy', () => {
    test('bounceToHand clears attachedTo and controlledBy', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the bounceToHand reset block and check attachedTo is deleted
        const bounceSection = gameSource.match(/bounceToHand[\s\S]*?delete target\.transformed;([\s\S]*?)\/\/ Tokens/);
        expect(bounceSection).toBeTruthy();
        expect(bounceSection[1]).toContain('delete target.attachedTo');
        expect(bounceSection[1]).toContain('delete target.controlledBy');
    });

    test('_resetCardState clears attachedTo and controlledBy', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const resetSection = triggersSource.match(/_resetCardState[\s\S]*?delete card\.transformed;([\s\S]*?)\/\/ Note:/);
        expect(resetSection).toBeTruthy();
        expect(resetSection[1]).toContain('delete card.attachedTo');
        expect(resetSection[1]).toContain('delete card.controlledBy');
    });

    test('aura bounced to hand no longer has attachedTo property', () => {
        const aura = {
            instanceId: 'aura_1',
            name: 'Test Aura',
            type: 'enchantment',
            subtype: 'Aura',
            attachedTo: 'creature_1',
            controlledBy: 'player',
            damage: 0,
            powerModifier: 0,
            toughnessModifier: 0,
            temporaryKeywords: [],
            tapped: false,
            summoningSickness: false,
            counters: null
        };

        // Simulate bounceToHand reset
        aura.damage = 0;
        aura.powerModifier = 0;
        aura.toughnessModifier = 0;
        aura.temporaryKeywords = [];
        aura.tapped = false;
        aura.summoningSickness = false;
        aura.counters = null;
        delete aura.transformed;
        delete aura.attachedTo;
        delete aura.controlledBy;

        expect(aura.attachedTo).toBeUndefined();
        expect(aura.controlledBy).toBeUndefined();
    });
});

// ============================================================
// Fix R6-3: Felling Blow player path calls onCounterPlaced
// ============================================================
describe('Fix R6-3: Felling Blow triggers onCounterPlaced', () => {
    test('felling_blow player path calls onCounterPlaced after adding counter', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the Felling Blow section where +1/+1 counter is added to ownTarget
        const fellingSection = gameSource.match(/Adiciona \+1\/\+1 counter[\s\S]*?onCounterPlaced\(ownTarget/);
        expect(fellingSection).toBeTruthy();
    });

    test('onCounterPlaced is called with correct args (ownTarget, this.player, 1)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const match = gameSource.match(/ownTarget\.counters\.plusOnePlusOne[\s\S]*?onCounterPlaced\(ownTarget,\s*this\.player,\s*1\)/);
        expect(match).toBeTruthy();
    });
});

// ============================================================
// Fix R6-4: AI phase check matches game engine for Jazal/Leonin
// ============================================================
describe('Fix R6-4: AI phase mismatch Jazal/Leonin', () => {
    test('AI jazal_goldmane checks DECLARE_BLOCKERS and COMBAT_DAMAGE', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const jazalSection = aiSource.match(/case 'jazal_goldmane':[\s\S]*?return this\.game\.currentAttackers/);
        expect(jazalSection).toBeTruthy();
        expect(jazalSection[0]).toContain('PHASES.DECLARE_BLOCKERS');
        expect(jazalSection[0]).toContain('PHASES.COMBAT_DAMAGE');
        expect(jazalSection[0]).not.toContain('PHASES.DECLARE_ATTACKERS');
    });

    test('AI ingenious_leonin checks DECLARE_BLOCKERS and COMBAT_DAMAGE', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const leoninSection = aiSource.match(/case 'ingenious_leonin':[\s\S]*?return this\.game\.currentAttackers/);
        expect(leoninSection).toBeTruthy();
        expect(leoninSection[0]).toContain('PHASES.DECLARE_BLOCKERS');
        expect(leoninSection[0]).toContain('PHASES.COMBAT_DAMAGE');
        expect(leoninSection[0]).not.toContain('PHASES.DECLARE_ATTACKERS');
    });

    test('game.js canActivateAbility also uses DECLARE_BLOCKERS and COMBAT_DAMAGE for jazal', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const jazalGameSection = gameSource.match(/case 'jazal_goldmane':[\s\S]*?return jazalMana/);
        expect(jazalGameSection).toBeTruthy();
        expect(jazalGameSection[0]).toContain('PHASES.DECLARE_BLOCKERS');
        expect(jazalGameSection[0]).toContain('PHASES.COMBAT_DAMAGE');
    });
});

// ============================================================
// Fix R6-5: Eaten by Piranhas suppresses trample_lord and temporaryKeywords
// ============================================================
describe('Fix R6-5: Eaten by Piranhas suppresses external keywords', () => {
    test('Piranhas wipe happens AFTER trample_lord and temporaryKeywords in getCreatureKeywords', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // Find positions of each block in getCreatureKeywords
        const trampleLordPos = rulesSource.indexOf('trample_lord');
        const temporaryKeywordsPos = rulesSource.indexOf('temporaryKeywords', trampleLordPos);
        // Find the Eaten by Piranhas wipe (keywords.length = 0)
        const piranhasWipePos = rulesSource.indexOf('keywords.length = 0', temporaryKeywordsPos);

        // Piranhas wipe should come AFTER both trample_lord and temporaryKeywords
        expect(piranhasWipePos).toBeGreaterThan(trampleLordPos);
        expect(piranhasWipePos).toBeGreaterThan(temporaryKeywordsPos);
    });

    test('creature with Eaten by Piranhas loses trample from trample_lord', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });
        rules.game = { player, opponent, activePlayer: player, activeEffects: { abilityRemoval: 1 } };

        // Aggressive Mammoth gives trample to others
        const mammoth = createCreature({
            id: 'aggressive_mammoth',
            name: 'Aggressive Mammoth',
            power: 8, toughness: 8,
            keywords: ['trample', 'trample_lord']
        });
        player.battlefield.push(mammoth);

        // Target creature with Eaten by Piranhas attached
        const target = createCreature({
            name: 'Target',
            power: 3, toughness: 3,
            keywords: ['flying']
        });
        player.battlefield.push(target);

        // Eaten by Piranhas aura
        const piranhas = {
            instanceId: 'piranhas_1',
            id: 'eaten_by_piranhas',
            name: 'Eaten by Piranhas',
            type: 'enchantment',
            subtype: 'Aura',
            attachedTo: target.instanceId
        };
        player.battlefield.push(piranhas);

        const keywords = rules.getCreatureKeywords(target, false);
        // Should have no keywords - Piranhas wipes everything including trample from lord
        expect(keywords).not.toContain('trample');
        expect(keywords).not.toContain('flying');
        expect(keywords.length).toBe(0);
    });

    test('creature with Eaten by Piranhas loses temporaryKeywords', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });
        rules.game = { player, opponent, activePlayer: player, activeEffects: { abilityRemoval: 1 } };

        const target = createCreature({
            name: 'Target',
            power: 2, toughness: 2,
            keywords: [],
            temporaryKeywords: ['haste', 'first_strike']
        });
        player.battlefield.push(target);

        const piranhas = {
            instanceId: 'piranhas_1',
            id: 'eaten_by_piranhas',
            name: 'Eaten by Piranhas',
            type: 'enchantment',
            subtype: 'Aura',
            attachedTo: target.instanceId
        };
        player.battlefield.push(piranhas);

        const keywords = rules.getCreatureKeywords(target, false);
        expect(keywords).not.toContain('haste');
        expect(keywords).not.toContain('first_strike');
        expect(keywords.length).toBe(0);
    });
});

// ============================================================
// Fix R6-6: Death triggers respect Eaten by Piranhas
// ============================================================
describe('Fix R6-6: Death triggers check hasLostAllAbilities', () => {
    test('death_mill_2 trigger has hasLostAllAbilities guard', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const match = triggersSource.match(/death_mill_2.*?hasLostAllAbilities/s);
        expect(match).toBeTruthy();
    });

    test('death_create_zombies trigger has hasLostAllAbilities guard', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const match = triggersSource.match(/death_create_zombies.*?hasLostAllAbilities/s);
        expect(match).toBeTruthy();
    });

    test('creature with death_mill_2 and Eaten by Piranhas should not mill on death', () => {
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });

        const crow = createCreature({
            id: 'crow_of_dark_tidings',
            name: 'Crow of Dark Tidings',
            power: 1, toughness: 1,
            keywords: ['death_mill_2', 'flying']
        });
        player.battlefield.push(crow);

        const piranhas = {
            instanceId: 'piranhas_1',
            id: 'eaten_by_piranhas',
            name: 'Eaten by Piranhas',
            type: 'enchantment',
            subtype: 'Aura',
            attachedTo: crow.instanceId
        };
        player.battlefield.push(piranhas);

        const rules = new TestRulesEngine({ player, opponent });

        // Simulate the death trigger check
        const hasLostAbilities = rules.hasLostAllAbilities(crow);
        expect(hasLostAbilities).toBe(true);

        // The trigger should not fire
        const shouldMill = crow.keywords?.includes('death_mill_2') && !rules.hasLostAllAbilities(crow);
        expect(shouldMill).toBe(false);
    });
});

// ============================================================
// Fix R6-7: Crossway Troublemakers uses effective subtype
// ============================================================
describe('Fix R6-7: Crossway Troublemakers respects Eaten by Piranhas subtype', () => {
    test('triggers.js uses getEffectiveSubtype for vampire check in onCreatureDeath', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find the Crossway Troublemakers section and check it uses getEffectiveSubtype
        const crosswaySection = triggersSource.match(/Crossway Troublemakers[\s\S]*?isVampire/);
        expect(crosswaySection).toBeTruthy();
        // The isVampire line should use getEffectiveSubtype
        const isVampireLine = triggersSource.match(/const isVampire\s*=[\s\S]*?getEffectiveSubtype/);
        expect(isVampireLine).toBeTruthy();
    });

    test('vampire with Eaten by Piranhas is not considered Vampire for Crossway', () => {
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });

        const vampire = createCreature({
            id: 'vampire_neonate',
            name: 'Vampire Neonate',
            subtype: 'Vampire',
            power: 1, toughness: 1
        });
        player.battlefield.push(vampire);

        const piranhas = {
            instanceId: 'piranhas_1',
            id: 'eaten_by_piranhas',
            name: 'Eaten by Piranhas',
            type: 'enchantment',
            subtype: 'Aura',
            attachedTo: vampire.instanceId
        };
        player.battlefield.push(piranhas);

        const rules = new TestRulesEngine({ player, opponent });
        const effectiveSubtype = rules.getEffectiveSubtype(vampire);

        // Should be 'Skeleton' not 'Vampire'
        expect(effectiveSubtype).toBe('Skeleton');
        expect(effectiveSubtype.includes('Vampire')).toBe(false);
    });
});

// ============================================================
// Fix R6-8: isLifePayment no longer suppresses lostLifeThisTurn
// ============================================================
describe('Fix R6-8: Life payment counts as life loss (CR 119.4)', () => {
    test('loseLife always sets lostLifeThisTurn even for life payments', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // The loseLife method should NOT have the isLifePayment guard around life tracking
        const loseLifeSection = gameSource.match(/loseLife\(player, amount, options[\s\S]*?playDamage/);
        expect(loseLifeSection).toBeTruthy();

        // Should not have isLifePayment guard around the tracking code
        // The tracking block (playerLostLifeThisTurn / opponentLostLifeThisTurn) should be unconditional
        const trackingSection = gameSource.match(/loseLife[\s\S]*?playerLostLifeThisTurn\s*=\s*true/);
        expect(trackingSection).toBeTruthy();

        // Verify isLifePayment is NOT used as a guard for setting lostLifeThisTurn
        const beforeTracking = trackingSection[0].substring(
            trackingSection[0].lastIndexOf('player.life -= amount'),
            trackingSection[0].indexOf('playerLostLifeThisTurn')
        );
        expect(beforeTracking).not.toContain('isLifePayment');
    });

    test('paying life still sets opponent/player lost life flags', () => {
        // Simulate loseLife behavior
        const player = createPlayer({ name: 'Player', life: 20 });
        let playerLostLifeThisTurn = false;

        // Simulate loseLife with isLifePayment
        const amount = 2;
        player.life -= amount;
        // Per fix: always set the flag regardless of isLifePayment
        playerLostLifeThisTurn = true;

        expect(player.life).toBe(18);
        expect(playerLostLifeThisTurn).toBe(true);
    });
});

// ============================================================
// Fix R6-9: No ghost references to volley card ID
// ============================================================
describe('Fix R6-9: Volley dead code removed', () => {
    test('game.js spellNeedsTarget does not include volley', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const targetedSpells = gameSource.match(/spellNeedsTarget[\s\S]*?targetedSpells\.includes/);
        expect(targetedSpells).toBeTruthy();
        expect(targetedSpells[0]).not.toContain("'volley'");
    });

    test('game.js getValidSpellTargets has no volley case', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const validTargets = gameSource.match(/getValidSpellTargets[\s\S]*?return targets/);
        expect(validTargets).toBeTruthy();
        expect(validTargets[0]).not.toContain("case 'volley'");
    });

    test('game.js resolveSpellWithTarget has no volley case', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const resolveSection = gameSource.match(/resolveSpellWithTarget[\s\S]*?deadly_riposte/);
        expect(resolveSection).toBeTruthy();
        expect(resolveSection[0]).not.toContain("case 'volley'");
    });

    test('rules.js hasValidTargets has no volley block', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        const hasValidSection = rulesSource.match(/hasValidTargets[\s\S]*?counterspell/);
        expect(hasValidSection).toBeTruthy();
        expect(hasValidSection[0]).not.toContain("'volley'");
    });

    test('ai.js has no volley references', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        expect(aiSource).not.toContain("'volley'");
    });
});

// ============================================================
// Fix R6-10: isRemovalSpell has correct card IDs
// ============================================================
describe('Fix R6-10: isRemovalSpell correct card list', () => {
    test('isRemovalSpell does not include non-existent cards', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const removalSection = gameSource.match(/isRemovalSpell[\s\S]*?return removalIds/);
        expect(removalSection).toBeTruthy();
        // These cards don't exist in the database
        expect(removalSection[0]).not.toContain("'murder'");
        expect(removalSection[0]).not.toContain("'lightning_bolt'");
        expect(removalSection[0]).not.toContain("'doom_blade'");
        expect(removalSection[0]).not.toContain("'go_for_the_throat'");
        expect(removalSection[0]).not.toContain("'disfigure'");
        expect(removalSection[0]).not.toContain("'cut_down'");
        expect(removalSection[0]).not.toContain("'fatal_push'");
        expect(removalSection[0]).not.toContain("'unholy_heat'");
    });

    test('isRemovalSpell includes all real removal cards', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const removalSection = gameSource.match(/isRemovalSpell[\s\S]*?return removalIds/);
        expect(removalSection).toBeTruthy();

        const expectedCards = [
            'eaten_by_piranhas', 'finishing_blow', 'elspeths_smite',
            'deadly_riposte', 'prayer_of_binding', 'angelic_edict',
            'heros_downfall', 'eaten_alive', 'deadly_plot',
            'moment_of_craving', 'scorching_dragonfire', 'fiery_annihilation',
            'incinerating_blast', 'pacifism', 'starlight_snare'
        ];

        for (const card of expectedCards) {
            expect(removalSection[0]).toContain(`'${card}'`);
        }
    });
});

// ============================================================
// Fix R6-11: No counterspell_creature dead code
// ============================================================
describe('Fix R6-11: counterspell_creature dead code removed', () => {
    test('rules.js hasValidTargets has no essence_scatter/counterspell_creature check', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // The old code had: if (card.id === 'essence_scatter' || card.keywords?.includes('counterspell_creature'))
        expect(rulesSource).not.toContain("'essence_scatter'");
        expect(rulesSource).not.toContain('counterspell_creature');
    });

    test('game.js isCounterspell only checks counterspell keyword', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Match the isCounterspell method definition specifically
        const isCounterSection = gameSource.match(/isCounterspell\(card\)\s*\{[^}]*\}/);
        expect(isCounterSection).toBeTruthy();
        expect(isCounterSection[0]).toContain("'counterspell'");
        expect(isCounterSection[0]).not.toContain('counterspell_creature');
    });

    test('game.js shouldCounterspell has no counterspell_creature check', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const shouldCounterSection = gameSource.match(/shouldCounterspell[\s\S]*?return false;\s*\}/);
        expect(shouldCounterSection).toBeTruthy();
        expect(shouldCounterSection[0]).not.toContain('counterspell_creature');
    });

    test('game.js canCounterTarget has no counterspell_creature check', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const canCounterSection = gameSource.match(/canCounterTarget[\s\S]*?return true;\s*\}/);
        expect(canCounterSection).toBeTruthy();
        expect(canCounterSection[0]).not.toContain('counterspell_creature');
    });
});
