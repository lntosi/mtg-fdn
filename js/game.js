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
        this.ui.logTurnStart(1, 'Você');

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
        return targetedSpells.includes(card.id);
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
    triggerStromkirkBloodthief(controller) {
        const opponentLostLife = controller === this.player ? this.opponentLostLifeThisTurn : this.playerLostLifeThisTurn;
        if (!opponentLostLife) return;

        controller.battlefield.forEach(card => {
            if (card.id === 'stromkirk_bloodthief') {
                // Encontrar um vampiro para colocar o contador (pode ser ele mesmo)
                const vampires = controller.battlefield.filter(c =>
                    c.type === 'creature' && c.subtype && c.subtype.includes('Vampire')
                );
                if (vampires.length > 0) {
                    // Escolher o vampiro mais forte
                    const target = vampires.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                    if (!target.counters) target.counters = {};
                    target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                    this.ui.log(`Stromkirk Bloodthief: +1/+1 counter em ${target.name}`);
                }
            }
        });
    }

    // Trigger Battle-Rattle Shaman - no início do combate, criatura ganha +2/+0
    triggerBattleRattleShaman(controller) {
        controller.battlefield.forEach(card => {
            if (card.id === 'battle_rattle_shaman') {
                // Encontrar uma criatura para dar +2/+0 (não ela mesma, preferencialmente)
                const creatures = controller.battlefield.filter(c =>
                    c.type === 'creature' && c.instanceId !== card.instanceId
                );
                let target = creatures.length > 0 ? creatures[0] : card;
                // Preferir a criatura com maior poder
                if (creatures.length > 0) {
                    target = creatures.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                }
                target.powerModifier = (target.powerModifier || 0) + 2;
                this.ui.log(`Battle-Rattle Shaman: ${target.name} ganhou +2/+0`);
            }
        });
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
                const validTargets = player.battlefield.filter(c =>
                    c.type === 'creature' &&
                    this.rules.getCreaturePower(c) <= 2 &&
                    c.instanceId !== card.instanceId
                );
                if (validTargets.length > 0) {
                    // Escolher a criatura com maior poder
                    const target = validTargets.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                    this.unblockableThisTurn.push(target.instanceId);
                    this.ui.log(`Goblin Smuggler: ${target.name} não pode ser bloqueado neste turno`);
                }
                break;

            case 'elvish_archdruid':
                // T: adiciona G para cada Elfo que você controla
                card.tapped = true;
                const elfCount = player.battlefield.filter(c =>
                    c.type === 'creature' && c.subtype && c.subtype.includes('Elf')
                ).length;
                // Não implementamos pool de mana flutuante, então apenas logamos
                this.ui.log(`Elvish Archdruid: Adicionaria ${elfCount} mana verde`);
                break;

            case 'wildheart_invoker':
                // 8: criatura alvo ganha +5/+5 e trample até fim do turno
                this.payGenericMana(8, player);
                const creatureTargets = player.battlefield.filter(c =>
                    c.type === 'creature' && c.instanceId !== card.instanceId
                );
                if (creatureTargets.length > 0) {
                    const target = creatureTargets.sort((a, b) =>
                        this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                    )[0];
                    target.powerModifier = (target.powerModifier || 0) + 5;
                    target.toughnessModifier = (target.toughnessModifier || 0) + 5;
                    if (!target.temporaryKeywords) target.temporaryKeywords = [];
                    target.temporaryKeywords.push('trample');
                    this.ui.log(`Wildheart Invoker: ${target.name} ganhou +5/+5 e atropelar`);
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
        this.ui.log(`Fase: ${PHASE_NAMES[this.phase]}`);

        switch (this.phase) {
            case PHASES.UNTAP:
                this.rules.untapAll(this.activePlayer);
                this.activePlayer.landsPlayedThisTurn = 0;
                this.rules.removeSummoningSickness(this.activePlayer);
                // Resetar rastreadores de perda de vida e unblockables
                if (this.activePlayer === this.player) {
                    this.opponentLostLifeThisTurn = false;
                } else {
                    this.playerLostLifeThisTurn = false;
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
                this.triggerBattleRattleShaman(this.activePlayer);
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
                this.triggerStromkirkBloodthief(this.activePlayer);
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
