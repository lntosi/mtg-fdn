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
    etb_draw: 'Comprar ao Entrar - Quando esta criatura entra no campo de batalha, compre uma carta.',
    goblin_lord: 'Senhor dos Goblins - Outros Goblins que você controla recebem +1/+1.'
};

class GameUI {
    constructor(gameState) {
        this.game = gameState;
        this.selectedCard = null;
        this.selectedAttackers = [];
        this.blockerAssignments = {};
        this.selectedBlocker = null; // Bloqueador selecionado aguardando escolha de atacante
        this.selectedLands = []; // Terrenos pré-selecionados para pagamento de mana
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
        this.initAllModalsDrag();
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
        this.playerExile = document.getElementById('player-exile');

        this.opponentHand = document.getElementById('opponent-hand');
        this.opponentCreatures = document.getElementById('opponent-creatures');
        this.opponentLands = document.getElementById('opponent-lands');
        this.opponentOther = document.getElementById('opponent-other');
        this.opponentLife = document.getElementById('opponent-life');
        this.opponentLibrary = document.getElementById('opponent-library');
        this.opponentGraveyard = document.getElementById('opponent-graveyard');
        this.opponentExile = document.getElementById('opponent-exile');

        // Zona central
        this.phaseIndicator = document.getElementById('current-phase');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.messageLog = document.getElementById('message-log');

        // Botões
        this.btnMainAction = document.getElementById('btn-main-action');
        this.btnNextPhase = document.getElementById('btn-next-phase');
        this.btnEndTurn = document.getElementById('btn-end-turn');

        // Modals
        this.playerCustomization = document.getElementById('player-customization');
        this.deckSelection = document.getElementById('deck-selection');
        this.btnStartGame = document.getElementById('btn-start-game');
        this.btnContinueToDecks = document.getElementById('btn-continue-to-decks');

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

        // Mapeamento de cor do deck para símbolo de mana
        this.deckColorToMana = {
            white: 'W',
            blue: 'U',
            black: 'B',
            red: 'R',
            green: 'G'
        };
    }

    /**
     * Configura quais ícones de mana exibir baseado nos decks selecionados
     */
    setupManaIconsForDecks(deckKeys) {
        // Descobrir as cores dos decks selecionados
        const activeColors = new Set();

        deckKeys.forEach(deckKey => {
            const deck = window.CARD_DATABASE[deckKey];
            if (deck && deck.color) {
                const manaSymbol = this.deckColorToMana[deck.color];
                if (manaSymbol) {
                    activeColors.add(manaSymbol);
                }
            }
        });

        // Sempre mostrar mana incolor (para Uncharted Haven e artefatos)
        activeColors.add('C');

        // Esconder/mostrar ícones de mana
        const allColors = ['W', 'U', 'B', 'R', 'G', 'C'];
        allColors.forEach(color => {
            const icon = this.manaIcons[color];
            if (icon) {
                if (activeColors.has(color)) {
                    icon.classList.remove('mana-hidden');
                } else {
                    icon.classList.add('mana-hidden');
                }
            }
        });
    }

    bindEvents() {
        // Personalização do jogador - carregar dados salvos
        this.loadPlayerCustomization();

        // Continuar para seleção de decks
        if (this.btnContinueToDecks) {
            this.btnContinueToDecks.addEventListener('click', () => this.continueToDecks());
        }

        // Seleção de decks do jogador
        const checkboxes = document.querySelectorAll('input[name="deck"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => this.onDeckSelectionChange());
        });

        // Modo de seleção de decks da IA
        const aiDeckMode = document.getElementById('ai-deck-mode');
        if (aiDeckMode) {
            aiDeckMode.addEventListener('change', () => this.onAIDeckModeChange());
        }

