// === Inteligência Artificial ===

// Configuração única da IA - Perfil "Planeswalker Equilibrado"
// Combina inteligência do Planeswalker com thresholds equilibrados
const AI_CONFIG = {
    attackWithZeroPower: false,     // Não ataca com power 0
    useActivatedAbilities: true,    // Usa habilidades ativadas
    holdManaForInstants: true,      // Guarda mana para respostas
    mistakeRate: 0,                 // Sem erros
    thresholds: {
        attackPower: 3,             // Trade com power 3+
        lifeAdvantage: 5,           // Ataca se 5+ vida na frente
        tradePower: 4,              // Aceita trades razoáveis (power 4+)
        panicMultiplier: 2          // Bloqueio equilibrado
    }
};

class AIPlayer {
    constructor(gameState, rulesEngine) {
        this.game = gameState;
        this.rules = rulesEngine;
        this.config = AI_CONFIG;
    }

    // === MULLIGAN ===

    /**
     * Avalia a qualidade de uma mão para decidir mulligan
     * @param {Array} hand - Cartas na mão
     * @returns {Object} { score: number, lands: number, playables: number, reason: string }
     */
    evaluateHand(hand) {
        const lands = hand.filter(c => c.type === 'land').length;
        const nonLands = hand.filter(c => c.type !== 'land');

        // Contar cartas jogáveis nos primeiros turnos (CMC <= 3)
        const earlyPlays = nonLands.filter(c => c.cmc <= 3).length;

        // Verificar curva de mana
        const hasOneOrTwoDrop = nonLands.some(c => c.cmc <= 2);
        const hasThreeDrop = nonLands.some(c => c.cmc === 3);

        let score = 0;
        let reason = '';

        // Avaliação baseada em terrenos
        if (lands === 0) {
            score = 0;
            reason = 'sem terrenos';
        } else if (lands === 1) {
            score = 20;
            reason = 'apenas 1 terreno';
        } else if (lands >= 6) {
            score = 15;
            reason = 'muitos terrenos';
        } else if (lands === 2) {
            score = hasOneOrTwoDrop ? 60 : 40;
            reason = lands + ' terrenos';
        } else if (lands >= 3 && lands <= 4) {
            // Quantidade ideal de terrenos
            score = 70;
            if (hasOneOrTwoDrop) score += 15;
            if (hasThreeDrop) score += 10;
            reason = 'mão equilibrada';
        } else if (lands === 5) {
            score = earlyPlays >= 2 ? 55 : 35;
            reason = '5 terrenos';
        }

        // Bônus por jogadas iniciais
        if (earlyPlays >= 2) score += 10;

        return { score, lands, playables: earlyPlays, reason };
    }

    /**
     * Decide se a IA deve fazer mulligan
     * @param {Array} hand - Cartas na mão
     * @param {number} mulliganCount - Quantos mulligans já foram feitos
     * @returns {boolean} true se deve fazer mulligan
     */
    shouldMulligan(hand, mulliganCount) {
        // Não fazer mais de 2 mulligans (ficaria com 5 cartas)
        if (mulliganCount >= 2) return false;

        const eval_ = this.evaluateHand(hand);

        // Thresholds diferentes dependendo de quantos mulligans já fez
        // Primeiro mulligan: mais exigente (score mínimo 50)
        // Segundo mulligan: menos exigente (score mínimo 35)
        const threshold = mulliganCount === 0 ? 50 : 35;

        return eval_.score < threshold;
    }

    /**
     * Escolhe quais cartas colocar no fundo do grimório (London Mulligan)
     * @param {Array} hand - Cartas na mão
     * @param {number} count - Quantas cartas colocar no fundo
     * @returns {Array} instanceIds das cartas a colocar no fundo
     */
    chooseCardsToBottom(hand, count) {
        if (count <= 0) return [];

        // Ordenar cartas por "descartabilidade" (piores primeiro)
        // Critérios: CMC muito alto, terrenos extras, duplicatas
        const lands = hand.filter(c => c.type === 'land');
        const nonLands = hand.filter(c => c.type !== 'land');

        // Se tem muitos terrenos, colocar extras no fundo
        const idealLands = 3;
        const excessLands = Math.max(0, lands.length - idealLands);

        // Ordenar non-lands por CMC (maior = menos desejável)
        const sortedNonLands = [...nonLands].sort((a, b) => b.cmc - a.cmc);

        // Ordenar terrenos (básicos primeiro para ir pro fundo se necessário)
        const sortedLands = [...lands].sort((a, b) => {
            // Terrenos especiais são mais valiosos
            if (a.enters_tapped && !b.enters_tapped) return -1;
            if (!a.enters_tapped && b.enters_tapped) return 1;
            return 0;
        });

        const toBottom = [];

        // Primeiro, adicionar terrenos em excesso
        for (let i = 0; i < excessLands && toBottom.length < count; i++) {
            toBottom.push(sortedLands[i].instanceId);
        }

        // Depois, adicionar spells de alto custo
        for (const card of sortedNonLands) {
            if (toBottom.length >= count) break;
            toBottom.push(card.instanceId);
        }

        // Se ainda precisar, adicionar mais terrenos
        for (let i = excessLands; i < sortedLands.length && toBottom.length < count; i++) {
            toBottom.push(sortedLands[i].instanceId);
        }

        return toBottom.slice(0, count);
    }

    // === FIM MULLIGAN ===

    // Executa a vez da IA
    async takeTurn() {
        // Main Phase 1 - segura cartas com condições pós-combate
        await this.playMainPhase(1);

        // Combat
        await this.doCombat();

        // Main Phase 2 - joga cartas seguradas
        await this.playMainPhase(2);
    }

    /**
     * Verifica se uma carta deve ser segurada para a Main Phase 2
     * Cartas com ETBs condicionais que dependem de "oponente perdeu vida" ou "atacou este turno"
     * funcionam melhor após o combate
     * @param {Object} card - Carta a verificar
     * @returns {boolean} true se deve segurar para Main Phase 2
     */
    shouldHoldForMainPhase2(card) {
        // Cartas com condição "se oponente perdeu vida neste turno"
        const lostLifeCards = ['bloodtithe_collector'];

        // Cartas com Raid (se atacou este turno)
        const raidCards = card.keywords &&
            (card.keywords.includes('raid') || card.keywords.includes('raid_draw'));

        if (lostLifeCards.includes(card.id) || raidCards) {
            // Verificar se a IA tem atacantes disponíveis que podem causar dano
            const hasAttackers = this.game.opponent.battlefield.some(c =>
                c.type === 'creature' && this.rules.canAttack(c)
            );
            // Só segura se tiver chance de satisfazer a condição
            return hasAttackers;
        }

        return false;
    }

