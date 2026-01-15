/**
 * TriggerManager - Gerencia todos os triggers do jogo
 *
 * Este módulo centraliza:
 * - ETB (enters-the-battlefield) effects
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
            this._handleBounceETB(card, controller, opponent);
        }

        // ETB Counter Two (Felidar Savior, etc.)
        if (card.keywords?.includes('etb_counter_two')) {
            this._handleCounterTwoETB(card, controller);
        }

        // ETB Equip Pirate (Pirate's Cutlass)
        if (card.keywords?.includes('etb_equip_pirate')) {
            this._handleEquipPirateETB(card, controller);
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

        // --- CARD-SPECIFIC ETBs ---

        // Dwynen's Elite - criar token Elf se controla outro
        if (card.id === 'dwynenss_elite') {
            this._handleDwynensEliteETB(card, controller);
        }

        // Elvish Regrower - devolve permanente do cemitério para a mão
        if (card.id === 'elvish_regrower') {
            this._handleElvishRegrowerETB(card, controller);
        }

        // Bloodtithe Collector - força descarte se oponente perdeu vida
        if (card.id === 'bloodtithe_collector') {
            this._handleBloodtitheCollectorETB(controller, opponent);
        }

        // Volley Veteran - dano igual ao número de Goblins
        if (card.id === 'volley_veteran') {
            await this._handleVolleyVeteranETB(card, controller, opponent);
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
        // Note: summoningSickness is set when entering battlefield, not here
    }

    _createTreasureToken(controller, sourceName) {
        controller.battlefield.push({
            instanceId: `treasure_token_${Date.now()}`,
            name: 'Treasure Token',
            type: 'artifact',
            subtype: 'Treasure',
            text: 'T, Sacrifique este artefato: Adicione uma mana de qualquer cor.',
            keywords: ['sacrifice_for_mana']
        });
        this.ui.log(`${sourceName} criou um token de Tesouro`);
    }

    _createCatToken(controller) {
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

    _createElfToken(controller) {
        controller.battlefield.push({
            instanceId: `elf_token_${Date.now()}`,
            name: 'Elf Warrior Token',
            type: 'creature',
            subtype: 'Elf Warrior',
            power: 1,
            toughness: 1,
            summoningSickness: true
        });
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

    _handleElvishRegrowerETB(card, controller) {
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
            this.ui.promptTriggerTarget({
                title: `${card.name} - Recuperar Permanente`,
                description: 'Escolha uma carta de permanente do seu cemitério para devolver à sua mão:',
                validTargets: validTargets,
                canSkip: false
            }).then(selected => {
                if (selected) {
                    returnPermanent(selected);
                }
            });
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

    _handleBloodtitheCollectorETB(controller, opponent) {
        const opponentLostLife = controller === this.player
            ? this.game.opponentLostLifeThisTurn
            : this.game.playerLostLifeThisTurn;

        if (opponentLostLife && opponent.hand.length > 0) {
            const randomIndex = Math.floor(Math.random() * opponent.hand.length);
            const discarded = opponent.hand.splice(randomIndex, 1)[0];
            opponent.graveyard.push(discarded);
            this.ui.log(`${opponent.name} descartou ${discarded.name}`);
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
            this.ui.promptTriggerTarget({
                title: `Volley Veteran - Selecione um Alvo`,
                description: `Cause ${goblinCount} de dano a criatura alvo que um oponente controla:`,
                validTargets: validTargets,
                canSkip: false
            }).then(async (selected) => {
                if (selected) await dealDamage(selected);
            });
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

    _handleBounceETB(card, controller, opponent) {
        const validTargets = opponent.battlefield.filter(c => c.type === 'creature');
        if (validTargets.length === 0) return;

        const bounceCreature = (targetCreature) => {
            const index = opponent.battlefield.indexOf(targetCreature);
            if (index !== -1) {
                // Desanexar auras e equipamentos (auras vão pro cemitério - regra 704.5m)
                this.game.detachFromCreature(targetCreature, opponent);
                opponent.battlefield.splice(index, 1);
                this._resetCardState(targetCreature); // Reset damage, modifiers, counters, etc.
                opponent.hand.push(targetCreature);
                this.ui.log(`${card.name} devolveu ${targetCreature.name} para a mão de ${opponent.name}`);
                this.ui.render();
            }
        };

        if (controller === this.player) {
            this.ui.promptTriggerTarget({
                title: `${card.name} - Selecione um Alvo`,
                description: 'Devolva uma criatura que um oponente controla para a mão de seu dono:',
                validTargets: validTargets,
                canSkip: false
            }).then(selected => {
                if (selected) bounceCreature(selected);
            });
        } else {
            // IA escolhe a criatura mais forte
            const target = validTargets.sort((a, b) => {
                const powerA = (a.power || 0) + (a.powerModifier || 0);
                const powerB = (b.power || 0) + (b.powerModifier || 0);
                return powerB - powerA;
            })[0];
            bounceCreature(target);
        }
    }

    _handleCounterTwoETB(card, controller) {
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
            this.ui.render();
        };

        if (controller === this.player) {
            this.ui.promptMultiTarget({
                title: `${card.name} - Selecione Alvos`,
                description: 'Coloque um contador +1/+1 em até duas outras criaturas que você controla:',
                validTargets: validTargets,
                maxTargets: 2,
                minTargets: 0,
                canSkip: true
            }).then(selected => {
                if (selected?.length > 0) applyCounters(selected);
            });
        } else {
            // IA escolhe criaturas menores para bufar
            const targets = validTargets
                .sort((a, b) => {
                    const powerA = (a.power || 0) + (a.powerModifier || 0) + (a.counters?.plusOnePlusOne || 0);
                    const powerB = (b.power || 0) + (b.powerModifier || 0) + (b.counters?.plusOnePlusOne || 0);
                    return powerA - powerB;
                })
                .slice(0, 2);
            applyCounters(targets);
        }
    }

    _handleEquipPirateETB(card, controller) {
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
            this.ui.promptTriggerTarget({
                title: `Pirate's Cutlass`,
                description: 'Escolha um Pirata para equipar:',
                validTargets: validPirates,
                canSkip: false
            }).then(selected => {
                if (selected) attachEquipment(selected);
            });
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
            // Beast-Kin Ranger - ganha +1/+0 quando outra criatura entra
            if (card.id === 'beast_kin_ranger' && card.instanceId !== enteringCreature.instanceId) {
                card.powerModifier = (card.powerModifier || 0) + 1;
                this.ui.log(`Beast-Kin Ranger ganha +1/+0 (${enteringCreature.name} entrou em campo)`);
            }
        });
    }

    // ========================================
    // SPELL CAST TRIGGERS
    // ========================================

    /**
     * Brineborn Cutthroat - ganha +1/+1 counter quando lança mágica no turno do oponente
     * @param {Object} caster - Jogador que lançou a mágica
     */
    onSpellCast(caster) {
        // Verifica se é o turno do oponente do caster
        const isOpponentsTurn = (caster === this.player && this.game.activePlayer === this.opponent) ||
                                (caster === this.opponent && this.game.activePlayer === this.player);

        if (!isOpponentsTurn) return;

        caster.battlefield.forEach(card => {
            if (card.id === 'brineborn_cutthroat') {
                if (!card.counters) card.counters = {};
                card.counters.plusOnePlusOne = (card.counters.plusOnePlusOne || 0) + 1;
                this.ui.log(`Brineborn Cutthroat ganha um contador +1/+1 (mágica conjurada no turno do oponente)`);
                this.ui.render();
            }
        });
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
        const isVampire = creature.subtype?.includes('Vampire');
        if (isVampire) {
            // Encontrar todos os Crossway Troublemakers do dono
            // (inclui o próprio CT se ele está morrendo - ele vê sua própria morte)
            const troublemakers = owner.battlefield.filter(c => c.id === 'crossway_troublemakers');

            for (const ct of troublemakers) {
                if (owner.life > 2) {
                    if (owner === this.player) {
                        // Jogador humano - perguntar se quer pagar
                        const shouldPay = await this.ui.promptYesNo({
                            title: 'Crossway Troublemakers',
                            description: `${creature.name} morreu. Pagar 2 vidas para comprar uma carta?`,
                            yesText: 'Pagar 2 vidas',
                            noText: 'Não pagar'
                        });
                        if (shouldPay) {
                            this.game.loseLife(owner, 2, { silent: true }); // Custo, não dano
                            this.rules.drawCard(owner);
                            this.ui.log(`Crossway Troublemakers: ${owner.name} pagou 2 vidas e comprou uma carta`);
                        }
                    } else {
                        // IA sempre paga se tiver vida suficiente (> 4 para ser seguro)
                        if (owner.life > 4) {
                            this.game.loseLife(owner, 2, { silent: true }); // Custo, não dano
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
     * Stromkirk Bloodthief - no fim do turno, +1/+1 em vampiro se oponente perdeu vida
     * @param {Object} controller - Jogador ativo
     */
    async onEndStep(controller) {
        await this._handleStromkirkBloodthief(controller);
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

                    if (controller === this.player) {
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
                        // Jogador escolhe - habilidade é opcional ("you may")
                        target = await this.ui.promptTriggerTarget({
                            title: 'Battle-Rattle Shaman',
                            description: 'Você pode fazer uma criatura alvo ganhar +2/+0 até o fim do turno:',
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
        // Triggers de "quando ataca" podem ser adicionados aqui
        // Nota: Leonin Vanguard foi movido para onBeginCombat (trigger correto)
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
}

// Exportar para uso global
window.TriggerManager = TriggerManager;
