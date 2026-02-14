// === Inicialização do Jogo ===

document.addEventListener('DOMContentLoaded', () => {
    console.log('MTG Jumpstart - Foundations');
    console.log('Inicializando jogo...');

    // Criar instância do jogo
    const game = new GameState();
    game.init();

    // Disponibilizar globalmente para debug
    window.game = game;

    // === Debug Commands ===
    window.debug = {
        // Help
        help() {
            console.log(`
=== MTG Debug Commands ===
"p/o" = player/opponent (padrão: player)

CARTAS:
  debug.draw("nome")              - Compra carta do seu deck
  debug.drawAny("nome")           - Compra carta de qualquer deck
  debug.addToHand("nome", "p/o")  - Adiciona carta à mão
  debug.addToBattlefield("nome", "p/o") - Coloca carta no campo
  debug.listCards("deck?")        - Lista cartas disponíveis

VIDA E MANA:
  debug.setLife(valor, "p/o")     - Define vida
  debug.fullMana()                - Dá 10 de cada mana
  debug.untapAll("p/o")           - Desvira permanentes

TURNO:
  debug.setPhase("MAIN1")         - Pula para fase
  debug.nextTurn()                - Próximo turno
  debug.phases()                  - Lista fases

ESTADO:
  debug.state()                   - Estado do jogo
  debug.battlefield("p/o/both")   - Permanentes em campo
  debug.hand("p/o")               - Cartas na mão
  debug.kill("nome", "p/o")       - Mata criatura

TESTES:
  debug.setupCombat()             - Cenário de combate
            `);
        },

        // Get player reference
        _getPlayer(who) {
            if (!who || who === 'player' || who === 'p') return game.player;
            if (who === 'opponent' || who === 'o' || who === 'ai') return game.opponent;
            return game.player;
        },

        // Find card by partial name
        _findCard(name, deck) {
            const search = name.toLowerCase();
            let cards = [];

            if (deck) {
                cards = CARD_DATABASE[deck] || [];
            } else {
                Object.values(CARD_DATABASE).forEach(d => cards.push(...d));
            }

            return cards.find(c => c.name.toLowerCase().includes(search));
        },

        // Hand commands
        hand(who) {
            const player = this._getPlayer(who);
            const name = player === game.player ? 'Jogador' : 'IA';
            console.log(`\n=== Mão de ${name} (${player.hand.length} cartas) ===`);
            player.hand.forEach((card, i) => {
                const cost = card.cost || '-';
                const stats = card.power !== undefined ? `${card.power}/${card.toughness}` : '';
                console.log(`${i + 1}. ${card.name} [${card.type}] ${cost} ${stats}`);
            });
            return player.hand;
        },

        // Battlefield
        battlefield(who) {
            const showPlayer = (p, name) => {
                const creatures = p.battlefield.filter(c => c.type === 'creature');
                const lands = p.battlefield.filter(c => c.type === 'land');
                const other = p.battlefield.filter(c => c.type !== 'creature' && c.type !== 'land');

                console.log(`\n=== ${name} ===`);
                console.log(`Criaturas (${creatures.length}):`);
                creatures.forEach(c => {
                    const p = game.rules.getCreaturePower(c);
                    const t = game.rules.getCreatureToughness(c);
                    const tapped = c.tapped ? ' [TAPPED]' : '';
                    console.log(`  - ${c.name} ${p}/${t}${tapped}`);
                });
                console.log(`Terrenos: ${lands.length} (${lands.filter(l => !l.tapped).length} untapped)`);
                if (other.length) console.log(`Outros: ${other.map(c => c.name).join(', ')}`);
            };

            if (!who || who === 'both') {
                showPlayer(game.player, 'Jogador');
                showPlayer(game.opponent, 'IA');
            } else {
                const player = this._getPlayer(who);
                showPlayer(player, player === game.player ? 'Jogador' : 'IA');
            }
        },

        // State
        state() {
            console.log(`
=== Estado do Jogo ===
Turno: ${game.currentTurn} | Fase: ${game.currentPhase}
Jogador ativo: ${game.activePlayer === game.player ? 'Jogador' : 'IA'}

JOGADOR: ${game.player.life} vida | Mão: ${game.player.hand.length} | Deck: ${game.player.library.length}
IA: ${game.opponent.life} vida | Mão: ${game.opponent.hand.length} | Deck: ${game.opponent.library.length}
            `);
        },

        // Set life
        setLife(value, who) {
            const player = this._getPlayer(who);
            player.life = value;
            game.ui.render();
            console.log(`Vida de ${player === game.player ? 'Jogador' : 'IA'} definida para ${value}`);
        },

        // Full mana
        fullMana() {
            game.player.manaPool = { W: 10, U: 10, B: 10, R: 10, G: 10, C: 10 };
            game.ui.render();
            console.log('Mana pool cheio: 10 de cada cor');
        },

        // Untap all
        untapAll(who) {
            const player = this._getPlayer(who);
            player.battlefield.forEach(c => c.tapped = false);
            game.ui.render();
            console.log(`Permanentes de ${player === game.player ? 'Jogador' : 'IA'} desviradas`);
        },

        // Set phase
        setPhase(phase) {
            const valid = ['UNTAP', 'UPKEEP', 'DRAW', 'MAIN1', 'COMBAT_BEGIN',
                          'DECLARE_ATTACKERS', 'DECLARE_BLOCKERS', 'COMBAT_DAMAGE',
                          'COMBAT_END', 'MAIN2', 'END', 'CLEANUP'];
            if (!valid.includes(phase)) {
                console.log('Fases válidas:', valid.join(', '));
                return;
            }
            game.currentPhase = phase;
            game.ui.render();
            console.log(`Fase alterada para ${phase}`);
        },

        // List phases
        phases() {
            console.log('Fases: UNTAP → UPKEEP → DRAW → MAIN1 → COMBAT_BEGIN → DECLARE_ATTACKERS → DECLARE_BLOCKERS → COMBAT_DAMAGE → COMBAT_END → MAIN2 → END → CLEANUP');
        },

        // Next turn
        nextTurn() {
            game.endTurn();
            console.log(`Turno ${game.currentTurn} - ${game.activePlayer === game.player ? 'Jogador' : 'IA'}`);
        },

        // Draw card
        draw(name) {
            const player = game.player;
            const idx = player.library.findIndex(c => c.name.toLowerCase().includes(name.toLowerCase()));
            if (idx === -1) {
                console.log(`Carta "${name}" não encontrada no deck`);
                return;
            }
            const card = player.library.splice(idx, 1)[0];
            player.hand.push(card);
            game.ui.render();
            console.log(`Comprou: ${card.name}`);
        },

        // Draw from any deck
        drawAny(name) {
            let found = null;
            Object.values(CARD_DATABASE).forEach(deck => {
                if (!found) {
                    const card = deck.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
                    if (card) found = JSON.parse(JSON.stringify(card));
                }
            });
            if (!found) {
                console.log(`Carta "${name}" não encontrada`);
                return;
            }
            found.instanceId = `debug_${Date.now()}`;
            game.player.hand.push(found);
            game.ui.render();
            console.log(`Adicionou à mão: ${found.name}`);
        },

        // Add to hand
        addToHand(name, who) {
            const player = this._getPlayer(who);
            let found = null;
            Object.values(CARD_DATABASE).forEach(deck => {
                if (!found) {
                    const card = deck.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
                    if (card) found = JSON.parse(JSON.stringify(card));
                }
            });
            if (!found) {
                console.log(`Carta "${name}" não encontrada`);
                return;
            }
            found.instanceId = `debug_${Date.now()}`;
            player.hand.push(found);
            game.ui.render();
            console.log(`${found.name} adicionada à mão de ${player === game.player ? 'Jogador' : 'IA'}`);
        },

        // Add to battlefield
        addToBattlefield(name, who) {
            const player = this._getPlayer(who);
            let found = null;
            Object.values(CARD_DATABASE).forEach(deck => {
                if (!found) {
                    const card = deck.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
                    if (card) found = JSON.parse(JSON.stringify(card));
                }
            });
            if (!found) {
                console.log(`Carta "${name}" não encontrada`);
                return;
            }
            found.instanceId = `debug_${Date.now()}`;
            found.summoningSickness = !found.keywords?.includes('haste');
            player.battlefield.push(found);
            game.ui.render();
            console.log(`${found.name} entrou no campo de ${player === game.player ? 'Jogador' : 'IA'}`);
        },

        // Kill creature
        kill(name, who) {
            const player = this._getPlayer(who);
            const idx = player.battlefield.findIndex(c =>
                c.type === 'creature' && c.name.toLowerCase().includes(name.toLowerCase())
            );
            if (idx === -1) {
                console.log(`Criatura "${name}" não encontrada`);
                return;
            }
            const creature = player.battlefield.splice(idx, 1)[0];
            player.graveyard.push(creature);
            game.ui.render();
            console.log(`${creature.name} morreu`);
        },

        // List cards
        listCards(deck) {
            if (deck) {
                const cards = CARD_DATABASE[deck];
                if (!cards) {
                    console.log('Decks disponíveis:', Object.keys(CARD_DATABASE).join(', '));
                    return;
                }
                console.log(`\n=== ${deck.toUpperCase()} ===`);
                cards.forEach(c => console.log(`${c.name} [${c.type}] ${c.cost || ''}`));
            } else {
                console.log('Decks disponíveis:', Object.keys(CARD_DATABASE).join(', '));
                console.log('Use: debug.listCards("deck") para ver cartas');
            }
        },

        // Setup combat scenario
        setupCombat() {
            // Add creatures
            this.addToBattlefield('Savannah Lions');
            this.addToBattlefield('Frenzied Goblin', 'opponent');

            // Remove summoning sickness
            game.player.battlefield.forEach(c => c.summoningSickness = false);
            game.opponent.battlefield.forEach(c => c.summoningSickness = false);

            // Go to combat
            game.currentPhase = 'DECLARE_ATTACKERS';
            game.ui.render();
            console.log('Cenário de combate pronto! Declare seus atacantes.');
        }
    };

    console.log('Jogo pronto! Selecione seus decks para começar.');
    console.log('💡 Dica: Use debug.help() no console para ver comandos de debug');
});
