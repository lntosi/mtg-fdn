// === Sistema de Estatísticas do Jogador ===

class StatsManager {
    constructor() {
        this.storageKey = 'mtg_player_stats';
        this.profiles = this.load();
    }

    /**
     * Carrega todos os perfis do localStorage
     * @returns {Object} Mapa de perfis { key: profileData }
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Erro ao carregar estatísticas:', e);
        }
        return {};
    }

    /**
     * Salva todos os perfis no localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.profiles));
        } catch (e) {
            console.warn('Erro ao salvar estatísticas:', e);
        }
    }

    /**
     * Gera a chave do perfil a partir do nome (lowercase trimmed)
     * @param {string} name
     * @returns {string}
     */
    getProfileKey(name) {
        return (name || '').trim().toLowerCase();
    }

    /**
     * Retorna um perfil existente ou null
     * @param {string} name
     * @returns {Object|null}
     */
    getProfile(name) {
        const key = this.getProfileKey(name);
        if (!key) return null;
        return this.profiles[key] || null;
    }

    /**
     * Retorna um perfil existente ou cria um novo
     * @param {string} name
     * @returns {Object}
     */
    getOrCreateProfile(name) {
        const key = this.getProfileKey(name);
        if (!key) return this._createEmptyProfile(name);

        if (!this.profiles[key]) {
            this.profiles[key] = this._createEmptyProfile(name);
            this.save();
        }
        return this.profiles[key];
    }

    /**
     * Cria um perfil vazio
     * @param {string} name
     * @returns {Object}
     */
    _createEmptyProfile(name) {
        return {
            displayName: (name || '').trim() || 'Jogador',
            totalGames: 0,
            wins: 0,
            losses: 0,
            currentStreak: 0,
            longestWinStreak: 0,
            fastestWin: null,
            maxDamageDealt: 0,
            deckUsage: {},
            deckWins: {},
            lastPlayed: null,
            matches: []
        };
    }

    /**
     * Retorna todos os perfis ordenados por lastPlayed (mais recente primeiro)
     * @returns {Array<{key: string, profile: Object}>}
     */
    getAllProfiles() {
        return Object.entries(this.profiles)
            .map(([key, profile]) => ({ key, profile }))
            .sort((a, b) => {
                const timeA = a.profile.lastPlayed ? new Date(a.profile.lastPlayed).getTime() : 0;
                const timeB = b.profile.lastPlayed ? new Date(b.profile.lastPlayed).getTime() : 0;
                return timeB - timeA;
            });
    }

    /**
     * Registra uma partida finalizada
     * @param {Object} matchData - Dados da partida
     */
    recordMatch(matchData) {
        const {
            playerName,
            result,       // 'win' ou 'loss'
            reason,
            playerDecks,  // array de deck keys
            aiDecks,
            turns,
            playerLife,
            opponentLife,
            startingLife
        } = matchData;

        const key = this.getProfileKey(playerName);
        if (!key) return;

        const profile = this.getOrCreateProfile(playerName);
        const isWin = result === 'win';

        // Totais
        profile.totalGames++;
        if (isWin) {
            profile.wins++;
        } else {
            profile.losses++;
        }

        // Streaks
        if (isWin) {
            profile.currentStreak = Math.max(0, profile.currentStreak) + 1;
            if (profile.currentStreak > profile.longestWinStreak) {
                profile.longestWinStreak = profile.currentStreak;
            }
        } else {
            profile.currentStreak = Math.min(0, profile.currentStreak) - 1;
        }

        // Vitória mais rápida
        if (isWin && turns > 0) {
            if (profile.fastestWin === null || turns < profile.fastestWin) {
                profile.fastestWin = turns;
            }
        }

        // Máximo dano causado
        const damageDealt = (startingLife || 20) - (opponentLife || 0);
        if (damageDealt > profile.maxDamageDealt) {
            profile.maxDamageDealt = damageDealt;
        }

        // Deck usage e wins
        if (playerDecks && Array.isArray(playerDecks)) {
            playerDecks.forEach(deck => {
                profile.deckUsage[deck] = (profile.deckUsage[deck] || 0) + 1;
                if (isWin) {
                    profile.deckWins[deck] = (profile.deckWins[deck] || 0) + 1;
                }
            });
        }

        // Timestamp
        profile.lastPlayed = new Date().toISOString();

        // Registro da partida (ring buffer de 20)
        const matchRecord = {
            id: this._generateMatchId(),
            result,
            reason: reason || '',
            playerDecks: playerDecks || [],
            aiDecks: aiDecks || [],
            turns: turns || 0,
            playerLife: playerLife || 0,
            opponentLife: opponentLife || 0,
            date: profile.lastPlayed
        };

        profile.matches.push(matchRecord);
        if (profile.matches.length > 20) {
            profile.matches = profile.matches.slice(-20);
        }

        this.save();
    }

    /**
     * Calcula win rate de um perfil
     * @param {string} name
     * @returns {number} Win rate em porcentagem (0-100)
     */
    getWinRate(name) {
        const profile = this.getProfile(name);
        if (!profile || profile.totalGames === 0) return 0;
        return Math.round((profile.wins / profile.totalGames) * 100);
    }

