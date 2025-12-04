// === Motor de Regras Simplificado ===

const PHASES = {
    UNTAP: 'untap',
    UPKEEP: 'upkeep',
    DRAW: 'draw',
    MAIN1: 'main1',
    COMBAT_BEGIN: 'combat_begin',
    DECLARE_ATTACKERS: 'declare_attackers',
    DECLARE_BLOCKERS: 'declare_blockers',
    COMBAT_DAMAGE: 'combat_damage',
    COMBAT_END: 'combat_end',
    MAIN2: 'main2',
    END: 'end',
    CLEANUP: 'cleanup'
};

const PHASE_NAMES = {
    [PHASES.UNTAP]: 'Desvirar',
    [PHASES.UPKEEP]: 'Manutenção',
    [PHASES.DRAW]: 'Compra',
    [PHASES.MAIN1]: 'Fase Principal 1',
    [PHASES.COMBAT_BEGIN]: 'Início do Combate',
    [PHASES.DECLARE_ATTACKERS]: 'Declarar Atacantes',
    [PHASES.DECLARE_BLOCKERS]: 'Declarar Bloqueadores',
    [PHASES.COMBAT_DAMAGE]: 'Dano de Combate',
    [PHASES.COMBAT_END]: 'Fim do Combate',
    [PHASES.MAIN2]: 'Fase Principal 2',
    [PHASES.END]: 'Etapa Final',
    [PHASES.CLEANUP]: 'Limpeza'
};

const PHASE_ORDER = [
    PHASES.UNTAP,
    PHASES.UPKEEP,
    PHASES.DRAW,
    PHASES.MAIN1,
    PHASES.COMBAT_BEGIN,
    PHASES.DECLARE_ATTACKERS,
    PHASES.DECLARE_BLOCKERS,
    PHASES.COMBAT_DAMAGE,
    PHASES.COMBAT_END,
    PHASES.MAIN2,
    PHASES.END,
    PHASES.CLEANUP
];

class RulesEngine {
    constructor(gameState) {
        this.game = gameState;
    }

    // Verifica se uma carta pode ser jogada
    canPlayCard(card, player) {
        // Terrenos: apenas na main phase, um por turno
        if (card.type === 'land') {
            return this.canPlayLand(player);
        }

        // Feitiços/Criaturas: main phase, mana suficiente
        if (card.type === 'creature' || card.type === 'sorcery' ||
            card.type === 'enchantment' || card.type === 'artifact') {
            return this.canCastSpell(card, player);
        }

        // Instantes: qualquer momento com prioridade
        if (card.type === 'instant') {
            return this.canCastInstant(card, player);
        }

        return false;
    }

    canPlayLand(player) {
        const isMainPhase = this.game.phase === PHASES.MAIN1 || this.game.phase === PHASES.MAIN2;
        const isActivePlayer = this.game.activePlayer === player;
        const hasLandDrop = player.landsPlayedThisTurn < 1;

        return isMainPhase && isActivePlayer && hasLandDrop;
    }

    canCastSpell(card, player) {
        const isMainPhase = this.game.phase === PHASES.MAIN1 || this.game.phase === PHASES.MAIN2;
        const isActivePlayer = this.game.activePlayer === player;
        const hasEnoughMana = this.hasEnoughMana(card, player);

        return isMainPhase && isActivePlayer && hasEnoughMana;
    }

    canCastInstant(card, player) {
        // Simplificado: pode jogar instant na sua vez durante várias fases
        const hasEnoughMana = this.hasEnoughMana(card, player);
        return hasEnoughMana;
    }

    hasEnoughMana(card, player) {
        if (!card.cmc) return true;

        const availableMana = this.calculateAvailableMana(player);
        const cost = this.parseCost(card.cost);

        return this.canPayCost(cost, availableMana);
    }

    calculateAvailableMana(player) {
        const mana = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, any: 0 };

        player.battlefield.forEach(card => {
            if (card.type === 'land' && !card.tapped) {
                if (card.produces === 'any') {
                    mana.any++;
                } else if (card.produces) {
                    mana[card.produces]++;
                }
            }
            // Criaturas que produzem mana (ex: Llanowar Elves)
            if (card.keywords && card.keywords.includes('tap_for_mana') && !card.tapped && !card.summoningSickness) {
                if (card.produces) {
                    mana[card.produces]++;
                }
            }
        });

