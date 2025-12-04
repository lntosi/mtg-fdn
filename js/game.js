// === Estado e Lógica Principal do Jogo ===

class GameState {
    constructor() {
        this.player = null;
        this.opponent = null;
        this.activePlayer = null;
        this.phase = null;
        this.turnNumber = 0;
        this.rules = null;
        this.ui = null;
        this.ai = null;
        this.currentAttackers = [];
        this.blockerAssignments = {};
        this.playerDeckKeys = null;
        this.aiDeckKeys = null;
    }

    init() {
        this.rules = new RulesEngine(this);
        this.ui = new GameUI(this);
        this.ai = new AIPlayer(this, this.rules);

        // Tentar restaurar jogo salvo
        if (this.hasSavedGame()) {
            this.showRestorePrompt();
        }
    }

    // === Sistema de Persistência ===

    hasSavedGame() {
        return localStorage.getItem('mtg_game_state') !== null;
    }

    showRestorePrompt() {
        const saved = JSON.parse(localStorage.getItem('mtg_game_state'));
        const turnInfo = `Turno ${saved.turnNumber}`;
        const lifeInfo = `Você: ${saved.player.life} vida | Oponente: ${saved.opponent.life} vida`;

        if (confirm(`Jogo salvo encontrado!\n${turnInfo}\n${lifeInfo}\n\nDeseja continuar?`)) {
            this.restoreGame();
        } else {
            this.clearSavedGame();
        }
    }

    saveGame() {
        // Não salvar se o jogo não começou
        if (!this.player || !this.opponent) return;

        const state = {
            player: this.serializePlayer(this.player),
            opponent: this.serializePlayer(this.opponent),
            activePlayerIsHuman: this.activePlayer === this.player,
            phase: this.phase,
            turnNumber: this.turnNumber,
            playerDeckKeys: this.playerDeckKeys,
            aiDeckKeys: this.aiDeckKeys,
            timestamp: Date.now()
        };

        localStorage.setItem('mtg_game_state', JSON.stringify(state));
    }

    serializePlayer(player) {
        return {
            name: player.name,
            life: player.life,
            library: player.library.map(c => this.serializeCard(c)),
            hand: player.hand.map(c => this.serializeCard(c)),
            battlefield: player.battlefield.map(c => this.serializeCard(c)),
            graveyard: player.graveyard.map(c => this.serializeCard(c)),
            landsPlayedThisTurn: player.landsPlayedThisTurn
        };
    }

    serializeCard(card) {
        return {
            ...card,
            // Garantir que propriedades de estado são salvas
            tapped: card.tapped || false,
            summoningSickness: card.summoningSickness || false,
            damage: card.damage || 0,
            powerModifier: card.powerModifier || 0,
            toughnessModifier: card.toughnessModifier || 0
        };
    }

    restoreGame() {
        try {
            const saved = JSON.parse(localStorage.getItem('mtg_game_state'));
            if (!saved) return false;

            // Restaurar jogadores
            this.player = this.deserializePlayer(saved.player);
            this.opponent = this.deserializePlayer(saved.opponent);

            // Restaurar estado do jogo
            this.activePlayer = saved.activePlayerIsHuman ? this.player : this.opponent;
            this.phase = saved.phase;
            this.turnNumber = saved.turnNumber;
            this.playerDeckKeys = saved.playerDeckKeys;
            this.aiDeckKeys = saved.aiDeckKeys;

            // Limpar estado de combate (para evitar bugs)
            this.currentAttackers = [];
            this.blockerAssignments = {};

            // Se estava no meio do turno da IA, voltar para main phase do jogador
            if (!saved.activePlayerIsHuman) {
                this.activePlayer = this.player;
                this.phase = PHASES.MAIN1;
            }

            // Esconder modal de seleção
            this.ui.deckSelection.classList.add('hidden');

            this.ui.log(`Jogo restaurado - Turno ${this.turnNumber}`);
            this.ui.render();

            return true;
        } catch (e) {
            console.error('Erro ao restaurar jogo:', e);
            this.clearSavedGame();
            return false;
        }
    }

    deserializePlayer(data) {
        return {
            name: data.name,
            life: data.life,
            library: data.library,
            hand: data.hand,
            battlefield: data.battlefield,
            graveyard: data.graveyard,
            landsPlayedThisTurn: data.landsPlayedThisTurn
        };
    }

    clearSavedGame() {
        localStorage.removeItem('mtg_game_state');
    }