        // Seleção manual de decks da IA
        const aiDeckCheckboxes = document.querySelectorAll('input[name="ai-deck"]');
        aiDeckCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.onAIDeckSelectionChange());
        });

        this.btnStartGame.addEventListener('click', () => this.onStartGame());

        // Seletor de dificuldade - atualizar descrição
        const aiDifficultySelect = document.getElementById('ai-difficulty');
        if (aiDifficultySelect) {
            aiDifficultySelect.addEventListener('change', () => this.updateDifficultyDescription());
        }

        // Botões de ação
        this.btnMainAction.addEventListener('click', () => this.onMainActionClick());
        this.btnNextPhase.addEventListener('click', () => this.game.nextPhase());
        this.btnEndTurn.addEventListener('click', () => this.game.skipToEndStep());

        // Clique no cemitério para abrir modal
        this.playerGraveyard.addEventListener('click', () => this.showGraveyardModal('player'));
        this.opponentGraveyard.addEventListener('click', () => this.showGraveyardModal('opponent'));

        // Clique no exílio para abrir modal
        this.playerExile.addEventListener('click', () => this.showExileModal('player'));
        this.opponentExile.addEventListener('click', () => this.showExileModal('opponent'));

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

        // Fechar modal de exílio
        const btnCloseExile = document.getElementById('btn-close-exile');
        if (btnCloseExile) {
            btnCloseExile.addEventListener('click', () => this.hideExileModal());
        }
    }

    // === Log Panel ===
    initLogPanel() {
        const btnToggle = document.getElementById('btn-toggle-log');
        const btnShowLog = document.getElementById('btn-show-log');
        const btnFontIncrease = document.getElementById('btn-font-increase');
        const btnFontDecrease = document.getElementById('btn-font-decrease');

        if (btnToggle) {
            btnToggle.addEventListener('click', () => this.toggleLogPanel());
        }

        if (btnShowLog) {
            btnShowLog.addEventListener('click', () => this.showLogPanel());
        }

        // Controles de tamanho de fonte do histórico
        if (btnFontIncrease) {
            btnFontIncrease.addEventListener('click', () => this.changeLogFontSize(1));
        }

        if (btnFontDecrease) {
            btnFontDecrease.addEventListener('click', () => this.changeLogFontSize(-1));
        }

        // Carregar tamanho de fonte salvo
        this.loadLogFontSize();
    }

    // Tamanhos de fonte disponíveis
    logFontSizes = ['font-xs', 'font-sm', 'font-md', 'font-lg', 'font-xl'];
    currentLogFontIndex = 2; // Começa em 'font-md' (índice 2)

    loadLogFontSize() {
        const savedIndex = localStorage.getItem('mtg_log_font_size');
        if (savedIndex !== null) {
            this.currentLogFontIndex = parseInt(savedIndex, 10);
            this.applyLogFontSize();
        }
    }

    changeLogFontSize(direction) {
        const newIndex = this.currentLogFontIndex + direction;

        // Verificar limites
        if (newIndex < 0 || newIndex >= this.logFontSizes.length) {
            return;
        }

        this.currentLogFontIndex = newIndex;
        this.applyLogFontSize();

        // Salvar preferência
        localStorage.setItem('mtg_log_font_size', this.currentLogFontIndex.toString());
    }

    applyLogFontSize() {
        if (!this.logPanelContent) return;

        // Remover todas as classes de tamanho
        this.logFontSizes.forEach(size => {
            this.logPanelContent.classList.remove(size);
        });

        // Aplicar nova classe
        this.logPanelContent.classList.add(this.logFontSizes[this.currentLogFontIndex]);
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

        // Sincronizar com configurações
        if (window.settingsManager) {
            window.settingsManager.settings.logPanelEnabled = !isCollapsed;
            window.settingsManager.saveSettings();
            // Atualizar checkbox se modal estiver aberto
            const checkbox = document.getElementById('log-panel-enabled');
            if (checkbox) checkbox.checked = !isCollapsed;
        }
    }

    showLogPanel() {
        this.logPanel.classList.remove('collapsed');
        this.gameContainer.classList.remove('log-collapsed');

        const btnShowLog = document.getElementById('btn-show-log');
        if (btnShowLog) {
            btnShowLog.classList.add('hidden');
        }

        // Sincronizar com configurações
        if (window.settingsManager) {
            window.settingsManager.settings.logPanelEnabled = true;
            window.settingsManager.saveSettings();
            const checkbox = document.getElementById('log-panel-enabled');
            if (checkbox) checkbox.checked = true;
        }
    }

    // === Player Customization ===
    loadPlayerCustomization() {
        // Carregar dados salvos do localStorage
        const savedName = localStorage.getItem('mtg_player_name');
        const savedAvatar = localStorage.getItem('mtg_player_avatar');

        const nameInput = document.getElementById('player-name-input');
        if (nameInput && savedName) {
            nameInput.value = savedName;
        }

        if (savedAvatar) {
            const avatarRadio = document.querySelector(`input[name="avatar"][value="${savedAvatar}"]`);
            if (avatarRadio) {
                avatarRadio.checked = true;
            }
        }

        // Carregar imagens reais dos avatares na tela de seleção
        this.loadAvatarSelectionImages();
    }

    // Carrega imagens reais dos planeswalkers na tela de seleção de avatar
    async loadAvatarSelectionImages() {
        const avatarIcons = document.querySelectorAll('.avatar-icon[data-avatar]');

        for (const icon of avatarIcons) {
            const avatarId = icon.dataset.avatar;
            if (avatarId) {
                try {
                    const imageUrl = await window.imageManager.getAvatarImageUrl(avatarId);
                    if (imageUrl) {
                        icon.style.backgroundImage = `url('${imageUrl}')`;
                        icon.classList.add('has-avatar-image');
                        icon.textContent = ''; // Remove emoji
                    }
                } catch (e) {
                    // Manter emoji como fallback
                }
            }
        }
    }

    continueToDecks() {
        // Salvar dados de personalização
        const nameInput = document.getElementById('player-name-input');
        const avatarRadio = document.querySelector('input[name="avatar"]:checked');

        const playerName = nameInput?.value?.trim() || 'Jogador';
        const playerAvatar = avatarRadio?.value || 'jace';

        localStorage.setItem('mtg_player_name', playerName);
        localStorage.setItem('mtg_player_avatar', playerAvatar);

        // Guardar para uso posterior
        this.playerName = playerName;
        this.playerAvatar = playerAvatar;

        // Esconder personalização e mostrar seleção de decks
        if (this.playerCustomization) {
            this.playerCustomization.classList.add('hidden');
        }
        if (this.deckSelection) {
            this.deckSelection.classList.remove('hidden');
        }
    }

    getAvatarEmoji(avatar) {
        const avatars = {
            jace: '🧙‍♂️',
            chandra: '🔥',
            liliana: '💀',
            gideon: '⚔️',
            nissa: '🌿',
            ajani: '🦁'
        };
        return avatars[avatar] || '🧙‍♂️';
    }

    // Carrega imagem de avatar do Scryfall e aplica ao elemento
    async loadAvatarImage(avatarId, element) {
        if (!element || !avatarId) return;

        try {
            const imageUrl = await window.imageManager.getAvatarImageUrl(avatarId);
            if (imageUrl) {
                element.style.backgroundImage = `url('${imageUrl}')`;
                element.classList.add('has-avatar-image');
                element.textContent = ''; // Remove emoji fallback
            }
        } catch (e) {
            console.log('Erro ao carregar avatar:', e);
            // Manter emoji como fallback
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
            const basePower = card.power || 0;
            const baseToughness = card.toughness || 0;

            // Verificar se a criatura está atacando (para bônus como Goblin Oriflamme)
            const isAttacking = this.selectedAttackers?.some(a => a.instanceId === card.instanceId) ||
                               this.game.currentAttackers?.some(a => a.instanceId === card.instanceId) || false;

            // Calcular stats com e sem bônus de ataque para detectar diferença
            const power = this.game.rules ? this.game.rules.getCreaturePower(card, isAttacking) : basePower;
            const toughness = this.game.rules ? this.game.rules.getCreatureToughness(card, isAttacking) : baseToughness;
            const powerWithoutAttack = this.game.rules ? this.game.rules.getCreaturePower(card, false) : basePower;

            // Detectar bônus específicos de ataque comparando stats
            const hasAttackOnlyBonus = isAttacking && power > powerWithoutAttack;
            const damage = card.damage || 0;
            const effectiveToughness = toughness - damage;

            const hasModifiers = power !== basePower || toughness !== baseToughness;
            const hasDamage = damage > 0;

            let statsHtml = '';

            if (hasModifiers && hasDamage) {
                // Tem buff/debuff E dano: "1/2 → 2/3 → 2/1"
                const isBuffed = power > basePower || toughness > baseToughness;
                const currentClass = isBuffed ? 'current-stats buffed' : 'current-stats debuffed';
                statsHtml = `<span class="base-stats">${basePower}/${baseToughness}</span> → ` +
                           `<span class="${currentClass}">${power}/${toughness}</span> → ` +
                           `<span class="effective-stats damaged">${power}/${effectiveToughness}</span>`;
            } else if (hasModifiers) {
                // Só buff/debuff: "1/2 → 2/3"
                const isBuffed = power > basePower || toughness > baseToughness;
                const currentClass = isBuffed ? 'current-stats buffed' : 'current-stats debuffed';
                statsHtml = `<span class="base-stats">${basePower}/${baseToughness}</span> → ` +
                           `<span class="${currentClass}">${power}/${toughness}</span>`;
            } else if (hasDamage) {
                // Só dano: "3/3 → 3/1"
                statsHtml = `<span class="base-stats">${power}/${toughness}</span> → ` +
                           `<span class="effective-stats damaged">${power}/${effectiveToughness}</span>`;
            } else {
                // Sem modificações
                statsHtml = `${power}/${toughness}`;
            }

            // Adicionar indicador de dano se houver
            if (hasDamage) {
                statsHtml += `<span class="damage-indicator" title="Dano marcado (limpo no fim do turno)">⚔️ ${damage}</span>`;
            }

            previewStats.innerHTML = statsHtml;
        } else {
            previewStats.textContent = '';
        }

        // Keywords - incluir keywords base e adicionais
        previewKeywords.innerHTML = '';

        // Keywords relevantes para combate (mostrar no preview)
        const combatKeywords = [
            'flying', 'deathtouch', 'trample', 'lifelink',
            'first_strike', 'double_strike', 'vigilance',
            'haste', 'reach', 'menace', 'flash', 'ward',
            'hexproof', 'indestructible'
        ];

        // Verificar se criatura perdeu habilidades (Eaten by Piranhas, etc.)
        const lostAbilities = card.type === 'creature' && this.game?.rules?.hasLostAllAbilities(card);

        // Keywords originais da carta (filtrar apenas as de combate)
        const baseKeywords = card.keywords || [];
        const visibleBaseKeywords = baseKeywords.filter(kw => combatKeywords.includes(kw));

        visibleBaseKeywords.forEach(kw => {
            const badge = document.createElement('span');
            badge.className = lostAbilities ? 'keyword-badge keyword-lost' : 'keyword-badge';
            badge.textContent = kw.replace('_', ' ');
            badge.dataset.keyword = kw;
            if (lostAbilities) {
                badge.title = 'Perdida (Eaten by Piranhas)';
            }
            previewKeywords.appendChild(badge);
        });

        // Mostrar indicador de "sem habilidades" se afetado por Eaten by Piranhas
        if (lostAbilities) {
            const lostBadge = document.createElement('span');
            lostBadge.className = 'keyword-badge keyword-debuff';
            lostBadge.textContent = '🚫 Sem habilidades';
            lostBadge.title = 'Criatura perdeu todas as habilidades';
            previewKeywords.appendChild(lostBadge);
        }

        // Keywords adicionais de efeitos permanentes (Auras, Lords, etc.) - excluindo temporárias
        if (card.type === 'creature' && this.game.rules) {
            // Verificar se a criatura está atacando (para keywords condicionais como Crossway Troublemakers)
            const isAttackingForKeywords = this.selectedAttackers?.some(a => a.instanceId === card.instanceId) ||
                                           this.game.currentAttackers?.some(a => a.instanceId === card.instanceId) || false;
            const allKeywords = this.game.rules.getCreatureKeywords(card, isAttackingForKeywords);
            const temporaryKws = card.temporaryKeywords || [];
            const additionalKeywords = allKeywords.filter(kw =>
                !baseKeywords.includes(kw) &&
                !temporaryKws.includes(kw) &&
                combatKeywords.includes(kw)
            );

            additionalKeywords.forEach(kw => {
                const badge = document.createElement('span');
                badge.className = 'keyword-badge keyword-added';
                badge.textContent = kw.replace('_', ' ');
                badge.dataset.keyword = kw;
                badge.title = 'Adicionado por efeito permanente';
                previewKeywords.appendChild(badge);
            });
        }

        // Keywords temporárias (buffs até fim do turno - Kindled Fury, Wildheart Invoker, etc.)
        if (card.temporaryKeywords && card.temporaryKeywords.length > 0) {
            const visibleTempKeywords = card.temporaryKeywords.filter(kw => combatKeywords.includes(kw));

            visibleTempKeywords.forEach(kw => {
                const badge = document.createElement('span');
                badge.className = 'keyword-badge keyword-temporary';
                badge.textContent = kw.replace('_', ' ');
                badge.dataset.keyword = kw;
                badge.title = 'Temporário (até fim do turno)';
                previewKeywords.appendChild(badge);
            });
        }

        // Auras/Encantamentos anexados
        if (card.type === 'creature' && this.game) {
            const attachedAuras = this.getAttachedAuras(card);
            if (attachedAuras.length > 0) {
                // Adicionar seção de status
                const statusSection = document.createElement('div');
                statusSection.className = 'preview-status-section';

                attachedAuras.forEach(aura => {
                    const statusBadge = document.createElement('span');

                    // Determinar se é debuff
                    const creatureController = this.game.player.battlefield.includes(card)
                        ? this.game.player : this.game.opponent;
                    const auraController = this.game.player.battlefield.includes(aura)
                        ? this.game.player : this.game.opponent;
                    const isDebuff = aura.id === 'pacifism' ||
                        aura.id === 'eaten_by_piranhas' ||
                        (auraController !== creatureController && !aura.text?.includes('+'));

                    statusBadge.className = isDebuff ? 'status-badge debuff' : 'status-badge buff';
                    statusBadge.textContent = aura.name;
                    statusBadge.title = aura.text || '';
                    statusSection.appendChild(statusBadge);
                });

                previewKeywords.appendChild(statusSection);
            }

            // Equipamentos anexados
            const attachedEquipments = this.getAttachedEquipments(card);
            if (attachedEquipments.length > 0) {
                const equipSection = document.createElement('div');
                equipSection.className = 'preview-status-section';

                attachedEquipments.forEach(equipment => {
                    const equipBadge = document.createElement('span');
                    equipBadge.className = 'status-badge equipment';
                    equipBadge.textContent = `⚔ ${equipment.name}`;
                    equipBadge.title = equipment.text || '';
                    equipSection.appendChild(equipBadge);
                });

                previewKeywords.appendChild(equipSection);
            }

            // Bônus de ataque - detectar comparando bônus com/sem isAttacking
            const isAttacking = this.selectedAttackers?.some(a => a.instanceId === card.instanceId) ||
                               this.game.currentAttackers?.some(a => a.instanceId === card.instanceId) || false;
            if (isAttacking && this.game.rules) {
                const bonusesAttacking = this.game.rules.getCreatureBonuses(card, true);
                const bonusesNotAttacking = this.game.rules.getCreatureBonuses(card, false);

                // Encontrar bônus que só aparecem quando atacando
                const notAttackingNames = bonusesNotAttacking.sources.map(s => s.name);
                const attackOnlyBonuses = bonusesAttacking.sources.filter(src =>
                    !notAttackingNames.includes(src.name)
                );

                if (attackOnlyBonuses.length > 0) {
                    const attackSection = document.createElement('div');
                    attackSection.className = 'preview-status-section';

                    attackOnlyBonuses.forEach(bonus => {
                        const attackBadge = document.createElement('span');
                        attackBadge.className = 'status-badge attack-buff';
                        const bonusText = bonus.toughness > 0
                            ? `+${bonus.power}/+${bonus.toughness}`
                            : `+${bonus.power}/+0`;
                        attackBadge.textContent = `⚔ ${bonus.name} (${bonusText})`;
                        attackBadge.title = 'Bônus enquanto atacando';
                        attackSection.appendChild(attackBadge);
                    });

                    previewKeywords.appendChild(attackSection);
                }
            }
        }

        // Carregar imagem
        this.loadPreviewImage(card, previewImage);

        this.cardPreview.classList.remove('hidden');
    }

    /**
     * Retorna as Auras anexadas a uma criatura
     */
    getAttachedAuras(creature) {
        if (!this.game) return [];
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.filter(card =>
            card.subtype === 'Aura' && card.attachedTo === creature.instanceId
        );
    }

    /**
     * Retorna os Equipamentos anexados a uma criatura
     */
    getAttachedEquipments(creature) {
        if (!this.game) return [];
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        return allBattlefields.filter(card =>
            card.subtype === 'Equipment' && card.attachedTo === creature.instanceId
        );
    }

    async loadPreviewImage(card, element) {
        try {
            let imageUrl;

            // Verificar se é um token e usar API de busca de tokens
            if (window.imageManager.isToken(card.name)) {
                imageUrl = await window.imageManager.getTokenImageUrl(card.name, 'normal');
            } else {
                imageUrl = await window.imageManager.getCardImageUrl(card.name, 'normal');
            }

            if (imageUrl) {
                element.style.backgroundImage = `url('${imageUrl}')`;
            } else {
                element.style.backgroundImage = '';
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

        this.updateStartButtonState();
    }

    onAIDeckModeChange() {
        const aiDeckMode = document.getElementById('ai-deck-mode');
        const aiDeckOptions = document.getElementById('ai-deck-options');

        if (aiDeckMode && aiDeckOptions) {
            if (aiDeckMode.value === 'manual') {
                aiDeckOptions.classList.remove('hidden');
            } else {
                aiDeckOptions.classList.add('hidden');
            }
        }

        this.updateStartButtonState();
    }

    onAIDeckSelectionChange() {
        const checked = document.querySelectorAll('input[name="ai-deck"]:checked');

        // Limitar a 2 seleções
        if (checked.length >= 2) {
            document.querySelectorAll('input[name="ai-deck"]:not(:checked)').forEach(cb => {
                cb.disabled = true;
            });
        } else {
            document.querySelectorAll('input[name="ai-deck"]').forEach(cb => {
                cb.disabled = false;
            });
        }

        this.updateStartButtonState();
    }

    updateStartButtonState() {
        const playerChecked = document.querySelectorAll('input[name="deck"]:checked');
        const playerDeckCount = playerChecked.length;
        const playerHasDecks = playerDeckCount >= 1 && playerDeckCount <= 2;

        const aiDeckMode = document.getElementById('ai-deck-mode')?.value || 'random-different';

        let aiReady = true;
        if (aiDeckMode === 'manual') {
            const aiChecked = document.querySelectorAll('input[name="ai-deck"]:checked');
            // IA deve ter a mesma quantidade de decks que o jogador
            aiReady = aiChecked.length === playerDeckCount;
        }

        this.btnStartGame.disabled = !(playerHasDecks && aiReady);
    }

    onStartGame() {
        const checked = document.querySelectorAll('input[name="deck"]:checked');
        const selectedDecks = Array.from(checked).map(cb => cb.value);
        const deckCount = selectedDecks.length; // 1 ou 2 decks

        // Determinar decks da IA baseado no modo selecionado
        const allDecks = ['cats', 'goblins', 'vampires', 'elves', 'pirates'];
        const aiDeckMode = document.getElementById('ai-deck-mode')?.value || 'random-different';
        let aiDecks;

        if (aiDeckMode === 'manual') {
            // Seleção manual
            const aiChecked = document.querySelectorAll('input[name="ai-deck"]:checked');
            aiDecks = Array.from(aiChecked).map(cb => cb.value);
        } else if (aiDeckMode === 'random-any') {
            // Aleatório de qualquer deck (pode repetir cores do jogador)
            const shuffled = [...allDecks].sort(() => Math.random() - 0.5);
            aiDecks = shuffled.slice(0, deckCount); // Espelha quantidade do jogador
        } else {
            // random-different: Aleatório dos decks não selecionados pelo jogador
            const availableDecks = allDecks.filter(d => !selectedDecks.includes(d));
            const shuffled = availableDecks.sort(() => Math.random() - 0.5);
            aiDecks = shuffled.slice(0, deckCount); // Espelha quantidade do jogador
        }

        // Obter vida inicial selecionada
        const startingLifeSelect = document.getElementById('starting-life');
        const startingLife = startingLifeSelect ? parseInt(startingLifeSelect.value) : 20;

        // Obter dificuldade da IA
        const aiDifficultySelect = document.getElementById('ai-difficulty');
        const aiDifficulty = aiDifficultySelect ? aiDifficultySelect.value : 'mago';

        // Obter quem começa
        const startingPlayerSelect = document.getElementById('starting-player');
        const startingPlayerOption = startingPlayerSelect?.value || 'random';
        let playerFirst;

        if (startingPlayerOption === 'random') {
            // Coin flip
            playerFirst = Math.random() < 0.5;
        } else if (startingPlayerOption === 'player') {
            playerFirst = true;
        } else {
            playerFirst = false;
        }

        // Obter nome e avatar do jogador (do localStorage ou valores padrão)
        const playerName = localStorage.getItem('mtg_player_name') || 'Você';
        const playerAvatar = localStorage.getItem('mtg_player_avatar') || 'jace';

        this.deckSelection.classList.add('hidden');
        this.game.startGame(selectedDecks, aiDecks, { startingLife, playerName, playerAvatar, playerFirst, aiDifficulty });
    }

    // Atualiza a descrição da dificuldade da IA
    updateDifficultyDescription() {
        const select = document.getElementById('ai-difficulty');
        const descriptionEl = document.getElementById('difficulty-description');
        if (!select || !descriptionEl) return;

        const descriptions = {
            aprendiz: 'IA fácil - comete erros, não usa habilidades ativadas',
            mago: 'IA equilibrada - joga de forma competente',
            planeswalker: 'IA difícil - joga de forma otimizada'
        };

        descriptionEl.textContent = descriptions[select.value] || '';
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
            this.selectedBlocker = null;
            this.waitingForBlockers = false;
        } else {
            // Não bloquear
            this.game.declareBlockers({});
            this.selectedBlocker = null;
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
        this.renderStack();

        // Desenhar linhas de combate se estivermos esperando bloqueadores OU se IA declarou bloqueadores
        const hasPlayerBlockers = this.waitingForBlockers;
        const hasAIBlockers = this.game.blockerAssignments && Object.keys(this.game.blockerAssignments).length > 0;

        if (hasPlayerBlockers || hasAIBlockers) {
            // Pequeno delay para garantir que os elementos foram renderizados
            setTimeout(() => this.drawCombatLines(), 50);
        } else {
            this.clearCombatLines();
        }
    }

    renderHand(player, container, isPlayer) {
        container.innerHTML = '';

        player.hand.forEach(card => {
            const cardEl = this.createCardElement(card, isPlayer);

            if (isPlayer) {
                // Adicionar eventos de hover para card preview
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

                // Destacar carta sendo conjurada (aguardando seleção de alvo)
                if (card.pendingCast) {
                    cardEl.classList.add('pending-cast');
                }

                // Verificar se pode jogar
                // Instants podem ser jogados fora do turno do jogador (durante combate do oponente, etc)
                const canPlay = this.game.rules.canPlayCard(card, player);
                const isInstant = card.type === 'instant';
                const isPlayerTurn = this.game.isPlayerTurn();

                // Pode jogar se: (é seu turno E pode jogar) OU (é instant E pode jogar)
                // Instants podem ser jogados a qualquer momento, inclusive durante fase de bloqueio
                const canPlayNow = canPlay && (isPlayerTurn || isInstant);

                // Não pode clicar em carta que está pendingCast (aguardando alvo)
                if (canPlayNow && !card.pendingCast) {
                    cardEl.classList.add('playable');
                    if (isPlayerTurn) {
                        cardEl.classList.add('draggable');
                        // Drag and Drop apenas no seu turno
                        cardEl.draggable = true;
                        cardEl.addEventListener('dragstart', (e) => this.onDragStart(e, card, player));
                        cardEl.addEventListener('dragend', (e) => this.onDragEnd(e));
                    }
                    cardEl.addEventListener('click', () => this.onCardClick(card, player));
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
            // Pular Auras e Equipamentos anexados - são renderizados junto com a criatura
            if ((card.subtype === 'Aura' || card.subtype === 'Equipment') && card.attachedTo) {
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

            // Indicador de permanente na pilha (aguardando resolução)
            if (card.pendingResolution) {
                cardEl.classList.add('pending-resolution');
            }

            // Indicador visual de criatura danificada
            if (card.type === 'creature' && (card.damage || 0) > 0) {
                cardEl.classList.add('creature-damaged');
            }

            // Destacar atacantes (do jogador ou da IA) com animação
            // Usar instanceId para comparação mais robusta (evita problemas de referência)
            const isAttacking = this.selectedAttackers.some(a => a.instanceId === card.instanceId) ||
                               this.game.currentAttackers.some(a => a.instanceId === card.instanceId);
            if (isAttacking) {
                cardEl.classList.add('attacking');
                cardEl.classList.add('attacking-animation');
            }

            // Destacar bloqueadores com animação
            const isBlocking = Object.values(this.blockerAssignments).flat().some(b => b.instanceId === card.instanceId);
            if (isBlocking) {
                cardEl.classList.add('blocking');
                cardEl.classList.add('blocking-animation');
            }

            // Destacar bloqueador selecionado
            if (this.selectedBlocker === card) {
                cardEl.classList.add('selected-blocker');
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
            // Se há bloqueador selecionado e esta é uma criatura atacante do oponente, permitir clicar
            else if (!isPlayer && this.selectedBlocker && isAttacking && card.type === 'creature') {
                cardEl.classList.add('valid-block-target');
                cardEl.addEventListener('click', () => this.selectAttackerToBlock(card));
                cardEl.style.cursor = 'crosshair';
            }
            // Eventos de clique normais
            else if (card.type === 'creature') {
                if (isPlayer && this.game.phase === PHASES.DECLARE_ATTACKERS && this.game.isPlayerTurn()) {
                    const hasAbility = this.game.canActivateAbility && this.game.canActivateAbility(card, this.game.player);

                    if (this.game.rules.canAttack(card)) {
                        if (hasAbility) {
                            // Se tem habilidade, usar timer para distinguir click de dblclick
                            cardEl.addEventListener('click', () => {
                                clearTimeout(this.attackerClickTimeout); // Cancela timeout anterior
                                this.attackerClickTimeout = setTimeout(() => this.toggleAttacker(card), 250);
                            });
                        } else {
                            cardEl.addEventListener('click', () => this.toggleAttacker(card));
                        }
                        cardEl.style.cursor = 'pointer';
                    }
                    // Verificar habilidades ativadas durante combate (Jazal, Ingenious Leonin)
                    if (hasAbility) {
                        cardEl.classList.add('has-ability');
                        cardEl.addEventListener('dblclick', () => {
                            clearTimeout(this.attackerClickTimeout);
                            this.game.activateAbility(card, this.game.player);
                        });
                        cardEl.title = 'Clique duplo para ativar habilidade';
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

            // Renderizar Auras e Equipamentos anexados a esta criatura
            if (card.type === 'creature') {
                this.renderAttachedAuras(card, cardEl);
                this.renderAttachedEquipments(card, cardEl, isPlayer);
            }

            // Contadores (+1/+1, etc) são exibidos apenas no Preview Lateral
            // Removido do campo de batalha para evitar redundância visual

            // Adicionar ao container apropriado
            if (card.type === 'land') {
                // Seleção manual de terrenos para mana (apenas terrenos do jogador não tapados)
                if (isPlayer && !card.tapped) {
                    cardEl.classList.add('land-selectable');
                    cardEl.addEventListener('click', () => this.toggleLandSelection(card));
                }
                // Marcar terreno como selecionado
                if (this.selectedLands.some(l => l.instanceId === card.instanceId)) {
                    cardEl.classList.add('land-selected');
                }
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
            // Determinar se é controlador da criatura
            const creatureController = this.game.player.battlefield.includes(creature)
                ? this.game.player
                : this.game.opponent;

            let hasDebuff = false;
            let hasBuff = false;

            // Criar container para badges de aura
            const auraContainer = document.createElement('div');
            auraContainer.className = 'aura-indicators';

            attachedAuras.forEach((aura) => {
                // Determinar se é buff ou debuff
                const auraController = this.game.player.battlefield.includes(aura)
                    ? this.game.player
                    : this.game.opponent;

                // Auras negativas: Pacifism, Eaten by Piranhas
                const isDebuff = aura.id === 'pacifism' ||
                    aura.id === 'eaten_by_piranhas' ||
                    (auraController !== creatureController && !aura.text?.includes('+'));

                if (isDebuff) {
                    hasDebuff = true;
                } else {
                    hasBuff = true;
                }

                // Criar badge clicável para a aura
                const auraBadge = document.createElement('div');
                auraBadge.className = isDebuff ? 'aura-badge debuff' : 'aura-badge buff';
                auraBadge.textContent = this.getAuraShortName(aura.name);
                auraBadge.title = `${aura.name} - Passe o mouse para ver detalhes`;

                // Adicionar evento de hover para mostrar preview da aura
                auraBadge.addEventListener('mouseenter', (e) => {
                    e.stopPropagation();
                    this.showCardPreview(aura);
                });
                auraBadge.addEventListener('mouseleave', (e) => {
                    e.stopPropagation();
                    this.hideCardPreview();
                });

                auraContainer.appendChild(auraBadge);
            });

            creatureEl.appendChild(auraContainer);

            // Adicionar classe para borda colorida indicando presença de aura
            creatureEl.classList.add('has-aura');

            if (hasDebuff) {
                creatureEl.classList.add('has-debuff-aura');
            }
            if (hasBuff && !hasDebuff) {
                creatureEl.classList.add('has-buff-aura');
            }
        }
    }

    /**
     * Retorna nome abreviado para badge de aura
     */
    getAuraShortName(name) {
        const abbreviations = {
            'Pacifism': 'PAC',
            'Untamed Hunger': 'UH',
            'Eaten by Piranhas': 'EBP',
            'Tricks of the Trade': 'TT'
        };
        return abbreviations[name] || name.substring(0, 3).toUpperCase();
    }

    renderAttachedEquipments(creature, creatureEl, isPlayerCreature) {
        // Buscar equipamentos anexados a esta criatura
        const allBattlefields = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
        const attachedEquipments = allBattlefields.filter(card =>
            card.subtype === 'Equipment' && card.attachedTo === creature.instanceId
        );

        if (attachedEquipments.length > 0) {
            // Adicionar indicador visual de equipamento
            creatureEl.classList.add('has-equipment');

            // Criar container para ícones de equipamento (pequenos badges)
            const equipContainer = document.createElement('div');
            equipContainer.className = 'equipment-indicators';

            attachedEquipments.forEach((equipment) => {
                const equipBadge = document.createElement('div');
                equipBadge.className = 'equipment-badge';
                equipBadge.textContent = '⚔';
                equipBadge.title = `${equipment.name} - Clique duplo para re-equipar`;

                // Adicionar evento de hover para mostrar preview do equipamento
                equipBadge.addEventListener('mouseenter', (e) => {
                    e.stopPropagation();
                    this.showCardPreview(equipment);
                });
                equipBadge.addEventListener('mouseleave', (e) => {
                    e.stopPropagation();
                    this.hideCardPreview();
                });

                // Adicionar interação para re-equipar (apenas se for do jogador)
                const equipmentController = this.game.player.battlefield.includes(equipment)
                    ? this.game.player
                    : this.game.opponent;

                if (equipmentController === this.game.player && isPlayerCreature) {
                    // Verificar se pode ativar a habilidade de equip
                    if (this.game.isPlayerTurn() &&
                        this.game.canActivateAbility &&
                        this.game.canActivateAbility(equipment, this.game.player)) {
                        equipBadge.classList.add('can-reequip');
                        equipBadge.addEventListener('dblclick', (e) => {
                            e.stopPropagation();
                            this.game.activateAbility(equipment, this.game.player);
                        });
                    }
                }

                equipContainer.appendChild(equipBadge);
            });

            creatureEl.appendChild(equipContainer);
        }
    }

    createCardElement(card, showFace) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';

        // Adicionar data-instance-id para referência (para linhas de combate)
        if (card.instanceId) {
            cardEl.dataset.instanceId = card.instanceId;
        }

        if (!showFace) {
            // Carta virada (mão do oponente) - card back oficial MTG
            cardEl.innerHTML = '<div class="card-back"></div>';
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

            // Verificar se a criatura está atacando (para bônus como Goblin Oriflamme)
            const isAttacking = this.selectedAttackers?.some(a => a.instanceId === card.instanceId) ||
                               this.game?.currentAttackers?.some(a => a.instanceId === card.instanceId) || false;

            if (this.game && this.game.rules) {
                power = this.game.rules.getCreaturePower(card, isAttacking);
                toughness = this.game.rules.getCreatureToughness(card, isAttacking);
                bonuses = this.game.rules.getCreatureBonuses(card, isAttacking);
            } else {
                power = basePower + (card.powerModifier || 0);
                toughness = baseToughness + (card.toughnessModifier || 0);
                bonuses = { power: 0, toughness: 0, sources: [] };
            }

            // Calcular dano marcado na criatura
            const markedDamage = card.damage || 0;
            const effectiveToughness = toughness - markedDamage;
            const isDamaged = markedDamage > 0;

            // Verificar se há bônus ativos
            const hasBonus = bonuses.sources.length > 0 || (card.powerModifier || 0) !== 0 || (card.toughnessModifier || 0) !== 0;

            // Detectar bônus específicos de ataque comparando com/sem isAttacking
            let hasAttackBonus = false;
            if (isAttacking && this.game?.rules) {
                const bonusesNotAttacking = this.game.rules.getCreatureBonuses(card, false);
                const notAttackingNames = bonusesNotAttacking.sources.map(s => s.name);
                hasAttackBonus = bonuses.sources.some(src => !notAttackingNames.includes(src.name));
            }

            // Determinar classe do stats baseado em dano e bônus
            let statsClass = 'card-stats';
            if (isDamaged) {
                statsClass += ' damaged';
            } else if (hasAttackBonus) {
                statsClass += ' attack-buffed';
            } else if (hasBonus) {
                statsClass += ' buffed';
            }

            // Mostrar toughness efetiva (toughness - dano) quando danificado
            const displayToughness = isDamaged ? effectiveToughness : toughness;

            // Construir tooltip informativo
            let tooltip = '';
            if (isDamaged) {
                tooltip = `Dano: ${markedDamage} (${toughness} - ${markedDamage} = ${effectiveToughness})`;
            } else if (hasAttackBonus) {
                // Encontrar bônus que só aparecem quando atacando
                const bonusesNotAttacking = this.game.rules.getCreatureBonuses(card, false);
                const notAttackingNames = bonusesNotAttacking.sources.map(s => s.name);
                const attackOnlyBonuses = bonuses.sources.filter(src => !notAttackingNames.includes(src.name));
                const attackBonusSources = attackOnlyBonuses
                    .map(src => `${src.name}: +${src.power}/+${src.toughness}`)
                    .join(', ');
                tooltip = `Bônus de ataque: ${attackBonusSources}`;
            }

            html += `<div class="${statsClass}" title="${tooltip}">${power}/${displayToughness}</div>`;

            // Mostrar indicador de dano separado se houver dano
            if (isDamaged) {
                html += `<div class="card-damage" title="Dano marcado: ${markedDamage}">-${markedDamage}</div>`;
            }

            // Bônus e modificadores são exibidos apenas no Preview Lateral
            // Removido do campo de batalha para evitar redundância visual
        }

        cardEl.innerHTML = html;
        return cardEl;
    }

    async loadCardImage(card, cardEl) {
        try {
            let imageUrl;

            // Verificar se é um token e usar API de busca de tokens
            if (window.imageManager.isToken(card.name)) {
                imageUrl = await window.imageManager.getTokenImageUrl(card.name, 'normal');
            } else {
                // Usar 'normal' para melhor compatibilidade (488x680px, proporção correta)
                imageUrl = await window.imageManager.getCardImageUrl(card.name, 'normal');
            }

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

        const playerAvatarEl = document.getElementById('player-avatar');
        const opponentAvatarEl = document.getElementById('opponent-avatar');

        if (currentPlayerLife < this.previousPlayerLife) {
            this.playerLife.classList.add('damage-taken');
            playerAvatarEl?.classList.add('avatar-damage');
            setTimeout(() => {
                this.playerLife.classList.remove('damage-taken');
                playerAvatarEl?.classList.remove('avatar-damage');
            }, 600);
        } else if (currentPlayerLife > this.previousPlayerLife) {
            this.playerLife.classList.add('life-gained');
            playerAvatarEl?.classList.add('avatar-heal');
            setTimeout(() => {
                this.playerLife.classList.remove('life-gained');
                playerAvatarEl?.classList.remove('avatar-heal');
            }, 600);
        }

        if (currentOpponentLife < this.previousOpponentLife) {
            this.opponentLife.classList.add('damage-taken');
            opponentAvatarEl?.classList.add('avatar-damage');
            setTimeout(() => {
                this.opponentLife.classList.remove('damage-taken');
                opponentAvatarEl?.classList.remove('avatar-damage');
            }, 600);
        } else if (currentOpponentLife > this.previousOpponentLife) {
            this.opponentLife.classList.add('life-gained');
            opponentAvatarEl?.classList.add('avatar-heal');
            setTimeout(() => {
                this.opponentLife.classList.remove('life-gained');
                opponentAvatarEl?.classList.remove('avatar-heal');
            }, 600);
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

        // Verificar floating mana
        const floating = this.game.floatingMana ? this.game.floatingMana.player : null;

        colors.forEach(color => {
            const icon = this.manaIcons[color];
            if (icon) {
                const amount = mana[color] || 0;
                const floatAmount = floating ? (floating[color] || 0) : 0;
                icon.textContent = amount;
                if (amount > 0) {
                    icon.classList.add('has-mana');
                } else {
                    icon.classList.remove('has-mana');
                }
                // Destacar se tem floating mana
                if (floatAmount > 0) {
                    icon.classList.add('floating-mana');
                } else {
                    icon.classList.remove('floating-mana');
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

    updatePlayerInfo() {
        // Atualizar nome e avatar do jogador
        const playerNameEl = document.getElementById('player-name-display');
        const playerAvatarEl = document.getElementById('player-avatar');
        if (playerNameEl && this.game.player) {
            playerNameEl.textContent = this.game.player.name;
        }
        if (playerAvatarEl && this.game.player) {
            // Primeiro mostrar emoji como fallback
            playerAvatarEl.textContent = this.getAvatarEmoji(this.game.player.avatar);
            // Depois tentar carregar imagem real
            this.loadAvatarImage(this.game.player.avatar, playerAvatarEl);
        }

        // Atualizar nome e avatar do oponente (IA)
        const opponentNameEl = document.getElementById('opponent-name');
        const opponentAvatarEl = document.getElementById('opponent-avatar');
        if (opponentNameEl && this.game.opponent) {
            opponentNameEl.textContent = this.game.opponent.name;
        }
        if (opponentAvatarEl && this.game.opponent) {
            // IA também tem um avatar (baseado nos decks dela)
            const aiAvatar = this.game.opponent.avatar || 'opponent';
            if (aiAvatar === 'opponent') {
                opponentAvatarEl.textContent = '🤖'; // Emoji de robô para IA
            } else {
                opponentAvatarEl.textContent = this.getAvatarEmoji(aiAvatar);
                this.loadAvatarImage(aiAvatar, opponentAvatarEl);
            }
        }
    }

    renderLibraryAndGraveyard() {
        // Verificar se o jogo foi inicializado
        if (!this.game.player || !this.game.opponent) return;

        // Atualizar nomes e avatares dos jogadores
        this.updatePlayerInfo();

        // Jogador
        const playerLibCount = this.playerLibrary.querySelector('.library-count');
        const playerGYCount = this.playerGraveyard.querySelector('.graveyard-count');
        const playerExileCount = this.playerExile?.querySelector('.exile-count');
        if (playerLibCount) playerLibCount.textContent = this.game.player.library.length;
        if (playerGYCount) playerGYCount.textContent = this.game.player.graveyard.length;
        if (playerExileCount) playerExileCount.textContent = this.game.player.exile?.length || 0;

        // Oponente
        const oppLibCount = this.opponentLibrary.querySelector('.library-count');
        const oppGYCount = this.opponentGraveyard.querySelector('.graveyard-count');
        const oppExileCount = this.opponentExile?.querySelector('.exile-count');
        if (oppLibCount) oppLibCount.textContent = this.game.opponent.library.length;
        if (oppGYCount) oppGYCount.textContent = this.game.opponent.graveyard.length;
        if (oppExileCount) oppExileCount.textContent = this.game.opponent.exile?.length || 0;

        // Mostrar topo do cemitério se houver cartas
        this.updateGraveyardTop(this.playerGraveyard, this.game.player.graveyard);
        this.updateGraveyardTop(this.opponentGraveyard, this.game.opponent.graveyard);

        // Atualizar exílio (mostrar apenas se houver cartas + carta do topo)
        this.updateExileTop(this.playerExile, this.game.player.exile);
        this.updateExileTop(this.opponentExile, this.game.opponent.exile);
    }

    updateExileTop(exileEl, exileCards) {
        if (!exileEl) return;

        // Mostrar exílio apenas se houver cartas
        if (exileCards && exileCards.length > 0) {
            exileEl.classList.add('has-cards');
        } else {
            exileEl.classList.remove('has-cards');
        }

        // Remover carta anterior se existir
        const existingCard = exileEl.querySelector('.exile-top-card');
        if (existingCard) {
            existingCard.remove();
        }

        if (exileCards && exileCards.length > 0) {
            const topCard = exileCards[exileCards.length - 1];
            const cardEl = document.createElement('div');
            cardEl.className = 'exile-top-card';

            // Carregar imagem da carta do topo (reutiliza loadGraveyardCardImage)
            this.loadGraveyardCardImage(topCard, cardEl);

            exileEl.appendChild(cardEl);
        }
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
        try {
            let imageUrl;

            // Verificar se é um token e usar API de busca de tokens
            if (window.imageManager.isToken(card.name)) {
                imageUrl = await window.imageManager.getTokenImageUrl(card.name, 'small');
            } else {
                imageUrl = await window.imageManager.getCardImageUrl(card.name, 'small');
            }

            if (imageUrl) {
                cardEl.style.background = `url('${imageUrl}') center/contain no-repeat`;
            } else {
                cardEl.textContent = card.name.substring(0, 3);
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
            // Limpar marcação de pendingCast (carta já está na mão)
            delete this.pendingAura.pendingCast;
            this.log(`Seleção de alvo cancelada`);
        }

        this.waitingForTarget = false;
        this.pendingAura = null;
        this.validTargets = [];
        this.targetCallback = null;
        this.render();
    }

    // === Sistema de Scry ===

    promptScry(card, callback) {
        // Usar o modal de trigger target para Scry
        const modal = document.getElementById('trigger-target-modal');
        if (!modal) {
            callback(true); // Fallback: mantém no topo
            return;
        }

        const title = document.getElementById('trigger-target-title');
        const description = document.getElementById('trigger-target-description');
        const creaturesContainer = document.getElementById('trigger-target-creatures');
        const skipBtn = document.getElementById('btn-trigger-skip');

        title.textContent = 'Vidência (Scry 1)';
        description.textContent = 'Olhe a carta do topo do seu grimório. O que deseja fazer?';
        skipBtn.classList.add('hidden');

        creaturesContainer.innerHTML = '';

        // Mostrar a carta com imagem completa
        const cardElement = document.createElement('div');
        cardElement.className = 'trigger-target-creature scry-card-preview';

        // Container para a imagem da carta
        const cardImageContainer = document.createElement('div');
        cardImageContainer.className = 'scry-card-image-container';

        // Placeholder enquanto carrega
        cardImageContainer.innerHTML = `
            <div class="scry-card-loading">
                <div class="card-name">${card.name}</div>
                <div class="card-type">${card.type}${card.subtype ? ' - ' + card.subtype : ''}</div>
            </div>
        `;

        cardElement.appendChild(cardImageContainer);
        creaturesContainer.appendChild(cardElement);

        // Carregar imagem da carta assincronamente
        this.loadScryCardImage(card, cardImageContainer);

        // Botões de ação
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'scry-buttons';

        const keepBtn = document.createElement('button');
        keepBtn.className = 'btn-scry-keep';
        keepBtn.textContent = 'Manter no Topo';
        keepBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            callback(true);
        });

        const bottomBtn = document.createElement('button');
        bottomBtn.className = 'btn-scry-bottom';
        bottomBtn.textContent = 'Colocar no Fundo';
        bottomBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            callback(false);
        });

        buttonsContainer.appendChild(keepBtn);
        buttonsContainer.appendChild(bottomBtn);
        creaturesContainer.appendChild(buttonsContainer);

        modal.classList.remove('hidden');
    }

    async loadScryCardImage(card, container) {
        try {
            let imageUrl;
            if (window.imageManager.isToken(card.name)) {
                imageUrl = await window.imageManager.getTokenImageUrl(card.name, 'normal');
            } else {
                imageUrl = await window.imageManager.getCardImageUrl(card.name, 'normal');
            }

            if (imageUrl) {
                container.innerHTML = `<img class="scry-card-image" src="${imageUrl}" alt="${card.name}">`;
            }
        } catch (err) {
            console.warn('Failed to load scry card image:', err);
            // Mantém o placeholder com nome/tipo
        }
    }

    // === Sistema de Seleção de Alvo na Stack (Counterspell) ===

    promptForStackTarget(counterSpell, stackTargets, callback) {
        // Se só tem um alvo, seleciona automaticamente
        if (stackTargets.length === 1) {
            callback(stackTargets[0]);
            return;
        }

        // Usar o modal de trigger target para selecionar da stack
        const modal = document.getElementById('trigger-target-modal');
        if (!modal) {
            // Fallback: seleciona o primeiro
            callback(stackTargets[0]);
            return;
        }

        const title = document.getElementById('trigger-target-title');
        const description = document.getElementById('trigger-target-description');
        const creaturesContainer = document.getElementById('trigger-target-creatures');
        const skipBtn = document.getElementById('btn-trigger-skip');

        title.textContent = `${counterSpell.name} - Escolha uma Mágica`;
        description.textContent = 'Selecione qual mágica anular:';
        skipBtn.classList.add('hidden');

        creaturesContainer.innerHTML = '';

        stackTargets.forEach(stackItem => {
            const card = stackItem.item;
            const cardElement = document.createElement('div');
            cardElement.className = 'trigger-target-creature';
            cardElement.innerHTML = `
                <div class="card-mini">
                    <div class="card-name">${card.name}</div>
                    <div class="card-type">${card.type}</div>
                    <div class="card-controller">Controlador: ${stackItem.controller.name}</div>
                </div>
            `;

            cardElement.addEventListener('click', () => {
                modal.classList.add('hidden');
                callback(stackItem);
            });

            creaturesContainer.appendChild(cardElement);
        });

        modal.classList.remove('hidden');
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

        modal.classList.remove('hidden');
    }

    hideGraveyardModal() {
        const modal = document.getElementById('graveyard-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // === Modal de Exílio ===

    showExileModal(owner) {
        if (!this.game.player || !this.game.opponent) return;

        const modal = document.getElementById('exile-modal');
        const title = document.getElementById('exile-modal-title');
        const count = document.getElementById('exile-modal-count');
        const cardsContainer = document.getElementById('exile-modal-cards');

        if (!modal) return;

        const exile = owner === 'player' ? this.game.player.exile : this.game.opponent.exile;
        const ownerName = owner === 'player' ? 'Seu Exílio' : 'Exílio do Oponente';

        title.textContent = ownerName;
        count.textContent = `${exile.length} carta${exile.length !== 1 ? 's' : ''}`;

        cardsContainer.innerHTML = '';

        if (exile.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'exile-empty';
            emptyMsg.textContent = 'Nenhuma carta no exílio';
            cardsContainer.appendChild(emptyMsg);
        } else {
            // Mostrar cartas da mais recente para a mais antiga
            [...exile].reverse().forEach(card => {
                const cardEl = this.createCardElement(card, true);
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                cardsContainer.appendChild(cardEl);
            });
        }

        modal.classList.remove('hidden');
    }

    hideExileModal() {
        const modal = document.getElementById('exile-modal');
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
        this.turnIndicator.textContent = `T${this.game.turnNumber}`;
        this.turnIndicator.title = `Turno ${this.game.turnNumber} - ${isPlayerTurn ? 'Seu turno' : 'Turno do oponente'}`;

        // Atualizar classe para indicador visual
        this.turnIndicator.classList.remove('player-turn', 'opponent-turn');
        this.turnIndicator.classList.add(isPlayerTurn ? 'player-turn' : 'opponent-turn');
    }

    updateButtons() {
        const isPlayerTurn = this.game.isPlayerTurn();
        const hasStack = !this.game.isStackEmpty();
        const hasPriority = this.game.priorityPlayer === this.game.player;
        const waitingForPriority = this.game.isWaitingForPriorityResponse && this.game.isWaitingForPriorityResponse();

        // Remover todas as classes de estado do botão principal
        this.btnMainAction.classList.remove('state-advance', 'state-resolve', 'state-priority', 'state-combat', 'state-block', 'state-continue');

        // Determinar estado e texto do botão principal contextual
        let mainButtonEnabled = false;
        let mainButtonText = 'Wait...';
        let mainButtonTitle = 'Turno do oponente';
        let mainButtonState = 'state-advance';

        if (this.waitingForBlockers) {
            // Esperando jogador declarar bloqueadores
            mainButtonEnabled = true;
            const blockCount = Object.values(this.blockerAssignments).flat().length;
            mainButtonText = blockCount > 0 ? `Block (${blockCount})` : 'No Block';
            mainButtonTitle = 'Confirmar bloqueadores';
            mainButtonState = 'state-block';

            // Verificar se há bloqueios inválidos contra menace (apenas 1 bloqueador)
            const menaceWarnings = [];
            for (const attackerId in this.blockerAssignments) {
                const blockers = this.blockerAssignments[attackerId];
                const attacker = this.game.currentAttackers?.find(a => a.instanceId === attackerId);
                if (attacker && this.game.rules.hasKeyword(attacker, 'menace', true) && blockers.length === 1) {
                    menaceWarnings.push(attacker.name);
                }
            }
            if (menaceWarnings.length > 0) {
                mainButtonTitle = `⚠️ ${menaceWarnings.join(', ')} tem Menace - precisa de 2 bloqueadores!`;
            }
        } else if (waitingForPriority) {
            // Janela de prioridade - pode responder
            mainButtonEnabled = true;
            mainButtonText = 'Pass';
            mainButtonTitle = 'Passar prioridade sem responder';
            mainButtonState = 'state-priority';
        } else if (this.game.awaitingPlayerContinue) {
            // Arena-style: aguardando jogador clicar "Continuar"
            mainButtonEnabled = true;
            mainButtonText = 'Continuar';
            mainButtonTitle = this.game.continueReason || 'Clique para continuar';
            mainButtonState = 'state-continue';
        } else if (hasStack && hasPriority) {
            // Tem itens na pilha para resolver
            mainButtonEnabled = true;
            mainButtonText = 'Resolve';
            mainButtonTitle = 'Resolver a pilha';
            mainButtonState = 'state-resolve';
        } else if (isPlayerTurn) {
            // Turno do jogador - mostrar próxima fase
            mainButtonEnabled = true;
            const nextPhaseName = this.getNextPhaseName();

            // Contexto especial para combate
            if (this.game.phase === PHASES.DECLARE_ATTACKERS && this.selectedAttackers.length > 0) {
                mainButtonText = `Attack (${this.selectedAttackers.length})`;
                mainButtonTitle = 'Confirmar atacantes';
                mainButtonState = 'state-combat';
            } else if (this.game.phase === PHASES.DECLARE_ATTACKERS) {
                mainButtonText = 'To Combat';
                mainButtonTitle = 'Ir ao combate sem atacar';
                mainButtonState = 'state-advance';
            } else {
                mainButtonText = `→ ${nextPhaseName}`;
                mainButtonTitle = `Avançar para ${nextPhaseName}`;
                mainButtonState = 'state-advance';
            }
        }

        this.btnMainAction.disabled = !mainButtonEnabled;
        this.btnMainAction.textContent = mainButtonText;
        this.btnMainAction.title = mainButtonTitle;
        this.btnMainAction.classList.add(mainButtonState);

        // Botão secundário "Pular Fase" - só habilitado em situações específicas
        const awaitingContinue = this.game.awaitingPlayerContinue;
        this.btnNextPhase.disabled = !isPlayerTurn || this.waitingForBlockers || hasStack || waitingForPriority || awaitingContinue;

        // Botão "Encerrar Turno" - pula direto para End Step
        // Desabilitado durante combate ativo, stack, ou esperando bloqueadores
        const inActiveCombat = this.game.phase === PHASES.DECLARE_ATTACKERS ||
                              this.game.phase === PHASES.DECLARE_BLOCKERS ||
                              this.game.phase === PHASES.COMBAT_DAMAGE;
        this.btnEndTurn.disabled = !isPlayerTurn || this.waitingForBlockers || hasStack || waitingForPriority || inActiveCombat || awaitingContinue;
    }

    getNextPhaseName() {
        const phase = this.game.phase;
        const shortNames = {
            [PHASES.UNTAP]: 'Manutenção',
            [PHASES.UPKEEP]: 'Compra',
            [PHASES.DRAW]: 'Main 1',
            [PHASES.MAIN1]: 'Combate',
            [PHASES.COMBAT_BEGIN]: 'Atacantes',
            [PHASES.DECLARE_ATTACKERS]: 'Bloqueadores',
            [PHASES.DECLARE_BLOCKERS]: 'Dano',
            [PHASES.COMBAT_DAMAGE]: 'Fim Combate',
            [PHASES.COMBAT_END]: 'Main 2',
            [PHASES.MAIN2]: 'Fim do Turno',
            [PHASES.END]: 'Limpeza',
            [PHASES.CLEANUP]: 'Próx. Turno'
        };
        return shortNames[phase] || 'Próxima';
    }

    onMainActionClick() {
        // Ação contextual baseada no estado do jogo
        if (this.waitingForBlockers) {
            // Confirmar bloqueadores
            this.onBlockClick();
        } else if (this.game.awaitingPlayerContinue) {
            // Arena-style: jogador clicou "Continuar"
            this.game.playerContinue();
        } else if (this.game.isWaitingForPriorityResponse && this.game.isWaitingForPriorityResponse()) {
            // Passar prioridade
            this.game.pass();
        } else if (!this.game.isStackEmpty() && this.game.priorityPlayer === this.game.player) {
            // Resolver pilha
            this.game.pass();
        } else if (this.game.isPlayerTurn()) {
            // Fase de atacantes com atacantes selecionados
            if (this.game.phase === PHASES.DECLARE_ATTACKERS && this.selectedAttackers.length > 0) {
                this.onAttackClick();
            } else if (this.game.phase === PHASES.DECLARE_ATTACKERS) {
                // Avançar sem atacar
                this.log('Você escolheu não atacar');
                this.game.nextPhase();
            } else {
                // Avançar fase
                this.game.nextPhase();
            }
        }
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

    // === Seleção Manual de Terrenos para Mana ===
    toggleLandSelection(card) {
        const index = this.selectedLands.findIndex(l => l.instanceId === card.instanceId);
        if (index > -1) {
            this.selectedLands.splice(index, 1);
        } else {
            this.selectedLands.push(card);
        }
        this.render();
    }

    clearLandSelection() {
        if (this.selectedLands.length > 0) {
            this.selectedLands = [];
            this.render();
        }
    }

    // Retorna o mana disponível dos terrenos selecionados
    getSelectedLandsMana() {
        const mana = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, any: 0 };
        this.selectedLands.forEach(land => {
            if (land.produces === 'any') {
                if (land.chosenColor) {
                    mana[land.chosenColor]++;
                } else {
                    mana.any++;
                }
            } else if (land.produces) {
                mana[land.produces]++;
            }
        });
        return mana;
    }

    selectBlocker(card) {
        // Verificar se a criatura pode bloquear (não está virada)
        if (card.tapped) {
            this.log(`${card.name} está virada e não pode bloquear.`);
            return;
        }

        // Verificar se já está bloqueando - se sim, remover do bloqueio
        const alreadyBlocking = Object.values(this.blockerAssignments).flat().some(b => b.instanceId === card.instanceId);
        if (alreadyBlocking) {
            // Remover do bloqueio
            for (const attackerId in this.blockerAssignments) {
                const blockers = this.blockerAssignments[attackerId];
                const idx = blockers.findIndex(b => b.instanceId === card.instanceId);
                if (idx > -1) {
                    blockers.splice(idx, 1);
                    if (blockers.length === 0) {
                        delete this.blockerAssignments[attackerId];
                    }
                    break;
                }
            }
            this.selectedBlocker = null;
            this.render();
            return;
        }

        // Selecionar este bloqueador e aguardar clique no atacante
        this.selectedBlocker = card;
        this.log(`Selecione um atacante para ${card.name} bloquear (ou clique novamente para cancelar)`);
        this.render();
    }

    // Seleciona um atacante para ser bloqueado pelo bloqueador selecionado
    selectAttackerToBlock(attacker) {
        if (!this.selectedBlocker) {
            return;
        }

        // Verificar se pode bloquear este atacante
        if (!this.game.rules.canBlock(this.selectedBlocker, attacker)) {
            this.log(`${this.selectedBlocker.name} não pode bloquear ${attacker.name}.`);
            return;
        }

        // Adicionar bloqueador ao atacante (permite múltiplos bloqueadores)
        if (!this.blockerAssignments[attacker.instanceId]) {
            this.blockerAssignments[attacker.instanceId] = [];
        }
        this.blockerAssignments[attacker.instanceId].push(this.selectedBlocker);
        this.log(`${this.selectedBlocker.name} bloqueia ${attacker.name}`);

        this.selectedBlocker = null;
        this.render();
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
        // Registrar no LogManager para debug/export
        if (window.logManager) {
            // Categorizar automaticamente baseado no conteúdo
            let category = 'action';
            if (message.includes('dano') || message.includes('perdeu') || message.includes('destruído')) {
                category = 'combat';
            } else if (message.includes('ganhou') && message.includes('vida')) {
                category = 'state';
            } else if (message.includes('jogou') || message.includes('lançou')) {
                category = 'spell';
            } else if (message.includes('trigger') || message.includes('ETB') || message.includes(':')) {
                category = 'trigger';
            }
            window.logManager.add(category, message);
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

        // Registrar no LogManager
        if (window.logManager) {
            window.logManager.turn(`Turno ${turnNumber} - ${playerName}`, {
                turnNumber,
                activePlayer: playerName
            });
        }

        if (this.logPanelContent) {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry turn-start';
            logEntry.textContent = message;
            this.logPanelContent.appendChild(logEntry);
            this.logPanelContent.scrollTop = this.logPanelContent.scrollHeight;
        }
    }

    // === RENDERIZAÇÃO DO STACK ===
    renderStack() {
        const stackEl = document.getElementById('stack');
        if (!stackEl) return;

        stackEl.innerHTML = '';

        if (this.game.stack.length === 0) {
            stackEl.classList.add('empty');
            stackEl.innerHTML = '<span class="stack-empty-text">Pilha vazia</span>';
            this.updateStackBadge(); // Update badge when stack changes
            return;
        }

        stackEl.classList.remove('empty');

        // Renderizar itens da pilha (do topo para a base)
        const stackItems = [...this.game.stack].reverse();
        stackItems.forEach((stackItem, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'stack-item';

            if (index === 0) {
                itemEl.classList.add('stack-top');
            }

            const item = stackItem.item;
            const controllerName = stackItem.controller === this.game.player ? 'Você' : 'Oponente';

            let itemHtml = `
                <div class="stack-item-name">${item.name || 'Habilidade'}</div>
                <div class="stack-item-controller">${controllerName}</div>
            `;

            if (stackItem.target) {
                itemHtml += `<div class="stack-item-target">Alvo: ${stackItem.target.name}</div>`;
            }

            itemEl.innerHTML = itemHtml;
            stackEl.appendChild(itemEl);
        });

        // Mostrar indicador de prioridade
        const priorityEl = document.createElement('div');
        priorityEl.className = 'stack-priority';
        const priorityText = this.game.priorityPlayer === this.game.player
            ? 'Sua prioridade'
            : 'Prioridade do oponente';
        priorityEl.textContent = priorityText;
        stackEl.appendChild(priorityEl);

        // Update the badge and dropdown
        this.updateStackBadge();
    }

    // === STACK BADGE E DROPDOWN ===
    updateStackBadge() {
        const badge = document.getElementById('stack-badge');
        const dropdown = document.getElementById('stack-dropdown');
        const dropdownItems = document.getElementById('stack-dropdown-items');

        if (!badge || !dropdown || !dropdownItems) return;

        const stackCount = this.game.stack.length;

        if (stackCount === 0) {
            badge.classList.add('hidden');
            dropdown.classList.add('hidden');
            return;
        }

        // Show badge with count
        badge.textContent = `[${stackCount}]`;
        badge.classList.remove('hidden');
        dropdown.classList.remove('hidden');

        // Populate dropdown items (top to bottom = LIFO order)
        dropdownItems.innerHTML = '';
        const stackItems = [...this.game.stack].reverse();

        stackItems.forEach((stackItem, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'stack-dropdown-item';

            if (index === 0) {
                itemEl.classList.add('stack-top');
            }

            const item = stackItem.item;
            const controllerName = stackItem.controller === this.game.player ? 'Você' : 'Oponente';
            const displayIndex = stackCount - index; // Show as 3, 2, 1 (top first)

            let itemHtml = `
                <span class="stack-dropdown-item-index">${displayIndex}</span>
                <span class="stack-dropdown-item-name">${item.name || 'Habilidade'}</span>
                <div class="stack-dropdown-item-controller">${controllerName}</div>
            `;

            if (stackItem.target) {
                itemHtml += `<div class="stack-dropdown-item-target">→ ${stackItem.target.name}</div>`;
            }

            itemEl.innerHTML = itemHtml;
            dropdownItems.appendChild(itemEl);
        });
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

    // Mostrar modal para selecionar cartas para ir para o fundo (London Mulligan)
    showMulliganBottomPrompt(cardsToBottom) {
        const modal = document.getElementById('mulligan-bottom-modal');
        const hand = document.getElementById('mulligan-bottom-hand');
        const text = document.getElementById('mulligan-bottom-text');
        const btnConfirm = document.getElementById('btn-confirm-bottom');

        if (!modal) return;

        text.textContent = `Selecione ${cardsToBottom} carta(s) para colocar no fundo do grimório:`;

        // Rastrear cartas selecionadas (na ordem de seleção)
        let selectedCards = [];

        // Função para atualizar estado do botão
        const updateButton = () => {
            const remaining = cardsToBottom - selectedCards.length;
            if (remaining === 0) {
                btnConfirm.disabled = false;
                btnConfirm.textContent = `Confirmar (${selectedCards.length}/${cardsToBottom})`;
            } else {
                btnConfirm.disabled = true;
                btnConfirm.textContent = `Selecione mais ${remaining} carta(s)`;
            }
        };

        // Renderizar mão atual
        hand.innerHTML = '';
        this.game.player.hand.forEach(card => {
            const cardEl = this.createCardElement(card, true);

            // Adicionar evento de clique para selecionar/deselecionar
            cardEl.addEventListener('click', () => {
                const instanceId = card.instanceId;
                const index = selectedCards.indexOf(instanceId);

                if (index === -1) {
                    // Selecionar carta (se ainda não atingiu o limite)
                    if (selectedCards.length < cardsToBottom) {
                        selectedCards.push(instanceId);
                        cardEl.classList.add('selected-bottom');
                        cardEl.dataset.bottomOrder = selectedCards.length;
                    }
                } else {
                    // Deselecionar carta
                    selectedCards.splice(index, 1);
                    cardEl.classList.remove('selected-bottom');
                    delete cardEl.dataset.bottomOrder;

                    // Atualizar números das outras cartas selecionadas
                    selectedCards.forEach((id, i) => {
                        const otherEl = hand.querySelector(`[data-instance-id="${id}"]`);
                        if (otherEl) {
                            otherEl.dataset.bottomOrder = i + 1;
                        }
                    });
                }

                updateButton();
            });

            // Preview da carta
            cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
            cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

            hand.appendChild(cardEl);
        });

        // Botão de confirmação
        btnConfirm.onclick = () => {
            if (selectedCards.length === cardsToBottom) {
                modal.classList.add('hidden');
                this.game.putCardsOnBottom(selectedCards);
            }
        };

        updateButton();
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

    // === PROMPT FRENZIED GOBLIN ===

    promptFrenziedGoblin(potentialBlockers) {
        return new Promise((resolve) => {
            const modal = document.getElementById('frenzied-goblin-modal');
            if (!modal) {
                // Se o modal não existir, retornar null (não usa a habilidade)
                resolve(null);
                return;
            }

            const creaturesContainer = document.getElementById('frenzied-goblin-creatures');
            const btnSkip = document.getElementById('btn-frenzied-skip');

            // Renderizar criaturas do oponente
            creaturesContainer.innerHTML = '';
            potentialBlockers.forEach(creature => {
                const cardEl = this.createCardElement(creature, true);
                cardEl.classList.add('frenzied-target');
                cardEl.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    resolve({ target: creature });
                });
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(creature));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                creaturesContainer.appendChild(cardEl);
            });

            // Botão para pular
            btnSkip.onclick = () => {
                modal.classList.add('hidden');
                resolve(null);
            };

            modal.classList.remove('hidden');
        });
    }

    // === PROMPT GENÉRICO PARA TRIGGERS COM SELEÇÃO DE ALVO ===

    /**
     * Mostra um modal para o jogador selecionar um alvo para um trigger/habilidade
     * @param {Object} options - Opções do prompt
     * @param {string} options.title - Título do modal (nome da carta)
     * @param {string} options.description - Descrição do efeito
     * @param {Array} options.validTargets - Lista de criaturas válidas como alvo
     * @param {boolean} options.canSkip - Se pode pular (opcional, default false)
     * @returns {Promise<Object|null>} - A criatura selecionada ou null se pulou
     */
    promptTriggerTarget(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('trigger-target-modal');
            if (!modal) {
                // Se o modal não existir, escolher automaticamente o primeiro
                if (options.validTargets.length > 0) {
                    resolve(options.validTargets[0]);
                } else {
                    resolve(null);
                }
                return;
            }

            const title = document.getElementById('trigger-target-title');
            const description = document.getElementById('trigger-target-description');
            const creaturesContainer = document.getElementById('trigger-target-creatures');
            const btnSkip = document.getElementById('btn-trigger-skip');

            // Configurar conteúdo
            title.textContent = options.title || 'Selecione um Alvo';
            description.textContent = options.description || 'Escolha uma criatura:';

            // Configurar botão de pular
            if (options.canSkip) {
                btnSkip.classList.remove('hidden');
                btnSkip.onclick = () => {
                    modal.classList.add('hidden');
                    resolve(null);
                };
            } else {
                btnSkip.classList.add('hidden');
            }

            // Renderizar criaturas válidas
            creaturesContainer.innerHTML = '';
            options.validTargets.forEach(creature => {
                const cardEl = this.createCardElement(creature, true);
                cardEl.classList.add('trigger-valid-target');
                cardEl.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    resolve(creature);
                });
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(creature));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                creaturesContainer.appendChild(cardEl);
            });

            modal.classList.remove('hidden');
        });
    }

    /**
     * Mostra um modal para o jogador escolher uma cor de mana
     * Usado para Uncharted Haven e terrenos similares
     * @param {Object} options - Opções do prompt
     * @param {string} options.title - Título do modal
     * @param {string} options.description - Descrição
     * @param {Array} options.colors - Cores disponíveis (ex: ['W', 'G'])
     * @returns {Promise<string>} - Cor escolhida (ex: 'W')
     */
    promptColorChoice(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('color-choice-modal');
            if (!modal) {
                // Fallback: escolhe a primeira cor
                resolve(options.colors[0]);
                return;
            }

            const title = document.getElementById('color-choice-title');
            const description = document.getElementById('color-choice-description');
            const optionsContainer = document.getElementById('color-choice-options');

            // Nomes das cores em português
            const colorNames = {
                W: 'Branco',
                U: 'Azul',
                B: 'Preto',
                R: 'Vermelho',
                G: 'Verde'
            };

            // Símbolos de mana (usando Mana Font)
            const colorSymbols = {
                W: '<i class="ms ms-w ms-cost ms-2x"></i>',
                U: '<i class="ms ms-u ms-cost ms-2x"></i>',
                B: '<i class="ms ms-b ms-cost ms-2x"></i>',
                R: '<i class="ms ms-r ms-cost ms-2x"></i>',
                G: '<i class="ms ms-g ms-cost ms-2x"></i>'
            };

            // Configurar conteúdo
            title.textContent = options.title || 'Escolha uma Cor';
            description.textContent = options.description || 'Este terreno produzirá mana da cor escolhida:';

            // Renderizar botões de cor
            optionsContainer.innerHTML = '';
            options.colors.forEach(color => {
                const btn = document.createElement('button');
                btn.className = `color-choice-btn color-${color}`;
                btn.innerHTML = colorSymbols[color] || color;
                btn.title = colorNames[color] || color;

                btn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    resolve(color);
                });

                optionsContainer.appendChild(btn);
            });

            modal.classList.remove('hidden');
        });
    }

    /**
     * Mostra um modal de confirmação Sim/Não genérico
     * @param {Object} options - Opções do prompt
     * @param {string} options.title - Título do modal
     * @param {string} options.description - Descrição/pergunta
     * @param {string} options.yesText - Texto do botão Sim (opcional, default "Sim")
     * @param {string} options.noText - Texto do botão Não (opcional, default "Não")
     * @returns {Promise<boolean>} - true se Sim, false se Não
     */
    promptYesNo(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('yes-no-modal');
            if (!modal) {
                // Fallback: assume Não
                resolve(false);
                return;
            }

            const title = document.getElementById('yes-no-title');
            const description = document.getElementById('yes-no-description');
            const btnYes = document.getElementById('btn-yes');
            const btnNo = document.getElementById('btn-no');

            // Configurar conteúdo
            title.textContent = options.title || 'Confirmar';
            description.textContent = options.description || 'Deseja realizar esta ação?';
            btnYes.textContent = options.yesText || 'Sim';
            btnNo.textContent = options.noText || 'Não';

            // Event handlers
            const cleanup = () => {
                modal.classList.add('hidden');
                btnYes.onclick = null;
                btnNo.onclick = null;
            };

            btnYes.onclick = () => {
                cleanup();
                resolve(true);
            };

            btnNo.onclick = () => {
                cleanup();
                resolve(false);
            };

            modal.classList.remove('hidden');
        });
    }

    /**
     * Mostra um modal perguntando se o jogador quer pagar o custo de Ward
     * @param {Object} target - A criatura com Ward que está sendo mirada
     * @param {number} wardCost - O custo de Ward a ser pago
     * @param {boolean} canPay - Se o jogador tem mana suficiente para pagar
     * @returns {Promise<boolean>} - true se o jogador quer pagar, false se cancela
     */
    promptWardPayment(target, wardCost, canPay) {
        return new Promise((resolve) => {
            const modal = document.getElementById('ward-prompt-modal');
            if (!modal) {
                // Se não há modal, assume que não paga (anula)
                resolve(false);
                return;
            }

            const description = document.getElementById('ward-prompt-description');
            const cardContainer = document.getElementById('ward-prompt-card');
            const costAmount = document.getElementById('ward-cost-amount');
            const btnPay = document.getElementById('btn-ward-pay');
            const btnCancel = document.getElementById('btn-ward-cancel');

            // Configurar conteúdo
            description.textContent = `${target.name} tem Ward ${wardCost}. Pague ${wardCost} mana ou sua mágica será anulada.`;
            costAmount.textContent = wardCost;

            // Renderizar a carta alvo
            cardContainer.innerHTML = '';
            const cardEl = this.createCardElement(target, true);
            cardEl.style.transform = 'scale(0.9)';
            cardContainer.appendChild(cardEl);

            // Configurar botão de pagar
            btnPay.disabled = !canPay;
            if (!canPay) {
                btnPay.textContent = 'Mana Insuficiente';
            } else {
                btnPay.textContent = `Pagar ${wardCost}`;
            }

            // Limpar eventos anteriores
            const newBtnPay = btnPay.cloneNode(true);
            const newBtnCancel = btnCancel.cloneNode(true);
            btnPay.parentNode.replaceChild(newBtnPay, btnPay);
            btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

            newBtnPay.disabled = !canPay;
            if (!canPay) {
                newBtnPay.textContent = 'Mana Insuficiente';
            } else {
                newBtnPay.textContent = `Pagar ${wardCost}`;
            }

            newBtnPay.addEventListener('click', () => {
                modal.classList.add('hidden');
                resolve(true);
            });

            newBtnCancel.addEventListener('click', () => {
                modal.classList.add('hidden');
                resolve(false);
            });

            modal.classList.remove('hidden');
        });
    }

    /**
     * Mostra um modal para o jogador selecionar múltiplos alvos para um trigger/habilidade
     * @param {Object} options - Opções do prompt
     * @param {string} options.title - Título do modal (nome da carta)
     * @param {string} options.description - Descrição do efeito
     * @param {Array} options.validTargets - Lista de criaturas válidas como alvo
     * @param {number} options.maxTargets - Número máximo de alvos
     * @param {number} options.minTargets - Número mínimo de alvos (default 0)
     * @param {boolean} options.canSkip - Se pode pular (opcional, default false)
     * @returns {Promise<Array|null>} - Array de criaturas selecionadas ou null se pulou
     */
    promptMultiTarget(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('trigger-target-modal');
            if (!modal) {
                // Se o modal não existir, escolher automaticamente
                const autoSelected = options.validTargets.slice(0, options.maxTargets || 2);
                resolve(autoSelected);
                return;
            }

            const title = document.getElementById('trigger-target-title');
            const description = document.getElementById('trigger-target-description');
            const creaturesContainer = document.getElementById('trigger-target-creatures');
            const btnSkip = document.getElementById('btn-trigger-skip');

            const maxTargets = options.maxTargets || 2;
            const minTargets = options.minTargets || 0;
            const selectedTargets = [];

            // Configurar conteúdo
            title.textContent = options.title || 'Selecione Alvos';
            description.textContent = options.description || `Escolha até ${maxTargets} criaturas:`;

            // Criar botão de confirmar (remover o antigo se existir para evitar event listeners duplicados)
            let btnConfirm = document.getElementById('btn-trigger-confirm');
            if (btnConfirm) {
                btnConfirm.remove();
            }
            btnConfirm = document.createElement('button');
            btnConfirm.id = 'btn-trigger-confirm';
            btnConfirm.className = 'btn-trigger-confirm';
            btnConfirm.textContent = `Confirmar (${selectedTargets.length}/${maxTargets})`;
            btnConfirm.disabled = selectedTargets.length < minTargets;
            btnSkip.parentNode.insertBefore(btnConfirm, btnSkip);

            btnConfirm.onclick = () => {
                modal.classList.add('hidden');
                btnConfirm.remove();
                resolve(selectedTargets);
            };

            // Configurar botão de pular
            if (options.canSkip || minTargets === 0) {
                btnSkip.classList.remove('hidden');
                btnSkip.textContent = 'Pular';
                btnSkip.onclick = () => {
                    modal.classList.add('hidden');
                    btnConfirm.remove();
                    resolve([]);
                };
            } else {
                btnSkip.classList.add('hidden');
            }

            // Renderizar criaturas válidas
            creaturesContainer.innerHTML = '';
            options.validTargets.forEach(creature => {
                const cardEl = this.createCardElement(creature, true);
                cardEl.classList.add('trigger-valid-target');

                cardEl.addEventListener('click', () => {
                    const idx = selectedTargets.findIndex(t => t.instanceId === creature.instanceId);
                    if (idx >= 0) {
                        // Desselecionar
                        selectedTargets.splice(idx, 1);
                        cardEl.classList.remove('selected-target');
                    } else if (selectedTargets.length < maxTargets) {
                        // Selecionar
                        selectedTargets.push(creature);
                        cardEl.classList.add('selected-target');
                    }
                    // Atualizar botão
                    btnConfirm.textContent = `Confirmar (${selectedTargets.length}/${maxTargets})`;
                    btnConfirm.disabled = selectedTargets.length < minTargets;
                });

                cardEl.addEventListener('mouseenter', () => this.showCardPreview(creature));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                creaturesContainer.appendChild(cardEl);
            });

            modal.classList.remove('hidden');
        });
    }

    // === LINHAS DE CONEXÃO ATACANTE-BLOQUEADOR ===

    drawCombatLines() {
        const svg = document.getElementById('combat-lines-overlay');
        if (!svg) return;

        // Limpar linhas anteriores
        svg.innerHTML = '';

        // Verificar bloqueadores do jogador (quando jogador está bloqueando)
        const playerAssignments = this.blockerAssignments || {};

        // Verificar bloqueadores da IA (quando IA está bloqueando atacantes do jogador)
        const aiAssignments = this.game.blockerAssignments || {};

        // Combinar ambos (apenas um estará ativo por vez)
        const allAssignments = Object.keys(playerAssignments).length > 0
            ? playerAssignments
            : aiAssignments;

        if (Object.keys(allAssignments).length === 0) return;

        // Desenhar linhas para cada par bloqueador-atacante
        // blockerAssignments é {attackerInstanceId: [blocker1, blocker2, ...]}
        for (const [attackerInstanceId, blockers] of Object.entries(allAssignments)) {
            const attackerEl = document.querySelector(`[data-instance-id="${attackerInstanceId}"]`);
            if (!attackerEl) continue;

            for (const blocker of blockers) {
                const blockerEl = document.querySelector(`[data-instance-id="${blocker.instanceId}"]`);
                if (blockerEl) {
                    this.drawLineBetweenCards(svg, blockerEl, attackerEl);
                }
            }
        }
    }

    drawLineBetweenCards(svg, fromEl, toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Calcular centros das cartas
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;

        // Criar linha
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('class', 'combat-line');
        svg.appendChild(line);

        // Criar seta no meio da linha apontando para o atacante
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const angle = Math.atan2(toY - fromY, toX - fromX);

        const arrowSize = 10;
        const arrowPoints = [
            [midX + arrowSize * Math.cos(angle), midY + arrowSize * Math.sin(angle)],
            [midX + arrowSize * Math.cos(angle + 2.5), midY + arrowSize * Math.sin(angle + 2.5)],
            [midX + arrowSize * Math.cos(angle - 2.5), midY + arrowSize * Math.sin(angle - 2.5)]
        ];

        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.setAttribute('points', arrowPoints.map(p => p.join(',')).join(' '));
        arrow.setAttribute('class', 'combat-line-arrow');
        svg.appendChild(arrow);
    }

    clearCombatLines() {
        const svg = document.getElementById('combat-lines-overlay');
        if (svg) {
            svg.innerHTML = '';
        }
    }

    // === SISTEMA VISUAL DE CONTADORES ===

    renderCounters(card, cardEl) {
        // Remover contadores existentes
        const existingCounters = cardEl.querySelector('.card-counters');
        if (existingCounters) existingCounters.remove();

        if (!card.counters) return;

        const countersContainer = document.createElement('div');
        countersContainer.className = 'card-counters';

        // +1/+1 counters - mostrar no formato +X/+X
        if (card.counters.plusOnePlusOne && card.counters.plusOnePlusOne > 0) {
            const counter = document.createElement('div');
            counter.className = 'counter plus-counter';
            const n = card.counters.plusOnePlusOne;
            counter.textContent = `+${n}/+${n}`;
            counter.title = `${n} contador(es) +1/+1`;
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

    // === SISTEMA DE JANELA DE PRIORIDADE ===

    /**
     * Mostra a janela de prioridade para o jogador responder com instants
     * @param {string} reason - Razão da janela (ex: "IA lançou Lightning Bolt")
     * @param {Array} playableInstants - Lista de instants jogáveis
     * @returns {Promise<string>} - 'pass' ou 'respond'
     */
    showPriorityWindow(reason, playableInstants) {
        return new Promise((resolve) => {
            const modal = document.getElementById('priority-window-modal');
            if (!modal) {
                resolve('pass');
                return;
            }

            const reasonEl = document.getElementById('priority-window-reason');
            const instantsContainer = document.getElementById('priority-instants');
            const btnRespond = document.getElementById('btn-priority-respond');
            const btnPass = document.getElementById('btn-priority-pass');

            // Verificar se todos os elementos existem
            if (!reasonEl || !instantsContainer || !btnRespond || !btnPass) {
                console.error('Priority window: missing DOM elements');
                resolve('pass');
                return;
            }

            // Configurar conteúdo
            reasonEl.textContent = reason;

            // Renderizar instants disponíveis
            instantsContainer.innerHTML = '';
            if (playableInstants && playableInstants.length > 0) {
                playableInstants.forEach(card => {
                    const cardEl = this.createCardElement(card, true);
                    cardEl.classList.add('priority-instant-card');
                    cardEl.addEventListener('mouseenter', () => this.showCardPreview(card));
                    cardEl.addEventListener('mouseleave', () => this.hideCardPreview());
                    instantsContainer.appendChild(cardEl);
                });
            } else {
                instantsContainer.innerHTML = '<p class="no-instants">Nenhum instant disponível</p>';
            }

            // Handlers dos botões
            const cleanup = () => {
                modal.classList.add('hidden');
                btnRespond.onclick = null;
                btnPass.onclick = null;
            };

            btnRespond.onclick = () => {
                cleanup();
                this.log('Você escolheu responder');
                resolve('respond');
            };

            btnPass.onclick = () => {
                cleanup();
                this.log('Você passou a prioridade');
                resolve('pass');
            };

            // Destacar cartas na mão que podem ser jogadas
            this.highlightPlayableInstants(true);

            // Inicializar drag se ainda não foi feito
            this.initPriorityWindowDrag();

            modal.classList.remove('hidden');
        });
    }

    /**
     * Inicializa funcionalidade de arrastar a janela de prioridade
     */
    initPriorityWindowDrag() {
        const modal = document.getElementById('priority-window-modal');
        const content = modal?.querySelector('.priority-window-content');
        const handle = modal?.querySelector('.priority-drag-handle');

        if (!handle || !content || content._dragInitialized) return;

        content._dragInitialized = true;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            content.classList.add('dragging');

            // Pegar posição atual (se já foi movido) ou calcular inicial
            const rect = content.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            startX = e.clientX;
            startY = e.clientY;

            // Mudar para position fixed para arrastar livremente
            content.style.position = 'fixed';
            content.style.left = initialX + 'px';
            content.style.top = initialY + 'px';
            content.style.margin = '0';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newX = initialX + dx;
            let newY = initialY + dy;

            // Limitar aos bounds da janela
            const maxX = window.innerWidth - content.offsetWidth - 10;
            const maxY = window.innerHeight - content.offsetHeight - 10;

            newX = Math.max(10, Math.min(newX, maxX));
            newY = Math.max(10, Math.min(newY, maxY));

            content.style.left = newX + 'px';
            content.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                content.classList.remove('dragging');
            }
        });
    }

    /**
     * Torna um modal arrastável pelo header/título
     * @param {string} modalId - ID do elemento modal
     * @param {string} handleSelector - Seletor CSS do elemento de arraste (ex: 'h2', '.modal-header')
     */
    makeModalDraggable(modalId, handleSelector = 'h2') {
        const modal = document.getElementById(modalId);
        const content = modal?.querySelector('.modal-content') || modal?.querySelector('[class*="-content"]');
        const handle = content?.querySelector(handleSelector);

        if (!handle || !content || content._dragInitialized) return;

        content._dragInitialized = true;

        // Adicionar classe para indicar que é arrastável
        handle.classList.add('modal-drag-handle');

        let isDragging = false;
        let startX, startY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            // Não iniciar drag se clicou em um botão dentro do handle
            if (e.target.tagName === 'BUTTON') return;

            isDragging = true;
            content.classList.add('dragging');

            const rect = content.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            startX = e.clientX;
            startY = e.clientY;

            content.style.position = 'fixed';
            content.style.left = initialX + 'px';
            content.style.top = initialY + 'px';
            content.style.margin = '0';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newX = initialX + dx;
            let newY = initialY + dy;

            const maxX = window.innerWidth - content.offsetWidth - 10;
            const maxY = window.innerHeight - content.offsetHeight - 10;

            newX = Math.max(10, Math.min(newX, maxX));
            newY = Math.max(10, Math.min(newY, maxY));

            content.style.left = newX + 'px';
            content.style.top = newY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                content.classList.remove('dragging');
            }
        });
    }

    /**
     * Inicializa drag em todos os modais do jogo
     */
    initAllModalsDrag() {
        // Lista de modais e seus handles
        const modals = [
            { id: 'trigger-target-modal', handle: 'h2' },
            { id: 'color-choice-modal', handle: 'h2' },
            { id: 'ward-prompt-modal', handle: 'h2' },
            { id: 'frenzied-goblin-modal', handle: 'h2' },
            { id: 'game-end-modal', handle: 'h2' }
        ];

        modals.forEach(({ id, handle }) => {
            this.makeModalDraggable(id, handle);
        });
    }

    /**
     * Esconde a janela de prioridade
     */
    hidePriorityWindow() {
        const modal = document.getElementById('priority-window-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.highlightPlayableInstants(false);
    }

    /**
     * Destaca instants jogáveis na mão do jogador
     * @param {boolean} highlight - true para destacar, false para remover destaque
     */
    highlightPlayableInstants(highlight) {
        if (!this.playerHand) return;

        const handCards = this.playerHand.querySelectorAll('.card');
        handCards.forEach(cardEl => {
            if (highlight) {
                // Verificar se é um instant jogável
                const card = this.findCardByElement(cardEl);
                if (card && card.type === 'instant' && this.game.rules.canCastInstant(card, this.game.player)) {
                    cardEl.classList.add('instant-highlight');
                }
            } else {
                cardEl.classList.remove('instant-highlight');
            }
        });
    }

    /**
     * Destaca todas as cartas jogáveis (instants + habilidades ativáveis)
     * Usado pelo sistema Arena-style
     * @param {boolean} highlight - true para destacar, false para remover destaque
     */
    highlightPlayableCards(highlight) {
        // Destacar instants na mão
        this.highlightPlayableInstants(highlight);

        // Destacar criaturas com habilidades ativáveis no battlefield
        if (!this.playerBattlefield) return;

        const battlefieldCards = this.playerBattlefield.querySelectorAll('.card');
        battlefieldCards.forEach(cardEl => {
            if (highlight) {
                const card = this.findCardByElement(cardEl);
                if (card && this.game.canActivateAbility && this.game.canActivateAbility(card, this.game.player)) {
                    cardEl.classList.add('ability-highlight');
                }
            } else {
                cardEl.classList.remove('ability-highlight');
            }
        });
    }

    /**
     * Encontra a carta correspondente a um elemento DOM
     * @param {HTMLElement} cardEl - Elemento da carta
     * @returns {Object|null} - Carta ou null
     */
    findCardByElement(cardEl) {
        const instanceId = cardEl.dataset.instanceId;
        if (instanceId) {
            return this.game.player.hand.find(c => c.instanceId === instanceId);
        }
        return null;
    }

    /**
     * Mostra indicador flutuante de que o jogador pode responder
     */
    showPriorityIndicator() {
        const indicator = document.getElementById('priority-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    /**
     * Esconde indicador de prioridade
     */
    hidePriorityIndicator() {
        const indicator = document.getElementById('priority-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    /**
     * Mostra modal para jogador dividir dano entre múltiplos bloqueadores
     * Regra MTG 510.1c: o atacante divide seu dano como quiser entre bloqueadores
     * @param {Object} options - Opções do prompt
     * @param {Object} options.attacker - Criatura atacante
     * @param {Array} options.blockers - Lista de criaturas bloqueadoras
     * @param {number} options.totalDamage - Dano total a distribuir (poder do atacante)
     * @returns {Promise<Object>} - Mapa de instanceId -> dano atribuído
     */
    promptDamageAssignment(options) {
        return new Promise((resolve) => {
            const { attacker, blockers, totalDamage } = options;

            // Se só tem 1 bloqueador, todo dano vai pra ele
            if (blockers.length === 1) {
                resolve({ [blockers[0].instanceId]: totalDamage });
                return;
            }

            // Criar modal dinamicamente se não existir
            let modal = document.getElementById('damage-assignment-modal');
            if (!modal) {
                modal = this._createDamageAssignmentModal();
            }

            const title = document.getElementById('damage-assignment-title');
            const description = document.getElementById('damage-assignment-description');
            const attackerContainer = document.getElementById('damage-assignment-attacker');
            const blockersContainer = document.getElementById('damage-assignment-blockers');
            const remainingDisplay = document.getElementById('damage-assignment-remaining');
            const btnConfirm = document.getElementById('btn-damage-confirm');

            // Estado de atribuição
            const damageAssignment = {};
            blockers.forEach(b => damageAssignment[b.instanceId] = 0);
            let remainingDamage = totalDamage;

            // Configurar título
            title.textContent = 'Atribuir Dano de Combate';
            description.textContent = `${attacker.name} (${totalDamage} de dano) está sendo bloqueado por ${blockers.length} criaturas. Distribua o dano:`;

            // Mostrar atacante
            attackerContainer.innerHTML = '';
            const attackerCard = this.createCardElement(attacker, true);
            attackerCard.classList.add('damage-source');
            attackerContainer.appendChild(attackerCard);

            // Função para atualizar display
            const updateDisplay = () => {
                remainingDamage = totalDamage - Object.values(damageAssignment).reduce((a, b) => a + b, 0);
                remainingDisplay.textContent = `Dano restante: ${remainingDamage}`;
                remainingDisplay.classList.toggle('damage-complete', remainingDamage === 0);
                btnConfirm.disabled = remainingDamage !== 0;

                // Atualizar badges de dano nos bloqueadores
                blockers.forEach(blocker => {
                    const badge = document.getElementById(`damage-badge-${blocker.instanceId}`);
                    if (badge) {
                        badge.textContent = damageAssignment[blocker.instanceId];
                        const toughness = this.game.rules.getCreatureToughness(blocker);
                        badge.classList.toggle('lethal', damageAssignment[blocker.instanceId] >= toughness);
                    }
                });
            };

            // Renderizar bloqueadores com controles
            blockersContainer.innerHTML = '';
            blockers.forEach(blocker => {
                const blockerToughness = this.game.rules.getCreatureToughness(blocker);

                const wrapper = document.createElement('div');
                wrapper.className = 'damage-blocker-wrapper';

                const cardEl = this.createCardElement(blocker, true);
                cardEl.addEventListener('mouseenter', () => this.showCardPreview(blocker));
                cardEl.addEventListener('mouseleave', () => this.hideCardPreview());

                // Badge de dano atribuído
                const damageBadge = document.createElement('div');
                damageBadge.className = 'damage-assigned-badge';
                damageBadge.id = `damage-badge-${blocker.instanceId}`;
                damageBadge.textContent = '0';

                // Info de resistência
                const toughnessInfo = document.createElement('div');
                toughnessInfo.className = 'blocker-toughness-info';
                toughnessInfo.textContent = `Resistência: ${blockerToughness}`;

                // Controles de +/-
                const controls = document.createElement('div');
                controls.className = 'damage-controls';

                const btnMinus = document.createElement('button');
                btnMinus.className = 'btn-damage-control btn-minus';
                btnMinus.textContent = '-';
                btnMinus.onclick = () => {
                    if (damageAssignment[blocker.instanceId] > 0) {
                        damageAssignment[blocker.instanceId]--;
                        updateDisplay();
                    }
                };

                const btnPlus = document.createElement('button');
                btnPlus.className = 'btn-damage-control btn-plus';
                btnPlus.textContent = '+';
                btnPlus.onclick = () => {
                    if (remainingDamage > 0) {
                        damageAssignment[blocker.instanceId]++;
                        updateDisplay();
                    }
                };

                // Botão de dano letal rápido
                const btnLethal = document.createElement('button');
                btnLethal.className = 'btn-damage-lethal';
                btnLethal.textContent = `Letal (${blockerToughness})`;
                btnLethal.onclick = () => {
                    const needed = blockerToughness - damageAssignment[blocker.instanceId];
                    if (needed > 0 && remainingDamage >= needed) {
                        damageAssignment[blocker.instanceId] = blockerToughness;
                        updateDisplay();
                    }
                };

                controls.appendChild(btnMinus);
                controls.appendChild(btnPlus);
                controls.appendChild(btnLethal);

                wrapper.appendChild(cardEl);
                wrapper.appendChild(damageBadge);
                wrapper.appendChild(toughnessInfo);
                wrapper.appendChild(controls);
                blockersContainer.appendChild(wrapper);
            });

            // Botão confirmar
            btnConfirm.onclick = () => {
                modal.classList.add('hidden');
                resolve(damageAssignment);
            };

            updateDisplay();
            modal.classList.remove('hidden');
        });
    }

    /**
     * Cria o modal de atribuição de dano se não existir
     */
    _createDamageAssignmentModal() {
        const modal = document.createElement('div');
        modal.id = 'damage-assignment-modal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-content damage-assignment-content">
                <h2 id="damage-assignment-title">Atribuir Dano de Combate</h2>
                <p id="damage-assignment-description"></p>
                <div id="damage-assignment-attacker" class="damage-attacker-section"></div>
                <div id="damage-assignment-remaining" class="damage-remaining">Dano restante: 0</div>
                <div id="damage-assignment-blockers" class="damage-blockers-section"></div>
                <div class="damage-assignment-buttons">
                    <button id="btn-damage-confirm" class="btn btn-primary" disabled>Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }
}

// Exportar
window.GameUI = GameUI;
