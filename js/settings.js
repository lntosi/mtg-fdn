// === Sistema de Configurações ===

class SettingsManager {
    constructor() {
        this.defaults = {
            soundEnabled: true,
            sfxVolume: 50,          // Volume dos efeitos sonoros
            musicVolume: 30,        // Volume da música de fundo
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

        // Som enabled/disabled
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) {
            soundEnabled.checked = this.settings.soundEnabled;
            soundEnabled.addEventListener('change', (e) => {
                this.setSoundEnabled(e.target.checked);
            });
        }

        // SFX Volume slider
        const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
        const sfxVolumeValue = document.getElementById('sfx-volume-value');
        if (sfxVolumeSlider) {
            sfxVolumeSlider.value = this.settings.sfxVolume;
            if (sfxVolumeValue) sfxVolumeValue.textContent = `${this.settings.sfxVolume}%`;

            sfxVolumeSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                this.setSfxVolume(vol);
                if (sfxVolumeValue) sfxVolumeValue.textContent = `${vol}%`;
            });
        }

        // Music Volume slider
        const musicVolumeSlider = document.getElementById('music-volume-slider');
        const musicVolumeValue = document.getElementById('music-volume-value');
        if (musicVolumeSlider) {
            musicVolumeSlider.value = this.settings.musicVolume;
            if (musicVolumeValue) musicVolumeValue.textContent = `${this.settings.musicVolume}%`;

            musicVolumeSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                this.setMusicVolume(vol);
                if (musicVolumeValue) musicVolumeValue.textContent = `${vol}%`;
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

        // Exportar log (baixar arquivo)
        const btnExportLog = document.getElementById('btn-export-log');
        if (btnExportLog) {
            btnExportLog.addEventListener('click', () => {
                if (window.logManager) {
                    const filename = window.logManager.download('txt');
                    this.showToast(`Log exportado: ${filename}`);
                }
            });
        }

        // Copiar log para clipboard
        const btnCopyLog = document.getElementById('btn-copy-log');
        if (btnCopyLog) {
            btnCopyLog.addEventListener('click', async () => {
                if (window.logManager) {
                    const success = await window.logManager.copyToClipboard();
                    this.showToast(success ? 'Log copiado!' : 'Erro ao copiar');
                }
            });
        }

        // Priority Stops - Seu turno
        this.bindPriorityStop('stop-upkeep', 'upkeep', false);
        this.bindPriorityStop('stop-begin-combat', 'beginCombat', false);
        this.bindPriorityStop('stop-after-attackers', 'afterAttackers', false);
        this.bindPriorityStop('stop-after-blockers', 'afterBlockers', false);
        this.bindPriorityStop('stop-end-step', 'endStep', false);

        // Priority Stops - Turno do oponente
        this.bindPriorityStop('stop-opp-upkeep', 'upkeep', true);
        this.bindPriorityStop('stop-opp-begin-combat', 'beginCombat', true);
        this.bindPriorityStop('stop-opp-after-attackers', 'afterAttackers', true);
        this.bindPriorityStop('stop-opp-after-blockers', 'afterBlockers', true);
        this.bindPriorityStop('stop-opp-end-step', 'endStep', true);
    }

    /**
     * Vincula um checkbox de priority stop ao estado do jogo
     * @param {string} elementId - ID do checkbox
     * @param {string} stopType - Tipo de stop (upkeep, beginCombat, etc.)
     * @param {boolean} isOpponentTurn - Se é para o turno do oponente
     */
    bindPriorityStop(elementId, stopType, isOpponentTurn) {
        const checkbox = document.getElementById(elementId);
        if (!checkbox) return;

        // Sincronizar com estado atual do jogo
        if (window.game?.priorityStops) {
            if (isOpponentTurn) {
                checkbox.checked = window.game.priorityStops.opponentTurn?.[stopType] || false;
            } else {
                checkbox.checked = window.game.priorityStops[stopType] || false;
            }
        }

        checkbox.addEventListener('change', (e) => {
            if (!window.game) return;

            if (isOpponentTurn) {
                if (!window.game.priorityStops.opponentTurn) {
                    window.game.priorityStops.opponentTurn = {};
                }
                window.game.priorityStops.opponentTurn[stopType] = e.target.checked;
            } else {
                window.game.priorityStops[stopType] = e.target.checked;
            }

            window.game.savePriorityStops();
        });
    }

    /**
     * Mostra um toast de feedback
     */
    showToast(message, duration = 2000) {
        // Remover toast existente
        const existing = document.querySelector('.settings-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'settings-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animar entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remover após duração
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
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
        // Sincronizar som
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) soundEnabled.checked = this.settings.soundEnabled;

        // Sincronizar volume SFX
        const sfxVolumeSlider = document.getElementById('sfx-volume-slider');
        const sfxVolumeValue = document.getElementById('sfx-volume-value');
        if (sfxVolumeSlider) {
            sfxVolumeSlider.value = this.settings.sfxVolume;
            if (sfxVolumeValue) sfxVolumeValue.textContent = `${this.settings.sfxVolume}%`;
        }

        // Sincronizar volume Music
        const musicVolumeSlider = document.getElementById('music-volume-slider');
        const musicVolumeValue = document.getElementById('music-volume-value');
        if (musicVolumeSlider) {
            musicVolumeSlider.value = this.settings.musicVolume;
            if (musicVolumeValue) musicVolumeValue.textContent = `${this.settings.musicVolume}%`;
        }

        // Sincronizar undo
        const undoEnabled = document.getElementById('undo-enabled');
        if (undoEnabled) {
            undoEnabled.checked = this.settings.undoEnabled || false;
        }

        // Sincronizar priority stops
        this.syncPriorityStops();
    }

    /**
     * Sincroniza os checkboxes de priority stops com o estado do jogo
     */
    syncPriorityStops() {
        if (!window.game?.priorityStops) return;

        const stops = window.game.priorityStops;

        // Seu turno
        this.setCheckbox('stop-upkeep', stops.upkeep);
        this.setCheckbox('stop-begin-combat', stops.beginCombat);
        this.setCheckbox('stop-after-attackers', stops.afterAttackers);
        this.setCheckbox('stop-after-blockers', stops.afterBlockers);
        this.setCheckbox('stop-end-step', stops.endStep);

        // Turno do oponente
        const oppStops = stops.opponentTurn || {};
        this.setCheckbox('stop-opp-upkeep', oppStops.upkeep);
        this.setCheckbox('stop-opp-begin-combat', oppStops.beginCombat);
        this.setCheckbox('stop-opp-after-attackers', oppStops.afterAttackers);
        this.setCheckbox('stop-opp-after-blockers', oppStops.afterBlockers);
        this.setCheckbox('stop-opp-end-step', oppStops.endStep);
    }

    /**
     * Helper para definir estado de um checkbox
     */
    setCheckbox(elementId, checked) {
        const el = document.getElementById(elementId);
        if (el) el.checked = checked || false;
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

    // === Som ===
    setSoundEnabled(enabled) {
        this.settings.soundEnabled = enabled;
        this.applySoundSettings();
        this.saveSettings();
    }

    setSfxVolume(volume) {
        this.settings.sfxVolume = volume;
        if (window.soundManager) {
            window.soundManager.setSfxVolume(volume / 100);
        }
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.settings.musicVolume = volume;
        if (window.soundManager) {
            window.soundManager.setMusicVolume(volume / 100);
        }
        this.saveSettings();
    }

    applySoundSettings() {
        if (window.soundManager) {
            if (this.settings.soundEnabled) {
                window.soundManager.unmute();
            } else {
                window.soundManager.mute();
            }
            window.soundManager.setSfxVolume(this.settings.sfxVolume / 100);
            window.soundManager.setMusicVolume(this.settings.musicVolume / 100);
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