    /**
     * Verifica se uma aura tem alvos válidos para a IA jogar
     * @param {Object} card - Carta aura a verificar
     * @returns {boolean} true se a aura pode ser jogada com benefício
     */
    hasValidAuraTargets(card) {
        if (card.type !== 'enchantment' || card.subtype !== 'Aura') {
            return true; // Não é aura, não aplicável
        }

        const player = this.game.player;
        const opponent = this.game.opponent;

        // Auras negativas: precisa de criaturas inimigas
        if (card.id === 'pacifism' || card.id === 'eaten_by_piranhas') {
            return player.battlefield.some(c => c.type === 'creature');
        }

        // Auras positivas: precisa de criaturas próprias
        if (card.id === 'untamed_hunger') {
            return opponent.battlefield.some(c => c.type === 'creature');
        }

        // Outras auras: verificar se há qualquer criatura
        const allCreatures = [...player.battlefield, ...opponent.battlefield]
            .filter(c => c.type === 'creature');
        return allCreatures.length > 0;
    }

    // Fase principal: jogar terrenos e criaturas
    // phase: 1 = Main Phase 1, 2 = Main Phase 2
    async playMainPhase(phase = 1) {
        const opponent = this.game.opponent;

        // Delay inicial para mostrar que a IA está "pensando"
        this.game.ui.log('IA está pensando...');
        await this.delay(800);

        // 1. Jogar terreno se possível (apenas na Main Phase 1)
        if (phase === 1) {
            const landInHand = opponent.hand.find(card => card.type === 'land');
            if (landInHand && this.rules.canPlayLand(opponent)) {
                await this.game.playCard(landInHand, opponent);
                this.game.ui.render();
                await this.delay(1000); // Delay para ver o terreno jogado
            }
        }

        // 2. Jogar criaturas/feitiços (do mais caro pro mais barato que conseguir pagar)
        let playedSomething = true;
        while (playedSomething) {
            playedSomething = false;

            // Cartas jogáveis com mana normal
            let playableCards = opponent.hand
                .filter(card => card.type !== 'land' && this.rules.canPlayCard(card, opponent))
                .filter(card => this.hasValidAuraTargets(card))
                .sort((a, b) => (b.cmc || 0) - (a.cmc || 0));

            // Na Main Phase 1, filtrar cartas que devem ser seguradas para depois do combate
            if (phase === 1) {
                playableCards = playableCards.filter(card => !this.shouldHoldForMainPhase2(card));
            }

            // Planeswalker: reservar mana para instants
            if (this.config.holdManaForInstants) {
                const instantsInHand = opponent.hand.filter(c => c.type === 'instant');
                if (instantsInHand.length > 0) {
                    const baseMana = this.rules.calculateAvailableMana(opponent);
                    const totalMana = Object.values(baseMana).reduce((a, b) => a + b, 0);
                    const cheapestCmc = Math.min(...instantsInHand.map(c => c.cmc || 2));
                    const manaToHold = Math.min(cheapestCmc, 3);

                    const originalCount = playableCards.length;
                    playableCards = playableCards.filter(card => {
                        const costAfterPlay = totalMana - (card.cmc || 0);
                        return costAfterPlay >= manaToHold;
                    });

                    if (playableCards.length < originalCount && playableCards.length === 0) {
                        this.game.ui.log(`IA reservando mana para respostas`);
                    }
                }
            }

            // Verificar se pode jogar algo MELHOR usando Treasures
            const treasures = this.getTreasureTokens(opponent);
            let bestTreasureCard = null;
            let treasureInfo = null;

            if (treasures.length > 0) {
                // Encontrar cartas que precisam de Treasures para serem jogadas
                let potentialCards = opponent.hand
                    .filter(card => card.type !== 'land')
                    .filter(card => {
                        const result = this.canPayWithTreasures(card, opponent);
                        return result.canPay && result.treasuresNeeded > 0;
                    })
                    .filter(card => this.hasValidAuraTargets(card))
                    .sort((a, b) => (b.cmc || 0) - (a.cmc || 0));

                if (phase === 1) {
                    potentialCards = potentialCards.filter(card => !this.shouldHoldForMainPhase2(card));
                }

                if (potentialCards.length > 0) {
                    bestTreasureCard = this.chooseBestCard(potentialCards);
                    if (bestTreasureCard) {
                        treasureInfo = this.canPayWithTreasures(bestTreasureCard, opponent);
                    }
                }
            }

            // Decidir: jogar com mana normal ou usar Treasures para carta melhor?
            const bestNormalCard = playableCards.length > 0 ? this.chooseBestCard(playableCards) : null;
            let cardToPlay = null;
            let useTreasures = false;

            if (bestTreasureCard && bestNormalCard) {
                // Comparar: se a carta com Treasure tem CMC maior, vale usar Treasures
                const treasureCmc = bestTreasureCard.cmc || 0;
                const normalCmc = bestNormalCard.cmc || 0;
                if (treasureCmc > normalCmc) {
                    cardToPlay = bestTreasureCard;
                    useTreasures = true;
                } else {
                    cardToPlay = bestNormalCard;
                }
            } else if (bestTreasureCard) {
                cardToPlay = bestTreasureCard;
                useTreasures = true;
            } else if (bestNormalCard) {
                cardToPlay = bestNormalCard;
            }

            if (cardToPlay) {
                if (useTreasures && treasureInfo) {
                    // Sacrificar treasures necessários
                    await this.useTreasuresForCard(opponent, treasureInfo.treasuresNeeded, treasureInfo.colorsNeeded);
                }
                // Verificar se pode jogar após usar treasures (se aplicável)
                if (this.rules.canPlayCard(cardToPlay, opponent)) {
                    await this.delay(600);
                    await this.game.playCard(cardToPlay, opponent);
                    this.game.ui.render();
                    await this.delay(1200);
                    playedSomething = true;
                }
            }
        }

        // 3. Usar habilidades ativadas (Main Phase 2, quando sobra mana)
        if (phase === 2 && this.config.useActivatedAbilities) {
            await this.useActivatedAbilities();
        }
    }

    /**
     * Retorna os Treasure Tokens disponíveis para a IA
     */
    getTreasureTokens(player) {
        return player.battlefield.filter(card =>
            card.keywords?.includes('sacrifice_for_mana')
        );
    }

    /**
     * Calcula mana disponível incluindo Treasure Tokens
     */
    calculateManaWithTreasures(player) {
        const baseMana = this.rules.calculateAvailableMana(player);
        const treasureCount = this.getTreasureTokens(player).length;

        return {
            ...baseMana,
            treasures: treasureCount,
            total: Object.values(baseMana).reduce((a, b) => a + b, 0) + treasureCount
        };
    }

