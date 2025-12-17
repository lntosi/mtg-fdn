// === Inteligência Artificial com Níveis de Dificuldade ===

// Configurações de dificuldade da IA
const AI_DIFFICULTY = {
    aprendiz: {
        name: 'Aprendiz',
        description: 'IA fácil - comete erros, não usa habilidades ativadas',
        attackWithZeroPower: true,      // Ataca mesmo com power 0 (erro)
        useActivatedAbilities: false,   // Não usa habilidades ativadas
        holdManaForInstants: false,     // Não guarda mana para respostas
        evaluateTrades: false,          // Não avalia trades corretamente
        aggressiveness: 0.9             // Muito agressivo (ataca mais)
    },
    mago: {
        name: 'Mago',
        description: 'IA equilibrada - joga de forma competente',
        attackWithZeroPower: false,     // Não ataca com power 0
        useActivatedAbilities: true,    // Usa habilidades quando sobra mana
        holdManaForInstants: false,     // Ainda não guarda mana
        evaluateTrades: true,           // Avalia trades básicos
        aggressiveness: 0.6             // Equilibrado
    },
    planeswalker: {
        name: 'Planeswalker',
        description: 'IA difícil - joga de forma otimizada',
        attackWithZeroPower: false,
        useActivatedAbilities: true,    // Usa habilidades estrategicamente
        holdManaForInstants: true,      // Guarda mana para respostas
        evaluateTrades: true,
        aggressiveness: 0.4             // Mais cauteloso, trades inteligentes
    }
};

// Exportar constantes
window.AI_DIFFICULTY = AI_DIFFICULTY;

class AIPlayer {
    constructor(gameState, rulesEngine, difficulty = 'mago') {
        this.game = gameState;
        this.rules = rulesEngine;
        this.setDifficulty(difficulty);
    }

    // Define o nível de dificuldade da IA
    setDifficulty(level) {
        if (AI_DIFFICULTY[level]) {
            this.difficulty = AI_DIFFICULTY[level];
            this.difficultyLevel = level;
        } else {
            console.warn(`Dificuldade '${level}' não encontrada, usando 'mago'`);
            this.difficulty = AI_DIFFICULTY.mago;
            this.difficultyLevel = 'mago';
        }
    }

    // Retorna o nível de dificuldade atual
    getDifficulty() {
        return this.difficultyLevel;
    }

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

            let playableCards = opponent.hand
                .filter(card => card.type !== 'land' && this.rules.canPlayCard(card, opponent))
                .sort((a, b) => (b.cmc || 0) - (a.cmc || 0));

            // Na Main Phase 1, filtrar cartas que devem ser seguradas para depois do combate
            if (phase === 1) {
                playableCards = playableCards.filter(card => !this.shouldHoldForMainPhase2(card));
            }

