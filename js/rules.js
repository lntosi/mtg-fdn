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
    [PHASES.COMBAT_BEGIN]: 'Combat',
    [PHASES.DECLARE_ATTACKERS]: 'Combat',
    [PHASES.DECLARE_BLOCKERS]: 'Combat',
    [PHASES.COMBAT_DAMAGE]: 'Combat',
    [PHASES.COMBAT_END]: 'Combat',
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

        // Sorceries precisam verificar alvos válidos (ex: Seize the Spoils precisa de carta para descartar)
        if (card.type === 'sorcery') {
            if (!this.hasValidTargets(card, player)) return false;
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
            // MTG: "Enchant creature" — pode encantar qualquer criatura
            return player.battlefield.some(c => c.type === 'creature') ||
                   opponent.battlefield.some(c => c.type === 'creature');
        }

        // New Horizons - enchant land (não criatura)
        if (aura.id === 'new_horizons') {
            return player.battlefield.some(c => c.type === 'land');
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
        const selfTargetBuffs = ['kindled_fury', 'snakeskin_veil', 'offer_immortality', 'adamant_will', 'giant_growth'];
        if (selfTargetBuffs.includes(card.id)) {
            const hasOwnCreatures = player.battlefield.some(c => c.type === 'creature');
            return hasOwnCreatures;
        }

        // Moment of Triumph - pode mirar qualquer criatura (MTG: "target creature")
        if (card.id === 'moment_of_triumph') {
            const hasAnyCreatures = player.battlefield.some(c => c.type === 'creature') ||
                                    opponent.battlefield.some(c => c.type === 'creature');
            return hasAnyCreatures;
        }

        // Remoção que mira criaturas do oponente
        // Bug fix: verificar hexproof - criaturas com hexproof não podem ser alvo
        const opponentTargetRemoval = ['moment_of_craving', 'heros_downfall', 'incinerating_blast', 'scorching_dragonfire', 'fiery_annihilation', 'murder'];
        if (opponentTargetRemoval.includes(card.id)) {
            const hasTargetableCreatures = opponent.battlefield.some(c =>
                c.type === 'creature' && this.canBeTargetedBy(c, player)
            );
            return hasTargetableCreatures;
        }

        // Deadly Riposte - qualquer criatura virada (MTG: "target tapped creature")
        // Bug fix: verificar hexproof
        if (card.id === 'deadly_riposte') {
            const hasTappedCreatures = player.battlefield.some(c => c.type === 'creature' && c.tapped) ||
                                       opponent.battlefield.some(c => c.type === 'creature' && c.tapped && this.canBeTargetedBy(c, player));
            return hasTappedCreatures;
        }

        // Broken Wings - artefatos, encantamentos ou criaturas com flying (qualquer jogador)
        if (card.id === 'broken_wings') {
            const hasOpponentTargets = opponent.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && this.hasKeyword(c, 'flying', false))
            );
            const hasOwnTargets = player.battlefield.some(c =>
                c.type === 'artifact' || c.type === 'enchantment' ||
                (c.type === 'creature' && this.hasKeyword(c, 'flying', false))
            );
            return hasOpponentTargets || hasOwnTargets;
        }

        // Felling Blow - precisa de criatura sua E criatura do oponente
        if (card.id === 'felling_blow') {
            const hasOwnCreature = player.battlefield.some(c => c.type === 'creature');
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            return hasOwnCreature && hasOpponentCreature;
        }

        // Bite Down - precisa de criatura sua E criatura do oponente
        if (card.id === 'bite_down') {
            const hasOwnCreature = player.battlefield.some(c => c.type === 'creature');
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            return hasOwnCreature && hasOpponentCreature;
        }

        // Biogenic Upgrade - precisa de criatura sua
        if (card.id === 'biogenic_upgrade') {
            return player.battlefield.some(c => c.type === 'creature');
        }

        // Fleeting Distraction - mira criatura (qualquer, exceto spells na pilha)
        // Bug fix: verificar hexproof para criaturas do oponente
        if (card.id === 'fleeting_distraction') {
            return opponent.battlefield.some(c => c.type === 'creature' && !c.pendingResolution && this.canBeTargetedBy(c, player)) ||
                   player.battlefield.some(c => c.type === 'creature' && !c.pendingResolution);
        }

        // Into the Roil - mira permanente não-terreno (exceto spells na pilha)
        if (card.id === 'into_the_roil') {
            const allPermanents = [...opponent.battlefield, ...player.battlefield];
            return allPermanents.some(c => c.type !== 'land' && !c.pendingResolution);
        }

        // Angelic Edict - criatura ou encantamento do oponente
        if (card.id === 'angelic_edict') {
            return opponent.battlefield.some(c =>
                c.type === 'creature' || c.type === 'enchantment'
            );
        }

        // Counterspells - precisam de spell do oponente na stack
        // Bug fix R9: Removido código duplicado para 'cancel' (já tem keyword 'counterspell')
        if (card.keywords && (card.keywords.includes('counterspell') || card.keywords.includes('counterspell_creature'))) {
            // Verificar se há spells do oponente na pilha que podem ser anulados
            return this.game.stack.some(item => {
                if (item.controller === player || item.item.type === 'land') return false;
                // counterspell_creature só pode anular criaturas
                if (card.keywords.includes('counterspell_creature')) {
                    return item.item.type === 'creature';
                }
                return true;
            });
        }

        // Seize the Spoils - precisa de uma carta na mão para descartar
        if (card.id === 'seize_the_spoils') {
            // The card itself will be in hand when cast, so we need at least 2 cards
            // (the spell + one to discard). But since playCard removes the card first,
            // we check if there's at least 1 card remaining.
            return player.hand.length >= 2; // Including the spell itself
        }

        // === NEW UNDEAD DECK SPELLS ===

        // Undying Malice - needs any creature
        if (card.id === 'undying_malice') {
            const allCreatures = [
                ...player.battlefield.filter(c => c.type === 'creature'),
                ...opponent.battlefield.filter(c => c.type === 'creature')
            ];
            return allCreatures.length > 0;
        }

        // Deadly Plot - needs opponent creature OR zombie in graveyard (modal spell)
        if (card.id === 'deadly_plot') {
            const hasOpponentCreature = opponent.battlefield.some(c => c.type === 'creature');
            const hasZombieInGraveyard = player.graveyard.some(c =>
                c.type === 'creature' && c.subtype?.includes('Zombie')
            );
            return hasOpponentCreature || hasZombieInGraveyard;
        }

        // Cemetery Recruitment - needs creature in graveyard
        if (card.id === 'cemetery_recruitment') {
            return player.graveyard.some(c => c.type === 'creature');
        }

        // Eaten Alive - needs opponent creature AND (can sacrifice OR has extra mana)
        if (card.id === 'eaten_alive') {
            const hasOpponentPermanent = opponent.battlefield.some(c =>
                c.type === 'creature' || c.type === 'planeswalker'
            );
            if (!hasOpponentPermanent) return false;

            // Check if can sacrifice or pay extra mana
            const hasCreatureToSacrifice = player.battlefield.some(c => c.type === 'creature');
            const availableMana = this.calculateAvailableMana(player);
            const totalMana = availableMana.W + availableMana.U + availableMana.B + availableMana.R + availableMana.G + (availableMana.C || 0) + availableMana.any;
            const canPayExtra = totalMana >= 5 && availableMana.B >= 2; // {3}{B} + {B} base = 5 total, 2B

            return hasCreatureToSacrifice || canPayExtra;
        }

        // Para outros instants, assumir que sempre há alvos válidos
        return true;
    }

    hasEnoughMana(card, player) {
        if (!card.cmc && !this.hasXCost(card)) return true;

        const availableMana = this.calculateAvailableMana(player);
        const cost = this.parseCost(card.cost);

        // Para cartas com X no custo, verificar se pode pagar pelo menos X=1
        // (X=0 geralmente resulta em criatura 0/0 que morre imediatamente)
        if (cost.hasX) {
            // Precisa ter mana suficiente para parte colorida + pelo menos 1 para X
            const minXValue = 1;
            cost.generic += minXValue; // Tratar X mínimo como genérico
        }

        // Aplicar reduções de custo
        this.applyCostReductions(cost, card, player);

        return this.canPayCost(cost, availableMana);
    }

    calculateAvailableMana(player) {
        const mana = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, any: 0 };

        // Encontrar todas as auras New Horizons no campo do jogador
        const newHorizonsAuras = player.battlefield.filter(c =>
            c.id === 'new_horizons' && c.attachedTo
        );
        const landsWithNewHorizons = new Set(newHorizonsAuras.map(a => a.attachedTo));

        player.battlefield.forEach(card => {
            if (card.type === 'land' && !card.tapped) {
                // Verificar se o terreno está encantado com New Horizons
                if (landsWithNewHorizons.has(card.instanceId)) {
                    // New Horizons: "{T}: Add two mana of any one color"
                    // Terreno encantado produz 2 mana de qualquer cor (não apenas sua cor original)
                    mana.any += 2;
                } else if (card.produces === 'any') {
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
            // Bug fix: verificar hasLostAllAbilities - criaturas com Eaten by Piranhas não podem tapar por mana
            if (card.keywords && card.keywords.includes('tap_for_mana') && !card.tapped && !card.summoningSickness && !this.hasLostAllAbilities(card)) {
                if (card.produces) {
                    mana[card.produces]++;
                }
            }
            // Treasure tokens (sacrifice for mana of any color)
            if (card.canSacrificeForMana && card.keywords?.includes('sacrifice_for_mana')) {
                mana.any++;
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
        if (!costString) return { generic: 0, colored: {}, hasX: false };

        const cost = { generic: 0, colored: {}, hasX: false };
        const matches = costString.match(/(\d+)|([WUBRGX])/g) || [];

        matches.forEach(match => {
            if (match === 'X') {
                cost.hasX = true;
            } else if (/\d+/.test(match)) {
                cost.generic += parseInt(match);
            } else {
                cost.colored[match] = (cost.colored[match] || 0) + 1;
            }
        });

        return cost;
    }

    /**
     * Verifica se o custo de uma carta contém X
     */
    hasXCost(card) {
        return card.cost?.includes('X') || false;
    }

    /**
     * Calcula o mana total disponível para pagar X
     */
    getMaxXValue(card, player) {
        const availableMana = this.calculateAvailableMana(player);
        const cost = this.parseCost(card.cost);

        // Aplicar reduções de custo (dragon servant, etc)
        this.applyCostReductions(cost, card, player);

        // Calcular mana necessário para a parte não-X do custo
        let reservedForColored = 0;
        for (const color in cost.colored) {
            reservedForColored += cost.colored[color];
        }
        reservedForColored += cost.generic;

        // Mana total disponível
        const totalMana = Object.values(availableMana).reduce((a, b) => a + b, 0);

        // X máximo = mana total - custo base (parte não-X)
        return Math.max(0, totalMana - reservedForColored);
    }

    /**
     * Aplica reduções de custo a um objeto cost
     */
    applyCostReductions(cost, card, player) {
        // Tolarian Terror
        if (card.id === 'tolarian_terror') {
            const instantSorceryCount = player.graveyard.filter(c =>
                c.type === 'instant' || c.type === 'sorcery'
            ).length;
            cost.generic = Math.max(0, cost.generic - instantSorceryCount);
        }

        // Dragonlord's Servant
        if (this.game?.activeEffects?.costReduction > 0 &&
            card.subtype?.includes('Dragon') && card.type === 'creature') {
            const servantCount = player.battlefield.filter(c =>
                c.id === 'dragonlords_servant'
            ).length;
            if (servantCount > 0) {
                cost.generic = Math.max(0, cost.generic - servantCount);
            }
        }

        // Wizard discount
        if (card.keywords?.includes('wizard_discount')) {
            const hasWizard = player.battlefield.some(c =>
                c.type === 'creature' && c.subtype?.includes('Wizard')
            );
            if (hasWizard) {
                cost.generic = Math.max(0, cost.generic - 1);
            }
        }
    }

    /**
     * Calcula o déficit de mana para conjurar uma carta
     * @returns {{ canPay: boolean, isLand: boolean, missing: { generic: number, colored: Object } }}
     */
    getManaDeficit(card, player) {
        if (card.type === 'land') return { canPay: true, isLand: true, missing: { generic: 0, colored: {} } };
        if (!card.cmc && !this.hasXCost(card)) return { canPay: true, isLand: false, missing: { generic: 0, colored: {} } };

        const availableMana = this.calculateAvailableMana(player);
        const cost = this.parseCost(card.cost);

        if (cost.hasX) {
            cost.generic += 1; // mínimo X=1
        }

        this.applyCostReductions(cost, card, player);

        // Simular pagamento e calcular déficit
        let remainingMana = { ...availableMana };
        const missing = { generic: 0, colored: {} };

        // Pagar custos coloridos
        for (const color in cost.colored) {
            const needed = cost.colored[color];
            if (remainingMana[color] >= needed) {
                remainingMana[color] -= needed;
            } else if (remainingMana[color] + remainingMana.any >= needed) {
                const fromColor = remainingMana[color];
                remainingMana[color] = 0;
                remainingMana.any -= (needed - fromColor);
            } else {
                const fromColor = remainingMana[color];
                const fromAny = remainingMana.any;
                const paid = fromColor + fromAny;
                remainingMana[color] = 0;
                remainingMana.any = 0;
                missing.colored[color] = needed - paid;
            }
        }

        // Pagar custo genérico
        const totalRemaining = Object.values(remainingMana).reduce((a, b) => a + b, 0);
        if (totalRemaining < cost.generic) {
            missing.generic = cost.generic - totalRemaining;
        }

        const canPay = Object.keys(missing.colored).length === 0 && missing.generic === 0;
        return { canPay, isLand: false, missing };
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

    // Pagar mana (tapa terrenos automaticamente, ou usa pré-selecionados)
    // selectedLands: array opcional de terrenos pré-selecionados pelo jogador
    // xValue: valor de X para cartas com custo X (opcional)
    payMana(card, player, selectedLands = [], xValue = 0) {
        const cost = this.parseCost(card.cost);

        // Se a carta tem X no custo, adicionar o valor de X ao custo genérico
        if (cost.hasX && xValue > 0) {
            cost.generic += xValue;
        }

        // Tolarian Terror: custo reduzido por instant/sorcery no cemitério
        if (card.id === 'tolarian_terror') {
            const instantSorceryCount = player.graveyard.filter(c =>
                c.type === 'instant' || c.type === 'sorcery'
            ).length;
            cost.generic = Math.max(0, cost.generic - instantSorceryCount);
        }

        // Dragonlord's Servant: Dragon spells cost {1} less
        // Otimização: só verifica se há cartas de cost reduction em jogo
        if (this.game?.activeEffects?.costReduction > 0 &&
            card.subtype?.includes('Dragon') && card.type === 'creature') {
            const servantCount = player.battlefield.filter(c =>
                c.id === 'dragonlords_servant'
            ).length;
            if (servantCount > 0) {
                cost.generic = Math.max(0, cost.generic - servantCount);
            }
        }

        // Arcane Epiphany: costs {1} less if you control a Wizard
        if (card.keywords?.includes('wizard_discount')) {
            const hasWizard = player.battlefield.some(c =>
                c.type === 'creature' && c.subtype?.includes('Wizard')
            );
            if (hasWizard) {
                cost.generic = Math.max(0, cost.generic - 1);
            }
        }

        // Separar terrenos e criaturas pré-selecionados dos demais
        const selectedIds = new Set(selectedLands.map(l => l.instanceId));

        // Terrenos pré-selecionados e não-selecionados
        const preSelected = player.battlefield.filter(c =>
            c.type === 'land' && !c.tapped && selectedIds.has(c.instanceId)
        );
        const otherLands = player.battlefield.filter(c =>
            c.type === 'land' && !c.tapped && !selectedIds.has(c.instanceId)
        );

        // Criaturas que produzem mana (tap_for_mana)
        // Bug fix: verificar hasLostAllAbilities - criaturas com Eaten by Piranhas não podem tapar por mana
        const allManaCreatures = player.battlefield.filter(c =>
            c.keywords && c.keywords.includes('tap_for_mana') && !c.tapped && !c.summoningSickness && !this.hasLostAllAbilities(c)
        );

        // Separar criaturas pré-selecionadas das demais
        const preSelectedCreatures = allManaCreatures.filter(c => selectedIds.has(c.instanceId));
        const manaCreatures = allManaCreatures.filter(c => !selectedIds.has(c.instanceId));

        // Treasure tokens disponíveis para sacrifício
        const treasures = player.battlefield.filter(c =>
            c.canSacrificeForMana && c.keywords?.includes('sacrifice_for_mana')
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

            // 1. Usar terrenos PRÉ-SELECIONADOS com New Horizons da cor escolhida (produzem 2)
            for (const land of preSelected) {
                if (needed <= 0) break;
                if (land.newHorizonsChosenColor === color && !land.tapped) {
                    land.tapped = true;
                    needed -= 2; // New Horizons produz 2 mana
                }
            }

            // 2. Usar terrenos PRÉ-SELECIONADOS normais da cor
            for (const land of preSelected) {
                if (needed <= 0) break;
                if (land.newHorizonsChosenColor) continue; // Já tratado acima
                const producesColor = land.produces === color ||
                    (land.produces === 'any' && land.chosenColor === color);
                if (producesColor && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }

            // 3. Usar criaturas PRÉ-SELECIONADAS que produzem mana da cor
            for (const creature of preSelectedCreatures) {
                if (needed <= 0) break;
                if (creature.produces === color && !creature.tapped) {
                    creature.tapped = true;
                    needed--;
                }
            }

            // 4. Usar outros terrenos da cor (auto-tap)
            for (const land of otherLands) {
                if (needed <= 0) break;
                const producesColor = land.produces === color ||
                    (land.produces === 'any' && land.chosenColor === color);
                if (producesColor && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }

            // 5. Usar outras criaturas mana da cor (auto-tap)
            for (const creature of manaCreatures) {
                if (needed <= 0) break;
                if (creature.produces === color && !creature.tapped) {
                    creature.tapped = true;
                    needed--;
                }
            }

            // Usar terrenos "any" que ainda não escolheram cor (fallback)
            // Primeiro pré-selecionados (exceto New Horizons que já foi tratado)
            for (const land of preSelected) {
                if (needed <= 0) break;
                if (land.newHorizonsChosenColor) continue;
                if (land.produces === 'any' && !land.chosenColor && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }
            // Depois outros
            for (const land of otherLands) {
                if (needed <= 0) break;
                if (land.produces === 'any' && !land.chosenColor && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }

            // 6. Sacrificar Treasure tokens para pagar custo colorido restante
            for (let i = treasures.length - 1; i >= 0 && needed > 0; i--) {
                const idx = player.battlefield.findIndex(c => c.instanceId === treasures[i].instanceId);
                if (idx !== -1) {
                    if (this.game?.ui) this.game.ui.notifyCardLeaving(treasures[i]);
                    player.battlefield.splice(idx, 1);
                    treasures.splice(i, 1);
                    needed--;
                    if (this.game?.ui) this.game.ui.log(`Treasure Token sacrificado para mana`);
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

        // Usar terrenos pré-selecionados para genérico primeiro
        // Terrenos com New Horizons produzem 2 mana
        for (const land of preSelected) {
            if (genericNeeded <= 0) break;
            if (!land.tapped) {
                land.tapped = true;
                if (land.newHorizonsChosenColor) {
                    genericNeeded -= 2; // New Horizons produz 2 mana
                } else {
                    genericNeeded--;
                }
            }
        }

        // Usar criaturas pré-selecionadas para genérico
        for (const creature of preSelectedCreatures) {
            if (genericNeeded <= 0) break;
            if (!creature.tapped) {
                creature.tapped = true;
                genericNeeded--;
            }
        }

        // Depois outros terrenos (auto-tap)
        for (const land of otherLands) {
            if (genericNeeded <= 0) break;
            if (!land.tapped) {
                land.tapped = true;
                genericNeeded--;
            }
        }

        // Depois outras criaturas mana (auto-tap)
        for (const creature of manaCreatures) {
            if (genericNeeded <= 0) break;
            if (!creature.tapped) {
                creature.tapped = true;
                genericNeeded--;
            }
        }

        // Sacrificar Treasure tokens para pagar custo genérico restante
        for (let i = treasures.length - 1; i >= 0 && genericNeeded > 0; i--) {
            const idx = player.battlefield.findIndex(c => c.instanceId === treasures[i].instanceId);
            if (idx !== -1) {
                if (this.game?.ui) this.game.ui.notifyCardLeaving(treasures[i]);
                player.battlefield.splice(idx, 1);
                treasures.splice(i, 1);
                genericNeeded--;
                if (this.game?.ui) this.game.ui.log(`Treasure Token sacrificado para mana`);
            }
        }

        // Limpar cores temporárias escolhidas para New Horizons
        for (const land of preSelected) {
            delete land.newHorizonsChosenColor;
        }
    }

    // Verifica se criatura pode atacar
    canAttack(creature) {
        if (creature.tapped) return false;
        // Haste permite atacar mesmo com summoning sickness (regra 702.10)
        if (creature.summoningSickness && !this.hasKeyword(creature, 'haste', false)) return false;
        if (creature.type !== 'creature') return false;

        // Verificar se tem Pacifism anexado
        if (this.hasPacifism(creature)) return false;

        return true;
    }

    // Verifica se criatura tem Pacifism (ou efeito similar)
    hasPacifism(creature) {
        // Otimização: se não há efeitos Pacifism em jogo, retorna false imediatamente
        if (this.game?.activeEffects?.pacifism === 0) {
            return false;
        }
        if (!this.game?.player?.battlefield || !this.game?.opponent?.battlefield) {
            return false;
        }
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.some(card =>
            card.id === 'pacifism' && card.attachedTo === creature.instanceId
        );
    }

    // Verifica se criatura tem freeze_aura (Starlight Snare) - não desvira
    hasFreezeAura(creature) {
        if (!this.game?.player?.battlefield || !this.game?.opponent?.battlefield) {
            return false;
        }
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.some(card =>
            card.keywords?.includes('freeze_aura') && card.attachedTo === creature.instanceId
        );
    }

    // Verifica se criatura pode bloquear
    canBlock(blocker, attacker) {
        if (blocker.tapped) return false;
        if (blocker.type !== 'creature') return false;

        // Verificar se tem Pacifism anexado
        if (this.hasPacifism(blocker)) return false;

        // Criaturas com cant_block não podem bloquear (Vampire Interloper, etc.)
        if (this.hasKeyword(blocker, 'cant_block', false)) return false;

        // Verificar se o BLOQUEADOR não pode bloquear neste turno (Frenzied Goblin)
        if (this.game.cantBlockThisTurn && this.game.cantBlockThisTurn.includes(blocker.instanceId)) {
            return false;
        }

        // Verificar se o ATACANTE não pode ser bloqueado neste turno (Goblin Smuggler)
        if (attacker && this.game.cantBeBlockedThisTurn && this.game.cantBeBlockedThisTurn.includes(attacker.instanceId)) {
            return false;
        }

        // Menace: validado em game.js validateMenaceBlocks() e ai.js chooseBlockers()

        // Flying: só pode ser bloqueado por flying ou reach
        // Usa hasKeyword para considerar efeitos condicionais (ex: flying_when_attacking)
        // Só verifica se attacker foi passado
        if (attacker && this.hasKeyword(attacker, 'flying', true)) {
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
    /**
     * Resolve combat damage in two steps per MTG rules 510.1-510.4:
     * Step 1 (First Strike): Only first_strike/double_strike creatures deal damage
     * Step 2 (Normal): Non-first_strike creatures + double_strike deal damage again
     * Creatures killed in step 1 don't deal damage in step 2
     */
    resolveCombatDamage(attackers, blockerAssignments, defendingPlayer, attackingPlayer, damageAssignments = {}) {
        const results = {
            creaturesDied: [],
            damageToPlayers: { attacker: 0, defender: 0 },
            lifeGained: { attacker: 0, defender: 0 },
            lifelinkEvents: { attacker: [], defender: [] }, // Per-creature lifelink events (CR 118.9)
            combatDetails: [],
            attackersDealtDamage: new Set()
        };

        // Build combat data for each attacker
        const combats = attackers.map(attacker => {
            const declaredBlockers = blockerAssignments[attacker.instanceId] || [];
            const blockers = declaredBlockers.filter(b => defendingPlayer.battlefield.includes(b));
            return {
                attacker,
                blockers,
                aKeywords: this._getCombatKeywords(attacker, true),
                bKeywordsMap: new Map(blockers.map(b => [b, this._getCombatKeywords(b, false)]))
            };
        });

        // Check if any creature has first strike or double strike
        const hasFirstStrikeStep = combats.some(c =>
            c.aKeywords.firstStrike ||
            [...c.bKeywordsMap.values()].some(bk => bk.firstStrike)
        );

        // Track creatures killed in first strike step
        const firstStrikeDeaths = new Set();

        // === STEP 1: FIRST STRIKE DAMAGE (Rule 702.7) ===
        if (hasFirstStrikeStep) {
            this._dealCombatDamageStep(combats, damageAssignments, results, defendingPlayer, true, firstStrikeDeaths);
            // Mark deaths from first strike
            this._checkDeaths(combats, results, firstStrikeDeaths);
        }

        // === STEP 2: NORMAL DAMAGE ===
        this._dealCombatDamageStep(combats, damageAssignments, results, defendingPlayer, false, firstStrikeDeaths);
        // Mark deaths from normal damage
        this._checkDeaths(combats, results, firstStrikeDeaths);

        return results;
    }

    /** Get all combat-relevant keywords for a creature */
    _getCombatKeywords(creature, isAttacking) {
        return {
            firstStrike: this.hasKeyword(creature, 'first_strike', isAttacking) || this.hasKeyword(creature, 'double_strike', isAttacking),
            doubleStrike: this.hasKeyword(creature, 'double_strike', isAttacking),
            deathtouch: this.hasKeyword(creature, 'deathtouch', isAttacking),
            lifelink: this.hasKeyword(creature, 'lifelink', isAttacking),
            trample: this.hasKeyword(creature, 'trample', isAttacking),
            indestructible: this.hasKeyword(creature, 'indestructible', isAttacking)
        };
    }

    /**
     * Deal damage for one combat step (first strike or normal)
     * @param {boolean} isFirstStrikeStep - true for first strike step, false for normal
     * @param {Set} deadCreatures - creatures already dead from prior step
     */
    _dealCombatDamageStep(combats, damageAssignments, results, defendingPlayer, isFirstStrikeStep, deadCreatures) {
        for (const combat of combats) {
            const { attacker, blockers, aKeywords, bKeywordsMap } = combat;

            // Skip dead attackers
            if (deadCreatures.has(attacker)) continue;

            const attackerPower = this.getCreaturePower(attacker, true);

            // Does this attacker deal damage in this step?
            const attackerDealsThisStep = isFirstStrikeStep
                ? aKeywords.firstStrike    // Step 1: only first_strike/double_strike
                : (!aKeywords.firstStrike || aKeywords.doubleStrike); // Step 2: non-FS or double_strike

            if (blockers.length === 0) {
                // Unblocked - damage to player
                if (attackerDealsThisStep && attackerPower > 0) {
                    results.damageToPlayers.defender += attackerPower;
                    results.attackersDealtDamage.add(attacker);
                    results.combatDetails.push({
                        type: 'direct',
                        attacker: attacker.name,
                        attackerObj: attacker,
                        damage: attackerPower
                    });
                    if (aKeywords.lifelink) {
                        results.lifeGained.attacker += attackerPower;
                        results.lifelinkEvents.attacker.push(attackerPower);
                    }
                }
            } else {
                // Blocked combat
                const aliveBlockers = blockers.filter(b => !deadCreatures.has(b));
                if (aliveBlockers.length === 0 && !attackerDealsThisStep) continue;

                let totalAttackerDamageDealt = 0;

                // Build damage map for this step
                let stepDamageMap = null;
                if (attackerDealsThisStep && aliveBlockers.length > 0) {
                    stepDamageMap = this._buildStepDamageMap(
                        attacker, aliveBlockers, attackerPower,
                        damageAssignments, aKeywords, isFirstStrikeStep
                    );
                }

                // Process each alive blocker
                for (const blocker of aliveBlockers) {
                    const bKeywords = bKeywordsMap.get(blocker);
                    const blockerPower = this.getCreaturePower(blocker);

                    // Does this blocker deal damage in this step?
                    const blockerDealsThisStep = isFirstStrikeStep
                        ? bKeywords.firstStrike
                        : (!bKeywords.firstStrike || bKeywords.doubleStrike);

                    // Attacker damage to blocker
                    let damageToBlocker = 0;
                    if (attackerDealsThisStep && stepDamageMap) {
                        damageToBlocker = stepDamageMap[blocker.instanceId] || 0;
                        totalAttackerDamageDealt += damageToBlocker;
                    }

                    // Blocker damage to attacker
                    let damageToAttacker = 0;
                    if (blockerDealsThisStep && blockerPower > 0) {
                        damageToAttacker = blockerPower;
                    }

                    // Apply damage
                    if (damageToBlocker > 0) {
                        blocker.damage = (blocker.damage || 0) + damageToBlocker;
                    }
                    if (damageToAttacker > 0) {
                        attacker.damage = (attacker.damage || 0) + damageToAttacker;
                        // Rastrear se o atacante recebeu dano de fonte com deathtouch
                        if (bKeywords.deathtouch) {
                            attacker._tookDeathtouchDamage = true;
                        }
                        if (bKeywords.lifelink) {
                            results.lifeGained.defender += damageToAttacker;
                            results.lifelinkEvents.defender.push(damageToAttacker);
                        }
                    }

                    // Log combat details
                    if (damageToBlocker > 0 || damageToAttacker > 0) {
                        results.combatDetails.push({
                            type: 'blocked',
                            attacker: attacker.name,
                            attackerObj: attacker,
                            blocker: blocker.name,
                            blockerObj: blocker,
                            damageToBlocker,
                            damageToAttacker
                        });
                    }
                }

                // Track if attacker dealt damage to blockers
                if (totalAttackerDamageDealt > 0) {
                    results.attackersDealtDamage.add(attacker);
                }

                // Trample: excess damage to player (only when attacker deals damage)
                // Damage map already assigns only lethal to blockers when trample is active,
                // so excess = attackerPower - damage assigned to blockers
                if (attackerDealsThisStep && aKeywords.trample) {
                    if (aliveBlockers.length > 0) {
                        // Blockers alive: excess over lethal tramples through
                        const excess = attackerPower - totalAttackerDamageDealt;
                        if (excess > 0) {
                            results.damageToPlayers.defender += excess;
                            totalAttackerDamageDealt += excess;
                            results.combatDetails.push({
                                type: 'trample',
                                attacker: attacker.name,
                                attackerObj: attacker,
                                damage: excess
                            });
                        }
                    } else if (blockers.length > 0) {
                        // All blockers died in first strike step: full damage tramples through (CR 702.19c)
                        results.damageToPlayers.defender += attackerPower;
                        totalAttackerDamageDealt += attackerPower;
                        results.combatDetails.push({
                            type: 'trample',
                            attacker: attacker.name,
                            attackerObj: attacker,
                            damage: attackerPower
                        });
                    }
                }

                // Lifelink for attacker
                if (aKeywords.lifelink && totalAttackerDamageDealt > 0) {
                    results.lifeGained.attacker += totalAttackerDamageDealt;
                    results.lifelinkEvents.attacker.push(totalAttackerDamageDealt);
                }
            }
        }
    }

    /** Build damage distribution map for one step */
    _buildStepDamageMap(attacker, aliveBlockers, attackerPower, damageAssignments, aKeywords, isFirstStrikeStep) {
        const map = {};

        // Trample: assign only lethal damage to each blocker, excess tramples through
        if (aKeywords.trample) {
            let remaining = attackerPower;
            for (const blocker of aliveBlockers) {
                const lethal = aKeywords.deathtouch ? 1 :
                    Math.max(0, this.getCreatureToughness(blocker) - (blocker.damage || 0));
                const assigned = Math.min(remaining, lethal);
                map[blocker.instanceId] = assigned;
                remaining -= assigned;
            }
            return map;
        }

        // For single blocker (no trample), assign full power
        if (aliveBlockers.length === 1) {
            map[aliveBlockers[0].instanceId] = attackerPower;
            return map;
        }

        // For multiple blockers, use player/AI assignment if available
        const originalMap = damageAssignments[attacker.instanceId];
        if (originalMap) {
            // Scale original assignment proportionally to single-step power
            // Original was for total damage (possibly 2x with double_strike)
            const originalTotal = Object.values(originalMap).reduce((a, b) => a + b, 0);
            if (originalTotal > 0) {
                let remaining = attackerPower;
                const aliveIds = new Set(aliveBlockers.map(b => b.instanceId));
                // Distribute proportionally among alive blockers
                for (const blocker of aliveBlockers) {
                    const originalDmg = originalMap[blocker.instanceId] || 0;
                    const share = Math.min(remaining, Math.round(originalDmg * attackerPower / originalTotal));
                    map[blocker.instanceId] = share;
                    remaining -= share;
                }
                // Assign any remainder to first alive blocker
                if (remaining > 0 && aliveBlockers.length > 0) {
                    map[aliveBlockers[0].instanceId] = (map[aliveBlockers[0].instanceId] || 0) + remaining;
                }
                return map;
            }
        }

        // Default: divide equally
        const perBlocker = Math.floor(attackerPower / aliveBlockers.length);
        let remainder = attackerPower % aliveBlockers.length;
        aliveBlockers.forEach(b => {
            map[b.instanceId] = perBlocker + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
        });
        return map;
    }

    /** Check all creatures for lethal damage and add to dead list (SBA batch - Rule 704.3) */
    _checkDeaths(combats, results, deadCreatures) {
        for (const { attacker, blockers, aKeywords, bKeywordsMap } of combats) {
            // Check attacker death
            if (!deadCreatures.has(attacker) && !aKeywords.indestructible) {
                const totalDamage = attacker.damage || 0;
                const toughness = this.getCreatureToughness(attacker);
                // Flag precisa: setada em _dealCombatDamageStep quando blocker com deathtouch causa dano
                const killedByDeathtouch = !!attacker._tookDeathtouchDamage;
                if (totalDamage >= toughness || killedByDeathtouch) {
                    if (!results.creaturesDied.includes(attacker)) {
                        results.creaturesDied.push(attacker);
                    }
                    deadCreatures.add(attacker);
                }
            }

            // Check blocker deaths
            for (const blocker of blockers) {
                if (deadCreatures.has(blocker)) continue;
                const bKeywords = bKeywordsMap.get(blocker);
                if (bKeywords.indestructible) continue;
                const totalDamage = blocker.damage || 0;
                const toughness = this.getCreatureToughness(blocker);
                const killedByDeathtouch = aKeywords.deathtouch && totalDamage > 0;
                if (totalDamage >= toughness || killedByDeathtouch) {
                    if (!results.creaturesDied.includes(blocker)) {
                        results.creaturesDied.push(blocker);
                    }
                    deadCreatures.add(blocker);
                }
            }
        }
    }

    // Calcula todos os bônus de uma criatura
    getCreatureBonuses(creature, isAttacking = false) {
        const bonuses = { power: 0, toughness: 0, sources: [] };

        // Verificar se o jogo já começou
        if (!this.game?.player?.battlefield || !this.game?.opponent?.battlefield) {
            // Retornar apenas counters se disponíveis
            if (creature.counters?.plusOnePlusOne) {
                const count = creature.counters.plusOnePlusOne;
                bonuses.power += count;
                bonuses.toughness += count;
            }
            return bonuses;
        }

        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];

        // Verificar se a criatura está no campo de batalha
        // Lords só afetam criaturas no campo, não na mão
        const isOnBattlefield = allBattlefields.includes(creature);
        if (!isOnBattlefield) {
            // Criatura não está no campo - só aplicar counters (que são persistentes no objeto)
            if (creature.counters && creature.counters.plusOnePlusOne) {
                const count = creature.counters.plusOnePlusOne;
                bonuses.power += count;
                bonuses.toughness += count;
                if (count > 0) {
                    bonuses.sources.push({ name: `${count}x +1/+1 counters`, power: count, toughness: count });
                }
            }
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

        // Encontrar o controlador da criatura (usar instanceId para funcionar com cópias)
        const playerHasCreature = this.game.player.battlefield.some(c => c.instanceId === creature.instanceId);
        const controller = playerHasCreature ? this.game.player : this.game.opponent;

        // === ENCANTAMENTOS GLOBAIS DO CONTROLADOR ===
        controller.battlefield.forEach(card => {
            // Goblin Oriflamme: +1/+0 para criaturas atacantes
            if (card.id === 'goblin_oriflamme' && isAttacking) {
                bonuses.power += 1;
                bonuses.sources.push({ name: 'Goblin Oriflamme', power: 1, toughness: 0 });
            }

            // Lords com hasLostAllAbilities não concedem bônus
            if (card.type === 'creature' && this.hasLostAllAbilities(card)) {
                // Skip lord bonuses for this card
            } else {
                // Elvish Archdruid: outros Elfos têm +1/+1
                const effectiveSubtype = this.getEffectiveSubtype(creature);
                if (card.id === 'elvish_archdruid' && card !== creature &&
                    effectiveSubtype.includes('Elf')) {
                    bonuses.power += 1;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: 'Elvish Archdruid', power: 1, toughness: 1 });
                }

                // Dropkick Bomber: outros Goblins têm +1/+1
                if (card.id === 'dropkick_bomber' && card !== creature &&
                    effectiveSubtype.includes('Goblin')) {
                    bonuses.power += 1;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: 'Dropkick Bomber', power: 1, toughness: 1 });
                }

                // Corsair Captain: outros Piratas têm +1/+1
                if (card.id === 'corsair_captain' && card !== creature &&
                    effectiveSubtype.includes('Pirate')) {
                    bonuses.power += 1;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: 'Corsair Captain', power: 1, toughness: 1 });
                }

                // Death Baron: outros Zombies e Skeletons têm +1/+1
                if (card.id === 'death_baron' && card !== creature &&
                    (effectiveSubtype.includes('Zombie') || effectiveSubtype.includes('Skeleton'))) {
                    bonuses.power += 1;
                    bonuses.toughness += 1;
                    bonuses.sources.push({ name: 'Death Baron', power: 1, toughness: 1 });
                }
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
                // Quick-Draw Katana: +2/+0 durante seu turno
                if (card.id === 'quick_draw_katana' && this.game.activePlayer === controller) {
                    bonuses.power += 2;
                    bonuses.sources.push({ name: 'Quick-Draw Katana', power: 2, toughness: 0 });
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

    // Retorna o subtipo efetivo da criatura (considerando Eaten by Piranhas)
    getEffectiveSubtype(creature) {
        if (this.isAffectedByEatenByPiranhas(creature)) {
            return 'Skeleton';
        }
        return creature.subtype || '';
    }

    // Verifica se uma criatura está afetada por Eaten by Piranhas
    isAffectedByEatenByPiranhas(creature) {
        // Otimização: se não há efeitos de remoção de habilidades em jogo, retorna false imediatamente
        if (this.game?.activeEffects?.abilityRemoval === 0) {
            return false;
        }
        // Verificar se o jogo já começou
        if (!this.game?.player?.battlefield || !this.game?.opponent?.battlefield) {
            return false;
        }
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.some(card =>
            card.id === 'eaten_by_piranhas' &&
            card.subtype === 'Aura' &&
            card.attachedTo === creature.instanceId
        );
    }

    // Alias para compatibilidade
    hasEatenByPiranhas(creature) {
        return this.isAffectedByEatenByPiranhas(creature);
    }

    /**
     * Verifica se criatura perdeu todas as habilidades (por qualquer efeito)
     * Extensível para futuras cartas como Turn to Frog, Humility, etc.
     * @param {Object} creature - Criatura a verificar
     * @returns {boolean}
     */
    hasLostAllAbilities(creature) {
        // Eaten by Piranhas
        if (this.isAffectedByEatenByPiranhas(creature)) return true;

        // Futuras cartas podem ser adicionadas aqui:
        // if (this.isAffectedByTurnToFrog(creature)) return true;
        // if (this.isAffectedByHumility(creature)) return true;

        return false;
    }

    // Retorna keywords adicionais de uma criatura (de efeitos)
    getCreatureKeywords(creature, isAttacking = false) {
        const keywords = [...(creature.keywords || [])];

        // Verificar se o jogo já começou
        if (!this.game?.player?.battlefield || !this.game?.opponent?.battlefield) {
            return keywords;
        }

        // Usar instanceId para encontrar o controlador (funciona mesmo com cópias do objeto)
        const playerHasCreature = this.game.player.battlefield.some(c => c.instanceId === creature.instanceId);
        const controller = playerHasCreature ? this.game.player : this.game.opponent;

        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];

        // Crossway Troublemakers: Vampiros atacantes têm deathtouch e lifelink
        const effectiveSubtype = this.getEffectiveSubtype(creature);
        if (isAttacking && effectiveSubtype.includes('Vampire')) {
            // Procurar por id ou por nome como fallback (respeitar hasLostAllAbilities)
            const crosswayFound = controller.battlefield.find(c =>
                (c.id === 'crossway_troublemakers' || c.name === 'Crossway Troublemakers') &&
                !this.hasLostAllAbilities(c)
            );
            if (crosswayFound) {
                if (!keywords.includes('deathtouch')) keywords.push('deathtouch');
                if (!keywords.includes('lifelink')) keywords.push('lifelink');
            }
        }

        // Death Baron: outros Zombies e Skeletons têm deathtouch
        if (effectiveSubtype.includes('Zombie') || effectiveSubtype.includes('Skeleton')) {
            const deathBaronFound = controller.battlefield.find(c =>
                c.id === 'death_baron' && c !== creature && !this.hasLostAllAbilities(c)
            );
            if (deathBaronFound) {
                if (!keywords.includes('deathtouch')) keywords.push('deathtouch');
            }
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

        // Twinblade Paladin: tem double strike se vida >= 25
        if (creature.id === 'twinblade_paladin') {
            if (controller.life >= 25 && !keywords.includes('double_strike')) {
                keywords.push('double_strike');
            }
        }

        // Kargan Dragonrider: tem flying se controla um Dragão
        if (creature.id === 'kargan_dragonrider') {
            const hasDragon = controller.battlefield.some(c =>
                c.type === 'creature' && c.subtype?.includes('Dragon')
            );
            if (hasDragon && !keywords.includes('flying')) {
                keywords.push('flying');
            }
        }

        // Carnelian Orb of Dragonkind: Dragões ganham haste (se marcado)
        if (creature.subtype?.includes('Dragon') && creature.hasHasteFromOrb) {
            if (!keywords.includes('haste')) {
                keywords.push('haste');
            }
        }

        // Quick-Draw Katana: dá first strike durante seu turno
        allBattlefields.forEach(card => {
            if (card.subtype === 'Equipment' && card.attachedTo === creature.instanceId) {
                if (card.id === 'quick_draw_katana') {
                    // Só funciona no turno do controlador
                    if (this.game.activePlayer === controller && !keywords.includes('first_strike')) {
                        keywords.push('first_strike');
                    }
                }
            }
        });

        // Aggressive Mammoth (trample_lord): outras criaturas têm trample
        controller.battlefield.forEach(card => {
            if (card.keywords?.includes('trample_lord') && card !== creature && !this.hasLostAllAbilities(card)) {
                if (!keywords.includes('trample')) {
                    keywords.push('trample');
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

        // Eaten by Piranhas: criatura perde todas as habilidades
        // Per MTG Layer 6 dependency: wipe happens AFTER external continuous effects
        // (trample_lord, temporaryKeywords) so it suppresses everything
        allBattlefields.forEach(card => {
            if (card.subtype === 'Aura' && card.attachedTo === creature.instanceId) {
                if (card.id === 'eaten_by_piranhas') {
                    // Remove todas as keywords
                    keywords.length = 0;
                }
            }
        });

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

    /**
     * Verifica se uma criatura pode ser alvo de uma spell/ability de um oponente
     * Considera hexproof (permanente e temporário)
     * @param {Object} creature - A criatura a verificar
     * @param {Object} caster - Quem está conjurando (oponente da criatura)
     * @returns {boolean} true se pode ser alvo
     */
    canBeTargetedBy(creature, caster) {
        // Verificar se o jogo já começou
        if (!this.game?.player?.battlefield) {
            return true;
        }
        // Verificar quem controla a criatura (usar instanceId para funcionar com cópias)
        const playerHasCreature = this.game.player.battlefield.some(c => c.instanceId === creature.instanceId);
        const creatureController = playerHasCreature ? this.game.player : this.game.opponent;

        // Se o caster é o mesmo controlador, hexproof não se aplica
        if (caster === creatureController) {
            return true;
        }

        // Hexproof impede que oponentes mirem a criatura
        if (this.hasKeyword(creature, 'hexproof', false)) {
            return false;
        }

        return true;
    }

    /**
     * Verifica se uma criatura tem Ward e retorna o custo
     * @param {Object} creature - A criatura a verificar
     * @returns {number|null} - O custo de Ward ou null se não tiver Ward
     */
    getWardCost(creature) {
        if (!this.hasKeyword(creature, 'ward', false)) {
            return null;
        }

        // Por padrão, Ward custa 2 (Tolarian Terror)
        // Pode ser expandido no futuro para diferentes custos baseado na carta
        if (creature.id === 'tolarian_terror') {
            return 2;
        }

        // Default Ward cost
        return 2;
    }

    /**
     * Verifica se um jogador pode pagar o custo de Ward
     * @param {number} wardCost - O custo de Ward a pagar
     * @param {Object} player - O jogador que deve pagar
     * @returns {boolean} - true se pode pagar
     */
    canPayWard(wardCost, player) {
        const availableMana = this.calculateAvailableMana(player);
        const totalMana = Object.values(availableMana).reduce((a, b) => a + b, 0);
        return totalMana >= wardCost;
    }

    // Desvirar todas as permanentes
    untapAll(player) {
        // Coletar todas as auras com freeze_aura de ambos os jogadores
        const allBattlefields = [
            ...(this.game?.player?.battlefield || []),
            ...(this.game?.opponent?.battlefield || [])
        ];
        const freezeAuras = allBattlefields.filter(c =>
            c.type === 'enchantment' &&
            c.keywords?.includes('freeze_aura') &&
            c.attachedTo
        );

        player.battlefield.forEach(card => {
            // Verificar se esta criatura está encantada por uma freeze_aura
            const isFrozen = freezeAuras.some(aura => aura.attachedTo === card.instanceId);
            if (!isFrozen) {
                card.tapped = false;
            }
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

            // Trigger draw effects (Clinquant Skymage, Erudite Wizard, Mischievous Mystic)
            if (this.game.triggers) {
                this.game.triggers.onCardDrawn(player);
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

// Exportar para browser
if (typeof window !== 'undefined') {
    window.PHASES = PHASES;
    window.PHASE_NAMES = PHASE_NAMES;
    window.PHASE_ORDER = PHASE_ORDER;
    window.RulesEngine = RulesEngine;
}

// Exportar para testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RulesEngine, PHASES, PHASE_NAMES, PHASE_ORDER };
}
