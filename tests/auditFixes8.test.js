/**
 * Tests for Round 10 audit fixes
 * These tests verify the bugs found by multi-agent audit R10
 */

const fs = require('fs');

// ============================================================
// Fix R10-1: Ward checked on ETB abilities (bounce, debuff, ping)
// ============================================================
describe('Fix R10-1: Ward checked on ETB abilities', () => {
    test('_handleBounceETB calls checkAndPayWard before bouncing', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Extract the bounce method body
        const bounceStart = triggersSource.indexOf('async _handleBounceETB');
        const bounceBody = triggersSource.substring(bounceStart, bounceStart + 1500);
        expect(bounceBody).toContain('checkAndPayWard');
    });

    test('_handleDebuffETB calls checkAndPayWard before applying debuff', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const debuffStart = triggersSource.indexOf('async _handleDebuffETB');
        const debuffBody = triggersSource.substring(debuffStart, debuffStart + 1500);
        expect(debuffBody).toContain('checkAndPayWard');
    });

    test('Skeleton Archer ETB calls checkAndPayWard on creature targets', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const archerStart = triggersSource.indexOf('dealDamage = async (target)');
        const archerBody = triggersSource.substring(archerStart, archerStart + 1500);
        expect(archerBody).toContain('checkAndPayWard');
    });

    test('Volley Veteran ETB calls checkAndPayWard before dealing damage', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const volleyStart = triggersSource.indexOf('async _handleVolleyVeteranETB');
        const volleyBody = triggersSource.substring(volleyStart, volleyStart + 2000);
        expect(volleyBody).toContain('checkAndPayWard');
    });
});

// ============================================================
// Fix R10-2: Ward checked on auras targeting creatures
// ============================================================
describe('Fix R10-2: Ward checked on auras', () => {
    test('resolvePermanentFromStack checks Ward for Aura targets', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const auraSection = gameSource.match(/Se é uma Aura[\s\S]*?Anexar aura ao alvo/);
        expect(auraSection).toBeTruthy();
        expect(auraSection[0]).toContain('checkAndPayWard');
    });

    test('Ward check on aura sends to graveyard if not paid', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // After Ward check fails, the aura should go to graveyard
        const wardAuraSection = gameSource.match(/checkAndPayWard\(stackItem\.target[\s\S]*?controller\.graveyard\.push\(card\)/);
        expect(wardAuraSection).toBeTruthy();
    });
});

// ============================================================
// Fix R10-3: Skeleton Archer deathtouch from Death Baron
// ============================================================
describe('Fix R10-3: Skeleton Archer ETB respects deathtouch', () => {
    test('Skeleton Archer ETB checks hasKeyword deathtouch and sets markedForDeath', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Find the damage section inside dealDamage for Skeleton Archer
        const archerDamage = triggersSource.match(/actualCreature\.damage[\s\S]*?hasKeyword\(card, 'deathtouch'[\s\S]*?markedForDeath/);
        expect(archerDamage).toBeTruthy();
    });

    test('markedForDeath is set before checkCreatureDeath call', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        // Ensure markedForDeath is set BEFORE checkCreatureDeath
        const orderCheck = triggersSource.match(/markedForDeath = true;[\s\S]*?checkCreatureDeath\(actualCreature/);
        expect(orderCheck).toBeTruthy();
    });
});

// ============================================================
// Fix R10-4: Battle-Rattle Shaman targets any creature
// ============================================================
describe('Fix R10-4: Battle-Rattle Shaman targets any creature', () => {
    test('Battle-Rattle Shaman includes opponent creatures in valid targets', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const shamanStart = triggersSource.indexOf('async _handleBattleRattleShaman');
        const shamanBody = triggersSource.substring(shamanStart, shamanStart + 2000);
        // Should reference opponent battlefield in the allCreatures array
        expect(shamanBody).toContain('opponent.battlefield.filter(c => c.type === \'creature\')');
    });

    test('AI still prefers own creatures for +2/+0 buff', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const shamanStart = triggersSource.indexOf('async _handleBattleRattleShaman');
        const shamanBody = triggersSource.substring(shamanStart, shamanStart + 2000);
        expect(shamanBody).toContain('IA sempre usa a habilidade em criaturas próprias');
    });
});

// ============================================================
// Fix R10-5: Ingenious Leonin uses getEffectiveSubtype for Cat check
// ============================================================
describe('Fix R10-5: Ingenious Leonin uses getEffectiveSubtype', () => {
    test('Ingenious Leonin Cat check uses getEffectiveSubtype', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the section around Ingenious Leonin Cat check
        const catCheckIdx = gameSource.indexOf('Se é Cat, ganha iniciativa');
        expect(catCheckIdx).toBeGreaterThan(-1);
        const surroundingCode = gameSource.substring(catCheckIdx, catCheckIdx + 200);
        expect(surroundingCode).toContain('getEffectiveSubtype(leoninTarget)');
    });

    test('Ingenious Leonin does NOT use direct subtype.includes for Cat', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // The old pattern should NOT exist
        const oldPattern = gameSource.match(/leoninTarget\.subtype\s*&&\s*leoninTarget\.subtype\.includes\('Cat'\)/);
        expect(oldPattern).toBeNull();
    });
});

// ============================================================
// Fix R10-6: checkAndPayWard helper method
// ============================================================
describe('Fix R10-6: checkAndPayWard helper method exists', () => {
    test('game.js has checkAndPayWard method', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        expect(gameSource).toContain('async checkAndPayWard(target, sourceController, sourceName)');
    });

    test('checkAndPayWard returns true for own creatures (Ward only vs opponents)', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const wardMethod = gameSource.match(/checkAndPayWard[\s\S]*?if \(targetOwner === sourceController\) return true/);
        expect(wardMethod).toBeTruthy();
    });

    test('checkAndPayWard returns true for non-creature targets', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const wardMethod = gameSource.match(/checkAndPayWard[\s\S]*?target\.type !== 'creature'\) return true/);
        expect(wardMethod).toBeTruthy();
    });

    test('checkAndPayWard calls getWardCost and payGenericMana', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const wardMethod = gameSource.match(/async checkAndPayWard[\s\S]*?(?=\/\/ Verifica se um alvo)/);
        expect(wardMethod).toBeTruthy();
        expect(wardMethod[0]).toContain('getWardCost');
        expect(wardMethod[0]).toContain('payGenericMana');
    });
});
