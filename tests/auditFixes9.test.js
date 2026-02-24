/**
 * Tests for Round 11 audit fixes
 * These tests verify the bugs found by multi-agent audit R11
 */

const fs = require('fs');

// ============================================================
// Fix R11-1: exileOnDeath prevents death triggers in destroyPermanent
// ============================================================
describe('Fix R11-1: exileOnDeath prevents death triggers in destroyPermanent', () => {
    test('destroyPermanent checks exileOnDeath before calling onCreatureDeath', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const destroyStart = gameSource.indexOf('async destroyPermanent(permanent, owner');
        const destroyBody = gameSource.substring(destroyStart, destroyStart + 1000);
        // Must check !permanent.exileOnDeath before calling onCreatureDeath
        expect(destroyBody).toContain('!permanent.exileOnDeath');
        expect(destroyBody).toContain('onCreatureDeath');
    });

    test('destroyPermanent routes exileOnDeath creatures to exile zone', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const destroyStart = gameSource.indexOf('async destroyPermanent(permanent, owner');
        const destroyBody = gameSource.substring(destroyStart, destroyStart + 2000);
        // Must have exileOnDeath zone routing
        expect(destroyBody).toContain('if (permanent.exileOnDeath)');
        expect(destroyBody).toContain('owner.exile.push(permanent)');
    });
});

// ============================================================
// Fix R11-2: exileOnDeath prevents death triggers in combat batch
// ============================================================
describe('Fix R11-2: exileOnDeath prevents death triggers in combat batch', () => {
    test('combat batch Phase 1 checks exileOnDeath before death triggers', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find the combat batch section (Phase 1)
        const phase1Comment = gameSource.indexOf('Fase 1: Disparar TODOS os death triggers');
        expect(phase1Comment).toBeGreaterThan(-1);
        const phase1Body = gameSource.substring(phase1Comment, phase1Comment + 600);
        expect(phase1Body).toContain('!creature.exileOnDeath');
        expect(phase1Body).toContain('onCreatureDeath');
    });

    test('combat batch Phase 2 routes exileOnDeath creatures to exile zone', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        // Find Phase 2 of combat batch
        const phase2Comment = gameSource.indexOf('Fase 2: Remover criaturas do campo');
        expect(phase2Comment).toBeGreaterThan(-1);
        const phase2Body = gameSource.substring(phase2Comment, phase2Comment + 1000);
        expect(phase2Body).toContain('creature.exileOnDeath');
        expect(phase2Body).toContain('owner.exile.push(creature)');
    });
});

// ============================================================
// Fix R11-3: SBA re-check handles exileOnDeath correctly
// ============================================================
describe('Fix R11-3: SBA re-check handles exileOnDeath', () => {
    test('SBA re-check prevents death triggers for exileOnDeath creatures', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const sbaComment = gameSource.indexOf('SBA re-check: após lords morrerem');
        expect(sbaComment).toBeGreaterThan(-1);
        const sbaBody = gameSource.substring(sbaComment, sbaComment + 1000);
        expect(sbaBody).toContain('!creature.exileOnDeath');
        expect(sbaBody).toContain('onCreatureDeath');
    });

    test('SBA re-check routes exileOnDeath creatures to exile zone', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const sbaComment = gameSource.indexOf('SBA re-check: após lords morrerem');
        const sbaBody = gameSource.substring(sbaComment, sbaComment + 1700);
        expect(sbaBody).toContain('if (creature.exileOnDeath)');
        expect(sbaBody).toContain('owner.exile.push(creature)');
    });
});

// ============================================================
// Fix R11-4: Prayer of Binding checks Ward
// ============================================================
describe('Fix R11-4: Prayer of Binding checks Ward', () => {
    test('Prayer of Binding checks Ward for player targets', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const prayerStart = triggersSource.indexOf('async _handlePrayerOfBindingETB');
        const prayerBody = triggersSource.substring(prayerStart, prayerStart + 2500);
        expect(prayerBody).toContain('checkAndPayWard');
    });

    test('Prayer of Binding still gains life even if Ward counters', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const prayerStart = triggersSource.indexOf('async _handlePrayerOfBindingETB');
        const prayerBody = triggersSource.substring(prayerStart, prayerStart + 2500);
        // After Ward check fails, should still gain life
        const wardToLife = prayerBody.match(/checkAndPayWard[\s\S]*?gainLife/);
        expect(wardToLife).toBeTruthy();
    });
});

