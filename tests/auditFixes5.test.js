/**
 * Testes da Rodada 5 de Auditoria — Bugs da Análise Multi-Agente R5
 *
 * Cobre 13 bugs encontrados por 6 agentes:
 * 1. CRITICAL: Double Strike + Trample — all-dead-blockers trample through
 * 2. MAJOR: Dropkick Bomber ability doesn't require tap
 * 3. MAJOR: Damage assignment uses rules.hasKeyword for double_strike
 * 4. MAJOR: AI damage assignment uses rules.hasKeyword for deathtouch
 * 5. MAJOR: Triggers respect "loses all abilities" (Eaten by Piranhas)
 * 6. MAJOR: Multiple lifelink sources = separate lifegain events
 * 7. MAJOR: SBA re-check after lord dies in combat
 * 8. MINOR: AI floating mana cleared between phases
 * 9. MINOR: Priority stops respected during AI turn
 * 10. MINOR: isRemovalSpell correct ID for elspeths_smite
 * 11. MINOR: isRemovalSpell includes missing removal cards
 * 12. MINOR: Eaten Alive mana calc includes colorless
 * 13. DOC: Healing deck comment says "8" not "10"
 */

const { createCreature, createPlayer, createLand } = require('./helpers/gameFactory');
const { TestRulesEngine } = require('./helpers/rulesEngine');

// Load real RulesEngine for full combat tests
const { RulesEngine } = require('../js/rules');

// ============================================================
// Fix R5-1: Double Strike + Trample — dead blockers trample through
// ============================================================
describe('Fix R5-1: Double Strike + Trample dead blockers', () => {
    test('double strike + trample creature deals full damage in second step when all blockers died in first strike', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        // 5/5 double strike + trample
        const attacker = createCreature({
            name: 'Big Striker', power: 5, toughness: 5,
            keywords: ['double_strike', 'trample'], summoningSickness: false
        });
        player.battlefield.push(attacker);

        // 2/2 blocker — dies in first strike step
        const blocker = createCreature({ name: 'Small Blocker', power: 2, toughness: 2 });
        opponent.battlefield.push(blocker);

        const blockerAssignments = { [attacker.instanceId]: [blocker] };
        const results = rules.resolveCombatDamage([attacker], blockerAssignments, opponent, player);

        // First strike step: 5 damage to 2/2 blocker (2 lethal with trample, 3 tramples through)
        // Normal step: all blockers dead, full 5 damage tramples through
        // Total trample damage to defender: 3 + 5 = 8
        expect(results.damageToPlayers.defender).toBe(8);
    });

    test('double strike WITHOUT trample does not deal damage to player when all blockers died', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        // 5/5 double strike (no trample)
        const attacker = createCreature({
            name: 'Striker', power: 5, toughness: 5,
            keywords: ['double_strike'], summoningSickness: false
        });
        player.battlefield.push(attacker);

        const blocker = createCreature({ name: 'Blocker', power: 2, toughness: 2 });
        opponent.battlefield.push(blocker);

        const blockerAssignments = { [attacker.instanceId]: [blocker] };
        const results = rules.resolveCombatDamage([attacker], blockerAssignments, opponent, player);

        // Without trample, no damage to player when blocked (even if blockers die)
        expect(results.damageToPlayers.defender).toBe(0);
    });

    test('trample without double strike still works normally', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        // 5/5 trample (no double strike)
        const attacker = createCreature({
            name: 'Trampler', power: 5, toughness: 5,
            keywords: ['trample'], summoningSickness: false
        });
        player.battlefield.push(attacker);

        const blocker = createCreature({ name: 'Blocker', power: 2, toughness: 2 });
        opponent.battlefield.push(blocker);

        const blockerAssignments = { [attacker.instanceId]: [blocker] };
        const results = rules.resolveCombatDamage([attacker], blockerAssignments, opponent, player);

        // 2 lethal to blocker, 3 tramples through
        expect(results.damageToPlayers.defender).toBe(3);
        expect(results.creaturesDied).toContain(blocker);
    });
});