    /**
     * Verifica se a IA pode pagar o custo de uma carta usando Treasures se necessário
     * @returns {Object} { canPay: boolean, treasuresNeeded: number, colorsNeeded: string[] }
     */
    canPayWithTreasures(card, player) {
        const baseMana = this.rules.calculateAvailableMana(player);
        const treasures = this.getTreasureTokens(player);
        const cost = this.rules.parseCost(card.cost);

        // Primeiro verificar se já pode pagar sem treasures
        if (this.rules.canPayCost(cost, baseMana)) {
            return { canPay: true, treasuresNeeded: 0, colorsNeeded: [] };
        }

        if (treasures.length === 0) {
            return { canPay: false, treasuresNeeded: 0, colorsNeeded: [] };
        }

        // Simular pagamento com treasures
        let remainingMana = { ...baseMana };
        let treasuresNeeded = 0;
        let colorsNeeded = [];

        // Pagar custos coloridos primeiro
        for (const color in cost.colored) {
            const needed = cost.colored[color];
            if (remainingMana[color] >= needed) {
                remainingMana[color] -= needed;
            } else {
                // Precisa de treasures para cobrir a diferença
                const shortfall = needed - remainingMana[color];
                if (treasuresNeeded + shortfall <= treasures.length) {
                    for (let i = 0; i < shortfall; i++) {
                        colorsNeeded.push(color);
                    }
                    treasuresNeeded += shortfall;
                    remainingMana[color] = 0;
                } else {
                    return { canPay: false, treasuresNeeded: 0, colorsNeeded: [] };
                }
            }
        }

        // Pagar custo genérico
        let totalRemaining = Object.values(remainingMana).reduce((a, b) => a + b, 0);
        if (totalRemaining < cost.generic) {
            const genericShortfall = cost.generic - totalRemaining;
            if (treasuresNeeded + genericShortfall <= treasures.length) {
                // Para custo genérico, usamos a cor do deck
                const deckColors = this.rules.getPlayerDeckColors(player);
                const preferredColor = deckColors[0] || 'U';
                for (let i = 0; i < genericShortfall; i++) {
                    colorsNeeded.push(preferredColor);
                }
                treasuresNeeded += genericShortfall;
            } else {
                return { canPay: false, treasuresNeeded: 0, colorsNeeded: [] };
            }
        }

        return { canPay: true, treasuresNeeded, colorsNeeded };
    }

    /**
     * Sacrifica Treasures necessários para pagar uma carta
     */
    async useTreasuresForCard(player, treasuresNeeded, colorsNeeded) {
        const treasures = this.getTreasureTokens(player);

        for (let i = 0; i < treasuresNeeded && i < treasures.length; i++) {
            const treasure = treasures[i];
            const color = colorsNeeded[i] || 'U';

            // Adicionar mana flutuante
            const playerKey = player === this.game.player ? 'player' : 'opponent';
            this.game.floatingMana[playerKey][color] += 1;

            // Remover treasure do battlefield
            const tokenIndex = player.battlefield.findIndex(c => c.instanceId === treasure.instanceId);
            if (tokenIndex !== -1) {
                player.battlefield.splice(tokenIndex, 1);
            }

            const colorNames = { W: 'branco', U: 'azul', B: 'preto', R: 'vermelho', G: 'verde' };
            this.game.ui.log(`IA sacrifica Treasure: +1 mana ${colorNames[color]}`);
        }

        this.game.ui.render();
        await this.delay(500);
    }

    // Usa habilidades ativadas quando vale a pena
    async useActivatedAbilities() {
        const opponent = this.game.opponent;
        const player = this.game.player;

        // Encontrar permanentes com habilidades ativadas (criaturas E artefatos)
        const permanentsWithAbilities = opponent.battlefield.filter(card =>
            (card.type === 'creature' || card.type === 'artifact') &&
            this.game.canActivateAbility &&
            this.game.canActivateAbility(card, opponent)
        );

        for (const permanent of permanentsWithAbilities) {
            // Verificar se ainda pode ativar (mana pode ter mudado)
            if (!this.game.canActivateAbility(permanent, opponent)) continue;

            // Decidir se vale a pena ativar
            const shouldActivate = this.shouldActivateAbility(permanent, opponent, player);

            if (shouldActivate) {
                this.game.ui.log(`IA ativa habilidade de ${permanent.name}`);
                await this.delay(800);
                await this.game.activateAbility(permanent, opponent);
                this.game.ui.render();
                await this.delay(1000);
            }
        }
    }

    // Decide se vale a pena ativar uma habilidade
    shouldActivateAbility(permanent, controller, opponent) {
        // Treasure tokens: NÃO sacrificar automaticamente, guardar para jogar cartas
        if (permanent.keywords?.includes('sacrifice_for_mana')) {
            return false;
        }

        switch (permanent.id) {
            case 'vampire_neonate':
                // Sempre vale ativar: drena 1 vida por 2 mana
                // Melhor que atacar com 0 de power
                return true;

            case 'spectral_sailor':
                // Comprar carta por 4 mana - só se tiver mana sobrando
                const mana = this.rules.calculateAvailableMana(controller);
                const totalMana = Object.values(mana).reduce((a, b) => a + b, 0);
                return totalMana >= 4;

            case 'goblin_smuggler':
                // Tornar criatura inbloqueável - útil antes do combate
                // Na Main Phase 2 não faz sentido
                return false;

            case 'goblin_firebomb':
                // {7}, T, Sacrifice: Destroy target permanent
                // Alto custo - só usar para ameaças significativas
                const firebombTargets = opponent.battlefield.filter(c =>
                    !c.keywords?.includes('indestructible')
                );

                if (firebombTargets.length === 0) return false;

                // Avaliar se há alvos valiosos
                const hasValuableTarget = firebombTargets.some(target => {
                    // Criaturas fortes (power >= 4 ou efeitos perigosos)
                    if (target.type === 'creature') {
                        const power = this.rules.getCreaturePower(target);
                        const hasKeywords = target.keywords?.some(kw =>
                            ['flying', 'lifelink', 'double_strike', 'trample'].includes(kw)
                        );
                        return power >= 4 || hasKeywords;
                    }
                    // Enchantments/Artifacts problemáticos
                    if (target.type === 'enchantment' || target.type === 'artifact') {
                        return true; // Sempre vale destruir permanentes não-criatura
                    }
                    return false;
                });

                return hasValuableTarget;

            default:
                // Por padrão, ativar se possível
                return true;
        }
    }

    // Escolhe a melhor carta para jogar
    chooseBestCard(playableCards) {
        if (playableCards.length === 0) return null;

        // Aprendiz: chance de escolha subótima
        if (this.config.mistakeRate > 0 && Math.random() < this.config.mistakeRate) {
            const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
            return randomCard;
        }

        // Prioridade: criaturas > encantamentos > feitiços
        const creatures = playableCards.filter(c => c.type === 'creature');
        if (creatures.length > 0) {
            // Preferir criaturas com melhor relação poder/custo
            return creatures.sort((a, b) => {
                const aValue = (a.power || 0) + (a.toughness || 0);
                const bValue = (b.power || 0) + (b.toughness || 0);
                return bValue - aValue;
            })[0];
        }

        return playableCards[0];
    }