    startGame(playerDecks, aiDecks) {
        // Salvar escolha de decks
        this.playerDeckKeys = playerDecks;
        this.aiDeckKeys = aiDecks;

        // Criar jogadores
        this.player = this.createPlayer('Você', playerDecks);
        this.opponent = this.createPlayer('Oponente', aiDecks);

        // Embaralhar decks
        this.player.library = shuffleDeck(this.player.library);
        this.opponent.library = shuffleDeck(this.opponent.library);

        // Comprar mão inicial (7 cartas)
        for (let i = 0; i < 7; i++) {
            this.rules.drawCard(this.player);
            this.rules.drawCard(this.opponent);
        }

        // Iniciar jogo
        this.turnNumber = 1;
        this.activePlayer = this.player;
        this.phase = PHASES.MAIN1; // Pular untap/upkeep/draw no primeiro turno

        this.ui.log(`Jogo iniciado! Seus decks: ${playerDecks.join(' + ')}`);
        this.ui.log(`Decks do oponente: ${aiDecks.join(' + ')}`);
        this.ui.log('Seu turno - Fase Principal 1');

        this.ui.render();
        this.saveGame(); // Auto-save inicial
    }

    createPlayer(name, deckKeys) {
        const deck = createCombinedDeck(deckKeys[0], deckKeys[1]);

        return {
            name: name,
            life: 20,
            library: deck,
            hand: [],
            battlefield: [],
            graveyard: [],
            landsPlayedThisTurn: 0
        };
    }

    isPlayerTurn() {
        return this.activePlayer === this.player;
    }

    // Jogar uma carta
    async playCard(card, player) {
        if (!this.rules.canPlayCard(card, player)) {
            this.ui.log(`Não pode jogar ${card.name} agora.`);
            return false;
        }

        // Remover da mão
        const handIndex = player.hand.indexOf(card);
        if (handIndex > -1) {
            player.hand.splice(handIndex, 1);
        }

        // Som de jogar carta
        window.soundManager.playCardPlay();

        if (card.type === 'land') {
            // Jogar terreno
            player.battlefield.push(card);
            player.landsPlayedThisTurn++;

            // Terrenos que entram virados
            if (card.enters_tapped) {
                card.tapped = true;
            }

            this.ui.log(`${player.name} jogou ${card.name}`);
        } else if (card.type === 'instant' || card.type === 'sorcery') {
            // Pagar mana
            this.rules.payMana(card, player);

            // Som de magia
            window.soundManager.playMagic();

            // Resolver efeito (simplificado)
            this.resolveSpell(card, player);

            // Vai pro cemitério
            player.graveyard.push(card);

            this.ui.log(`${player.name} conjurou ${card.name}`);
        } else if (card.type === 'enchantment' && card.subtype === 'Aura') {
            // Auras precisam de um alvo
            await this.playAura(card, player);
            return true; // Retorna aqui pois playAura cuida do resto
        } else {
            // Permanentes (criaturas, encantamentos não-aura, artefatos)
            this.rules.payMana(card, player);

            card.summoningSickness = (card.type === 'creature');
            player.battlefield.push(card);

            // Trigger de entrada (simplificado)
            this.resolveETB(card, player);

            this.ui.log(`${player.name} jogou ${card.name}`);
        }

        this.ui.render();
        this.saveGame(); // Auto-save após jogar carta
        return true;
    }

    // Jogar uma Aura (requer seleção de alvo)
    async playAura(aura, player) {
        const opponent = player === this.player ? this.opponent : this.player;

        // Determinar alvos válidos baseado na Aura
        let validTargets = [];

        if (aura.id === 'pacifism') {
            // Pacifism: encantar criatura (qualquer)
            validTargets = [
                ...this.player.battlefield.filter(c => c.type === 'creature'),
                ...this.opponent.battlefield.filter(c => c.type === 'creature')
            ];
        } else if (aura.id === 'untamed_hunger') {
            // Untamed Hunger: encantar criatura que você controla
            validTargets = player.battlefield.filter(c => c.type === 'creature');
        } else {
            // Padrão: qualquer criatura
            validTargets = [
                ...this.player.battlefield.filter(c => c.type === 'creature'),
                ...this.opponent.battlefield.filter(c => c.type === 'creature')
            ];
        }

        if (validTargets.length === 0) {
            this.ui.log(`Não há alvos válidos para ${aura.name}`);
            player.hand.push(aura); // Devolver para a mão
            return;
        }

        // Se é o jogador humano, pedir para selecionar alvo
        if (player === this.player) {
            // Pagar mana antes de selecionar alvo
            this.rules.payMana(aura, player);
            window.soundManager.playMagic();

            this.ui.promptForTarget(aura, validTargets, (target) => {
                this.attachAura(aura, target, player);
            });
        } else {
            // IA: escolher melhor alvo automaticamente
            this.rules.payMana(aura, player);
            window.soundManager.playMagic();

            const target = this.ai.chooseBestAuraTarget(aura, validTargets, player);
            if (target) {
                this.attachAura(aura, target, player);
            }
        }
    }