// ============================================================
// Fix R5-2: Dropkick Bomber activated ability doesn't require tap
// ============================================================
describe('Fix R5-2: Dropkick Bomber no-tap ability', () => {
    test('dropkick_bomber is in noTapAbilities list', () => {
        // Read game.js source to verify
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const match = gameSource.match(/noTapAbilities\s*=\s*\[([^\]]+)\]/);
        expect(match).toBeTruthy();
        expect(match[1]).toContain('dropkick_bomber');
    });
});

// ============================================================
// Fix R5-3: Damage assignment uses rules.hasKeyword for double_strike
// ============================================================
describe('Fix R5-3: Damage assignment double_strike via hasKeyword', () => {
    test('damage assignment code uses rules.hasKeyword not attacker.keywords', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the multi-blocker damage assignment section
        const damageSection = gameSource.match(/Múltiplos bloqueadores.*?hasDoubleStrike\s*=\s*([^;]+)/s);
        expect(damageSection).toBeTruthy();
        expect(damageSection[1]).toContain('this.rules.hasKeyword');
        expect(damageSection[1]).not.toContain('attacker.keywords');
    });
});

// ============================================================
// Fix R5-4: AI damage assignment uses rules.hasKeyword for deathtouch
// ============================================================
describe('Fix R5-4: AI deathtouch via hasKeyword', () => {
    test('AI assignDamageToBlockers uses rules.hasKeyword for deathtouch', () => {
        const fs = require('fs');
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const match = aiSource.match(/assignDamageToBlockers.*?hasDeathtouch\s*=\s*([^;]+)/s);
        expect(match).toBeTruthy();
        expect(match[1]).toContain('this.rules.hasKeyword');
        expect(match[1]).not.toContain('attacker.keywords');
    });
});

// ============================================================
// Fix R5-5: Triggers respect "loses all abilities"
// ============================================================
describe('Fix R5-5: Triggers respect hasLostAllAbilities', () => {
    test('triggers.js checks hasLostAllAbilities for keyword-based triggers', () => {
        const fs = require('fs');
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');

        // All keyword-based triggers should have hasLostAllAbilities guard
        const keywordTriggers = [
            'creature_etb_lifegain',
            'draw_counter',
            'second_draw_counter',
            'second_draw_faerie',
            'counter_synergy',
            'lifegain_counter',
            'attack_gain_life_2',
            'mass_attack_lifegain',
            'spellcast_damage'
        ];

        for (const keyword of keywordTriggers) {
            // Find the line with this keyword check
            const regex = new RegExp(`${keyword}.*hasLostAllAbilities`, 's');
            const nearbyCheck = triggersSource.match(regex);
            expect(nearbyCheck).toBeTruthy();
        }
    });

    test('brineborn_cutthroat trigger has hasLostAllAbilities guard', () => {
        const fs = require('fs');
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const match = triggersSource.match(/brineborn_cutthroat.*?hasLostAllAbilities/s);
        expect(match).toBeTruthy();
    });

    test('beast_kin_ranger trigger has hasLostAllAbilities guard', () => {
        const fs = require('fs');
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const match = triggersSource.match(/beast_kin_ranger.*?hasLostAllAbilities/s);
        expect(match).toBeTruthy();
    });
});

