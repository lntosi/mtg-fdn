/**
 * Testes do StatsManager
 * Valida persistência, cálculos de stats, streaks, ring buffer, etc.
 */

const { StatsManager } = require('../js/stats');

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn(key => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
        _store: store,
        _reset: () => { store = {}; }
    };
})();

beforeAll(() => {
    global.localStorage = localStorageMock;
});

beforeEach(() => {
    localStorageMock._reset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
});

function createStatsManager() {
    return new StatsManager();
}

function makeMatch(overrides = {}) {
    return {
        playerName: 'Lucas',
        result: 'win',
        reason: 'Oponente ficou sem vida',
        playerDecks: ['cats', 'goblins'],
        aiDecks: ['elves', 'vampires'],
        turns: 10,
        playerLife: 15,
        opponentLife: 0,
        startingLife: 20,
        ...overrides
    };
}

describe('StatsManager', () => {
    describe('Profile Key', () => {
        test('converte nome para lowercase trimmed', () => {
            const sm = createStatsManager();
            expect(sm.getProfileKey('  Lucas  ')).toBe('lucas');
            expect(sm.getProfileKey('TOSI')).toBe('tosi');
            expect(sm.getProfileKey('Knight')).toBe('knight');
        });

        test('retorna string vazia para nome vazio', () => {
            const sm = createStatsManager();
            expect(sm.getProfileKey('')).toBe('');
            expect(sm.getProfileKey('   ')).toBe('');
            expect(sm.getProfileKey(null)).toBe('');
            expect(sm.getProfileKey(undefined)).toBe('');
        });

        test('perfis são case-insensitive', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));
            sm.recordMatch(makeMatch({ playerName: 'LUCAS' }));
            sm.recordMatch(makeMatch({ playerName: '  lucas  ' }));

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(3);
        });
    });

    describe('Criação de Perfil', () => {
        test('getProfile retorna null para perfil inexistente', () => {
            const sm = createStatsManager();
            expect(sm.getProfile('desconhecido')).toBeNull();
        });

        test('getOrCreateProfile cria perfil com valores padrão', () => {
            const sm = createStatsManager();
            const profile = sm.getOrCreateProfile('Lucas');

            expect(profile.displayName).toBe('Lucas');
            expect(profile.totalGames).toBe(0);
            expect(profile.wins).toBe(0);
            expect(profile.losses).toBe(0);
            expect(profile.currentStreak).toBe(0);
            expect(profile.longestWinStreak).toBe(0);
            expect(profile.fastestWin).toBeNull();
            expect(profile.maxDamageDealt).toBe(0);
            expect(profile.deckUsage).toEqual({});
            expect(profile.deckWins).toEqual({});
            expect(profile.matches).toEqual([]);
        });

        test('getOrCreateProfile retorna perfil existente sem recriar', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));

            const profile = sm.getOrCreateProfile('Lucas');
            expect(profile.totalGames).toBe(1);
        });
    });

    describe('recordMatch — Totais', () => {
        test('incrementa totalGames e wins em vitória', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(1);
            expect(profile.wins).toBe(1);
            expect(profile.losses).toBe(0);
        });

        test('incrementa totalGames e losses em derrota', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'loss' }));

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(1);
            expect(profile.wins).toBe(0);
            expect(profile.losses).toBe(1);
        });

        test('acumula jogos corretamente', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(3);
            expect(profile.wins).toBe(2);
            expect(profile.losses).toBe(1);
        });
    });

    describe('recordMatch — Win Rate', () => {
        test('calcula win rate corretamente', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));

            expect(sm.getWinRate('lucas')).toBe(67); // 2/3 = 66.67 → 67
        });

        test('win rate 0 sem jogos', () => {
            const sm = createStatsManager();
            expect(sm.getWinRate('ninguem')).toBe(0);
        });

        test('win rate 100 com só vitórias', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));

            expect(sm.getWinRate('lucas')).toBe(100);
        });

        test('win rate 0 com só derrotas', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'loss' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));

            expect(sm.getWinRate('lucas')).toBe(0);
        });
    });

    describe('recordMatch — Deck Usage e Wins', () => {
        test('conta uso de cada deck', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerDecks: ['cats', 'goblins'] }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats', 'elves'] }));

            const profile = sm.getProfile('lucas');
            expect(profile.deckUsage.cats).toBe(2);
            expect(profile.deckUsage.goblins).toBe(1);
            expect(profile.deckUsage.elves).toBe(1);
        });

        test('conta wins por deck', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'win' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'loss' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'win' }));

            const profile = sm.getProfile('lucas');
            expect(profile.deckUsage.cats).toBe(3);
            expect(profile.deckWins.cats).toBe(2);
        });

        test('não incrementa deckWins em derrota', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerDecks: ['vampires'], result: 'loss' }));

            const profile = sm.getProfile('lucas');
            expect(profile.deckUsage.vampires).toBe(1);
            expect(profile.deckWins.vampires).toBeUndefined();
        });
    });

    describe('recordMatch — Streaks', () => {
        test('win streak incrementa com vitórias consecutivas', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));

            const profile = sm.getProfile('lucas');
            expect(profile.currentStreak).toBe(3);
            expect(profile.longestWinStreak).toBe(3);
        });

        test('derrota reseta win streak', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));

            const profile = sm.getProfile('lucas');
            expect(profile.currentStreak).toBe(-1);
        });

        test('longestWinStreak persiste após derrota', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'win' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));
            sm.recordMatch(makeMatch({ result: 'win' }));

            const profile = sm.getProfile('lucas');
            expect(profile.currentStreak).toBe(1);
            expect(profile.longestWinStreak).toBe(3);
        });

        test('loss streak conta negativo', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'loss' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));
            sm.recordMatch(makeMatch({ result: 'loss' }));

            const profile = sm.getProfile('lucas');
            expect(profile.currentStreak).toBe(-3);
        });
    });

    describe('recordMatch — Recordes', () => {
        test('fastestWin atualiza só em vitória com menos turnos', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win', turns: 15 }));
            sm.recordMatch(makeMatch({ result: 'win', turns: 8 }));
            sm.recordMatch(makeMatch({ result: 'win', turns: 12 }));

            const profile = sm.getProfile('lucas');
            expect(profile.fastestWin).toBe(8);
        });

        test('fastestWin não atualiza em derrota', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win', turns: 15 }));
            sm.recordMatch(makeMatch({ result: 'loss', turns: 5 }));

            const profile = sm.getProfile('lucas');
            expect(profile.fastestWin).toBe(15);
        });

        test('fastestWin null sem vitórias', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'loss', turns: 5 }));

            const profile = sm.getProfile('lucas');
            expect(profile.fastestWin).toBeNull();
        });

        test('maxDamageDealt atualiza só quando maior', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ startingLife: 20, opponentLife: 5 }));  // 15 dano
            sm.recordMatch(makeMatch({ startingLife: 20, opponentLife: 0 }));  // 20 dano
            sm.recordMatch(makeMatch({ startingLife: 20, opponentLife: 10 })); // 10 dano

            const profile = sm.getProfile('lucas');
            expect(profile.maxDamageDealt).toBe(20);
        });
    });

    describe('recordMatch — Ring Buffer de Partidas', () => {
        test('matches limitado a 20 entradas', () => {
            const sm = createStatsManager();

            for (let i = 0; i < 25; i++) {
                sm.recordMatch(makeMatch({ turns: i + 1 }));
            }

            const profile = sm.getProfile('lucas');
            expect(profile.matches.length).toBe(20);
            // Últimas 20: turnos 6-25
            expect(profile.matches[0].turns).toBe(6);
            expect(profile.matches[19].turns).toBe(25);
        });

        test('match record contém dados corretos', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({
                result: 'win',
                reason: 'Oponente ficou sem vida',
                playerDecks: ['cats'],
                aiDecks: ['goblins'],
                turns: 10,
                playerLife: 15,
                opponentLife: 0
            }));

            const profile = sm.getProfile('lucas');
            const match = profile.matches[0];

            expect(match.result).toBe('win');
            expect(match.reason).toBe('Oponente ficou sem vida');
            expect(match.playerDecks).toEqual(['cats']);
            expect(match.aiDecks).toEqual(['goblins']);
            expect(match.turns).toBe(10);
            expect(match.playerLife).toBe(15);
            expect(match.opponentLife).toBe(0);
            expect(match.date).toBeDefined();
        });
    });

    describe('Deck Stats', () => {
        test('getFavoriteDeck retorna o mais usado', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerDecks: ['cats'] }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'] }));
            sm.recordMatch(makeMatch({ playerDecks: ['goblins'] }));

            expect(sm.getFavoriteDeck('lucas')).toBe('cats');
        });

        test('getFavoriteDeck retorna null sem jogos', () => {
            const sm = createStatsManager();
            expect(sm.getFavoriteDeck('ninguem')).toBeNull();
        });

        test('getBestDeck retorna deck com melhor win rate (min 2 jogos)', () => {
            const sm = createStatsManager();
            // cats: 1/3 = 33%
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'win' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'loss' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'loss' }));
            // goblins: 2/2 = 100%
            sm.recordMatch(makeMatch({ playerDecks: ['goblins'], result: 'win' }));
            sm.recordMatch(makeMatch({ playerDecks: ['goblins'], result: 'win' }));

            expect(sm.getBestDeck('lucas')).toBe('goblins');
        });

        test('getBestDeck ignora decks com menos de 2 jogos', () => {
            const sm = createStatsManager();
            // elves: 1/1 = 100% mas só 1 jogo
            sm.recordMatch(makeMatch({ playerDecks: ['elves'], result: 'win' }));
            // cats: 2/3 = 67%
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'win' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'win' }));
            sm.recordMatch(makeMatch({ playerDecks: ['cats'], result: 'loss' }));

            expect(sm.getBestDeck('lucas')).toBe('cats');
        });
    });

    describe('Gerenciamento de Perfis', () => {
        test('getAllProfiles retorna perfis ordenados por lastPlayed', () => {
            const sm = createStatsManager();

            // Criar perfis com timestamps explícitos para garantir ordem
            sm.recordMatch(makeMatch({ playerName: 'Alpha' }));
            sm.profiles['alpha'].lastPlayed = '2026-01-01T00:00:00.000Z';

            sm.recordMatch(makeMatch({ playerName: 'Beta' }));
            sm.profiles['beta'].lastPlayed = '2026-01-02T00:00:00.000Z';

            sm.recordMatch(makeMatch({ playerName: 'Gamma' }));
            sm.profiles['gamma'].lastPlayed = '2026-01-03T00:00:00.000Z';

            const all = sm.getAllProfiles();
            expect(all.length).toBe(3);
            // Mais recente primeiro
            expect(all[0].key).toBe('gamma');
            expect(all[1].key).toBe('beta');
            expect(all[2].key).toBe('alpha');
        });

        test('deleteProfile remove o perfil', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));

            expect(sm.getProfile('lucas')).not.toBeNull();
            sm.deleteProfile('Lucas');
            expect(sm.getProfile('lucas')).toBeNull();
        });

        test('clearAllStats remove todos os perfis', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));
            sm.recordMatch(makeMatch({ playerName: 'Tosi' }));

            sm.clearAllStats();
            expect(sm.getAllProfiles().length).toBe(0);
        });

        test('perfis separados por nome', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'win' }));
            sm.recordMatch(makeMatch({ playerName: 'Tosi', result: 'loss' }));

            expect(sm.getProfile('lucas').wins).toBe(1);
            expect(sm.getProfile('lucas').losses).toBe(0);
            expect(sm.getProfile('tosi').wins).toBe(0);
            expect(sm.getProfile('tosi').losses).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        test('primeiro jogo inicializa tudo corretamente', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ result: 'win', turns: 12 }));

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(1);
            expect(profile.wins).toBe(1);
            expect(profile.currentStreak).toBe(1);
            expect(profile.longestWinStreak).toBe(1);
            expect(profile.fastestWin).toBe(12);
            expect(profile.matches.length).toBe(1);
        });

        test('nome vazio não cria perfil via recordMatch', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: '' }));

            expect(sm.getAllProfiles().length).toBe(0);
        });

        test('nome com só espaços não cria perfil via recordMatch', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: '   ' }));

            expect(sm.getAllProfiles().length).toBe(0);
        });

        test('persistência via localStorage', () => {
            const sm1 = createStatsManager();
            sm1.recordMatch(makeMatch({ playerName: 'Lucas', result: 'win' }));

            // Criar novo manager (simula recarregar página)
            const sm2 = createStatsManager();
            const profile = sm2.getProfile('lucas');
            expect(profile).not.toBeNull();
            expect(profile.wins).toBe(1);
        });

        test('lastPlayed é atualizado em cada partida', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));

            const profile = sm.getProfile('lucas');
            expect(profile.lastPlayed).not.toBeNull();
            const date = new Date(profile.lastPlayed);
            expect(date.getTime()).toBeGreaterThan(0);
        });
    });

    describe('Match ID', () => {
        test('cada partida recebe um id único', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch());
            sm.recordMatch(makeMatch());

            const profile = sm.getProfile('lucas');
            expect(profile.matches[0].id).toBeDefined();
            expect(profile.matches[1].id).toBeDefined();
            expect(profile.matches[0].id).not.toBe(profile.matches[1].id);
        });
    });

    describe('Import/Export', () => {
        function makeMatchWithId(id, overrides = {}) {
            return {
                id,
                result: 'win',
                reason: 'Oponente ficou sem vida',
                playerDecks: ['cats'],
                aiDecks: ['goblins'],
                turns: 10,
                playerLife: 15,
                opponentLife: 0,
                date: '2026-01-15T12:00:00.000Z',
                ...overrides
            };
        }

        test('importFromData importa perfis novos', () => {
            const sm = createStatsManager();
            const data = {
                version: 1,
                profiles: {
                    lucas: {
                        displayName: 'Lucas', totalGames: 2, wins: 2, losses: 0,
                        currentStreak: 2, longestWinStreak: 2, fastestWin: 8, maxDamageDealt: 20,
                        deckUsage: { cats: 2 }, deckWins: { cats: 2 }, lastPlayed: '2026-01-15T12:00:00.000Z',
                        matches: [makeMatchWithId('a1'), makeMatchWithId('a2')]
                    },
                    tosi: {
                        displayName: 'Tosi', totalGames: 1, wins: 0, losses: 1,
                        currentStreak: -1, longestWinStreak: 0, fastestWin: null, maxDamageDealt: 15,
                        deckUsage: {}, deckWins: {}, lastPlayed: '2026-01-14T12:00:00.000Z',
                        matches: [makeMatchWithId('b1', { result: 'loss' })]
                    }
                }
            };

            const result = sm.importFromData(data);
            expect(result.imported).toBe(2);
            expect(result.newMatches).toBe(3);
            expect(sm.getProfile('lucas').totalGames).toBe(2);
            expect(sm.getProfile('tosi').totalGames).toBe(1);
        });

        test('importar mesmo arquivo duas vezes não duplica partidas', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));
            const matchId = sm.getProfile('lucas').matches[0].id;

            // Exportar
            const exported = { version: 1, profiles: JSON.parse(JSON.stringify(sm.profiles)) };

            // Importar o mesmo — nenhuma partida nova
            const result = sm.importFromData(exported);
            expect(result.merged).toBe(0);
            expect(result.newMatches).toBe(0);
            expect(sm.getProfile('lucas').totalGames).toBe(1);
            expect(sm.getProfile('lucas').matches.length).toBe(1);
        });

        test('merge real: combina partidas de dois exports diferentes', () => {
            // Simula: jogar 2 partidas, exportar, limpar, jogar 3 partidas, exportar
            const sm = createStatsManager();

            // Sessão 1: 2 partidas
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'win', turns: 10 }));
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'loss', turns: 12 }));
            const export1 = { version: 1, profiles: JSON.parse(JSON.stringify(sm.profiles)) };

            // Limpar e criar sessão 2: 3 partidas
            sm.clearAllStats();
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'win', turns: 8 }));
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'win', turns: 15 }));
            sm.recordMatch(makeMatch({ playerName: 'Lucas', result: 'loss', turns: 20 }));
            const export2 = { version: 1, profiles: JSON.parse(JSON.stringify(sm.profiles)) };

            // Novo browser: importar os dois
            sm.clearAllStats();
            sm.importFromData(export1);
            const result2 = sm.importFromData(export2);

            expect(result2.merged).toBe(1);
            expect(result2.newMatches).toBe(3);

            const profile = sm.getProfile('lucas');
            expect(profile.totalGames).toBe(5); // 2 + 3
            expect(profile.wins).toBe(3);
            expect(profile.losses).toBe(2);
        });

        test('merge recalcula streaks e recordes corretamente', () => {
            const sm = createStatsManager();

            const data = {
                version: 1,
                profiles: {
                    lucas: {
                        displayName: 'Lucas', totalGames: 0, wins: 0, losses: 0,
                        currentStreak: 0, longestWinStreak: 0, fastestWin: null, maxDamageDealt: 0,
                        deckUsage: {}, deckWins: {}, lastPlayed: null,
                        matches: [
                            makeMatchWithId('m1', { result: 'win', turns: 15, date: '2026-01-01T01:00:00Z' }),
                            makeMatchWithId('m2', { result: 'win', turns: 8, date: '2026-01-01T02:00:00Z' }),
                            makeMatchWithId('m3', { result: 'loss', turns: 20, date: '2026-01-01T03:00:00Z' }),
                        ]
                    }
                }
            };

            sm.importFromData(data);
            const profile = sm.getProfile('lucas');

            // Recalculado a partir das matches
            expect(profile.totalGames).toBe(3);
            expect(profile.wins).toBe(2);
            expect(profile.losses).toBe(1);
            expect(profile.longestWinStreak).toBe(2);
            expect(profile.currentStreak).toBe(-1); // última foi loss
            expect(profile.fastestWin).toBe(8);
        });

        test('merge recalcula deck usage corretamente', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas', playerDecks: ['cats'], result: 'win' }));

            const data = {
                version: 1,
                profiles: {
                    lucas: {
                        displayName: 'Lucas', totalGames: 0, wins: 0, losses: 0,
                        currentStreak: 0, longestWinStreak: 0, fastestWin: null, maxDamageDealt: 0,
                        deckUsage: {}, deckWins: {}, lastPlayed: null,
                        matches: [
                            makeMatchWithId('ext1', { playerDecks: ['goblins'], result: 'win', date: '2026-01-02T00:00:00Z' }),
                            makeMatchWithId('ext2', { playerDecks: ['cats'], result: 'loss', date: '2026-01-03T00:00:00Z' }),
                        ]
                    }
                }
            };

            sm.importFromData(data);
            const profile = sm.getProfile('lucas');

            expect(profile.deckUsage.cats).toBe(2);
            expect(profile.deckUsage.goblins).toBe(1);
            expect(profile.deckWins.cats).toBe(1); // 1 win com cats
            expect(profile.deckWins.goblins).toBe(1);
        });

        test('importFromData rejeita dados inválidos', () => {
            const sm = createStatsManager();
            expect(() => sm.importFromData(null)).toThrow('Formato inválido');
            expect(() => sm.importFromData({})).toThrow('Formato inválido');
            expect(() => sm.importFromData({ profiles: 'not-object' })).toThrow('Formato inválido');
        });

        test('importFromData combina perfis novos e existentes', () => {
            const sm = createStatsManager();
            sm.recordMatch(makeMatch({ playerName: 'Lucas' }));

            const data = {
                version: 1,
                profiles: {
                    lucas: {
                        displayName: 'Lucas', totalGames: 0, wins: 0, losses: 0,
                        currentStreak: 0, longestWinStreak: 0, fastestWin: null, maxDamageDealt: 0,
                        deckUsage: {}, deckWins: {}, lastPlayed: null,
                        matches: [] // sem partidas novas
                    },
                    knight: {
                        displayName: 'Knight', totalGames: 2, wins: 2, losses: 0,
                        currentStreak: 2, longestWinStreak: 2, fastestWin: 9, maxDamageDealt: 20,
                        deckUsage: { elves: 2 }, deckWins: { elves: 2 }, lastPlayed: '2026-01-10T00:00:00Z',
                        matches: [makeMatchWithId('k1'), makeMatchWithId('k2')]
                    }
                }
            };

            const result = sm.importFromData(data);
            expect(result.imported).toBe(1);  // knight é novo
            expect(result.merged).toBe(0);    // lucas sem partidas novas
            expect(sm.getProfile('knight').totalGames).toBe(2);
            expect(sm.getProfile('lucas').totalGames).toBe(1); // inalterado
        });
    });
});
