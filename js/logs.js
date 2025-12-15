// === Sistema de Logs para Debug ===

class LogManager {
    constructor() {
        this.entries = [];
        this.maxEntries = 1000; // Limite para evitar consumo excessivo de memória
        this.sessionStart = new Date();
        this.gameInfo = null;
        this.jsErrors = [];

        // Capturar erros JavaScript automaticamente
        this.setupErrorCapture();
    }

    /**
     * Configura captura automática de erros JavaScript
     */
    setupErrorCapture() {
        window.addEventListener('error', (event) => {
            this.logError({
                type: 'js_error',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack || null
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                type: 'promise_rejection',
                message: event.reason?.message || String(event.reason),
                stack: event.reason?.stack || null
            });
        });
    }

    /**
     * Registra informações iniciais da partida
     */
    setGameInfo(info) {
        this.gameInfo = {
            playerDecks: info.playerDecks,
            aiDecks: info.aiDecks,
            playerName: info.playerName,
            startingLife: info.startingLife,
            playerFirst: info.playerFirst,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Adiciona uma entrada ao log
     * @param {string} category - Categoria do evento (turn, action, trigger, combat, etc.)
     * @param {string} message - Mensagem descritiva
     * @param {Object} data - Dados adicionais (opcional)
     */
    add(category, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            turn: window.game?.turnNumber || 0,
            phase: window.game?.phase || 'unknown',
            activePlayer: window.game?.activePlayer?.name || 'unknown',
            category,
            message,
            data
        };

        this.entries.push(entry);

        // Limitar tamanho do log
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }
    }

    /**
     * Registra um erro JavaScript
     */
    logError(errorInfo) {
        const entry = {
            timestamp: new Date().toISOString(),
            turn: window.game?.turnNumber || 0,
            phase: window.game?.phase || 'unknown',
            ...errorInfo
        };

        this.jsErrors.push(entry);
        this.add('error', errorInfo.message, errorInfo);
    }

    /**
     * Atalhos para categorias comuns
     */
    turn(message, data = null) {
        this.add('turn', message, data);
    }

    action(message, data = null) {
        this.add('action', message, data);
    }

    trigger(message, data = null) {
        this.add('trigger', message, data);
    }

    combat(message, data = null) {
        this.add('combat', message, data);
    }

    spell(message, data = null) {
        this.add('spell', message, data);
    }

    ability(message, data = null) {
        this.add('ability', message, data);
    }

    state(message, data = null) {
        this.add('state', message, data);
    }

    /**
     * Captura snapshot do estado atual do jogo
     */
    captureGameState() {
        const game = window.game;
        if (!game) return null;

        return {
            turn: game.turnNumber,
            phase: game.phase,
            activePlayer: game.activePlayer?.name,
            player: {
                life: game.player?.life,
                handSize: game.player?.hand?.length,
                librarySize: game.player?.library?.length,
                graveyardSize: game.player?.graveyard?.length,
                battlefield: game.player?.battlefield?.map(c => ({
                    name: c.name,
                    type: c.type,
                    tapped: c.tapped,
                    damage: c.damage || 0,
                    counters: c.counters,
                    attachments: c.attachments?.map(a => a.name)
                }))
            },
            opponent: {
                life: game.opponent?.life,
                handSize: game.opponent?.hand?.length,
                librarySize: game.opponent?.library?.length,
                graveyardSize: game.opponent?.graveyard?.length,
                battlefield: game.opponent?.battlefield?.map(c => ({
                    name: c.name,
                    type: c.type,
                    tapped: c.tapped,
                    damage: c.damage || 0,
                    counters: c.counters,
                    attachments: c.attachments?.map(a => a.name)
                }))
            },
            stack: game.stack?.map(item => ({
                name: item.card?.name || item.ability?.name,
                controller: item.controller?.name
            })),
            attackers: game.currentAttackers?.map(c => c.name),
            blockerAssignments: Object.entries(game.blockerAssignments || {}).map(([attackerId, blockers]) => ({
                attacker: game.player?.battlefield?.find(c => c.instanceId === attackerId)?.name ||
                          game.opponent?.battlefield?.find(c => c.instanceId === attackerId)?.name,
                blockers: blockers.map(b => b.name)
            }))
        };
    }

