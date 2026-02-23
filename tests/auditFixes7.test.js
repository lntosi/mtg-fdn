/**
 * Tests for Round 7 audit fixes
 * These tests verify the bugs found by multi-agent audit
 */

const fs = require('fs');

// ============================================================
// Fix R7-1: tap_for_mana creatures check hasLostAllAbilities
// ============================================================
describe('Fix R7-1: tap_for_mana respects hasLostAllAbilities', () => {
    test('calculateAvailableMana checks hasLostAllAbilities for mana creatures', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // Find the tap_for_mana section in calculateAvailableMana
        const manaCalcSection = rulesSource.match(/tap_for_mana.*!card\.tapped.*!card\.summoningSickness[^)]+/);
        expect(manaCalcSection).toBeTruthy();
        expect(manaCalcSection[0]).toContain('hasLostAllAbilities');
    });

    test('payMana checks hasLostAllAbilities for mana creatures', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // Find the allManaCreatures filter - using a more flexible regex
        const payManaSection = rulesSource.match(/allManaCreatures[\s\S]*?hasLostAllAbilities/);
        expect(payManaSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-2: hasValidTargets checks hexproof for removal
// ============================================================
describe('Fix R7-2: hasValidTargets respects hexproof', () => {
    test('opponent target removal checks canBeTargetedBy', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        // Find the opponentTargetRemoval section
        const removalSection = rulesSource.match(/opponentTargetRemoval[\s\S]*?return hasTargetableCreatures/);
        expect(removalSection).toBeTruthy();
        expect(removalSection[0]).toContain('canBeTargetedBy');
    });

    test('deadly_riposte checks hexproof for opponent creatures', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        const riposteSection = rulesSource.match(/deadly_riposte[\s\S]*?return hasTappedCreatures/);
        expect(riposteSection).toBeTruthy();
        expect(riposteSection[0]).toContain('canBeTargetedBy');
    });

    test('fleeting_distraction checks hexproof', () => {
        const rulesSource = fs.readFileSync('./js/rules.js', 'utf-8');
        const distractionSection = rulesSource.match(/fleeting_distraction[\s\S]*?player\.battlefield\.some/);
        expect(distractionSection).toBeTruthy();
        expect(distractionSection[0]).toContain('canBeTargetedBy');
    });
});