            if (playableCards.length > 0) {
                const cardToPlay = this.chooseBestCard(playableCards);
                if (cardToPlay) {
                    // Delay antes de jogar a carta para dar tempo de ver
                    await this.delay(600);
                    await this.game.playCard(cardToPlay, opponent);
                    this.game.ui.render();
                    await this.delay(1200); // Delay maior para ver a carta jogada
                    playedSomething = true;
                }
            }
        }

        // 3. Usar habilidades ativadas (Main Phase 2, quando sobra mana)
        if (phase === 2 && this.difficulty.useActivatedAbilities) {
            await this.useActivatedAbilities();
        }
    }

    // Usa habilidades ativadas quando vale a pena
    async useActivatedAbilities() {
        const opponent = this.game.opponent;
        const player = this.game.player;

        // Encontrar criaturas com habilidades ativadas
        const creaturesWithAbilities = opponent.battlefield.filter(card =>
            card.type === 'creature' &&
            this.game.canActivateAbility &&
            this.game.canActivateAbility(card, opponent)
        );

        for (const creature of creaturesWithAbilities) {
            // Verificar se ainda pode ativar (mana pode ter mudado)
            if (!this.game.canActivateAbility(creature, opponent)) continue;

            // Decidir se vale a pena ativar
            const shouldActivate = this.shouldActivateAbility(creature, opponent, player);

            if (shouldActivate) {
                this.game.ui.log(`IA ativa habilidade de ${creature.name}`);
                await this.delay(800);
                await this.game.activateAbility(creature, opponent);
                this.game.ui.render();
                await this.delay(1000);
            }
        }
    }

    // Decide se vale a pena ativar uma habilidade
    shouldActivateAbility(creature, controller, opponent) {
        switch (creature.id) {
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

            default:
                // Por padrão, ativar se possível
                return true;
        }
    }

    // Escolhe a melhor carta para jogar
    chooseBestCard(playableCards) {
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

        chosenAttackers.forEach(attacker => {
            if (!attacker.keywords || !attacker.keywords.includes('vigilance')) {
                attacker.tapped = true;
            }
        });

        const attackerNames = chosenAttackers.map(a => a.name).join(', ');
        this.game.ui.log(`Oponente ataca com: ${attackerNames}`);
        this.game.currentAttackers = chosenAttackers;
        this.game.ui.render();

        // Delay maior para ver as criaturas atacando
        await this.delay(1200);

        // Pedir ao jogador para bloquear
        this.game.phase = window.PHASES.DECLARE_BLOCKERS;
        this.game.ui.promptForBlockers(chosenAttackers);
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
            if (!this.difficulty.attackWithZeroPower && attackerPower <= 0) {
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

            if (!canBeBlocked) {
                attackers.push(attacker);
            } else if (!canDie) {
                attackers.push(attacker);
            } else if (canKill && (hasLifelink || attackerPower >= 3)) {
                attackers.push(attacker);
            } else if (lifeAdvantage > 5) {
                // Jogar agressivo se estamos na frente
                attackers.push(attacker);
            }
        });

        return attackers;
    }

    // Escolhe bloqueadores
    chooseBlockers(attackers, possibleBlockers) {
        const assignments = {};

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

            // Bloquear se:
            // 1. Conseguimos matar sem perder nenhum bloqueador
            // 2. Conseguimos matar perdendo só 1 bloqueador e atacante tem 4+ de poder
            // 3. Estamos em risco de morrer
            if (canKill && blockerDeaths === 0) {
                return [b1, b2];
            } else if (canKill && blockerDeaths === 1 && attackerPower >= 4) {
                return [b1, b2];
            } else if (this.game.opponent.life <= attackerPower * 2) {
                return [b1, b2];
            }

            return null;
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

            // Lógica normal (sem menace): 1 bloqueador
            for (const blocker of availableBlockers) {
                const blockerPower = this.rules.getCreaturePower(blocker);
                const blockerToughness = this.rules.getCreatureToughness(blocker);

                const blockerDies = attackerPower >= blockerToughness;
                const attackerDies = blockerPower >= attackerToughness ||
                    this.rules.hasKeyword(blocker, 'deathtouch', false);

                // Bloquear se:
                // 1. Matamos o atacante sem morrer
                // 2. Atacante tem 4+ de poder (vale a troca)
                // 3. Temos muito mais vida

                if (attackerDies && !blockerDies) {
                    assignBlockers(attacker, [blocker]);
                    break;
                } else if (attackerPower >= 4 && attackerDies) {
                    assignBlockers(attacker, [blocker]);
                    break;
                } else if (this.game.opponent.life <= attackerPower * 2) {
                    // Bloquear se vamos morrer em breve
                    assignBlockers(attacker, [blocker]);
                    break;
                }
            }
        });

        // Limpar flags
        possibleBlockers.forEach(b => delete b.assignedToBlock);

        return assignments;
    }

    // Escolhe melhor alvo para um feitiço
    chooseBestSpellTarget(spell, validTargets) {
        if (validTargets.length === 0) return null;

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
                // Escolher a criatura com maior poder
                return enemyCreatures.sort((a, b) => {
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

        const player = this.game.player;
        const opponent = this.game.opponent;

        if (aura.id === 'pacifism') {
            // Pacifism: colocar na criatura mais forte do oponente
            const enemyCreatures = validTargets.filter(c =>
                player.battlefield.includes(c)
            );

            if (enemyCreatures.length > 0) {
                // Escolher a criatura com maior poder
                return enemyCreatures.sort((a, b) => {
                    const aPower = this.rules.getCreaturePower(a);
                    const bPower = this.rules.getCreaturePower(b);
                    return bPower - aPower;
                })[0];
            }
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