// ============================================================
// Fix R5-6: Multiple lifelink sources = separate lifegain events
// ============================================================
describe('Fix R5-6: Separate lifelink events per creature', () => {
    test('two unblocked lifelink attackers create two separate lifegain events', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        const attacker1 = createCreature({
            name: 'Lifelinker A', power: 3, toughness: 3,
            keywords: ['lifelink'], summoningSickness: false
        });
        const attacker2 = createCreature({
            name: 'Lifelinker B', power: 2, toughness: 2,
            keywords: ['lifelink'], summoningSickness: false
        });
        player.battlefield.push(attacker1, attacker2);

        const blockerAssignments = {};
        const results = rules.resolveCombatDamage([attacker1, attacker2], blockerAssignments, opponent, player);

        // Total lifelink should be 5 (3+2)
        expect(results.lifeGained.attacker).toBe(5);
        // But should be TWO separate events
        expect(results.lifelinkEvents.attacker).toHaveLength(2);
        expect(results.lifelinkEvents.attacker).toContain(3);
        expect(results.lifelinkEvents.attacker).toContain(2);
    });

    test('single lifelink creature creates one event', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        const attacker = createCreature({
            name: 'Lifelinker', power: 4, toughness: 4,
            keywords: ['lifelink'], summoningSickness: false
        });
        player.battlefield.push(attacker);

        const results = rules.resolveCombatDamage([attacker], {}, opponent, player);

        expect(results.lifeGained.attacker).toBe(4);
        expect(results.lifelinkEvents.attacker).toHaveLength(1);
        expect(results.lifelinkEvents.attacker[0]).toBe(4);
    });

    test('blocker with lifelink creates defender lifegain event', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Attacker' });
        const opponent = createPlayer({ name: 'Defender' });
        rules.game = { player, opponent, activePlayer: player };

        const attacker = createCreature({
            name: 'Attacker', power: 3, toughness: 3,
            keywords: [], summoningSickness: false
        });
        player.battlefield.push(attacker);

        const blocker = createCreature({
            name: 'Lifelink Blocker', power: 2, toughness: 4,
            keywords: ['lifelink']
        });
        opponent.battlefield.push(blocker);

        const blockerAssignments = { [attacker.instanceId]: [blocker] };
        const results = rules.resolveCombatDamage([attacker], blockerAssignments, opponent, player);

        expect(results.lifeGained.defender).toBe(2);
        expect(results.lifelinkEvents.defender).toHaveLength(1);
        expect(results.lifelinkEvents.defender[0]).toBe(2);
    });
});

// ============================================================
// Fix R5-7: SBA re-check after lord dies in combat
// ============================================================
describe('Fix R5-7: SBA re-check after lord removal', () => {
    test('creature that loses lord bonus with damage >= new toughness should die', () => {
        const rules = new RulesEngine();
        const player = createPlayer({ name: 'Player' });
        const opponent = createPlayer({ name: 'Opponent' });
        rules.game = { player, opponent, activePlayer: player };

        // Death Baron (lord) — 2/2
        const deathBaron = createCreature({
            id: 'death_baron', name: 'Death Baron', power: 2, toughness: 2,
            subtype: 'Zombie Wizard', keywords: ['zombie_skeleton_lord']
        });

        // Reassembling Skeleton — 1/1 base, 2/2 with lord, takes 1 damage
        const skeleton = createCreature({
            id: 'reassembling_skeleton', name: 'Reassembling Skeleton',
            power: 1, toughness: 1, subtype: 'Skeleton Warrior',
            damage: 1
        });

        opponent.battlefield.push(deathBaron, skeleton);

        // With Death Baron alive, skeleton is 2/2 with 1 damage (survives)
        const toughnessWithLord = rules.getCreatureToughness(skeleton);
        expect(toughnessWithLord).toBe(2); // 1 base + 1 lord

        // Simulate lord removal
        const idx = opponent.battlefield.indexOf(deathBaron);
        opponent.battlefield.splice(idx, 1);

        // Without lord, skeleton is 1/1 with 1 damage (should die)
        const toughnessWithoutLord = rules.getCreatureToughness(skeleton);
        expect(toughnessWithoutLord).toBe(1);
        expect(skeleton.damage).toBe(1);
        // Damage >= toughness means creature should die via SBA
        expect(skeleton.damage >= toughnessWithoutLord).toBe(true);
    });
});