    /**
     * Retorna lista de cartas que a IA pretende jogar nesta main phase
     * Usado para o sistema de janelas de prioridade
     * @returns {Array} Lista ordenada de cartas a jogar
     */
    getCardsToPlay() {
        const opponent = this.game.opponent;
        const cardsToPlay = [];

        // 1. Terreno (se possível)
        const landInHand = opponent.hand.find(card => card.type === 'land');
        if (landInHand && this.rules.canPlayLand(opponent)) {
            cardsToPlay.push(landInHand);
        }

        // 2. Simular mana disponível após jogar terreno
        let simulatedMana = { ...this.rules.calculateAvailableMana(opponent) };
        if (landInHand && this.rules.canPlayLand(opponent)) {
            // Adicionar mana do terreno a jogar
            if (landInHand.produces) {
                simulatedMana[landInHand.produces] = (simulatedMana[landInHand.produces] || 0) + 1;
            }
        }

        // 3. Cartas jogáveis (do mais caro pro mais barato)
        const playableNonLands = opponent.hand
            .filter(card => card.type !== 'land' && this.rules.canPlayCard(card, opponent))
            .filter(card => this.hasValidAuraTargets(card))
            .sort((a, b) => (b.cmc || 0) - (a.cmc || 0));

        // Adicionar cartas na ordem de prioridade
        for (const card of playableNonLands) {
            const bestCard = this.chooseBestCard([card]);
            if (bestCard) {
                cardsToPlay.push(bestCard);
            }
        }

        return cardsToPlay;
    }

    // Fase de combate
    async doCombat() {
        const opponent = this.game.opponent;
        const player = this.game.player;

        // Delay para mostrar que a IA está avaliando o combate
        this.game.ui.log('IA está avaliando opções de combate...');
        await this.delay(1000);

        // Encontrar criaturas que podem atacar
        const possibleAttackers = opponent.battlefield.filter(card =>
            card.type === 'creature' && this.rules.canAttack(card)
        );

        if (possibleAttackers.length === 0) {
            this.game.ui.log('Oponente não tem atacantes');
            await this.delay(500);
            return;
        }

        // Decidir quais criaturas atacam
        const chosenAttackers = this.chooseAttackers(possibleAttackers, player);

        if (chosenAttackers.length === 0) {
            this.game.ui.log('Oponente escolheu não atacar');
            await this.delay(500);
            return;
        }

        // Virar atacantes com delay visual
        this.game.ui.log('Oponente declarando atacantes...');
        await this.delay(600);

        // Usar declareAttackers para garantir que triggers disparem (Herald of Faith, Ancestor Dragon, etc.)
        await this.game.declareAttackers(chosenAttackers, this.game.opponent);
    }

    // Escolhe quais criaturas vão atacar
    chooseAttackers(possibleAttackers, defendingPlayer) {
        const defenderCreatures = defendingPlayer.battlefield.filter(c =>
            c.type === 'creature' && !c.tapped
        );

        // Estratégia simples: atacar se temos vantagem ou se oponente não pode bloquear
        const attackers = [];

        possibleAttackers.forEach(attacker => {
            const attackerPower = this.rules.getCreaturePower(attacker);

            // Modo Mago+: não atacar com criaturas de power 0 (não causa dano)
            if (!this.config.attackWithZeroPower && attackerPower <= 0) {
                return; // Skip this attacker
            }
            const attackerToughness = this.rules.getCreatureToughness(attacker);

            // Verificar se algum bloqueador pode matar esta criatura
            const canDie = defenderCreatures.some(blocker => {
                if (!this.rules.canBlock(blocker, attacker)) return false;
                const blockerPower = this.rules.getCreaturePower(blocker);
                return blockerPower >= attackerToughness;
            });

            // Verificar se conseguimos matar algum bloqueador
            const canKill = defenderCreatures.some(blocker => {
                if (!this.rules.canBlock(blocker, attacker)) return false;
                const blockerToughness = this.rules.getCreatureToughness(blocker);
                return attackerPower >= blockerToughness;
            });

            // Atacar se:
            // 1. Não pode ser bloqueado (flying sem defesa)
            // 2. Não vai morrer
            // 3. Consegue matar um bloqueador em troca
            // 4. Tem lifelink
            // 5. Estamos ganhando muito (agressivo)

            // Usar hasKeyword para considerar keywords de auras (Untamed Hunger = menace)
            const hasEvasion = this.rules.hasKeyword(attacker, 'flying', true) ||
                               this.rules.hasKeyword(attacker, 'menace', true);

            const canBeBlocked = defenderCreatures.some(b => this.rules.canBlock(b, attacker));

            const hasLifelink = this.rules.hasKeyword(attacker, 'lifelink', true);

            const lifeAdvantage = this.game.opponent.life - this.game.player.life;

            // Usar thresholds configurados por dificuldade
            const attackPowerThreshold = this.config.thresholds.attackPower;
            const lifeAdvantageThreshold = this.config.thresholds.lifeAdvantage;

            if (!canBeBlocked) {
                attackers.push(attacker);
            } else if (!canDie) {
                attackers.push(attacker);
            } else if (canKill && (hasLifelink || attackerPower >= attackPowerThreshold)) {
                attackers.push(attacker);
            } else if (lifeAdvantage > lifeAdvantageThreshold) {
                // Jogar agressivo se estamos na frente
                attackers.push(attacker);
            }
        });

        // === CRACK-BACK CHECK (Verificação de sobrevivência) ===
        // Não atacar all-in se o oponente pode nos matar no contra-ataque
        return this._filterAttackersForSurvival(attackers, possibleAttackers, defendingPlayer);
    }

