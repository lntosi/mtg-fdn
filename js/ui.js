// === Interface do Usuário ===

class GameUI {
    constructor(gameState) {
        this.game = gameState;
        this.selectedCard = null;
        this.selectedAttackers = [];
        this.blockerAssignments = {};
        this.waitingForBlockers = false;
        this.waitingForTarget = false;
        this.pendingAura = null;
        this.validTargets = [];

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // Áreas dos jogadores
        this.playerHand = document.getElementById('player-hand');
        this.playerCreatures = document.getElementById('player-creatures');
        this.playerLands = document.getElementById('player-lands');
        this.playerOther = document.getElementById('player-other');
        this.playerLife = document.getElementById('player-life');
        this.playerMana = document.getElementById('player-mana');
        this.playerLibrary = document.getElementById('player-library');
        this.playerGraveyard = document.getElementById('player-graveyard');

        this.opponentHand = document.getElementById('opponent-hand');
        this.opponentCreatures = document.getElementById('opponent-creatures');
        this.opponentLands = document.getElementById('opponent-lands');
        this.opponentOther = document.getElementById('opponent-other');
        this.opponentLife = document.getElementById('opponent-life');
        this.opponentLibrary = document.getElementById('opponent-library');
        this.opponentGraveyard = document.getElementById('opponent-graveyard');

        // Zona central
        this.phaseIndicator = document.getElementById('current-phase');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.messageLog = document.getElementById('message-log');

        // Botões
        this.btnNextPhase = document.getElementById('btn-next-phase');
        this.btnAttack = document.getElementById('btn-attack');
        this.btnBlock = document.getElementById('btn-block');
        this.btnPass = document.getElementById('btn-pass');

        // Modal
        this.deckSelection = document.getElementById('deck-selection');
        this.btnStartGame = document.getElementById('btn-start-game');

        // Popup do cemitério
        this.graveyardPopup = document.getElementById('graveyard-popup');
        this.graveyardPopupTitle = this.graveyardPopup.querySelector('.graveyard-popup-title');
        this.graveyardPopupCards = this.graveyardPopup.querySelector('.graveyard-popup-cards');
    }

    bindEvents() {
        // Seleção de decks
        const checkboxes = document.querySelectorAll('input[name="deck"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => this.onDeckSelectionChange());
        });

        this.btnStartGame.addEventListener('click', () => this.onStartGame());

        // Botões de ação
        this.btnNextPhase.addEventListener('click', () => this.game.nextPhase());
        this.btnAttack.addEventListener('click', () => this.onAttackClick());
        this.btnBlock.addEventListener('click', () => this.onBlockClick());
        this.btnPass.addEventListener('click', () => this.game.pass());

        // Hover no cemitério
        this.playerGraveyard.addEventListener('mouseenter', (e) => this.showGraveyardPopup(e, 'player'));
        this.playerGraveyard.addEventListener('mouseleave', () => this.hideGraveyardPopup());
        this.opponentGraveyard.addEventListener('mouseenter', (e) => this.showGraveyardPopup(e, 'opponent'));
        this.opponentGraveyard.addEventListener('mouseleave', () => this.hideGraveyardPopup());

