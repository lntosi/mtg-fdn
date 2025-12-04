// === Interface do Usuário ===

// === Descrições de Keywords ===
const KEYWORD_DESCRIPTIONS = {
    flying: 'Voar - Esta criatura só pode ser bloqueada por criaturas com voar ou alcance.',
    lifelink: 'Vínculo Vital - O dano causado por esta criatura também faz você ganhar essa quantidade de vida.',
    deathtouch: 'Toque Mortífero - Qualquer quantidade de dano que esta criatura cause a uma criatura é suficiente para destruí-la.',
    trample: 'Atropelar - Se esta criatura causar dano de combate suficiente para destruir todos os bloqueadores, você pode fazer o dano restante ao jogador defensor.',
    first_strike: 'Iniciativa - Esta criatura causa dano de combate antes das criaturas sem iniciativa.',
    double_strike: 'Golpe Duplo - Esta criatura causa dano de combate de iniciativa e de combate normal.',
    vigilance: 'Vigilância - Atacar com esta criatura não faz com que ela seja virada.',
    haste: 'Ímpeto - Esta criatura pode atacar e usar habilidades de virar assim que entra no campo de batalha.',
    reach: 'Alcance - Esta criatura pode bloquear criaturas com voar.',
    menace: 'Ameaçar - Esta criatura só pode ser bloqueada por duas ou mais criaturas.',
    tap_for_mana: 'Produz Mana - Vire esta permanente para adicionar mana à sua reserva.',
    etb_draw: 'Comprar ao Entrar - Quando esta criatura entra no campo de batalha, compre uma carta.'
};

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
        this.hoveredCard = null;
        this.draggedCard = null;
        this.previousPlayerLife = 20;
        this.previousOpponentLife = 20;

        this.initElements();
        this.bindEvents();
        this.initLogPanel();
        this.initCardPreview();
        this.initKeywordTooltip();
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

        // Novos elementos de UI
        this.cardPreview = document.getElementById('card-preview');
        this.logPanel = document.getElementById('log-panel');
        this.logPanelContent = document.getElementById('log-panel-content');
        this.keywordTooltip = document.getElementById('keyword-tooltip');
        this.gameContainer = document.getElementById('game-container');

        // Mana icons
        this.manaIcons = {
            W: this.playerMana.querySelector('.mana-W'),
            U: this.playerMana.querySelector('.mana-U'),
            B: this.playerMana.querySelector('.mana-B'),
            R: this.playerMana.querySelector('.mana-R'),
            G: this.playerMana.querySelector('.mana-G'),
            C: this.playerMana.querySelector('.mana-C')
        };
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

        // Clique no cemitério para abrir modal
        this.playerGraveyard.addEventListener('click', () => this.showGraveyardModal('player'));
        this.opponentGraveyard.addEventListener('click', () => this.showGraveyardModal('opponent'));

        // Hover no cemitério (popup rápido mantido como preview)
        this.playerGraveyard.addEventListener('mouseenter', (e) => this.showGraveyardPopup(e, 'player'));
        this.playerGraveyard.addEventListener('mouseleave', () => this.hideGraveyardPopup());
        this.opponentGraveyard.addEventListener('mouseenter', (e) => this.showGraveyardPopup(e, 'opponent'));
        this.opponentGraveyard.addEventListener('mouseleave', () => this.hideGraveyardPopup());

        // Manter popup visível enquanto mouse está sobre ele
        this.graveyardPopup.addEventListener('mouseenter', () => this.keepGraveyardPopup());
        this.graveyardPopup.addEventListener('mouseleave', () => this.hideGraveyardPopup());

        // Botão de conceder
        const btnConcede = document.getElementById('btn-concede');
        if (btnConcede) {
            btnConcede.addEventListener('click', () => this.showConcedeModal());
        }

        // Modal de conceder
        const btnConfirmConcede = document.getElementById('btn-confirm-concede');
        const btnCancelConcede = document.getElementById('btn-cancel-concede');
        if (btnConfirmConcede) {
            btnConfirmConcede.addEventListener('click', () => this.confirmConcede());
        }
        if (btnCancelConcede) {
            btnCancelConcede.addEventListener('click', () => this.hideConcedeModal());
        }

        // Fechar modal de cemitério
        const btnCloseGraveyard = document.getElementById('btn-close-graveyard');
        if (btnCloseGraveyard) {
            btnCloseGraveyard.addEventListener('click', () => this.hideGraveyardModal());
        }
    }

    // === Log Panel ===
    initLogPanel() {
        const btnToggle = document.getElementById('btn-toggle-log');
        const btnShowLog = document.getElementById('btn-show-log');

        if (btnToggle) {
            btnToggle.addEventListener('click', () => this.toggleLogPanel());
        }

        if (btnShowLog) {
            btnShowLog.addEventListener('click', () => this.showLogPanel());
        }
    }

    toggleLogPanel() {
        const isCollapsed = this.logPanel.classList.toggle('collapsed');
        this.gameContainer.classList.toggle('log-collapsed');

        // Mostrar/esconder botão flutuante
        const btnShowLog = document.getElementById('btn-show-log');
        if (btnShowLog) {
            if (isCollapsed) {
                btnShowLog.classList.remove('hidden');
            } else {
                btnShowLog.classList.add('hidden');
            }
        }
    }

    showLogPanel() {
        this.logPanel.classList.remove('collapsed');
        this.gameContainer.classList.remove('log-collapsed');

        const btnShowLog = document.getElementById('btn-show-log');
        if (btnShowLog) {
            btnShowLog.classList.add('hidden');
        }
    }

    // === Card Preview ===
    initCardPreview() {
        // Preview será mostrado no hover das cartas
    }

    showCardPreview(card) {
        if (!this.cardPreview || !card) return;

        const previewImage = this.cardPreview.querySelector('.card-preview-image');
        const previewName = this.cardPreview.querySelector('.card-preview-name');
        const previewType = this.cardPreview.querySelector('.card-preview-type');
        const previewText = this.cardPreview.querySelector('.card-preview-text');
        const previewStats = this.cardPreview.querySelector('.card-preview-stats');
        const previewKeywords = this.cardPreview.querySelector('.card-preview-keywords');

        previewName.textContent = card.name;
        previewType.textContent = `${card.type}${card.subtype ? ' — ' + card.subtype : ''}`;
        previewText.textContent = card.text || '';

        if (card.type === 'creature') {
            const power = this.game.rules ? this.game.rules.getCreaturePower(card) : card.power;
            const toughness = this.game.rules ? this.game.rules.getCreatureToughness(card) : card.toughness;
            previewStats.textContent = `${power}/${toughness}`;
        } else {
            previewStats.textContent = '';
        }

        // Keywords
        previewKeywords.innerHTML = '';
        if (card.keywords && card.keywords.length > 0) {
            card.keywords.forEach(kw => {
                const badge = document.createElement('span');
                badge.className = 'keyword-badge';
                badge.textContent = kw.replace('_', ' ');
                badge.dataset.keyword = kw;
                previewKeywords.appendChild(badge);
            });
        }

        // Carregar imagem
        this.loadPreviewImage(card, previewImage);

        this.cardPreview.classList.remove('hidden');
    }

    async loadPreviewImage(card, element) {
        if (card.name.includes('Token')) {
            element.style.backgroundImage = '';
            return;
        }
        try {
            const imageUrl = await window.imageManager.getCardImageUrl(card.name, 'normal');
            if (imageUrl) {
                element.style.backgroundImage = `url('${imageUrl}')`;
            }
        } catch (e) {
            element.style.backgroundImage = '';
        }
    }

    hideCardPreview() {
        if (this.cardPreview) {
            this.cardPreview.classList.add('hidden');
        }
    }

    // === Keyword Tooltip ===
    initKeywordTooltip() {
        // Tooltip será mostrado via delegação de eventos
        document.addEventListener('mouseover', (e) => {
            const badge = e.target.closest('.keyword-badge');
            if (badge && badge.dataset.keyword) {
                this.showKeywordTooltip(badge.dataset.keyword, e);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const badge = e.target.closest('.keyword-badge');
            if (badge) {
                this.hideKeywordTooltip();
            }
        });
    }

    showKeywordTooltip(keyword, event) {
        if (!this.keywordTooltip) return;

        const description = KEYWORD_DESCRIPTIONS[keyword];
        if (!description) return;

        const parts = description.split(' - ');
        const title = parts[0];
        const desc = parts[1] || '';

        this.keywordTooltip.innerHTML = `
            <div class="keyword-tooltip-title">${title}</div>
            <div class="keyword-tooltip-desc">${desc}</div>
        `;

        // Posicionar tooltip
        const x = event.clientX + 15;
        const y = event.clientY + 15;
        this.keywordTooltip.style.left = `${x}px`;
        this.keywordTooltip.style.top = `${y}px`;
        this.keywordTooltip.classList.remove('hidden');
    }

    hideKeywordTooltip() {
        if (this.keywordTooltip) {
            this.keywordTooltip.classList.add('hidden');
        }
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
                // Adicionar eventos de hover para card preview
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

                // Verificar se pode jogar
                if (this.game.rules.canPlayCard(card, player) && this.game.isPlayerTurn()) {
                    cardEl.classList.add('playable');
                    cardEl.classList.add('draggable');
                    cardEl.addEventListener('click', () => this.onCardClick(card, player));

                    // Drag and Drop
                    cardEl.draggable = true;
                    cardEl.addEventListener('dragstart', (e) => this.onDragStart(e, card, player));
                    cardEl.addEventListener('dragend', (e) => this.onDragEnd(e));
                }
            }

            container.appendChild(cardEl);
        });

        // Configurar drop zones se é turno do jogador
        if (isPlayer && this.game.isPlayerTurn()) {
            this.setupDropZones();
        }
    }

    // === Drag and Drop ===
    onDragStart(event, card, player) {
        this.draggedCard = { card, player };
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';

        // Destacar zonas de drop
        const battlefield = document.getElementById('player-battlefield');
        if (battlefield) {
            battlefield.classList.add('drop-zone-highlight');
        }
    }

    onDragEnd(event) {
        event.target.classList.remove('dragging');
        this.draggedCard = null;

        // Remover destaque das zonas
        const battlefield = document.getElementById('player-battlefield');
        if (battlefield) {
            battlefield.classList.remove('drop-zone-highlight');
        }
    }

    setupDropZones() {
        const battlefield = document.getElementById('player-battlefield');
        if (!battlefield) return;

        battlefield.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        battlefield.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedCard) {
                this.game.playCard(this.draggedCard.card, this.draggedCard.player);
                this.draggedCard = null;
            }
            battlefield.classList.remove('drop-zone-highlight');
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

            // Indicador de Summoning Sickness
            if (card.type === 'creature' && card.summoningSickness) {
                cardEl.classList.add('summoning-sick');
            }

            // Destacar atacantes (do jogador ou da IA) com animação
            if (this.selectedAttackers.includes(card) || this.game.currentAttackers.includes(card)) {
                cardEl.classList.add('attacking');
                cardEl.classList.add('attacking-animation');
            }

            // Destacar bloqueadores com animação
            const isBlocking = Object.values(this.blockerAssignments).flat().includes(card);
            if (isBlocking) {
                cardEl.classList.add('blocking');
                cardEl.classList.add('blocking-animation');
            }

            // Adicionar eventos de hover para card preview
            cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
            cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

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

            // Renderizar contadores (+1/+1, etc)
            if (card.counters) {
                this.renderCounters(card, cardEl);
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

        // Atualizar vida com efeitos visuais
        const currentPlayerLife = this.game.player.life;
        const currentOpponentLife = this.game.opponent.life;

        if (currentPlayerLife < this.previousPlayerLife) {
            this.playerLife.classList.add('damage-taken');
            setTimeout(() => this.playerLife.classList.remove('damage-taken'), 600);
        } else if (currentPlayerLife > this.previousPlayerLife) {
            this.playerLife.classList.add('life-gained');
            setTimeout(() => this.playerLife.classList.remove('life-gained'), 600);
        }

        if (currentOpponentLife < this.previousOpponentLife) {
            this.opponentLife.classList.add('damage-taken');
            setTimeout(() => this.opponentLife.classList.remove('damage-taken'), 600);
        } else if (currentOpponentLife > this.previousOpponentLife) {
            this.opponentLife.classList.add('life-gained');
            setTimeout(() => this.opponentLife.classList.remove('life-gained'), 600);
        }

        this.previousPlayerLife = currentPlayerLife;
        this.previousOpponentLife = currentOpponentLife;

        this.playerLife.textContent = currentPlayerLife;
        this.opponentLife.textContent = currentOpponentLife;

        // Atualizar mana por cor
        const mana = this.game.rules.calculateAvailableMana(this.game.player);
        this.updateManaDisplay(mana);

        // Atualizar contagem de grimório e cemitério
        this.renderLibraryAndGraveyard();
    }

    updateManaDisplay(mana) {
        // Atualizar cada ícone de mana
        const colors = ['W', 'U', 'B', 'R', 'G'];
        let anyMana = 0;

        colors.forEach(color => {
            const icon = this.manaIcons[color];
            if (icon) {
                const amount = mana[color] || 0;
                icon.textContent = amount;
                if (amount > 0) {
                    icon.classList.add('has-mana');
                } else {
                    icon.classList.remove('has-mana');
                }
            }
        });

        // Mana incolor/qualquer cor
        const colorlessIcon = this.manaIcons.C;
        if (colorlessIcon) {
            const colorless = mana.C || mana.any || 0;
            colorlessIcon.textContent = colorless;
            if (colorless > 0) {
                colorlessIcon.classList.add('has-mana');
            } else {
                colorlessIcon.classList.remove('has-mana');
            }
        }
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

    // === Modal de Cemitério ===

    showGraveyardModal(owner) {
        if (!this.game.player || !this.game.opponent) return;

        const modal = document.getElementById('graveyard-modal');
        const title = document.getElementById('graveyard-modal-title');
        const count = document.getElementById('graveyard-modal-count');
        const cardsContainer = document.getElementById('graveyard-modal-cards');

        if (!modal) return;

        const graveyard = owner === 'player' ? this.game.player.graveyard : this.game.opponent.graveyard;
        const ownerName = owner === 'player' ? 'Seu Cemitério' : 'Cemitério do Oponente';

        title.textContent = ownerName;
        count.textContent = `${graveyard.length} carta${graveyard.length !== 1 ? 's' : ''}`;

        cardsContainer.innerHTML = '';

        if (graveyard.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'graveyard-empty';
            emptyMsg.textContent = 'Nenhuma carta no cemitério';
            cardsContainer.appendChild(emptyMsg);
        } else {
            // Mostrar cartas da mais recente para a mais antiga
            [...graveyard].reverse().forEach(card => {
                const cardEl = this.createCardElement(card, true);
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                cardsContainer.appendChild(cardEl);
            });
        }

        // Esconder o popup hover se estiver visível
        this.hideGraveyardPopup();

        modal.classList.remove('hidden');
    }

    hideGraveyardModal() {
        const modal = document.getElementById('graveyard-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // === Sistema de Conceder Partida ===

    showConcedeModal() {
        // Não permitir conceder se o jogo já acabou
        if (this.game.gameOver) return;

        const modal = document.getElementById('concede-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    hideConcedeModal() {
        const modal = document.getElementById('concede-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    confirmConcede() {
        this.hideConcedeModal();
        this.game.concede();
    }

    renderPhase() {
        this.phaseIndicator.textContent = PHASE_NAMES[this.game.phase];

        const isPlayerTurn = this.game.isPlayerTurn();
        this.turnIndicator.textContent = `Turno ${this.game.turnNumber} - ${isPlayerTurn ? 'SEU TURNO' : 'TURNO DO OPONENTE'}`;

        // Atualizar classe para indicador visual
        this.turnIndicator.classList.remove('player-turn', 'opponent-turn');
        this.turnIndicator.classList.add(isPlayerTurn ? 'player-turn' : 'opponent-turn');
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
    log(message, type = 'normal') {
        // Log compacto no centro
        const entry = document.createElement('div');
        entry.textContent = `> ${message}`;
        this.messageLog.appendChild(entry);
        this.messageLog.scrollTop = this.messageLog.scrollHeight;

        // Limitar histórico compacto
        while (this.messageLog.children.length > 50) {
            this.messageLog.removeChild(this.messageLog.firstChild);
        }

        // Log expandido no painel lateral
        if (this.logPanelContent) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            // Adicionar classe baseada no tipo de mensagem
            if (message.includes('dano') || message.includes('perdeu') || message.includes('destruído')) {
                logEntry.classList.add('damage');
            } else if (message.includes('ganhou') && message.includes('vida')) {
                logEntry.classList.add('life-gain');
            } else if (message.includes('jogou') || message.includes('lançou')) {
                logEntry.classList.add('spell');
            } else if (message.includes('Turno') && message.includes('começa')) {
                logEntry.classList.add('turn-start');
            }

            logEntry.textContent = message;
            this.logPanelContent.appendChild(logEntry);
            this.logPanelContent.scrollTop = this.logPanelContent.scrollHeight;
        }
    }

    // Log de início de turno
    logTurnStart(turnNumber, playerName) {
        const message = `═══ Turno ${turnNumber} - ${playerName} ═══`;
        if (this.logPanelContent) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry turn-start';
            logEntry.textContent = message;
            this.logPanelContent.appendChild(logEntry);
            this.logPanelContent.scrollTop = this.logPanelContent.scrollHeight;
        }
    }

    // === SISTEMA DE MULLIGAN ===

    showMulliganPrompt() {
        const modal = document.getElementById('mulligan-modal');
        const hand = document.getElementById('mulligan-hand');
        const text = document.getElementById('mulligan-text');
        const btnKeep = document.getElementById('btn-keep-hand');
        const btnMulligan = document.getElementById('btn-mulligan');

        if (!modal) return;

        const mulliganCount = this.game.mulliganCount.player;
        const newHandSize = 7 - mulliganCount;

        if (mulliganCount === 0) {
            text.textContent = 'Sua mão inicial (7 cartas):';
        } else {
            text.textContent = `Mulligan ${mulliganCount}! Comprou 7 cartas, manterá ${newHandSize}.`;
        }

        // Renderizar mão atual
        hand.innerHTML = '';
        this.game.player.hand.forEach(card => {
            const cardEl = this.createCardElement(card, true);
            cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
            cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
            hand.appendChild(cardEl);
        });

        // Bind eventos dos botões
        btnKeep.onclick = () => {
            modal.classList.add('hidden');
            this.game.doMulligan(true);
        };

        btnMulligan.onclick = () => {
            modal.classList.add('hidden');
            this.game.doMulligan(false);
        };

        // Desabilitar mulligan se não pode mais
        if (newHandSize <= 1) {
            btnMulligan.disabled = true;
            btnMulligan.textContent = 'Sem mais mulligans';
        } else {
            btnMulligan.disabled = false;
            btnMulligan.textContent = `Mulligan (${newHandSize - 1} cartas)`;
        }

        modal.classList.remove('hidden');
    }

    // === SISTEMA DE FIM DE JOGO ===

    showGameOverScreen(winner, reason) {
        const modal = document.getElementById('game-over-modal');
        const content = modal.querySelector('.game-over-content');
        const icon = document.getElementById('game-over-icon');
        const title = document.getElementById('game-over-title');
        const reasonEl = document.getElementById('game-over-reason');
        const playerLife = document.getElementById('final-player-life');
        const opponentLife = document.getElementById('final-opponent-life');
        const turns = document.getElementById('final-turns');
        const btnView = document.getElementById('btn-view-battlefield');
        const btnNewGame = document.getElementById('btn-new-game');

        if (!modal) return;

        // Configurar conteúdo
        content.classList.remove('victory', 'defeat');

        if (winner === 'player') {
            content.classList.add('victory');
            icon.textContent = '🏆';
            title.textContent = 'Vitória!';
        } else {
            content.classList.add('defeat');
            icon.textContent = '💀';
            title.textContent = 'Derrota';
        }

        reasonEl.textContent = reason;
        playerLife.textContent = this.game.player.life;
        opponentLife.textContent = this.game.opponent.life;
        turns.textContent = this.game.turnNumber;

        // Bind eventos
        btnView.onclick = () => {
            modal.classList.add('hidden');
            this.game.viewBattlefieldAfterGame();
        };

        btnNewGame.onclick = () => {
            this.game.returnToMenu();
        };

        this.log(winner === 'player' ? `🏆 Vitória! ${reason}` : `💀 Derrota! ${reason}`);
        modal.classList.remove('hidden');
    }

    // === MODO DE VISUALIZAÇÃO ===

    enableViewMode() {
        this.gameContainer.classList.add('view-mode');

        // Adicionar botão para sair
        let btnExit = document.getElementById('btn-exit-view');
        if (!btnExit) {
            btnExit = document.createElement('button');
            btnExit.id = 'btn-exit-view';
            btnExit.textContent = 'Voltar ao Menu';
            btnExit.onclick = () => this.game.returnToMenu();
            document.body.appendChild(btnExit);
        }

        this.render();
    }

    disableViewMode() {
        this.gameContainer.classList.remove('view-mode');
        const btnExit = document.getElementById('btn-exit-view');
        if (btnExit) btnExit.remove();
    }

    // === SISTEMA DE DESCARTE ===

    promptForDiscard(cardsToDiscard) {
        return new Promise((resolve) => {
            const modal = document.getElementById('discard-modal');
            const hand = document.getElementById('discard-hand');
            const text = document.getElementById('discard-text');
            const btnConfirm = document.getElementById('btn-confirm-discard');

            if (!modal) {
                // Fallback se modal não existe
                const sorted = [...this.game.player.hand].sort((a, b) => (b.cmc || 0) - (a.cmc || 0));
                const toDiscard = sorted.slice(0, cardsToDiscard);
                this.game.discardCards(toDiscard);
                resolve();
                return;
            }

            text.textContent = `Você tem ${this.game.player.hand.length} cartas. Selecione ${cardsToDiscard} para descartar:`;

            let selectedCards = [];

            const updateButton = () => {
                const remaining = cardsToDiscard - selectedCards.length;
                btnConfirm.textContent = `Confirmar Descarte (${selectedCards.length}/${cardsToDiscard})`;
                btnConfirm.disabled = selectedCards.length !== cardsToDiscard;
            };

            // Renderizar mão
            hand.innerHTML = '';
            this.game.player.hand.forEach(card => {
                const cardEl = this.createCardElement(card, true);
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

                cardEl.addEventListener('click', () => {
                    const index = selectedCards.indexOf(card);
                    if (index > -1) {
                        selectedCards.splice(index, 1);
                        cardEl.classList.remove('selected-discard');
                    } else if (selectedCards.length < cardsToDiscard) {
                        selectedCards.push(card);
                        cardEl.classList.add('selected-discard');
                    }
                    updateButton();
                });

                hand.appendChild(cardEl);
            });

            updateButton();

            btnConfirm.onclick = () => {
                modal.classList.add('hidden');
                this.game.discardCards(selectedCards);
                resolve();
            };

            modal.classList.remove('hidden');
        });
    }

    // === SISTEMA VISUAL DE CONTADORES ===

    renderCounters(card, cardEl) {
        // Remover contadores existentes
        const existingCounters = cardEl.querySelector('.card-counters');
        if (existingCounters) existingCounters.remove();

        if (!card.counters) return;

        const countersContainer = document.createElement('div');
        countersContainer.className = 'card-counters';

        // +1/+1 counters
        if (card.counters.plusOnePlusOne && card.counters.plusOnePlusOne > 0) {
            const counter = document.createElement('div');
            counter.className = 'counter plus-counter';
            counter.textContent = `+${card.counters.plusOnePlusOne}`;
            counter.title = `+${card.counters.plusOnePlusOne}/+${card.counters.plusOnePlusOne} counters`;
            countersContainer.appendChild(counter);
        }

        // -1/-1 counters
        if (card.counters.minusOneMinusOne && card.counters.minusOneMinusOne > 0) {
            const counter = document.createElement('div');
            counter.className = 'counter minus-counter';
            counter.textContent = `-${card.counters.minusOneMinusOne}`;
            counter.title = `-${card.counters.minusOneMinusOne}/-${card.counters.minusOneMinusOne} counters`;
            countersContainer.appendChild(counter);
        }

        if (countersContainer.children.length > 0) {
            cardEl.appendChild(countersContainer);
        }
    }

    // Mostra tela de fim de jogo (mantido para compatibilidade)
    showGameOver(winner, reason) {
        this.showGameOverScreen(winner, reason);
    }
}

// Exportar
window.GameUI = GameUI;