    /**
     * Filtra atacantes para garantir sobrevivência ao contra-ataque.
     * Remove atacantes da lista se atacar com todos deixaria a IA morta.
     */
    _filterAttackersForSurvival(selectedAttackers, allCreatures, defendingPlayer) {
        if (selectedAttackers.length === 0) return selectedAttackers;

        const aiLife = this.game.opponent.life;
        const playerLife = defendingPlayer.life;

        // Calcular dano máximo que podemos causar (assumindo sem bloqueios)
        const ourMaxDamage = selectedAttackers.reduce((sum, c) =>
            sum + this.rules.getCreaturePower(c), 0);

        // Se nosso ataque mata o oponente, atacar sem medo
        if (ourMaxDamage >= playerLife) {
            return selectedAttackers;
        }

        // Calcular dano potencial do contra-ataque do oponente
        // Inclui: criaturas do oponente que não estão viradas + que podem atacar
        const opponentCreatures = defendingPlayer.battlefield.filter(c =>
            c.type === 'creature' && !c.tapped && !c.summoningSickness
        );
        const crackbackDamage = opponentCreatures.reduce((sum, c) =>
            sum + this.rules.getCreaturePower(c), 0);

        // Se o contra-ataque não nos mata, atacar livremente
        if (crackbackDamage < aiLife) {
            return selectedAttackers;
        }

        // === SITUAÇÃO PERIGOSA ===
        // Contra-ataque pode nos matar E nosso ataque não mata o oponente
        // Precisamos manter bloqueadores suficientes

        // Calcular quanto dano precisamos bloquear para sobreviver
        const damageToBlock = crackbackDamage - aiLife + 1;

        // Criaturas que não estão atacando podem bloquear
        const notAttacking = allCreatures.filter(c => !selectedAttackers.includes(c));

        // Calcular capacidade de bloqueio atual (criaturas que ficaram para trás)
        const currentBlockPotential = notAttacking.reduce((sum, c) => {
            const toughness = this.rules.getCreatureToughness(c);
            // Cada bloqueador pode "absorver" dano igual ao poder do atacante que bloqueia
            // Simplificação: assumir que cada bloqueador para 1 atacante
            return sum + toughness;
        }, 0);

        // Se já temos bloqueio suficiente, atacar conforme planejado
        if (currentBlockPotential >= damageToBlock) {
            return selectedAttackers;
        }

        // Precisamos segurar algumas criaturas como bloqueadores
        // Ordenar atacantes por prioridade (menor power primeiro = menos impactante remover)
        const sortedAttackers = [...selectedAttackers].sort((a, b) => {
            const powerA = this.rules.getCreaturePower(a);
            const powerB = this.rules.getCreaturePower(b);
            // Priorizar manter criaturas com evasão como atacantes
            const evasionA = this.rules.hasKeyword(a, 'flying', true) ? 10 : 0;
            const evasionB = this.rules.hasKeyword(b, 'flying', true) ? 10 : 0;
            return (powerA + evasionA) - (powerB + evasionB);
        });

        // Remover atacantes até ter bloqueio suficiente
        const finalAttackers = [...sortedAttackers];
        let blockPotential = currentBlockPotential;

        while (finalAttackers.length > 0 && blockPotential < damageToBlock) {
            const removed = finalAttackers.shift(); // Remove o de menor prioridade
            blockPotential += this.rules.getCreatureToughness(removed);
        }

        return finalAttackers;
    }

    // Escolhe bloqueadores
    chooseBlockers(attackers, possibleBlockers) {
        const assignments = {};
        const aiLife = this.game.opponent.life;

        // === CALCULAR DANO TOTAL INCOMING ===
        const calculateTotalDamage = (attackerList, currentAssignments) => {
            let total = 0;
            attackerList.forEach(attacker => {
                if (!currentAssignments[attacker.instanceId]) {
                    // Atacante não bloqueado - dano total
                    total += this.rules.getCreaturePower(attacker);
                } else if (this.rules.hasKeyword(attacker, 'trample', true)) {
                    // Atacante com trample - dano pode passar
                    const blockers = currentAssignments[attacker.instanceId];
                    const blockerToughness = blockers.reduce((sum, b) =>
                        sum + this.rules.getCreatureToughness(b), 0);
                    const attackerPower = this.rules.getCreaturePower(attacker);
                    const excess = attackerPower - blockerToughness;
                    if (excess > 0) total += excess;
                }
                // Atacante bloqueado sem trample - 0 dano ao jogador
            });
            return total;
        };

        // Helper: verificar se criatura é token ou baixo valor (descartável)
        const isExpendable = (creature) => {
            // Tokens são sempre descartáveis
            if (creature.instanceId?.startsWith('token_')) return true;
            // Criaturas 1/1 sem habilidades especiais são descartáveis
            const power = this.rules.getCreaturePower(creature);
            const toughness = this.rules.getCreatureToughness(creature);
            const hasValuableKeyword = creature.keywords?.some(k =>
                ['deathtouch', 'lifelink', 'flying', 'first_strike', 'double_strike'].includes(k)
            );
            if (power <= 1 && toughness <= 1 && !hasValuableKeyword) return true;
            return false;
        };

        // Helper: calcular "valor" de uma criatura para ordenar chump blockers
        const creatureValue = (creature) => {
            if (creature.instanceId?.startsWith('token_')) return 0;
            let value = this.rules.getCreaturePower(creature) + this.rules.getCreatureToughness(creature);
            if (creature.keywords?.includes('deathtouch')) value += 3;
            if (creature.keywords?.includes('lifelink')) value += 2;
            if (creature.keywords?.includes('flying')) value += 2;
            return value;
        };

        // Helper: verificar se atacante tem menace (considera auras como Untamed Hunger)
        const hasMenace = (attacker) => this.rules.hasKeyword(attacker, 'menace', true);

        // Helper: atribuir bloqueadores a um atacante
        const assignBlockers = (attacker, blockers) => {
            blockers.forEach(b => b.assignedToBlock = true);
            assignments[attacker.instanceId] = blockers;
        };

        // Helper: selecionar melhor bloqueador para matar atacante
        const selectBestBlocker = (availableBlockers, attackerToughness) => {
            return availableBlockers.find(b => {
                const blockerPower = this.rules.getCreaturePower(b);
                return blockerPower >= attackerToughness ||
                    this.rules.hasKeyword(b, 'deathtouch', false);
            }) || availableBlockers.sort((a, b) =>
                this.rules.getCreaturePower(a) - this.rules.getCreaturePower(b)
            )[0];
        };

        // Helper: selecionar par de bloqueadores para menace
        const selectMenaceBlockers = (availableBlockers, attacker) => {
            if (availableBlockers.length < 2) return null;

            const attackerToughness = this.rules.getCreatureToughness(attacker);
            const attackerPower = this.rules.getCreaturePower(attacker);

            // Ordenar por poder (maior primeiro)
            const sorted = [...availableBlockers].sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            );

            // Verificar se os dois melhores bloqueadores conseguem matar o atacante
            const b1 = sorted[0];
            const b2 = sorted[1];
            const combinedPower = this.rules.getCreaturePower(b1) + this.rules.getCreaturePower(b2);
            const canKill = combinedPower >= attackerToughness ||
                this.rules.hasKeyword(b1, 'deathtouch', false) ||
                this.rules.hasKeyword(b2, 'deathtouch', false);

            // Verificar quantos bloqueadores morrem
            const b1Dies = attackerPower >= this.rules.getCreatureToughness(b1);
            const b2Dies = attackerPower >= this.rules.getCreatureToughness(b2);
            const blockerDeaths = (b1Dies ? 1 : 0) + (b2Dies ? 1 : 0);

            // Usar thresholds configurados por dificuldade
            const tradePowerThreshold = this.config.thresholds.tradePower;
            const panicMultiplier = this.config.thresholds.panicMultiplier;

            // Bloquear se:
            // 1. Conseguimos matar sem perder nenhum bloqueador
            // 2. Conseguimos matar perdendo só 1 bloqueador e atacante tem power >= threshold
            // 3. Estamos em risco de morrer (vida <= power * panicMultiplier)
            if (canKill && blockerDeaths === 0) {
                return [b1, b2];
            } else if (canKill && blockerDeaths === 1 && attackerPower >= tradePowerThreshold) {
                return [b1, b2];
            } else if (this.game.opponent.life <= attackerPower * panicMultiplier) {
                return [b1, b2];
            }

            return null;
        };