    // Anexar Aura a uma criatura
    attachAura(aura, target, controller) {
        aura.attachedTo = target.instanceId;
        aura.controlledBy = controller === this.player ? 'player' : 'opponent';
        controller.battlefield.push(aura);

        this.ui.log(`${aura.name} foi anexado a ${target.name}`);
        this.ui.render();
        this.saveGame();
    }

    // Resolver feitiços (simplificado)
    resolveSpell(card, caster) {
        // Implementação básica de alguns feitiços
        const opponent = caster === this.player ? this.opponent : this.player;

        switch (card.id) {
            case 'moment_of_triumph':
                // +2/+2 e ganhar 2 vidas - simplificado: só ganha vida
                caster.life += 2;
                this.ui.log(`${caster.name} ganhou 2 vidas`);
                break;

            case 'dragon_fodder':
                // Criar 2 tokens goblin
                for (let i = 0; i < 2; i++) {
                    caster.battlefield.push({
                        instanceId: `goblin_token_${Date.now()}_${i}`,
                        name: 'Goblin Token',
                        type: 'creature',
                        subtype: 'Goblin',
                        power: 1,
                        toughness: 1,
                        summoningSickness: true
                    });
                }
                this.ui.log(`Criados 2 tokens Goblin 1/1`);
                break;

            case 'moment_of_craving':
                // -2/-2 e ganhar 2 vidas
                const target = opponent.battlefield.find(c => c.type === 'creature');
                if (target) {
                    target.powerModifier = (target.powerModifier || 0) - 2;
                    target.toughnessModifier = (target.toughnessModifier || 0) - 2;
                    this.checkCreatureDeath(target, opponent);
                }
                caster.life += 2;
                break;

            case 'heros_downfall':
                // Destruir criatura
                const creature = opponent.battlefield.find(c => c.type === 'creature');
                if (creature) {
                    this.destroyPermanent(creature, opponent);
                    this.ui.log(`${creature.name} foi destruído`);
                }
                break;

            default:
                // Feitiço genérico
                break;
        }
    }

    // Resolver triggers de entrada
    resolveETB(card, controller) {
        if (!card.keywords) return;

        if (card.keywords.includes('etb_draw')) {
            this.rules.drawCard(controller);
            this.ui.log(`${controller.name} comprou uma carta`);
        }

        // Prideful Parent - criar token
        if (card.id === 'prideful_parent') {
            controller.battlefield.push({
                instanceId: `cat_token_${Date.now()}`,
                name: 'Cat Token',
                type: 'creature',
                subtype: 'Cat',
                power: 1,
                toughness: 1,
                summoningSickness: true
            });
            this.ui.log(`Criado um token Cat 1/1`);
        }

        // Vampire Spawn - drenar 2
        if (card.id === 'vampire_spawn') {
            const opponent = controller === this.player ? this.opponent : this.player;
            opponent.life -= 2;
            controller.life += 2;
            this.ui.log(`${opponent.name} perdeu 2 vidas, ${controller.name} ganhou 2 vidas`);
        }

        // Dropkick Bomber - 2 dano
        if (card.id === 'dropkick_bomber') {
            const opponent = controller === this.player ? this.opponent : this.player;
            const target = opponent.battlefield.find(c => c.type === 'creature');
            if (target) {
                target.damage = (target.damage || 0) + 2;
                this.checkCreatureDeath(target, opponent);
                this.ui.log(`Dropkick Bomber causou 2 de dano a ${target.name}`);
            }
        }
    }

    checkCreatureDeath(creature, owner) {
        const toughness = this.rules.getCreatureToughness(creature);
        const damage = creature.damage || 0;

        if (toughness <= 0 || damage >= toughness) {
            this.destroyPermanent(creature, owner);
        }
    }

    destroyPermanent(permanent, owner) {
        const index = owner.battlefield.indexOf(permanent);
        if (index > -1) {
            owner.battlefield.splice(index, 1);
            owner.graveyard.push(permanent);
        }
    }

    // Avançar para próxima fase
    async nextPhase() {
        const currentIndex = PHASE_ORDER.indexOf(this.phase);
        let nextIndex = currentIndex + 1;

        if (nextIndex >= PHASE_ORDER.length) {
            // Fim do turno, passar para o oponente
            await this.endTurn();
            return;
        }

        this.phase = PHASE_ORDER[nextIndex];
        await this.handlePhase();
    }