// ============================================================
// Fix R11-5: Battle-Rattle Shaman checks Ward on opponent creatures
// ============================================================
describe('Fix R11-5: Battle-Rattle Shaman checks Ward', () => {
    test('Battle-Rattle Shaman calls checkAndPayWard before buffing', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const shamanStart = triggersSource.indexOf('async _handleBattleRattleShaman');
        const shamanBody = triggersSource.substring(shamanStart, shamanStart + 2000);
        expect(shamanBody).toContain("checkAndPayWard(target, controller, 'Battle-Rattle Shaman')");
    });
});

// ============================================================
// Fix R11-6: Frenzied Goblin checks Ward
// ============================================================
describe('Fix R11-6: Frenzied Goblin checks Ward', () => {
    test('Frenzied Goblin player path calls checkAndPayWard', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const frenziedStart = triggersSource.indexOf('async onFrenziedGoblinAttacks');
        const frenziedBody = triggersSource.substring(frenziedStart, frenziedStart + 2000);
        // Should have checkAndPayWard for player path
        expect(frenziedBody).toContain("checkAndPayWard(shouldPay.target, attackingPlayer, 'Frenzied Goblin')");
    });

    test('Frenzied Goblin AI path calls checkAndPayWard', () => {
        const triggersSource = fs.readFileSync('./js/triggers.js', 'utf-8');
        const frenziedStart = triggersSource.indexOf('async onFrenziedGoblinAttacks');
        const frenziedBody = triggersSource.substring(frenziedStart, frenziedStart + 2000);
        // Should have checkAndPayWard for AI path
        expect(frenziedBody).toContain("checkAndPayWard(target, attackingPlayer, 'Frenzied Goblin')");
    });
});

// ============================================================
// Fix R11-7: Goblin Firebomb checks Ward
// ============================================================
describe('Fix R11-7: Goblin Firebomb checks Ward before paying cost', () => {
    test('Goblin Firebomb calls checkAndPayWard before sacrifice', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const firebombStart = gameSource.indexOf("title: 'Goblin Firebomb'");
        const firebombBody = gameSource.substring(firebombStart, firebombStart + 2000);
        expect(firebombBody).toContain("checkAndPayWard(firebombTarget, player, 'Goblin Firebomb')");
    });

    test('Goblin Firebomb Ward check is before payGenericMana', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const firebombStart = gameSource.indexOf("title: 'Goblin Firebomb'");
        const firebombBody = gameSource.substring(firebombStart, firebombStart + 2000);
        const wardIdx = firebombBody.indexOf('checkAndPayWard');
        const payIdx = firebombBody.indexOf('payGenericMana');
        expect(wardIdx).toBeGreaterThan(-1);
        expect(payIdx).toBeGreaterThan(-1);
        expect(wardIdx).toBeLessThan(payIdx);
    });
});

// ============================================================
// Fix R11-8: resolveSpellWithTarget uses checkAndPayWard helper
// ============================================================
describe('Fix R11-8: resolveSpellWithTarget uses checkAndPayWard', () => {
    test('resolveSpellWithTarget calls checkAndPayWard instead of inline logic', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const resolveStart = gameSource.indexOf('async resolveSpellWithTarget(card, caster, target)');
        const resolveBody = gameSource.substring(resolveStart, resolveStart + 500);
        expect(resolveBody).toContain('checkAndPayWard(target, caster, card.name)');
    });

    test('resolveSpellWithTarget does NOT have inline Ward logic', () => {
        const gameSource = fs.readFileSync('./js/game.js', 'utf-8');
        const resolveStart = gameSource.indexOf('async resolveSpellWithTarget(card, caster, target)');
        const resolveBody = gameSource.substring(resolveStart, resolveStart + 500);
        // Should NOT have the old inline pattern
        expect(resolveBody).not.toContain('this.rules.getWardCost(target)');
        expect(resolveBody).not.toContain('promptWardPayment');
    });
});
