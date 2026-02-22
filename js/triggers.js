/**
 * TriggerManager - Gerencia todos os triggers do jogo
 *
 * Este módulo centraliza:
 * - ETB (enters-the-battlefield) effects
 * - LTB (leaves-the-battlefield) effects
 * - Death triggers
 * - Combat triggers (attack/block)
 * - End of turn triggers
 * - Other creature enters triggers
 *
 * COMO ADICIONAR NOVOS TRIGGERS:
 *
 * 1. ETB simples (keyword-based):
 *    - Adicione o keyword na carta em cards.js (ex: 'etb_draw')
 *    - Adicione o handler em resolveETB() na seção apropriada
 *
 * 2. ETB específico de carta:
 *    - Adicione um bloco if (card.id === 'sua_carta') em resolveETB()
 *
 * 3. Death trigger:
 *    - Implemente em onCreatureDeath() ou crie método específico
 *
 * 4. Combat trigger:
 *    - Attack triggers: adicione em onDeclareAttackers()
 *    - Block triggers: adicione em onDeclareBlockers()
 *
 * 5. End of turn trigger:
 *    - Adicione em onEndStep()
 */

class TriggerManager {
    constructor(game) {
        this.game = game;
    }

    // Atalhos para acesso aos objetos do jogo
    get ui() { return this.game.ui; }
    get rules() { return this.game.rules; }
    get player() { return this.game.player; }
    get opponent() { return this.game.opponent; }

    // ========================================
    // ETB TRIGGERS (Enters The Battlefield)
    // ========================================

    /**
     * Resolve todos os triggers de entrada de uma carta
     * @param {Object} card - Carta que entrou em campo
     * @param {Object} controller - Jogador que controla a carta
     */
    async resolveETB(card, controller) {
        const opponent = controller === this.player ? this.opponent : this.player;

        // --- KEYWORD-BASED ETBs ---

        // ETB Draw (Helpful Hunter, etc.)
        if (card.keywords?.includes('etb_draw')) {
            this.rules.drawCard(controller);
            this.ui.log(`${controller.name} comprou uma carta`);
        }

        // ETB Treasure (Corsair Captain, etc.)
        if (card.keywords?.includes('etb_treasure')) {
            this._createTreasureToken(controller, card.name);
        }

        // ETB Bounce (Bigfin Bouncer, etc.)
        if (card.keywords?.includes('etb_bounce')) {
            await this._handleBounceETB(card, controller, opponent);
        }

        // ETB Counter Two (Felidar Savior, etc.)
        if (card.keywords?.includes('etb_counter_two')) {
            await this._handleCounterTwoETB(card, controller);
        }

        // ETB Equip Pirate (Pirate's Cutlass)
        if (card.keywords?.includes('etb_equip_pirate')) {
            await this._handleEquipPirateETB(card, controller);
        }

        // Raid Draw (Storm Fleet Spy, Skyship Buccaneer)
        if (card.keywords?.includes('raid_draw')) {
            this._handleRaidDraw(controller);
        }

        // ETB Cat Token (Prideful Parent, etc.)
        if (card.keywords?.includes('etb_cat_token')) {
            this._createCatToken(controller);
        }

        // ETB Drain 2 (Vampire Spawn, etc.)
        if (card.keywords?.includes('etb_drain_2')) {
            this._handleDrain2ETB(controller, opponent);
        }

        // ETB Treasure Two (Rapacious Dragon)
        if (card.keywords?.includes('etb_treasure_two')) {
            this._createTreasureToken(controller, card.name);
            this._createTreasureToken(controller, card.name);
        }

        // ETB Double Strike All (Terror of Mount Velus)
        if (card.keywords?.includes('etb_double_strike_all')) {
            this._handleDoubleStrikeAllETB(controller);
        }

        // ETB Debuff (Burrog Befuddler)
        if (card.keywords?.includes('etb_debuff')) {
            await this._handleDebuffETB(card, controller, opponent);
        }

        // ETB Loot (Icewind Elemental)
        if (card.keywords?.includes('etb_loot')) {
            await this._handleLootETB(controller);
        }

        // ETB Gain Life 1 (Inspiring Overseer, etc.)
        if (card.keywords?.includes('etb_gain_life_1')) {
            this.game.gainLife(controller, 1);
            this.ui.log(`${card.name}: ${controller.name} ganhou 1 vida`);
        }

        // ETB X Counters (Wildwood Scourge and other Hydras)
        // A criatura entra com X contadores +1/+1, onde X foi escolhido ao conjurar
        if (card.keywords?.includes('etb_x_counters')) {
            const xValue = card.xValue || 0;
            if (xValue > 0) {
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + xValue;
                this.ui.log(`${card.name} entra com ${xValue} contadores +1/+1`);

                // Trigger counter_synergy para outras criaturas (como outro Wildwood Scourge)
                // Nota: O próprio Wildwood Scourge não trigger de si mesmo porque
                // onCounterPlaced verifica card !== creature
                this.onCounterPlaced(card, controller, xValue);
            }
            // Limpar xValue após uso
            delete card.xValue;
        }

        // === UNDEAD DECK ETBs ===

        // ETB Mill 2 (Crow of Dark Tidings)
        if (card.keywords?.includes('etb_mill_2')) {
            this._handleMill(controller, 2, card.name);
        }

        // ETB Ping Any (Skeleton Archer)
        if (card.keywords?.includes('etb_ping_any')) {
            await this._handlePingAnyETB(card, controller, opponent);
        }

        // --- CARD-SPECIFIC ETBs ---

        // Dwynen's Elite - criar token Elf se controla outro
        if (card.id === 'dwynenss_elite') {
            this._handleDwynensEliteETB(card, controller);
        }

        // Elvish Regrower - devolve permanente do cemitério para a mão
        if (card.id === 'elvish_regrower') {
            await this._handleElvishRegrowerETB(card, controller);
        }

        // Bloodtithe Collector - força descarte se oponente perdeu vida
        if (card.id === 'bloodtithe_collector') {
            await this._handleBloodtitheCollectorETB(controller, opponent);
        }

        // Volley Veteran - dano igual ao número de Goblins
        if (card.id === 'volley_veteran') {
            await this._handleVolleyVeteranETB(card, controller, opponent);
        }

        // Prayer of Binding - exile nonland permanent + gain 2 life
        if (card.id === 'prayer_of_binding') {
            await this._handlePrayerOfBindingETB(card, controller, opponent);
        }

        // New Horizons - put +1/+1 counter on target creature you control
        if (card.id === 'new_horizons') {
            await this._handleNewHorizonsETB(card, controller);
        }

        // Starlight Snare / Freeze Aura - tap the enchanted creature on ETB
        if (card.keywords?.includes('freeze_aura') && card.attachedTo) {
            const allCreatures = [...this.player.battlefield, ...this.opponent.battlefield];
            const enchantedCreature = allCreatures.find(c => c.instanceId === card.attachedTo);
            if (enchantedCreature) {
                enchantedCreature.tapped = true;
                this.ui.log(`${card.name}: ${enchantedCreature.name} foi virado`);
            }
        }

        // --- LAND ETBs ---

        // Uncharted Haven - escolher cor ao entrar
        if (card.type === 'land' && card.produces === 'any' && !card.chosenColor) {
            await this._handleUnchartedHavenETB(card, controller);
        }

        // --- TRIGGER PARA OUTRAS CRIATURAS ---
        if (card.type === 'creature') {
            this.onOtherCreatureEnters(card, controller);
        }
    }