    /**
     * Gera o log formatado para exportação
     */
    export() {
        const game = window.game;
        const now = new Date();

        let output = '';
        output += '═══════════════════════════════════════════════════════════════\n';
        output += '                    MTG JUMPSTART - LOG DE PARTIDA              \n';
        output += '═══════════════════════════════════════════════════════════════\n\n';

        // Info da sessão
        output += `Exportado em: ${now.toLocaleString('pt-BR')}\n`;
        output += `Sessão iniciada: ${this.sessionStart.toLocaleString('pt-BR')}\n`;
        output += `Duração: ${this.formatDuration(now - this.sessionStart)}\n\n`;

        // Info da partida
        if (this.gameInfo) {
            output += '── Configuração da Partida ──\n';
            output += `Decks do Jogador: ${this.gameInfo.playerDecks?.join(' + ') || 'N/A'}\n`;
            output += `Decks da IA: ${this.gameInfo.aiDecks?.join(' + ') || 'N/A'}\n`;
            output += `Vida inicial: ${this.gameInfo.startingLife || 20}\n`;
            output += `Primeiro a jogar: ${this.gameInfo.playerFirst ? 'Jogador' : 'IA'}\n\n`;
        }

        // Estado atual
        if (game) {
            output += '── Estado Atual ──\n';
            output += `Turno: ${game.turnNumber}\n`;
            output += `Fase: ${game.phase}\n`;
            output += `Jogador ativo: ${game.activePlayer?.name}\n`;
            output += `Vida - Jogador: ${game.player?.life} | IA: ${game.opponent?.life}\n`;
            output += `Cartas na mão - Jogador: ${game.player?.hand?.length} | IA: ${game.opponent?.hand?.length}\n`;
            output += `Grimório - Jogador: ${game.player?.library?.length} | IA: ${game.opponent?.library?.length}\n`;

            if (game.gameOver) {
                output += `\nJOGO ENCERRADO - Vencedor: ${game.winner}\n`;
                output += `Motivo: ${game.gameOverReason}\n`;
            }
            output += '\n';

            // Campo de batalha atual
            output += '── Campo de Batalha ──\n';
            output += this.formatBattlefield(game.player, 'Jogador');
            output += this.formatBattlefield(game.opponent, 'IA');
            output += '\n';
        }

        // Erros JavaScript (se houver)
        if (this.jsErrors.length > 0) {
            output += '── ERROS JAVASCRIPT ──\n';
            this.jsErrors.forEach((err, i) => {
                output += `[${i + 1}] ${err.type}: ${err.message}\n`;
                if (err.filename) output += `    Arquivo: ${err.filename}:${err.line}:${err.column}\n`;
                if (err.stack) output += `    Stack: ${err.stack.split('\n').slice(0, 3).join('\n    ')}\n`;
            });
            output += '\n';
        }

        // Histórico de eventos
        output += '═══════════════════════════════════════════════════════════════\n';
        output += '                         HISTÓRICO DE EVENTOS                   \n';
        output += '═══════════════════════════════════════════════════════════════\n\n';

        let currentTurn = 0;
        this.entries.forEach(entry => {
            // Separador de turno
            if (entry.turn !== currentTurn) {
                currentTurn = entry.turn;
                output += `\n══ TURNO ${currentTurn} ══\n`;
            }

            // Formatar entrada
            const time = entry.timestamp.split('T')[1].split('.')[0];
            const category = entry.category.toUpperCase().padEnd(8);
            output += `[${time}] [${entry.phase.padEnd(20)}] [${category}] ${entry.message}\n`;

            // Dados adicionais (se relevante)
            if (entry.data && entry.category !== 'error') {
                const dataStr = JSON.stringify(entry.data, null, 2);
                if (dataStr !== '{}' && dataStr !== 'null') {
                    output += `         └─ ${dataStr.replace(/\n/g, '\n         ')}\n`;
                }
            }
        });

        output += '\n═══════════════════════════════════════════════════════════════\n';
        output += '                           FIM DO LOG                           \n';
        output += '═══════════════════════════════════════════════════════════════\n';

        return output;
    }