        // Helper: selecionar par de bloqueadores para gang block voluntário
        // Usado quando nenhum bloqueador único pode fazer trade favorável
        const selectGangBlockPair = (availableBlockers, attacker) => {
            if (availableBlockers.length < 2) return null;

            const attackerToughness = this.rules.getCreatureToughness(attacker);
            const attackerPower = this.rules.getCreaturePower(attacker);
            const attackerHasDeathtouch = this.rules.hasKeyword(attacker, 'deathtouch', true);
            const attackerHasTrample = this.rules.hasKeyword(attacker, 'trample', true);

            // Usar thresholds configurados por dificuldade
            const tradePowerThreshold = this.config.thresholds.tradePower;
            const panicMultiplier = this.config.thresholds.panicMultiplier;
            const aiLife = this.game.opponent.life;

            // Encontrar o melhor par de bloqueadores que juntos podem matar o atacante
            let bestPair = null;
            let bestScore = -Infinity;

            for (let i = 0; i < availableBlockers.length; i++) {
                for (let j = i + 1; j < availableBlockers.length; j++) {
                    const b1 = availableBlockers[i];
                    const b2 = availableBlockers[j];

                    const b1Power = this.rules.getCreaturePower(b1);
                    const b2Power = this.rules.getCreaturePower(b2);
                    const b1Toughness = this.rules.getCreatureToughness(b1);
                    const b2Toughness = this.rules.getCreatureToughness(b2);
                    const b1HasDeathtouch = this.rules.hasKeyword(b1, 'deathtouch', false);
                    const b2HasDeathtouch = this.rules.hasKeyword(b2, 'deathtouch', false);

                    const combinedPower = b1Power + b2Power;
                    const canKillAttacker = combinedPower >= attackerToughness ||
                        b1HasDeathtouch || b2HasDeathtouch;

                    // Se não consegue matar o atacante, não vale a pena
                    if (!canKillAttacker) continue;

                    // Calcular quantos bloqueadores morrem
                    // Nota: o atacante distribui dano, então assumimos pior caso
                    // (atacante mata um bloqueador, a menos que tenha deathtouch que mata ambos)
                    let blockerDeaths = 0;
                    if (attackerHasDeathtouch) {
                        // Deathtouch mata ambos os bloqueadores
                        blockerDeaths = 2;
                    } else {
                        // Atacante pode matar pelo menos o menor bloqueador
                        if (attackerPower >= b1Toughness) blockerDeaths++;
                        if (attackerPower >= b2Toughness) blockerDeaths++;
                        // Na prática, dano é dividido, então geralmente só mata 1
                        // Mas vamos ser conservadores
                        blockerDeaths = Math.min(blockerDeaths, attackerPower >= (b1Toughness + b2Toughness) ? 2 : 1);
                    }

                    // Calcular valor das criaturas (power como proxy)
                    const blockersTotalValue = b1Power + b2Power;
                    const attackerValue = attackerPower;

                    // Score: positivo = bom para IA
                    // - Matar atacante grande sem perder bloqueadores = muito bom
                    // - Matar atacante grande perdendo 1 bloqueador = ok se atacante vale
                    // - Perder 2 bloqueadores = só se estamos em pânico
                    let score = 0;

                    if (blockerDeaths === 0) {
                        // Matamos atacante sem perder ninguém - excelente!
                        score = attackerValue * 10;
                    } else if (blockerDeaths === 1) {
                        // Perdemos 1 bloqueador para matar atacante
                        // Vale se atacante tem power >= threshold
                        if (attackerPower >= tradePowerThreshold) {
                            score = attackerValue - Math.min(b1Power, b2Power);
                        } else if (aiLife <= attackerPower * panicMultiplier) {
                            // Em pânico, qualquer bloqueio vale
                            score = attackerPower;
                        } else {
                            score = -1; // Não vale a pena
                        }
                    } else {
                        // Perdemos ambos bloqueadores
                        // Só vale se estamos em pânico
                        if (aiLife <= attackerPower * panicMultiplier) {
                            score = attackerPower - blockersTotalValue;
                        } else if (attackerPower >= tradePowerThreshold + 2) {
                            // Atacante muito forte, pode valer
                            score = attackerPower - blockersTotalValue;
                        } else {
                            score = -10; // Não vale
                        }
                    }

                    // Trample reduz valor do gang block (dano passa)
                    if (attackerHasTrample && score > 0) {
                        const excessDamage = attackerPower - (b1Toughness + b2Toughness);
                        if (excessDamage > 0) {
                            score -= excessDamage;
                        }
                    }

                    if (score > bestScore && score > 0) {
                        bestScore = score;
                        bestPair = [b1, b2];
                    }
                }
            }

            return bestPair;
        };

        // PRIMEIRO: Bloquear atacantes com mustBeBlocked (obrigatório)
        const mustBlockAttackers = attackers.filter(a => a.mustBeBlocked);
        mustBlockAttackers.forEach(attacker => {
            const availableBlockers = possibleBlockers.filter(b =>
                this.rules.canBlock(b, attacker) && !b.assignedToBlock
            );

            const attackerHasMenace = hasMenace(attacker);

            if (attackerHasMenace) {
                // Menace: precisa de 2 bloqueadores
                if (availableBlockers.length >= 2) {
                    const pair = selectMenaceBlockers(availableBlockers, attacker);
                    if (pair) {
                        assignBlockers(attacker, pair);
                    } else {
                        // Mesmo sem vantagem, mustBeBlocked é obrigatório
                        assignBlockers(attacker, [availableBlockers[0], availableBlockers[1]]);
                    }
                }
                // Se não tem 2 bloqueadores disponíveis, não pode bloquear menace
            } else {
                // Sem menace: 1 bloqueador
                if (availableBlockers.length > 0) {
                    const attackerToughness = this.rules.getCreatureToughness(attacker);
                    const bestBlocker = selectBestBlocker(availableBlockers, attackerToughness);
                    assignBlockers(attacker, [bestBlocker]);
                }
            }
        });

