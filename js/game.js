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
        // Rastrear perda de vida para triggers (Bloodtithe Collector, Stromkirk Bloodthief, etc.)
        this.opponentLostLifeThisTurn = false;
        this.playerLostLifeThisTurn = false;
        // Criaturas que não podem ser bloqueadas neste turno (Frenzied Goblin, Goblin Smuggler)
        this.unblockableThisTurn = [];
        // Rastrear se atacou neste turno (para Raid - Storm Fleet Spy, Skyship Buccaneer)
        this.attackedThisTurn = { player: false, opponent: false };

        // === Stack e Prioridade ===
        this.stack = []; // Pilha de feitiços/habilidades
        this.priorityPlayer = null; // Quem tem prioridade atualmente
        this.waitingForPriority = false;
        this.bothPlayersPassed = false; // Ambos passaram prioridade
        this.stackResolving = false; // Stack está resolvendo
        this.waitingForPriorityResponse = false; // Aguardando resposta do jogador na janela de prioridade
        this.priorityWindowReason = null; // Razão da janela de prioridade atual

        // === Floating Mana (mana flutuante) ===
        this.floatingMana = { player: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, opponent: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 } };

        // === Mulligan ===
        this.mulliganCount = { player: 0, opponent: 0 };
        this.mulliganPhase = false;

        // === Fim de jogo ===
        this.gameOver = false;
        this.winner = null;
        this.gameOverReason = '';
        this.viewingBattlefield = false; // Modo de visualização após fim do jogo
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
            avatar: player.avatar,
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

            // Esconder modais de seleção
            this.ui.playerCustomization.classList.add('hidden');
            this.ui.deckSelection.classList.add('hidden');

            // Configurar ícones de mana para mostrar apenas as cores dos decks do jogador
            if (this.playerDeckKeys) {
                this.ui.setupManaIconsForDecks(this.playerDeckKeys);
            }

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
            avatar: data.avatar,
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

    // Escolhe um avatar temático para a IA baseado nos decks dela
    getAIAvatar(deckKeys) {
        // Mapeamento de decks para avatares temáticos
        const deckAvatars = {
            cats: 'ajani',      // Ajani é um Leonin (gato)
            goblins: 'chandra', // Chandra combina com vermelho/goblins
            vampires: 'liliana', // Liliana combina com preto/vampiros
            elves: 'nissa',     // Nissa combina com verde/elfos
            pirates: 'jace'     // Jace combina com azul/piratas
        };

        // Retorna o avatar do primeiro deck
        for (const deck of deckKeys) {
            if (deckAvatars[deck]) {
                return deckAvatars[deck];
            }
        }
        return 'opponent'; // Fallback
    }

    startGame(playerDecks, aiDecks, options = {}) {
        // Salvar escolha de decks
        this.playerDeckKeys = playerDecks;
        this.aiDeckKeys = aiDecks;

        // Opções de jogo
        const startingLife = options.startingLife || 20;
        const playerName = options.playerName || 'Você';
        const playerAvatar = options.playerAvatar || 'jace';

        // Quem começa (default: jogador primeiro)
        this.playerFirst = options.playerFirst !== undefined ? options.playerFirst : true;

        // Escolher avatar da IA baseado nos decks
        const aiAvatar = this.getAIAvatar(aiDecks);

        // Resetar estado de fim de jogo
        this.gameOver = false;
        this.winner = null;
        this.gameOverReason = '';
        this.viewingBattlefield = false;

        // Criar jogadores
        this.player = this.createPlayer(playerName, playerDecks, startingLife, playerAvatar);
        this.opponent = this.createPlayer('Oponente (IA)', aiDecks, startingLife, aiAvatar);

        // Embaralhar decks
        this.player.library = shuffleDeck(this.player.library);
        this.opponent.library = shuffleDeck(this.opponent.library);

        // Comprar mão inicial (7 cartas)
        for (let i = 0; i < 7; i++) {
            this.rules.drawCard(this.player);
            this.rules.drawCard(this.opponent);
        }

        // Resetar mulligan
        this.mulliganCount = { player: 0, opponent: 0 };
        this.mulliganPhase = true;

        this.ui.log(`Jogo iniciado! Seus decks: ${playerDecks.join(' + ')}`);
        this.ui.log(`Decks do oponente: ${aiDecks.join(' + ')}`);

        // Configurar ícones de mana para mostrar apenas as cores dos decks do jogador
        this.ui.setupManaIconsForDecks(playerDecks);

        // Inicializar modo debug
        if (window.debug) {
            window.debug.init(this);
        }

        // Mostrar opção de mulligan
        this.ui.showMulliganPrompt();
    }

    // Executar mulligan
    doMulligan(keepHand) {
        if (keepHand) {
            // Jogador decidiu manter a mão
            const cardsToBottom = this.mulliganCount.player;
            if (cardsToBottom > 0) {
                // London Mulligan: jogador escolhe quais cartas vão para o fundo
                this.ui.showMulliganBottomPrompt(cardsToBottom);
            } else {
                this.finishMulligan();
            }
        } else {
            // Jogador quer mulligan
            this.mulliganCount.player++;
            const newHandSize = 7 - this.mulliganCount.player;

            if (newHandSize <= 0) {
                this.ui.log('Não pode mais fazer mulligan!');
                this.finishMulligan();
                return;
            }

            // Devolver mão para o grimório e embaralhar
            this.player.library = [...this.player.library, ...this.player.hand];
            this.player.hand = [];
            this.player.library = shuffleDeck(this.player.library);

            // Comprar nova mão
            for (let i = 0; i < 7; i++) {
                this.rules.drawCard(this.player);
            }

            this.ui.log(`Mulligan ${this.mulliganCount.player}! Comprou 7 cartas, manterá ${newHandSize}.`);
            this.ui.showMulliganPrompt();
        }
    }

    // Colocar cartas selecionadas no fundo do grimório (London Mulligan)
    putCardsOnBottom(cardInstances) {
        const cardsToBottom = this.mulliganCount.player;
        this.ui.log(`Você colocou ${cardsToBottom} carta(s) no fundo do grimório.`);

        // Mover cartas selecionadas para o fundo do grimório na ordem selecionada
        cardInstances.forEach(instanceId => {
            const cardIndex = this.player.hand.findIndex(c => c.instanceId === instanceId);
            if (cardIndex !== -1) {
                const card = this.player.hand.splice(cardIndex, 1)[0];
                this.player.library.push(card);
            }
        });

        this.finishMulligan();
    }

    finishMulligan() {
        this.mulliganPhase = false;

        // IA decide mulligan (simplificado: sempre mantém)
        this.ui.log('Oponente manteve a mão inicial.');

        // Iniciar jogo
        this.turnNumber = 1;

        // Determinar quem começa baseado na opção selecionada
        if (this.playerFirst) {
            this.activePlayer = this.player;
            this.priorityPlayer = this.player;
            this.ui.logTurnStart(1, 'Você');
        } else {
            this.activePlayer = this.opponent;
            this.priorityPlayer = this.opponent;
            this.ui.logTurnStart(1, 'Oponente (IA)');
            this.ui.log('A IA começa primeiro!');
        }

        this.phase = PHASES.MAIN1; // Pular untap/upkeep/draw no primeiro turno

        this.ui.render();
        this.saveGame();

        // Se IA começa, executar turno da IA
        if (!this.playerFirst) {
            setTimeout(() => this.executeAITurn(), 800);
        }
    }

    createPlayer(name, deckKeys, startingLife = 20, avatar = null) {
        const deck = createCombinedDeck(deckKeys[0], deckKeys[1]);

        return {
            name: name,
            life: startingLife,
            library: deck,
            hand: [],
            battlefield: [],
            graveyard: [],
            landsPlayedThisTurn: 0,
            avatar: avatar
        };
    }

    isPlayerTurn() {
        return this.activePlayer === this.player;
    }

    // === SISTEMA DE STACK ===

    // Adiciona um feitiço ou habilidade à pilha
    addToStack(item, controller) {
        const stackItem = {
            id: `stack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            item: item,
            controller: controller,
            timestamp: Date.now()
        };
        this.stack.push(stackItem);
        this.ui.log(`${item.name || 'Habilidade'} adicionado à pilha`);
        this.ui.renderStack();
        return stackItem;
    }

    // Remove o item do topo da pilha e o resolve
    async resolveTopOfStack() {
        if (this.stack.length === 0) return null;

        this.stackResolving = true;
        const stackItem = this.stack.pop();
        this.ui.log(`Resolvendo: ${stackItem.item.name || 'Habilidade'}`);
        this.ui.renderStack();

        // Delay para visualização
        await this.delay(800);

        // Resolver o item (feitiço ou habilidade)
        if (stackItem.item.type === 'instant' || stackItem.item.type === 'sorcery') {
            // Resolver feitiço
            await this.resolveStackedSpell(stackItem);
        } else if (stackItem.item.isAbility) {
            // Resolver habilidade ativada
            await this.resolveStackedAbility(stackItem);
        }

        this.stackResolving = false;
        return stackItem;
    }

    // Resolve um feitiço da pilha
    async resolveStackedSpell(stackItem) {
        const card = stackItem.item;
        const caster = stackItem.controller;

        // Se tem alvo, verificar se ainda é válido
        if (stackItem.target) {
            const targetStillValid = this.isTargetStillValid(stackItem.target);
            if (!targetStillValid) {
                this.ui.log(`${card.name} foi anulado (alvo inválido)`);
                caster.graveyard.push(card);
                return;
            }
            this.resolveSpellWithTarget(card, caster, stackItem.target);
        } else {
            this.resolveSpell(card, caster);
        }

        caster.graveyard.push(card);
        this.ui.render();
    }

    // Resolve uma habilidade da pilha
    async resolveStackedAbility(stackItem) {
        const ability = stackItem.item;
        const controller = stackItem.controller;

        // Executar efeito da habilidade
        if (ability.effect) {
            await ability.effect(controller, stackItem.target);
        }

        this.ui.render();
    }

    // Verifica se um alvo ainda é válido
    isTargetStillValid(target) {
        if (!target) return true;

        // Verificar se o alvo ainda está no campo de batalha
        const inPlayerField = this.player.battlefield.includes(target);
        const inOpponentField = this.opponent.battlefield.includes(target);

        return inPlayerField || inOpponentField;
    }

    // Verifica se a pilha está vazia
    isStackEmpty() {
        return this.stack.length === 0;
    }

    // Retorna o item no topo da pilha sem removê-lo
    peekStack() {
        if (this.stack.length === 0) return null;
        return this.stack[this.stack.length - 1];
    }

    // === SISTEMA DE PRIORIDADE ===

    // Passa a prioridade para o outro jogador
    passPriority() {
        if (this.priorityPlayer === this.player) {
            this.priorityPlayer = this.opponent;
            this.ui.log('Você passou a prioridade');

            // Se a pilha não está vazia e a IA tem prioridade, ela decide
            if (!this.isStackEmpty()) {
                this.aiHandlePriority();
            } else {
                // Se pilha vazia e ambos passaram, avançar fase
                this.bothPlayersPassed = true;
            }
        } else {
            this.priorityPlayer = this.player;
            this.ui.log('Oponente passou a prioridade');

            if (this.bothPlayersPassed && this.isStackEmpty()) {
                // Ambos passaram com pilha vazia - avançar fase
                this.bothPlayersPassed = false;
            }
        }

        this.ui.render();
    }

    // IA decide o que fazer quando tem prioridade
    async aiHandlePriority() {
        await this.delay(500);

        // Por enquanto, a IA sempre passa a prioridade
        // Futuramente pode ser expandido para responder com instants
        this.ui.log('IA avaliando resposta...');
        await this.delay(800);

        // Passar prioridade de volta
        this.bothPlayersPassed = true;
        this.priorityPlayer = this.player;
        this.ui.log('Oponente passou a prioridade');

        // Se ambos passaram, resolver o topo da pilha
        if (this.bothPlayersPassed && !this.isStackEmpty()) {
            await this.resolveTopOfStack();
            this.bothPlayersPassed = false;

            // Dar prioridade ao jogador ativo após resolver
            this.priorityPlayer = this.activePlayer;
        }

        this.ui.render();
    }

    // Verifica se o jogador pode responder (tem prioridade e há algo na pilha)
    canRespond(player) {
        return this.priorityPlayer === player && !this.isStackEmpty() && !this.stackResolving;
    }

    // === SISTEMA DE JANELA DE PRIORIDADE ===

    /**
     * Verifica se o jogador tem instants jogáveis na mão com mana suficiente
     * @returns {Array} Lista de instants jogáveis
     */
    getPlayableInstants() {
        const instants = this.player.hand.filter(card => card.type === 'instant');
        return instants.filter(card => this.rules.canCastInstant(card, this.player));
    }

    /**
     * Verifica se o jogador tem alguma resposta disponível (instant ou habilidade ativada)
     * @returns {boolean}
     */
    playerHasResponses() {
        // Verificar instants jogáveis
        const playableInstants = this.getPlayableInstants();
        if (playableInstants.length > 0) return true;

        // Verificar habilidades ativadas disponíveis
        const hasAbilities = this.player.battlefield.some(card =>
            this.canActivateAbility && this.canActivateAbility(card, this.player)
        );
        if (hasAbilities) return true;

        return false;
    }

    /**
     * Oferece uma janela de prioridade ao jogador para responder
     * Auto-pass inteligente: só mostra se o jogador tiver instants jogáveis
     * @param {string} reason - Razão da janela (ex: "IA lançou Lightning Bolt")
     * @param {Object} options - Opções adicionais
     * @returns {Promise<string>} - 'pass' ou 'respond'
     */
    async offerPriorityWindow(reason, options = {}) {
        // Auto-pass se o jogador não tiver respostas disponíveis
        if (!this.playerHasResponses()) {
            return 'pass';
        }

        // Mostrar janela de prioridade
        this.waitingForPriorityResponse = true;
        this.priorityWindowReason = reason;
        this.priorityPlayer = this.player;

        // Mostrar UI de resposta
        const response = await this.ui.showPriorityWindow(reason, this.getPlayableInstants());

        this.waitingForPriorityResponse = false;
        this.priorityWindowReason = null;

        return response;
    }

    /**
     * Jogador escolheu responder na janela de prioridade
     * Aguarda o jogador jogar um instant ou ativar uma habilidade
     * @returns {Promise<void>}
     */
    async handlePlayerPriorityResponse() {
        // Dar prioridade ao jogador e aguardar ação
        this.priorityPlayer = this.player;
        this.waitingForPriorityResponse = true;
        this.ui.log('Sua vez de responder... (clique em um instant para jogar ou use o botão Passar)');
        this.ui.highlightPlayableInstants(true);
        this.ui.render();

        // Aguardar até o jogador jogar algo ou passar
        return new Promise((resolve) => {
            this.priorityResponseCallback = resolve;
        });
    }

    /**
     * Chamado quando o jogador completa sua resposta (jogou instant ou passou)
     */
    completePriorityResponse() {
        this.waitingForPriorityResponse = false;
        this.ui.highlightPlayableInstants(false);

        if (this.priorityResponseCallback) {
            this.priorityResponseCallback();
            this.priorityResponseCallback = null;
        }
    }

    /**
     * Verifica se estamos aguardando resposta de prioridade do jogador
     * @returns {boolean}
     */
    isWaitingForPriorityResponse() {
        return this.waitingForPriorityResponse === true;
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

        // Se jogador jogou um instant durante janela de prioridade, completar a resposta
        const wasWaitingForResponse = this.isWaitingForPriorityResponse() && player === this.player && card.type === 'instant';

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
            // Verificar se é um counterspell (caso especial - mira na stack)
            if (this.isCounterspell(card)) {
                // Counterspell precisa de uma mágica na stack
                const spellsOnStack = this.stack.filter(s =>
                    s.item.type === 'instant' || s.item.type === 'sorcery'
                );

                if (spellsOnStack.length === 0) {
                    this.ui.log(`Não há mágicas na pilha para anular`);
                    player.hand.push(card);
                    return false;
                }

                // Pagar mana
                this.rules.payMana(card, player);
                window.soundManager.playMagic();

                if (player === this.player) {
                    // Jogador escolhe qual mágica anular
                    this.ui.promptForStackTarget(card, spellsOnStack, (stackTarget) => {
                        this.resolveCounterspell(card, player, stackTarget);
                    });
                } else {
                    // IA anula a mágica mais impactante
                    const target = spellsOnStack[spellsOnStack.length - 1]; // Anula a mais recente
                    this.resolveCounterspell(card, player, target);
                }

                this.triggerBrinebornCutthroat(player);
                return true;
            }

            // Verificar se precisa de alvo
            const needsTarget = this.spellNeedsTarget(card);

            if (needsTarget && player === this.player) {
                // Jogador precisa selecionar alvo
                const validTargets = this.getValidSpellTargets(card, player);

                if (validTargets.length === 0) {
                    this.ui.log(`Não há alvos válidos para ${card.name}`);
                    player.hand.push(card);
                    return false;
                }

                // Pagar mana antes de selecionar
                this.rules.payMana(card, player);
                window.soundManager.playMagic();

                this.ui.promptForTarget(card, validTargets, (target) => {
                    this.resolveSpellWithTarget(card, player, target);
                    player.graveyard.push(card);
                    this.ui.render();
                    this.saveGame();
                });
                return true;
            } else {
                // Sem alvo ou é IA
                this.rules.payMana(card, player);
                window.soundManager.playMagic();

                if (needsTarget && player === this.opponent) {
                    // IA escolhe alvo
                    const validTargets = this.getValidSpellTargets(card, player);
                    if (validTargets.length > 0) {
                        const target = this.ai.chooseBestSpellTarget(card, validTargets);
                        this.resolveSpellWithTarget(card, player, target);
                    }
                } else {
                    this.resolveSpell(card, player);
                }

                player.graveyard.push(card);
                this.ui.log(`${player.name} conjurou ${card.name}`);

                // Brineborn Cutthroat - trigger quando lança mágica no turno do oponente
                this.triggerBrinebornCutthroat(player);
            }
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

        // Se jogador jogou instant durante janela de prioridade, completar a resposta
        if (wasWaitingForResponse) {
            // Pequeno delay para ver o efeito do instant
            await this.delay(500);
            this.completePriorityResponse();
        }

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

    // Verifica se feitiço precisa de alvo
    spellNeedsTarget(card) {
        const targetedSpells = [
            'moment_of_triumph', 'moment_of_craving', 'heros_downfall',
            'elspeths_smite', 'angelic_edict', 'kindled_fury',
            'volley', 'incinerating_blast', 'broken_wings', 'felling_blow',
            'snakeskin_veil', 'offer_immortality'
        ];

        // Counterspells têm alvo especial (na stack)
        if (card.keywords && card.keywords.includes('counterspell')) {
            return true;
        }

        return targetedSpells.includes(card.id);
    }

    // Verifica se feitiço é um counterspell (mira na stack)
    isCounterspell(card) {
        return card.keywords && card.keywords.includes('counterspell');
    }

    // Retorna alvos válidos para um feitiço
    getValidSpellTargets(card, caster) {
        const opponent = caster === this.player ? this.opponent : this.player;
        let targets = [];

        switch (card.id) {
            // === BUFFS (suas criaturas) ===
            case 'moment_of_triumph':
            case 'kindled_fury':
            case 'snakeskin_veil':
            case 'offer_immortality':
                targets = caster.battlefield.filter(c => c.type === 'creature');
                break;

            // === REMOÇÃO (criaturas do oponente) ===
            case 'moment_of_craving':
            case 'heros_downfall':
            case 'incinerating_blast':
                targets = opponent.battlefield.filter(c => c.type === 'creature');
                break;

            // === REMOÇÃO COM RESTRIÇÃO ===
            case 'elspeths_smite':
                // Só atacantes ou bloqueadores (simplificado: qualquer criatura em combate)
                targets = [...this.currentAttackers];
                const blockersFlat = Object.values(this.blockerAssignments).flat();
                targets.push(...blockersFlat);
                break;

            case 'volley':
                // Só criaturas com flying
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && c.keywords && c.keywords.includes('flying')
                );
                break;

            case 'felling_blow':
                // Só criaturas com flying
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && c.keywords && c.keywords.includes('flying')
                );
                break;

            case 'angelic_edict':
                // Criatura ou encantamento
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' || c.type === 'enchantment'
                );
                break;

            case 'broken_wings':
                // Artefato, encantamento ou criatura com flying
                targets = opponent.battlefield.filter(c =>
                    c.type === 'artifact' ||
                    c.type === 'enchantment' ||
                    (c.type === 'creature' && c.keywords && c.keywords.includes('flying'))
                );
                break;

            default:
                targets = [];
        }

        return targets;
    }

    // Resolver feitiço com alvo selecionado
    resolveSpellWithTarget(card, caster, target) {
        const opponent = caster === this.player ? this.opponent : this.player;
        const targetOwner = this.player.battlefield.includes(target) ? this.player : this.opponent;

        switch (card.id) {
            // === BUFFS ===
            case 'moment_of_triumph':
                target.powerModifier = (target.powerModifier || 0) + 2;
                target.toughnessModifier = (target.toughnessModifier || 0) + 2;
                caster.life += 2;
                this.ui.log(`${target.name} ganhou +2/+2. ${caster.name} ganhou 2 vidas`);
                break;

            case 'kindled_fury':
                target.powerModifier = (target.powerModifier || 0) + 1;
                if (!target.temporaryKeywords) target.temporaryKeywords = [];
                target.temporaryKeywords.push('first_strike');
                this.ui.log(`${target.name} ganhou +1/+0 e iniciativa`);
                break;

            case 'snakeskin_veil':
                if (!target.counters) target.counters = {};
                target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${target.name} ganhou um contador +1/+1 e resistência a magia`);
                break;

            case 'offer_immortality':
                // Simplificado: só o +1/+1 se vampiro
                if (target.subtype && target.subtype.includes('Vampire')) {
                    if (!target.counters) target.counters = {};
                    target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                    this.ui.log(`${target.name} ganhou indestrutível e +1/+1`);
                } else {
                    this.ui.log(`${target.name} ganhou indestrutível`);
                }
                break;

            // === DANO ===
            case 'moment_of_craving':
                target.powerModifier = (target.powerModifier || 0) - 2;
                target.toughnessModifier = (target.toughnessModifier || 0) - 2;
                caster.life += 2;
                this.ui.log(`${target.name} recebeu -2/-2. ${caster.name} ganhou 2 vidas`);
                this.checkCreatureDeath(target, targetOwner);
                break;

            case 'volley':
                target.damage = (target.damage || 0) + 3;
                this.ui.log(`Volley causou 3 de dano a ${target.name}`);
                this.checkCreatureDeath(target, targetOwner);
                break;

            case 'incinerating_blast':
                target.damage = (target.damage || 0) + 5;
                this.ui.log(`Incinerating Blast causou 5 de dano a ${target.name}`);
                this.checkCreatureDeath(target, targetOwner);
                break;

            // === REMOÇÃO ===
            case 'heros_downfall':
                this.destroyPermanent(target, targetOwner);
                this.ui.log(`${target.name} foi destruído`);
                break;

            case 'elspeths_smite':
                this.exilePermanent(target, targetOwner);
                this.ui.log(`${target.name} foi exilado`);
                break;

            case 'angelic_edict':
                this.exilePermanent(target, targetOwner);
                this.ui.log(`${target.name} foi exilado`);
                break;

            case 'felling_blow':
                this.destroyPermanent(target, targetOwner);
                this.ui.log(`${target.name} foi destruído`);
                break;

            case 'broken_wings':
                this.destroyPermanent(target, targetOwner);
                this.ui.log(`${target.name} foi destruído`);
                break;

            default:
                this.ui.log(`${card.name} resolvido em ${target.name}`);
        }
    }

    // Exilar permanente (não vai pro cemitério)
    exilePermanent(permanent, owner) {
        const index = owner.battlefield.indexOf(permanent);
        if (index > -1) {
            owner.battlefield.splice(index, 1);
            // Exílio - não adiciona ao cemitério
            // Poderia ter uma zona de exílio se quiséssemos
        }
    }

    // Resolve um counterspell - anula uma mágica na pilha
    resolveCounterspell(counterCard, caster, stackTarget) {
        // Remover a mágica alvo da stack
        const stackIndex = this.stack.indexOf(stackTarget);
        if (stackIndex > -1) {
            this.stack.splice(stackIndex, 1);
            // A mágica anulada vai para o cemitério do seu controlador
            stackTarget.controller.graveyard.push(stackTarget.item);
            this.ui.log(`${counterCard.name} anulou ${stackTarget.item.name}!`);
        }

        // O counterspell vai para o cemitério do caster
        caster.graveyard.push(counterCard);
        this.ui.renderStack();
        this.ui.render();
        this.saveGame();
    }

    // Resolver feitiços sem alvo
    resolveSpell(card, caster) {
        switch (card.id) {
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

            case 'joraga_invocation':
                // +3/+3 para todas criaturas
                caster.battlefield.forEach(c => {
                    if (c.type === 'creature') {
                        c.powerModifier = (c.powerModifier || 0) + 3;
                        c.toughnessModifier = (c.toughnessModifier || 0) + 3;
                    }
                });
                this.ui.log(`Todas as criaturas ganharam +3/+3!`);
                break;

            case 'opt':
                // Scry 1, então compra
                // Simplificado: olhar o topo e escolher manter ou mandar para baixo
                if (caster.library.length > 0) {
                    const topCard = caster.library[0];
                    if (caster === this.player) {
                        // Jogador pode ver e escolher
                        this.ui.promptScry(topCard, (keepOnTop) => {
                            if (!keepOnTop) {
                                // Mover para o fundo
                                caster.library.shift();
                                caster.library.push(topCard);
                                this.ui.log(`Você colocou ${topCard.name} no fundo do grimório`);
                            } else {
                                this.ui.log(`Você manteve ${topCard.name} no topo do grimório`);
                            }
                            // Depois do scry, compra
                            this.rules.drawCard(caster);
                            this.ui.render();
                        });
                        return; // Aguarda o scry terminar
                    } else {
                        // IA decide aleatoriamente (simplificado)
                        const keepOnTop = Math.random() > 0.5;
                        if (!keepOnTop) {
                            caster.library.shift();
                            caster.library.push(topCard);
                        }
                        this.rules.drawCard(caster);
                        this.ui.log(`${caster.name} olhou o topo e comprou uma carta`);
                    }
                }
                break;

            default:
                // Feitiço genérico
                break;
        }
    }

    // Resolver triggers de entrada
    resolveETB(card, controller) {
        const opponent = controller === this.player ? this.opponent : this.player;

        // ETB Draw (Helpful Hunter)
        if (card.keywords && card.keywords.includes('etb_draw')) {
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
            opponent.life -= 2;
            controller.life += 2;
            // Marcar que oponente perdeu vida neste turno
            this.opponentLostLifeThisTurn = true;
            this.ui.log(`${opponent.name} perdeu 2 vidas, ${controller.name} ganhou 2 vidas`);
        }

        // Dropkick Bomber - 2 dano a criatura ou planeswalker
        if (card.id === 'dropkick_bomber') {
            const target = opponent.battlefield.find(c => c.type === 'creature');
            if (target) {
                target.damage = (target.damage || 0) + 2;
                this.checkCreatureDeath(target, opponent);
                this.ui.log(`Dropkick Bomber causou 2 de dano a ${target.name}`);
            }
        }

        // Dwynen's Elite - cria token 1/1 Elf se controla outro Elfo
        if (card.id === 'dwynenss_elite') {
            const hasOtherElf = controller.battlefield.some(c =>
                c.type === 'creature' &&
                c.subtype && c.subtype.includes('Elf') &&
                c.instanceId !== card.instanceId
            );
            if (hasOtherElf) {
                controller.battlefield.push({
                    instanceId: `elf_token_${Date.now()}`,
                    name: 'Elf Warrior Token',
                    type: 'creature',
                    subtype: 'Elf Warrior',
                    power: 1,
                    toughness: 1,
                    summoningSickness: true
                });
                this.ui.log(`Dwynen's Elite criou um token Elf Warrior 1/1`);
            }
        }

        // Elvish Regrower - devolve terreno do cemitério para mão
        if (card.id === 'elvish_regrower') {
            const landInGraveyard = controller.graveyard.find(c => c.type === 'land');
            if (landInGraveyard) {
                const index = controller.graveyard.indexOf(landInGraveyard);
                controller.graveyard.splice(index, 1);
                controller.hand.push(landInGraveyard);
                this.ui.log(`${landInGraveyard.name} voltou do cemitério para a mão`);
            }
        }

        // Bloodtithe Collector - oponente descarta se perdeu vida neste turno
        if (card.id === 'bloodtithe_collector') {
            if (this.opponentLostLifeThisTurn) {
                // Oponente descarta uma carta aleatória
                if (opponent.hand.length > 0) {
                    const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                    const discarded = opponent.hand.splice(randomIndex, 1)[0];
                    opponent.graveyard.push(discarded);
                    this.ui.log(`${opponent.name} descartou ${discarded.name}`);
                }
            }
        }

        // === PIRATES TRIGGERS ===

        // Corsair Captain - cria Treasure token ao entrar
        if (card.keywords && card.keywords.includes('etb_treasure')) {
            controller.battlefield.push({
                instanceId: `treasure_token_${Date.now()}`,
                name: 'Treasure Token',
                type: 'artifact',
                subtype: 'Treasure',
                text: 'T, Sacrifique este artefato: Adicione uma mana de qualquer cor.',
                keywords: ['sacrifice_for_mana']
            });
            this.ui.log(`${card.name} criou um token de Tesouro`);
        }

        // Bigfin Bouncer - devolve criatura do oponente para a mão
        if (card.keywords && card.keywords.includes('etb_bounce')) {
            const validTargets = opponent.battlefield.filter(c => c.type === 'creature');
            if (validTargets.length > 0) {
                const bounceCreature = (targetCreature) => {
                    const index = opponent.battlefield.indexOf(targetCreature);
                    if (index !== -1) {
                        opponent.battlefield.splice(index, 1);
                        opponent.hand.push(targetCreature);
                        // Limpar estados da criatura
                        targetCreature.tapped = false;
                        targetCreature.damage = 0;
                        targetCreature.powerModifier = 0;
                        targetCreature.toughnessModifier = 0;
                        targetCreature.counters = null;
                        this.ui.log(`${card.name} devolveu ${targetCreature.name} para a mão de ${opponent.name}`);
                        this.ui.render();
                    }
                };

                if (controller === this.player) {
                    // Jogador escolhe o alvo
                    this.ui.promptTriggerTarget({
                        title: `${card.name} - Selecione um Alvo`,
                        description: 'Devolva uma criatura que um oponente controla para a mão de seu dono:',
                        validTargets: validTargets,
                        canSkip: false
                    }).then(selected => {
                        if (selected) {
                            bounceCreature(selected);
                        }
                    });
                } else {
                    // IA escolhe automaticamente (prioriza criaturas maiores)
                    const target = validTargets.sort((a, b) => {
                        const powerA = (a.power || 0) + (a.powerModifier || 0);
                        const powerB = (b.power || 0) + (b.powerModifier || 0);
                        return powerB - powerA;
                    })[0];
                    bounceCreature(target);
                }
            }
        }

        // Raid - compra carta se atacou neste turno (Storm Fleet Spy, Skyship Buccaneer)
        if (card.keywords && card.keywords.includes('raid_draw')) {
            if (this.attackedThisTurn && this.attackedThisTurn[controller === this.player ? 'player' : 'opponent']) {
                this.rules.drawCard(controller);
                this.ui.log(`Raid: ${controller.name} comprou uma carta`);
            }
        }

        // Pirate's Cutlass - anexa automaticamente a um Pirata
        if (card.keywords && card.keywords.includes('etb_equip_pirate')) {
            const pirateTarget = controller.battlefield.find(c =>
                c.type === 'creature' && c.subtype && c.subtype.includes('Pirate')
            );
            if (pirateTarget) {
                card.attachedTo = pirateTarget.instanceId;
                this.ui.log(`Pirate's Cutlass foi equipado em ${pirateTarget.name}`);
            }
        }

        // Trigger para criaturas que reagem a outras entrando
        // Beast-Kin Ranger - +1/+0 até o fim do turno quando OUTRA criatura entra
        if (card.type === 'creature') {
            this.triggerOtherCreatureEnters(card, controller);
        }
    }

    // Trigger quando outra criatura entra no campo
    triggerOtherCreatureEnters(enteringCreature, controller) {
        controller.battlefield.forEach(card => {
            // Beast-Kin Ranger - ganha +1/+0 quando outra criatura entra
            if (card.id === 'beast_kin_ranger' && card.instanceId !== enteringCreature.instanceId) {
                card.powerModifier = (card.powerModifier || 0) + 1;
                this.ui.log(`Beast-Kin Ranger ganha +1/+0 (${enteringCreature.name} entrou em campo)`);
            }
        });
    }

    // Brineborn Cutthroat - ganha +1/+1 counter quando lança mágica no turno do oponente
    triggerBrinebornCutthroat(caster) {
        // Verifica se é o turno do oponente do caster
        const isOpponentsTurn = (caster === this.player && this.currentPlayer === this.opponent) ||
                                (caster === this.opponent && this.currentPlayer === this.player);

        if (!isOpponentsTurn) return;

        // Procura Brineborn Cutthroat no campo do caster
        caster.battlefield.forEach(card => {
            if (card.id === 'brineborn_cutthroat') {
                // Adiciona contador +1/+1
                if (!card.counters) card.counters = {};
                if (!card.counters.plusOnePlusOne) card.counters.plusOnePlusOne = 0;
                card.counters.plusOnePlusOne++;
                this.ui.log(`Brineborn Cutthroat ganha um contador +1/+1 (mágica conjurada no turno do oponente)`);
                this.ui.render();
            }
        });
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

    // Trigger Vengeful Bloodwitch - ganha vida quando oponente perde vida
    triggerVengefulBloodwitch(controller, lifeAmount) {
        controller.battlefield.forEach(card => {
            if (card.id === 'vengeful_bloodwitch') {
                controller.life += lifeAmount;
                this.ui.log(`Vengeful Bloodwitch: ${controller.name} ganhou ${lifeAmount} vida(s)`);
            }
        });
    }

    // Trigger Stromkirk Bloodthief - no fim do turno, +1/+1 em vampiro se oponente perdeu vida
    async triggerStromkirkBloodthief(controller) {
        const opponentLostLife = controller === this.player ? this.opponentLostLifeThisTurn : this.playerLostLifeThisTurn;
        if (!opponentLostLife) return;

        for (const card of controller.battlefield) {
            if (card.id === 'stromkirk_bloodthief') {
                // Encontrar vampiros para colocar o contador (pode ser ele mesmo)
                const vampires = controller.battlefield.filter(c =>
                    c.type === 'creature' && c.subtype && c.subtype.includes('Vampire')
                );

                if (vampires.length > 0) {
                    let target;

                    // Se é o jogador humano, deixar escolher o alvo
                    if (controller === this.player) {
                        target = await this.ui.promptTriggerTarget({
                            title: 'Stromkirk Bloodthief',
                            description: 'Escolha um Vampiro para receber um contador +1/+1:',
                            validTargets: vampires,
                            canSkip: false
                        });
                    } else {
                        // IA escolhe o vampiro mais forte
                        target = vampires.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (target) {
                        if (!target.counters) target.counters = {};
                        target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                        this.ui.log(`Stromkirk Bloodthief: +1/+1 counter em ${target.name}`);
                        this.ui.render();
                    }
                }
            }
        }
    }

    // Trigger Battle-Rattle Shaman - no início do combate, criatura ganha +2/+0
    async triggerBattleRattleShaman(controller) {
        for (const card of controller.battlefield) {
            if (card.id === 'battle_rattle_shaman') {
                // Encontrar criaturas para dar +2/+0 (pode ser ela mesma)
                const creatures = controller.battlefield.filter(c => c.type === 'creature');

                if (creatures.length > 0) {
                    let target;

                    // Se é o jogador humano, deixar escolher o alvo
                    if (controller === this.player) {
                        target = await this.ui.promptTriggerTarget({
                            title: 'Battle-Rattle Shaman',
                            description: 'Escolha uma criatura para receber +2/+0 até o fim do turno:',
                            validTargets: creatures,
                            canSkip: false
                        });
                    } else {
                        // IA prefere outra criatura, mas pode ser ela mesma
                        const others = creatures.filter(c => c.instanceId !== card.instanceId);
                        if (others.length > 0) {
                            target = others.sort((a, b) =>
                                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                            )[0];
                        } else {
                            target = card; // Ela mesma
                        }
                    }

                    if (target) {
                        target.powerModifier = (target.powerModifier || 0) + 2;
                        this.ui.log(`Battle-Rattle Shaman: ${target.name} ganhou +2/+0`);
                        this.ui.render();
                    }
                }
            }
        }
    }

    // Trigger Leonin Vanguard - ganha 1 vida ao atacar com outra criatura
    triggerLeoninVanguard(attackers, attackingPlayer) {
        attackingPlayer.battlefield.forEach(card => {
            if (card.id === 'leonin_vanguard') {
                // Verificar se há outra criatura atacando
                const otherAttacker = attackers.some(a => a.instanceId !== card.instanceId);
                if (otherAttacker) {
                    attackingPlayer.life += 1;
                    this.ui.log(`Leonin Vanguard: ${attackingPlayer.name} ganhou 1 vida`);
                }
            }
        });
    }

    // Trigger Frenzied Goblin - ao atacar, pagar R para impedir uma criatura de bloquear
    async triggerFrenziedGoblin(attackers, attackingPlayer) {
        const opponent = attackingPlayer === this.player ? this.opponent : this.player;

        // Verificar se Frenzied Goblin está atacando
        const frenziedGoblin = attackers.find(a => a.id === 'frenzied_goblin');
        if (!frenziedGoblin) return;

        // Verificar se tem mana vermelho disponível
        const availableMana = this.rules.calculateAvailableMana(attackingPlayer);
        if (availableMana.R < 1 && availableMana.any < 1) return;

        // Verificar se oponente tem criaturas que podem bloquear
        const potentialBlockers = opponent.battlefield.filter(c =>
            c.type === 'creature' && !c.tapped
        );
        if (potentialBlockers.length === 0) return;

        // Se é o jogador humano, perguntar se quer pagar
        if (attackingPlayer === this.player) {
            const shouldPay = await this.ui.promptFrenziedGoblin(potentialBlockers);
            if (shouldPay && shouldPay.target) {
                // Pagar o custo R
                this.payColoredMana({ R: 1 }, attackingPlayer);
                this.unblockableThisTurn.push(shouldPay.target.instanceId);
                this.ui.log(`Frenzied Goblin: ${shouldPay.target.name} não pode bloquear neste turno`);
            }
        } else {
            // IA decide automaticamente - escolhe a criatura mais forte
            const target = potentialBlockers.sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            )[0];
            if (target) {
                this.payColoredMana({ R: 1 }, attackingPlayer);
                this.unblockableThisTurn.push(target.instanceId);
                this.ui.log(`Frenzied Goblin: ${target.name} não pode bloquear neste turno`);
            }
        }
    }

    // === HABILIDADES ATIVADAS ===

    // Verifica se uma carta tem habilidade ativada e pode usá-la
    canActivateAbility(card, player) {
        if (card.tapped) return false;
        if (card.summoningSickness && card.type === 'creature') return false;

        switch (card.id) {
            case 'vampire_neonate':
                // 2, T: drena 1 vida
                return this.rules.calculateAvailableMana(player).B >= 2 ||
                       Object.values(this.rules.calculateAvailableMana(player)).reduce((a,b) => a+b, 0) >= 2;

            case 'goblin_smuggler':
                // T: criatura com poder ≤2 não pode ser bloqueada
                return player.battlefield.some(c =>
                    c.type === 'creature' &&
                    this.rules.getCreaturePower(c) <= 2 &&
                    c.instanceId !== card.instanceId
                );

            case 'elvish_archdruid':
                // T: adiciona G para cada Elfo
                return true;

            case 'wildheart_invoker':
                // 8: criatura ganha +5/+5 e trample
                return Object.values(this.rules.calculateAvailableMana(player)).reduce((a,b) => a+b, 0) >= 8;

            case 'jazal_goldmane':
                // 3WW: atacantes ganham +X/+X (só durante combate)
                if (this.phase !== PHASES.DECLARE_ATTACKERS && this.phase !== PHASES.DECLARE_BLOCKERS) return false;
                const mana = this.rules.calculateAvailableMana(player);
                return mana.W >= 2 && (mana.W + Object.values(mana).reduce((a,b) => a+b, 0) - mana.W) >= 3;

            case 'veteran_goblin_firebomb':
                // 1, T, Sacrifice: 2 dano a qualquer alvo
                return Object.values(this.rules.calculateAvailableMana(player)).reduce((a,b) => a+b, 0) >= 1;

            default:
                return false;
        }
    }

    // Ativa habilidade de uma carta
    async activateAbility(card, player) {
        if (!this.canActivateAbility(card, player)) {
            this.ui.log(`Não pode ativar habilidade de ${card.name}`);
            return false;
        }

        const opponent = player === this.player ? this.opponent : this.player;

        switch (card.id) {
            case 'vampire_neonate':
                // 2, T: cada oponente perde 1 vida e você ganha 1 vida
                this.payGenericMana(2, player);
                card.tapped = true;
                opponent.life -= 1;
                player.life += 1;
                // Marcar perda de vida
                if (opponent === this.player) {
                    this.playerLostLifeThisTurn = true;
                } else {
                    this.opponentLostLifeThisTurn = true;
                }
                this.triggerVengefulBloodwitch(player, 1);
                this.ui.log(`Vampire Neonate: ${opponent.name} perdeu 1 vida, ${player.name} ganhou 1 vida`);
                break;

            case 'goblin_smuggler':
                // T: criatura alvo com poder ≤2 não pode ser bloqueada neste turno
                card.tapped = true;
                const smugglerTargets = player.battlefield.filter(c =>
                    c.type === 'creature' &&
                    this.rules.getCreaturePower(c) <= 2 &&
                    c.instanceId !== card.instanceId
                );
                if (smugglerTargets.length > 0) {
                    let smugglerTarget;

                    // Se é o jogador humano, deixar escolher o alvo
                    if (player === this.player) {
                        smugglerTarget = await this.ui.promptTriggerTarget({
                            title: 'Goblin Smuggler',
                            description: 'Escolha uma criatura com poder ≤2 para não ser bloqueada:',
                            validTargets: smugglerTargets,
                            canSkip: false
                        });
                    } else {
                        // IA escolhe a criatura com maior poder
                        smugglerTarget = smugglerTargets.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (smugglerTarget) {
                        this.unblockableThisTurn.push(smugglerTarget.instanceId);
                        this.ui.log(`Goblin Smuggler: ${smugglerTarget.name} não pode ser bloqueado neste turno`);
                        this.ui.render();
                    }
                }
                break;

            case 'elvish_archdruid':
                // T: adiciona G para cada Elfo que você controla
                card.tapped = true;
                const elfCount = player.battlefield.filter(c =>
                    c.type === 'creature' && c.subtype && c.subtype.includes('Elf')
                ).length;
                // Adicionar floating mana verde
                const playerKey = player === this.player ? 'player' : 'opponent';
                this.floatingMana[playerKey].G += elfCount;
                this.ui.log(`Elvish Archdruid: Adicionou ${elfCount} mana verde`);
                break;

            case 'wildheart_invoker':
                // 8: criatura alvo ganha +5/+5 e trample até fim do turno
                this.payGenericMana(8, player);
                const invokerTargets = player.battlefield.filter(c =>
                    c.type === 'creature' && c.instanceId !== card.instanceId
                );
                if (invokerTargets.length > 0) {
                    let invokerTarget;

                    // Se é o jogador humano, deixar escolher o alvo
                    if (player === this.player) {
                        invokerTarget = await this.ui.promptTriggerTarget({
                            title: 'Wildheart Invoker',
                            description: 'Escolha uma criatura para receber +5/+5 e atropelar:',
                            validTargets: invokerTargets,
                            canSkip: false
                        });
                    } else {
                        // IA escolhe a criatura mais forte
                        invokerTarget = invokerTargets.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (invokerTarget) {
                        invokerTarget.powerModifier = (invokerTarget.powerModifier || 0) + 5;
                        invokerTarget.toughnessModifier = (invokerTarget.toughnessModifier || 0) + 5;
                        if (!invokerTarget.temporaryKeywords) invokerTarget.temporaryKeywords = [];
                        invokerTarget.temporaryKeywords.push('trample');
                        this.ui.log(`Wildheart Invoker: ${invokerTarget.name} ganhou +5/+5 e atropelar`);
                        this.ui.render();
                    }
                }
                break;

            case 'jazal_goldmane':
                // 3WW: criaturas atacantes ganham +X/+X onde X é número de atacantes
                this.payColoredMana({ generic: 3, W: 2 }, player);
                const attackerCount = this.currentAttackers.length;
                this.currentAttackers.forEach(attacker => {
                    attacker.powerModifier = (attacker.powerModifier || 0) + attackerCount;
                    attacker.toughnessModifier = (attacker.toughnessModifier || 0) + attackerCount;
                });
                this.ui.log(`Jazal Goldmane: Atacantes ganharam +${attackerCount}/+${attackerCount}`);
                break;

            case 'veteran_goblin_firebomb':
                // 1, T, Sacrifica: 2 dano a qualquer alvo
                this.payGenericMana(1, player);
                card.tapped = true;
                // Sacrificar
                this.destroyPermanent(card, player);
                // 2 dano ao oponente (simplificado)
                const creatureTarget = opponent.battlefield.find(c => c.type === 'creature');
                if (creatureTarget) {
                    creatureTarget.damage = (creatureTarget.damage || 0) + 2;
                    this.checkCreatureDeath(creatureTarget, opponent);
                    this.ui.log(`Veteran's Goblin Firebomb causou 2 de dano a ${creatureTarget.name}`);
                } else {
                    opponent.life -= 2;
                    if (opponent === this.player) {
                        this.playerLostLifeThisTurn = true;
                    } else {
                        this.opponentLostLifeThisTurn = true;
                    }
                    this.ui.log(`Veteran's Goblin Firebomb causou 2 de dano a ${opponent.name}`);
                }
                break;
        }

        this.ui.render();
        this.saveGame();
        return true;
    }

    // Paga mana genérico (tapa terrenos)
    payGenericMana(amount, player) {
        const lands = player.battlefield.filter(c => c.type === 'land' && !c.tapped);
        const manaCreatures = player.battlefield.filter(c =>
            c.keywords && c.keywords.includes('tap_for_mana') && !c.tapped && !c.summoningSickness
        );

        let remaining = amount;

        for (const land of lands) {
            if (remaining <= 0) break;
            if (!land.tapped) {
                land.tapped = true;
                remaining--;
            }
        }

        for (const creature of manaCreatures) {
            if (remaining <= 0) break;
            if (!creature.tapped) {
                creature.tapped = true;
                remaining--;
            }
        }
    }

    // Paga mana colorido
    payColoredMana(cost, player) {
        const lands = player.battlefield.filter(c => c.type === 'land' && !c.tapped);
        const manaCreatures = player.battlefield.filter(c =>
            c.keywords && c.keywords.includes('tap_for_mana') && !c.tapped && !c.summoningSickness
        );

        // Pagar custos coloridos primeiro
        for (const color in cost) {
            if (color === 'generic') continue;
            let needed = cost[color];

            for (const land of lands) {
                if (needed <= 0) break;
                if (land.produces === color && !land.tapped) {
                    land.tapped = true;
                    needed--;
                }
            }

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

        // Pagar genérico
        if (cost.generic) {
            this.payGenericMana(cost.generic, player);
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
        // Esvaziar floating mana no início de cada fase (regras MTG)
        this.floatingMana = { player: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, opponent: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 } };

        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);

        switch (this.phase) {
            case PHASES.UNTAP:
                this.rules.untapAll(this.activePlayer);
                this.activePlayer.landsPlayedThisTurn = 0;
                this.rules.removeSummoningSickness(this.activePlayer);
                // Resetar rastreadores de perda de vida, unblockables e raid
                if (this.activePlayer === this.player) {
                    this.opponentLostLifeThisTurn = false;
                    this.attackedThisTurn.player = false;
                } else {
                    this.playerLostLifeThisTurn = false;
                    this.attackedThisTurn.opponent = false;
                }
                this.unblockableThisTurn = [];
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

            case PHASES.COMBAT_BEGIN:
                // Trigger Battle-Rattle Shaman no início do combate
                await this.triggerBattleRattleShaman(this.activePlayer);
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
                // Trigger Stromkirk Bloodthief no fim do turno
                await this.triggerStromkirkBloodthief(this.activePlayer);
                await this.nextPhase();
                break;

            case PHASES.CLEANUP:
                // Limpar dano das criaturas e modificadores temporários
                this.activePlayer.battlefield.forEach(c => {
                    c.damage = 0;
                    c.powerModifier = 0;
                    c.toughnessModifier = 0;
                    c.temporaryKeywords = [];
                });

                // Descartar até 7 cartas
                await this.handleDiscard(this.activePlayer);

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

        // Marcar que este jogador atacou neste turno (para Raid)
        const playerKey = attackingPlayer === this.player ? 'player' : 'opponent';
        this.attackedThisTurn[playerKey] = true;

        // Virar atacantes (exceto vigilance)
        attackers.forEach(attacker => {
            if (!attacker.keywords || !attacker.keywords.includes('vigilance')) {
                attacker.tapped = true;
            }
        });

        // Trigger Frenzied Goblin - pagar R para impedir bloqueio
        await this.triggerFrenziedGoblin(attackers, attackingPlayer);

        // Trigger Leonin Vanguard - ganha vida se atacar com outra criatura
        this.triggerLeoninVanguard(attackers, attackingPlayer);

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
                // Renderizar para mostrar as linhas de bloqueio
                this.ui.render();
            } else {
                this.ui.log('Oponente não bloqueou');
            }

            // IMPORTANTE: Dar janela de prioridade ao jogador após bloqueadores serem declarados
            // Isso permite usar instants como Elspeth's Smite para remover bloqueadores
            const priorityResponse = await this.offerPriorityWindow('Bloqueadores declarados - você pode responder');

            if (priorityResponse === 'respond') {
                await this.handlePlayerPriorityResponse();
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
            // Rastrear perda de vida
            if (defendingPlayer === this.player) {
                this.playerLostLifeThisTurn = true;
            } else {
                this.opponentLostLifeThisTurn = true;
            }
            // Trigger Vengeful Bloodwitch - ganha vida quando oponente perde vida
            this.triggerVengefulBloodwitch(attackingPlayer, results.damageToPlayers.defender);
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
            this.ui.logTurnStart(this.turnNumber, 'Oponente');

            // Executar turno da IA
            await this.executeAITurn();

        } else {
            this.activePlayer = this.player;
            this.turnNumber++;
            this.phase = PHASES.UNTAP;
            this.ui.logTurnStart(this.turnNumber, 'Você');
            await this.handlePhase();
        }

        this.ui.render();
    }

    // Descarte para tamanho de mão (máximo 7 cartas)
    async handleDiscard(player) {
        const maxHandSize = 7;
        const cardsToDiscard = player.hand.length - maxHandSize;

        if (cardsToDiscard <= 0) return;

        if (player === this.player) {
            // Jogador escolhe quais cartas descartar
            this.ui.log(`Você tem ${player.hand.length} cartas. Descarte ${cardsToDiscard}.`);
            await this.ui.promptForDiscard(cardsToDiscard);
        } else {
            // IA descarta automaticamente (cartas mais caras primeiro)
            const sorted = [...player.hand].sort((a, b) => (b.cmc || 0) - (a.cmc || 0));
            for (let i = 0; i < cardsToDiscard; i++) {
                const cardToDiscard = sorted[i];
                const index = player.hand.indexOf(cardToDiscard);
                if (index > -1) {
                    player.hand.splice(index, 1);
                    player.graveyard.push(cardToDiscard);
                    this.ui.log(`Oponente descartou ${cardToDiscard.name}`);
                }
            }
        }
    }

    // Descarta cartas específicas do jogador
    discardCards(cards) {
        cards.forEach(card => {
            const index = this.player.hand.indexOf(card);
            if (index > -1) {
                this.player.hand.splice(index, 1);
                this.player.graveyard.push(card);
                this.ui.log(`Você descartou ${card.name}`);
            }
        });
        this.ui.render();
    }

    async executeAITurn() {
        // Indicar início do turno da IA
        this.ui.log('--- Turno do Oponente ---');
        await this.delay(600);

        // Untap
        this.phase = PHASES.UNTAP;
        this.ui.log('Fase: Desvirar');
        this.rules.untapAll(this.opponent);
        this.opponent.landsPlayedThisTurn = 0;
        this.rules.removeSummoningSickness(this.opponent);
        this.ui.render();
        await this.delay(600);

        // Draw
        this.phase = PHASES.DRAW;
        this.ui.log('Fase: Comprar');
        const drawn = this.rules.drawCard(this.opponent);
        if (drawn) {
            this.ui.log(`Oponente comprou uma carta`);
        }
        this.ui.render();
        await this.delay(800);

        // Main Phase 1
        this.phase = PHASES.MAIN1;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(500);

        // IA joga cartas na main phase - com janelas de prioridade
        await this.executeAIMainPhaseWithPriority();

        // Início do combate - janela de prioridade
        this.phase = PHASES.COMBAT_BEGIN;
        this.ui.log('Fase: Início do Combate');
        this.ui.render();

        const beginCombatResponse = await this.offerPriorityWindow('Início do combate do oponente');
        if (beginCombatResponse === 'respond') {
            await this.handlePlayerPriorityResponse();
        }

        // Combat - Declarar atacantes
        this.phase = PHASES.DECLARE_ATTACKERS;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(500);

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

    /**
     * IA executa main phase com janelas de prioridade após cada mágica
     */
    async executeAIMainPhaseWithPriority() {
        const opponent = this.opponent;

        // Log inicial
        this.ui.log('IA está pensando...');
        await this.delay(800);

        // 1. Jogar terreno se possível
        const landInHand = opponent.hand.find(card => card.type === 'land');
        if (landInHand && this.rules.canPlayLand(opponent)) {
            await this.playCard(landInHand, opponent);
            this.ui.render();
            await this.delay(1000);
        }

        // 2. Jogar cartas jogáveis uma por vez, com janelas de prioridade
        let playedSomething = true;
        while (playedSomething) {
            playedSomething = false;

            const playableCards = opponent.hand
                .filter(card => card.type !== 'land' && this.rules.canPlayCard(card, opponent))
                .sort((a, b) => (b.cmc || 0) - (a.cmc || 0));

            if (playableCards.length > 0) {
                const cardToPlay = this.ai.chooseBestCard(playableCards);
                if (cardToPlay) {
                    await this.delay(600);
                    const played = await this.playCard(cardToPlay, opponent);

                    if (played) {
                        this.ui.render();
                        playedSomething = true;

                        // Se foi uma mágica (não terreno), oferecer janela de prioridade
                        if (cardToPlay.type !== 'land') {
                            await this.delay(600);

                            const response = await this.offerPriorityWindow(`Oponente lançou ${cardToPlay.name}`);

                            if (response === 'respond') {
                                await this.handlePlayerPriorityResponse();
                            }
                        }
                    }
                }
            }

            // Verificar game over entre cartas
            if (this.gameOver) return;
        }
    }

    async continueAfterBlocking() {
        // Resolver combate
        this.phase = PHASES.COMBAT_DAMAGE;
        this.ui.log('Resolvendo dano de combate...');
        await this.delay(800);
        await this.resolveCombat();
        this.ui.render();

        // Delay maior para ver resultado do combate
        await this.delay(1200);

        // Limpar atacantes
        this.currentAttackers = [];
        this.blockerAssignments = {};

        // Continuar o turno da IA
        await this.finishAITurn();
    }

    async finishAITurn() {
        await this.delay(600);

        // Main Phase 2
        this.phase = PHASES.MAIN2;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();
        await this.delay(500);

        // IA joga cartas na main phase 2 - com janelas de prioridade
        await this.executeAIMainPhaseWithPriority();

        // End step - janela de prioridade importante para instants
        this.phase = PHASES.END;
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);
        this.ui.render();

        // Janela de prioridade no end step (momento clássico para jogar instants)
        const endStepResponse = await this.offerPriorityWindow('Fim do turno do oponente');
        if (endStepResponse === 'respond') {
            await this.handlePlayerPriorityResponse();
        }

        // Limpar dano e modificadores temporários
        this.opponent.battlefield.forEach(c => {
            c.damage = 0;
            c.powerModifier = 0;
            c.toughnessModifier = 0;
        });

        await this.delay(800);

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
        // Se estamos aguardando resposta de prioridade, completar a resposta
        if (this.isWaitingForPriorityResponse()) {
            this.ui.log('Você passou a prioridade');
            this.completePriorityResponse();
            return;
        }

        // Se há itens na pilha, passar prioridade em vez de avançar fase
        if (!this.isStackEmpty() && this.priorityPlayer === this.player) {
            this.passPriority();
        } else {
            this.nextPhase();
        }
    }

    checkGameOver() {
        if (this.gameOver) return; // Já acabou

        const result = this.rules.checkWinCondition();
        if (result) {
            this.handleGameOver(result.winner, result.reason);
        }
    }

    handleGameOver(winner, reason) {
        if (this.gameOver) return; // Evitar chamar múltiplas vezes

        this.gameOver = true;
        this.winner = winner;
        this.gameOverReason = reason;

        // Limpar save ao fim do jogo
        this.clearSavedGame();

        // Som de vitória ou derrota
        if (winner === 'player') {
            window.soundManager.playVictory();
        } else {
            window.soundManager.playDefeat();
        }

        // Mostrar tela de fim de jogo melhorada
        this.ui.showGameOverScreen(winner, reason);
    }

    // Ver campo de batalha após fim do jogo
    viewBattlefieldAfterGame() {
        this.viewingBattlefield = true;
        this.ui.enableViewMode();
    }

    // Voltar ao menu principal
    returnToMenu() {
        this.viewingBattlefield = false;
        this.gameOver = false;
        location.reload();
    }

    // Conceder partida
    concede() {
        if (this.gameOver) return;

        this.ui.log('Você concedeu a partida.');
        this.handleGameOver('opponent', 'Você concedeu a partida.');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exportar
window.GameState = GameState;
