// === Estado e Lógica Principal do Jogo ===

// Mapeamento centralizado de cartas com efeitos especiais
// Usado para otimização: evita verificações custosas quando não há cartas com esses efeitos em jogo
const SPECIAL_EFFECT_CARDS = {
    // Cartas que removem habilidades de criaturas
    abilityRemoval: ['eaten_by_piranhas'],
    // Cartas que impedem ataque/bloqueio (estilo Pacifism)
    pacifism: ['pacifism'],
    // Cartas que reduzem custo de outras cartas
    costReduction: ['dragonlords_servant', 'goblin_electromancer'],
};

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
        // Criaturas que não podem BLOQUEAR neste turno (Frenzied Goblin)
        this.cantBlockThisTurn = [];
        // Criaturas que não podem SER BLOQUEADAS neste turno (Goblin Smuggler)
        this.cantBeBlockedThisTurn = [];
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

        // === Flags de Otimização para Efeitos Especiais ===
        // Evita verificações desnecessárias quando não há cartas com esses efeitos em jogo
        // Contadores são gerenciados por registerSpecialEffect/unregisterSpecialEffect
        // Mapeamento de cartas está em SPECIAL_EFFECT_CARDS (topo do arquivo)
        this.activeEffects = {
            abilityRemoval: 0,  // Eaten by Piranhas, Turn to Frog, etc.
            pacifism: 0,        // Pacifism, Arrest, etc.
            costReduction: 0,   // Dragonlord's Servant, Goblin Electromancer, etc.
        };

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

    // === Métodos Centralizados de Vida ===

    /**
     * Faz um jogador perder vida (centraliza som e tracking)
     * @param {Object} player - Jogador que perde vida
     * @param {number} amount - Quantidade de vida a perder
     * @param {Object} options - Opções adicionais
     * @param {boolean} options.silent - Se true, não toca som (para custos de vida)
     */
    loseLife(player, amount, options = {}) {
        if (amount <= 0) return;
        player.life -= amount;

        // Rastrear perda de vida para triggers
        if (player === this.player) {
            this.playerLostLifeThisTurn = true;
        } else {
            this.opponentLostLifeThisTurn = true;
        }

        // Som de dano (exceto para custos de vida)
        if (!options.silent) {
            window.soundManager?.playDamage();
        }
    }

    /**
     * Faz um jogador ganhar vida
     * @param {Object} player - Jogador que ganha vida
     * @param {number} amount - Quantidade de vida a ganhar
     */
    gainLife(player, amount) {
        if (amount <= 0) return;
        player.life += amount;
        // Trigger lifegain effects (Ajani's Pridemate, Twinblade Paladin, etc.)
        if (this.triggers) {
            this.triggers.onLifeGain(player, amount);
        }
    }

    init() {
        this.rules = new RulesEngine(this);
        this.ui = new GameUI(this);
        this.ai = new AIPlayer(this, this.rules);
        this.triggers = new TriggerManager(this);

        // Aviso antes de sair da página durante uma partida
        window.addEventListener('beforeunload', (e) => {
            // Avisar se o jogo está em andamento
            if (this.player && this.opponent && !this.gameOver) {
                e.preventDefault();
                e.returnValue = 'Você está no meio de uma partida. Sair vai perder o progresso.';
            }
        });
    }

    // Escolhe um avatar temático para a IA baseado nos decks dela
    getAIAvatar(deckKeys) {
        // Mapeamento de decks para avatares temáticos
        const deckAvatars = {
            cats: 'ajani',      // Ajani é um Leonin (gato)
            goblins: 'chandra', // Chandra combina com vermelho/goblins
            vampires: 'sorin',  // Sorin é um vampiro!
            elves: 'nissa',     // Nissa combina com verde/elfos
            pirates: 'jace',    // Jace combina com azul/piratas
            healing: 'elspeth', // Elspeth é uma cavaleira branca
            inferno: 'chandra', // Chandra é vermelho/dragões
            primal: 'garruk',   // Garruk é verde/bestas
            wizards: 'teferi',  // Teferi é um mago temporal
            undead: 'liliana'   // Liliana é preto/mortos-vivos
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

        // Comprar mão inicial com hand smoothing (sorteia 2 mãos, escolhe a melhor)
        this.drawSmoothedHand(this.player, 7);
        this.drawSmoothedHand(this.opponent, 7);

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

            // Devolver mão para o grimório e comprar nova mão com hand smoothing
            this.player.library = [...this.player.library, ...this.player.hand];
            this.player.hand = [];
            this.drawSmoothedHand(this.player, 7);

            this.ui.log(`Mulligan ${this.mulliganCount.player}! Comprou 7 cartas, manterá ${newHandSize}.`);
            this.ui.showMulliganPrompt();
        }
    }

    // Colocar cartas selecionadas no fundo do grimório (London Mulligan)
    putCardsOnBottom(cardInstances) {
        const cardsToBottom = this.mulliganCount.player;
        this.ui.log(`Você colocou ${cardsToBottom} carta(s) no fundo do grimório.`);

        // Mover cartas selecionadas para o fundo do grimório na ordem selecionada
        // unshift adiciona ao INÍCIO do array = fundo do grimório (pop compra do FINAL = topo)
        cardInstances.forEach(instanceId => {
            const cardIndex = this.player.hand.findIndex(c => c.instanceId === instanceId);
            if (cardIndex !== -1) {
                const card = this.player.hand.splice(cardIndex, 1)[0];
                this.player.library.unshift(card);
            }
        });

        this.finishMulligan();
    }

    /**
     * Executa a lógica de mulligan da IA
     * Usa London Mulligan: compra 7, decide se mantém, coloca X no fundo
     */
    doAIMulligan() {
        const ai = this.ai;
        const opponent = this.opponent;
        const aiName = opponent.name;

        // Loop de mulligan da IA
        while (this.mulliganCount.opponent < 3) {
            const shouldMull = ai.shouldMulligan(opponent.hand, this.mulliganCount.opponent);

            if (!shouldMull) {
                // IA mantém a mão
                const eval_ = ai.evaluateHand(opponent.hand);
                if (this.mulliganCount.opponent === 0) {
                    this.ui.log(`${aiName} manteve a mão inicial.`);
                } else {
                    this.ui.log(`${aiName} manteve a mão após ${this.mulliganCount.opponent} mulligan(s).`);
                }

                // London Mulligan: colocar cartas no fundo
                const cardsToBottom = this.mulliganCount.opponent;
                if (cardsToBottom > 0) {
                    const toBottom = ai.chooseCardsToBottom(opponent.hand, cardsToBottom);
                    toBottom.forEach(instanceId => {
                        const cardIndex = opponent.hand.findIndex(c => c.instanceId === instanceId);
                        if (cardIndex !== -1) {
                            const card = opponent.hand.splice(cardIndex, 1)[0];
                            opponent.library.unshift(card);
                        }
                    });
                    this.ui.log(`${aiName} colocou ${cardsToBottom} carta(s) no fundo.`);
                }
                break;
            }

            // IA faz mulligan
            this.mulliganCount.opponent++;
            const newHandSize = 7 - this.mulliganCount.opponent;

            if (newHandSize <= 0) {
                this.ui.log(`${aiName} não pode mais fazer mulligan!`);
                break;
            }

            // Devolver mão para o grimório e comprar nova mão
            opponent.library = [...opponent.library, ...opponent.hand];
            opponent.hand = [];
            this.drawSmoothedHand(opponent, 7);

            const eval_ = ai.evaluateHand(opponent.hand);
            this.ui.log(`${aiName} fez mulligan ${this.mulliganCount.opponent}! (${eval_.reason})`);
        }
    }

    finishMulligan() {
        // IA decide mulligan
        this.doAIMulligan();

        this.mulliganPhase = false;

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
            ajani: 'Ajani',
            garruk: 'Garruk',
            elspeth: 'Elspeth',
            sorin: 'Sorin',
            teferi: 'Teferi'
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
            exile: [],
            landsPlayedThisTurn: 0,
            avatar: avatar
        };
    }

    /**
     * Hand Smoothing - similar ao MTG Arena
     * Sorteia 2 mãos e escolhe a com melhor distribuição de terrenos
     * Ideal: 2-4 terrenos em 7 cartas (closer to 3 is better)
     */
    drawSmoothedHand(player, handSize = 7) {
        // Simular duas mãos possíveis
        const simulateHand = () => {
            const tempLibrary = shuffleDeck([...player.library, ...player.hand]);
            const hand = tempLibrary.slice(0, handSize);
            const library = tempLibrary.slice(handSize);
            const landCount = hand.filter(c => c.type === 'land').length;
            return { hand, library, landCount };
        };

        const sim1 = simulateHand();
        const sim2 = simulateHand();

        // Pontuação: quanto mais perto de 3 terrenos, melhor (0 = perfeito)
        // Para mãos menores que 7, ajusta o ideal proporcionalmente
        const idealLands = Math.round(handSize * 3 / 7);
        const score1 = Math.abs(sim1.landCount - idealLands);
        const score2 = Math.abs(sim2.landCount - idealLands);

        // Escolhe a mão com melhor pontuação (menor distância do ideal)
        const chosen = score1 <= score2 ? sim1 : sim2;

        // Aplica a mão escolhida
        player.hand = chosen.hand;
        player.library = chosen.library;

        return chosen.landCount;
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
            await this.resolveSpell(card, caster);
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

        // Enters tapped (Diregraf Ghoul, etc.)
        if (card.keywords?.includes('enters_tapped')) {
            card.tapped = true;
        }

        // Carnelian Orb of Dragonkind: se jogador escolheu usar o Orb, Dragão ganha haste
        if (card.useOrbForHaste) {
            card.hasHasteFromOrb = true;
            delete card.useOrbForHaste; // Limpar flag temporário
            this.ui.log(`${card.name} ganha ímpeto (Carnelian Orb of Dragonkind)`);
        }

        // Registrar efeitos especiais para otimização
        this.registerSpecialEffect(card);

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

            // Anexar aura ao alvo (usar instanceId para consistência)
            card.attachedTo = stackItem.target.instanceId;
            if (!stackItem.target.attachedAuras) stackItem.target.attachedAuras = [];
            stackItem.target.attachedAuras.push(card);
            // Auras ainda não estão no battlefield (não passaram por addToStack com preview)
            controller.battlefield.push(card);
            // Registrar efeitos especiais para otimização
            this.registerSpecialEffect(card);
        } else {
            // Para não-Auras, remover flag de pendingResolution (já está no battlefield)
            delete card.pendingResolution;
            // Registrar efeitos especiais para otimização (artefatos, encantamentos não-aura)
            this.registerSpecialEffect(card);
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

        // Verificar se tem algum counterspell (Cancel, Essence Scatter, etc.) que pode usar
        const counterspell = this.opponent.hand.find(c =>
            this.isCounterspell(c) &&
            this.rules.canCastSpell(c, this.opponent) &&
            this.canCounterTarget(c, stackTop)
        );

        if (counterspell && this.shouldCounterspell(stackTop.item, counterspell)) {
            this.ui.log(`IA: ${counterspell.name} em ${stackTop.item.name}!`);
            await this.delay(500);

            // Jogar o counterspell
            const index = this.opponent.hand.indexOf(counterspell);
            if (index > -1) this.opponent.hand.splice(index, 1);

            this.rules.payMana(counterspell, this.opponent);
            window.soundManager?.playMagic();

            // Anular o spell do topo da pilha
            this.resolveCounterspell(counterspell, this.opponent, stackTop);
            return true;
        }

        return false;
    }

    /**
     * Avalia se a IA deve usar counterspell neste spell
     * @param {Object} spell - O spell a ser anulado
     * @param {Object} counterCard - O counterspell que a IA está considerando usar
     */
    shouldCounterspell(spell, counterCard) {
        // Essence Scatter (counterspell_creature): only counter creatures CMC >= 3
        if (counterCard?.keywords?.includes('counterspell_creature')) {
            return spell.type === 'creature' && spell.cmc >= 3;
        }

        // Full counterspells (Cancel): more selective to save for high-value targets
        // Counter creatures with CMC >= 4
        if (spell.type === 'creature' && spell.cmc >= 4) return true;

        // Counter removal that would kill an AI creature
        if (this.isRemovalSpell(spell)) {
            const aiCreatures = this.opponent.battlefield.filter(c => c.type === 'creature');
            if (aiCreatures.some(c => c.cmc >= 3)) return true;
        }

        // Counter powerful sorceries/instants
        if (spell.type === 'instant' || spell.type === 'sorcery') {
            if (spell.cmc >= 4) return true;
            if (spell.id === 'joraga_invocation') return true;
            if (spell.id === 'rise_again') return true;
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
     * Verifica se o jogador tem instants ou cartas com flash jogáveis na mão com mana suficiente
     * @returns {Array} Lista de instants/flash jogáveis
     */
    getPlayableInstants() {
        // Incluir instants E cartas com flash (criaturas, artefatos, auras)
        const instantSpeedCards = this.player.hand.filter(card => {
            const hasFlash = card.keywords?.includes('flash');
            return card.type === 'instant' || hasFlash;
        });
        return instantSpeedCards.filter(card => this.rules.canCastInstant(card, this.player));
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
            beginCombat: 'Beginning of Combat',
            afterAttackers: 'After Attackers',
            afterBlockers: 'After Blockers',
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
     * Popup só aparece se houver instants jogáveis
     * Habilidades ativadas são indicadas visualmente nas cartas (sem popup)
     * @param {string} reason - Razão da janela (ex: "IA lançou Lightning Bolt")
     * @param {Object} options - Opções adicionais
     * @returns {Promise<string>} - 'pass' ou 'respond'
     */
    async offerPriorityWindow(reason, options = {}) {
        const playableInstants = this.getPlayableInstants();

        // Se não há instants jogáveis, não mostrar popup
        // Habilidades ativadas são indicadas visualmente nas cartas
        if (playableInstants.length === 0) {
            return 'pass';
        }

        // Mostrar janela de prioridade apenas com instants
        this.waitingForPriorityResponse = true;
        this.priorityWindowReason = reason;
        this.priorityPlayer = this.player;

        const response = await this.ui.showPriorityWindow(reason, playableInstants);

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

    // Verifica e oferece kicker ao jogador
    async handleKicker(card, player) {
        // Verificar se a carta tem kicker
        if (!card.kickerCost) return false;

        // Calcular mana disponível
        const availableMana = this.rules.calculateAvailableMana(player);
        const totalMana = Object.values(availableMana).reduce((a, b) => a + b, 0);

        // Calcular custo total com kicker
        // Formato: "1U" -> 1 genérico + 1 azul = 2 total
        const kickerCost = this.rules.parseCost(card.kickerCost);
        // Somar genérico + colorido para obter custo total do kicker
        const kickerTotal = kickerCost.generic + Object.values(kickerCost.colored).reduce((a, b) => a + b, 0);
        const baseCost = card.cmc || 0;
        const totalCostWithKicker = baseCost + kickerTotal;

        // Verificar se pode pagar kicker
        const canPayKicker = totalMana >= totalCostWithKicker;
        if (!canPayKicker) return false;

        // Para o jogador humano, perguntar se quer pagar kicker
        if (player === this.player) {
            // Formatar custo de kicker para exibição com ícones (ex: "1U" -> "{1}{U}")
            const formattedKickerCost = card.kickerCost.split('').map(c => `{${c}}`).join('');
            const wantKicker = await this.ui.promptYesNo({
                title: `${card.name} - Encostar`,
                description: `Deseja pagar o custo de encostar ${formattedKickerCost}?`,
                yesText: 'Sim, encostar',
                noText: 'Não'
            });

            if (wantKicker) {
                card.kicked = true;
                return true;
            }
        } else {
            // IA sempre paga kicker se puder e faz sentido
            // Para Into the Roil, sempre vale a pena comprar carta extra
            card.kicked = true;
            return true;
        }

        return false;
    }

    /**
     * Verifica se o jogador pode pagar o custo de uma carta SEM usar o Carnelian Orb
     * @param {Object} card - A carta a verificar
     * @param {Object} player - O jogador
     * @returns {boolean} - true se pode pagar sem o Orb
     */
    canAffordWithoutOrb(card, player) {
        // Calcular mana disponível SEM o Orb
        const fullMana = this.rules.calculateAvailableMana(player);
        const manaWithoutOrb = { ...fullMana };

        // Orb produz R, então subtraímos 1 do vermelho (ou do 'any' se não houver R)
        if (manaWithoutOrb.R > 0) {
            manaWithoutOrb.R -= 1;
        } else if (manaWithoutOrb.any > 0) {
            manaWithoutOrb.any -= 1;
        }

        // Verificar se pode pagar o custo SEM o Orb
        const cost = this.rules.parseCost(card.cost);

        // Aplicar redução de custo de Dragons (Dragonlord's Servant)
        let adjustedGeneric = cost.generic || 0;
        if (this.activeEffects?.costReduction > 0 && card.subtype?.includes('Dragon')) {
            const servantCount = player.battlefield.filter(c =>
                c.id === 'dragonlords_servant'
            ).length;
            adjustedGeneric = Math.max(0, adjustedGeneric - servantCount);
        }

        // Verificar custos coloridos
        let remainingMana = { ...manaWithoutOrb };
        for (const color in cost.colored) {
            const needed = cost.colored[color];
            if ((remainingMana[color] || 0) < needed) {
                return false;
            }
            remainingMana[color] -= needed;
        }

        // Verificar custo genérico
        const totalRemaining = Object.values(remainingMana).reduce((a, b) => a + b, 0);
        return totalRemaining >= adjustedGeneric;
    }

    /**
     * Verifica se o jogador quer usar o Carnelian Orb para dar haste ao Dragão
     * @param {Object} card - A carta sendo conjurada
     * @param {Object} player - O jogador conjurando
     * @returns {Promise<boolean|string>} - true se usar Orb, false se não, 'cancel' se cancelar
     */
    async handleCarnelianOrb(card, player) {
        // Só se aplica a Dragões
        if (!card.subtype?.includes('Dragon') || card.type !== 'creature') {
            return false;
        }

        // Verificar se tem Carnelian Orb desvirado
        const untappedOrb = player.battlefield.find(c =>
            c.id === 'carnelian_orb' && !c.tapped
        );

        if (!untappedOrb) {
            return false;
        }

        // Calcular se pode pagar SEM o Orb
        const canPayWithoutOrb = this.canAffordWithoutOrb(card, player);

        // Jogador humano: SEMPRE perguntar
        if (player === this.player) {
            const description = canPayWithoutOrb
                ? `Usar o Carnelian Orb para conjurar ${card.name}?\nSe usar, o Dragão ganhará ímpeto.`
                : `Usar o Carnelian Orb para conjurar ${card.name}?\nSe usar, o Dragão ganhará ímpeto.\n⚠️ Você precisa do Orb para pagar o custo.`;

            const noText = canPayWithoutOrb
                ? 'Não, usar outras fontes'
                : 'Cancelar conjuração';

            const useOrb = await this.ui.promptYesNo({
                title: 'Carnelian Orb of Dragonkind',
                description,
                yesText: 'Sim, usar Orb',
                noText
            });

            if (useOrb) {
                untappedOrb.tapped = true;
                card.useOrbForHaste = true;
                this.ui.log(`Carnelian Orb usado - ${card.name} ganhará ímpeto`);
                return true;
            } else if (!canPayWithoutOrb) {
                // Jogador escolheu cancelar (não pode pagar sem Orb)
                return 'cancel';
            }
            return false;
        } else {
            // IA sempre usa o Orb para dar haste (boa estratégia)
            untappedOrb.tapped = true;
            card.useOrbForHaste = true;
            return true;
        }
    }

    // Jogar uma carta
    async playCard(card, player) {
        if (!this.rules.canPlayCard(card, player)) {
            this.ui.log(`Não pode jogar ${card.name} agora.`);
            return false;
        }

        // Se jogador jogou um instant ou flash durante janela de prioridade, completar a resposta
        const hasFlash = card.keywords?.includes('flash');
        const isInstantSpeed = card.type === 'instant' || hasFlash;
        const wasWaitingForResponse = this.isWaitingForPriorityResponse() && player === this.player && isInstantSpeed;

        // Verificar se é feitiço/aura que precisa de seleção de alvo pelo jogador
        // Nesses casos, a carta fica na mão (marcada como pendingCast) até o alvo ser selecionado
        // NOTA: Counterspells são excluídos pois alvejam a stack (tratamento especial em promptForStackTarget)
        const isCounterspell = this.isCounterspell(card);
        const needsPlayerTargeting = player === this.player && !isCounterspell && (
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

            // ETB de terrenos (Uncharted Haven, etc.) - delegado ao TriggerManager
            await this.triggers.resolveETB(card, player);

            this.ui.log(`${player.name} jogou ${card.name}`);
        } else if (card.type === 'instant' || card.type === 'sorcery') {
            // Verificar se é um counterspell (caso especial - mira na stack)
            if (this.isCounterspell(card)) {
                // Counterspell precisa de uma mágica na stack (qualquer tipo exceto land)
                // Also filter by what this specific counterspell can target
                const spellsOnStack = this.stack.filter(s =>
                    s.item.type !== 'land' && s.controller !== player && this.canCounterTarget(card, s)
                );

                if (spellsOnStack.length === 0) {
                    this.ui.log(`Não há mágicas na pilha para anular`);
                    player.hand.push(card);
                    return false;
                }

                // Pagar mana
                const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
                this.rules.payMana(card, player, selectedLands);
                if (player === this.player) this.ui.clearLandSelection();
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

                this.triggers.onSpellCast(player, card);
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
                const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
                this.rules.payMana(card, player, selectedLands);
                if (player === this.player) this.ui.clearLandSelection();
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
                });
                return true;
            }

            // Bite Down - sua criatura causa dano igual ao poder dela a criatura do oponente
            if (card.id === 'bite_down' && player === this.player) {
                const ownCreatures = player.battlefield.filter(c => c.type === 'creature');
                const opponent = this.opponent;
                const opponentCreatures = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, player)
                );

                if (ownCreatures.length === 0 || opponentCreatures.length === 0) {
                    this.ui.log(`Não há alvos válidos para ${card.name}`);
                    delete card.pendingCast;
                    return false;
                }

                // Pagar mana antes de selecionar
                const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
                this.rules.payMana(card, player, selectedLands);
                if (player === this.player) this.ui.clearLandSelection();
                window.soundManager.playMagic();

                // PASSO 1: Escolher sua criatura
                const ownTarget = await this.ui.promptTriggerTarget({
                    title: 'Bite Down - Sua Criatura',
                    description: 'Escolha sua criatura para causar dano:',
                    validTargets: ownCreatures,
                    canSkip: false
                });

                if (!ownTarget) {
                    const handIndex = player.hand.indexOf(card);
                    if (handIndex > -1) player.hand.splice(handIndex, 1);
                    delete card.pendingCast;
                    player.graveyard.push(card);
                    return true;
                }

                // PASSO 2: Escolher criatura do oponente
                this.ui.promptForTarget(card, opponentCreatures, async (enemyTarget) => {
                    const handIndex = player.hand.indexOf(card);
                    if (handIndex > -1) player.hand.splice(handIndex, 1);
                    delete card.pendingCast;

                    // Sua criatura causa dano igual ao seu poder
                    const damage = this.rules.getCreaturePower(ownTarget);
                    enemyTarget.damage = (enemyTarget.damage || 0) + damage;
                    this.ui.log(`${ownTarget.name} causou ${damage} de dano a ${enemyTarget.name}`);

                    // Deathtouch check
                    const hasDeathtouch = this.rules.hasKeyword(ownTarget, 'deathtouch', false);
                    if (hasDeathtouch && damage > 0) {
                        enemyTarget.markedForDeath = true;
                    }

                    await this.checkCreatureDeath(enemyTarget, opponent);
                    player.graveyard.push(card);
                    this.ui.render();
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

                // Verificar kicker antes de pagar mana
                if (card.kickerCost) {
                    await this.handleKicker(card, player);
                }

                // Pagar mana antes de selecionar
                const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
                this.rules.payMana(card, player, selectedLands);
                if (player === this.player) this.ui.clearLandSelection();

                // Pagar custo de kicker se foi escolhido
                if (card.kicked) {
                    const kickerCostParsed = this.rules.parseCost(card.kickerCost);
                    // Pagar colorido primeiro
                    const coloredCost = {};
                    ['W', 'U', 'B', 'R', 'G'].forEach(color => {
                        if (kickerCostParsed[color]) coloredCost[color] = kickerCostParsed[color];
                    });
                    if (Object.keys(coloredCost).length > 0) {
                        this.payColoredMana(coloredCost, player);
                    }
                    // Pagar genérico
                    if (kickerCostParsed.generic) {
                        this.payGenericMana(kickerCostParsed.generic, player);
                    }
                    this.ui.log(`${card.name} foi encostado!`);
                }

                window.soundManager.playMagic();

                // Spells que alvejam cemitério precisam de modal (não battlefield highlight)
                const graveyardTargetingSpells = ['cemetery_recruitment'];
                if (graveyardTargetingSpells.includes(card.id)) {
                    // Usar modal para seleção de alvo no cemitério
                    const target = await this.ui.promptTriggerTarget({
                        title: `${card.name}`,
                        description: 'Escolha uma criatura do seu cemitério:',
                        validTargets: validTargets,
                        canSkip: false
                    });

                    if (target) {
                        const handIndex = player.hand.indexOf(card);
                        if (handIndex > -1) {
                            player.hand.splice(handIndex, 1);
                        }
                        delete card.pendingCast;

                        await this.resolveSpellWithTarget(card, player, target);
                        player.graveyard.push(card);
                        this.ui.render();
                    }
                    return true;
                }

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
                });
                return true;
            } else {
                // Sem alvo ou é IA
                // Verificar kicker para IA
                if (card.kickerCost && player === this.opponent) {
                    await this.handleKicker(card, player);
                }

                const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
                this.rules.payMana(card, player, selectedLands);
                if (player === this.player) this.ui.clearLandSelection();

                // Pagar custo de kicker se foi escolhido (IA)
                if (card.kicked) {
                    const kickerCostParsed = this.rules.parseCost(card.kickerCost);
                    const coloredCost = {};
                    ['W', 'U', 'B', 'R', 'G'].forEach(color => {
                        if (kickerCostParsed[color]) coloredCost[color] = kickerCostParsed[color];
                    });
                    if (Object.keys(coloredCost).length > 0) {
                        this.payColoredMana(coloredCost, player);
                    }
                    if (kickerCostParsed.generic) {
                        this.payGenericMana(kickerCostParsed.generic, player);
                    }
                    this.ui.log(`${card.name} foi encostado!`);
                }

                window.soundManager.playMagic();

                if (needsTarget && player === this.opponent) {
                    // IA escolhe alvo
                    const validTargets = this.getValidSpellTargets(card, player);
                    if (validTargets.length > 0) {
                        const target = this.ai.chooseBestSpellTarget(card, validTargets);
                        await this.resolveSpellWithTarget(card, player, target);
                    }
                } else {
                    await this.resolveSpell(card, player);
                }

                player.graveyard.push(card);
                this.ui.log(`${player.name} conjurou ${card.name}`);

                // Brineborn Cutthroat / Firespitter Whelp - trigger quando lança mágica
                this.triggers.onSpellCast(player, card);
            }
        } else if (card.type === 'enchantment' && card.subtype === 'Aura') {
            // Auras precisam de um alvo
            await this.playAura(card, player);
            return true; // Retorna aqui pois playAura cuida do resto
        } else {
            // Permanentes (criaturas, encantamentos não-aura, artefatos)
            // NOVO: Colocar na pilha para permitir counterspells

            // Verificar se carta tem X no custo
            if (this.rules.hasXCost(card)) {
                const maxX = this.rules.getMaxXValue(card, player);

                if (player === this.player) {
                    // Jogador escolhe valor de X
                    const xValue = await this.ui.promptXValue({
                        card: card,
                        maxX: maxX,
                        minX: 1  // Mínimo 1 para criaturas 0/0 (senão morrem imediatamente)
                    });

                    if (xValue === null) {
                        // Jogador cancelou - devolver carta à mão
                        player.hand.push(card);
                        this.ui.log(`Conjuração de ${card.name} cancelada`);
                        this.ui.render();
                        return false;
                    }

                    card.xValue = xValue;
                } else {
                    // IA: usa o maior X possível para maximizar força
                    card.xValue = maxX;
                }

                this.ui.log(`${player.name} escolheu X = ${card.xValue} para ${card.name}`);
            }

            // Carnelian Orb: perguntar se quer usar para dar haste ao Dragão ANTES de pagar mana
            const orbResult = await this.handleCarnelianOrb(card, player);
            if (orbResult === 'cancel') {
                // Jogador cancelou a conjuração - devolver carta à mão
                player.hand.push(card);
                delete card.xValue; // Limpar valor de X se cancelar
                this.ui.log(`Conjuração de ${card.name} cancelada`);
                this.ui.render();
                return false;
            }

            const selectedLands = (player === this.player) ? this.ui.selectedLands : [];
            this.rules.payMana(card, player, selectedLands, card.xValue);
            if (player === this.player) this.ui.clearLandSelection();

            this.ui.log(`${player.name} conjurou ${card.name}`);
            window.soundManager?.playMagic();

            // Adicionar à pilha
            const stackItem = this.addToStack(card, player);

            // Trigger para "whenever you cast a spell" (Brineborn Cutthroat, Firespitter Whelp, etc)
            this.triggers.onSpellCast(player, card);

            // Oferecer janela de resposta ao oponente
            await this.offerResponseToOpponent(player);
        }

        this.ui.render();

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
        } else if (aura.id === 'new_horizons') {
            // New Horizons: encantar terreno que você controla
            validTargets = player.battlefield.filter(c => c.type === 'land');
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
            const selectedLands = this.ui.selectedLands;
            this.rules.payMana(aura, player, selectedLands);
            this.ui.clearLandSelection();
            window.soundManager.playMagic();

            this.ui.promptForTarget(aura, validTargets, async (target) => {
                // Remover carta da mão após seleção do alvo
                const handIndex = player.hand.indexOf(aura);
                if (handIndex > -1) {
                    player.hand.splice(handIndex, 1);
                }
                delete aura.pendingCast;

                await this.attachAura(aura, target, player);
            });
        } else {
            // IA: escolher melhor alvo automaticamente
            this.rules.payMana(aura, player);
            window.soundManager.playMagic();

            const target = this.ai.chooseBestAuraTarget(aura, validTargets, player);
            if (target) {
                await this.attachAura(aura, target, player);
            }
        }
    }

    // Anexar Aura a uma criatura
    async attachAura(aura, target, controller) {
        aura.attachedTo = target.instanceId;
        aura.controlledBy = controller === this.player ? 'player' : 'opponent';
        controller.battlefield.push(aura);

        // Registrar efeitos especiais para otimização
        this.registerSpecialEffect(aura);

        this.ui.log(`${aura.name} foi anexado a ${target.name}`);

        // Resolver ETB da Aura (ex: New Horizons coloca contador +1/+1)
        await this.triggers.resolveETB(aura, controller);

        this.ui.render();
    }

    // Registra efeitos especiais quando uma carta entra no campo
    // Usa o mapeamento SPECIAL_EFFECT_CARDS definido no topo do arquivo
    registerSpecialEffect(card) {
        if (!this.activeEffects) return;

        for (const [effect, cardIds] of Object.entries(SPECIAL_EFFECT_CARDS)) {
            if (cardIds.includes(card.id)) {
                this.activeEffects[effect]++;
            }
        }
    }

    // Remove registro de efeitos especiais quando uma carta sai do campo
    unregisterSpecialEffect(card) {
        if (!this.activeEffects) return;

        for (const [effect, cardIds] of Object.entries(SPECIAL_EFFECT_CARDS)) {
            if (cardIds.includes(card.id)) {
                this.activeEffects[effect] = Math.max(0, this.activeEffects[effect] - 1);
            }
        }
    }

    // Verifica se feitiço precisa de alvo
    spellNeedsTarget(card) {
        const targetedSpells = [
            // Buffs (alvo: própria criatura)
            'moment_of_triumph', 'kindled_fury', 'snakeskin_veil',
            'offer_immortality', 'adamant_will', 'giant_growth',
            // Remoção (alvo: criatura do oponente)
            'moment_of_craving', 'heros_downfall', 'elspeths_smite',
            'angelic_edict', 'volley', 'incinerating_blast', 'broken_wings',
            'scorching_dragonfire', 'fiery_annihilation', 'murder', 'deadly_riposte',
            // Dois alvos
            'felling_blow', 'bite_down',
            // Bounce/outros
            'fleeting_distraction', 'into_the_roil',
            // Undead deck
            'undying_malice', 'deadly_plot', 'cemetery_recruitment', 'eaten_alive'
        ];

        // Counterspells têm alvo especial (na stack)
        if (card.keywords && card.keywords.includes('counterspell')) {
            return true;
        }

        return targetedSpells.includes(card.id);
    }

    // Verifica se feitiço é um counterspell (mira na stack)
    isCounterspell(card) {
        return card.keywords && (
            card.keywords.includes('counterspell') ||
            card.keywords.includes('counterspell_creature')
        );
    }

    // Check if a counterspell can target a specific stack item
    canCounterTarget(counterCard, stackTarget) {
        // Essence Scatter can only counter creature spells
        if (counterCard.keywords?.includes('counterspell_creature')) {
            return stackTarget.item.type === 'creature';
        }
        // Regular counterspells can counter any spell
        return true;
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
            case 'adamant_will':
            case 'giant_growth':
                targets = caster.battlefield.filter(c => c.type === 'creature');
                break;

            // === REMOÇÃO (criaturas do oponente) ===
            case 'moment_of_craving':
            case 'heros_downfall':
            case 'incinerating_blast':
            case 'scorching_dragonfire':
            case 'fiery_annihilation':
            case 'murder':
                // Filtrar criaturas que podem ser alvo (não têm hexproof)
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, caster)
                );
                break;

            case 'deadly_riposte':
                // Só criaturas viradas do oponente
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && c.tapped && this.rules.canBeTargetedBy(c, caster)
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

            case 'fleeting_distraction':
                // -1/-0 em qualquer criatura (sua ou do oponente, exceto spells na pilha)
                targets = [
                    ...caster.battlefield.filter(c => c.type === 'creature' && !c.pendingResolution),
                    ...opponent.battlefield.filter(c => c.type === 'creature' && !c.pendingResolution && this.rules.canBeTargetedBy(c, caster))
                ];
                break;

            case 'into_the_roil':
                // Bounce qualquer permanente não-terreno (exceto spells na pilha)
                // Cards com pendingResolution estão na pilha, não são permanentes ainda
                targets = [
                    ...caster.battlefield.filter(c => c.type !== 'land' && !c.pendingResolution),
                    ...opponent.battlefield.filter(c => c.type !== 'land' && !c.pendingResolution && this.rules.canBeTargetedBy(c, caster))
                ];
                break;

            // === UNDEAD DECK SPELLS ===
            case 'undying_malice':
                // Target any creature
                targets = [
                    ...caster.battlefield.filter(c => c.type === 'creature'),
                    ...opponent.battlefield.filter(c => c.type === 'creature' && this.rules.canBeTargetedBy(c, caster))
                ];
                break;

            case 'cemetery_recruitment':
                // Target creature in your graveyard
                targets = caster.graveyard.filter(c => c.type === 'creature');
                break;

            case 'deadly_plot':
                // Modal: destroy creature OR return zombie from graveyard
                // For targeting, we show opponent creatures (destroy mode will be handled in resolution)
                targets = opponent.battlefield.filter(c =>
                    c.type === 'creature' && this.rules.canBeTargetedBy(c, caster)
                );
                // If no opponent creatures but has zombies in graveyard, those are valid
                if (targets.length === 0) {
                    targets = caster.graveyard.filter(c =>
                        c.type === 'creature' && c.subtype?.includes('Zombie')
                    );
                }
                break;

            case 'eaten_alive':
                // Target opponent creature or planeswalker
                targets = opponent.battlefield.filter(c =>
                    (c.type === 'creature' || c.type === 'planeswalker') &&
                    this.rules.canBeTargetedBy(c, caster)
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
                this.gainLife(caster, 2);
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

            case 'adamant_will':
                // +2/+2 e indestructible até o fim do turno
                target.powerModifier = (target.powerModifier || 0) + 2;
                target.toughnessModifier = (target.toughnessModifier || 0) + 2;
                if (!target.temporaryKeywords) target.temporaryKeywords = [];
                target.temporaryKeywords.push('indestructible');
                this.ui.log(`${target.name} ganhou +2/+2 e indestrutível`);
                break;

            case 'giant_growth':
                // +3/+3 até o fim do turno
                target.powerModifier = (target.powerModifier || 0) + 3;
                target.toughnessModifier = (target.toughnessModifier || 0) + 3;
                this.ui.log(`${target.name} ganhou +3/+3`);
                break;

            case 'fleeting_distraction':
                // -1/-0, draw a card
                target.powerModifier = (target.powerModifier || 0) - 1;
                this.rules.drawCard(caster);
                this.ui.log(`${target.name} recebeu -1/-0. ${caster.name} comprou um card`);
                break;

            case 'into_the_roil':
                // Bounce nonland permanent, if kicked draw a card
                const roilOwner = this.player.battlefield.includes(target) ? this.player : this.opponent;
                this.bounceToHand(target, roilOwner, 'Into the Roil');

                // Check if kicked
                if (card.kicked) {
                    this.rules.drawCard(caster);
                    this.ui.log(`Into the Roil foi encostado: ${caster.name} comprou um card`);
                }
                break;

            // === DANO ===
            case 'moment_of_craving':
                target.powerModifier = (target.powerModifier || 0) - 2;
                target.toughnessModifier = (target.toughnessModifier || 0) - 2;
                this.gainLife(caster, 2);
                this.ui.log(`${target.name} recebeu -2/-2. ${caster.name} ganhou 2 vidas`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'volley':
                target.damage = (target.damage || 0) + 3;
                this.ui.log(`Volley causou 3 de dano a ${target.name}`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'deadly_riposte':
                // 3 dano a criatura virada + ganhar 2 vidas
                target.damage = (target.damage || 0) + 3;
                this.gainLife(caster, 2);
                this.ui.log(`Deadly Riposte causou 3 de dano a ${target.name}. ${caster.name} ganhou 2 vidas`);
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
            case 'murder':
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

                        // Trigger Wildwood Scourge e outras sinergias com contadores
                        this.triggers.onCounterPlaced(ownTarget, caster, 1);

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

            // === INFERNO DECK SPELLS ===
            case 'scorching_dragonfire':
                // 3 dano a criatura. Se morrer neste turno, exila em vez de ir pro cemitério
                target.damage = (target.damage || 0) + 3;
                target.exileOnDeath = true;
                this.ui.log(`Scorching Dragonfire causou 3 de dano a ${target.name}`);
                await this.checkCreatureDeath(target, targetOwner);
                break;

            case 'fiery_annihilation':
                // 5 dano a criatura. Se morrer neste turno, exila em vez de ir pro cemitério
                target.damage = (target.damage || 0) + 5;
                target.exileOnDeath = true;
                this.ui.log(`Fiery Annihilation causou 5 de dano a ${target.name}`);
                // Também pode exilar um equipamento anexado (up to one)
                const attachedEquipments = caster === this.player
                    ? targetOwner.battlefield.filter(c =>
                        c.subtype === 'Equipment' && c.attachedTo === target.instanceId)
                    : [];
                if (attachedEquipments.length > 0 && caster === this.player) {
                    const exileEquip = await this.ui.promptYesNo({
                        title: 'Fiery Annihilation',
                        description: `Exilar ${attachedEquipments[0].name} anexado a ${target.name}?`,
                        yesText: 'Exilar equipamento',
                        noText: 'Não'
                    });
                    if (exileEquip) {
                        this.exilePermanent(attachedEquipments[0], targetOwner);
                        this.ui.log(`${attachedEquipments[0].name} foi exilado`);
                    }
                }
                await this.checkCreatureDeath(target, targetOwner);
                break;

            // === UNDEAD DECK SPELLS ===
            case 'undying_malice':
                // Give target creature "when dies, return to battlefield with +1/+1 counter"
                target.undyingMalice = true;
                this.ui.log(`${target.name} ganhou: "Quando esta criatura morre, devolva-a ao campo com um contador +1/+1"`);
                break;

            case 'cemetery_recruitment':
                // Return creature from graveyard to hand; draw if Zombie
                const crIdx = caster.graveyard.indexOf(target);
                if (crIdx > -1) {
                    caster.graveyard.splice(crIdx, 1);
                    this.triggers._resetCardState(target);
                    caster.hand.push(target);
                    this.ui.log(`${caster.name} devolveu ${target.name} do cemitério para a mão`);

                    // If Zombie, draw a card
                    if (target.subtype?.includes('Zombie')) {
                        this.rules.drawCard(caster);
                        this.ui.log(`${target.name} é um Zumbi - ${caster.name} comprou uma carta`);
                    }
                }
                break;

            case 'deadly_plot':
                // Modal: check if target is in graveyard or battlefield
                const isInGraveyard = caster.graveyard.includes(target);
                if (isInGraveyard) {
                    // Mode 2: Return Zombie from graveyard to battlefield tapped
                    const dpIdx = caster.graveyard.indexOf(target);
                    if (dpIdx > -1) {
                        caster.graveyard.splice(dpIdx, 1);
                        this.triggers._resetCardState(target);
                        target.tapped = true;
                        target.summoningSickness = true;
                        caster.battlefield.push(target);
                        this.ui.log(`Deadly Plot: ${target.name} voltou do cemitério para o campo de batalha`);
                        // Trigger ETB
                        await this.triggers.resolveETB(target, caster);
                    }
                } else {
                    // Mode 1: Destroy target creature or planeswalker
                    await this.destroyPermanent(target, targetOwner);
                    this.ui.log(`Deadly Plot: ${target.name} foi destruído`);
                }
                break;

            case 'eaten_alive':
                // Additional cost: sacrifice a creature OR pay {3}{B}
                const ownCreaturesEA = caster.battlefield.filter(c => c.type === 'creature');
                const availableManaEA = this.rules.calculateAvailableMana(caster);
                const totalManaEA = availableManaEA.W + availableManaEA.U + availableManaEA.B +
                                   availableManaEA.R + availableManaEA.G + availableManaEA.any;
                const canPayExtra = totalManaEA >= 4 && availableManaEA.B >= 1; // {3}{B} extra

                let paidCost = false;

                if (ownCreaturesEA.length > 0 && canPayExtra) {
                    // Player can choose sacrifice or pay
                    if (caster === this.player) {
                        const choice = await this.ui.promptYesNo({
                            title: 'Eaten Alive - Custo Adicional',
                            description: 'Escolha como pagar o custo adicional:',
                            yesText: 'Sacrificar criatura',
                            noText: 'Pagar {3}{B}'
                        });
                        if (choice) {
                            // Sacrifice
                            const sacTarget = await this.ui.promptTriggerTarget({
                                title: 'Eaten Alive - Sacrifício',
                                description: 'Escolha uma criatura para sacrificar:',
                                validTargets: ownCreaturesEA,
                                canSkip: false
                            });
                            if (sacTarget) {
                                await this.sacrificeCreature(sacTarget, caster);
                                paidCost = true;
                            }
                        } else {
                            // Pay {3}{B}
                            this.payColoredMana({ B: 1 }, caster);
                            this.payGenericMana(3, caster);
                            this.ui.log(`${caster.name} pagou {3}{B} como custo adicional`);
                            paidCost = true;
                        }
                    } else {
                        // AI: sacrifice if has expendable creature, otherwise pay
                        const expendable = ownCreaturesEA.filter(c =>
                            this.rules.getCreaturePower(c) <= 2
                        ).sort((a, b) =>
                            this.rules.getCreaturePower(a) - this.rules.getCreaturePower(b)
                        )[0];
                        if (expendable) {
                            await this.sacrificeCreature(expendable, caster);
                        } else {
                            this.payColoredMana({ B: 1 }, caster);
                            this.payGenericMana(3, caster);
                            this.ui.log(`${caster.name} pagou {3}{B} como custo adicional`);
                        }
                        paidCost = true;
                    }
                } else if (ownCreaturesEA.length > 0) {
                    // Must sacrifice
                    if (caster === this.player) {
                        const sacTarget = await this.ui.promptTriggerTarget({
                            title: 'Eaten Alive - Sacrifício',
                            description: 'Escolha uma criatura para sacrificar:',
                            validTargets: ownCreaturesEA,
                            canSkip: false
                        });
                        if (sacTarget) {
                            await this.sacrificeCreature(sacTarget, caster);
                            paidCost = true;
                        }
                    } else {
                        const sacTarget = ownCreaturesEA.sort((a, b) =>
                            this.rules.getCreaturePower(a) - this.rules.getCreaturePower(b)
                        )[0];
                        await this.sacrificeCreature(sacTarget, caster);
                        paidCost = true;
                    }
                } else if (canPayExtra) {
                    // Must pay mana
                    this.payColoredMana({ B: 1 }, caster);
                    this.payGenericMana(3, caster);
                    this.ui.log(`${caster.name} pagou {3}{B} como custo adicional`);
                    paidCost = true;
                }

                if (paidCost) {
                    this.exilePermanent(target, targetOwner);
                    this.ui.log(`Eaten Alive: ${target.name} foi exilado`);
                }
                break;

            default:
                this.ui.log(`${card.name} resolvido em ${target.name}`);
        }
    }

    // Exilar permanente (vai para a zona de exílio do dono)
    exilePermanent(permanent, owner) {
        const index = owner.battlefield.indexOf(permanent);
        if (index > -1) {
            // Se for criatura, desanexar equipamentos (ficam no campo) e auras (vão pro cemitério)
            if (permanent.type === 'creature') {
                this.detachFromCreature(permanent, owner);
            }
            owner.battlefield.splice(index, 1);
            // Desregistrar efeitos especiais
            this.unregisterSpecialEffect(permanent);
            // Trigger de "leaves the battlefield" (ex: Prayer of Binding)
            this.triggers.onLeaveBattlefield(permanent, owner);
            // Adiciona à zona de exílio do dono
            owner.exile.push(permanent);
        }
    }

    // Desanexa equipamentos e auras de uma criatura que está saindo do campo
    // Equipamentos: ficam no campo, desanexados (regra 704.5n)
    // Auras: vão pro cemitério (regra 704.5m)
    detachFromCreature(creature, owner) {
        const allPlayers = [this.player, this.opponent];

        allPlayers.forEach(player => {
            const toRemove = [];

            player.battlefield.forEach(card => {
                if (card.attachedTo === creature.instanceId) {
                    if (card.subtype === 'Equipment') {
                        // Equipamento fica no campo, apenas desanexa
                        delete card.attachedTo;
                        this.ui.log(`${card.name} foi desanexado`);
                    } else if (card.subtype === 'Aura') {
                        // Aura vai pro cemitério
                        toRemove.push(card);
                    }
                }
            });

            // Remover auras e colocar no cemitério
            toRemove.forEach(aura => {
                const idx = player.battlefield.indexOf(aura);
                if (idx > -1) {
                    player.battlefield.splice(idx, 1);
                    // Desregistrar efeitos especiais
                    this.unregisterSpecialEffect(aura);
                    // Trigger de "leaves the battlefield" (ex: Prayer of Binding)
                    this.triggers.onLeaveBattlefield(aura, player);
                    player.graveyard.push(aura);
                    this.ui.log(`${aura.name} foi para o cemitério`);
                }
            });
        });
    }

    /**
     * Devolve uma permanente para a mão do dono.
     * Tokens deixam de existir em vez de ir para a mão (regra 111.7).
     * @param {Object} target - A permanente a ser devolvida
     * @param {Object} owner - O jogador que controla a permanente
     * @param {string} sourceName - Nome da carta/efeito que causou o bounce (para log)
     * @returns {boolean} - true se foi devolvido para mão, false se era token
     */
    bounceToHand(target, owner, sourceName = '') {
        const index = owner.battlefield.indexOf(target);
        if (index === -1) return false;

        // Desanexar auras e equipamentos se for criatura
        if (target.type === 'creature') {
            this.detachFromCreature(target, owner);
        }

        // Remover do battlefield
        owner.battlefield.splice(index, 1);

        // Desregistrar efeitos especiais e trigger LTB
        this.unregisterSpecialEffect(target);
        this.triggers.onLeaveBattlefield(target, owner);

        // Reset card state
        target.damage = 0;
        target.powerModifier = 0;
        target.toughnessModifier = 0;
        target.temporaryKeywords = [];
        target.tapped = false;
        target.summoningSickness = false;
        target.counters = null;

        // Tokens deixam de existir quando saem do battlefield (regra 111.7)
        const isToken = target.name.toLowerCase().includes('token');
        const prefix = sourceName ? `${sourceName}: ` : '';

        if (isToken) {
            this.ui.log(`${prefix}${target.name} devolvido (token deixou de existir)`);
            return false;
        } else {
            owner.hand.push(target);
            this.ui.log(`${prefix}${target.name} devolvido para a mão de ${owner.name}`);
            return true;
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
    }

    // === HANDLERS GENÉRICOS DE KEYWORDS PARA SPELLS ===

    /**
     * Handler genérico para Scry N
     * Convenção: fim do array = topo do grimório (drawCard usa pop())
     * @param {Object} player - Jogador que está fazendo scry
     * @param {number} amount - Quantidade de cartas para ver (1, 2, etc.)
     * @returns {Promise<void>}
     */
    async handleScry(player, amount) {
        if (player.library.length === 0) return;

        // Por enquanto, implementa apenas Scry 1
        // Scry 2+ precisaria de UI para ordenar múltiplas cartas
        if (amount >= 1) {
            const topCard = player.library[player.library.length - 1];

            if (player === this.player) {
                // Jogador humano: mostrar prompt
                return new Promise((resolve) => {
                    this.ui.promptScry(topCard, (keepOnTop) => {
                        if (!keepOnTop) {
                            // Mover para o fundo (início do array)
                            player.library.pop();
                            player.library.unshift(topCard);
                            this.ui.log(`Você colocou ${topCard.name} no fundo do grimório`);
                        } else {
                            this.ui.log(`Você manteve ${topCard.name} no topo do grimório`);
                        }
                        this.ui.render();
                        resolve();
                    });
                });
            } else {
                // IA: decisão baseada em qualidade da carta
                // Manter lands e cartas de custo baixo no topo, enviar cartas caras para baixo
                const isGoodCard = topCard.type === 'land' || (topCard.cmc && topCard.cmc <= 3);
                const keepOnTop = isGoodCard || Math.random() > 0.4;

                if (!keepOnTop) {
                    player.library.pop();
                    player.library.unshift(topCard);
                }
                this.ui.log(`${player.name} fez vidência`);
            }
        }
    }

    /**
     * Handler genérico para Draw N
     * @param {Object} player - Jogador que vai comprar
     * @param {number} amount - Quantidade de cartas para comprar
     */
    handleDraw(player, amount) {
        for (let i = 0; i < amount; i++) {
            const drawn = this.rules.drawCard(player);
            if (drawn) {
                if (player === this.player) {
                    this.ui.log(`Você comprou: ${drawn.name}`);
                } else {
                    this.ui.log(`${player.name} comprou uma carta`);
                }
            }
        }
    }

    // Resolver feitiços sem alvo (agora async para suportar keywords como scry)
    async resolveSpell(card, caster) {
        // === PROCESSAR KEYWORDS GENÉRICAS PRIMEIRO ===
        if (card.keywords && card.keywords.length > 0) {
            // Scry N (ex: scry_1, scry_2)
            const scryKeyword = card.keywords.find(k => k.startsWith('scry_'));
            if (scryKeyword) {
                const amount = parseInt(scryKeyword.split('_')[1]) || 1;
                await this.handleScry(caster, amount);
            }

            // Draw N (ex: draw_1, draw_2)
            const drawKeyword = card.keywords.find(k => k.startsWith('draw_'));
            if (drawKeyword) {
                const amount = parseInt(drawKeyword.split('_')[1]) || 1;
                this.handleDraw(caster, amount);
            }
        }

        // === EFEITOS ESPECÍFICOS DE CARTAS ===
        switch (card.id) {
            case 'dragon_fodder':
                // Criar 2 tokens goblin
                for (let i = 0; i < 2; i++) {
                    caster.battlefield.push({
                        instanceId: `goblin_token_${globalInstanceCounter++}`,
                        name: 'Goblin Token',
                        type: 'creature',
                        subtype: 'Goblin',
                        power: 1,
                        toughness: 1,
                        summoningSickness: true,
                        isToken: true
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

            case 'biogenic_upgrade':
                // Biogenic Upgrade - distribute 3 +1/+1 counters among 1-3 creatures, then double each
                const bioCreatures = caster.battlefield.filter(c => c.type === 'creature');
                if (bioCreatures.length > 0) {
                    let distribution = [];

                    if (caster === this.player) {
                        // Jogador distribui contadores manualmente
                        distribution = await this.ui.promptDistributeCounters({
                            title: 'Biogenic Upgrade',
                            description: 'Distribua 3 contadores +1/+1 entre suas criaturas',
                            validTargets: bioCreatures,
                            totalCounters: 3,
                            counterType: '+1/+1',
                            thenDouble: true
                        });
                    } else {
                        // IA: põe todos em 1 criatura para maximizar (3 + existentes) * 2
                        // Prioriza criaturas que já têm contadores
                        const sorted = [...bioCreatures].sort((a, b) => {
                            const aCounters = a.counters?.plusOnePlusOne || 0;
                            const bCounters = b.counters?.plusOnePlusOne || 0;
                            return bCounters - aCounters;
                        });
                        distribution = [{ creature: sorted[0], counters: 3 }];
                    }

                    if (distribution && distribution.length > 0) {
                        // Aplicar contadores e depois dobrar cada um
                        for (const { creature: target, counters: countersToAdd } of distribution) {
                            if (!target.counters) target.counters = {};
                            const beforeCounters = target.counters.plusOnePlusOne || 0;

                            // Adicionar contadores iniciais
                            target.counters.plusOnePlusOne = beforeCounters + countersToAdd;
                            this.ui.log(`${target.name} recebeu ${countersToAdd} contador(es) +1/+1`);

                            // Trigger para os contadores iniciais
                            if (this.triggers) {
                                this.triggers.onCounterPlaced(target, caster, countersToAdd);
                            }

                            // Dobrar os contadores (isso também coloca contadores!)
                            const beforeDouble = target.counters.plusOnePlusOne;
                            target.counters.plusOnePlusOne *= 2;
                            const addedByDoubling = target.counters.plusOnePlusOne - beforeDouble;
                            this.ui.log(`Contadores em ${target.name} dobrados para ${target.counters.plusOnePlusOne}`);

                            // Trigger para os contadores adicionados pelo dobro
                            if (this.triggers && addedByDoubling > 0) {
                                this.triggers.onCounterPlaced(target, caster, addedByDoubling);
                            }
                        }
                    }
                }
                break;

            case 'seize_the_spoils':
                // Seize the Spoils - discard a card, draw 2, create treasure
                // Note: The discard is technically an additional cost (should happen during cast)
                // For simplicity, we handle it during resolution
                if (caster.hand.length > 0) {
                    let discardedCard;
                    if (caster === this.player) {
                        discardedCard = await this.ui.promptTriggerTarget({
                            title: 'Seize the Spoils - Descarte',
                            description: 'Escolha uma carta para descartar:',
                            validTargets: caster.hand,
                            canSkip: false
                        });
                    } else {
                        // IA descarta a carta de menor valor
                        discardedCard = caster.hand.sort((a, b) => (a.cmc || 0) - (b.cmc || 0))[0];
                    }
                    if (discardedCard) {
                        const idx = caster.hand.indexOf(discardedCard);
                        if (idx > -1) {
                            caster.hand.splice(idx, 1);
                            caster.graveyard.push(discardedCard);
                            this.ui.log(`${caster.name} descartou ${discardedCard.name}`);
                        }
                    }
                }
                this.rules.drawCard(caster);
                this.rules.drawCard(caster);
                this.triggers._createTreasureToken(caster, 'Seize the Spoils');
                this.ui.log(`${caster.name} comprou 2 cartas e criou um token de Tesouro`);
                break;

            // Opt agora é totalmente handled por keywords (scry_1, draw_1)
            // Não precisa mais de case específico!

            // === UNDEAD DECK SORCERIES ===

            case 'mind_rot':
                // Mind Rot - target opponent discards 2 cards
                const opponent = caster === this.player ? this.opponent : this.player;
                const discardCount = Math.min(2, opponent.hand.length);

                for (let i = 0; i < discardCount; i++) {
                    let discardTarget;
                    if (opponent === this.player) {
                        // Human player chooses
                        discardTarget = await this.ui.promptTriggerTarget({
                            title: 'Mind Rot - Descarte',
                            description: `Escolha um card para descartar (${i + 1}/${discardCount}):`,
                            validTargets: opponent.hand,
                            canSkip: false
                        });
                    } else {
                        // AI discards lowest CMC
                        discardTarget = opponent.hand.sort((a, b) => (a.cmc || 0) - (b.cmc || 0))[0];
                    }
                    if (discardTarget) {
                        const idx = opponent.hand.indexOf(discardTarget);
                        if (idx > -1) {
                            opponent.hand.splice(idx, 1);
                            opponent.graveyard.push(discardTarget);
                            this.ui.log(`${opponent.name} descartou ${discardTarget.name}`);
                        }
                    }
                }
                break;

            case 'rise_again':
                // Rise Again - return target creature from your graveyard to battlefield
                const creaturesInGY = caster.graveyard.filter(c => c.type === 'creature');
                if (creaturesInGY.length > 0) {
                    let targetCreature;
                    if (caster === this.player) {
                        targetCreature = await this.ui.promptTriggerTarget({
                            title: 'Rise Again - Reanimar',
                            description: 'Escolha uma criatura para reanimar:',
                            validTargets: creaturesInGY,
                            canSkip: false
                        });
                    } else {
                        // AI picks highest CMC creature
                        targetCreature = creaturesInGY.sort((a, b) => (b.cmc || 0) - (a.cmc || 0))[0];
                    }
                    if (targetCreature) {
                        const idx = caster.graveyard.indexOf(targetCreature);
                        if (idx > -1) {
                            caster.graveyard.splice(idx, 1);
                            this.triggers._resetCardState(targetCreature);
                            targetCreature.summoningSickness = true;
                            caster.battlefield.push(targetCreature);
                            this.ui.log(`${targetCreature.name} voltou do cemitério para o campo de batalha`);
                            await this.triggers.resolveETB(targetCreature, caster);
                        }
                    }
                }
                break;

            default:
                // Feitiço genérico ou já processado por keywords
                break;
        }
    }

    // === UTILITÁRIOS DE ESTADO DE CRIATURAS ===

    async checkCreatureDeath(creature, owner) {
        // markedForDeath: deathtouch via Bite Down ou efeitos similares
        if (creature.markedForDeath) {
            delete creature.markedForDeath;
            if (creature.exileOnDeath) {
                this.exilePermanent(creature, owner);
                this.ui.log(`${creature.name} foi exilado`);
            } else {
                await this.destroyPermanent(creature, owner);
            }
            return;
        }

        const toughness = this.rules.getCreatureToughness(creature);
        const damage = creature.damage || 0;
        const hasIndestructible = this.rules.hasKeyword(creature, 'indestructible', false);

        // Toughness <= 0: criatura morre mesmo com indestructible (regra 704.5f)
        if (toughness <= 0) {
            if (creature.exileOnDeath) {
                this.exilePermanent(creature, owner);
                this.ui.log(`${creature.name} foi exilado`);
            } else {
                await this.destroyPermanent(creature, owner);
            }
            return;
        }

        // Dano letal: criatura com indestructible sobrevive (regra 702.12b)
        if (damage >= toughness) {
            if (hasIndestructible) {
                // Criatura sobrevive - indestructible previne destruição por dano
                return;
            }
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

            // Check if creature was returned by undying effect (Undying Malice)
            if (permanent._returnedByUndying) {
                delete permanent._returnedByUndying;
                return; // Creature is already back on battlefield, don't move to graveyard
            }

            // Se for criatura, desanexar equipamentos (ficam no campo) e auras (vão pro cemitério)
            if (permanent.type === 'creature') {
                this.detachFromCreature(permanent, owner);
            }

            owner.battlefield.splice(index, 1);
            // Desregistrar efeitos especiais
            this.unregisterSpecialEffect(permanent);
            // Trigger de "leaves the battlefield" (ex: Prayer of Binding)
            this.triggers.onLeaveBattlefield(permanent, owner);
            owner.graveyard.push(permanent);

            // Tokens deixam de existir fora do battlefield (regra 111.7 / 704.5d)
            if (permanent.isToken) {
                const tokenIdx = owner.graveyard.indexOf(permanent);
                if (tokenIdx > -1) {
                    owner.graveyard.splice(tokenIdx, 1);
                }
            }
        }
    }

    /**
     * Sacrifica uma criatura (vai para o cemitério, dispara death triggers)
     * Similar a destroyPermanent mas semanticamente é um sacrifício
     */
    async sacrificeCreature(creature, owner) {
        const index = owner.battlefield.indexOf(creature);
        if (index > -1) {
            this.ui.log(`${owner.name} sacrificou ${creature.name}`);

            // Chamar death triggers ANTES de mover para o cemitério
            if (this.triggers) {
                await this.triggers.onCreatureDeath(creature, owner);
            }

            // Desanexar equipamentos e auras
            this.detachFromCreature(creature, owner);

            owner.battlefield.splice(index, 1);
            this.unregisterSpecialEffect(creature);
            this.triggers.onLeaveBattlefield(creature, owner);

            // Check if creature was returned by undying effect
            if (!creature._returnedByUndying) {
                owner.graveyard.push(creature);
                // Tokens deixam de existir fora do battlefield (regra 111.7 / 704.5d)
                if (creature.isToken) {
                    const tokenIdx = owner.graveyard.indexOf(creature);
                    if (tokenIdx > -1) {
                        owner.graveyard.splice(tokenIdx, 1);
                    }
                }
            }
            delete creature._returnedByUndying;

            this.ui.render();
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

    // Verifica se uma carta no cemitério tem habilidade ativada que pode ser usada
    canActivateGraveyardAbility(card, player) {
        // Verificar se a carta está de fato no cemitério
        if (!player.graveyard.includes(card)) return false;

        switch (card.id) {
            case 'reassembling_skeleton': {
                // {1}{B}: Return from graveyard to battlefield tapped
                // Precisa de 1 preto + 1 genérico = 2 mana total com pelo menos 1 preto
                const mana = this.rules.calculateAvailableMana(player);
                const totalMana = Object.values(mana).reduce((a, b) => a + b, 0);
                const hasBlack = (mana.B || 0) >= 1 || (mana.any || 0) >= 1;
                return hasBlack && totalMana >= 2;
            }
            case 'suspicious_shambler': {
                // {4}{B}{B}, Exile from graveyard: Create two 2/2 Zombie tokens
                // Activate only as a sorcery (main phase, stack empty, active player)
                if (!this.isPlayerTurn() && player === this.player) return false;
                if (!this.isStackEmpty()) return false;
                const phase = this.phase;
                if (phase !== 'MAIN1' && phase !== 'MAIN2') return false;
                const mana = this.rules.calculateAvailableMana(player);
                const blackAvailable = (mana.B || 0) + (mana.any || 0);
                const totalMana = Object.values(mana).reduce((a, b) => a + b, 0);
                return blackAvailable >= 2 && totalMana >= 6;
            }
            default:
                return false;
        }
    }

    // Verifica se uma carta tem habilidade ativada e pode usá-la
    canActivateAbility(card, player) {
        // Treasure tokens podem ser sacrificados a qualquer momento (não requer tap)
        if (card.keywords?.includes('sacrifice_for_mana')) {
            return true; // Sempre pode sacrificar tesouro para mana
        }

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
                // 3WW: atacantes ganham +X/+X (só após atacantes confirmados)
                // Só pode ser ativada após attackers serem declarados (currentAttackers preenchido)
                if (this.currentAttackers.length === 0) return false;
                // Permitir durante declare_blockers e combat_damage (após atacantes confirmados)
                if (this.phase !== PHASES.DECLARE_BLOCKERS && this.phase !== PHASES.COMBAT_DAMAGE) return false;
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
                // 3W: coloca +1/+1 em outra criatura atacante (só após atacantes confirmados)
                // Só pode ser ativada após attackers serem declarados (currentAttackers preenchido)
                if (this.currentAttackers.length === 0) return false;
                // Permitir durante declare_blockers e combat_damage (após atacantes confirmados)
                if (this.phase !== PHASES.DECLARE_BLOCKERS && this.phase !== PHASES.COMBAT_DAMAGE) return false;
                const leoninMana = this.rules.calculateAvailableMana(player);
                const leoninTotalMana = Object.values(leoninMana).reduce((a,b) => a+b, 0);
                // Verificar se há outro atacante além do Leonin
                const hasOtherAttacker = this.currentAttackers.some(c => c.instanceId !== card.instanceId);
                // Custo 3W: precisa de 1W específico + 3 qualquer = 4 total, com pelo menos 1W
                return leoninMana.W >= 1 && leoninTotalMana >= 4 && hasOtherAttacker;

            case 'spectral_sailor':
                // 3U: Compre uma carta (não precisa virar, pode ser ativada a qualquer momento)
                const spectralMana = this.rules.calculateAvailableMana(player);
                const spectralTotalMana = Object.values(spectralMana).reduce((a,b) => a+b, 0);
                // Custo 3U: precisa de 1U específico + 3 qualquer = 4 total, com pelo menos 1U
                return spectralMana.U >= 1 && spectralTotalMana >= 4;

            case 'pirates_cutlass':
            case 'quick_draw_katana':
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

            case 'thrashing_brontodon':
                // {1}, Sacrifice: Destroy target artifact or enchantment
                const brontoOpponent = player === this.player ? this.opponent : this.player;
                const brontoTargets = brontoOpponent.battlefield.filter(c =>
                    c.type === 'artifact' || c.type === 'enchantment'
                );
                const brontoMana = Object.values(this.rules.calculateAvailableMana(player)).reduce((a,b) => a+b, 0);
                return brontoMana >= 1 && brontoTargets.length > 0;

            case 'mild_mannered_librarian':
                // {3}{G}: Transform, +2 counters, draw a card (activate only once)
                if (card.transformed) return false; // Already transformed
                const librarianMana = this.rules.calculateAvailableMana(player);
                const librarianTotal = Object.values(librarianMana).reduce((a,b) => a+b, 0);
                return librarianMana.G >= 1 && librarianTotal >= 4;

            case 'mystic_archaeologist':
                // {3}{U}{U}: Draw two cards
                const archaeologistMana = this.rules.calculateAvailableMana(player);
                const archaeologistTotal = Object.values(archaeologistMana).reduce((a,b) => a+b, 0);
                return archaeologistMana.U >= 2 && archaeologistTotal >= 5;

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

        // Treasure Token: sacrificar para adicionar mana de qualquer cor
        if (card.keywords?.includes('sacrifice_for_mana')) {
            const playerKey = player === this.player ? 'player' : 'opponent';
            let chosenColor;

            if (player === this.player) {
                // Jogador humano escolhe a cor
                chosenColor = await this.ui.promptColorChoice({
                    title: 'Treasure Token',
                    description: 'Escolha a cor de mana a adicionar:',
                    colors: ['W', 'U', 'B', 'R', 'G']
                });
            } else {
                // IA escolhe a cor mais necessária para o deck
                chosenColor = this.chooseColorForAI(player, ['W', 'U', 'B', 'R', 'G']);
            }

            // Adicionar mana flutuante
            this.floatingMana[playerKey][chosenColor] += 1;

            // Sacrificar o token (remover do battlefield)
            const tokenIndex = player.battlefield.findIndex(c => c.instanceId === card.instanceId);
            if (tokenIndex !== -1) {
                player.battlefield.splice(tokenIndex, 1);
            }

            const colorNames = { W: 'branco', U: 'azul', B: 'preto', R: 'vermelho', G: 'verde' };
            this.ui.log(`${card.name} sacrificado: +1 mana ${colorNames[chosenColor]}`);
            this.ui.render();
            return true;
        }

        switch (card.id) {
            case 'vampire_neonate':
                // 2, T: cada oponente perde 1 vida e você ganha 1 vida
                this.payGenericMana(2, player);
                card.tapped = true;
                this.loseLife(opponent, 1);
                this.gainLife(player, 1);
                this.ui.log(`Vampire Neonate: ${opponent.name} perdeu 1 vida, ${player.name} ganhou 1 vida`);
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
                        this.cantBeBlockedThisTurn.push(smugglerTarget.instanceId);
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
                // X = número de atacantes confirmados (inclui Jazal se estiver atacando)
                const attackerCount = this.currentAttackers.length;
                this.currentAttackers.forEach(attacker => {
                    attacker.powerModifier = (attacker.powerModifier || 0) + attackerCount;
                    attacker.toughnessModifier = (attacker.toughnessModifier || 0) + attackerCount;
                });
                this.ui.log(`Jazal Goldmane: Atacantes ganharam +${attackerCount}/+${attackerCount}`);
                this.ui.render();
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
                // Usar atacantes confirmados (exclui o próprio Leonin)
                const leoninTargets = this.currentAttackers.filter(c => c.instanceId !== card.instanceId);
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
                    // Verificar se a criatura ainda está no campo de batalha
                    const targetStillExists = player.battlefield.some(c => c.instanceId === target.instanceId);
                    if (!targetStillExists) {
                        this.ui.log(`[ERRO] Pirate's Cutlass: criatura ${target.name} (${target.instanceId}) não está mais no campo`);
                        return false;
                    }

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
                    return true;
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
                        const success = attachToCreature(selected);
                        if (!success) return false;
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

            case 'quick_draw_katana':
                // Equip 2: anexar a outra criatura
                const katanaTargets = player.battlefield.filter(c =>
                    c.type === 'creature' && c.instanceId !== card.attachedTo
                );

                if (katanaTargets.length === 0) {
                    this.ui.log(`Não há criaturas válidas para equipar`);
                    return false;
                }

                const attachKatana = (target) => {
                    // Verificar se a criatura ainda está no campo de batalha
                    const targetStillExists = player.battlefield.some(c => c.instanceId === target.instanceId);
                    if (!targetStillExists) {
                        this.ui.log(`[ERRO] Quick-Draw Katana: criatura ${target.name} (${target.instanceId}) não está mais no campo`);
                        return false;
                    }

                    this.payGenericMana(2, player);
                    const oldTarget = card.attachedTo;
                    card.attachedTo = target.instanceId;

                    if (oldTarget) {
                        const oldCreature = player.battlefield.find(c => c.instanceId === oldTarget);
                        if (oldCreature) {
                            this.ui.log(`Quick-Draw Katana movida de ${oldCreature.name} para ${target.name}`);
                        } else {
                            this.ui.log(`Quick-Draw Katana equipada em ${target.name}`);
                        }
                    } else {
                        this.ui.log(`Quick-Draw Katana equipada em ${target.name}`);
                    }
                    this.ui.render();
                    return true;
                };

                if (player === this.player) {
                    // Jogador escolhe criatura alvo
                    const katanaSelected = await this.ui.promptTriggerTarget({
                        title: `Quick-Draw Katana - Equipar`,
                        description: 'Escolha uma criatura para equipar (custo: 2 mana):',
                        validTargets: katanaTargets,
                        canSkip: true
                    });
                    if (katanaSelected) {
                        const success = attachKatana(katanaSelected);
                        if (!success) return false;
                    } else {
                        return false; // Cancelou
                    }
                } else {
                    // IA escolhe a criatura mais forte
                    const katanaAITarget = katanaTargets.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                    attachKatana(katanaAITarget);
                }
                break;

            case 'thrashing_brontodon':
                // {1}, Sacrifice: Destroy target artifact or enchantment
                const brontoValidTargets = opponent.battlefield.filter(c =>
                    c.type === 'artifact' || c.type === 'enchantment'
                );

                if (brontoValidTargets.length === 0) {
                    this.ui.log('Não há artefatos ou encantamentos para destruir');
                    return false;
                }

                let brontoTarget;
                if (player === this.player) {
                    brontoTarget = await this.ui.promptTriggerTarget({
                        title: 'Thrashing Brontodon',
                        description: 'Escolha um artefato ou encantamento para destruir:',
                        validTargets: brontoValidTargets,
                        canSkip: true
                    });
                    if (!brontoTarget) {
                        return false; // Cancelou
                    }
                } else {
                    // IA prioriza equipamentos anexados, depois outros
                    const attached = brontoValidTargets.filter(c => c.attachedTo);
                    brontoTarget = attached.length > 0 ? attached[0] : brontoValidTargets[0];
                }

                // Pagar custo e sacrificar o Brontodon
                this.payGenericMana(1, player);
                await this.destroyPermanent(card, player);

                // Destruir o alvo
                const brontoTargetOwner = this.player.battlefield.includes(brontoTarget) ? this.player : this.opponent;
                await this.destroyPermanent(brontoTarget, brontoTargetOwner);
                this.ui.log(`Thrashing Brontodon destruiu ${brontoTarget.name}`);
                break;

            case 'mild_mannered_librarian':
                // {3}{G}: Transform, +2 counters, draw a card (activate only once)
                this.payColoredMana({ generic: 3, G: 1 }, player);

                // Transform (mark as transformed, change subtype)
                card.transformed = true;
                card.subtype = 'Werewolf';

                // Add 2 +1/+1 counters
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 2;

                // Draw a card
                this.rules.drawCard(player);

                // Trigger counter synergy
                if (this.triggers) {
                    this.triggers.onCounterPlaced(card, player, 2);
                }

                this.ui.log(`Mild-Mannered Librarian se transformou em Werewolf, ganhou 2 contadores +1/+1, ${player.name} comprou uma carta`);
                break;

            case 'mystic_archaeologist':
                // {3}{U}{U}: Draw two cards
                this.payColoredMana({ generic: 3, U: 2 }, player);
                this.rules.drawCard(player);
                this.rules.drawCard(player);
                this.ui.log(`Mystic Archaeologist: ${player.name} comprou 2 cartas`);
                break;
        }

        this.ui.render();
        return true;
    }

    // Ativa habilidade de uma carta no cemitério
    async activateGraveyardAbility(card, player) {
        if (!this.canActivateGraveyardAbility(card, player)) {
            return false;
        }

        switch (card.id) {
            case 'reassembling_skeleton':
                // {1}{B}: Return from graveyard to battlefield tapped
                this.payColoredMana({ B: 1 }, player);
                this.payGenericMana(1, player);

                // Remover do cemitério
                const graveyardIndex = player.graveyard.indexOf(card);
                if (graveyardIndex > -1) {
                    player.graveyard.splice(graveyardIndex, 1);
                }

                // Colocar no campo de batalha virado
                card.tapped = true;
                card.summoningSickness = true;
                card.damage = 0;
                card.powerModifier = 0;
                card.toughnessModifier = 0;
                card.counters = null;
                player.battlefield.push(card);

                this.ui.log(`${card.name} retornou do cemitério para o campo de batalha (virado)`);
                break;

            case 'suspicious_shambler':
                // {4}{B}{B}, Exile from graveyard: Create two 2/2 Zombie tokens
                this.payColoredMana({ B: 2 }, player);
                this.payGenericMana(4, player);

                // Exilar do cemitério (remover do graveyard, colocar no exile)
                const shamblerIndex = player.graveyard.indexOf(card);
                if (shamblerIndex > -1) {
                    player.graveyard.splice(shamblerIndex, 1);
                }
                if (!player.exile) player.exile = [];
                player.exile.push(card);

                // Criar dois tokens Zumbi 2/2
                this.triggers._createZombieToken(player);
                this.triggers._createZombieToken(player);

                this.ui.log(`${card.name}: exilado do cemitério, criou dois tokens Zumbi 2/2`);
                window.soundManager?.playMagic();
                break;
        }

        this.ui.render();
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
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

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
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

        // Esvaziar floating mana no início de cada fase (regras MTG)
        this.floatingMana = { player: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, opponent: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 } };

        // Log descritivo para cada fase (mais detalhado que PHASE_NAMES)
        const phaseLogNames = {
            [PHASES.UNTAP]: 'Untap',
            [PHASES.UPKEEP]: 'Upkeep',
            [PHASES.DRAW]: 'Draw',
            [PHASES.MAIN1]: 'Main 1',
            [PHASES.COMBAT_BEGIN]: 'Beginning of Combat',
            [PHASES.DECLARE_ATTACKERS]: 'Declare Attackers',
            [PHASES.DECLARE_BLOCKERS]: 'Declare Blockers',
            [PHASES.COMBAT_DAMAGE]: 'Combat Damage',
            [PHASES.COMBAT_END]: 'End of Combat',
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
                this.cantBlockThisTurn = [];
                this.cantBeBlockedThisTurn = [];
                // Resetar contador de draws para o jogador ativo (para triggers de segundo draw)
                if (this.drawsThisTurn) {
                    const playerKey = this.activePlayer === this.player ? 'player' : 'opponent';
                    this.drawsThisTurn[playerKey] = 0;
                }
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
                // Limpar dano das criaturas e modificadores temporários (AMBOS os jogadores)
                [this.player, this.opponent].forEach(p => {
                    p.battlefield.forEach(c => {
                        c.damage = 0;
                        c.powerModifier = 0;
                        c.toughnessModifier = 0;
                        c.temporaryKeywords = [];
                        c.mustBeBlocked = false; // Limpar flag de must be blocked
                        c.exileOnDeath = false; // Limpar flag de exílio (Scorching Dragonfire etc.)
                        c.markedForDeath = false; // Limpar flag de deathtouch mark
                    });
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

        this.currentAttackers = attackers;

        // Marcar que este jogador atacou neste turno (para Raid)
        const playerKey = attackingPlayer === this.player ? 'player' : 'opponent';
        this.attackedThisTurn[playerKey] = true;

        // Virar atacantes (exceto vigilance)
        attackers.forEach(attacker => {
            if (!this.rules.hasKeyword(attacker, 'vigilance', true)) {
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

        // Validar bloqueios contra criaturas com menace (requer 2+ bloqueadores)
        const menaceValidation = this.validateMenaceBlocks(assignments);
        if (!menaceValidation.valid) {
            this.ui.log(`⚠️ ${menaceValidation.message}`);
            // Remover bloqueios inválidos (menace com apenas 1 bloqueador)
            menaceValidation.invalidAttackers.forEach(attacker => {
                delete assignments[attacker.instanceId];
            });
        }

        this.blockerAssignments = assignments;

        if (Object.keys(assignments).length > 0) {
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

    /**
     * Valida se bloqueios contra criaturas com menace têm pelo menos 2 bloqueadores
     * @param {Object} assignments - Mapa de bloqueios {attackerId: [blockers]}
     * @returns {Object} { valid: boolean, message: string, invalidAttackers: Array }
     */
    validateMenaceBlocks(assignments) {
        const invalidAttackers = [];

        for (const attackerId in assignments) {
            const blockers = assignments[attackerId];
            const attacker = this.currentAttackers.find(a => a.instanceId === attackerId);

            if (!attacker) continue;

            // Verificar se atacante tem menace
            if (this.rules.hasKeyword(attacker, 'menace', true)) {
                // Menace requer pelo menos 2 bloqueadores
                if (blockers.length < 2) {
                    invalidAttackers.push(attacker);
                }
            }
        }

        if (invalidAttackers.length > 0) {
            const names = invalidAttackers.map(a => a.name).join(', ');
            return {
                valid: false,
                message: `${names} tem Ameaçar (Menace) - precisa de pelo menos 2 bloqueadores!`,
                invalidAttackers
            };
        }

        return { valid: true, message: '', invalidAttackers: [] };
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

        // Som de ataque (quando o combate é resolvido)
        if (activeAttackers.length > 0) {
            window.soundManager.playAttack();
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
        if (results.damageToPlayers.defender > 0) {
            this.loseLife(defendingPlayer, results.damageToPlayers.defender);
        }

        // Aplicar vida ganha (lifelink)
        if (results.lifeGained.attacker > 0) {
            this.gainLife(attackingPlayer, results.lifeGained.attacker);
            this.ui.log(`${attackingPlayer.name} ganhou ${results.lifeGained.attacker} vidas (lifelink)`);
        }
        if (results.lifeGained.defender > 0) {
            this.gainLife(defendingPlayer, results.lifeGained.defender);
            this.ui.log(`${defendingPlayer.name} ganhou ${results.lifeGained.defender} vidas (lifelink)`);
        }

        // Remover criaturas mortas em batch (SBA Rule 704.3 - simultaneous)
        // Deduplicate first (creature may appear multiple times)
        const uniqueDeaths = [...new Set(results.creaturesDied)];
        for (const creature of uniqueDeaths) {
            const owner = this.player.battlefield.includes(creature) ? this.player : this.opponent;
            await this.destroyPermanent(creature, owner);
            // Only log death if creature actually left the battlefield (not returned by Undying Malice etc.)
            if (!owner.battlefield.includes(creature)) {
                this.ui.log(`${creature.name} morreu em combate`);
            }
        }

        // Sacrificar criaturas marcadas com sacrificeOnCombatDamage (Dropkick Bomber ability)
        for (const attacker of this.currentAttackers) {
            if (attacker.sacrificeOnCombatDamage && !results.creaturesDied.includes(attacker)) {
                const owner = this.player.battlefield.includes(attacker) ? this.player : this.opponent;
                await this.destroyPermanent(attacker, owner);
                this.ui.log(`${attacker.name} foi sacrificado após causar dano de combate`);
            }
        }

        // Limpar linhas de combate e dados de combate antes de verificar game over
        // (senão o render do view mode redesenha as linhas)
        this.blockerAssignments = {};
        this.ui.blockerAssignments = {};
        this.ui.clearCombatLines();

        // Limpar currentAttackers - filtrar apenas atacantes que ainda estão vivos
        this.currentAttackers = this.currentAttackers.filter(attacker =>
            this.player.battlefield.includes(attacker) || this.opponent.battlefield.includes(attacker)
        );

        // Limpar seleção de atacantes da UI
        this.ui.selectedAttackers = [];

        // Verificar fim de jogo após processar todas as mortes
        this.checkGameOver();
        if (this.gameOver) return;

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
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

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

        // Cancelar qualquer seleção de alvo pendente
        this.ui.cancelTargeting();

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
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

        // Cancelar qualquer seleção de alvo pendente do jogador
        this.ui.cancelTargeting();

        // Indicar início do turno da IA
        this.ui.log('--- Turno do Oponente ---');
        await this.delay(600);

        // Untap
        this.phase = PHASES.UNTAP;
        this.ui.log('Fase: Untap');
        this.rules.untapAll(this.opponent);
        this.opponent.landsPlayedThisTurn = 0;
        this.rules.removeSummoningSickness(this.opponent);
        this.ui.render();
        await this.delay(600);

        // Draw
        this.phase = PHASES.DRAW;
        this.ui.log('Fase: Draw');
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
        this.ui.log('Fase: Beginning of Combat');
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
     * Delega seleção de cartas ao AI (treasure handling, mana reservation, aura validation)
     */
    async executeAIMainPhaseWithPriority() {
        const opponent = this.opponent;
        const phase = this.phase === PHASES.MAIN1 ? 1 : 2;

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

        // 2. Jogar cartas uma por vez, delegando seleção ao AI
        let playedSomething = true;
        while (playedSomething) {
            playedSomething = false;

            const { card: cardToPlay, useTreasures, treasureInfo } = this.ai.getNextCardToPlay(phase);

            if (cardToPlay) {
                if (useTreasures && treasureInfo) {
                    await this.ai.useTreasuresForCard(opponent, treasureInfo.treasuresNeeded, treasureInfo.colorsNeeded);
                }

                if (this.rules.canPlayCard(cardToPlay, opponent)) {
                    await this.delay(600);
                    const played = await this.playCard(cardToPlay, opponent);

                    if (played) {
                        this.ui.render();
                        playedSomething = true;
                        await this.delay(400);
                    }
                }
            }

            // Verificar game over entre cartas
            if (this.gameOver) return;
        }

        // 3. Usar habilidades ativadas (Main Phase 2)
        if (phase === 2 && this.ai.config.useActivatedAbilities) {
            await this.ai.useActivatedAbilities();
        }
    }

    async continueAfterBlocking() {
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

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

            // Verificar se o jogo acabou após o combate
            if (this.gameOver) return;

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
        // Não continuar se o jogo acabou
        if (this.gameOver) return;

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

        // Limpar dano e modificadores temporários das criaturas do jogador também
        // (MTG rule: dano é removido no cleanup de CADA turno, não apenas do próprio)
        this.player.battlefield.forEach(c => {
            c.damage = 0;
            c.powerModifier = 0;
            c.toughnessModifier = 0;
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

        // Parar música de fundo e tocar som de vitória/derrota
        if (window.soundManager) {
            window.soundManager.stopMusic();
            if (winner === 'player') {
                window.soundManager.playVictory();
            } else {
                window.soundManager.playDefeat();
            }
        }

        // Limpar linhas de combate antes de mostrar tela de fim
        this.ui.clearCombatLines();

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
}

// Exportar
window.GameState = GameState;