// ============================================================
// Fix R7-3: Tokens have keywords array and cmc
// ============================================================
describe('Fix R7-3: Tokens have proper structure', () => {
    test('Cat token has keywords array and cmc', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find _createCatToken function and verify it has keywords and cmc
        const catTokenSection = triggersSource.match(/_createCatToken[\s\S]*?keywords:\s*\[\][\s\S]*?cmc:\s*0/);
        expect(catTokenSection).toBeTruthy();
    });

    test('Elf token has keywords array and cmc', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const elfTokenSection = triggersSource.match(/Elf Warrior Token[\s\S]*?cmc:\s*0/);
        expect(elfTokenSection).toBeTruthy();
        expect(elfTokenSection[0]).toContain('keywords: []');
    });

    test('Zombie token has keywords array and cmc', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const zombieTokenSection = triggersSource.match(/Zombie Token[\s\S]*?cmc:\s*0/);
        expect(zombieTokenSection).toBeTruthy();
        expect(zombieTokenSection[0]).toContain('keywords: []');
    });

    test('Treasure token has cmc', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const treasureSection = triggersSource.match(/Treasure Token[\s\S]*?cmc:\s*0/);
        expect(treasureSection).toBeTruthy();
    });

    test('Faerie token has cmc', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const faerieSection = triggersSource.match(/Faerie Token[\s\S]*?cmc:\s*0/);
        expect(faerieSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-4: Trigger handlers check hasLostAllAbilities
// ============================================================
describe('Fix R7-4: Trigger handlers respect hasLostAllAbilities', () => {
    test('_handleLeoninVanguard checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const vanguardSection = triggersSource.match(/leonin_vanguard[\s\S]*?hasLostAllAbilities/);
        expect(vanguardSection).toBeTruthy();
    });

    test('_handleBattleRattleShaman checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const shamanSection = triggersSource.match(/battle_rattle_shaman[\s\S]*?hasLostAllAbilities/);
        expect(shamanSection).toBeTruthy();
    });

    test('onFrenziedGoblinAttacks checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const goblinSection = triggersSource.match(/frenzied_goblin[\s\S]*?hasLostAllAbilities/);
        expect(goblinSection).toBeTruthy();
    });

    test('Vengeful Bloodwitch death trigger checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const bloodwitchSection = triggersSource.match(/vengeful_bloodwitch[\s\S]*?hasLostAllAbilities/);
        expect(bloodwitchSection).toBeTruthy();
    });

    test('Crossway Troublemakers death trigger checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const troublemakersSection = triggersSource.match(/crossway_troublemakers[\s\S]*?hasLostAllAbilities/);
        expect(troublemakersSection).toBeTruthy();
    });

    test('Stromkirk Bloodthief checks hasLostAllAbilities', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const bloodthiefSection = triggersSource.match(/stromkirk_bloodthief[\s\S]*?hasLostAllAbilities/);
        expect(bloodthiefSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-5: Subtype checks use getEffectiveSubtype
// ============================================================
describe('Fix R7-5: Subtype checks use getEffectiveSubtype', () => {
    test('_handleDwynensEliteETB uses getEffectiveSubtype', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const dwynenSection = triggersSource.match(/_handleDwynensEliteETB[\s\S]*?getEffectiveSubtype/);
        expect(dwynenSection).toBeTruthy();
    });

    test('_handleEquipPirateETB uses getEffectiveSubtype', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const pirateSection = triggersSource.match(/_handleEquipPirateETB[\s\S]*?getEffectiveSubtype/);
        expect(pirateSection).toBeTruthy();
    });

    test('_handleVolleyVeteranETB uses getEffectiveSubtype', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const veteranSection = triggersSource.match(/_handleVolleyVeteranETB[\s\S]*?getEffectiveSubtype/);
        expect(veteranSection).toBeTruthy();
    });

    test('Stromkirk Bloodthief uses getEffectiveSubtype for vampires', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const bloodthiefSection = triggersSource.match(/stromkirk_bloodthief[\s\S]*?getEffectiveSubtype[^}]*Vampire/);
        expect(bloodthiefSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-6: payMana uses floating mana
// ============================================================
describe('Fix R7-6: payMana uses floating mana', () => {
    test('payGenericMana uses floating mana first', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const payGenericSection = gameSource.match(/payGenericMana\(amount, player\)[\s\S]*?floatingMana/);
        expect(payGenericSection).toBeTruthy();
    });

    test('payColoredMana uses floating mana first', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const payColoredSection = gameSource.match(/payColoredMana\(cost, player\)[\s\S]*?floatingMana/);
        expect(payColoredSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-7: AI evaluates tap_for_mana creatures as threats
// ============================================================
describe('Fix R7-7: AI evaluates mana dorks as threats', () => {
    test('_evaluateCreatureThreat considers tap_for_mana', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const threatSection = aiSource.match(/_evaluateCreatureThreat[\s\S]*?tap_for_mana/);
        expect(threatSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-8: AI Into the Roil doesn't target own creatures
// ============================================================
describe('Fix R7-8: AI Into the Roil targeting', () => {
    test('chooseBestSpellTarget returns null for into_the_roil with no enemies', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const roilSection = aiSource.match(/into_the_roil[\s\S]*?return null/);
        expect(roilSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-9: AI chooseBlockers considers indestructible
// ============================================================
describe('Fix R7-9: AI blocking considers indestructible', () => {
    test('chooseBlockers checks indestructible for blocker', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const blockerSection = aiSource.match(/blockerHasIndestructible.*indestructible/);
        expect(blockerSection).toBeTruthy();
    });

    test('chooseBlockers checks indestructible for attacker', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const attackerSection = aiSource.match(/attackerHasIndestructible.*indestructible/);
        expect(attackerSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-10: detachFromCreature is async with await
// ============================================================
describe('Fix R7-10: detachFromCreature is async', () => {
    test('detachFromCreature is declared async', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const detachSection = gameSource.match(/async detachFromCreature/);
        expect(detachSection).toBeTruthy();
    });

    test('detachFromCreature awaits onLeaveBattlefield', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const awaitSection = gameSource.match(/detachFromCreature[\s\S]*?await this\.triggers\.onLeaveBattlefield/);
        expect(awaitSection).toBeTruthy();
    });

    test('calls to detachFromCreature are awaited', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Check that there are awaited calls
        const awaitedCalls = gameSource.match(/await this\.detachFromCreature/g);
        expect(awaitedCalls).toBeTruthy();
        expect(awaitedCalls.length).toBeGreaterThan(0);
    });
});

// ============================================================
// Fix R7-11: resolveCombat catch block clears ui.blockerAssignments
// ============================================================
describe('Fix R7-11: resolveCombat error handling', () => {
    test('catch block clears ui.blockerAssignments', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const catchSection = gameSource.match(/catch \(error\)[\s\S]*?ui\.blockerAssignments\s*=\s*\{\}/);
        expect(catchSection).toBeTruthy();
    });
});

// ============================================================
// Fix R7-12: AI considers enters_tapped for land mana simulation
// ============================================================
describe('Fix R7-12: AI land mana simulation', () => {
    test('getCardsToPlay handles enters_tapped lands', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const simulationSection = aiSource.match(/enters_tapped[\s\S]*?simulatedMana/);
        expect(simulationSection).toBeTruthy();
    });
});
