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
        this.triggers = null; // TriggerManager - gerencia ETBs, death triggers, etc.
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

        // === Arena-Style Priority (botão Continuar) ===
        this.awaitingPlayerContinue = false; // Aguardando jogador clicar "Continuar"
        this.continueReason = null; // Motivo da pausa (para tooltip/log)
        this.continueCallback = null; // Callback para resolver Promise quando jogador clica "Continuar"

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

        // === Sistema de Undo ===
        this.stateHistory = []; // Histórico de estados para undo
        this.maxHistorySize = 20; // Máximo de estados salvos
        this.undoEnabled = this.loadUndoSetting(); // Carrega preferência do usuário

        // === Controle de Sessão (para cancelar operações ao reiniciar) ===
        this.gameSessionId = 0; // Incrementado a cada startGame
        this.pendingTimeouts = []; // IDs de timeouts pendentes

        // === Priority Stops (configurable) ===
        // Define em quais fases o jogador quer parar para ter prioridade
        // Similar ao sistema de "stops" do MTG Arena
        this.priorityStops = this.loadPriorityStops();
    }

    /**
     * Carrega configuração de priority stops do localStorage
     * @returns {Object} Configuração de stops
     */
    loadPriorityStops() {
        const saved = localStorage.getItem('mtg_priority_stops');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Erro ao carregar priority stops:', e);
            }
        }
        // Configuração padrão: stops mínimos para não atrapalhar
        return {
            upkeep: false,           // Parar no upkeep (para triggers)
            beginCombat: false,      // Parar no início do combate (antes de atacantes)
            afterAttackers: true,    // Parar após atacantes declarados
            afterBlockers: true,     // Parar após bloqueadores declarados
            endStep: false,          // Parar no end step
            opponentTurn: {          // Stops durante turno do oponente
                upkeep: false,
                beginCombat: true,   // Parar antes da IA atacar
                afterAttackers: true,
                afterBlockers: true,
                endStep: true        // Última chance antes do turno voltar
            }
        };
    }

    /**
     * Salva configuração de priority stops no localStorage
     */
    savePriorityStops() {
        localStorage.setItem('mtg_priority_stops', JSON.stringify(this.priorityStops));
    }

    /**
     * Verifica se deve parar para prioridade em uma determinada fase
     * @param {string} stopType - Tipo de stop (upkeep, beginCombat, etc.)
     * @returns {boolean}
     */
    shouldStopForPriority(stopType) {
        const isPlayerTurn = this.isPlayerTurn();

        if (isPlayerTurn) {
            return this.priorityStops[stopType] || false;
        } else {
            return this.priorityStops.opponentTurn?.[stopType] || false;
        }
    }

    init() {
        this.rules = new RulesEngine(this);
        this.ui = new GameUI(this);
        this.ai = new AIPlayer(this, this.rules);
        this.triggers = new TriggerManager(this);

        // Aviso antes de sair da página durante combate
        window.addEventListener('beforeunload', (e) => {
            const inCombat = this.currentAttackers.length > 0 ||
                           (this.phase && this.phase.includes('combat'));
            if (inCombat) {
                e.preventDefault();
                e.returnValue = 'Você está no meio do combate. Sair vai perder o progresso.';
            }
        });

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
        // Cancelar operações pendentes de partida anterior
        this.cancelAllPendingTimeouts();
        this.gameSessionId++;

        // Salvar escolha de decks
        this.playerDeckKeys = playerDecks;
        this.aiDeckKeys = aiDecks;

        // Opções de jogo (salvar para reinício)
        this.startingLife = options.startingLife || 20;
        this.playerName = options.playerName || 'Você';
        this.playerAvatar = options.playerAvatar || 'jace';
        this.playerFirst = options.playerFirst !== undefined ? options.playerFirst : true;

        // Variáveis locais para uso no método
        const startingLife = this.startingLife;
        const playerName = this.playerName;
        const playerAvatar = this.playerAvatar;

        // Escolher avatar da IA baseado nos decks
        const aiAvatar = this.getAIAvatar(aiDecks);

        // Resetar estado de fim de jogo
        this.gameOver = false;
        this.winner = null;
        this.gameOverReason = '';
        this.viewingBattlefield = false;

        // Criar jogadores
        this.player = this.createPlayer(playerName, playerDecks, startingLife, playerAvatar);
        const aiName = this.getAvatarName(aiAvatar);
        this.opponent = this.createPlayer(aiName, aiDecks, startingLife, aiAvatar);

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

        // Registrar info da partida no LogManager
        if (window.logManager) {
            window.logManager.setGameInfo({
                playerDecks: playerDecks,
                aiDecks: aiDecks,
                playerName: playerName,
                startingLife: startingLife,
                playerFirst: this.playerFirst
            });
            window.logManager.state('Partida iniciada', {
                playerDecks,
                aiDecks,
                startingLife,
                playerFirst: this.playerFirst
            });
        }

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
            this.ui.logTurnStart(1, this.opponent.name);
            this.ui.log(`${this.opponent.name} começa primeiro!`);
        }

        this.phase = PHASES.MAIN1; // Pular untap/upkeep/draw no primeiro turno

        this.ui.render();
        this.saveGame();

        // Iniciar música de fundo
        if (window.soundManager) {
            window.soundManager.playMusic();
        }

        // Se IA começa, executar turno da IA
        if (!this.playerFirst) {
            this.safeTimeout(() => this.executeAITurn(), 800);
        }
    }

    getAvatarName(avatar) {
        const names = {
            jace: 'Jace',
            chandra: 'Chandra',
            liliana: 'Liliana',
            gideon: 'Gideon',
            nissa: 'Nissa',
            ajani: 'Ajani'
        };
        return names[avatar] || 'Oponente';
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

        // Para permanentes (criaturas, etc.), mostrar preview no battlefield imediatamente
        // Eles ficam com indicador visual "na pilha" até a resolução
        if (item.type === 'creature' || (item.type === 'enchantment' && item.subtype !== 'Aura') || item.type === 'artifact') {
            item.pendingResolution = true;
            // Apenas criaturas têm summoning sickness
            if (item.type === 'creature') {
                item.summoningSickness = true;
            }
            controller.battlefield.push(item);
        }

        this.ui.log(`${item.name || 'Habilidade'} adicionado à pilha`);
        this.ui.renderStack();
        this.ui.render(); // Atualizar battlefield para mostrar preview
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
        } else if (stackItem.item.type === 'creature') {
            // Resolver criatura (entra no battlefield)
            await this.resolveCreatureFromStack(stackItem);
        } else if (stackItem.item.type === 'enchantment' || stackItem.item.type === 'artifact') {
            // Resolver permanente (encantamento/artefato)
            await this.resolvePermanentFromStack(stackItem);
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
            await this.resolveSpellWithTarget(card, caster, stackItem.target);
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

    // Resolve uma criatura da pilha (entra no battlefield)
    async resolveCreatureFromStack(stackItem) {
        const card = stackItem.item;
        const controller = stackItem.controller;

        // Remover flag de pendingResolution (criatura já está no battlefield desde addToStack)
        delete card.pendingResolution;

        // Trigger de entrada (delegado ao TriggerManager)
        await this.triggers.resolveETB(card, controller);

        this.ui.log(`${card.name} entrou no battlefield`);
        this.ui.render();
    }

    // Resolve um permanente (enchantment/artifact) da pilha
    async resolvePermanentFromStack(stackItem) {
        const card = stackItem.item;
        const controller = stackItem.controller;

        // Se é uma Aura, precisa de alvo (já deve estar em stackItem.target)
        if (card.subtype === 'Aura' && stackItem.target) {
            // Verificar se alvo ainda é válido
            if (!this.isTargetStillValid(stackItem.target)) {
                this.ui.log(`${card.name} foi anulado (alvo inválido)`);
                controller.graveyard.push(card);
                return;
            }

            // Anexar aura ao alvo
            card.attachedTo = stackItem.target;
            if (!stackItem.target.attachedAuras) stackItem.target.attachedAuras = [];
            stackItem.target.attachedAuras.push(card);
            // Auras ainda não estão no battlefield (não passaram por addToStack com preview)
            controller.battlefield.push(card);
        } else {
            // Para não-Auras, remover flag de pendingResolution (já está no battlefield)
            delete card.pendingResolution;
        }

        // Trigger de entrada
        await this.triggers.resolveETB(card, controller);

        this.ui.log(`${card.name} entrou no battlefield`);
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

        this.ui.log('IA avaliando resposta...');
        await this.delay(600);

        // Verificar se IA pode e deve responder
        const aiResponse = await this.aiDecideResponse();

        if (aiResponse) {
            // IA respondeu com alguma carta - não passa prioridade ainda
            return;
        }

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

    /**
     * IA avalia se deve responder com instant/ability
     * @returns {boolean} true se IA respondeu, false se passou
     */
    async aiDecideResponse() {
        const stackTop = this.peekStack();
        if (!stackTop) return false;

        // Verificar se tem Cancel e mana para usar
        const cancel = this.opponent.hand.find(c =>
            c.id === 'cancel' && this.rules.canCastSpell(c, this.opponent)
        );

        if (cancel && this.shouldCounterspell(stackTop.item)) {
            this.ui.log(`IA: Cancel em ${stackTop.item.name}!`);
            await this.delay(500);

            // Jogar o Cancel
            const index = this.opponent.hand.indexOf(cancel);
            if (index > -1) this.opponent.hand.splice(index, 1);

            this.rules.payMana(cancel, this.opponent);
            window.soundManager?.playMagic();

            // Anular o spell do topo da pilha
            this.resolveCounterspell(cancel, this.opponent, stackTop);
            return true;
        }

        // Verificar removal instants
        const removals = this.opponent.hand.filter(c =>
            c.type === 'instant' &&
            this.isRemovalSpell(c) &&
            this.rules.canCastSpell(c, this.opponent)
        );

        // IA usa removal em ameaças grandes (criaturas CMC >= 4)
        if (removals.length > 0 && stackTop.item.type === 'creature' && stackTop.item.cmc >= 4) {
            // Poderia usar removal aqui, mas por simplicidade deixamos para futuro
            // Por ora a IA só usa Cancel
        }

        return false;
    }

    /**
     * Avalia se a IA deve usar counterspell neste spell
     */
    shouldCounterspell(spell) {
        // Cancelar criaturas com CMC alto (>= 4)
        if (spell.type === 'creature' && spell.cmc >= 4) return true;

        // Cancelar removal que mataria criatura da IA
        if (this.isRemovalSpell(spell)) {
            // Se IA tem criaturas valiosas no campo, proteger
            const aiCreatures = this.opponent.battlefield.filter(c => c.type === 'creature');
            if (aiCreatures.some(c => c.cmc >= 3)) return true;
        }

        // Cancelar buffs grandes
        if (spell.type === 'instant' || spell.type === 'sorcery') {
            // Joraga Invocation, por exemplo
            if (spell.id === 'joraga_invocation') return true;
        }

        return false;
    }

    /**
     * Verifica se uma carta é um spell de removal
     */
    isRemovalSpell(card) {
        const removalIds = [
            'murder', 'lightning_bolt', 'doom_blade', 'go_for_the_throat',
            'eaten_by_piranhas', 'finishing_blow', 'elspeth_smite',
            'disfigure', 'cut_down', 'fatal_push', 'unholy_heat'
        ];
        return removalIds.includes(card.id);
    }

    /**
     * Oferece janela de resposta ao oponente quando um spell é jogado
     * Usa sistema Arena-style: pausa + botão Continuar
     */
    async offerResponseToOpponent(caster) {
        const responder = caster === this.player ? this.opponent : this.player;
        const stackTop = this.peekStack();

        if (!stackTop) return;

        // Se o oponente é o jogador humano
        if (responder === this.player) {
            // Arena-style: aguardar jogador clicar "Continuar" (ou usar instant)
            await this.waitForPlayerContinue(`Oponente conjurou ${stackTop.item.name}`);
        } else {
            // Oponente é a IA
            await this.aiHandlePriority();
            return; // aiHandlePriority já resolve a pilha
        }

        // Se chegou aqui, jogador passou - resolver topo da pilha
        if (!this.isStackEmpty()) {
            await this.resolveTopOfStack();
        }
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
     * Registra quando prioridade é passada (para logs mais detalhados)
     * @param {string} phase - Fase em que a prioridade foi passada
     * @param {boolean} auto - Se foi auto-pass (sem respostas disponíveis)
     */
    logPriorityPass(phase, auto = false) {
        const phaseNames = {
            upkeep: 'Upkeep',
            beginCombat: 'Início do Combate',
            afterAttackers: 'Após Atacantes',
            afterBlockers: 'Após Bloqueadores',
            endStep: 'End Step'
        };

        const phaseName = phaseNames[phase] || phase;
        const isPlayerTurn = this.isPlayerTurn();
        const activePlayerName = isPlayerTurn ? 'Você' : 'Oponente';

        // Log opcional para debug (pode ser ativado via configuração)
        if (window.logManager && window.logManager.isVerbose) {
            if (auto) {
                window.logManager.log(`[PRIORITY] ${phaseName}: ${activePlayerName} passou (auto)`, 'debug');
            } else {
                window.logManager.log(`[PRIORITY] ${phaseName}: ${activePlayerName} passou`, 'debug');
            }
        }
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

    // === ARENA-STYLE PRIORITY (Botão Continuar) ===

    /**
     * Pausa o jogo e aguarda o jogador clicar "Continuar"
     * Auto-pass se não tem respostas disponíveis
     * @param {string} reason - Motivo da pausa (ex: "Oponente conjurou Goblin")
     */
    async waitForPlayerContinue(reason) {
        // Auto-pass se não tem respostas
        if (!this.playerHasResponses()) {
            return;
        }

        this.awaitingPlayerContinue = true;
        this.continueReason = reason;

        // Highlight nas cartas jogáveis e renderizar
        this.ui.highlightPlayableCards(true);
        this.ui.render();

        // Aguardar jogador clicar "Continuar"
        return new Promise((resolve) => {
            this.continueCallback = resolve;
        });
    }

    /**
     * Chamado quando jogador clica "Continuar"
     * Resolve a Promise e continua o fluxo do jogo
     */
    playerContinue() {
        if (!this.awaitingPlayerContinue) return;

        this.awaitingPlayerContinue = false;
        this.continueReason = null;
        this.ui.highlightPlayableCards(false);

        if (this.continueCallback) {
            this.continueCallback();
            this.continueCallback = null;
        }

        this.ui.render();
    }

    /**
     * Verifica se estamos aguardando o jogador clicar "Continuar"
     * @returns {boolean}
     */
    isAwaitingPlayerContinue() {
        return this.awaitingPlayerContinue === true;
    }

    // Jogar uma carta
    async playCard(card, player) {
        if (!this.rules.canPlayCard(card, player)) {
            this.ui.log(`Não pode jogar ${card.name} agora.`);
            return false;
        }

        // Salvar estado para undo (apenas ações do jogador)
        if (player === this.player) {
            this.saveStateSnapshot(`Jogou ${card.name}`);
        }

        // Se jogador jogou um instant durante janela de prioridade, completar a resposta
        const wasWaitingForResponse = this.isWaitingForPriorityResponse() && player === this.player && card.type === 'instant';

        // Verificar se é feitiço/aura que precisa de seleção de alvo pelo jogador
        // Nesses casos, a carta fica na mão (marcada como pendingCast) até o alvo ser selecionado
        const needsPlayerTargeting = player === this.player && (
            ((card.type === 'instant' || card.type === 'sorcery') && this.spellNeedsTarget(card)) ||
            (card.type === 'enchantment' && card.subtype === 'Aura')
        );

        // Remover da mão (exceto se precisar de seleção de alvo pelo jogador)
        if (!needsPlayerTargeting) {
            const handIndex = player.hand.indexOf(card);
            if (handIndex > -1) {
                player.hand.splice(handIndex, 1);
            }
        } else {
            // Marcar carta como "sendo conjurada" para highlight visual
            card.pendingCast = true;
            this.ui.render();
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

            // Terrenos que precisam escolher cor ao entrar (Uncharted Haven)
            if (card.produces === 'any' && !card.chosenColor) {
                const deckColors = this.rules.getPlayerDeckColors(player);

                if (deckColors.length > 0) {
                    if (player === this.player) {
                        // Jogador escolhe a cor
                        const chosenColor = await this.ui.promptColorChoice({
                            title: `${card.name}`,
                            description: 'Escolha a cor de mana que este terreno produzirá:',
                            colors: deckColors
                        });
                        card.chosenColor = chosenColor;

                        const colorNames = { W: 'branco', U: 'azul', B: 'preto', R: 'vermelho', G: 'verde' };
                        this.ui.log(`${card.name} produzirá mana ${colorNames[chosenColor]}`);
                    } else {
                        // IA escolhe a cor mais necessária
                        card.chosenColor = this.chooseColorForAI(player, deckColors);

                        const colorNames = { W: 'branco', U: 'azul', B: 'preto', R: 'vermelho', G: 'verde' };
                        this.ui.log(`${card.name} produzirá mana ${colorNames[card.chosenColor]}`);
                    }
                }
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

                this.triggers.onSpellCast(player);
                return true;
            }

            // Verificar se precisa de alvo
            const needsTarget = this.spellNeedsTarget(card);

            // Felling Blow tem fluxo especial: escolher SUA criatura primeiro, depois do oponente
            if (card.id === 'felling_blow' && player === this.player) {
                const ownCreatures = player.battlefield.filter(c => c.type === 'creature');
                const opponent = this.opponent;
                const opponentCreatures = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, player)
                );

                if (ownCreatures.length === 0 || opponentCreatures.length === 0) {
                    this.ui.log(`Não há alvos válidos para ${card.name}`);
                    // Carta já está na mão (pendingCast), apenas limpar o flag
                    delete card.pendingCast;
                    return false;
                }

                // Pagar mana antes de selecionar
                this.rules.payMana(card, player);
                window.soundManager.playMagic();

                // PASSO 1: Escolher sua criatura
                const ownTarget = await this.ui.promptTriggerTarget({
                    title: 'Felling Blow - Sua Criatura',
                    description: 'Escolha sua criatura para receber +1/+1:',
                    validTargets: ownCreatures,
                    canSkip: false
                });

                if (!ownTarget) {
                    // Remover da mão e enviar para cemitério
                    const handIndex = player.hand.indexOf(card);
                    if (handIndex > -1) {
                        player.hand.splice(handIndex, 1);
                    }
                    delete card.pendingCast;
                    player.graveyard.push(card);
                    return true;
                }

                // PASSO 2: Escolher criatura do oponente
                this.ui.promptForTarget(card, opponentCreatures, async (enemyTarget) => {
                    // Remover carta da mão após seleção do alvo
                    const handIndex = player.hand.indexOf(card);
                    if (handIndex > -1) {
                        player.hand.splice(handIndex, 1);
                    }
                    delete card.pendingCast;

                    // Adiciona +1/+1 counter
                    if (!ownTarget.counters) ownTarget.counters = {};
                    ownTarget.counters.plusOnePlusOne = (ownTarget.counters.plusOnePlusOne || 0) + 1;
                    this.ui.log(`${ownTarget.name} ganhou um contador +1/+1`);

                    // Calcula dano (após o counter)
                    const damage = this.rules.getCreaturePower(ownTarget);
                    enemyTarget.damage = (enemyTarget.damage || 0) + damage;
                    this.ui.log(`${ownTarget.name} causou ${damage} de dano a ${enemyTarget.name}`);

                    // Verifica se a criatura alvo morreu
                    await this.checkCreatureDeath(enemyTarget, opponent);

                    player.graveyard.push(card);
                    this.ui.render();
                    this.saveGame();
                });
                return true;
            }

            if (needsTarget && player === this.player) {
                // Jogador precisa selecionar alvo
                const validTargets = this.getValidSpellTargets(card, player);

                if (validTargets.length === 0) {
                    this.ui.log(`Não há alvos válidos para ${card.name}`);
                    // Carta já está na mão (pendingCast), apenas limpar o flag
                    delete card.pendingCast;
                    return false;
                }

                // Pagar mana antes de selecionar
                this.rules.payMana(card, player);
                window.soundManager.playMagic();

                this.ui.promptForTarget(card, validTargets, async (target) => {
                    // Remover carta da mão após seleção do alvo
                    const handIndex = player.hand.indexOf(card);
                    if (handIndex > -1) {
                        player.hand.splice(handIndex, 1);
                    }
                    delete card.pendingCast;

                    await this.resolveSpellWithTarget(card, player, target);
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
                        await this.resolveSpellWithTarget(card, player, target);
                    }
                } else {
                    this.resolveSpell(card, player);
                }

                player.graveyard.push(card);
                this.ui.log(`${player.name} conjurou ${card.name}`);

                // Brineborn Cutthroat - trigger quando lança mágica no turno do oponente
                this.triggers.onSpellCast(player);
            }
        } else if (card.type === 'enchantment' && card.subtype === 'Aura') {
            // Auras precisam de um alvo
            await this.playAura(card, player);
            return true; // Retorna aqui pois playAura cuida do resto
        } else {
            // Permanentes (criaturas, encantamentos não-aura, artefatos)
            // NOVO: Colocar na pilha para permitir counterspells
            this.rules.payMana(card, player);

            this.ui.log(`${player.name} conjurou ${card.name}`);
            window.soundManager?.playMagic();

            // Adicionar à pilha
            const stackItem = this.addToStack(card, player);

            // Oferecer janela de resposta ao oponente
            await this.offerResponseToOpponent(player);
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
            // Carta já está na mão (pendingCast), apenas limpar o flag
            delete aura.pendingCast;
            return;
        }

        // Se é o jogador humano, pedir para selecionar alvo
        if (player === this.player) {
            // Pagar mana antes de selecionar alvo
            this.rules.payMana(aura, player);
            window.soundManager.playMagic();

            this.ui.promptForTarget(aura, validTargets, (target) => {
                // Remover carta da mão após seleção do alvo
                const handIndex = player.hand.indexOf(aura);
                if (handIndex > -1) {
                    player.hand.splice(handIndex, 1);
                }
                delete aura.pendingCast;

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
                // Filtrar criaturas que podem ser alvo (não têm hexproof)
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, caster)
                );
                break;

            // === REMOÇÃO COM RESTRIÇÃO ===
            case 'elspeths_smite':
                // Só atacantes ou bloqueadores (simplificado: qualquer criatura em combate)
                targets = [...this.currentAttackers];
                const blockersFlat = Object.values(this.blockerAssignments).flat();
                targets.push(...blockersFlat);
                break;

            case 'volley':
                // Só criaturas com flying que podem ser alvo
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' &&
                    c.keywords && c.keywords.includes('flying') &&
                    this.rules.canBeTargetedBy(c, caster)
                );
                break;

            case 'felling_blow':
                // Felling Blow tem dois alvos: criatura sua + criatura do oponente
                // Retorna criaturas do oponente (segundo alvo); primeiro alvo é tratado separadamente
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, caster)
                );
                break;

            case 'angelic_edict':
                // Criatura ou encantamento (criaturas verificam hexproof)
                targets = opponent.battlefield.filter(c =>
                    (c.type === 'creature' && this.rules.canBeTargetedBy(c, caster)) ||
                    c.type === 'enchantment'
                );
                break;

            case 'broken_wings':
                // Artefato, encantamento ou criatura com flying (criaturas verificam hexproof)
                targets = opponent.battlefield.filter(c =>
                    c.type === 'artifact' ||
                    c.type === 'enchantment' ||
                    (c.type === 'creature' && c.keywords && c.keywords.includes('flying') &&
                     this.rules.canBeTargetedBy(c, caster))
                );
                break;

            default:
                targets = [];
        }

        return targets;
    }

    // Resolver feitiço com alvo selecionado
    async resolveSpellWithTarget(card, caster, target) {
        const opponent = caster === this.player ? this.opponent : this.player;
        const targetOwner = this.player.battlefield.includes(target) ? this.player : this.opponent;

        // === WARD CHECK ===
        // Ward só se aplica se o caster é oponente do dono do alvo
        if (target.type === 'creature' && targetOwner !== caster) {
            const wardCost = this.rules.getWardCost(target);
            if (wardCost !== null) {
                const canPay = this.rules.canPayWard(wardCost, caster);

                let willPay = false;

                if (caster === this.player) {
                    // Jogador decide se paga Ward
                    willPay = await this.ui.promptWardPayment(target, wardCost, canPay);
                } else {
                    // IA sempre tenta pagar se puder
                    willPay = canPay;
                    if (willPay) {
                        this.ui.log(`IA paga ${wardCost} mana pelo Ward de ${target.name}`);
                    }
                }

                if (!willPay || !canPay) {
                    this.ui.log(`${card.name} foi anulado por Ward de ${target.name}!`);
                    // Spell é anulado, mas mana já foi pago
                    return;
                }

                // Pagar o custo de Ward
                this.payGenericMana(wardCost, caster);
                this.ui.log(`${caster.name} pagou ${wardCost} mana pelo Ward`);
            }
        }

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
                // Hexproof temporário até o fim do turno
                if (!target.temporaryKeywords) target.temporaryKeywords = [];
                target.temporaryKeywords.push('hexproof');
                this.ui.log(`${target.name} ganhou um contador +1/+1 e resistência a magia`);
                break;

            case 'offer_immortality':
                // Deathtouch + indestructible até o fim do turno
                if (!target.temporaryKeywords) target.temporaryKeywords = [];
                target.temporaryKeywords.push('deathtouch');
                target.temporaryKeywords.push('indestructible');
                this.ui.log(`${target.name} ganhou toque mortífero e indestrutível`);
                break;

            // === DANO ===
            case 'moment_of_craving':
                target.powerModifier = (target.powerModifier || 0) - 2;
                target.toughnessModifier = (target.toughnessModifier || 0) - 2;
                caster.life += 2;
                this.ui.log(`${target.name} recebeu -2/-2. ${caster.name} ganhou 2 vidas`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'volley':
                target.damage = (target.damage || 0) + 3;
                this.ui.log(`Volley causou 3 de dano a ${target.name}`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'incinerating_blast':
                // 6 dano a criatura alvo + loot opcional
                target.damage = (target.damage || 0) + 6;
                this.ui.log(`Incinerating Blast causou 6 de dano a ${target.name}`);
                await this.checkCreatureDeath(target, targetOwner);

                // Loot opcional - perguntar se quer descartar para comprar
                if (caster.hand.length > 0) {
                    if (caster === this.player) {
                        // Jogador pode escolher
                        const wantsLoot = await this.ui.promptYesNo({
                            title: 'Incinerating Blast - Loot',
                            description: 'Deseja descartar uma carta para comprar uma carta?',
                            yesText: 'Sim, descartar',
                            noText: 'Não'
                        });

                        if (wantsLoot) {
                            // Prompt para escolher carta a descartar
                            const cardToDiscard = await this.ui.promptTriggerTarget({
                                title: 'Escolha carta para descartar',
                                description: 'Selecione uma carta da sua mão para descartar:',
                                validTargets: caster.hand,
                                canSkip: false
                            });

                            if (cardToDiscard) {
                                const index = caster.hand.indexOf(cardToDiscard);
                                if (index > -1) {
                                    caster.hand.splice(index, 1);
                                    caster.graveyard.push(cardToDiscard);
                                    this.rules.drawCard(caster);
                                    this.ui.log(`${caster.name} descartou ${cardToDiscard.name} e comprou uma carta`);
                                }
                            }
                        }
                    } else {
                        // IA faz loot automaticamente
                        const discarded = caster.hand.shift();
                        caster.graveyard.push(discarded);
                        this.rules.drawCard(caster);
                        this.ui.log(`${caster.name} descartou ${discarded.name} e comprou uma carta`);
                    }
                }
                break;

            // === REMOÇÃO ===
            case 'heros_downfall':
                await this.destroyPermanent(target, targetOwner);
                this.ui.log(`${target.name} foi destruído`);
                break;

            case 'elspeths_smite':
                // Causa 3 de dano. Se morrer neste turno, exila em vez de ir pro cemitério
                target.damage = (target.damage || 0) + 3;
                target.exileOnDeath = true; // Flag para exilar em vez de destruir
                this.ui.log(`Elspeth's Smite causou 3 de dano a ${target.name}`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'angelic_edict':
                this.exilePermanent(target, targetOwner);
                this.ui.log(`${target.name} foi exilado`);
                break;

            case 'felling_blow':
                // Felling Blow: +1/+1 em sua criatura, ela causa dano = poder à criatura do oponente
                // "target" aqui é a criatura do oponente (segundo alvo)
                // Precisamos escolher uma criatura do caster para receber o +1/+1 e causar o dano
                const ownCreatures = caster.battlefield.filter(c => c.type === 'creature');
                if (ownCreatures.length > 0) {
                    let ownTarget;
                    if (caster === this.player) {
                        ownTarget = await this.ui.promptTriggerTarget({
                            title: 'Felling Blow',
                            description: 'Escolha sua criatura para receber +1/+1 e causar dano:',
                            validTargets: ownCreatures,
                            canSkip: false
                        });
                    } else {
                        // IA: escolhe a criatura com maior poder
                        ownTarget = ownCreatures.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (ownTarget) {
                        // Adiciona +1/+1 counter
                        if (!ownTarget.counters) ownTarget.counters = {};
                        ownTarget.counters.plusOnePlusOne = (ownTarget.counters.plusOnePlusOne || 0) + 1;
                        this.ui.log(`${ownTarget.name} ganhou um contador +1/+1`);

                        // Calcula dano (após o counter)
                        const damage = this.rules.getCreaturePower(ownTarget);
                        target.damage = (target.damage || 0) + damage;
                        this.ui.log(`${ownTarget.name} causou ${damage} de dano a ${target.name}`);

                        // Verifica se a criatura alvo morreu
                        await this.checkCreatureDeath(target, targetOwner);
                    }
                }
                break;

            case 'broken_wings':
                await this.destroyPermanent(target, targetOwner);
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

            // Se o item estava no battlefield com preview (pendingResolution), remover de lá também
            const item = stackTarget.item;
            if (item.pendingResolution) {
                const bfIndex = stackTarget.controller.battlefield.indexOf(item);
                if (bfIndex > -1) {
                    stackTarget.controller.battlefield.splice(bfIndex, 1);
                }
                delete item.pendingResolution;
            }

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
                // +3/+3 para todas criaturas e devem ser bloqueadas
                caster.battlefield.forEach(c => {
                    if (c.type === 'creature') {
                        c.powerModifier = (c.powerModifier || 0) + 3;
                        c.toughnessModifier = (c.toughnessModifier || 0) + 3;
                        c.mustBeBlocked = true; // Flag para forçar bloqueio
                    }
                });
                this.ui.log(`Todas as criaturas ganharam +3/+3 e devem ser bloqueadas!`);
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

    // === UTILITÁRIOS DE ESTADO DE CRIATURAS ===

    async checkCreatureDeath(creature, owner) {
        const toughness = this.rules.getCreatureToughness(creature);
        const damage = creature.damage || 0;

        if (toughness <= 0 || damage >= toughness) {
            // Se marcado para exílio ao morrer (Elspeth's Smite), exila em vez de destruir
            if (creature.exileOnDeath) {
                this.exilePermanent(creature, owner);
                this.ui.log(`${creature.name} foi exilado`);
            } else {
                await this.destroyPermanent(creature, owner);
            }
        }
    }

    async destroyPermanent(permanent, owner) {
        const index = owner.battlefield.indexOf(permanent);
        if (index > -1) {
            // Chamar death triggers ANTES de mover para o cemitério (criatura ainda "vê" o campo)
            if (permanent.type === 'creature' && this.triggers) {
                await this.triggers.onCreatureDeath(permanent, owner);
            }

            owner.battlefield.splice(index, 1);
            owner.graveyard.push(permanent);
        }
    }

    /**
     * IA escolhe cor para Uncharted Haven baseado nas cartas na mão
     * Prioriza cores que a IA precisa para jogar cartas na mão
     * @param {Object} player - Jogador (IA)
     * @param {Array} availableColors - Cores disponíveis no deck
     * @returns {string} - Cor escolhida
     */
    chooseColorForAI(player, availableColors) {
        // Contar quantas cartas na mão precisam de cada cor
        const colorNeeds = {};
        availableColors.forEach(c => colorNeeds[c] = 0);

        player.hand.forEach(card => {
            if (card.cost) {
                const colorMatches = card.cost.match(/[WUBRG]/g);
                if (colorMatches) {
                    colorMatches.forEach(c => {
                        if (colorNeeds[c] !== undefined) {
                            colorNeeds[c]++;
                        }
                    });
                }
            }
        });

        // Contar mana já disponível de cada cor
        const availableMana = this.rules.calculateAvailableMana(player);

        // Escolher a cor com maior necessidade e menor disponibilidade
        let bestColor = availableColors[0];
        let bestScore = -999;

        availableColors.forEach(color => {
            // Score = necessidade - disponibilidade
            const score = colorNeeds[color] - (availableMana[color] || 0);
            if (score > bestScore) {
                bestScore = score;
                bestColor = color;
            }
        });

        return bestColor;
    }

    // === HABILIDADES ATIVADAS ===

    // Verifica se uma carta tem habilidade ativada e pode usá-la
    canActivateAbility(card, player) {
        // Habilidades que não requerem tap podem ser usadas com summoning sickness
        const noTapAbilities = ['spectral_sailor', 'jazal_goldmane', 'ingenious_leonin'];
        if (!noTapAbilities.includes(card.id)) {
            if (card.tapped) return false;
            // Haste permite usar habilidades de tap mesmo com summoning sickness (regra 702.10)
            const hasHaste = card.keywords?.includes('haste') || this.rules.hasKeyword(card, 'haste', false);
            if (card.summoningSickness && card.type === 'creature' && !hasHaste) return false;
        }

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
                // 3WW: atacantes ganham +X/+X (só durante combate, com atacantes)
                if (this.phase !== PHASES.DECLARE_ATTACKERS && this.phase !== PHASES.DECLARE_BLOCKERS && this.phase !== PHASES.COMBAT_DAMAGE) return false;
                // Verificar atacantes confirmados OU selecionados na UI (durante DECLARE_ATTACKERS)
                const jazalAttackers = this.currentAttackers.length > 0 ? this.currentAttackers : (this.ui?.selectedAttackers || []);
                if (jazalAttackers.length === 0) return false;
                const jazalMana = this.rules.calculateAvailableMana(player);
                const jazalTotalMana = Object.values(jazalMana).reduce((a,b) => a+b, 0);
                // Custo 3WW: precisa de 2W específico + 3 qualquer = 5 total, com pelo menos 2W
                return jazalMana.W >= 2 && jazalTotalMana >= 5;

            case 'goblin_firebomb':
                // 7, T, Sacrifice: destroy target permanent
                const firebombMana = Object.values(this.rules.calculateAvailableMana(player)).reduce((a,b) => a+b, 0);
                const firebombOpponent = player === this.player ? this.opponent : this.player;
                const hasTargetPermanent = firebombOpponent.battlefield.length > 0;
                return firebombMana >= 7 && hasTargetPermanent;

            case 'dropkick_bomber':
                // R: outro Goblin ganha voar e "quando causa dano de combate, sacrifique-o"
                const dropkickMana = this.rules.calculateAvailableMana(player);
                const hasOtherGoblin = player.battlefield.some(c =>
                    c.type === 'creature' &&
                    c.subtype && c.subtype.includes('Goblin') &&
                    c.instanceId !== card.instanceId
                );
                return dropkickMana.R >= 1 && hasOtherGoblin;

            case 'ingenious_leonin':
                // 3W: coloca +1/+1 em outra criatura atacante (só durante combate)
                if (this.phase !== PHASES.DECLARE_ATTACKERS && this.phase !== PHASES.DECLARE_BLOCKERS && this.phase !== PHASES.COMBAT_DAMAGE) return false;
                const leoninMana = this.rules.calculateAvailableMana(player);
                const leoninTotalMana = Object.values(leoninMana).reduce((a,b) => a+b, 0);
                // Verificar atacantes confirmados OU selecionados na UI
                const leoninAttackers = this.currentAttackers.length > 0 ? this.currentAttackers : (this.ui?.selectedAttackers || []);
                const hasOtherAttacker = leoninAttackers.some(c => c.instanceId !== card.instanceId);
                // Custo 3W: precisa de 1W específico + 3 qualquer = 4 total, com pelo menos 1W
                return leoninMana.W >= 1 && leoninTotalMana >= 4 && hasOtherAttacker;

            case 'spectral_sailor':
                // 3U: Compre uma carta (não precisa virar, pode ser ativada a qualquer momento)
                const spectralMana = this.rules.calculateAvailableMana(player);
                const spectralTotalMana = Object.values(spectralMana).reduce((a,b) => a+b, 0);
                // Custo 3U: precisa de 1U específico + 3 qualquer = 4 total, com pelo menos 1U
                return spectralMana.U >= 1 && spectralTotalMana >= 4;

            case 'pirates_cutlass':
                // Equip 2: só pode ser ativado como sorcery (main phase, seu turno)
                const isMainPhase = this.phase === PHASES.MAIN1 || this.phase === PHASES.MAIN2;
                const isPlayerTurn = this.activePlayer === player;
                if (!isMainPhase || !isPlayerTurn) return false;
                // Precisa de 2 mana e ter uma criatura válida para equipar
                const equipMana = this.rules.calculateAvailableMana(player);
                const equipTotalMana = Object.values(equipMana).reduce((a,b) => a+b, 0);
                const hasValidTarget = player.battlefield.some(c =>
                    c.type === 'creature' && c.instanceId !== card.attachedTo
                );
                return equipTotalMana >= 2 && hasValidTarget;

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

        // Salvar estado para undo (apenas ações do jogador)
        if (player === this.player) {
            this.saveStateSnapshot(`Ativou ${card.name}`);
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
                this.ui.log(`Vampire Neonate: ${opponent.name} perdeu 1 vida, ${player.name} ganhou 1 vida`);
                // Verificar fim de jogo após perda de vida
                this.checkGameOver();
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
                // Usar atacantes confirmados OU selecionados na UI
                const jazalTargets = this.currentAttackers.length > 0 ? this.currentAttackers : (this.ui?.selectedAttackers || []);
                const attackerCount = jazalTargets.length;
                jazalTargets.forEach(attacker => {
                    attacker.powerModifier = (attacker.powerModifier || 0) + attackerCount;
                    attacker.toughnessModifier = (attacker.toughnessModifier || 0) + attackerCount;
                });
                this.ui.log(`Jazal Goldmane: Atacantes ganharam +${attackerCount}/+${attackerCount}`);
                break;

            case 'goblin_firebomb':
                // 7, T, Sacrifice: destroy target permanent
                const firebombValidTargets = opponent.battlefield.filter(c =>
                    !c.keywords?.includes('indestructible')
                );

                if (firebombValidTargets.length === 0) {
                    this.ui.log('Não há permanentes válidos para destruir');
                    return;
                }

                let firebombTarget;

                if (player === this.player) {
                    // Jogador humano escolhe o alvo
                    firebombTarget = await this.ui.promptTriggerTarget({
                        title: 'Goblin Firebomb',
                        description: 'Escolha um permanente para destruir:',
                        validTargets: firebombValidTargets,
                        canSkip: false
                    });

                    if (!firebombTarget) {
                        this.ui.log('Ativação cancelada');
                        return;
                    }
                } else {
                    // IA escolhe: prioriza criaturas por poder, depois outros permanentes
                    const creatures = firebombValidTargets.filter(c => c.type === 'creature');
                    if (creatures.length > 0) {
                        firebombTarget = creatures.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    } else {
                        firebombTarget = firebombValidTargets[0];
                    }
                }

                // Pagar custo e sacrificar
                this.payGenericMana(7, player);
                card.tapped = true;
                await this.destroyPermanent(card, player);

                // Destruir o alvo escolhido
                await this.destroyPermanent(firebombTarget, opponent);
                this.ui.log(`Goblin Firebomb destruiu ${firebombTarget.name}`);
                break;

            case 'dropkick_bomber':
                // R: outro Goblin ganha voar e "quando causa dano de combate, sacrifique-o"
                this.payColoredMana({ R: 1 }, player);
                const goblinTargets = player.battlefield.filter(c =>
                    c.type === 'creature' &&
                    c.subtype && c.subtype.includes('Goblin') &&
                    c.instanceId !== card.instanceId
                );
                if (goblinTargets.length > 0) {
                    let dropkickTarget;

                    // Se é o jogador humano, deixar escolher o alvo
                    if (player === this.player) {
                        dropkickTarget = await this.ui.promptTriggerTarget({
                            title: 'Dropkick Bomber',
                            description: 'Escolha um Goblin para ganhar voar (será sacrificado se causar dano de combate):',
                            validTargets: goblinTargets,
                            canSkip: false
                        });
                    } else {
                        // IA escolhe o Goblin com maior poder
                        dropkickTarget = goblinTargets.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (dropkickTarget) {
                        // Dar voar temporário
                        if (!dropkickTarget.temporaryKeywords) dropkickTarget.temporaryKeywords = [];
                        dropkickTarget.temporaryKeywords.push('flying');
                        // Marcar para sacrifício ao causar dano de combate
                        dropkickTarget.sacrificeOnCombatDamage = true;
                        this.ui.log(`Dropkick Bomber: ${dropkickTarget.name} ganhou voar (será sacrificado se causar dano de combate)`);
                        this.ui.render();
                    }
                }
                break;

            case 'ingenious_leonin':
                // 3W: coloca +1/+1 em outra criatura atacante. Se Cat, ganha iniciativa.
                this.payColoredMana({ generic: 3, W: 1 }, player);
                // Usar atacantes confirmados OU selecionados na UI
                const leoninAllAttackers = this.currentAttackers.length > 0 ? this.currentAttackers : (this.ui?.selectedAttackers || []);
                const leoninTargets = leoninAllAttackers.filter(c => c.instanceId !== card.instanceId);
                if (leoninTargets.length > 0) {
                    let leoninTarget;

                    if (player === this.player) {
                        leoninTarget = await this.ui.promptTriggerTarget({
                            title: 'Ingenious Leonin',
                            description: 'Coloque um contador +1/+1 em outra criatura atacante (se Cat, ganha iniciativa):',
                            validTargets: leoninTargets,
                            canSkip: false
                        });
                    } else {
                        // IA escolhe o maior atacante
                        leoninTarget = leoninTargets.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (leoninTarget) {
                        // Colocar contador +1/+1
                        if (!leoninTarget.counters) leoninTarget.counters = {};
                        leoninTarget.counters.plusOnePlusOne = (leoninTarget.counters.plusOnePlusOne || 0) + 1;
                        this.ui.log(`Ingenious Leonin: ${leoninTarget.name} ganhou um contador +1/+1`);

                        // Se é Cat, ganha iniciativa até o fim do turno
                        if (leoninTarget.subtype && leoninTarget.subtype.includes('Cat')) {
                            if (!leoninTarget.temporaryKeywords) leoninTarget.temporaryKeywords = [];
                            leoninTarget.temporaryKeywords.push('first_strike');
                            this.ui.log(`Ingenious Leonin: ${leoninTarget.name} ganhou iniciativa até o fim do turno`);
                        }
                        this.ui.render();
                    }
                }
                break;

            case 'spectral_sailor':
                // 3U: Compre uma carta
                this.payColoredMana({ generic: 3, U: 1 }, player);
                this.rules.drawCard(player);
                this.ui.log(`Spectral Sailor: ${player.name} comprou uma carta`);
                break;

            case 'pirates_cutlass':
                // Equip 2: anexar a outra criatura
                const equipTargets = player.battlefield.filter(c =>
                    c.type === 'creature' && c.instanceId !== card.attachedTo
                );

                if (equipTargets.length === 0) {
                    this.ui.log(`Não há criaturas válidas para equipar`);
                    return false;
                }

                const attachToCreature = (target) => {
                    this.payGenericMana(2, player);
                    const oldTarget = card.attachedTo;
                    card.attachedTo = target.instanceId;

                    if (oldTarget) {
                        const oldCreature = player.battlefield.find(c => c.instanceId === oldTarget);
                        if (oldCreature) {
                            this.ui.log(`Pirate's Cutlass movido de ${oldCreature.name} para ${target.name}`);
                        } else {
                            this.ui.log(`Pirate's Cutlass equipado em ${target.name}`);
                        }
                    } else {
                        this.ui.log(`Pirate's Cutlass equipado em ${target.name}`);
                    }
                    this.ui.render();
                };

                if (player === this.player) {
                    // Jogador escolhe criatura alvo
                    const selected = await this.ui.promptTriggerTarget({
                        title: `Pirate's Cutlass - Equipar`,
                        description: 'Escolha uma criatura para equipar (custo: 2 mana):',
                        validTargets: equipTargets,
                        canSkip: true
                    });
                    if (selected) {
                        attachToCreature(selected);
                    } else {
                        return false; // Cancelou
                    }
                } else {
                    // IA escolhe a criatura mais forte
                    const target = equipTargets.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                    attachToCreature(target);
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

        // Log descritivo para cada fase (mais detalhado que PHASE_NAMES)
        const phaseLogNames = {
            [PHASES.UNTAP]: 'Untap',
            [PHASES.UPKEEP]: 'Upkeep',
            [PHASES.DRAW]: 'Draw',
            [PHASES.MAIN1]: 'Main 1',
            [PHASES.COMBAT_BEGIN]: 'Início do Combate',
            [PHASES.DECLARE_ATTACKERS]: 'Declarar Atacantes',
            [PHASES.DECLARE_BLOCKERS]: 'Declarar Bloqueadores',
            [PHASES.COMBAT_DAMAGE]: 'Dano de Combate',
            [PHASES.COMBAT_END]: 'Fim do Combate',
            [PHASES.MAIN2]: 'Main 2',
            [PHASES.END]: 'End Step',
            [PHASES.CLEANUP]: 'Cleanup'
        };
        this.ui.log(`Fase: ${phaseLogNames[this.phase]}`);

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
                // CR 503: Upkeep triggers acontecem, depois ambos jogadores têm prioridade
                // Por enquanto sem triggers de upkeep implementados, mas oferecemos a janela se configurado
                if (this.shouldStopForPriority('upkeep') && this.playerHasResponses()) {
                    const response = await this.offerPriorityWindow('Upkeep - você pode jogar instants');
                    if (response === 'respond') {
                        await this.handlePlayerPriorityResponse();
                    } else {
                        this.logPriorityPass('upkeep');
                    }
                } else {
                    this.logPriorityPass('upkeep', true); // auto-pass
                }
                await this.nextPhase();
                break;

            case PHASES.DRAW:
                // Regra 103.7a: o jogador que começa pula a compra do primeiro turno
                if (this.turnNumber > 1) {
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
                // CR 507: Beginning of combat triggers disparam, depois prioridade
                await this.triggers.onBeginCombat(this.activePlayer);

                // Janela de prioridade após triggers de início de combate
                // Permite jogar instants antes de atacantes serem declarados
                if (this.shouldStopForPriority('beginCombat') && this.playerHasResponses()) {
                    const response = await this.offerPriorityWindow('Início do Combate - antes de declarar atacantes');
                    if (response === 'respond') {
                        await this.handlePlayerPriorityResponse();
                    } else {
                        this.logPriorityPass('beginCombat');
                    }
                } else {
                    this.logPriorityPass('beginCombat', true);
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
                // CR 513: End step triggers disparam, depois ambos jogadores têm prioridade
                await this.triggers.onEndStep(this.activePlayer);

                // Janela de prioridade no end step
                // Última chance antes do cleanup (onde normalmente não há prioridade)
                if (this.shouldStopForPriority('endStep') && this.playerHasResponses()) {
                    const response = await this.offerPriorityWindow('End Step - última chance antes do fim do turno');
                    if (response === 'respond') {
                        await this.handlePlayerPriorityResponse();
                    } else {
                        this.logPriorityPass('endStep');
                    }
                } else {
                    this.logPriorityPass('endStep', true);
                }
                await this.nextPhase();
                break;

            case PHASES.CLEANUP:
                // Limpar dano das criaturas e modificadores temporários
                this.activePlayer.battlefield.forEach(c => {
                    c.damage = 0;
                    c.powerModifier = 0;
                    c.toughnessModifier = 0;
                    c.temporaryKeywords = [];
                    c.mustBeBlocked = false; // Limpar flag de must be blocked
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

        // Salvar estado para undo (apenas ações do jogador)
        if (attackingPlayer === this.player) {
            const attackerNames = attackers.length <= 3
                ? attackers.map(a => a.name).join(', ')
                : `${attackers.length} criaturas`;
            this.saveStateSnapshot(`Atacou com ${attackerNames}`);
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
        await this.triggers.onFrenziedGoblinAttacks(attackers, attackingPlayer);

        // Trigger Leonin Vanguard - ganha vida se atacar com outra criatura
        this.triggers.onDeclareAttackers(attackers, attackingPlayer);

        const attackerNames = attackers.map(a => a.name).join(', ');
        this.ui.log(`${attackingPlayer.name} ataca com: ${attackerNames}`);

        // Janela de prioridade após declarar atacantes (para habilidades como Jazal Goldmane)
        if (attackingPlayer === this.player) {
            if (this.shouldStopForPriority('afterAttackers') && this.playerHasResponses()) {
                this.ui.render(); // Mostrar atacantes antes da janela de prioridade
                const postAttackResponse = await this.offerPriorityWindow('Atacantes declarados - você pode ativar habilidades');
                if (postAttackResponse === 'respond') {
                    await this.handlePlayerPriorityResponse();
                } else {
                    this.logPriorityPass('afterAttackers');
                }
            } else {
                this.logPriorityPass('afterAttackers', true);
            }
        }

        this.phase = PHASES.DECLARE_BLOCKERS;

        // Se jogador está sendo atacado, pedir bloqueadores
        if (attackingPlayer === this.opponent) {
            // CR 508.1: Após atacantes declarados, jogador ativo (IA) recebe prioridade,
            // depois jogador não-ativo (jogador humano) recebe prioridade
            // Esta é a janela para usar instants/habilidades ANTES de declarar bloqueadores
            if (this.shouldStopForPriority('afterAttackers') && this.playerHasResponses()) {
                this.ui.render();
                await this.delay(500); // Dar tempo para ver os atacantes
                const response = await this.offerPriorityWindow('Oponente declarou atacantes - você pode responder antes de bloquear');
                if (response === 'respond') {
                    await this.handlePlayerPriorityResponse();
                } else {
                    this.logPriorityPass('afterAttackers');
                }
            } else {
                this.logPriorityPass('afterAttackers', true);
            }

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
                // Delay para jogador visualizar bloqueadores antes da janela de prioridade
                await this.delay(800);
            } else {
                this.ui.log('Oponente não bloqueou');
            }

            // Arena-style: aguardar jogador clicar "Continuar" após bloqueadores
            // Permite usar instants como Elspeth's Smite para remover bloqueadores
            await this.waitForPlayerContinue('Bloqueadores declarados');

            this.phase = PHASES.COMBAT_DAMAGE;
            await this.handlePhase();
        }

        this.ui.render();
    }

    async declareBlockers(assignments) {
        // Verificar se todos os atacantes com mustBeBlocked estão sendo bloqueados
        const validation = this.validateMustBeBlocked(assignments);
        if (!validation.valid) {
            this.ui.log(`⚠️ ${validation.message}`);
            // Não impede o jogador, apenas avisa (em MTG real, é obrigatório)
        }

        // Salvar estado para undo antes de confirmar bloqueadores
        const blockerCount = Object.values(assignments).flat().length;
        if (blockerCount > 0) {
            this.saveStateSnapshot(`Bloqueou com ${blockerCount} criatura(s)`);
        } else {
            this.saveStateSnapshot('Não bloqueou');
        }

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

    /**
     * Valida se atacantes com mustBeBlocked estão sendo bloqueados
     * @param {Object} assignments - Mapa de bloqueios {attackerId: [blockerIds]}
     * @returns {Object} { valid: boolean, message: string }
     */
    validateMustBeBlocked(assignments) {
        // Identificar atacantes com mustBeBlocked
        const mustBlockAttackers = this.currentAttackers.filter(a => a.mustBeBlocked);

        if (mustBlockAttackers.length === 0) {
            return { valid: true, message: '' };
        }

        // Verificar quais estão sendo bloqueados
        const blockedAttackerIds = Object.keys(assignments);
        const unblockedMustBlock = mustBlockAttackers.filter(a =>
            !blockedAttackerIds.includes(a.instanceId)
        );

        // Verificar se o defensor tem bloqueadores disponíveis
        const defendingPlayer = this.isPlayerTurn() ? this.opponent : this.player;
        const potentialBlockers = defendingPlayer.battlefield.filter(c =>
            c.type === 'creature' &&
            !c.tapped &&
            !Object.values(assignments).flat().includes(c.instanceId)
        );

        // Verificar se algum bloqueador pode legalmente bloquear algum atacante mustBeBlocked
        const blockableAttackers = unblockedMustBlock.filter(attacker =>
            potentialBlockers.some(blocker => this.rules.canBlock(blocker, attacker))
        );

        if (blockableAttackers.length > 0) {
            const names = blockableAttackers.map(a => a.name).join(', ');
            return {
                valid: false,
                message: `${names} deve(m) ser bloqueado(s) se possível!`
            };
        }

        return { valid: true, message: '' };
    }

    async resolveCombat() {
        try {
        if (this.currentAttackers.length === 0) return;

        // Determinar quem está atacando baseado em quem possui as criaturas atacantes
        const firstAttacker = this.currentAttackers[0];
        const attackingPlayer = this.opponent.battlefield.includes(firstAttacker) ? this.opponent : this.player;
        const defendingPlayer = attackingPlayer === this.player ? this.opponent : this.player;

        // Filtrar atacantes que ainda estão no campo de batalha
        // (podem ter sido removidos por instants durante a janela de prioridade)
        const activeAttackers = this.currentAttackers.filter(attacker =>
            attackingPlayer.battlefield.includes(attacker)
        );

        if (activeAttackers.length === 0) {
            this.ui.log('Nenhum atacante restante - combate cancelado');
            return;
        }

        // === ATRIBUIÇÃO DE DANO (Regra 510.1c) ===
        // O controlador do atacante divide o dano entre múltiplos bloqueadores
        const damageAssignments = {};

        for (const attacker of activeAttackers) {
            // Filtrar bloqueadores ainda no campo
            const declaredBlockers = this.blockerAssignments[attacker.instanceId] || [];
            const blockers = declaredBlockers.filter(b => defendingPlayer.battlefield.includes(b));

            if (blockers.length > 1) {
                // Múltiplos bloqueadores - precisa dividir dano
                const hasDoubleStrike = attacker.keywords && attacker.keywords.includes('double_strike');
                const attackerPower = this.rules.getCreaturePower(attacker, true);
                const totalDamage = hasDoubleStrike ? attackerPower * 2 : attackerPower;

                if (attackingPlayer === this.player) {
                    // Jogador divide o dano - mostrar UI
                    this.ui.log(`Divida o dano de ${attacker.name} entre os bloqueadores`);
                    damageAssignments[attacker.instanceId] = await this.ui.promptDamageAssignment({
                        attacker,
                        blockers,
                        totalDamage
                    });
                } else {
                    // IA divide o dano estrategicamente
                    damageAssignments[attacker.instanceId] = this.ai.assignDamageToBlockers(
                        attacker,
                        blockers,
                        totalDamage
                    );
                }
            }
        }

        const results = this.rules.resolveCombatDamage(
            activeAttackers,
            this.blockerAssignments,
            defendingPlayer,
            attackingPlayer,
            damageAssignments
        );

        // Logar detalhes de combate
        results.combatDetails.forEach(detail => {
            if (detail.type === 'direct') {
                this.ui.log(`${detail.attacker} causou ${detail.damage} de dano a ${defendingPlayer.name}`);
            } else if (detail.type === 'blocked') {
                this.ui.log(`${detail.attacker} causou ${detail.damageToBlocker} de dano a ${detail.blocker}`);
                if (detail.damageToAttacker > 0) {
                    this.ui.log(`${detail.blocker} causou ${detail.damageToAttacker} de dano a ${detail.attacker}`);
                }
            } else if (detail.type === 'trample') {
                this.ui.log(`${detail.attacker} causou ${detail.damage} de dano (atropelar) a ${defendingPlayer.name}`);
            }
        });

        // Aplicar dano aos jogadores
        defendingPlayer.life -= results.damageToPlayers.defender;
        if (results.damageToPlayers.defender > 0) {
            // Som de dano
            window.soundManager.playDamage();
            // Rastrear perda de vida
            if (defendingPlayer === this.player) {
                this.playerLostLifeThisTurn = true;
            } else {
                this.opponentLostLifeThisTurn = true;
            }
        }

        // Aplicar vida ganha
        attackingPlayer.life += results.lifeGained.attacker;
        if (results.lifeGained.attacker > 0) {
            this.ui.log(`${attackingPlayer.name} ganhou ${results.lifeGained.attacker} vidas (lifelink)`);
        }

        // Remover criaturas mortas
        for (const creature of results.creaturesDied) {
            const owner = this.player.battlefield.includes(creature) ? this.player : this.opponent;
            await this.destroyPermanent(creature, owner);
            this.ui.log(`${creature.name} morreu em combate`);
        }

        // Sacrificar criaturas marcadas com sacrificeOnCombatDamage (Dropkick Bomber ability)
        for (const attacker of this.currentAttackers) {
            if (attacker.sacrificeOnCombatDamage && !results.creaturesDied.includes(attacker)) {
                const owner = this.player.battlefield.includes(attacker) ? this.player : this.opponent;
                await this.destroyPermanent(attacker, owner);
                this.ui.log(`${attacker.name} foi sacrificado após causar dano de combate`);
            }
        }

        // Limpar linhas de combate após criaturas morrerem (evita linhas órfãs)
        this.blockerAssignments = {};
        this.ui.blockerAssignments = {};
        this.ui.clearCombatLines();

        this.ui.render();
        } catch (error) {
            console.error('Erro em resolveCombat:', error);
            this.ui.log(`[ERRO] Falha ao resolver combate: ${error.message}`);
            // Tentar continuar o jogo mesmo com erro
            this.currentAttackers = [];
            this.blockerAssignments = {};
        }
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

    // Pular diretamente para End Step (botão "Encerrar Turno")
    async skipToEndStep() {
        if (!this.isPlayerTurn()) {
            return;
        }

        this.ui.log('Pulando para End Step...');
        this.phase = PHASES.END;
        await this.handlePhase();
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
        try {
            await this._executeAITurnInternal();
        } catch (err) {
            // Silenciosamente ignorar se o jogo foi reiniciado
            if (err.message === 'Game session changed') {
                console.log('AI turn cancelled: game restarted');
                return;
            }
            throw err; // Re-throw outros erros
        }
    }

    async _executeAITurnInternal() {
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
        // Regra 103.7a: o jogador que começa pula a compra do primeiro turno
        if (this.turnNumber > 1) {
            const drawn = this.rules.drawCard(this.opponent);
            if (drawn) {
                this.ui.log(`Oponente comprou uma carta`);
            }
        } else {
            this.ui.log('Oponente pula a compra (primeiro turno)');
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

        // Arena-style: aguardar jogador clicar "Continuar" no início do combate
        await this.waitForPlayerContinue('Início do combate do oponente');

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
                        // Janela de prioridade agora é oferecida dentro de playCard() via offerResponseToOpponent()
                        await this.delay(400);
                    }
                }
            }

            // Verificar game over entre cartas
            if (this.gameOver) return;
        }
    }

    async continueAfterBlocking() {
        try {
            // IMPORTANTE: Janela de prioridade após jogador declarar bloqueadores
            // Esta é a última chance de usar combat tricks (Moment of Triumph, etc.) antes do dano
            if (this.shouldStopForPriority('afterBlockers') && this.playerHasResponses()) {
                const priorityResponse = await this.offerPriorityWindow('Você declarou bloqueadores - última chance antes do dano');
                if (priorityResponse === 'respond') {
                    await this.handlePlayerPriorityResponse();
                } else {
                    this.logPriorityPass('afterBlockers');
                }
            } else {
                this.logPriorityPass('afterBlockers', true);
            }

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
        } catch (error) {
            console.error('Erro em continueAfterBlocking:', error);
            this.ui.log(`[ERRO] Falha após bloqueio: ${error.message}`);
            // Tentar recuperar e continuar
            this.currentAttackers = [];
            this.blockerAssignments = {};
            this.ui.waitingForBlockers = false;
            await this.finishAITurn();
        }
    }

    async finishAITurn() {
        try {
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

        // Arena-style: aguardar jogador clicar "Continuar" no end step
        // Momento clássico para jogar instants
        await this.waitForPlayerContinue('Fim do turno do oponente');

        // Limpar dano e modificadores temporários (criaturas da IA)
        this.opponent.battlefield.forEach(c => {
            c.damage = 0;
            c.powerModifier = 0;
            c.toughnessModifier = 0;
            c.temporaryKeywords = [];
            c.mustBeBlocked = false;
        });

        // Limpar modificadores temporários das criaturas do jogador também
        // (buffs que duravam "até o fim do turno" do oponente)
        this.player.battlefield.forEach(c => {
            // Apenas limpar temporaryKeywords, não dano (será limpo no cleanup do jogador)
            c.temporaryKeywords = [];
            c.mustBeBlocked = false;
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
        } catch (error) {
            console.error('Erro em finishAITurn:', error);
            this.ui.log(`[ERRO] Falha ao finalizar turno da IA: ${error.message}`);
            // Tentar recuperar
            this.activePlayer = this.player;
            this.turnNumber++;
            this.phase = PHASES.UNTAP;
            this.ui.render();
        }
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

        // Registrar fim de jogo no LogManager
        if (window.logManager) {
            window.logManager.state(`Jogo encerrado - ${winner === 'player' ? 'VITÓRIA' : 'DERROTA'}`, {
                winner,
                reason,
                finalState: window.logManager.captureGameState()
            });
        }

        // Limpar save ao fim do jogo
        this.clearSavedGame();

        // Parar música de fundo e tocar som de vitória/derrota
        if (window.soundManager) {
            window.soundManager.stopMusic();
            if (winner === 'player') {
                window.soundManager.playVictory();
            } else {
                window.soundManager.playDefeat();
            }
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
        const sessionAtStart = this.gameSessionId;
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.gameSessionId !== sessionAtStart) {
                    reject(new Error('Game session changed'));
                } else {
                    resolve();
                }
            }, ms);
        });
    }

    /**
     * Cria um timeout seguro que é cancelado se o jogo reiniciar
     * @param {Function} callback - Função a executar
     * @param {number} ms - Delay em milissegundos
     * @returns {number} - ID do timeout
     */
    safeTimeout(callback, ms) {
        const sessionAtCreation = this.gameSessionId;
        const timeoutId = setTimeout(() => {
            // Só executa se ainda estiver na mesma sessão
            if (this.gameSessionId === sessionAtCreation) {
                callback();
            }
            // Remove da lista de pendentes
            this.pendingTimeouts = this.pendingTimeouts.filter(id => id !== timeoutId);
        }, ms);
        this.pendingTimeouts.push(timeoutId);
        return timeoutId;
    }

    /**
     * Cancela todos os timeouts pendentes (usado ao reiniciar)
     */
    cancelAllPendingTimeouts() {
        this.pendingTimeouts.forEach(id => clearTimeout(id));
        this.pendingTimeouts = [];
    }

    // === SISTEMA DE UNDO ===

    // Carrega preferência de undo do localStorage
    loadUndoSetting() {
        try {
            const settings = localStorage.getItem('mtg_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                return parsed.undoEnabled === true;
            }
        } catch (e) {
            console.log('Erro ao carregar configuração de undo:', e);
        }
        return false;
    }

    // Salva preferência de undo
    saveUndoSetting(enabled) {
        this.undoEnabled = enabled;
        try {
            const settings = localStorage.getItem('mtg_settings');
            const parsed = settings ? JSON.parse(settings) : {};
            parsed.undoEnabled = enabled;
            localStorage.setItem('mtg_settings', JSON.stringify(parsed));
        } catch (e) {
            console.log('Erro ao salvar configuração de undo:', e);
        }
        // Atualizar visibilidade do botão
        if (this.ui) {
            this.ui.updateUndoButton();
        }
    }

    // Salva um snapshot do estado atual no histórico
    saveStateSnapshot(description = '') {
        if (!this.undoEnabled) return;
        if (!this.player || !this.opponent) return;

        const snapshot = {
            timestamp: Date.now(),
            description: description,
            turnNumber: this.turnNumber,
            phase: this.phase,
            activePlayerIsHuman: this.activePlayer === this.player,

            // Estado dos jogadores
            player: this.deepClonePlayer(this.player),
            opponent: this.deepClonePlayer(this.opponent),

            // Estado de combate
            currentAttackers: [...this.currentAttackers],
            blockerAssignments: JSON.parse(JSON.stringify(this.blockerAssignments)),
            unblockableThisTurn: [...this.unblockableThisTurn],
            attackedThisTurn: { ...this.attackedThisTurn },

            // Estado de turno
            opponentLostLifeThisTurn: this.opponentLostLifeThisTurn,
            playerLostLifeThisTurn: this.playerLostLifeThisTurn,

            // Stack e prioridade
            stack: JSON.parse(JSON.stringify(this.stack)),
            priorityPlayerIsHuman: this.priorityPlayer === this.player,

            // Floating mana
            floatingMana: JSON.parse(JSON.stringify(this.floatingMana))
        };

        this.stateHistory.push(snapshot);

        // Limitar tamanho do histórico
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }

        console.log(`[UNDO] Estado salvo: "${description}" (${this.stateHistory.length} no histórico)`);
    }

    // Clone profundo de um jogador
    deepClonePlayer(player) {
        return {
            name: player.name,
            life: player.life,
            avatar: player.avatar,
            library: player.library.map(c => this.deepCloneCard(c)),
            hand: player.hand.map(c => this.deepCloneCard(c)),
            battlefield: player.battlefield.map(c => this.deepCloneCard(c)),
            graveyard: player.graveyard.map(c => this.deepCloneCard(c)),
            landsPlayedThisTurn: player.landsPlayedThisTurn
        };
    }

    // Clone profundo de uma carta
    deepCloneCard(card) {
        const clone = { ...card };

        // Clonar arrays
        if (card.keywords) clone.keywords = [...card.keywords];
        if (card.temporaryKeywords) clone.temporaryKeywords = [...card.temporaryKeywords];
        if (card.attachedAuras) clone.attachedAuras = card.attachedAuras.map(a => ({ ...a }));
        if (card.counters) clone.counters = { ...card.counters };

        return clone;
    }

    // Restaura o estado anterior (undo)
    undo() {
        if (this.stateHistory.length === 0) {
            console.log('[UNDO] Nenhum estado para desfazer');
            return false;
        }

        const snapshot = this.stateHistory.pop();
        console.log(`[UNDO] Restaurando: "${snapshot.description}"`);

        // Restaurar estado dos jogadores
        this.player = this.deepClonePlayer(snapshot.player);
        this.opponent = this.deepClonePlayer(snapshot.opponent);

        // Restaurar estado do jogo
        this.turnNumber = snapshot.turnNumber;
        this.phase = snapshot.phase;
        this.activePlayer = snapshot.activePlayerIsHuman ? this.player : this.opponent;

        // Restaurar combate
        this.currentAttackers = [...snapshot.currentAttackers];
        this.blockerAssignments = JSON.parse(JSON.stringify(snapshot.blockerAssignments));
        this.unblockableThisTurn = [...snapshot.unblockableThisTurn];
        this.attackedThisTurn = { ...snapshot.attackedThisTurn };

        // Restaurar estado de turno
        this.opponentLostLifeThisTurn = snapshot.opponentLostLifeThisTurn;
        this.playerLostLifeThisTurn = snapshot.playerLostLifeThisTurn;

        // Restaurar stack e prioridade
        this.stack = JSON.parse(JSON.stringify(snapshot.stack));
        this.priorityPlayer = snapshot.priorityPlayerIsHuman ? this.player : this.opponent;

        // Restaurar floating mana
        this.floatingMana = JSON.parse(JSON.stringify(snapshot.floatingMana));

        // Limpar estados de UI
        if (this.ui) {
            this.ui.selectedCard = null;
            this.ui.selectedAttackers = [];
            this.ui.blockerAssignments = {};
            this.ui.selectedBlocker = null;
            this.ui.waitingForBlockers = false;
            this.ui.waitingForTarget = false;
        }

        // Re-renderizar
        if (this.ui) {
            this.ui.log(`⟲ Desfeito: ${snapshot.description}`);
            this.ui.render();
        }

        return true;
    }

    // Verifica se pode fazer undo
    canUndo() {
        return this.undoEnabled && this.stateHistory.length > 0;
    }

    // Retorna descrição do último estado
    getLastUndoDescription() {
        if (this.stateHistory.length === 0) return null;
        return this.stateHistory[this.stateHistory.length - 1].description;
    }

    // Limpa o histórico de undo
    clearUndoHistory() {
        this.stateHistory = [];
        console.log('[UNDO] Histórico limpo');
    }

    // Retorna o histórico para debug
    getUndoHistory() {
        return this.stateHistory.map((s, i) => ({
            index: i,
            description: s.description,
            turn: s.turnNumber,
            phase: s.phase,
            timestamp: new Date(s.timestamp).toLocaleTimeString()
        }));
    }
}

// Exportar
window.GameState = GameState;