    /**
     * Retorna o deck mais usado por um perfil
     * @param {string} name
     * @returns {string|null}
     */
    getFavoriteDeck(name) {
        const profile = this.getProfile(name);
        if (!profile) return null;

        const entries = Object.entries(profile.deckUsage);
        if (entries.length === 0) return null;

        return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    /**
     * Retorna o deck com melhor win rate (mínimo 2 jogos)
     * @param {string} name
     * @returns {string|null}
     */
    getBestDeck(name) {
        const profile = this.getProfile(name);
        if (!profile) return null;

        const entries = Object.entries(profile.deckUsage)
            .filter(([deck, count]) => count >= 2);
        if (entries.length === 0) return null;

        return entries
            .map(([deck, count]) => ({
                deck,
                winRate: ((profile.deckWins[deck] || 0) / count) * 100
            }))
            .sort((a, b) => b.winRate - a.winRate)[0].deck;
    }

    /**
     * Remove um perfil
     * @param {string} name
     */
    deleteProfile(name) {
        const key = this.getProfileKey(name);
        if (key && this.profiles[key]) {
            delete this.profiles[key];
            this.save();
        }
    }

    /**
     * Remove todos os perfis
     */
    clearAllStats() {
        this.profiles = {};
        this.save();
    }

    /**
     * Gera um ID único para cada partida
     * @returns {string}
     */
    _generateMatchId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /**
     * Recalcula totais e recordes a partir do array de matches
     * @param {Object} profile
     */
    _recalculateFromMatches(profile) {
        profile.totalGames = profile.matches.length;
        profile.wins = 0;
        profile.losses = 0;
        profile.currentStreak = 0;
        profile.longestWinStreak = 0;
        profile.fastestWin = null;
        profile.maxDamageDealt = 0;
        profile.deckUsage = {};
        profile.deckWins = {};

        for (const m of profile.matches) {
            const isWin = m.result === 'win';

            if (isWin) {
                profile.wins++;
            } else {
                profile.losses++;
            }

            // Streaks
            if (isWin) {
                profile.currentStreak = Math.max(0, profile.currentStreak) + 1;
                if (profile.currentStreak > profile.longestWinStreak) {
                    profile.longestWinStreak = profile.currentStreak;
                }
            } else {
                profile.currentStreak = Math.min(0, profile.currentStreak) - 1;
            }

            // Vitória mais rápida
            if (isWin && m.turns > 0) {
                if (profile.fastestWin === null || m.turns < profile.fastestWin) {
                    profile.fastestWin = m.turns;
                }
            }

            // Max dano (usa 20 como fallback de startingLife)
            const damage = (m.startingLife || 20) - (m.opponentLife || 0);
            if (damage > profile.maxDamageDealt) {
                profile.maxDamageDealt = damage;
            }

            // Deck usage
            if (m.playerDecks && Array.isArray(m.playerDecks)) {
                m.playerDecks.forEach(deck => {
                    profile.deckUsage[deck] = (profile.deckUsage[deck] || 0) + 1;
                    if (isWin) {
                        profile.deckWins[deck] = (profile.deckWins[deck] || 0) + 1;
                    }
                });
            }
        }

        // lastPlayed = data da partida mais recente
        if (profile.matches.length > 0) {
            profile.lastPlayed = profile.matches[profile.matches.length - 1].date;
        }
    }

    /**
     * Exporta todos os perfis como JSON e baixa o arquivo
     */
    exportToFile() {
        const data = {
            version: 1,
            exportDate: new Date().toISOString(),
            profiles: this.profiles
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mtg-stats-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Importa perfis de um objeto JSON, fazendo merge real com deduplicação por matchId.
     * Partidas novas (ID inexistente no perfil local) são adicionadas.
     * Partidas duplicadas (mesmo ID) são ignoradas.
     * Totais e recordes são recalculados a partir do histórico combinado.
     * @param {Object} data - Dados importados { version, profiles }
     * @returns {{ imported: number, merged: number, newMatches: number }} Resultado
     */
    importFromData(data) {
        if (!data || !data.profiles || typeof data.profiles !== 'object') {
            throw new Error('Formato inválido');
        }

        let imported = 0;  // perfis totalmente novos
        let merged = 0;    // perfis com partidas novas adicionadas
        let newMatches = 0; // total de partidas novas importadas

        for (const [key, incoming] of Object.entries(data.profiles)) {
            const existing = this.profiles[key];

            if (!existing) {
                // Perfil novo: importar e recalcular a partir das matches
                this.profiles[key] = incoming;
                if (incoming.matches && incoming.matches.length > 0) {
                    this._recalculateFromMatches(this.profiles[key]);
                }
                imported++;
                newMatches += (incoming.matches || []).length;
            } else {
                // Merge: combinar partidas por ID
                const existingIds = new Set(
                    existing.matches.filter(m => m.id).map(m => m.id)
                );

                let addedCount = 0;
                for (const match of (incoming.matches || [])) {
                    if (match.id && !existingIds.has(match.id)) {
                        existing.matches.push(match);
                        existingIds.add(match.id);
                        addedCount++;
                    }
                }

                if (addedCount > 0) {
                    // Ordenar por data e manter últimas 50 (ring buffer maior para merge)
                    existing.matches.sort((a, b) =>
                        new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
                    );
                    if (existing.matches.length > 50) {
                        existing.matches = existing.matches.slice(-50);
                    }

                    // Recalcular tudo a partir do histórico combinado
                    this._recalculateFromMatches(existing);
                    merged++;
                    newMatches += addedCount;
                }
            }
        }

        this.save();
        return { imported, merged, newMatches };
    }
}

// Instância global (apenas no browser)
if (typeof window !== 'undefined') {
    window.statsManager = new StatsManager();
}

// Exportar para testes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StatsManager };
}