    /**
     * Exporta como JSON estruturado
     */
    exportJSON() {
        return JSON.stringify({
            meta: {
                exportedAt: new Date().toISOString(),
                sessionStart: this.sessionStart.toISOString(),
                version: '1.0'
            },
            gameInfo: this.gameInfo,
            currentState: this.captureGameState(),
            errors: this.jsErrors,
            entries: this.entries
        }, null, 2);
    }

    /**
     * Baixa o log como arquivo
     */
    download(format = 'txt') {
        const content = format === 'json' ? this.exportJSON() : this.export();
        const filename = `mtg-log-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return filename;
    }

    /**
     * Copia o log para a área de transferência
     */
    async copyToClipboard(format = 'txt') {
        const content = format === 'json' ? this.exportJSON() : this.export();
        try {
            await navigator.clipboard.writeText(content);
            return true;
        } catch (err) {
            console.error('Erro ao copiar para clipboard:', err);
            return false;
        }
    }

    /**
     * Limpa o histórico de logs
     */
    clear() {
        this.entries = [];
        this.jsErrors = [];
    }

    /**
     * Formata o campo de batalha de um jogador
     */
    formatBattlefield(player, label) {
        if (!player?.battlefield) return `${label}: (vazio)\n`;

        let output = `${label}:\n`;
        const creatures = player.battlefield.filter(c => c.type === 'creature');
        const lands = player.battlefield.filter(c => c.type === 'land');
        const others = player.battlefield.filter(c => c.type !== 'creature' && c.type !== 'land');

        if (lands.length > 0) {
            const landCounts = {};
            lands.forEach(l => {
                const key = `${l.name}${l.tapped ? ' (T)' : ''}`;
                landCounts[key] = (landCounts[key] || 0) + 1;
            });
            output += `  Terrenos: ${Object.entries(landCounts).map(([k, v]) => v > 1 ? `${k} x${v}` : k).join(', ')}\n`;
        }

        if (creatures.length > 0) {
            output += `  Criaturas:\n`;
            creatures.forEach(c => {
                const power = (c.power || 0) + (c.powerModifier || 0) + (c.counters?.plusOnePlusOne || 0);
                const toughness = (c.toughness || 0) + (c.toughnessModifier || 0) + (c.counters?.plusOnePlusOne || 0);
                const effectiveToughness = toughness - (c.damage || 0);
                const status = [];
                if (c.tapped) status.push('T');
                if (c.summoningSickness) status.push('SS');
                if (c.damage) status.push(`-${c.damage}dmg`);
                if (c.counters?.plusOnePlusOne) status.push(`+${c.counters.plusOnePlusOne}/+${c.counters.plusOnePlusOne}`);
                if (c.attachments?.length) status.push(`[${c.attachments.map(a => a.name).join(', ')}]`);

                const statusStr = status.length > 0 ? ` (${status.join(', ')})` : '';
                output += `    - ${c.name} ${power}/${effectiveToughness}${statusStr}\n`;
            });
        }

        if (others.length > 0) {
            output += `  Outros: ${others.map(c => c.name + (c.tapped ? ' (T)' : '')).join(', ')}\n`;
        }

        return output;
    }

    /**
     * Formata duração em formato legível
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Instância global
window.logManager = new LogManager();

// Debug helper
if (window.debug) {
    window.debug.exportLog = () => {
        const filename = window.logManager.download('txt');
        console.log(`Log exportado: ${filename}`);
    };
    window.debug.exportLogJSON = () => {
        const filename = window.logManager.download('json');
        console.log(`Log JSON exportado: ${filename}`);
    };
    window.debug.copyLog = async () => {
        const success = await window.logManager.copyToClipboard();
        console.log(success ? 'Log copiado para clipboard!' : 'Erro ao copiar log');
    };
    window.debug.showLog = () => {
        console.log(window.logManager.export());
    };
}
