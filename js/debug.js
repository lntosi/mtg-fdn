// === Modo Debug para Testes Manuais ===
// Comandos disponíveis via console do navegador: window.debug.*

class DebugMode {
    constructor() {
        this.enabled = false;
        this.game = null;
    }

    // Inicializa o modo debug com referência ao jogo
    init(gameInstance) {
        this.game = gameInstance;
        this.enabled = true;
        console.log('%c[DEBUG MODE] Modo debug inicializado!', 'color: #f1c40f; font-weight: bold;');
        this.help();
    }

    // Mostra ajuda com todos os comandos disponíveis
    help() {
        console.log(`
%c=== MTG Debug Commands ===

%cdebug.help()%c - Mostra esta ajuda

%c--- Cartas ---%c
%cdebug.draw(nome)%c - Compra carta específica por nome (ex: "Savannah Lions")
%cdebug.drawAny(nome)%c - Compra carta de qualquer deck por nome
%cdebug.addToHand(nome, player?)%c - Adiciona carta à mão (player: "player"/"opponent")
%cdebug.addToBattlefield(nome, player?)%c - Coloca carta direto no campo
%cdebug.listCards(deck?)%c - Lista todas as cartas disponíveis

%c--- Vida e Mana ---%c
%cdebug.setLife(amount, player?)%c - Define vida (player: "player"/"opponent")
%cdebug.addMana(color, amount?)%c - Adiciona mana ao pool (color: W/U/B/R/G/C)
%cdebug.untapAll(player?)%c - Desvirar todas as permanentes

%c--- Turno e Fase ---%c
%cdebug.setPhase(phase)%c - Pula para fase específica
%cdebug.nextTurn()%c - Avança para o próximo turno
%cdebug.skipTo(phase)%c - Avança turnos até chegar na fase

%c--- Mão Inicial ---%c
%cdebug.setHand(nomes[])%c - Define mão inicial com cartas específicas
%cdebug.clearHand(player?)%c - Limpa a mão do jogador

%c--- Estado do Jogo ---%c
%cdebug.state()%c - Mostra estado atual do jogo
%cdebug.battlefield()%c - Lista criaturas em campo
%cdebug.hand()%c - Mostra mão do jogador
%cdebug.kill(nome)%c - Mata criatura específica

%c--- Testes Rápidos ---%c
%cdebug.setupCombat()%c - Prepara cenário de combate básico
%cdebug.fullMana()%c - Dá 10 de cada mana

%c--- Undo ---%c
%cdebug.undo()%c - Desfaz a última ação
%cdebug.history()%c - Mostra histórico de estados salvos
%cdebug.enableUndo()%c - Habilita o sistema de undo
%cdebug.disableUndo()%c - Desabilita o sistema de undo
%cdebug.clearHistory()%c - Limpa o histórico de undo

`,
        'color: #f1c40f; font-weight: bold; font-size: 14px;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #e74c3c; font-weight: bold;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;',
        'color: #3498db;', 'color: #95a5a6;'
        );
        return 'Use debug.<comando>() para executar';
    }

    // Verifica se o jogo está inicializado
    _checkGame() {
        if (!this.game || !this.game.player) {
            console.error('[DEBUG] Jogo não inicializado. Inicie uma partida primeiro.');
            return false;
        }
        return true;
    }

    // Obtém jogador por nome
    _getPlayer(playerName = 'player') {
        if (playerName === 'player' || playerName === 'p') {
            return this.game.player;
        } else if (playerName === 'opponent' || playerName === 'o' || playerName === 'ai') {
            return this.game.opponent;
        }
        return this.game.player;
    }

    // === CARTAS ===

    // Compra carta específica do deck do jogador por nome
    draw(cardName) {
        if (!this._checkGame()) return;

        const player = this.game.player;
        const cardIndex = player.library.findIndex(c =>
            c.name.toLowerCase().includes(cardName.toLowerCase())
        );

        if (cardIndex === -1) {
            console.error(`[DEBUG] Carta "${cardName}" não encontrada no deck.`);
            this.listCards();
            return;
        }

        const card = player.library.splice(cardIndex, 1)[0];
        player.hand.push(card);
        this.game.ui.render();
        console.log(`%c[DEBUG] Comprou: ${card.name}`, 'color: #2ecc71;');
        return card;
    }