    async handlePhase() {
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);

        switch (this.phase) {
            case PHASES.UNTAP:
                this.rules.untapAll(this.activePlayer);
                this.activePlayer.landsPlayedThisTurn = 0;
                this.rules.removeSummoningSickness(this.activePlayer);
                await this.nextPhase();
                break;

            case PHASES.UPKEEP:
                await this.nextPhase();
                break;

            case PHASES.DRAW:
                if (this.turnNumber > 1 || this.activePlayer !== this.player) {
                    const drawn = this.rules.drawCard(this.activePlayer);
                    if (drawn && this.isPlayerTurn()) {
                        this.ui.log(`Você comprou: ${drawn.name}`);
                    } else if (drawn) {
                        this.ui.log(`Oponente comprou uma carta`);
                    }
                }
                await this.nextPhase();
                break;

            case PHASES.DECLARE_ATTACKERS:
                if (!this.isPlayerTurn()) {
                    // IA declara atacantes
                    await this.ai.doCombat();
                }
                // Se é turno do jogador, espera ele clicar em "Atacar"
                break;

            case PHASES.DECLARE_BLOCKERS:
                // Tratado após atacantes serem declarados
                break;

            case PHASES.COMBAT_DAMAGE:
                await this.resolveCombat();
                await this.nextPhase();
                break;

            case PHASES.COMBAT_END:
                this.currentAttackers = [];
                this.blockerAssignments = {};
                await this.nextPhase();
                break;

            case PHASES.END:
                await this.nextPhase();
                break;

            case PHASES.CLEANUP:
                // Descartar até 7 cartas (simplificado: não implementado)
                // Limpar dano das criaturas
                this.activePlayer.battlefield.forEach(c => {
                    c.damage = 0;
                    c.powerModifier = 0;
                    c.toughnessModifier = 0;
                });
                await this.endTurn();
                break;

            default:
                break;
        }

