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
        const hasEnoughMana = this.hasEnoughMana(card, player);
        if (!hasEnoughMana) return false;

        // Verificar se há alvos válidos para instants com restrições
        if (!this.hasValidTargets(card, player)) return false;

        return true;
    }

    /**
     * Verifica se um instant tem alvos válidos no momento atual
     */
    hasValidTargets(card, player) {
        const opponent = player === this.game.player ? this.game.opponent : this.game.player;
        const attackers = this.game.currentAttackers || [];
        const blockerAssignments = this.game.blockerAssignments || {};
        const blockers = Object.values(blockerAssignments).flat();

        // Elspeth's Smite - só pode mirar criaturas atacantes ou bloqueadoras
        if (card.id === 'elspeths_smite') {
            const hasAttackers = attackers.length > 0;
            const hasBlockers = blockers.length > 0;
            return hasAttackers || hasBlockers;
        }

        // Buffs que miram suas próprias criaturas
        const selfTargetBuffs = ['moment_of_triumph', 'kindled_fury', 'snakeskin_veil', 'offer_immortality'];
        if (selfTargetBuffs.includes(card.id)) {
            const hasOwnCreatures = player.battlefield.some(c => c.type === 'creature');
            return hasOwnCreatures;
        }

        // Remoção que mira criaturas do oponente
        const opponentTargetRemoval = ['moment_of_craving', 'heros_downfall', 'incinerating_blast'];
        if (opponentTargetRemoval.includes(card.id)) {
            const hasOpponentCreatures = opponent.battlefield.some(c => c.type === 'creature');
            return hasOpponentCreatures;
        }

        // Volley - só criaturas com flying do oponente
        if (card.id === 'volley') {
            const hasFlyingCreatures = opponent.battlefield.some(c =>
                c.type === 'creature' && c.keywords && c.keywords.includes('flying')
            );
            return hasFlyingCreatures;
        }

        // Broken Wings - artefatos, encantamentos ou criaturas com flying do oponente
        if (card.id === 'broken_wings') {
            const hasValidTargets = opponent.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && c.keywords && c.keywords.includes('flying'))
            );
            return hasValidTargets;
        }

        // Felling Blow - criaturas com flying ou reach do oponente
        if (card.id === 'felling_blow') {
            const hasValidTargets = opponent.battlefield.some(c =>
                c.type === 'creature' && c.keywords &&
                (c.keywords.includes('flying') || c.keywords.includes('reach'))
            );
            return hasValidTargets;
        }

        // Counterspells - precisam de algo na stack
        if (card.keywords && card.keywords.includes('counterspell')) {
            return !this.game.isStackEmpty();
        }

        // Para outros instants, assumir que sempre há alvos válidos
        return true;
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

        // Adicionar floating mana
        const playerKey = player === this.game.player ? 'player' : 'opponent';
        if (this.game.floatingMana && this.game.floatingMana[playerKey]) {
            const floating = this.game.floatingMana[playerKey];
            for (const color in floating) {
                if (floating[color] > 0) {
                    mana[color] += floating[color];
                }
            }
        }

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

        // Obter floating mana do jogador
        const playerKey = player === this.game.player ? 'player' : 'opponent';
        const floating = this.game.floatingMana ? this.game.floatingMana[playerKey] : null;

        // Pagar custos coloridos primeiro
        for (const color in cost.colored) {
            let needed = cost.colored[color];

            // Usar floating mana primeiro
            if (floating && floating[color] > 0) {
                const fromFloating = Math.min(floating[color], needed);
                floating[color] -= fromFloating;
                needed -= fromFloating;
            }

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

        // Usar floating mana para genérico
        if (floating) {
            for (const color of ['W', 'U', 'B', 'R', 'G', 'C']) {
                if (genericNeeded <= 0) break;
                if (floating[color] > 0) {
                    const fromFloating = Math.min(floating[color], genericNeeded);
                    floating[color] -= fromFloating;
                    genericNeeded -= fromFloating;
                }
            }
        }

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
            lifeGained: { attacker: 0, defender: 0 },
            combatDetails: [] // Detalhes de cada combate para log
        };

        attackers.forEach(attacker => {
            const blockers = blockerAssignments[attacker.instanceId] || [];
            const attackerPower = this.getCreaturePower(attacker, true);

            if (blockers.length === 0) {
                // Dano direto ao jogador
                let damage = attackerPower;

                // Double Strike: dobra o dano ao jogador (first strike + normal damage)
                if (attacker.keywords && attacker.keywords.includes('double_strike')) {
                    damage *= 2;
                }

                results.damageToPlayers.defender += damage;

                // Registrar dano direto
                results.combatDetails.push({
                    type: 'direct',
                    attacker: attacker.name,
                    damage: damage
                });

                // Lifelink
                if (attacker.keywords && attacker.keywords.includes('lifelink')) {
                    results.lifeGained.attacker += damage;
                }
            } else {
                // Combate com bloqueadores
                let damageToAttacker = 0;

                // Verificar keywords de combate
                const hasFirstStrike = attacker.keywords &&
                    (attacker.keywords.includes('first_strike') || attacker.keywords.includes('double_strike'));
                const hasDoubleStrike = attacker.keywords && attacker.keywords.includes('double_strike');

                // Double Strike: dano total é dobrado (first strike + normal)
                let attackerDamage = hasDoubleStrike ? attackerPower * 2 : attackerPower;
                let trampleDamage = 0;

                blockers.forEach(blocker => {
                    const blockerPower = this.getCreaturePower(blocker);
                    const blockerToughness = this.getCreatureToughness(blocker);
                    let damageToBlocker = Math.min(attackerDamage, blockerToughness);
                    let damageFromBlocker = 0;

                    // Se atacante tem first strike/double strike e bloqueador não, atacante pode matar antes de receber dano
                    const blockerHasFirstStrike = blocker.keywords &&
                        (blocker.keywords.includes('first_strike') || blocker.keywords.includes('double_strike'));

                    // First Strike: se atacante tem e bloqueador não, bloqueador pode morrer antes de causar dano
                    if (hasFirstStrike && !blockerHasFirstStrike && attackerPower >= blockerToughness) {
                        // Bloqueador morre na fase de first strike, não causa dano
                        damageFromBlocker = 0;
                    } else {
                        damageFromBlocker = blockerPower;
                        damageToAttacker += blockerPower;
                    }

                    // Registrar combate entre criaturas
                    results.combatDetails.push({
                        type: 'blocked',
                        attacker: attacker.name,
                        blocker: blocker.name,
                        damageToBlocker: damageToBlocker,
                        damageToAttacker: damageFromBlocker
                    });

                    // Deathtouch do atacante
                    const attackerHasDeathtouch = attacker.keywords && attacker.keywords.includes('deathtouch');

                    if (attackerHasDeathtouch && attackerPower > 0) {
                        results.creaturesDied.push(blocker);
                    } else if (attackerDamage >= blockerToughness) {
                        results.creaturesDied.push(blocker);
                    }

                    // Deathtouch do bloqueador
                    const blockerHasDeathtouch = blocker.keywords && blocker.keywords.includes('deathtouch');

                    if (blockerHasDeathtouch && blockerPower > 0) {
                        // Só causa dano se não morreu na fase de first strike
                        if (!hasFirstStrike || blockerHasFirstStrike || attackerPower < blockerToughness) {
                            results.creaturesDied.push(attacker);
                        }
                    }

                    // Trample: dano excedente vai pro jogador
                    if (attacker.keywords && attacker.keywords.includes('trample')) {
                        const excessDamage = attackerDamage - blockerToughness;
                        if (excessDamage > 0) {
                            trampleDamage += excessDamage;
                            results.damageToPlayers.defender += excessDamage;
                        }
                    }

                    attackerDamage = Math.max(0, attackerDamage - blockerToughness);
                });

                // Registrar dano de trample se houver
                if (trampleDamage > 0) {
                    results.combatDetails.push({
                        type: 'trample',
                        attacker: attacker.name,
                        damage: trampleDamage
                    });
                }

                // Verificar se atacante morre
                const attackerToughness = this.getCreatureToughness(attacker);
                if (damageToAttacker >= attackerToughness && !results.creaturesDied.includes(attacker)) {
                    results.creaturesDied.push(attacker);
                }

                // Lifelink do atacante (considera dano total causado incluindo double strike)
                if (attacker.keywords && attacker.keywords.includes('lifelink')) {
                    let lifelinkDamage = hasDoubleStrike ? attackerPower * 2 : attackerPower;
                    results.lifeGained.attacker += lifelinkDamage;
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

            // Dropkick Bomber: outros Goblins têm +1/+1
            if (card.id === 'dropkick_bomber' && card !== creature &&
                creature.subtype && creature.subtype.includes('Goblin')) {
                bonuses.power += 1;
                bonuses.toughness += 1;
                bonuses.sources.push({ name: 'Dropkick Bomber', power: 1, toughness: 1 });
            }

            // Corsair Captain: outros Piratas têm +1/+1
            if (card.id === 'corsair_captain' && card !== creature &&
                creature.subtype && creature.subtype.includes('Pirate')) {
                bonuses.power += 1;
                bonuses.toughness += 1;
                bonuses.sources.push({ name: 'Corsair Captain', power: 1, toughness: 1 });
            }

            // Crossway Troublemakers: Vampiros atacantes têm deathtouch e lifelink
            // (isso é tratado em getCreatureKeywords)
        });

        // === EQUIPAMENTOS ANEXADOS ===
        allBattlefields.forEach(card => {
            if (card.subtype === 'Equipment' && card.attachedTo === creature.instanceId) {
                // Pirate's Cutlass: +2/+1
                if (card.id === 'pirates_cutlass') {
                    bonuses.power += 2;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: "Pirate's Cutlass", power: 2, toughness: 1 });
                }
            }
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
        // Verificar se está afetado por Eaten by Piranhas (base 1/1)
        if (this.isAffectedByEatenByPiranhas(creature)) {
            return 1;
        }

        let power = creature.power || 0;
        power += creature.powerModifier || 0;

        const bonuses = this.getCreatureBonuses(creature, isAttacking);
        power += bonuses.power;

        return Math.max(0, power);
    }

    getCreatureToughness(creature, isAttacking = false) {
        // Verificar se está afetado por Eaten by Piranhas (base 1/1)
        if (this.isAffectedByEatenByPiranhas(creature)) {
            return 1;
        }

        let toughness = creature.toughness || 0;
        toughness += creature.toughnessModifier || 0;

        const bonuses = this.getCreatureBonuses(creature, isAttacking);
        toughness += bonuses.toughness;

        return Math.max(0, toughness);
    }

    // Verifica se uma criatura está afetada por Eaten by Piranhas
    isAffectedByEatenByPiranhas(creature) {
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.some(card =>
            card.id === 'eaten_by_piranhas' &&
            card.subtype === 'Aura' &&
            card.attachedTo === creature.instanceId
        );
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

        // Kitesail Corsair: tem voar enquanto ataca
        if (isAttacking && creature.keywords && creature.keywords.includes('flying_when_attacking')) {
            if (!keywords.includes('flying')) keywords.push('flying');
        }

        // Untamed Hunger: menace
        allBattlefields.forEach(card => {
            if (card.subtype === 'Aura' && card.attachedTo === creature.instanceId) {
                if (card.id === 'untamed_hunger') {
                    if (!keywords.includes('menace')) keywords.push('menace');
                }
            }
        });

        // Eaten by Piranhas: criatura perde todas as habilidades
        allBattlefields.forEach(card => {
            if (card.subtype === 'Aura' && card.attachedTo === creature.instanceId) {
                if (card.id === 'eaten_by_piranhas') {
                    // Remove todas as keywords
                    keywords.length = 0;
                }
            }
        });

        // Incluir keywords temporárias (Kindled Fury, Wildheart Invoker, Dropkick Bomber, etc.)
        if (creature.temporaryKeywords && creature.temporaryKeywords.length > 0) {
            creature.temporaryKeywords.forEach(kw => {
                if (!keywords.includes(kw)) {
                    keywords.push(kw);
                }
            });
        }

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