    // ========================================
    // ETB HELPER METHODS
    // ========================================

    /**
     * Reset card state when changing zones (MTG rule: cards forget their state)
     * Called when cards move from graveyard to hand, battlefield to hand, etc.
     */
    _resetCardState(card) {
        card.damage = 0;
        card.powerModifier = 0;
        card.toughnessModifier = 0;
        card.temporaryKeywords = [];
        card.tapped = false;
        card.mustBeBlocked = false;
        card.pendingResolution = false;
        card.counters = null; // Counters are lost when changing zones
        // Restaurar subtype original se transformado (MTG 400.7: zona nova = objeto novo)
        if (card._originalSubtype) {
            card.subtype = card._originalSubtype;
            delete card._originalSubtype;
        }
        delete card.transformed;
        delete card.attachedTo;
        delete card.controlledBy;
        // Note: summoningSickness is set when entering battlefield, not here
    }

    _createTreasureToken(controller, sourceName) {
        controller.battlefield.push({
            instanceId: `treasure_token_${globalInstanceCounter++}`,
            name: 'Treasure Token',
            type: 'artifact',
            subtype: 'Treasure',
            text: 'T, Sacrifique este artefato: Adicione uma mana de qualquer cor.',
            keywords: ['sacrifice_for_mana'],
            produces: 'any',
            canSacrificeForMana: true,
            isToken: true
        });
        this.ui.log(`${sourceName} criou um token de Tesouro`);
    }

    _createCatToken(controller) {
        const token = {
            instanceId: `cat_token_${globalInstanceCounter++}`,
            name: 'Cat Token',
            type: 'creature',
            subtype: 'Cat',
            power: 1,
            toughness: 1,
            summoningSickness: true,
            isToken: true
        };
        controller.battlefield.push(token);
        this.ui.log(`Criado um token Cat 1/1`);
        this.onOtherCreatureEnters(token, controller);
    }

    _createElfToken(controller) {
        const token = {
            instanceId: `elf_token_${globalInstanceCounter++}`,
            name: 'Elf Warrior Token',
            type: 'creature',
            subtype: 'Elf Warrior',
            power: 1,
            toughness: 1,
            summoningSickness: true,
            isToken: true
        };
        controller.battlefield.push(token);
        this.onOtherCreatureEnters(token, controller);
    }

    _createZombieToken(controller) {
        const token = {
            instanceId: `zombie_token_${globalInstanceCounter++}`,
            name: 'Zombie Token',
            type: 'creature',
            subtype: 'Zombie',
            power: 2,
            toughness: 2,
            summoningSickness: true,
            isToken: true
        };
        controller.battlefield.push(token);
        this.onOtherCreatureEnters(token, controller);
    }

    _handleDrain2ETB(controller, opponent) {
        this.game.loseLife(opponent, 2);
        this.game.gainLife(controller, 2);
        this.ui.log(`${opponent.name} perdeu 2 vidas, ${controller.name} ganhou 2 vidas`);
        this.game.checkGameOver();
    }

    _handleDwynensEliteETB(card, controller) {
        const hasOtherElf = controller.battlefield.some(c =>
            c.type === 'creature' &&
            c.subtype?.includes('Elf') &&
            c.instanceId !== card.instanceId
        );
        if (hasOtherElf) {
            this._createElfToken(controller);
            this.ui.log(`Dwynen's Elite criou um token Elf Warrior 1/1`);
        }
    }

    async _handleElvishRegrowerETB(card, controller) {
        // Permanentes = criaturas, artefatos, encantamentos, terrenos (não instants/sorceries)
        const permanentTypes = ['creature', 'artifact', 'enchantment', 'land'];
        const validTargets = controller.graveyard.filter(c => permanentTypes.includes(c.type));

        if (validTargets.length === 0) {
            this.ui.log(`${card.name}: ${controller.name} não tem permanentes no cemitério`);
            return;
        }

        const returnPermanent = (target) => {
            const index = controller.graveyard.indexOf(target);
            if (index !== -1) {
                controller.graveyard.splice(index, 1);
                this._resetCardState(target); // Reset damage, modifiers, etc.
                controller.hand.push(target);
                this.ui.log(`${card.name}: ${controller.name} recuperou ${target.name} do cemitério`);
                this.ui.render();
            }
        };

        if (controller === this.player) {
            // Jogador escolhe o alvo
            const selected = await this.ui.promptTriggerTarget({
                title: `${card.name} - Recuperar Permanente`,
                description: 'Escolha uma carta de permanente do seu cemitério para devolver à sua mão:',
                validTargets: validTargets,
                canSkip: false
            });
            if (selected) {
                returnPermanent(selected);
            }
        } else {
            // IA escolhe automaticamente (prioriza criaturas mais fortes, depois terrenos)
            const target = validTargets.sort((a, b) => {
                // Prioridade: criaturas > terrenos > outros
                const priority = { creature: 3, land: 2, artifact: 1, enchantment: 1 };
                const priorityDiff = (priority[b.type] || 0) - (priority[a.type] || 0);
                if (priorityDiff !== 0) return priorityDiff;
                // Entre criaturas, prefere as mais fortes
                if (a.type === 'creature' && b.type === 'creature') {
                    return (b.power || 0) - (a.power || 0);
                }
                return 0;
            })[0];
            returnPermanent(target);
        }
    }

    async _handleBloodtitheCollectorETB(controller, opponent) {
        const opponentLostLife = controller === this.player
            ? this.game.opponentLostLifeThisTurn
            : this.game.playerLostLifeThisTurn;

        if (opponentLostLife && opponent.hand.length > 0) {
            let discarded;
            if (opponent === this.player) {
                // Jogador humano escolhe qual carta descartar
                const selected = await this.ui.promptTriggerTarget({
                    title: 'Bloodtithe Collector',
                    description: 'Escolha uma carta da sua mão para descartar:',
                    validTargets: opponent.hand,
                    canSkip: false
                });
                if (selected) {
                    const idx = opponent.hand.indexOf(selected);
                    if (idx > -1) discarded = opponent.hand.splice(idx, 1)[0];
                }
            } else {
                // IA descarta aleatoriamente
                const randomIndex = Math.floor(Math.random() * opponent.hand.length);
                discarded = opponent.hand.splice(randomIndex, 1)[0];
            }
            if (discarded) {
                opponent.graveyard.push(discarded);
                this.ui.log(`${opponent.name} descartou ${discarded.name}`);
            }
        }
    }