        this.ui.render();
        this.checkGameOver();
    }

    async declareAttackers(attackers, attackingPlayer) {
        if (attackers.length === 0) {
            this.ui.log('Nenhum atacante declarado');
            this.phase = PHASES.COMBAT_END;
            await this.nextPhase();
            return;
        }

        // Som de ataque
        window.soundManager.playAttack();

        this.currentAttackers = attackers;

        // Virar atacantes (exceto vigilance)
        attackers.forEach(attacker => {
            if (!attacker.keywords || !attacker.keywords.includes('vigilance')) {
                attacker.tapped = true;
            }
        });

        const attackerNames = attackers.map(a => a.name).join(', ');
        this.ui.log(`${attackingPlayer.name} ataca com: ${attackerNames}`);

        this.phase = PHASES.DECLARE_BLOCKERS;

        // Se jogador está sendo atacado, pedir bloqueadores
        if (attackingPlayer === this.opponent) {
            this.ui.promptForBlockers(attackers);
        } else {
            // IA escolhe bloqueadores
            const blockers = this.opponent.battlefield.filter(c =>
                c.type === 'creature' && !c.tapped
            );
            this.blockerAssignments = this.ai.chooseBlockers(attackers, blockers);

            if (Object.keys(this.blockerAssignments).length > 0) {
                this.ui.log('Oponente declarou bloqueadores');
            } else {
                this.ui.log('Oponente não bloqueou');
            }

            this.phase = PHASES.COMBAT_DAMAGE;
            await this.handlePhase();
        }

        this.ui.render();
    }

    async declareBlockers(assignments) {
        this.blockerAssignments = assignments;

        if (Object.keys(assignments).length > 0) {
            // Som de bloqueio
            window.soundManager.playBlock();
            this.ui.log('Você declarou bloqueadores');
        } else {
            this.ui.log('Você não bloqueou');
        }

        // Se é o turno da IA (jogador está bloqueando), usar fluxo especial
        if (!this.isPlayerTurn()) {
            await this.continueAfterBlocking();
        } else {
            // Turno do jogador, fluxo normal
            this.phase = PHASES.COMBAT_DAMAGE;
            await this.handlePhase();
        }
    }

    async resolveCombat() {
        if (this.currentAttackers.length === 0) return;

        // Determinar quem está atacando baseado em quem possui as criaturas atacantes
        const firstAttacker = this.currentAttackers[0];
        const attackingPlayer = this.opponent.battlefield.includes(firstAttacker) ? this.opponent : this.player;
        const defendingPlayer = attackingPlayer === this.player ? this.opponent : this.player;

        const results = this.rules.resolveCombatDamage(
            this.currentAttackers,
            this.blockerAssignments,
            defendingPlayer,
            attackingPlayer
        );

        // Aplicar dano aos jogadores
        defendingPlayer.life -= results.damageToPlayers.defender;
        if (results.damageToPlayers.defender > 0) {
            // Som de dano
            window.soundManager.playDamage();
            this.ui.log(`${defendingPlayer.name} recebeu ${results.damageToPlayers.defender} de dano`);
        }

        // Aplicar vida ganha
        attackingPlayer.life += results.lifeGained.attacker;
        if (results.lifeGained.attacker > 0) {
            this.ui.log(`${attackingPlayer.name} ganhou ${results.lifeGained.attacker} vidas`);
        }

        // Remover criaturas mortas
        results.creaturesDied.forEach(creature => {
            const owner = this.player.battlefield.includes(creature) ? this.player : this.opponent;
            this.destroyPermanent(creature, owner);
            this.ui.log(`${creature.name} morreu em combate`);
        });

        this.ui.render();
    }

    async endTurn() {
        this.ui.log(`Fim do turno ${this.turnNumber}`);

        // Trocar jogador ativo
        if (this.activePlayer === this.player) {
            this.activePlayer = this.opponent;
            this.ui.log('--- Turno do Oponente ---');

            // Executar turno da IA
            await this.executeAITurn();

        } else {
            this.activePlayer = this.player;
            this.turnNumber++;
            this.phase = PHASES.UNTAP;
            this.ui.log(`--- Seu Turno ${this.turnNumber} ---`);
            await this.handlePhase();
        }

        this.ui.render();
    }

    async executeAITurn() {
        // Untap
        this.phase = PHASES.UNTAP;
        this.rules.untapAll(this.opponent);
        this.opponent.landsPlayedThisTurn = 0;
        this.rules.removeSummoningSickness(this.opponent);
        this.ui.render();
        await this.delay(300);

        // Draw
        this.phase = PHASES.DRAW;
        const drawn = this.rules.drawCard(this.opponent);
        if (drawn) {
            this.ui.log(`Oponente comprou uma carta`);
        }
        this.ui.render();
        await this.delay(300);

        // Main Phase 1
        this.phase = PHASES.MAIN1;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(300);

        await this.ai.playMainPhase();
        this.ui.render();

        // Combat
        this.phase = PHASES.DECLARE_ATTACKERS;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(300);

        // A IA decide atacar - se atacar, o jogo aguarda o jogador bloquear
        // O método doCombat vai chamar promptForBlockers se houver atacantes
        await this.ai.doCombat();

        // Se há atacantes, o fluxo será retomado em continueAfterBlocking()
        // Se não há atacantes, continuar normalmente
        if (this.currentAttackers.length === 0) {
            await this.finishAITurn();
        }
        // Se há atacantes, aguardar o jogador clicar em "Bloquear"
    }

    async continueAfterBlocking() {
        // Resolver combate
        this.phase = PHASES.COMBAT_DAMAGE;
        await this.resolveCombat();
        this.ui.render();

        await this.delay(300);

        // Limpar atacantes
        this.currentAttackers = [];
        this.blockerAssignments = {};

        // Continuar o turno da IA
        await this.finishAITurn();
    }

    async finishAITurn() {
        await this.delay(300);

        // Main Phase 2
        this.phase = PHASES.MAIN2;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(300);

        await this.ai.playMainPhase();
        this.ui.render();

        // End step - limpar e passar turno
        this.phase = PHASES.END;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);

        // Limpar dano e modificadores temporários
        this.opponent.battlefield.forEach(c => {
            c.damage = 0;
            c.powerModifier = 0;
            c.toughnessModifier = 0;
        });

        await this.delay(500);

        // Passar para o jogador
        this.activePlayer = this.player;
        this.turnNumber++;
        this.phase = PHASES.UNTAP;

        // Som de início de turno
        window.soundManager.playTurnStart();

        this.ui.log(`--- Seu Turno ${this.turnNumber} ---`);
        this.saveGame(); // Auto-save no início do turno do jogador
        await this.handlePhase();
    }

    pass() {
        this.nextPhase();
    }

    checkGameOver() {
        const result = this.rules.checkWinCondition();
        if (result) {
            // Limpar save ao fim do jogo
            this.clearSavedGame();

            // Som de vitória ou derrota
            if (result.winner === 'player') {
                window.soundManager.playVictory();
            } else {
                window.soundManager.playDefeat();
            }
            this.ui.showGameOver(result.winner, result.reason);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar
window.GameState = GameState;