        return mana;
    }

    parseCost(costString) {
        if (!costString) return { generic: 0, colored: {} };

        const cost = { generic: 0, colored: {} };
        const matches = costString.match(/(\d+)|([WUBRG])/g) || [];

        matches.forEach(match => {
            if (/\d+/.test(match)) {
                cost.generic += parseInt(match);
            } else {
                cost.colored[match] = (cost.colored[match] || 0) + 1;
            }
        });

        return cost;
    }

    canPayCost(cost, availableMana) {
        let remainingMana = { ...availableMana };

        // Primeiro, pagar custos coloridos
        for (const color in cost.colored) {
            const needed = cost.colored[color];
            if (remainingMana[color] >= needed) {
                remainingMana[color] -= needed;
            } else if (remainingMana[color] + remainingMana.any >= needed) {
                const fromColor = remainingMana[color];
                remainingMana[color] = 0;
                remainingMana.any -= (needed - fromColor);
            } else {
                return false;
            }
        }

        // Depois, pagar custo genérico
        const totalRemaining = Object.values(remainingMana).reduce((a, b) => a + b, 0);
        return totalRemaining >= cost.generic;
    }

    // Pagar mana (tapa terrenos automaticamente)
    payMana(card, player) {
        const cost = this.parseCost(card.cost);
        const lands = player.battlefield.filter(c => c.type === 'land' && !c.tapped);
        const manaCreatures = player.battlefield.filter(c =>
            c.keywords && c.keywords.includes('tap_for_mana') && !c.tapped && !c.summoningSickness
        );

        // Pagar custos coloridos primeiro
        for (const color in cost.colored) {
            let needed = cost.colored[color];

            // Usar terrenos da cor
            for (const land of lands) {
                if (needed <= 0) break;
                if (land.produces === color && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }

            // Usar criaturas mana da cor
            for (const creature of manaCreatures) {
                if (needed <= 0) break;
                if (creature.produces === color && !creature.tapped) {
                    creature.tapped = true;
                    needed--;
                }
            }

            // Usar terrenos "any"
            for (const land of lands) {
                if (needed <= 0) break;
                if (land.produces === 'any' && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }
        }

        // Pagar custo genérico
        let genericNeeded = cost.generic;

        for (const land of lands) {
            if (genericNeeded <= 0) break;
            if (!land.tapped) {
                land.tapped = true;
                genericNeeded--;
            }
        }

        for (const creature of manaCreatures) {
            if (genericNeeded <= 0) break;
            if (!creature.tapped) {
                creature.tapped = true;
                genericNeeded--;
            }
        }
    }

    // Verifica se criatura pode atacar
    canAttack(creature) {
        if (creature.tapped) return false;
        if (creature.summoningSickness) return false;
        if (creature.type !== 'creature') return false;

        // Verificar se tem Pacifism anexado
        if (this.hasPacifism(creature)) return false;

        return true;
    }

    // Verifica se criatura tem Pacifism (ou efeito similar)
    hasPacifism(creature) {
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.some(card =>
            card.id === 'pacifism' && card.attachedTo === creature.instanceId
        );
    }

    // Verifica se criatura pode bloquear
    canBlock(blocker, attacker) {
        if (blocker.tapped) return false;
        if (blocker.type !== 'creature') return false;

        // Verificar se tem Pacifism anexado
        if (this.hasPacifism(blocker)) return false;

        // Vampire Interloper não pode bloquear
        if (blocker.id === 'vampire_interloper') return false;

        // Verificar se criatura não pode bloquear este atacante (Frenzied Goblin, Goblin Smuggler)
        if (this.game.unblockableThisTurn && this.game.unblockableThisTurn.includes(attacker.instanceId)) {
            return false;
        }

        // Menace: precisa ser bloqueado por pelo menos 2 criaturas
        // (simplificado: não implementado completamente, mas já marcamos a keyword)

        // Flying: só pode ser bloqueado por flying ou reach
        if (attacker.keywords && attacker.keywords.includes('flying')) {
            const hasFlying = blocker.keywords && blocker.keywords.includes('flying');
            const hasReach = blocker.keywords && blocker.keywords.includes('reach');
            if (!hasFlying && !hasReach) return false;
        }

        return true;
    }

    // Calcula dano de combate
    resolveCombatDamage(attackers, blockerAssignments, defendingPlayer, attackingPlayer) {
        const results = {
            creaturesDied: [],
            damageToPlayers: { attacker: 0, defender: 0 },
            lifeGained: { attacker: 0, defender: 0 }
        };

        attackers.forEach(attacker => {
            const blockers = blockerAssignments[attacker.instanceId] || [];

            if (blockers.length === 0) {
                // Dano direto ao jogador
                const damage = this.getCreaturePower(attacker, true);
                results.damageToPlayers.defender += damage;

                // Lifelink
                if (attacker.keywords && attacker.keywords.includes('lifelink')) {
                    results.lifeGained.attacker += damage;
                }
            } else {
                // Combate com bloqueadores
                let attackerDamage = this.getCreaturePower(attacker, true);
                let damageToAttacker = 0;

                // First strike / Double strike (simplificado)
                const hasFirstStrike = attacker.keywords &&
                    (attacker.keywords.includes('first_strike') || attacker.keywords.includes('double_strike'));

                blockers.forEach(blocker => {
                    const blockerPower = this.getCreaturePower(blocker);
                    const blockerToughness = this.getCreatureToughness(blocker);

                    damageToAttacker += blockerPower;

                    // Deathtouch do atacante
                    const attackerHasDeathtouch = attacker.keywords && attacker.keywords.includes('deathtouch');

                    if (attackerHasDeathtouch || attackerDamage >= blockerToughness) {
                        results.creaturesDied.push(blocker);
                    }

                    // Deathtouch do bloqueador
                    const blockerHasDeathtouch = blocker.keywords && blocker.keywords.includes('deathtouch');

                    if (blockerHasDeathtouch && blockerPower > 0) {
                        results.creaturesDied.push(attacker);
                    }

                    // Trample: dano excedente vai pro jogador
                    if (attacker.keywords && attacker.keywords.includes('trample')) {
                        const excessDamage = attackerDamage - blockerToughness;
                        if (excessDamage > 0) {
                            results.damageToPlayers.defender += excessDamage;
                        }
                    }

                    attackerDamage = Math.max(0, attackerDamage - blockerToughness);
                });

                // Verificar se atacante morre
                const attackerToughness = this.getCreatureToughness(attacker);
                if (damageToAttacker >= attackerToughness && !results.creaturesDied.includes(attacker)) {
                    results.creaturesDied.push(attacker);
                }

                // Lifelink do atacante
                if (attacker.keywords && attacker.keywords.includes('lifelink')) {
                    results.lifeGained.attacker += this.getCreaturePower(attacker, true);
                }
            }
        });

        return results;
    }

    // Calcula todos os bônus de uma criatura
    getCreatureBonuses(creature, isAttacking = false) {
        const bonuses = { power: 0, toughness: 0, sources: [] };

        // Encontrar o controlador da criatura
        const controller = this.game.player.battlefield.includes(creature)
            ? this.game.player
            : this.game.opponent;

        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];

        // === ENCANTAMENTOS GLOBAIS DO CONTROLADOR ===
        controller.battlefield.forEach(card => {
            // Goblin Oriflamme: +1/+0 para criaturas atacantes
            if (card.id === 'goblin_oriflamme' && isAttacking) {
                bonuses.power += 1;
                bonuses.sources.push({ name: 'Goblin Oriflamme', power: 1, toughness: 0 });
            }

            // Ingenious Leonin: outras criaturas têm +1/+0
            if (card.id === 'ingenious_leonin' && card !== creature && creature.type === 'creature') {
                bonuses.power += 1;
                bonuses.sources.push({ name: 'Ingenious Leonin', power: 1, toughness: 0 });
            }

            // Elvish Archdruid: outros Elfos têm +1/+1
            if (card.id === 'elvish_archdruid' && card !== creature &&
                creature.subtype && creature.subtype.includes('Elf')) {
                bonuses.power += 1;
                bonuses.toughness += 1;
                bonuses.sources.push({ name: 'Elvish Archdruid', power: 1, toughness: 1 });
            }

            // Crossway Troublemakers: Vampiros atacantes têm deathtouch e lifelink
            // (isso é tratado em getCreatureKeywords)
        });

        // === AURAS ANEXADAS ===
        allBattlefields.forEach(card => {
            if (card.subtype === 'Aura' && card.attachedTo === creature.instanceId) {
                // Untamed Hunger: +2/+1
                if (card.id === 'untamed_hunger') {
                    bonuses.power += 2;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: 'Untamed Hunger', power: 2, toughness: 1 });
                }
            }
        });

        // === CONTADORES +1/+1 ===
        if (creature.counters && creature.counters.plusOnePlusOne) {
            const count = creature.counters.plusOnePlusOne;
            bonuses.power += count;
            bonuses.toughness += count;
            if (count > 0) {
                bonuses.sources.push({ name: `${count}x +1/+1 counters`, power: count, toughness: count });
            }
        }

        // === CONTADORES -1/-1 ===
        if (creature.counters && creature.counters.minusOneMinusOne) {
            const count = creature.counters.minusOneMinusOne;
            bonuses.power -= count;
            bonuses.toughness -= count;
            if (count > 0) {
                bonuses.sources.push({ name: `${count}x -1/-1 counters`, power: -count, toughness: -count });
            }
        }

        return bonuses;
    }

    getCreaturePower(creature, isAttacking = false) {
        let power = creature.power || 0;
        power += creature.powerModifier || 0;

        const bonuses = this.getCreatureBonuses(creature, isAttacking);
        power += bonuses.power;

        return Math.max(0, power);
    }

    getCreatureToughness(creature, isAttacking = false) {
        let toughness = creature.toughness || 0;
        toughness += creature.toughnessModifier || 0;

        const bonuses = this.getCreatureBonuses(creature, isAttacking);
        toughness += bonuses.toughness;

        return Math.max(0, toughness);
    }

    // Retorna keywords adicionais de uma criatura (de efeitos)
    getCreatureKeywords(creature, isAttacking = false) {
        const keywords = [...(creature.keywords || [])];

        const controller = this.game.player.battlefield.includes(creature)
            ? this.game.player
            : this.game.opponent;

        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];

        // Crossway Troublemakers: Vampiros atacantes têm deathtouch e lifelink
        if (isAttacking && creature.subtype && creature.subtype.includes('Vampire')) {
            controller.battlefield.forEach(card => {
                if (card.id === 'crossway_troublemakers') {
                    if (!keywords.includes('deathtouch')) keywords.push('deathtouch');
                    if (!keywords.includes('lifelink')) keywords.push('lifelink');
                }
            });
        }

        // Untamed Hunger: menace
        allBattlefields.forEach(card => {
            if (card.subtype === 'Aura' && card.attachedTo === creature.instanceId) {
                if (card.id === 'untamed_hunger') {
                    if (!keywords.includes('menace')) keywords.push('menace');
                }
            }
        });

        return keywords;
    }

    // Desvirar todas as permanentes
    untapAll(player) {
        player.battlefield.forEach(card => {
            card.tapped = false;
        });
    }

    // Remover summoning sickness
    removeSummoningSickness(player) {
        player.battlefield.forEach(card => {
            if (card.type === 'creature') {
                card.summoningSickness = false;
            }
        });
    }

    // Comprar carta
    drawCard(player, checkMill = true) {
        if (player.library.length > 0) {
            const card = player.library.pop();
            player.hand.push(card);

            // Som de comprar carta
            if (window.soundManager) {
                window.soundManager.playCardDraw();
            }

            return card;
        }

        // Deck vazio - o jogador perde!
        if (checkMill && !this.game.mulliganPhase) {
            const isPlayer = player === this.game.player;
            this.game.handleGameOver(
                isPlayer ? 'opponent' : 'player',
                `${player.name} tentou comprar de um grimório vazio!`
            );
        }

        return null;
    }

    // Verificar condição de vitória
    checkWinCondition() {
        if (this.game.player.life <= 0) {
            return { winner: 'opponent', reason: 'Você ficou sem vida!' };
        }
        if (this.game.opponent.life <= 0) {
            return { winner: 'player', reason: 'Oponente ficou sem vida!' };
        }
        return null;
    }
}

// Exportar
window.PHASES = PHASES;
window.PHASE_NAMES = PHASE_NAMES;
window.PHASE_ORDER = PHASE_ORDER;
window.RulesEngine = RulesEngine;