    async _handleVolleyVeteranETB(card, controller, opponent) {
        const validTargets = opponent.battlefield.filter(c => c.type === 'creature');
        if (validTargets.length === 0) return;

        // Contar Goblins (incluindo o próprio Volley Veteran)
        const goblinCount = controller.battlefield.filter(c =>
            c.type === 'creature' && c.subtype && c.subtype.includes('Goblin')
        ).length;

        if (goblinCount === 0) return;

        const dealDamage = async (targetCreature) => {
            targetCreature.damage = (targetCreature.damage || 0) + goblinCount;
            this.ui.log(`Volley Veteran causou ${goblinCount} de dano a ${targetCreature.name}`);

            // Verificar se a criatura morreu
            await this.game.checkCreatureDeath(targetCreature, opponent);
            this.ui.render();
        };

        if (controller === this.player) {
            const selected = await this.ui.promptTriggerTarget({
                title: `Volley Veteran - Selecione um Alvo`,
                description: `Cause ${goblinCount} de dano a criatura alvo que um oponente controla:`,
                validTargets: validTargets,
                canSkip: false
            });
            if (selected) await dealDamage(selected);
        } else {
            // IA escolhe a criatura que pode matar, ou a mais forte
            const target = validTargets.sort((a, b) => {
                const toughnessA = this.rules.getCreatureToughness(a) - (a.damage || 0);
                const toughnessB = this.rules.getCreatureToughness(b) - (b.damage || 0);
                // Prioriza criaturas que podem ser mortas
                const canKillA = goblinCount >= toughnessA;
                const canKillB = goblinCount >= toughnessB;
                if (canKillA && !canKillB) return -1;
                if (!canKillA && canKillB) return 1;
                // Entre criaturas que podem ser mortas, prefere as mais fortes
                if (canKillA && canKillB) {
                    const powerA = this.rules.getCreaturePower(a);
                    const powerB = this.rules.getCreaturePower(b);
                    return powerB - powerA;
                }
                // Se não pode matar nenhuma, prefere causar dano na mais forte
                return this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a);
            })[0];
            await dealDamage(target);
        }
    }

    async _handleBounceETB(card, controller, opponent) {
        // Excluir criaturas com pendingResolution (ainda na pilha, não são permanentes)
        const validTargets = opponent.battlefield.filter(c => c.type === 'creature' && !c.pendingResolution);
        if (validTargets.length === 0) return;

        const bounceCreature = (targetCreature) => {
            this.game.bounceToHand(targetCreature, opponent, card.name);
            this.ui.render();
        };

        if (controller === this.player) {
            const selected = await this.ui.promptTriggerTarget({
                title: `${card.name} - Selecione um Alvo`,
                description: 'Devolva uma criatura que um oponente controla para a mão de seu dono:',
                validTargets: validTargets,
                canSkip: false
            });
            if (selected) bounceCreature(selected);
        } else {
            // IA escolhe a criatura mais forte (usa getCreaturePower para considerar counters, lords, equipment)
            const target = validTargets.sort((a, b) => {
                return this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a);
            })[0];
            bounceCreature(target);
        }
    }

    async _handleCounterTwoETB(card, controller) {
        const validTargets = controller.battlefield.filter(c =>
            c.type === 'creature' && c.instanceId !== card.instanceId
        );
        if (validTargets.length === 0) return;

        const applyCounters = (targets) => {
            targets.forEach(target => {
                if (!target.counters) target.counters = {};
                target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${card.name} colocou um contador +1/+1 em ${target.name}`);
            });
            // Trigger counter synergies (Wildwood Scourge, etc.)
            targets.forEach(target => {
                this.onCounterPlaced(target, controller, 1);
            });
            this.ui.render();
        };

        if (controller === this.player) {
            const selected = await this.ui.promptMultiTarget({
                title: `${card.name} - Selecione Alvos`,
                description: 'Coloque um contador +1/+1 em até duas outras criaturas que você controla:',
                validTargets: validTargets,
                maxTargets: 2,
                minTargets: 0,
                canSkip: true
            });
            if (selected?.length > 0) applyCounters(selected);
        } else {
            // IA escolhe criaturas menores para bufar (usa getCreaturePower para considerar counters, lords, equipment)
            const targets = validTargets
                .sort((a, b) => {
                    return this.rules.getCreaturePower(a) - this.rules.getCreaturePower(b);
                })
                .slice(0, 2);
            applyCounters(targets);
        }
    }

    async _handleEquipPirateETB(card, controller) {
        const validPirates = controller.battlefield.filter(c =>
            c.type === 'creature' && c.subtype?.includes('Pirate')
        );

        if (validPirates.length === 0) {
            this.ui.log(`Pirate's Cutlass entrou sem Piratas para equipar`);
            return;
        }

        const attachEquipment = (target) => {
            card.attachedTo = target.instanceId;
            this.ui.log(`Pirate's Cutlass foi equipado em ${target.name}`);
            this.ui.render();
        };

        if (validPirates.length === 1) {
            // Apenas um Pirata - equipar automaticamente
            attachEquipment(validPirates[0]);
        } else if (controller === this.player) {
            // Jogador escolhe qual Pirata equipar
            const selected = await this.ui.promptTriggerTarget({
                title: `Pirate's Cutlass`,
                description: 'Escolha um Pirata para equipar:',
                validTargets: validPirates,
                canSkip: false
            });
            if (selected) attachEquipment(selected);
        } else {
            // IA escolhe o Pirata mais forte
            const target = validPirates.sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            )[0];
            attachEquipment(target);
        }
    }

    _handleRaidDraw(controller) {
        const controllerKey = controller === this.player ? 'player' : 'opponent';
        if (this.game.attackedThisTurn?.[controllerKey]) {
            this.rules.drawCard(controller);
            this.ui.log(`Raid: ${controller.name} comprou uma carta`);
        }
    }

    /**
     * Terror of Mount Velus - todas as criaturas ganham double strike até fim do turno
     * @param {Object} controller - Jogador que controla o Terror
     */
    _handleDoubleStrikeAllETB(controller) {
        controller.battlefield.forEach(card => {
            if (card.type === 'creature') {
                if (!card.temporaryKeywords) card.temporaryKeywords = [];
                if (!card.temporaryKeywords.includes('double_strike')) {
                    card.temporaryKeywords.push('double_strike');
                }
            }
        });
        this.ui.log(`Terror of Mount Velus: todas as criaturas ganham golpe duplo até o fim do turno`);
        this.ui.render();
    }

    /**
     * Burrog Befuddler - criatura oponente recebe -1/-0
     */
    async _handleDebuffETB(card, controller, opponent) {
        const validTargets = opponent.battlefield.filter(c => c.type === 'creature');
        if (validTargets.length === 0) return;

        const applyDebuff = (target) => {
            target.powerModifier = (target.powerModifier || 0) - 1;
            this.ui.log(`${card.name}: ${target.name} recebeu -1/-0 até o fim do turno`);
            this.ui.render();
        };

        if (controller === this.player) {
            const target = await this.ui.promptTriggerTarget({
                title: `${card.name}`,
                description: 'Escolha uma criatura do oponente para receber -1/-0:',
                validTargets: validTargets,
                canSkip: false
            });
            if (target) applyDebuff(target);
        } else {
            // IA escolhe criatura com menor toughness (para potencial morte)
            const target = validTargets.sort((a, b) =>
                this.rules.getCreatureToughness(a) - this.rules.getCreatureToughness(b)
            )[0];
            applyDebuff(target);
        }
    }

    /**
     * Icewind Elemental - draw + discard (loot)
     */
    async _handleLootETB(controller) {
        this.rules.drawCard(controller);
        this.ui.log(`${controller.name} comprou um card`);

        if (controller.hand.length > 0) {
            let discardTarget;
            if (controller === this.player) {
                discardTarget = await this.ui.promptTriggerTarget({
                    title: 'Icewind Elemental - Descarte',
                    description: 'Escolha um card para descartar:',
                    validTargets: controller.hand,
                    canSkip: false
                });
            } else {
                // IA descarta o card de menor valor
                discardTarget = controller.hand.sort((a, b) => (a.cmc || 0) - (b.cmc || 0))[0];
            }
            if (discardTarget) {
                const idx = controller.hand.indexOf(discardTarget);
                if (idx > -1) {
                    controller.hand.splice(idx, 1);
                    controller.graveyard.push(discardTarget);
                    this.ui.log(`${controller.name} descartou ${discardTarget.name}`);
                }
            }
        }
        this.ui.render();
    }

    // === UNDEAD DECK ETB HELPERS ===

    /**
     * Mill cards - put top N cards from library into graveyard
     * @param {Object} player - Player who mills
     * @param {number} amount - Number of cards to mill
     * @param {string} sourceName - Name of the source card
     */
    _handleMill(player, amount, sourceName) {
        const milled = [];
        for (let i = 0; i < amount && player.library.length > 0; i++) {
            const card = player.library.pop();
            player.graveyard.push(card);
            milled.push(card.name);
        }
        if (milled.length > 0) {
            this.ui.log(`${sourceName}: ${player.name} colocou ${milled.join(', ')} no cemitério`);
        }
        this.ui.render();
    }

    /**
     * Skeleton Archer - deal 1 damage to any target on ETB
     */
    async _handlePingAnyETB(card, controller, opponent) {
        // Valid targets: any creature or player
        // Mark creatures with their owner for proper grouping in UI
        const opponentCreatures = opponent.battlefield
            .filter(c => c.type === 'creature')
            .map(c => ({ ...c, owner: 'opponent' }));

        const controllerCreatures = controller.battlefield
            .filter(c => c.type === 'creature')
            .map(c => ({ ...c, owner: 'player' }));

        // Create pseudo-targets for players with avatar info
        const playerTargets = [
            {
                instanceId: 'target_opponent',
                name: opponent.name,
                displayName: opponent.name,
                isPlayer: true,
                isSelf: false,
                playerRef: opponent,
                avatarId: opponent.avatar,
                life: opponent.life
            },
            {
                instanceId: 'target_self',
                name: controller.name,
                displayName: `${controller.name} (você)`,
                isPlayer: true,
                isSelf: true,
                playerRef: controller,
                avatarId: controller.avatar,
                life: controller.life
            }
        ];

        const allTargets = [...opponentCreatures, ...controllerCreatures, ...playerTargets];

        const dealDamage = async (target) => {
            if (target.isPlayer) {
                this.game.loseLife(target.playerRef, 1);
                this.ui.log(`${card.name} causou 1 de dano a ${target.playerRef.name}`);
                this.game.checkGameOver();
            } else {
                // Find the ACTUAL creature on battlefield (target may be a copy)
                let actualCreature = controller.battlefield.find(c => c.instanceId === target.instanceId);
                let targetOwner = controller;
                if (!actualCreature) {
                    actualCreature = opponent.battlefield.find(c => c.instanceId === target.instanceId);
                    targetOwner = opponent;
                }
                if (actualCreature) {
                    actualCreature.damage = (actualCreature.damage || 0) + 1;
                    this.ui.log(`${card.name} causou 1 de dano a ${actualCreature.name}`);
                    await this.game.checkCreatureDeath(actualCreature, targetOwner);
                }
            }
            this.ui.render();
        };

        if (controller === this.player) {
            // Player chooses target
            const target = await this.ui.promptTriggerTarget({
                title: 'Skeleton Archer',
                description: 'Escolha um alvo para 1 de dano:',
                validTargets: allTargets,
                canSkip: false
            });

            if (target) {
                await dealDamage(target);
            }
        } else {
            // AI logic: prioritize lethal > killing creatures > mana dorks > face
            const opponentCreatures = opponent.battlefield.filter(c => c.type === 'creature');

            // Priority 1: Check if 1 damage to face is lethal
            if (opponent.life <= 1) {
                await dealDamage(playerTargets[0]); // target_opponent
                return;
            }

            // Priority 2: Kill creatures with 1 remaining toughness, prefer highest power/CMC
            const killable = opponentCreatures.filter(c => {
                const toughness = this.rules.getCreatureToughness(c) - (c.damage || 0);
                return toughness <= 1;
            });

            if (killable.length > 0) {
                killable.sort((a, b) => {
                    const powerA = this.rules.getCreaturePower(a);
                    const powerB = this.rules.getCreaturePower(b);
                    if (powerB !== powerA) return powerB - powerA;
                    return (b.cmc || 0) - (a.cmc || 0);
                });
                await dealDamage(killable[0]);
                return;
            }

            // Priority 3: Snipe mana dorks (even if can't kill, weaken them)
            const manaDorks = opponentCreatures.filter(c => c.keywords?.includes('tap_for_mana'));
            if (manaDorks.length > 0) {
                // Prefer ones we can kill, otherwise pick any
                const killableDork = manaDorks.find(c => {
                    const toughness = this.rules.getCreatureToughness(c) - (c.damage || 0);
                    return toughness <= 1;
                });
                await dealDamage(killableDork || manaDorks[0]);
                return;
            }

            // Priority 4: Hit opponent's face
            await dealDamage(playerTargets[0]); // target_opponent
        }
    }

    /**
     * Virus Beetle - opponent discards a card on ETB
     */
    async _handleDiscardOpponentETB(card, controller, opponent) {
        if (opponent.hand.length === 0) {
            this.ui.log(`${card.name}: ${opponent.name} não tem cards na mão`);
            return;
        }

        let discardTarget;
        if (opponent === this.player) {
            // Human player chooses what to discard
            discardTarget = await this.ui.promptTriggerTarget({
                title: 'Virus Beetle - Descarte',
                description: 'Escolha um card para descartar:',
                validTargets: opponent.hand,
                canSkip: false
            });
        } else {
            // AI discards lowest CMC card
            discardTarget = opponent.hand.sort((a, b) => (a.cmc || 0) - (b.cmc || 0))[0];
        }

        if (discardTarget) {
            const idx = opponent.hand.indexOf(discardTarget);
            if (idx > -1) {
                opponent.hand.splice(idx, 1);
                opponent.graveyard.push(discardTarget);
                this.ui.log(`${card.name}: ${opponent.name} descartou ${discardTarget.name}`);
            }
        }
        this.ui.render();
    }

    /**
     * Ghoulraiser - return a random Zombie from graveyard to hand
     */
    _handleReturnZombieETB(card, controller) {
        const zombiesInGraveyard = controller.graveyard.filter(c =>
            c.type === 'creature' && c.subtype?.includes('Zombie')
        );

        if (zombiesInGraveyard.length === 0) {
            this.ui.log(`${card.name}: Não há Zombies no cemitério`);
            return;
        }

        // Return random zombie
        const randomIndex = Math.floor(Math.random() * zombiesInGraveyard.length);
        const target = zombiesInGraveyard[randomIndex];

        const idx = controller.graveyard.indexOf(target);
        if (idx > -1) {
            controller.graveyard.splice(idx, 1);
            this._resetCardState(target);
            controller.hand.push(target);
            this.ui.log(`${card.name}: ${controller.name} devolveu ${target.name} do cemitério para a mão`);
        }
        this.ui.render();
    }

    /**
     * Gravedigger - return target creature from graveyard to hand
     */
    async _handleReturnCreatureETB(card, controller) {
        const creaturesInGraveyard = controller.graveyard.filter(c => c.type === 'creature');

        if (creaturesInGraveyard.length === 0) {
            this.ui.log(`${card.name}: Não há criaturas no cemitério`);
            return;
        }

        let target;
        if (controller === this.player) {
            target = await this.ui.promptTriggerTarget({
                title: 'Gravedigger - Devolver Criatura',
                description: 'Escolha uma criatura para devolver à mão:',
                validTargets: creaturesInGraveyard,
                canSkip: true
            });
        } else {
            // AI returns highest CMC creature
            target = creaturesInGraveyard.sort((a, b) => (b.cmc || 0) - (a.cmc || 0))[0];
        }

        if (target) {
            const idx = controller.graveyard.indexOf(target);
            if (idx > -1) {
                controller.graveyard.splice(idx, 1);
                this._resetCardState(target);
                controller.hand.push(target);
                this.ui.log(`${card.name}: ${controller.name} devolveu ${target.name} para a mão`);
            }
        }
        this.ui.render();
    }

    /**
     * Rot Hulk - return target Zombie from graveyard to battlefield
     */
    async _handleReturnZombieBattlefieldETB(card, controller) {
        const zombiesInGraveyard = controller.graveyard.filter(c =>
            c.type === 'creature' && c.subtype?.includes('Zombie')
        );

        if (zombiesInGraveyard.length === 0) {
            this.ui.log(`${card.name}: Não há Zombies no cemitério`);
            return;
        }

        let target;
        if (controller === this.player) {
            target = await this.ui.promptTriggerTarget({
                title: 'Rot Hulk - Reanimar Zombie',
                description: 'Escolha um Zombie para reanimar:',
                validTargets: zombiesInGraveyard,
                canSkip: true
            });
        } else {
            // AI returns highest CMC zombie
            target = zombiesInGraveyard.sort((a, b) => (b.cmc || 0) - (a.cmc || 0))[0];
        }

        if (target) {
            const idx = controller.graveyard.indexOf(target);
            if (idx > -1) {
                controller.graveyard.splice(idx, 1);
                this._resetCardState(target);
                target.summoningSickness = true;
                controller.battlefield.push(target);
                this.ui.log(`${card.name}: ${target.name} voltou do cemitério para o campo de batalha`);
                // Trigger ETB for the returned creature
                await this.resolveETB(target, controller);
            }
        }
        this.ui.render();
    }

    /**
     * Uncharted Haven - escolher cor de mana ao entrar em campo
     * @param {Object} card - O terreno Uncharted Haven
     * @param {Object} controller - Jogador que controla o terreno
     */
    async _handleUnchartedHavenETB(card, controller) {
        const deckColors = this.rules.getPlayerDeckColors(controller);
        const colorNames = { W: 'branco', U: 'azul', B: 'preto', R: 'vermelho', G: 'verde' };

        if (deckColors.length === 1) {
            // Apenas uma cor no deck - auto-selecionar
            card.chosenColor = deckColors[0];
            this.ui.log(`${card.name} produzirá mana ${colorNames[card.chosenColor]}`);
        } else if (deckColors.length > 1) {
            if (controller === this.player) {
                // Jogador escolhe a cor
                const chosenColor = await this.ui.promptColorChoice({
                    title: `${card.name}`,
                    description: 'Escolha a cor de mana que este terreno produzirá:',
                    colors: deckColors
                });
                card.chosenColor = chosenColor;
                this.ui.log(`${card.name} produzirá mana ${colorNames[chosenColor]}`);
            } else {
                // IA escolhe a cor mais necessária
                card.chosenColor = this.game.chooseColorForAI(controller, deckColors);
                this.ui.log(`${card.name} produzirá mana ${colorNames[card.chosenColor]}`);
            }
        }
    }

    /**
     * Prayer of Binding - exile nonland permanent + gain 2 life
     * @param {Object} card - Prayer of Binding
     * @param {Object} controller - Jogador que controla
     * @param {Object} opponent - Oponente
     */
    async _handlePrayerOfBindingETB(card, controller, opponent) {
        // Encontrar permanentes não-terreno do oponente
        const validTargets = opponent.battlefield.filter(c =>
            c.type !== 'land' && this.rules.canBeTargetedBy(c, controller)
        );

        if (validTargets.length === 0) {
            // Ainda ganha 2 vidas mesmo sem alvo
            this.game.gainLife(controller, 2);
            this.ui.log(`Prayer of Binding: ${controller.name} ganhou 2 vidas (sem alvos válidos)`);
            return;
        }

        const exileTarget = async (target) => {
            // Remover do campo de batalha
            const index = opponent.battlefield.indexOf(target);
            if (index !== -1) {
                // Se for criatura, desanexar equipamentos e auras
                if (target.type === 'creature') {
                    this.game.detachFromCreature(target, opponent);
                }
                opponent.battlefield.splice(index, 1);
                // Desregistrar efeitos especiais
                this.game.unregisterSpecialEffect(target);
                // Exilar na zona de exílio do DONO da carta (para UI mostrar corretamente)
                target.exiledBy = card.instanceId;
                if (!opponent.exile) opponent.exile = [];
                opponent.exile.push(target);
                this.ui.log(`Prayer of Binding exilou ${target.name}`);
            }
            // Ganhar 2 vidas
            this.game.gainLife(controller, 2);
            this.ui.log(`${controller.name} ganhou 2 vidas`);
            this.ui.render();
        };

        if (controller === this.player) {
            const target = await this.ui.promptTriggerTarget({
                title: 'Prayer of Binding',
                description: 'Escolha uma permanente que não seja terreno para exilar:',
                validTargets: validTargets,
                canSkip: true // "up to one target"
            });
            if (target) {
                await exileTarget(target);
            } else {
                // Escolheu não exilar, mas ainda ganha vida
                this.game.gainLife(controller, 2);
                this.ui.log(`Prayer of Binding: ${controller.name} ganhou 2 vidas`);
            }
        } else {
            // IA escolhe a criatura mais forte ou permanente mais perigosa
            const target = validTargets
                .filter(c => c.type === 'creature')
                .sort((a, b) => this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a))[0]
                || validTargets[0];
            await exileTarget(target);
        }
    }

    /**
     * New Horizons - ETB: put +1/+1 counter on target creature you control
     * @param {Object} card - New Horizons aura
     * @param {Object} controller - Jogador que controla
     */
    async _handleNewHorizonsETB(card, controller) {
        const validTargets = controller.battlefield.filter(c => c.type === 'creature');

        if (validTargets.length === 0) {
            this.ui.log(`${card.name}: não há criaturas para receber contador`);
            return;
        }

        let target;
        if (controller === this.player) {
            target = await this.ui.promptTriggerTarget({
                title: 'New Horizons',
                description: 'Escolha uma criatura para receber um contador +1/+1:',
                validTargets: validTargets,
                canSkip: false
            });
        } else {
            // IA escolhe a criatura com maior poder
            target = validTargets.sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            )[0];
        }

        if (target) {
            if (!target.counters) target.counters = {};
            target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
            this.ui.log(`${card.name}: ${target.name} ganhou um contador +1/+1`);

            // Trigger Wildwood Scourge
            this.onCounterPlaced(target, controller, 1);
        }

        this.ui.render();
    }

    // ========================================
    // OTHER CREATURE ENTERS TRIGGERS
    // ========================================

    /**
     * Triggers quando outra criatura entra no campo
     * @param {Object} enteringCreature - Criatura que acabou de entrar
     * @param {Object} controller - Jogador que controla a criatura
     */
    onOtherCreatureEnters(enteringCreature, controller) {
        controller.battlefield.forEach(card => {
            // Não disparar para a própria criatura
            if (card.instanceId === enteringCreature.instanceId) return;

            // Beast-Kin Ranger - ganha +1/+0 quando outra criatura entra
            if (card.id === 'beast_kin_ranger' && !this.rules.hasLostAllAbilities(card)) {
                card.powerModifier = (card.powerModifier || 0) + 1;
                this.ui.log(`Beast-Kin Ranger ganha +1/+0 (${enteringCreature.name} entrou em campo)`);
            }

            // Hinterland Sanctifier / Dazzling Angel - ganha 1 vida quando outra criatura entra
            if (card.keywords?.includes('creature_etb_lifegain') && !this.rules.hasLostAllAbilities(card)) {
                this.game.gainLife(controller, 1);
                this.ui.log(`${card.name}: ${controller.name} ganhou 1 vida (${enteringCreature.name} entrou em campo)`);
            }
        });
    }

    // ========================================
    // SPELL CAST TRIGGERS
    // ========================================

    /**
     * Brineborn Cutthroat - ganha +1/+1 counter quando lança mágica no turno do oponente
     * @param {Object} caster - Jogador que lançou a mágica
     * @param {Object} spell - A mágica que foi conjurada (opcional)
     */
    onSpellCast(caster, spell = null) {
        const opponent = caster === this.player ? this.opponent : this.player;

        // Brineborn Cutthroat - apenas no turno do oponente
        const isOpponentsTurn = (caster === this.player && this.game.activePlayer === this.opponent) ||
                                (caster === this.opponent && this.game.activePlayer === this.player);

        if (isOpponentsTurn) {
            caster.battlefield.forEach(card => {
                if (card.id === 'brineborn_cutthroat' && !card.pendingResolution && !this.rules.hasLostAllAbilities(card)) {
                    if (!card.counters) card.counters = {};
                    card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                    this.ui.log(`Brineborn Cutthroat ganha um contador +1/+1 (mágica conjurada no turno do oponente)`);
                    this.onCounterPlaced(card, caster, 1);
                    this.ui.render();
                }
            });
        }

        // Firespitter Whelp - sempre que conjura spell que NÃO seja criatura OU que seja Dragão
        // Ou seja: instants, sorceries, artifacts, enchantments + criaturas Dragão
        if (spell) {
            const isCreature = spell.type === 'creature';
            const isDragon = spell.subtype?.includes('Dragon');

            // Dispara para spells não-criatura OU criaturas Dragão
            if (!isCreature || isDragon) {
                caster.battlefield.forEach(card => {
                    if (card.keywords?.includes('spellcast_damage') && !card.pendingResolution && !this.rules.hasLostAllAbilities(card)) {
                        // Causa 1 de dano a cada oponente
                        this.game.loseLife(opponent, 1);
                        this.ui.log(`${card.name} causou 1 de dano a ${opponent.name}`);
                        this.game.checkGameOver();
                    }
                });
            }
        }
    }

    // ========================================
    // CARD DRAW TRIGGERS
    // ========================================

    /**
     * Triggers quando um jogador compra um card
     * @param {Object} player - Jogador que comprou
     */
    onCardDrawn(player) {
        // Incrementar contador de draws deste turno
        const playerKey = player === this.player ? 'player' : 'opponent';
        if (!this.game.drawsThisTurn) this.game.drawsThisTurn = { player: 0, opponent: 0 };
        this.game.drawsThisTurn[playerKey]++;

        const drawCount = this.game.drawsThisTurn[playerKey];
        let triggered = false;

        player.battlefield.forEach(card => {
            // Ignorar criaturas pendentes de resolução (ainda na stack)
            if (card.pendingResolution) return;

            // Clinquant Skymage - +1/+1 counter em qualquer draw
            if (card.keywords?.includes('draw_counter') && !this.rules.hasLostAllAbilities(card)) {
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${card.name} ganha um contador +1/+1 (${player.name} comprou)`);
                this.onCounterPlaced(card, player, 1);
                triggered = true;
            }

            // Erudite Wizard - +1/+1 counter no segundo draw
            if (card.keywords?.includes('second_draw_counter') && drawCount === 2 && !this.rules.hasLostAllAbilities(card)) {
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${card.name} ganha um contador +1/+1 (segundo card comprado)`);
                this.onCounterPlaced(card, player, 1);
                triggered = true;
            }

            // Mischievous Mystic - create Faerie token no segundo draw
            if (card.keywords?.includes('second_draw_faerie') && drawCount === 2 && !this.rules.hasLostAllAbilities(card)) {
                const faerieToken = {
                    instanceId: `faerie_token_${globalInstanceCounter++}`,
                    name: 'Faerie Token',
                    type: 'creature',
                    subtype: 'Faerie',
                    power: 1,
                    toughness: 1,
                    keywords: ['flying'],
                    summoningSickness: true,
                    isToken: true
                };
                player.battlefield.push(faerieToken);
                this.ui.log(`${card.name} criou um token Faerie 1/1 com voar`);
                this.onOtherCreatureEnters(faerieToken, player);
                triggered = true;
            }
        });

        if (triggered) {
            this.ui.render();
        }
    }

    // ========================================
    // COUNTER PLACEMENT TRIGGERS
    // ========================================

    /**
     * Triggers quando contadores +1/+1 são colocados em uma criatura
     * @param {Object} creature - Criatura que recebeu os contadores
     * @param {Object} controller - Jogador que controla a criatura
     * @param {number} amount - Quantidade de contadores colocados
     */
    onCounterPlaced(creature, controller, amount = 1) {
        let triggered = false;

        controller.battlefield.forEach(card => {
            // Wildwood Scourge - ganha +1/+1 quando outra criatura não-Hidra ganha contador
            if (card.keywords?.includes('counter_synergy') && card !== creature && !this.rules.hasLostAllAbilities(card)) {
                // Não dispara se a criatura que recebeu é uma Hidra
                if (creature.subtype?.includes('Hydra')) return;

                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${card.name} ganha um contador +1/+1 (contadores colocados em ${creature.name})`);
                triggered = true;
            }
        });

        if (triggered) {
            this.ui.render();
        }
    }

    // ========================================
    // LIFEGAIN TRIGGERS
    // ========================================

    /**
     * Triggers quando um jogador ganha vida
     * @param {Object} player - Jogador que ganhou vida
     * @param {number} amount - Quantidade de vida ganha
     */
    onLifeGain(player, amount) {
        let triggered = false;

        player.battlefield.forEach(card => {
            // Ajani's Pridemate / Twinblade Paladin - +1/+1 counter quando ganha vida
            if (card.keywords?.includes('lifegain_counter') && !this.rules.hasLostAllAbilities(card)) {
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`${card.name} ganha um contador +1/+1 (${player.name} ganhou vida)`);
                this.onCounterPlaced(card, player, 1);
                triggered = true;
            }
        });

        if (triggered) {
            this.ui.render();
        }
    }

    // ========================================
    // DEATH TRIGGERS
    // ========================================

    /**
     * Triggers quando uma criatura morre
     * @param {Object} creature - Criatura que morreu
     * @param {Object} owner - Jogador que controlava a criatura
     */
    async onCreatureDeath(creature, owner) {
        const opponent = owner === this.player ? this.opponent : this.player;

        // === UNDEAD DECK DEATH TRIGGERS ===

        // Crow of Dark Tidings - mill 2 when dies
        if (creature.keywords?.includes('death_mill_2') && !this.rules.hasLostAllAbilities(creature)) {
            this._handleMill(owner, 2, creature.name);
        }

        // Maalfeld Twins - create two 2/2 Zombie tokens when dies
        if (creature.keywords?.includes('death_create_zombies') && !this.rules.hasLostAllAbilities(creature)) {
            this._createZombieToken(owner);
            this._createZombieToken(owner);
            this.ui.log(`${creature.name}: criou dois tokens Zumbi 2/2`);
        }

        // Undying Malice effect - creature stays on battlefield with +1/+1 counter
        // Checked AFTER other death triggers so they all fire (MTG: all death triggers fire)
        if (creature.undyingMalice) {
            delete creature.undyingMalice;
            // Reset card state (damage, modifiers, counters)
            // MTG CR 400.7: zone change = new object, old counters are gone
            creature.damage = 0;
            creature.powerModifier = 0;
            creature.toughnessModifier = 0;
            creature.temporaryKeywords = [];
            creature.counters = {};
            // Add +1/+1 counter (the only counter on the "new" creature)
            creature.counters.plusOnePlusOne = 1;
            // Creature stays tapped and gets summoning sickness
            creature.tapped = true;
            creature.summoningSickness = true;
            this.ui.log(`${creature.name} voltou ao campo de batalha com um contador +1/+1 (Undying Malice)`);
            this.onCounterPlaced(creature, owner, 1);
            // Set flag so destroyPermanent doesn't remove the creature
            creature._returnedByUndying = true;
            this.ui.render();
            return true; // Signal that creature was returned
        }

        // === VAMPIRES DECK DEATH TRIGGERS ===

        // Vengeful Bloodwitch - quando esta ou outra criatura que você controla morre,
        // oponente alvo perde 1 vida e você ganha 1 vida
        let bloodwitchTriggered = false;

        // Procura por Vengeful Bloodwitches no campo do dono da criatura que morreu
        // IMPORTANTE: Exclui a própria criatura morrendo do loop (tratada separadamente abaixo)
        owner.battlefield.forEach(card => {
            if (card.id === 'vengeful_bloodwitch' && card !== creature) {
                this.game.loseLife(opponent, 1);
                this.game.gainLife(owner, 1);
                this.ui.log(`Vengeful Bloodwitch: ${opponent.name} perdeu 1 vida, ${owner.name} ganhou 1 vida`);
                bloodwitchTriggered = true;
            }
        });

        // Se a própria Bloodwitch morreu, ela também dispara uma vez (antes de ir pro cemitério)
        if (creature.id === 'vengeful_bloodwitch') {
            this.game.loseLife(opponent, 1);
            this.game.gainLife(owner, 1);
            this.ui.log(`Vengeful Bloodwitch: ${opponent.name} perdeu 1 vida, ${owner.name} ganhou 1 vida`);
            bloodwitchTriggered = true;
        }

        // Verificar fim de jogo após triggers de perda de vida
        if (bloodwitchTriggered) {
            this.game.checkGameOver();
        }

        // Crossway Troublemakers - quando um Vampiro que você controla morre,
        // você pode pagar 2 vidas. Se fizer isso, compre uma carta.
        // NOTA: onCreatureDeath é chamado ANTES da criatura sair do campo,
        // então CT ainda está no battlefield quando morre (se vê morrendo).
        const isVampire = (this.rules.getEffectiveSubtype(creature) || creature.subtype)?.includes('Vampire');
        if (isVampire) {
            // Encontrar todos os Crossway Troublemakers do dono
            // (inclui o próprio CT se ele está morrendo - ele vê sua própria morte)
            const troublemakers = owner.battlefield.filter(c => c.id === 'crossway_troublemakers');

            for (const ct of troublemakers) {
                if (owner.life >= 2) {
                    if (owner === this.player) {
                        // Jogador humano - perguntar se quer pagar
                        const shouldPay = await this.ui.promptYesNo({
                            title: 'Crossway Troublemakers',
                            description: `${creature.name} morreu. Pagar 2 vidas para comprar uma carta?`,
                            yesText: 'Pagar 2 vidas',
                            noText: 'Não pagar'
                        });
                        if (shouldPay) {
                            this.game.loseLife(owner, 2, { silent: true, isLifePayment: true }); // Custo, não dano
                            this.rules.drawCard(owner);
                            this.ui.log(`Crossway Troublemakers: ${owner.name} pagou 2 vidas e comprou uma carta`);
                        }
                    } else {
                        // IA sempre paga se tiver vida suficiente (> 4 para ser seguro)
                        if (owner.life > 4) {
                            this.game.loseLife(owner, 2, { silent: true, isLifePayment: true }); // Custo, não dano
                            this.rules.drawCard(owner);
                            this.ui.log(`Crossway Troublemakers: ${owner.name} pagou 2 vidas e comprou uma carta`);
                        }
                    }
                }
            }
        }

        this.ui.render();
    }

    // ========================================
    // END OF TURN TRIGGERS
    // ========================================

    /**
     * End step triggers - disparam para AMBOS os jogadores (MTG: "each end step")
     * @param {Object} activePlayer - Jogador ativo do turno
     */
    async onEndStep(activePlayer) {
        await this._handleStromkirkBloodthief(activePlayer);
    }

    async _handleStromkirkBloodthief(controller) {
        const opponentLostLife = controller === this.player
            ? this.game.opponentLostLifeThisTurn
            : this.game.playerLostLifeThisTurn;

        if (!opponentLostLife) return;

        for (const card of controller.battlefield) {
            if (card.id === 'stromkirk_bloodthief') {
                const vampires = controller.battlefield.filter(c =>
                    c.type === 'creature' && c.subtype?.includes('Vampire')
                );

                if (vampires.length > 0) {
                    let target;

                    if (vampires.length === 1) {
                        // Auto-seleciona se só há um vampiro
                        target = vampires[0];
                    } else if (controller === this.player) {
                        target = await this.ui.promptTriggerTarget({
                            title: 'Stromkirk Bloodthief',
                            description: 'Escolha um Vampiro para receber um contador +1/+1:',
                            validTargets: vampires,
                            canSkip: false
                        });
                    } else {
                        target = vampires.sort((a, b) =>
                            this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
                        )[0];
                    }

                    if (target) {
                        if (!target.counters) target.counters = {};
                        target.counters.plusOnePlusOne = (target.counters.plusOnePlusOne || 0) + 1;
                        this.ui.log(`Stromkirk Bloodthief: +1/+1 counter em ${target.name}`);
                        this.onCounterPlaced(target, controller, 1);
                        this.ui.render();
                    }
                }
            }
        }
    }

    // ========================================
    // COMBAT TRIGGERS
    // ========================================

    /**
     * Triggers de início de combate
     * @param {Object} controller - Jogador que está atacando
     */
    async onBeginCombat(controller) {
        await this._handleLeoninVanguard(controller);
        await this._handleBattleRattleShaman(controller);
    }

    /**
     * Leonin Vanguard - no início do combate, se controla 3+ criaturas,
     * ganha +1/+1 até o fim do turno e controlador ganha 1 vida
     * @param {Object} controller - Jogador ativo
     */
    _handleLeoninVanguard(controller) {
        const creatures = controller.battlefield.filter(c => c.type === 'creature');

        controller.battlefield.forEach(card => {
            if (card.id === 'leonin_vanguard') {
                // Condição: controlar 3 ou mais criaturas (incluindo o próprio Leonin Vanguard)
                if (creatures.length >= 3) {
                    // +1/+1 até o fim do turno
                    card.powerModifier = (card.powerModifier || 0) + 1;
                    card.toughnessModifier = (card.toughnessModifier || 0) + 1;
                    // Ganhar 1 vida
                    this.game.gainLife(controller, 1);
                    this.ui.log(`Leonin Vanguard: +1/+1 e ${controller.name} ganhou 1 vida`);
                    this.ui.render();
                }
            }
        });
    }

    async _handleBattleRattleShaman(controller) {
        for (const card of controller.battlefield) {
            if (card.id === 'battle_rattle_shaman') {
                const creatures = controller.battlefield.filter(c => c.type === 'creature');

                if (creatures.length > 0) {
                    let target;

                    if (controller === this.player) {
                        // Jogador escolhe alvo (habilidade opcional: "you may")
                        target = await this.ui.promptTriggerTarget({
                            title: 'Battle-Rattle Shaman',
                            description: 'Escolha uma criatura alvo para ganhar +2/+0 até o fim do turno:',
                            validTargets: creatures,
                            canSkip: true
                        });
                    } else {
                        // IA sempre usa a habilidade se tiver alvos válidos
                        // Prefere outras criaturas, mas pode escolher a si mesmo
                        const others = creatures.filter(c => c.instanceId !== card.instanceId);
                        target = others.length > 0
                            ? others.sort((a, b) => this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a))[0]
                            : card;
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

    /**
     * Triggers ao declarar atacantes
     * @param {Array} attackers - Lista de atacantes
     * @param {Object} attackingPlayer - Jogador que está atacando
     */
    onDeclareAttackers(attackers, attackingPlayer) {
        if (attackers.length === 0) return;

        // Herald of Faith - ganha 2 vidas quando ataca
        attackers.forEach(attacker => {
            if (attacker.keywords?.includes('attack_gain_life_2') && !this.rules.hasLostAllAbilities(attacker)) {
                this.game.gainLife(attackingPlayer, 2);
                this.ui.log(`${attacker.name}: ${attackingPlayer.name} ganhou 2 vidas (atacou)`);
            }
        });

        // Ancestor Dragon - ganha 1 vida para cada atacante
        attackingPlayer.battlefield.forEach(card => {
            if (card.keywords?.includes('mass_attack_lifegain') && !this.rules.hasLostAllAbilities(card)) {
                const lifeGain = attackers.length;
                this.game.gainLife(attackingPlayer, lifeGain);
                this.ui.log(`${card.name}: ${attackingPlayer.name} ganhou ${lifeGain} vida(s) (${attackers.length} atacante(s))`);
            }
        });
    }

    /**
     * Frenzied Goblin - ao atacar, pagar R para impedir uma criatura de bloquear
     * @param {Array} attackers - Lista de atacantes
     * @param {Object} attackingPlayer - Jogador que está atacando
     */
    async onFrenziedGoblinAttacks(attackers, attackingPlayer) {
        const opponent = attackingPlayer === this.player ? this.opponent : this.player;

        const frenziedGoblin = attackers.find(a => a.id === 'frenzied_goblin');
        if (!frenziedGoblin) return;

        const availableMana = this.rules.calculateAvailableMana(attackingPlayer);
        if (availableMana.R < 1 && availableMana.any < 1) return;

        const potentialBlockers = opponent.battlefield.filter(c =>
            c.type === 'creature' && !c.tapped
        );
        if (potentialBlockers.length === 0) return;

        if (attackingPlayer === this.player) {
            const shouldPay = await this.ui.promptFrenziedGoblin(potentialBlockers);
            if (shouldPay?.target) {
                this.game.payColoredMana({ R: 1 }, attackingPlayer);
                this.game.cantBlockThisTurn.push(shouldPay.target.instanceId);
                this.ui.log(`Frenzied Goblin: ${shouldPay.target.name} não pode bloquear neste turno`);
            }
        } else {
            const target = potentialBlockers.sort((a, b) =>
                this.rules.getCreaturePower(b) - this.rules.getCreaturePower(a)
            )[0];
            if (target) {
                this.game.payColoredMana({ R: 1 }, attackingPlayer);
                this.game.cantBlockThisTurn.push(target.instanceId);
                this.ui.log(`Frenzied Goblin: ${target.name} não pode bloquear neste turno`);
            }
        }
    }

    // ========================================
    // LEAVES THE BATTLEFIELD TRIGGERS
    // ========================================

    /**
     * Chamado quando um permanente deixa o campo de batalha
     * Lida com efeitos "until this leaves the battlefield" (ex: Prayer of Binding)
     * @param {Object} card - Carta que saiu do campo
     * @param {Object} owner - Dono da carta
     */
    async onLeaveBattlefield(card, owner) {
        // Verificar se há cartas exiladas por este permanente
        // Procurar nas zonas de exílio de ambos os jogadores
        const allExile = [
            ...(this.player.exile || []),
            ...(this.opponent.exile || [])
        ];

        if (allExile.length === 0) return;

        const toReturn = allExile.filter(exiled => exiled.exiledBy === card.instanceId);

        if (toReturn.length === 0) return;

        for (const exiledCard of toReturn) {
            // Determinar o dono original da carta exilada
            const cardOwner = this._findCardOwner(exiledCard);

            if (cardOwner) {
                // Remover da zona de exílio do dono
                if (cardOwner.exile) {
                    const exileIndex = cardOwner.exile.indexOf(exiledCard);
                    if (exileIndex > -1) {
                        cardOwner.exile.splice(exileIndex, 1);
                    }
                }

                // Limpar a referência de exílio
                delete exiledCard.exiledBy;

                // Resetar estado antes de retornar (nova instância no battlefield)
                exiledCard.damage = 0;
                exiledCard.powerModifier = 0;
                exiledCard.toughnessModifier = 0;
                exiledCard.temporaryKeywords = [];
                exiledCard.counters = null;

                // Retornar ao campo de batalha
                cardOwner.battlefield.push(exiledCard);

                // Se for criatura, entra com summoning sickness
                if (exiledCard.type === 'creature') {
                    exiledCard.summoningSickness = true;
                }

                this.ui.log(`${exiledCard.name} retornou ao campo de batalha`);

                // Disparar ETB triggers (criatura "entrou" no campo de batalha)
                await this.resolveETB(exiledCard, cardOwner);
            }
        }

        this.ui.render();
    }

    /**
     * Encontra o dono original de uma carta
     * Procura em todas as zonas de ambos jogadores
     * @param {Object} card - Carta para encontrar o dono
     * @returns {Object|null} - Jogador dono ou null
     */
    _findCardOwner(card) {
        // Verificar na zona de exílio de cada jogador
        if (this.player.exile && this.player.exile.includes(card)) {
            return this.player;
        }
        if (this.opponent.exile && this.opponent.exile.includes(card)) {
            return this.opponent;
        }

        // Verificar pelo instanceId se contém identificador do dono
        if (card.instanceId) {
            if (card.instanceId.includes('_player_') || card.instanceId.startsWith('player_')) {
                return this.player;
            }
            if (card.instanceId.includes('_opponent_') || card.instanceId.startsWith('opponent_')) {
                return this.opponent;
            }
        }

        // Fallback: verificar em qual deck a carta foi originalmente
        // Por segurança, retornar opponent (a maioria dos exílios são de oponentes)
        return this.opponent;
    }
}

// Exportar para uso global
window.TriggerManager = TriggerManager;