        // SEGUNDO: Lógica normal para outros atacantes
        attackers.filter(a => !a.mustBeBlocked).forEach(attacker => {
            const attackerPower = this.rules.getCreaturePower(attacker);
            const attackerToughness = this.rules.getCreatureToughness(attacker);
            const attackerHasMenace = hasMenace(attacker);

            // Encontrar bloqueadores válidos não usados
            const availableBlockers = possibleBlockers.filter(b =>
                this.rules.canBlock(b, attacker) && !b.assignedToBlock
            );

            if (availableBlockers.length === 0) return;

            // MENACE: precisa de 2 bloqueadores
            if (attackerHasMenace) {
                const pair = selectMenaceBlockers(availableBlockers, attacker);
                if (pair) {
                    assignBlockers(attacker, pair);
                }
                // Se não conseguiu selecionar um bom par, não bloqueia
                return;
            }

            // Lógica normal (sem menace): tentar 1 bloqueador primeiro
            let foundSingleBlocker = false;
            for (const blocker of availableBlockers) {
                const blockerPower = this.rules.getCreaturePower(blocker);
                const blockerToughness = this.rules.getCreatureToughness(blocker);

                const blockerDies = attackerPower >= blockerToughness;
                const attackerDies = blockerPower >= attackerToughness ||
                    this.rules.hasKeyword(blocker, 'deathtouch', false);

                // Usar thresholds configurados por dificuldade
                const tradePowerThreshold = this.config.thresholds.tradePower;
                const panicMultiplier = this.config.thresholds.panicMultiplier;

                // Bloquear se:
                // 1. Matamos o atacante sem morrer
                // 2. Atacante tem power >= threshold (vale a troca)
                // 3. Estamos em risco de morrer (vida <= power * panicMultiplier)

                if (attackerDies && !blockerDies) {
                    assignBlockers(attacker, [blocker]);
                    foundSingleBlocker = true;
                    break;
                } else if (attackerPower >= tradePowerThreshold && attackerDies) {
                    assignBlockers(attacker, [blocker]);
                    foundSingleBlocker = true;
                    break;
                } else if (this.game.opponent.life <= attackerPower * panicMultiplier) {
                    // Bloquear se vamos morrer em breve
                    assignBlockers(attacker, [blocker]);
                    foundSingleBlocker = true;
                    break;
                }
            }

            // GANG BLOCK VOLUNTÁRIO: Se não encontrou bloqueador único favorável,
            // tentar bloquear com 2 criaturas para matar atacante grande
            if (!foundSingleBlocker && availableBlockers.length >= 2) {
                const gangBlockPair = selectGangBlockPair(availableBlockers, attacker);
                if (gangBlockPair) {
                    assignBlockers(attacker, gangBlockPair);
                }
            }
        });

        // === FASE DE CHUMP BLOCK INTELIGENTE ===
        // Após bloqueios normais, verificar se dano restante é perigoso
        const unblockeddamage = calculateTotalDamage(attackers, assignments);
        const lifeAfterDamage = aiLife - unblockeddamage;
        const panicMultiplier = this.config.thresholds.panicMultiplier;

        // Situações que justificam chump block:
        // 1. Dano seria letal (vida <= 0)
        // 2. Ficaria em range letal para próximo turno (vida <= maior atacante * panicMultiplier)
        // 3. Temos bloqueadores descartáveis (tokens) sobrando

        if (unblockeddamage > 0) {
            // Encontrar atacantes não bloqueados
            const unblockedAttackers = attackers.filter(a => !assignments[a.instanceId]);

            // Ordenar atacantes por poder (maior primeiro) - priorizar bloquear os maiores
            const sortedUnblockedAttackers = [...unblockedAttackers].sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            );

            // Bloqueadores não usados (será filtrado por atacante no loop)
            const unusedBlockers = possibleBlockers.filter(b =>
                !b.assignedToBlock && !b.tapped
            );

            // Calcular dano do maior atacante no campo do jogador (para próximo turno)
            const playerCreatures = this.game.player.battlefield.filter(c => c.type === 'creature');
            const biggestPlayerCreaturePower = playerCreatures.length > 0
                ? Math.max(...playerCreatures.map(c => this.rules.getCreaturePower(c)))
                : 0;
            const nextTurnLethalThreshold = biggestPlayerCreaturePower * panicMultiplier;

