// === Sistema de Configurações ===

class SettingsManager {
    constructor() {
        this.defaults = {
            theme: 'default',
            soundEnabled: true,
            volume: 50,
            logPanelEnabled: false  // Histórico retraído por padrão
        };

        this.settings = this.loadSettings();
        this.modal = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.modal = document.getElementById('settings-modal');
        this.bindEvents();
        this.applyTheme(this.settings.theme);
        this.applySoundSettings();
        this.applyLogPanelSetting();
        this.initialized = true;
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('mtg_settings');
            if (saved) {
                return { ...this.defaults, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log('Erro ao carregar configurações:', e);
        }
        return { ...this.defaults };
    }

    saveSettings() {
        try {
            localStorage.setItem('mtg_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.log('Erro ao salvar configurações:', e);
        }
    }

    bindEvents() {
        // Tecla ESC para abrir/fechar configurações
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isInputFocused()) {
                e.preventDefault();
                this.toggleModal();
            }
        });

        // Botão fechar
        const btnClose = document.getElementById('btn-close-settings');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.closeModal());
        }

        // Temas
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });

        // Som enabled/disabled
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) {
            soundEnabled.checked = this.settings.soundEnabled;
            soundEnabled.addEventListener('change', (e) => {
                this.setSoundEnabled(e.target.checked);
            });
        }

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider) {
            volumeSlider.value = this.settings.volume;
            if (volumeValue) volumeValue.textContent = `${this.settings.volume}%`;

            volumeSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                this.setVolume(vol);
                if (volumeValue) volumeValue.textContent = `${vol}%`;
            });
        }

        // Fullscreen
        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) {
            btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
        }

        // Log panel enabled/disabled
        const logPanelEnabled = document.getElementById('log-panel-enabled');
        if (logPanelEnabled) {
            logPanelEnabled.checked = this.settings.logPanelEnabled;
            logPanelEnabled.addEventListener('change', (e) => {
                this.setLogPanelEnabled(e.target.checked);
            });
        }

        // Undo enabled/disabled
        const undoEnabled = document.getElementById('undo-enabled');
        if (undoEnabled) {
            // Carregar estado atual do game se existir
            const currentUndoSetting = this.settings.undoEnabled || false;
            undoEnabled.checked = currentUndoSetting;
            undoEnabled.addEventListener('change', (e) => {
                this.setUndoEnabled(e.target.checked);
            });
        }

        // Reiniciar partida via settings
        const btnSettingsRestart = document.getElementById('btn-settings-restart');
        if (btnSettingsRestart) {
            btnSettingsRestart.addEventListener('click', () => {
                // Não permitir durante exploração pós-jogo
                if (window.game?.viewingBattlefield) return;

                if (confirm('Reiniciar a partida com os mesmos decks?')) {
                    this.closeModal();
                    this.restartGame();
                }
            });
        }

        // Conceder via settings
        const btnSettingsConcede = document.getElementById('btn-settings-concede');
        if (btnSettingsConcede) {
            btnSettingsConcede.addEventListener('click', () => {
                // Não permitir durante exploração pós-jogo
                if (window.game?.viewingBattlefield) return;

                this.closeModal();
                // Usar o sistema de conceder existente
                const concedeModal = document.getElementById('concede-modal');
                if (concedeModal) {
                    concedeModal.classList.remove('hidden');
                }
            });
        }

        // Fechar modal clicando fora
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Atualizar botão fullscreen quando estado muda
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });
    }

    isInputFocused() {
        const active = document.activeElement;
        return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
    }

    isOpen() {
        return this.modal && !this.modal.classList.contains('hidden');
    }

    toggleModal() {
        if (this.isOpen()) {
            this.closeModal();
        } else {
            this.openModal();
        }
    }

    openModal() {
        if (!this.modal) return;

        // Atualizar info da partida
        this.updateMatchInfo();

        // Sincronizar UI com settings atuais
        this.syncUI();

        // Desabilitar reiniciar e conceder se estiver no modo de exploração pós-jogo
        const isViewingBattlefield = window.game?.viewingBattlefield === true;

        const btnRestart = document.getElementById('btn-settings-restart');
        if (btnRestart) {
            btnRestart.disabled = isViewingBattlefield;
            btnRestart.style.opacity = isViewingBattlefield ? '0.5' : '1';
            btnRestart.style.cursor = isViewingBattlefield ? 'not-allowed' : 'pointer';
            btnRestart.title = isViewingBattlefield ? 'Não disponível durante exploração do battlefield' : '';
        }

        const btnConcede = document.getElementById('btn-settings-concede');
        if (btnConcede) {
            btnConcede.disabled = isViewingBattlefield;
            btnConcede.style.opacity = isViewingBattlefield ? '0.5' : '1';
            btnConcede.style.cursor = isViewingBattlefield ? 'not-allowed' : 'pointer';
            btnConcede.title = isViewingBattlefield ? 'Não disponível durante exploração do battlefield' : '';
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        if (!this.modal) return;
        this.modal.classList.add('hidden');
    }

    syncUI() {
        // Sincronizar tema selecionado
        const themeInput = document.querySelector(`input[name="theme"][value="${this.settings.theme}"]`);
        if (themeInput) themeInput.checked = true;

        // Sincronizar som
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) soundEnabled.checked = this.settings.soundEnabled;

        // Sincronizar volume
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        if (volumeSlider) {
            volumeSlider.value = this.settings.volume;
            if (volumeValue) volumeValue.textContent = `${this.settings.volume}%`;
        }

        // Sincronizar undo
        const undoEnabled = document.getElementById('undo-enabled');
        if (undoEnabled) {
            undoEnabled.checked = this.settings.undoEnabled || false;
        }
    }

    // === Log Panel ===
    setLogPanelEnabled(enabled) {
        this.settings.logPanelEnabled = enabled;
        this.saveSettings();
        this.applyLogPanelSetting();
    }

    applyLogPanelSetting() {
        const logPanel = document.getElementById('log-panel');
        const gameContainer = document.getElementById('game-container');
        const btnShowLog = document.getElementById('btn-show-log');

        if (!logPanel || !gameContainer) return;

        if (this.settings.logPanelEnabled) {
            // Mostrar log panel
            logPanel.classList.remove('collapsed');
            gameContainer.classList.remove('log-collapsed');
            if (btnShowLog) btnShowLog.classList.add('hidden');
        } else {
            // Esconder log panel
            logPanel.classList.add('collapsed');
            gameContainer.classList.add('log-collapsed');
            if (btnShowLog) btnShowLog.classList.remove('hidden');
        }
    }

    // === Undo ===
    setUndoEnabled(enabled) {
        this.settings.undoEnabled = enabled;
        this.saveSettings();

        // Atualizar o GameState se o jogo estiver em andamento
        if (window.game) {
            window.game.saveUndoSetting(enabled);
        }
    }

    updateMatchInfo() {
        const turnInfo = document.getElementById('settings-turn-info');
        const phaseInfo = document.getElementById('settings-phase-info');

        if (window.game) {
            if (turnInfo) turnInfo.textContent = `Turno: ${window.game.turnNumber || '-'}`;
            if (phaseInfo) phaseInfo.textContent = `Fase: ${window.game.phase || '-'}`;
        }
    }

    // === Temas ===
    setTheme(theme) {
        this.settings.theme = theme;
        this.applyTheme(theme);
        this.saveSettings();
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const body = document.body;
        const gameContainer = document.getElementById('game-container');

        // Remover classes de tema anteriores
        body.classList.remove('theme-default', 'theme-clean', 'theme-dark');
        if (gameContainer) {
            gameContainer.classList.remove('theme-default', 'theme-clean', 'theme-dark');
        }

        // Aplicar novo tema
        body.classList.add(`theme-${theme}`);
        if (gameContainer) {
            gameContainer.classList.add(`theme-${theme}`);
        }

        // Aplicar variáveis CSS por tema
        switch (theme) {
            case 'clean':
                root.style.setProperty('--bg-primary', '#c8c8c8');
                root.style.setProperty('--bg-secondary', '#e0e0e0');
                root.style.setProperty('--bg-battlefield', '#d4d4d4');
                root.style.setProperty('--text-primary', '#1a1a1a');
                root.style.setProperty('--text-secondary', '#4a4a4a');
                root.style.setProperty('--accent-color', '#cc0000');
                root.style.setProperty('--card-border', '#888888');
                root.style.setProperty('--divider-color', '#cc0000');
                break;
            case 'dark':
                root.style.setProperty('--bg-primary', '#0a0a0a');
                root.style.setProperty('--bg-secondary', '#1a1a1a');
                root.style.setProperty('--bg-battlefield', '#0f0f0f');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#cccccc');
                root.style.setProperty('--accent-color', '#ffcc00');
                root.style.setProperty('--card-border', '#444444');
                root.style.setProperty('--divider-color', '#ffcc00');
                break;
            default: // default purple theme
                root.style.setProperty('--bg-primary', '#1a0a1f');
                root.style.setProperty('--bg-secondary', '#2d1b3d');
                root.style.setProperty('--bg-battlefield', '#1a0a1f');
                root.style.setProperty('--text-primary', '#ffffff');
                root.style.setProperty('--text-secondary', '#b8a8c8');
                root.style.setProperty('--accent-color', '#b432a8');
                root.style.setProperty('--card-border', '#6a4a7a');
                root.style.setProperty('--divider-color', '#b432a8');
                break;
        }
    }

    // === Som ===
    setSoundEnabled(enabled) {
        this.settings.soundEnabled = enabled;
        this.applySoundSettings();
        this.saveSettings();
    }

    setVolume(volume) {
        this.settings.volume = volume;
        this.applySoundSettings();
        this.saveSettings();
    }

    applySoundSettings() {
        if (window.soundManager) {
            if (this.settings.soundEnabled) {
                window.soundManager.unmute();
            } else {
                window.soundManager.mute();
            }
            window.soundManager.setVolume(this.settings.volume / 100);
        }
    }

    // === Fullscreen ===
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Erro ao entrar em tela cheia:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    updateFullscreenButton() {
        const btn = document.getElementById('btn-fullscreen');
        if (btn) {
            const icon = btn.querySelector('.btn-icon');
            const text = btn.querySelector('span:not(.btn-icon)');
            if (document.fullscreenElement) {
                if (icon) icon.textContent = '⛶';
                if (text) text.textContent = 'Sair da Tela Cheia';
            } else {
                if (icon) icon.textContent = '⛶';
                if (text) text.textContent = 'Tela Cheia';
            }
        }
    }

    // === Reiniciar Partida ===
    restartGame() {
        if (!window.game) return;

        // Salvar configurações atuais da partida
        const currentConfig = {
            playerDecks: window.game.playerDeckKeys,
            aiDecks: window.game.aiDeckKeys,
            startingLife: window.game.startingLife || 20,
            playerName: window.game.player?.name || 'Você',
            playerAvatar: window.game.playerAvatar,
            playerFirst: window.game.playerFirst
        };

        // Verificar se temos os decks salvos
        if (!currentConfig.playerDecks || !currentConfig.aiDecks) {
            console.error('Não foi possível reiniciar: dados da partida não encontrados');
            return;
        }

        // Reiniciar o jogo com as mesmas configurações
        window.game.startGame(
            currentConfig.playerDecks,
            currentConfig.aiDecks,
            {
                startingLife: currentConfig.startingLife,
                playerName: currentConfig.playerName,
                playerAvatar: currentConfig.playerAvatar,
                playerFirst: currentConfig.playerFirst
            }
        );
    }
}

// Instância global
window.settingsManager = new SettingsManager();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager.init();
});
