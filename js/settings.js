// === Sistema de Configurações ===

class SettingsManager {
    constructor() {
        this.defaults = {
            theme: 'default',
            soundEnabled: true,
            volume: 50
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
        // Tecla M para abrir/fechar configurações
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm' && !this.isInputFocused()) {
                e.preventDefault();
                this.toggleModal();
            }
            // ESC também fecha
            if (e.key === 'Escape' && this.isOpen()) {
                this.closeModal();
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

        // Conceder via settings
        const btnSettingsConcede = document.getElementById('btn-settings-concede');
        if (btnSettingsConcede) {
            btnSettingsConcede.addEventListener('click', () => {
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

        this.modal.classList.remove('hidden');
        window.soundManager?.playButtonClick();
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
        body.classList.remove('theme-default', 'theme-broadcast', 'theme-dark');
        if (gameContainer) {
            gameContainer.classList.remove('theme-default', 'theme-broadcast', 'theme-dark');
        }

        // Aplicar novo tema
        body.classList.add(`theme-${theme}`);
        if (gameContainer) {
            gameContainer.classList.add(`theme-${theme}`);
        }

        // Aplicar variáveis CSS por tema
        switch (theme) {
            case 'broadcast':
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
}

// Instância global
window.settingsManager = new SettingsManager();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager.init();
});