            for (const attacker of sortedUnblockedAttackers) {
                // Filtrar bloqueadores que podem bloquear ESTE atacante (flying check!)
                const availableChumpBlockers = unusedBlockers.filter(b =>
                    !b.assignedToBlock && this.rules.canBlock(b, attacker)
                ).sort((a, b) => creatureValue(a) - creatureValue(b));

                if (availableChumpBlockers.length === 0) continue;

                const attackerPower = this.rules.getCreaturePower(attacker);
                const attackerHasMenace = hasMenace(attacker);

                // Pular atacantes com menace se não temos 2 bloqueadores válidos
                if (attackerHasMenace && availableChumpBlockers.length < 2) continue;

                // Recalcular dano atual
                const currentUnblockedDamage = calculateTotalDamage(attackers, assignments);
                const currentLifeAfter = aiLife - currentUnblockedDamage;

                // Decidir se vale chump block este atacante
                let shouldChumpBlock = false;

                // 1. Dano seria letal
                if (currentLifeAfter <= 0) {
                    shouldChumpBlock = true;
                }
                // 2. Ficaria em range letal para próximo turno
                else if (currentLifeAfter <= nextTurnLethalThreshold) {
                    shouldChumpBlock = true;
                }
                // 3. Temos tokens/descartáveis e atacante é forte
                else if (isExpendable(availableChumpBlockers[0]) && attackerPower >= 3) {
                    shouldChumpBlock = true;
                }
                // 4. Atacante muito forte (power >= 4) e temos bloqueador de baixo valor
                else if (attackerPower >= 4 && creatureValue(availableChumpBlockers[0]) <= 3) {
                    shouldChumpBlock = true;
                }

                if (shouldChumpBlock) {
                    if (attackerHasMenace) {
                        // Menace: precisa de 2 bloqueadores
                        const b1 = availableChumpBlockers[0];
                        const b2 = availableChumpBlockers[1];
                        if (b1 && b2) {
                            assignBlockers(attacker, [b1, b2]);
                        }
                    } else {
                        // Bloqueio normal: 1 bloqueador
                        const blocker = availableChumpBlockers[0];
                        if (blocker) {
                            assignBlockers(attacker, [blocker]);
                        }
                    }
                }
            }
        }

        // Limpar flags
        possibleBlockers.forEach(b => delete b.assignedToBlock);

        return assignments;
    }

    // Escolhe melhor alvo para um feitiço
    chooseBestSpellTarget(spell, validTargets) {
        if (validTargets.length === 0) return null;

        // Aprendiz: chance de escolha subótima
        if (this.config.mistakeRate > 0 && Math.random() < this.config.mistakeRate) {
            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
            return randomTarget;
        }

        const player = this.game.player;

        // Para remoções: escolher a criatura mais forte do oponente
        // Nota: felling_blow agora é one-sided fight, não remoção direta
        if (['heros_downfall', 'moment_of_craving', 'incinerating_blast',
             'volley', 'felling_blow', 'broken_wings', 'angelic_edict',
             'elspeths_smite'].includes(spell.id)) {

            // Filtrar criaturas do jogador (oponente da IA)
            const enemyCreatures = validTargets.filter(c =>
                player.battlefield.includes(c) && c.type === 'creature'
            );

            if (enemyCreatures.length > 0) {
                // Separar criaturas que são ameaças reais vs já neutralizadas
                const actualThreats = enemyCreatures.filter(c => !this.rules.hasPacifism(c));
                const neutralizedCreatures = enemyCreatures.filter(c => this.rules.hasPacifism(c));

                // Priorizar ameaças reais - criaturas com Pacifism já estão neutralizadas
                const targetPool = actualThreats.length > 0 ? actualThreats : neutralizedCreatures;

                // Escolher a criatura com maior poder
                return targetPool.sort((a, b) => {
                    const aPower = this.rules.getCreaturePower(a);
                    const bPower = this.rules.getCreaturePower(b);
                    return bPower - aPower;
                })[0];
            }

            // Se não há criaturas, escolher qualquer alvo válido
            return validTargets[0];
        }

        // Para buffs: escolher nossa melhor criatura
        if (['moment_of_triumph', 'kindled_fury', 'offer_immortality'].includes(spell.id)) {
            return validTargets.sort((a, b) => {
                const aPower = this.rules.getCreaturePower(a);
                const bPower = this.rules.getCreaturePower(b);
                return bPower - aPower;
            })[0];
        }

        // Padrão: primeiro alvo
        return validTargets[0];
    }

    // Escolhe melhor alvo para uma Aura
    chooseBestAuraTarget(aura, validTargets, controller) {
        if (validTargets.length === 0) return null;

        // Aprendiz: chance de escolha subótima (mas não para auras negativas em si mesmo)
        const isNegativeAura = aura.id === 'pacifism' || aura.id === 'eaten_by_piranhas';
        if (!isNegativeAura && this.config.mistakeRate > 0 && Math.random() < this.config.mistakeRate) {
            const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
            return randomTarget;
        }

        const player = this.game.player;
        const opponent = this.game.opponent;

        // Auras de remoção/debuff: colocar na criatura mais forte do oponente
        if (aura.id === 'pacifism' || aura.id === 'eaten_by_piranhas') {
            const enemyCreatures = validTargets.filter(c =>
                player.battlefield.includes(c)
            );

            if (enemyCreatures.length > 0) {
                // Para Pacifism: não colocar em criaturas que já têm Pacifism (desperdício)
                // Para Eaten by Piranhas: pode colocar mesmo com Pacifism (ainda reduz stats)
                let targetPool = enemyCreatures;
                if (aura.id === 'pacifism') {
                    const notPacified = enemyCreatures.filter(c => !this.rules.hasPacifism(c));
                    if (notPacified.length > 0) {
                        targetPool = notPacified;
                    }
                }

                // Escolher a criatura com maior poder (ou toughness como desempate)
                return targetPool.sort((a, b) => {
                    const aPower = this.rules.getCreaturePower(a);
                    const bPower = this.rules.getCreaturePower(b);
                    if (bPower !== aPower) return bPower - aPower;
                    // Desempate por toughness
                    const aToughness = this.rules.getCreatureToughness(a);
                    const bToughness = this.rules.getCreatureToughness(b);
                    return bToughness - aToughness;
                })[0];
            }
            // Não há criaturas inimigas - não jogar aura negativa em si mesmo
            return null;
        } else if (aura.id === 'untamed_hunger') {
            // Untamed Hunger: colocar na nossa melhor criatura
            const ourCreatures = validTargets.filter(c =>
                opponent.battlefield.includes(c)
            );

            if (ourCreatures.length > 0) {
                return ourCreatures.sort((a, b) => {
                    const aPower = this.rules.getCreaturePower(a);
                    const bPower = this.rules.getCreaturePower(b);
                    return bPower - aPower;
                })[0];
            }
        }

        // Padrão: primeiro alvo válido
        return validTargets[0];
    }

    /**
     * Divide dano de uma criatura atacante entre múltiplos bloqueadores
     * Estratégia: matar o máximo de criaturas possível, priorizando as mais fortes
     * @param {Object} attacker - Criatura atacante
     * @param {Array} blockers - Array de bloqueadores
     * @param {number} totalDamage - Dano total a distribuir
     * @returns {Object} Mapa de instanceId -> dano atribuído
     */
    assignDamageToBlockers(attacker, blockers, totalDamage) {
        const assignment = {};
        blockers.forEach(b => assignment[b.instanceId] = 0);

        let remainingDamage = totalDamage;
        const hasDeathtouch = attacker.keywords && attacker.keywords.includes('deathtouch');

        // Ordenar bloqueadores por prioridade de eliminação
        // - Primeiro: criaturas que podemos matar com dano disponível
        // - Depois: por poder (mais perigosas primeiro)
        const sortedBlockers = [...blockers].sort((a, b) => {
            const aToughness = this.rules.getCreatureToughness(a);
            const bToughness = this.rules.getCreatureToughness(b);
            const aPower = this.rules.getCreaturePower(a);
            const bPower = this.rules.getCreaturePower(b);

            // Com deathtouch, todas morrem com 1 de dano
            if (hasDeathtouch) {
                // Priorizar criaturas mais fortes
                return bPower - aPower;
            }

            // Verificar se podemos matar cada uma
            const canKillA = aToughness <= remainingDamage;
            const canKillB = bToughness <= remainingDamage;

            // Priorizar criaturas que podemos matar
            if (canKillA && !canKillB) return -1;
            if (!canKillA && canKillB) return 1;

            // Se ambas podem morrer, matar a mais forte primeiro
            if (canKillA && canKillB) {
                return bPower - aPower;
            }

            // Se nenhuma pode morrer, concentrar dano na mais fraca (para tentar matar)
            return aToughness - bToughness;
        });

        // Distribuir dano
        for (const blocker of sortedBlockers) {
            if (remainingDamage <= 0) break;

            const toughness = this.rules.getCreatureToughness(blocker);

            if (hasDeathtouch) {
                // Com deathtouch, 1 de dano é suficiente para matar
                assignment[blocker.instanceId] = 1;
                remainingDamage -= 1;
            } else {
                // Atribuir dano letal se possível
                const damageNeeded = Math.min(toughness, remainingDamage);
                assignment[blocker.instanceId] = damageNeeded;
                remainingDamage -= damageNeeded;
            }
        }

        // Se sobrou dano (trample ou excesso), atribuir ao primeiro bloqueador
        if (remainingDamage > 0 && sortedBlockers.length > 0) {
            assignment[sortedBlockers[0].instanceId] += remainingDamage;
        }

        return assignment;
    }

    // Delay para visualização (com verificação de sessão)
    delay(ms) {
        const sessionAtStart = this.game.gameSessionId;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Verifica se ainda estamos na mesma sessão
                if (this.game.gameSessionId !== sessionAtStart) {
                    reject(new Error('Game session changed'));
                } else {
                    resolve();
                }
            }, ms);
        });
    }

    /**
     * Verifica se ainda estamos na mesma sessão do jogo
     * Útil para verificar antes de continuar operações async
     */
    isSessionValid(sessionId) {
        return this.game.gameSessionId === sessionId;
    }
}

// Exportar
window.AIPlayer = AIPlayer;