    // Compra carta de qualquer deck por nome
    drawAny(cardName) {
        if (!this._checkGame()) return;

        // Buscar em todos os decks
        let cardTemplate = null;
        for (const deckKey of Object.keys(CARD_DATABASE)) {
            const deck = CARD_DATABASE[deckKey];
            const found = deck.cards.find(c =>
                c.name.toLowerCase().includes(cardName.toLowerCase())
            );
            if (found) {
                cardTemplate = { ...found };
                break;
            }
        }

        if (!cardTemplate) {
            console.error(`[DEBUG] Carta "${cardName}" não encontrada em nenhum deck.`);
            return;
        }

        // Criar instância da carta
        const card = {
            ...cardTemplate,
            instanceId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.game.player.hand.push(card);
        this.game.ui.render();
        console.log(`%c[DEBUG] Adicionou à mão: ${card.name}`, 'color: #2ecc71;');
        return card;
    }

    // Adiciona carta diretamente à mão
    addToHand(cardName, playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);

        // Buscar em todos os decks
        let cardTemplate = null;
        for (const deckKey of Object.keys(CARD_DATABASE)) {
            const deck = CARD_DATABASE[deckKey];
            const found = deck.cards.find(c =>
                c.name.toLowerCase().includes(cardName.toLowerCase())
            );
            if (found) {
                cardTemplate = { ...found };
                break;
            }
        }

        if (!cardTemplate) {
            console.error(`[DEBUG] Carta "${cardName}" não encontrada.`);
            return;
        }

        const card = {
            ...cardTemplate,
            instanceId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        player.hand.push(card);
        this.game.ui.render();
        console.log(`%c[DEBUG] ${player.name} recebeu: ${card.name}`, 'color: #2ecc71;');
        return card;
    }

    // Coloca carta diretamente no campo de batalha
    addToBattlefield(cardName, playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);

        // Buscar em todos os decks
        let cardTemplate = null;
        for (const deckKey of Object.keys(CARD_DATABASE)) {
            const deck = CARD_DATABASE[deckKey];
            const found = deck.cards.find(c =>
                c.name.toLowerCase().includes(cardName.toLowerCase())
            );
            if (found) {
                cardTemplate = { ...found };
                break;
            }
        }

        if (!cardTemplate) {
            console.error(`[DEBUG] Carta "${cardName}" não encontrada.`);
            return;
        }

        const card = {
            ...cardTemplate,
            instanceId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tapped: false,
            summoningSickness: cardTemplate.type === 'creature' &&
                              !(cardTemplate.keywords && cardTemplate.keywords.includes('haste'))
        };

        player.battlefield.push(card);
        this.game.ui.render();
        console.log(`%c[DEBUG] ${card.name} entrou no campo de ${player.name}`, 'color: #2ecc71;');
        return card;
    }

    // Lista todas as cartas disponíveis
    listCards(deckName = null) {
        const decks = deckName ? [deckName] : Object.keys(CARD_DATABASE);

        decks.forEach(dk => {
            const deck = CARD_DATABASE[dk];
            if (!deck) return;

            console.log(`%c=== ${deck.name} (${deck.color}) ===`, 'color: #f1c40f; font-weight: bold;');
            deck.cards.forEach(c => {
                const cost = c.cost || '-';
                const stats = c.type === 'creature' ? `${c.power}/${c.toughness}` : '';
                console.log(`  ${c.name} [${c.type}] ${cost} ${stats}`);
            });
        });
        return 'Cartas listadas acima';
    }

    // === VIDA E MANA ===