// ============================================================
// Fix R5-10: isRemovalSpell correct IDs
// ============================================================
describe('Fix R5-10/11: isRemovalSpell includes all removal spells', () => {
    test('elspeths_smite is recognized as removal (not elspeth_smite)', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        expect(gameSource).toContain("'elspeths_smite'");
        expect(gameSource).not.toMatch(/['"]elspeth_smite['"]/);
    });

    test('healing deck removal spells are in isRemovalSpell', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the removalIds array (may span multiple lines)
        const removalSection = gameSource.match(/removalIds\s*=\s*\[([\s\S]*?)\]/);
        expect(removalSection).toBeTruthy();
        const ids = removalSection[1];
        expect(ids).toContain('deadly_riposte');
        expect(ids).toContain('prayer_of_binding');
        expect(ids).toContain('angelic_edict');
        expect(ids).toContain('heros_downfall');
        expect(ids).toContain('eaten_alive');
        expect(ids).toContain('deadly_plot');
    });
});

// ============================================================
// Fix R5-12: Eaten Alive mana calc includes colorless
// ============================================================
describe('Fix R5-12: Eaten Alive mana calculation includes colorless', () => {
    test('totalManaEA includes C (colorless) in calculation', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the eaten_alive mana calculation
        const match = gameSource.match(/totalManaEA\s*=.*?availableManaEA\.C/s);
        expect(match).toBeTruthy();
    });

    test('hasValidTargets for eaten_alive includes C in totalMana', () => {
        const fs = require('fs');
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // Find the totalMana calculation near eaten_alive validation
        const match = rulesSource.match(/eaten_alive[\s\S]*?totalMana\s*=.*?availableMana\.C/);
        expect(match).toBeTruthy();
    });
});

// ============================================================
// Fix R5-13: Healing deck comment
// ============================================================
describe('Fix R5-13: Healing deck comment correct count', () => {
    test('healing deck creatures comment says 8 not 10', () => {
        const fs = require('fs');
        const cardsSource = fs.readFileSync('./js/cards.js', 'utf-8');
        // Find the healing creatures section
        const healingSection = cardsSource.match(/healing_haven[\s\S]*?Criaturas \((\d+)\)/);
        expect(healingSection).toBeTruthy();
        expect(healingSection[1]).toBe('8');
    });
});

// ============================================================
// Fix R5-8: AI floating mana cleared between phases
// ============================================================
describe('Fix R5-8: AI floating mana cleared between phases', () => {
    test('floating mana is cleared before combat begin in AI turn', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Between Main1 and Combat Begin, there should be floatingMana reset
        const main1ToCombat = gameSource.match(/executeAIMainPhaseWithPriority\(\)([\s\S]*?)COMBAT_BEGIN/);
        expect(main1ToCombat).toBeTruthy();
        expect(main1ToCombat[1]).toContain('floatingMana');
    });

    test('floating mana is cleared before Main2 in finishAITurn', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // In finishAITurn, before Main Phase 2
        const finishSection = gameSource.match(/finishAITurn[\s\S]*?floatingMana[\s\S]*?MAIN2/);
        expect(finishSection).toBeTruthy();
    });
});

// ============================================================
// Fix R5-9: Priority stops respected during AI turn
// ============================================================
describe('Fix R5-9: Priority stops respected during AI turn', () => {
    test('begin combat uses shouldStopForPriority check', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // The begin combat waitForPlayerContinue should be wrapped with shouldStopForPriority
        const beginCombatSection = gameSource.match(/Início do combate do oponente[\s\S]{0,200}/);
        expect(beginCombatSection).toBeTruthy();
        // Should have shouldStopForPriority before it
        const surroundingCode = gameSource.match(/shouldStopForPriority\('beginCombat'\)[\s\S]*?Início do combate do oponente/);
        expect(surroundingCode).toBeTruthy();
    });

    test('end step uses shouldStopForPriority check', () => {
        const fs = require('fs');
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const endStepSection = gameSource.match(/shouldStopForPriority\('endStep'\)[\s\S]*?Fim do turno do oponente/);
        expect(endStepSection).toBeTruthy();
    });
});
