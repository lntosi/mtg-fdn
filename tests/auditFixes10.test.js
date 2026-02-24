/**
 * Tests for Round 12 audit fixes
 * These tests verify the bugs found by multi-agent audit R12
 */

const fs = require('fs');

// ============================================================
// Fix R12-1: Undying Malice triggers ETBs on returned creature
// ============================================================
describe('Fix R12-1: Undying Malice triggers ETBs on returned creature', () => {
    test('onCreatureDeath calls resolveETB after undying return', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const undyingStart = triggersSource.indexOf('if (creature.undyingMalice)');
        const undyingBody = triggersSource.substring(undyingStart, undyingStart + 1200);
        expect(undyingBody).toContain('resolveETB');
    });

    test('resolveETB is called after _returnedByUndying flag is set', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const undyingStart = triggersSource.indexOf('if (creature.undyingMalice)');
        const undyingBody = triggersSource.substring(undyingStart, undyingStart + 1200);
        const flagIdx = undyingBody.indexOf('_returnedByUndying = true');
        const etbIdx = undyingBody.indexOf('resolveETB');
        expect(flagIdx).toBeGreaterThan(-1);
        expect(etbIdx).toBeGreaterThan(-1);
        expect(etbIdx).toBeGreaterThan(flagIdx);
    });
});

// ============================================================
// Fix R12-2: Dropkick Bomber uses getEffectiveSubtype in canActivateAbility
// ============================================================
describe('Fix R12-2: Dropkick Bomber uses getEffectiveSubtype', () => {
    test('canActivateAbility uses getEffectiveSubtype for Goblin check', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const canActivateStart = gameSource.indexOf("case 'dropkick_bomber':", gameSource.indexOf('canActivateAbility'));
        const canActivateBody = gameSource.substring(canActivateStart, canActivateStart + 500);
        expect(canActivateBody).toContain("getEffectiveSubtype(c).includes('Goblin')");
        expect(canActivateBody).not.toContain("c.subtype && c.subtype.includes('Goblin')");
    });

    test('activateAbility uses getEffectiveSubtype for Goblin filter', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const activateStart = gameSource.indexOf("case 'dropkick_bomber':", gameSource.indexOf('activateAbility'));
        const activateBody = gameSource.substring(activateStart, activateStart + 500);
        expect(activateBody).toContain("getEffectiveSubtype(c).includes('Goblin')");
        expect(activateBody).not.toContain("c.subtype && c.subtype.includes('Goblin')");
    });
});

// ============================================================
// Fix R12-3: Dropkick Bomber AI uses getEffectiveSubtype
// ============================================================
describe('Fix R12-3: Dropkick Bomber AI uses getEffectiveSubtype', () => {
    test('AI evaluation uses getEffectiveSubtype for Goblin check', () => {
        const aiSource = fs.readFileSync('./js/ai.js', 'utf-8');
        const dropkickStart = aiSource.indexOf("case 'dropkick_bomber':");
        const dropkickBody = aiSource.substring(dropkickStart, dropkickStart + 500);
        expect(dropkickBody).toContain("getEffectiveSubtype(c)");
        expect(dropkickBody).not.toMatch(/c\.subtype\?\.includes\('Goblin'\)/);
    });
});

// ============================================================
// Fix R12-4: Aura resolution checks hexproof (passes caster)
// ============================================================
describe('Fix R12-4: Aura resolution checks hexproof', () => {
    test('resolvePermanentFromStack passes controller to isTargetStillValid for auras', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const auraSection = gameSource.indexOf("if (card.subtype === 'Aura' && stackItem.target)");
        const auraBody = gameSource.substring(auraSection, auraSection + 400);
        expect(auraBody).toContain('isTargetStillValid(stackItem.target, controller)');
    });

    test('Aura resolution does NOT call isTargetStillValid without caster', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const auraSection = gameSource.indexOf("if (card.subtype === 'Aura' && stackItem.target)");
        const auraBody = gameSource.substring(auraSection, auraSection + 200);
        // Should NOT have the old pattern without controller
        expect(auraBody).not.toMatch(/isTargetStillValid\(stackItem\.target\)(?!\s*,)/);
    });
});

// ============================================================
// Fix R12-5: Dragon Fodder tokens have keywords and cmc
// ============================================================
describe('Fix R12-5: Dragon Fodder tokens have complete properties', () => {
    test('Goblin tokens include keywords array', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const fodderStart = gameSource.indexOf("case 'dragon_fodder':");
        const fodderBody = gameSource.substring(fodderStart, fodderStart + 500);
        expect(fodderBody).toContain('keywords: []');
    });

    test('Goblin tokens include cmc: 0', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const fodderStart = gameSource.indexOf("case 'dragon_fodder':");
        const fodderBody = gameSource.substring(fodderStart, fodderStart + 600);
        expect(fodderBody).toContain('cmc: 0');
    });
});

// ============================================================
// Fix R12-6: Thrashing Brontodon uses sacrificeCreature
// ============================================================
describe('Fix R12-6: Thrashing Brontodon uses sacrificeCreature', () => {
    test('Thrashing Brontodon self-sacrifice uses sacrificeCreature', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the sacrifice line near Brontodon's activation
        const brontoComment = gameSource.indexOf('Pagar custo e sacrificar o Brontodon');
        expect(brontoComment).toBeGreaterThan(-1);
        const brontoBody = gameSource.substring(brontoComment, brontoComment + 200);
        expect(brontoBody).toContain('sacrificeCreature(card, player)');
    });
});

// ============================================================
// Fix R12-7: Dropkick Bomber combat sacrifice uses sacrificeCreature
// ============================================================
describe('Fix R12-7: Dropkick Bomber combat sacrifice uses sacrificeCreature', () => {
    test('sacrificeOnCombatDamage uses sacrificeCreature not destroyPermanent', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the combat sacrifice comment
        const sacComment = gameSource.indexOf('Sacrificar criaturas marcadas com sacrificeOnCombatDamage');
        expect(sacComment).toBeGreaterThan(-1);
        const sacBody = gameSource.substring(sacComment, sacComment + 600);
        expect(sacBody).toContain('sacrificeCreature(attacker, owner)');
        expect(sacBody).not.toContain('destroyPermanent(attacker, owner)');
    });
});

// ============================================================
// Fix R12-8: isCounterspell recognizes counterspell_creature
// ============================================================
describe('Fix R12-8: isCounterspell recognizes counterspell_creature', () => {
    test('isCounterspell checks both counterspell and counterspell_creature', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const isCounterMethod = gameSource.match(/isCounterspell\(card\)\s*\{[^}]*\}/);
        expect(isCounterMethod).toBeTruthy();
        expect(isCounterMethod[0]).toContain("'counterspell'");
        expect(isCounterMethod[0]).toContain("'counterspell_creature'");
    });
});
