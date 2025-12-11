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
    [PHASES.UNTAP]: 'Untap',
    [PHASES.UPKEEP]: 'Upkeep',
    [PHASES.DRAW]: 'Draw',
    [PHASES.MAIN1]: 'Main 1',
    [PHASES.COMBAT_BEGIN]: 'Combate',
    [PHASES.DECLARE_ATTACKERS]: 'Combate',
    [PHASES.DECLARE_BLOCKERS]: 'Combate',
    [PHASES.COMBAT_DAMAGE]: 'Combate',
    [PHASES.COMBAT_END]: 'Combate',
    [PHASES.MAIN2]: 'Main 2',
    [PHASES.END]: 'End',
    [PHASES.CLEANUP]: 'Cleanup'
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

        // Cartas com Flash podem ser jogadas como instants
        const hasFlash = card.keywords && card.keywords.includes('flash');

        // Instantes (ou cartas com Flash): qualquer momento com prioridade
        if (card.type === 'instant' || hasFlash) {
            return this.canCastInstant(card, player);
        }

        // Feitiços/Criaturas/Encantamentos/Artefatos: main phase, mana suficiente
        if (card.type === 'creature' || card.type === 'sorcery' ||
            card.type === 'enchantment' || card.type === 'artifact') {
            return this.canCastSpell(card, player);
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

        if (!isMainPhase || !isActivePlayer || !hasEnoughMana) {
            return false;
        }

        // Auras precisam de alvos válidos
        if (card.type === 'enchantment' && card.subtype === 'Aura') {
            return this.hasValidAuraTargets(card, player);
        }

        return true;
    }

    /**
     * Verifica se uma Aura tem alvos válidos
     */
    hasValidAuraTargets(aura, player) {
        const opponent = player === this.game.player ? this.game.opponent : this.game.player;

        // Auras de buff (Untamed Hunger) - miram suas próprias criaturas
        if (aura.id === 'untamed_hunger') {
            return player.battlefield.some(c => c.type === 'creature');
        }

        // Pacifism - mira apenas criaturas do oponente
        if (aura.id === 'pacifism') {
            return opponent.battlefield.some(c => c.type === 'creature');
        }

        // Eaten by Piranhas - pode mirar QUALQUER criatura (tem Flash, pode ser usada defensivamente)
        if (aura.id === 'eaten_by_piranhas') {
            const allCreatures = [
                ...player.battlefield.filter(c => c.type === 'creature'),
                ...opponent.battlefield.filter(c => c.type === 'creature')
            ];
            return allCreatures.length > 0;
        }

        // Default: qualquer criatura no campo
        const allCreatures = [
            ...player.battlefield.filter(c => c.type === 'creature'),
            ...opponent.battlefield.filter(c => c.type === 'creature')
        ];
        return allCreatures.length > 0;
    }

    canCastInstant(card, player) {
        const hasEnoughMana = this.hasEnoughMana(card, player);
        if (!hasEnoughMana) return false;

        // Auras com Flash precisam verificar alvos válidos
        if (card.type === 'enchantment' && card.subtype === 'Aura') {
            return this.hasValidAuraTargets(card, player);
        }

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
                    // Uncharted Haven: usa a cor escolhida, ou 'any' se ainda não escolheu
                    if (card.chosenColor) {
                        mana[card.chosenColor]++;
                    } else {
                        mana.any++;
                    }
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

    /**
     * Detecta as cores presentes no deck do jogador
     * Usado para determinar opções válidas para Uncharted Haven
     * @param {Object} player - Jogador
     * @returns {Array} - Array de cores (ex: ['W', 'G'])
     */
    getPlayerDeckColors(player) {
        const colors = new Set();

        // Verificar todas as zonas do jogador
        const allCards = [
            ...player.library,
            ...player.hand,
            ...player.battlefield,
            ...player.graveyard
        ];

        allCards.forEach(card => {
            // Terrenos básicos que produzem cor específica
            if (card.type === 'land' && card.produces && card.produces !== 'any') {
                colors.add(card.produces);
            }
            // Também verificar custos de mana das cartas para detectar cores
            if (card.cost) {
                const colorMatches = card.cost.match(/[WUBRG]/g);
                if (colorMatches) {
                    colorMatches.forEach(c => colors.add(c));
                }
            }
        });

        return Array.from(colors);
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

            // Usar terrenos da cor (incluindo Uncharted Haven com cor escolhida)
            for (const land of lands) {
                if (needed <= 0) break;
                // Terreno produz a cor diretamente OU é um Haven que escolheu essa cor
                const producesColor = land.produces === color ||
                    (land.produces === 'any' && land.chosenColor === color);
                if (producesColor && !land.tapped) {
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

            // Usar terrenos "any" que ainda não escolheram cor (fallback)
            for (const land of lands) {
                if (needed <= 0) break;
                if (land.produces === 'any' && !land.chosenColor && !land.tapped) {
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
        // Usa hasKeyword para considerar efeitos condicionais (ex: flying_when_attacking)
        if (this.hasKeyword(attacker, 'flying', true)) {
            const blockerHasFlying = this.hasKeyword(blocker, 'flying', false);
            const blockerHasReach = this.hasKeyword(blocker, 'reach', false);
            if (!blockerHasFlying && !blockerHasReach) return false;
        }

        return true;
    }

    /**
     * Calcula dano de combate
     * @param {Array} attackers - Criaturas atacantes
     * @param {Object} blockerAssignments - Mapa de attackerInstanceId -> Array de bloqueadores
     * @param {Object} defendingPlayer - Jogador que está defendendo
     * @param {Object} attackingPlayer - Jogador que está atacando
     * @param {Object} damageAssignments - Mapa de attackerInstanceId -> { blockerInstanceId: dano }
     */
    resolveCombatDamage(attackers, blockerAssignments, defendingPlayer, attackingPlayer, damageAssignments = {}) {
        const results = {
            creaturesDied: [],
            damageToPlayers: { attacker: 0, defender: 0 },
            lifeGained: { attacker: 0, defender: 0 },
            combatDetails: [] // Detalhes de cada combate para log
        };

        attackers.forEach(attacker => {
            // Filtrar apenas bloqueadores que ainda estão no campo de batalha
            // (podem ter sido removidos por instants como Elspeth's Smite)
            const declaredBlockers = blockerAssignments[attacker.instanceId] || [];
            const blockers = declaredBlockers.filter(blocker =>
                defendingPlayer.battlefield.includes(blocker)
            );
            const attackerPower = this.getCreaturePower(attacker, true);

            // Obter keywords do atacante considerando efeitos condicionais (ex: Crossway Troublemakers)
            // Conforme regras MTG 611.3a, 702.2b, 702.15b - keywords são verificadas no momento do dano
            const attackerHasDoubleStrike = this.hasKeyword(attacker, 'double_strike', true);
            const attackerHasFirstStrike = this.hasKeyword(attacker, 'first_strike', true) || attackerHasDoubleStrike;
            const attackerHasDeathtouch = this.hasKeyword(attacker, 'deathtouch', true);
            const attackerHasLifelink = this.hasKeyword(attacker, 'lifelink', true);
            const attackerHasTrample = this.hasKeyword(attacker, 'trample', true);

            if (blockers.length === 0) {
                // Dano direto ao jogador
                let damage = attackerPower;

                // Double Strike: dobra o dano ao jogador (first strike + normal damage)
                if (attackerHasDoubleStrike) {
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
                if (attackerHasLifelink) {
                    results.lifeGained.attacker += damage;
                }
            } else {
                // Combate com bloqueadores
                let damageToAttacker = 0;

                // Double Strike: dano total é dobrado (first strike + normal)
                const totalAttackerDamage = attackerHasDoubleStrike ? attackerPower * 2 : attackerPower;

                // Obter atribuição de dano para este atacante (ou criar padrão)
                let damageMap = damageAssignments[attacker.instanceId];
                if (!damageMap && blockers.length > 0) {
                    // Sem atribuição específica: dividir dano igualmente (comportamento legado)
                    // ou todo dano para o único bloqueador
                    damageMap = {};
                    if (blockers.length === 1) {
                        damageMap[blockers[0].instanceId] = totalAttackerDamage;
                    } else {
                        // Dividir igualmente como fallback
                        const damagePerBlocker = Math.floor(totalAttackerDamage / blockers.length);
                        let remainder = totalAttackerDamage % blockers.length;
                        blockers.forEach(b => {
                            damageMap[b.instanceId] = damagePerBlocker + (remainder > 0 ? 1 : 0);
                            if (remainder > 0) remainder--;
                        });
                    }
                }

                let trampleDamage = 0;
                let totalDamageDealt = 0;

                blockers.forEach(blocker => {
                    const blockerPower = this.getCreaturePower(blocker);
                    const blockerToughness = this.getCreatureToughness(blocker);

                    // Keywords do bloqueador (não está atacando, então isAttacking = false)
                    const blockerHasFirstStrike = this.hasKeyword(blocker, 'first_strike', false) ||
                        this.hasKeyword(blocker, 'double_strike', false);
                    const blockerHasDeathtouch = this.hasKeyword(blocker, 'deathtouch', false);

                    // Obter dano atribuído a este bloqueador
                    const damageToBlocker = damageMap[blocker.instanceId] || 0;
                    totalDamageDealt += damageToBlocker;

                    let damageFromBlocker = 0;

                    // First Strike: se atacante tem e bloqueador não, bloqueador pode morrer antes de causar dano
                    if (attackerHasFirstStrike && !blockerHasFirstStrike && damageToBlocker >= blockerToughness) {
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

                    // Verificar se bloqueador morre
                    if (attackerHasDeathtouch && damageToBlocker > 0) {
                        results.creaturesDied.push(blocker);
                    } else if (damageToBlocker >= blockerToughness) {
                        results.creaturesDied.push(blocker);
                    }

                    // Deathtouch do bloqueador
                    if (blockerHasDeathtouch && blockerPower > 0) {
                        // Só causa dano se não morreu na fase de first strike
                        if (!attackerHasFirstStrike || blockerHasFirstStrike || damageToBlocker < blockerToughness) {
                            results.creaturesDied.push(attacker);
                        }
                    }
                });

                // Trample: dano que não foi atribuído aos bloqueadores vai pro jogador
                if (attackerHasTrample) {
                    // Calcular dano mínimo necessário (dano letal para cada bloqueador)
                    const minDamageNeeded = blockers.reduce((sum, b) => {
                        if (attackerHasDeathtouch) return sum + 1;
                        return sum + this.getCreatureToughness(b);
                    }, 0);

                    // Dano excedente ao dano letal vai para o defensor
                    const excessDamage = totalAttackerDamage - minDamageNeeded;
                    if (excessDamage > 0) {
                        trampleDamage = excessDamage;
                        results.damageToPlayers.defender += excessDamage;
                    }
                }

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
                if (attackerHasLifelink) {
                    results.lifeGained.attacker += totalDamageDealt + trampleDamage;
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
        // Eaten by Piranhas: base power/toughness vira 1/1, mas counters e outros bônus ainda aplicam
        let power;
        if (this.isAffectedByEatenByPiranhas(creature)) {
            power = 1; // Base 1/1
        } else {
            power = creature.power || 0;
        }

        // Modificadores temporários (até fim do turno)
        power += creature.powerModifier || 0;

        // Bônus de lords, auras, etc.
        const bonuses = this.getCreatureBonuses(creature, isAttacking);
        power += bonuses.power;

        return Math.max(0, power);
    }

    getCreatureToughness(creature, isAttacking = false) {
        // Eaten by Piranhas: base power/toughness vira 1/1, mas counters e outros bônus ainda aplicam
        let toughness;
        if (this.isAffectedByEatenByPiranhas(creature)) {
            toughness = 1; // Base 1/1
        } else {
            toughness = creature.toughness || 0;
        }

        // Modificadores temporários (até fim do turno)
        toughness += creature.toughnessModifier || 0;

        // Bônus de lords, auras, etc.
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

    /**
     * Verifica se uma criatura possui uma keyword específica, considerando
     * todas as fontes: keywords base, efeitos de outras cartas, auras, etc.
     *
     * Esta é a forma canônica de verificar keywords durante o jogo.
     * Usar este método garante que efeitos condicionais (como Crossway Troublemakers)
     * sejam corretamente aplicados conforme as regras MTG (611.3a, 702.2b, 702.15b).
     *
     * @param {Object} creature - A criatura a verificar
     * @param {string} keyword - A keyword a procurar
     * @param {boolean} isAttacking - Se a criatura está atacando (para efeitos condicionais)
     * @returns {boolean} true se a criatura possui a keyword
     */
    hasKeyword(creature, keyword, isAttacking = false) {
        const keywords = this.getCreatureKeywords(creature, isAttacking);
        return keywords.includes(keyword);
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