        // Manter popup visível enquanto mouse está sobre ele
        this.graveyardPopup.addEventListener('mouseenter', () => this.keepGraveyardPopup());
        this.graveyardPopup.addEventListener('mouseleave', () => this.hideGraveyardPopup());
    }

    onDeckSelectionChange() {
        const checked = document.querySelectorAll('input[name="deck"]:checked');

        // Limitar a 2 seleções
        if (checked.length >= 2) {
            document.querySelectorAll('input[name="deck"]:not(:checked)').forEach(cb => {
                cb.disabled = true;
            });
        } else {
            document.querySelectorAll('input[name="deck"]').forEach(cb => {
                cb.disabled = false;
            });
        }

        this.btnStartGame.disabled = checked.length !== 2;
    }

    onStartGame() {
        const checked = document.querySelectorAll('input[name="deck"]:checked');
        const selectedDecks = Array.from(checked).map(cb => cb.value);

        // Determinar decks da IA (os não selecionados)
        const allDecks = ['cats', 'goblins', 'vampires', 'elves'];
        const aiDecks = allDecks.filter(d => !selectedDecks.includes(d));

        this.deckSelection.classList.add('hidden');
        this.game.startGame(selectedDecks, aiDecks);
    }

    onAttackClick() {
        if (this.selectedAttackers.length > 0) {
            // Confirmar ataque
            this.game.declareAttackers(this.selectedAttackers, this.game.player);
            this.selectedAttackers = [];
        }
    }

    onBlockClick() {
        if (Object.keys(this.blockerAssignments).length > 0) {
            // Confirmar bloqueio
            this.game.declareBlockers(this.blockerAssignments);
            this.blockerAssignments = {};
            this.waitingForBlockers = false;
        } else {
            // Não bloquear
            this.game.declareBlockers({});
            this.waitingForBlockers = false;
        }
    }

    // Renderiza o estado completo do jogo
    render() {
        this.renderHand(this.game.player, this.playerHand, true);
        this.renderHand(this.game.opponent, this.opponentHand, false);

        this.renderBattlefield(this.game.player, this.playerCreatures, this.playerLands, this.playerOther, true);
        this.renderBattlefield(this.game.opponent, this.opponentCreatures, this.opponentLands, this.opponentOther, false);

        this.renderPlayerInfo();
        this.renderPhase();
        this.updateButtons();
    }

    renderHand(player, container, isPlayer) {
        container.innerHTML = '';

        player.hand.forEach(card => {
            const cardEl = this.createCardElement(card, isPlayer);

            if (isPlayer) {
                // Verificar se pode jogar
                if (this.game.rules.canPlayCard(card, player) && this.game.isPlayerTurn()) {
                    cardEl.classList.add('playable');
                    cardEl.addEventListener('click', () => this.onCardClick(card, player));
                }
            }

            container.appendChild(cardEl);
        });
    }

    renderBattlefield(player, creaturesContainer, landsContainer, otherContainer, isPlayer) {
        creaturesContainer.innerHTML = '';
        landsContainer.innerHTML = '';
        otherContainer.innerHTML = '';

        player.battlefield.forEach(card => {
            // Pular Auras - elas são renderizadas junto com a criatura anexada
            if (card.subtype === 'Aura' && card.attachedTo) {
                return;
            }

            const cardEl = this.createCardElement(card, true); // Sempre mostrar cartas no campo

            if (card.tapped) {
                cardEl.classList.add('tapped');
            }

            // Destacar atacantes (do jogador ou da IA)
            if (this.selectedAttackers.includes(card) || this.game.currentAttackers.includes(card)) {
                cardEl.classList.add('attacking');
            }

            // Destacar bloqueadores
            const isBlocking = Object.values(this.blockerAssignments).flat().includes(card);
            if (isBlocking) {
                cardEl.classList.add('blocking');
            }

            // Destacar alvos válidos para Auras
            if (this.waitingForTarget && this.validTargets.includes(card)) {
                cardEl.classList.add('valid-target');
                cardEl.addEventListener('click', () => this.selectTarget(card));
                cardEl.style.cursor = 'crosshair';
            }
            // Eventos de clique normais
            else if (card.type === 'creature') {
                if (isPlayer && this.game.phase === PHASES.DECLARE_ATTACKERS && this.game.isPlayerTurn()) {
                    if (this.game.rules.canAttack(card)) {
                        cardEl.addEventListener('click', () => this.toggleAttacker(card));
                        cardEl.style.cursor = 'pointer';
                    }
                } else if (isPlayer && this.waitingForBlockers) {
                    cardEl.addEventListener('click', () => this.selectBlocker(card));
                    cardEl.style.cursor = 'pointer';
                } else if (isPlayer && this.game.isPlayerTurn() && this.game.canActivateAbility && this.game.canActivateAbility(card, this.game.player)) {
                    // Habilidade ativada disponível
                    cardEl.classList.add('has-ability');
                    cardEl.addEventListener('dblclick', () => this.game.activateAbility(card, this.game.player));
                    cardEl.title = 'Clique duplo para ativar habilidade';
                }
            } else if ((card.type === 'artifact' || card.type === 'enchantment') && isPlayer) {
                // Verificar habilidades ativadas em artefatos/encantamentos
                if (this.game.isPlayerTurn() && this.game.canActivateAbility && this.game.canActivateAbility(card, this.game.player)) {
                    cardEl.classList.add('has-ability');
                    cardEl.addEventListener('dblclick', () => this.game.activateAbility(card, this.game.player));
                    cardEl.title = 'Clique duplo para ativar habilidade';
                }
            }

            // Renderizar Auras anexadas a esta criatura
            if (card.type === 'creature') {
                this.renderAttachedAuras(card, cardEl);
            }

            // Adicionar ao container apropriado
            if (card.type === 'land') {
                landsContainer.appendChild(cardEl);
            } else if ((card.type === 'enchantment' && card.subtype !== 'Aura') || card.type === 'artifact') {
                otherContainer.appendChild(cardEl);
            } else if (card.type === 'creature') {
                creaturesContainer.appendChild(cardEl);
            }
        });
    }

    renderAttachedAuras(creature, creatureEl) {
        // Buscar auras anexadas a esta criatura em ambos os campos
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        const attachedAuras = allBattlefields.filter(card =>
            card.subtype === 'Aura' && card.attachedTo === creature.instanceId
        );

        if (attachedAuras.length > 0) {
            const aurasContainer = document.createElement('div');
            aurasContainer.className = 'attached-auras';

            attachedAuras.forEach((aura, index) => {
                const auraEl = document.createElement('div');
                auraEl.className = 'attached-aura';
                auraEl.style.transform = `translateY(${-15 - (index * 10)}px)`;
                auraEl.title = `${aura.name}: ${aura.text || ''}`;

                // Carregar imagem da aura
                this.loadAuraImage(aura, auraEl);

                aurasContainer.appendChild(auraEl);
            });

            creatureEl.appendChild(aurasContainer);
            creatureEl.classList.add('has-aura');
        }
    }

    async loadAuraImage(aura, auraEl) {
        try {
            const imageUrl = await window.imageManager.getCardImageUrl(aura.name, 'small');
            if (imageUrl) {
                auraEl.style.backgroundImage = `url('${imageUrl}')`;
            }
        } catch (e) {
            auraEl.textContent = aura.name.substring(0, 3);
        }
    }

    createCardElement(card, showFace) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';

        if (!showFace) {
            // Carta virada (mão do oponente)
            cardEl.innerHTML = '<div class="card-back">MTG</div>';
            return cardEl;
        }

        // Adicionar classe de cor
        const colorMap = {
            'W': 'white', 'U': 'blue', 'B': 'black', 'R': 'red', 'G': 'green'
        };

        if (card.cost) {
            const colors = card.cost.match(/[WUBRG]/g) || [];
            if (colors.length > 0) {
                cardEl.classList.add(colorMap[colors[0]]);
            }
        } else if (card.produces && card.produces !== 'any') {
            cardEl.classList.add(colorMap[card.produces]);
        }

        // Tentar carregar imagem da carta
        this.loadCardImage(card, cardEl);

        // Conteúdo da carta (será sobreposto pela imagem quando carregar)
        let html = '';

        if (card.cost) {
            html += `<div class="card-cost">${card.cost}</div>`;
        }

        html += `<div class="card-content">`;
        html += `<div class="card-name">${card.name}</div>`;
        html += `<div class="card-type">${card.type}${card.subtype ? ' - ' + card.subtype : ''}</div>`;

        if (card.text) {
            html += `<div class="card-text">${card.text}</div>`;
        }
        html += `</div>`;

        if (card.type === 'creature') {
            // Usar o motor de regras para calcular poder/resistência com bônus
            let power, toughness, bonuses;
            const basePower = (card.power || 0);
            const baseToughness = (card.toughness || 0);

            if (this.game && this.game.rules) {
                power = this.game.rules.getCreaturePower(card);
                toughness = this.game.rules.getCreatureToughness(card);
                bonuses = this.game.rules.getCreatureBonuses(card);
            } else {
                power = basePower + (card.powerModifier || 0);
                toughness = baseToughness + (card.toughnessModifier || 0);
                bonuses = { power: 0, toughness: 0, sources: [] };
            }

            // Verificar se há bônus ativos
            const hasBonus = bonuses.sources.length > 0 || (card.powerModifier || 0) !== 0 || (card.toughnessModifier || 0) !== 0;
            const statsClass = hasBonus ? 'card-stats buffed' : 'card-stats';

            html += `<div class="${statsClass}">${power}/${toughness}</div>`;

            // Mostrar indicador de bônus se houver
            if (bonuses.sources.length > 0) {
                const totalPowerBonus = bonuses.power;
                const totalToughnessBonus = bonuses.toughness;
                let bonusText = '';

                if (totalPowerBonus > 0 || totalToughnessBonus > 0) {
                    const pSign = totalPowerBonus >= 0 ? '+' : '';
                    const tSign = totalToughnessBonus >= 0 ? '+' : '';
                    bonusText = `${pSign}${totalPowerBonus}/${tSign}${totalToughnessBonus}`;
                }

                if (bonusText) {
                    const sourcesTitle = bonuses.sources.map(s => s.name).join(', ');
                    html += `<div class="card-bonus" title="${sourcesTitle}">${bonusText}</div>`;
                }
            }
        }

        cardEl.innerHTML = html;
        return cardEl;
    }

    async loadCardImage(card, cardEl) {
        // Não carregar imagem para tokens
        if (card.name.includes('Token')) return;

        try {
            // Usar 'normal' para melhor compatibilidade (488x680px, proporção correta)
            const imageUrl = await window.imageManager.getCardImageUrl(card.name, 'normal');
            if (imageUrl) {
                // Usar background shorthand para garantir que todas as propriedades são aplicadas
                cardEl.style.background = `url('${imageUrl}') center/contain no-repeat #000`;
                cardEl.classList.add('has-image');
            }
        } catch (e) {
            // Silenciar erros - manter visual padrão
        }
    }

    renderPlayerInfo() {
        // Verificar se o jogo foi inicializado
        if (!this.game.player || !this.game.opponent) return;

        this.playerLife.textContent = this.game.player.life;
        this.opponentLife.textContent = this.game.opponent.life;

        const mana = this.game.rules.calculateAvailableMana(this.game.player);
        const totalMana = Object.values(mana).reduce((a, b) => a + b, 0);
        this.playerMana.textContent = `Mana: ${totalMana}`;

        // Atualizar contagem de grimório e cemitério
        this.renderLibraryAndGraveyard();
    }

    renderLibraryAndGraveyard() {
        // Verificar se o jogo foi inicializado
        if (!this.game.player || !this.game.opponent) return;

        // Jogador
        const playerLibCount = this.playerLibrary.querySelector('.library-count');
        const playerGYCount = this.playerGraveyard.querySelector('.graveyard-count');
        if (playerLibCount) playerLibCount.textContent = this.game.player.library.length;
        if (playerGYCount) playerGYCount.textContent = this.game.player.graveyard.length;

        // Oponente
        const oppLibCount = this.opponentLibrary.querySelector('.library-count');
        const oppGYCount = this.opponentGraveyard.querySelector('.graveyard-count');
        if (oppLibCount) oppLibCount.textContent = this.game.opponent.library.length;
        if (oppGYCount) oppGYCount.textContent = this.game.opponent.graveyard.length;

        // Mostrar topo do cemitério se houver cartas
        this.updateGraveyardTop(this.playerGraveyard, this.game.player.graveyard);
        this.updateGraveyardTop(this.opponentGraveyard, this.game.opponent.graveyard);
    }

    updateGraveyardTop(graveyardEl, graveyardCards) {
        if (!graveyardEl) return;

        // Remover carta anterior se existir
        const existingCard = graveyardEl.querySelector('.graveyard-top-card');
        if (existingCard) {
            existingCard.remove();
        }

        if (graveyardCards && graveyardCards.length > 0) {
            const topCard = graveyardCards[graveyardCards.length - 1];
            const cardEl = document.createElement('div');
            cardEl.className = 'graveyard-top-card';

            // Carregar imagem da carta do topo
            this.loadGraveyardCardImage(topCard, cardEl);

            graveyardEl.appendChild(cardEl);
        }
    }

    async loadGraveyardCardImage(card, cardEl) {
        if (card.name.includes('Token')) {
            cardEl.textContent = card.name.split(' ')[0];
            return;
        }

        try {
            const imageUrl = await window.imageManager.getCardImageUrl(card.name, 'small');
            if (imageUrl) {
                cardEl.style.background = `url('${imageUrl}') center/contain no-repeat`;
            }
        } catch (e) {
            cardEl.textContent = card.name.substring(0, 3);
        }
    }

    // === Sistema de Seleção de Alvo ===

    promptForTarget(aura, validTargets, callback) {
        this.waitingForTarget = true;
        this.pendingAura = aura;
        this.validTargets = validTargets;
        this.targetCallback = callback;
        this.log(`Selecione um alvo para ${aura.name}`);
        this.render();
    }

    selectTarget(target) {
        if (!this.waitingForTarget || !this.pendingAura) return;

        const aura = this.pendingAura;
        const callback = this.targetCallback;

        // Limpar estado
        this.waitingForTarget = false;
        this.pendingAura = null;
        this.validTargets = [];
        this.targetCallback = null;

        // Executar callback com o alvo selecionado
        if (callback) {
            callback(target);
        }
    }

    cancelTargeting() {
        if (this.waitingForTarget && this.pendingAura) {
            // Devolver carta para a mão
            this.game.player.hand.push(this.pendingAura);
            this.log(`Seleção de alvo cancelada`);
        }

        this.waitingForTarget = false;
        this.pendingAura = null;
        this.validTargets = [];
        this.targetCallback = null;
        this.render();
    }

    // === Popup do Cemitério ===

    showGraveyardPopup(event, owner) {
        if (!this.game.player || !this.game.opponent) return;

        const graveyard = owner === 'player' ? this.game.player.graveyard : this.game.opponent.graveyard;
        const ownerName = owner === 'player' ? 'Seu Cemitério' : 'Cemitério do Oponente';

        this.graveyardPopupTitle.textContent = `${ownerName} (${graveyard.length})`;
        this.graveyardPopupCards.innerHTML = '';

        if (graveyard.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'graveyard-popup-empty';
            emptyMsg.textContent = 'Nenhuma carta no cemitério';
            this.graveyardPopupCards.appendChild(emptyMsg);
        } else {
            // Mostrar cartas da mais recente para a mais antiga
            [...graveyard].reverse().forEach(card => {
                const cardEl = this.createCardElement(card, true);
                this.graveyardPopupCards.appendChild(cardEl);
            });
        }

        // Posicionar popup
        const rect = event.target.getBoundingClientRect();
        const popupWidth = 400;
        const popupHeight = 300;

        let left = rect.left;
        let top = owner === 'player' ? rect.top - popupHeight - 10 : rect.bottom + 10;

        // Ajustar se sair da tela
        if (left + popupWidth > window.innerWidth) {
            left = window.innerWidth - popupWidth - 20;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }
        if (top + popupHeight > window.innerHeight) {
            top = rect.top - popupHeight - 10;
        }

        this.graveyardPopup.style.left = `${left}px`;
        this.graveyardPopup.style.top = `${top}px`;
        this.graveyardPopup.classList.remove('hidden');

        // Cancelar timeout de esconder
        if (this.graveyardPopupTimeout) {
            clearTimeout(this.graveyardPopupTimeout);
            this.graveyardPopupTimeout = null;
        }
    }

    hideGraveyardPopup() {
        // Pequeno delay para permitir mover o mouse para o popup
        this.graveyardPopupTimeout = setTimeout(() => {
            this.graveyardPopup.classList.add('hidden');
        }, 150);
    }

    keepGraveyardPopup() {
        if (this.graveyardPopupTimeout) {
            clearTimeout(this.graveyardPopupTimeout);
            this.graveyardPopupTimeout = null;
        }
    }

    renderPhase() {
        this.phaseIndicator.textContent = PHASE_NAMES[this.game.phase];
        this.turnIndicator.textContent = `Turno: ${this.game.turnNumber} - ${this.game.isPlayerTurn() ? 'Seu turno' : 'Turno do oponente'}`;
    }

    updateButtons() {
        const isPlayerTurn = this.game.isPlayerTurn();

        // Botões só habilitados no turno do jogador e quando não está esperando bloqueio
        this.btnNextPhase.disabled = !isPlayerTurn || this.waitingForBlockers;
        this.btnPass.disabled = !isPlayerTurn || this.waitingForBlockers;

        // Botão de ataque
        const canDeclareAttack = isPlayerTurn && this.game.phase === PHASES.DECLARE_ATTACKERS;
        this.btnAttack.disabled = !canDeclareAttack || this.waitingForBlockers;
        this.btnAttack.textContent = this.selectedAttackers.length > 0
            ? `Atacar (${this.selectedAttackers.length})`
            : 'Atacar';

        // Botão de bloqueio - habilitado quando esperando bloqueadores
        this.btnBlock.disabled = !this.waitingForBlockers;
        const blockCount = Object.values(this.blockerAssignments).flat().length;
        this.btnBlock.textContent = blockCount > 0
            ? `Bloquear (${blockCount})`
            : 'Não Bloquear';
    }

    onCardClick(card, player) {
        this.game.playCard(card, player);
    }

    toggleAttacker(card) {
        const index = this.selectedAttackers.indexOf(card);
        if (index > -1) {
            this.selectedAttackers.splice(index, 1);
        } else {
            this.selectedAttackers.push(card);
        }
        this.render();
    }

    selectBlocker(card) {
        // Verificar se a criatura pode bloquear (não está virada)
        if (card.tapped) {
            this.log(`${card.name} está virada e não pode bloquear.`);
            return;
        }

        // Verificar se já está bloqueando
        const alreadyBlocking = Object.values(this.blockerAssignments).flat().includes(card);
        if (alreadyBlocking) {
            // Remover do bloqueio
            for (const attackerId in this.blockerAssignments) {
                const blockers = this.blockerAssignments[attackerId];
                const idx = blockers.indexOf(card);
                if (idx > -1) {
                    blockers.splice(idx, 1);
                    if (blockers.length === 0) {
                        delete this.blockerAssignments[attackerId];
                    }
                    break;
                }
            }
            this.render();
            return;
        }

        // Bloqueia o primeiro atacante não bloqueado que pode ser bloqueado por esta criatura
        const attackers = this.game.currentAttackers || [];
        const unblockedAttacker = attackers.find(a =>
            !this.blockerAssignments[a.instanceId] &&
            this.game.rules.canBlock(card, a)
        );

        if (unblockedAttacker) {
            this.blockerAssignments[unblockedAttacker.instanceId] = [card];
            this.log(`${card.name} bloqueia ${unblockedAttacker.name}`);
            this.render();
        } else {
            this.log(`${card.name} não pode bloquear nenhum atacante.`);
        }
    }

    // Mostra prompt para escolher bloqueadores
    promptForBlockers(attackers) {
        this.waitingForBlockers = true;
        this.blockerAssignments = {};
        this.game.currentAttackers = attackers;
        this.log(`${attackers.length} criatura(s) atacando! Escolha bloqueadores.`);
        this.render();
    }

    // Log de mensagens
    log(message) {
        const entry = document.createElement('div');
        entry.textContent = `> ${message}`;
        this.messageLog.appendChild(entry);
        this.messageLog.scrollTop = this.messageLog.scrollHeight;

        // Limitar histórico
        while (this.messageLog.children.length > 50) {
            this.messageLog.removeChild(this.messageLog.firstChild);
        }
    }

    // Mostra tela de fim de jogo
    showGameOver(winner, reason) {
        const message = winner === 'player'
            ? `🎉 Você venceu! ${reason}`
            : `💀 Você perdeu! ${reason}`;

        this.log(message);

        setTimeout(() => {
            if (confirm(message + '\n\nJogar novamente?')) {
                location.reload();
            }
        }, 500);
    }
}

// Exportar
window.GameUI = GameUI;