    // Define vida de um jogador
    setLife(amount, playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);
        const oldLife = player.life;
        player.life = amount;
        this.game.ui.render();
        console.log(`%c[DEBUG] ${player.name}: ${oldLife} → ${amount} vida`, 'color: #e74c3c;');
        return player.life;
    }

    // Adiciona mana ao pool
    addMana(color, amount = 1) {
        if (!this._checkGame()) return;

        const validColors = ['W', 'U', 'B', 'R', 'G', 'C'];
        color = color.toUpperCase();

        if (!validColors.includes(color)) {
            console.error(`[DEBUG] Cor inválida. Use: ${validColors.join(', ')}`);
            return;
        }

        this.game.floatingMana.player[color] += amount;
        this.game.ui.render();
        console.log(`%c[DEBUG] +${amount} mana ${color} (total: ${this.game.floatingMana.player[color]})`, 'color: #9b59b6;');
        return this.game.floatingMana.player;
    }

    // Desvirar todas as permanentes
    untapAll(playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);
        let count = 0;

        player.battlefield.forEach(card => {
            if (card.tapped) {
                card.tapped = false;
                count++;
            }
        });

        this.game.ui.render();
        console.log(`%c[DEBUG] ${count} permanentes desviradas de ${player.name}`, 'color: #3498db;');
        return count;
    }

    // Dá mana ilimitada (10 de cada)
    fullMana() {
        if (!this._checkGame()) return;

        const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
        colors.forEach(c => {
            this.game.floatingMana.player[c] = 10;
        });

        this.game.ui.render();
        console.log('%c[DEBUG] 10 de cada mana adicionado!', 'color: #9b59b6; font-weight: bold;');
        return this.game.floatingMana.player;
    }

    // === TURNO E FASE ===

    // Lista fases disponíveis
    phases() {
        console.log(`
%cFases disponíveis:
  UNTAP, UPKEEP, DRAW, MAIN1,
  COMBAT_BEGIN, DECLARE_ATTACKERS, DECLARE_BLOCKERS, COMBAT_DAMAGE, COMBAT_END,
  MAIN2, END, CLEANUP`, 'color: #3498db;');
        return Object.keys(PHASES);
    }

    // Define fase atual
    setPhase(phaseName) {
        if (!this._checkGame()) return;

        const phaseKey = phaseName.toUpperCase();
        if (!PHASES[phaseKey]) {
            console.error(`[DEBUG] Fase inválida: ${phaseName}`);
            this.phases();
            return;
        }

        this.game.phase = PHASES[phaseKey];
        this.game.ui.render();
        console.log(`%c[DEBUG] Fase alterada para: ${phaseKey}`, 'color: #e67e22;');
        return this.game.phase;
    }

    // Avança para o próximo turno
    nextTurn() {
        if (!this._checkGame()) return;

        this.game.turnNumber++;
        this.game.activePlayer = this.game.activePlayer === this.game.player
            ? this.game.opponent
            : this.game.player;
        this.game.phase = PHASES.UNTAP;

        // Limpar estados de turno
        this.game.opponentLostLifeThisTurn = false;
        this.game.playerLostLifeThisTurn = false;
        this.game.unblockableThisTurn = [];
        this.game.currentAttackers = [];
        this.game.blockerAssignments = {};

        this.game.ui.render();
        console.log(`%c[DEBUG] Turno ${this.game.turnNumber} - ${this.game.activePlayer.name}`, 'color: #e67e22; font-weight: bold;');
        return this.game.turnNumber;
    }

    // Avança turnos até chegar em uma fase específica do jogador
    skipTo(phaseName) {
        if (!this._checkGame()) return;

        const phaseKey = phaseName.toUpperCase();
        if (!PHASES[phaseKey]) {
            console.error(`[DEBUG] Fase inválida: ${phaseName}`);
            this.phases();
            return;
        }

        // Se não é turno do jogador, avançar
        if (this.game.activePlayer !== this.game.player) {
            this.nextTurn();
        }

        this.game.phase = PHASES[phaseKey];
        this.game.ui.render();
        console.log(`%c[DEBUG] Avançou para: ${phaseKey} no turno ${this.game.turnNumber}`, 'color: #e67e22;');
        return this.game.phase;
    }

    // === MÃO INICIAL ===

    // Define mão inicial com cartas específicas
    setHand(cardNames, playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);

        // Devolver mão atual ao deck
        player.library.push(...player.hand);
        player.hand = [];

        // Adicionar cartas especificadas
        cardNames.forEach(name => {
            this.addToHand(name, playerName);
        });

        console.log(`%c[DEBUG] Mão de ${player.name} definida com ${cardNames.length} cartas`, 'color: #2ecc71;');
        return player.hand.map(c => c.name);
    }

    // Limpa a mão do jogador
    clearHand(playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);
        const count = player.hand.length;

        // Devolver ao deck
        player.library.push(...player.hand);
        player.hand = [];

        this.game.ui.render();
        console.log(`%c[DEBUG] Mão de ${player.name} limpa (${count} cartas devolvidas)`, 'color: #e74c3c;');
        return count;
    }

    // === ESTADO DO JOGO ===

    // Mostra estado atual do jogo
    state() {
        if (!this._checkGame()) return;

        const g = this.game;
        console.log(`
%c=== Estado do Jogo ===
Turno: ${g.turnNumber}
Fase: ${Object.keys(PHASES).find(k => PHASES[k] === g.phase) || 'N/A'}
Jogador Ativo: ${g.activePlayer?.name || 'N/A'}

%cJogador (${g.player.name}):
  Vida: ${g.player.life}
  Mão: ${g.player.hand.length} cartas
  Campo: ${g.player.battlefield.filter(c => c.type === 'creature').length} criaturas
  Deck: ${g.player.library.length} cartas
  Cemitério: ${g.player.graveyard.length} cartas

%cOponente (${g.opponent.name}):
  Vida: ${g.opponent.life}
  Mão: ${g.opponent.hand.length} cartas
  Campo: ${g.opponent.battlefield.filter(c => c.type === 'creature').length} criaturas
  Deck: ${g.opponent.library.length} cartas
  Cemitério: ${g.opponent.graveyard.length} cartas

%cFloating Mana: W:${g.floatingMana.player.W} U:${g.floatingMana.player.U} B:${g.floatingMana.player.B} R:${g.floatingMana.player.R} G:${g.floatingMana.player.G}`,
        'color: #f1c40f; font-weight: bold;',
        'color: #2ecc71;',
        'color: #e74c3c;',
        'color: #9b59b6;'
        );
        return {
            turn: g.turnNumber,
            phase: g.phase,
            playerLife: g.player.life,
            opponentLife: g.opponent.life
        };
    }

    // Lista criaturas em campo
    battlefield(playerName = null) {
        if (!this._checkGame()) return;

        const showPlayer = (p, label) => {
            const creatures = p.battlefield.filter(c => c.type === 'creature');
            const lands = p.battlefield.filter(c => c.type === 'land');
            const others = p.battlefield.filter(c => c.type !== 'creature' && c.type !== 'land');

            console.log(`%c=== ${label} (${p.name}) ===`, 'color: #f1c40f; font-weight: bold;');

            if (creatures.length > 0) {
                console.log('%cCriaturas:', 'color: #e74c3c;');
                creatures.forEach(c => {
                    const power = this.game.rules.getCreaturePower(c);
                    const toughness = this.game.rules.getCreatureToughness(c);
                    const status = [];
                    if (c.tapped) status.push('tapped');
                    if (c.summoningSickness) status.push('sick');
                    if (c.counters?.plusOnePlusOne) status.push(`+${c.counters.plusOnePlusOne}/+${c.counters.plusOnePlusOne}`);
                    const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';
                    console.log(`  ${c.name} ${power}/${toughness}${statusStr}`);
                });
            }

            if (lands.length > 0) {
                const tappedLands = lands.filter(l => l.tapped).length;
                console.log(`%cTerrenos: ${lands.length} (${lands.length - tappedLands} desvirados)`, 'color: #27ae60;');
            }

            if (others.length > 0) {
                console.log('%cOutros:', 'color: #9b59b6;');
                others.forEach(c => console.log(`  ${c.name} [${c.type}]`));
            }
        };

        if (!playerName || playerName === 'player' || playerName === 'both') {
            showPlayer(this.game.player, 'Seu Campo');
        }
        if (!playerName || playerName === 'opponent' || playerName === 'both') {
            showPlayer(this.game.opponent, 'Campo do Oponente');
        }

        return 'Campo listado acima';
    }

    // Mostra mão do jogador
    hand(playerName = 'player') {
        if (!this._checkGame()) return;

        const player = this._getPlayer(playerName);

        console.log(`%c=== Mão de ${player.name} (${player.hand.length} cartas) ===`, 'color: #f1c40f; font-weight: bold;');
        player.hand.forEach((c, i) => {
            const cost = c.cost || '-';
            const stats = c.type === 'creature' ? ` ${c.power}/${c.toughness}` : '';
            console.log(`  ${i + 1}. ${c.name} [${c.type}] ${cost}${stats}`);
        });

        return player.hand.map(c => c.name);
    }

    // Mata criatura específica
    kill(cardName, playerName = null) {
        if (!this._checkGame()) return;

        const searchIn = playerName
            ? [this._getPlayer(playerName)]
            : [this.game.player, this.game.opponent];

        for (const player of searchIn) {
            const cardIndex = player.battlefield.findIndex(c =>
                c.type === 'creature' && c.name.toLowerCase().includes(cardName.toLowerCase())
            );

            if (cardIndex !== -1) {
                const card = player.battlefield.splice(cardIndex, 1)[0];
                player.graveyard.push(card);
                this.game.ui.render();
                console.log(`%c[DEBUG] ${card.name} morreu (${player.name})`, 'color: #e74c3c;');
                return card;
            }
        }

        console.error(`[DEBUG] Criatura "${cardName}" não encontrada em campo.`);
        return null;
    }

    // === TESTES RÁPIDOS ===

    // Prepara cenário de combate básico
    setupCombat() {
        if (!this._checkGame()) return;

        // Garantir que é turno do jogador
        if (this.game.activePlayer !== this.game.player) {
            this.nextTurn();
        }

        // Adicionar algumas criaturas ao jogador
        this.addToBattlefield('Savannah Lions', 'player');
        this.addToBattlefield('Leonin Skyhunter', 'player');

        // Adicionar criaturas ao oponente
        this.addToBattlefield('Goblin Assailant', 'opponent');
        this.addToBattlefield('Frenzied Goblin', 'opponent');

        // Remover summoning sickness
        this.game.player.battlefield.forEach(c => c.summoningSickness = false);

        // Ir para fase de combate
        this.setPhase('DECLARE_ATTACKERS');

        console.log('%c[DEBUG] Cenário de combate preparado!', 'color: #2ecc71; font-weight: bold;');
        this.battlefield();
        return 'Pronto para combate';
    }

    // === UNDO ===

    // Desfaz a última ação
    undo() {
        if (!this._checkGame()) return;

        if (!this.game.undoEnabled) {
            console.warn('[DEBUG] Undo está desabilitado. Habilite via Settings (M) ou debug.enableUndo()');
            return false;
        }

        if (this.game.stateHistory.length === 0) {
            console.warn('[DEBUG] Nenhuma ação para desfazer');
            return false;
        }

        const result = this.game.undo();
        if (result) {
            console.log('%c[DEBUG] Undo executado com sucesso!', 'color: #9b59b6;');
        }
        return result;
    }

    // Mostra o histórico de estados salvos
    history() {
        if (!this._checkGame()) return;

        if (!this.game.undoEnabled) {
            console.warn('[DEBUG] Undo está desabilitado. Nenhum histórico disponível.');
            return [];
        }

        const history = this.game.getUndoHistory();

        if (history.length === 0) {
            console.log('[DEBUG] Histórico vazio');
            return [];
        }

        console.log('%c=== Histórico de Undo ===', 'color: #f1c40f; font-weight: bold;');
        history.forEach((entry, i) => {
            console.log(`  ${i}: [Turno ${entry.turn}] ${entry.description} (${entry.timestamp})`);
        });

        return history;
    }

    // Habilita o sistema de undo
    enableUndo() {
        if (!this._checkGame()) return;

        this.game.saveUndoSetting(true);
        console.log('%c[DEBUG] Undo habilitado!', 'color: #2ecc71;');
        return true;
    }

    // Desabilita o sistema de undo
    disableUndo() {
        if (!this._checkGame()) return;

        this.game.saveUndoSetting(false);
        console.log('%c[DEBUG] Undo desabilitado', 'color: #e74c3c;');
        return false;
    }

    // Limpa o histórico de undo
    clearHistory() {
        if (!this._checkGame()) return;

        this.game.clearUndoHistory();
        console.log('%c[DEBUG] Histórico de undo limpo', 'color: #e74c3c;');
        return true;
    }
}

// Criar instância global
const debug = new DebugMode();

// Expor globalmente
window.debug = debug;
