// === Sistema de Sons ===
// Sons gratuitos do Pixabay/Mixkit

class SoundManager {
    constructor() {
        // Sons desabilitados por padrão (Pixabay bloqueou acesso cross-origin)
        // Para habilitar, adicione arquivos locais em assets/sounds/ e atualize soundUrls
        this.enabled = false;
        this.volume = 0.5;
        this.sounds = {};
        this.loaded = false;

        // URLs de sons - desabilitado temporariamente
        // Para reabilitar: coloque arquivos .mp3 em assets/sounds/ e atualize os caminhos
        this.soundUrls = {
            // cardPlay: 'assets/sounds/card-flip.mp3',
            // cardDraw: 'assets/sounds/card-slide.mp3',
            // attack: 'assets/sounds/swoosh.mp3',
            // damage: 'assets/sounds/hit.mp3',
            // block: 'assets/sounds/shield.mp3',
            // buttonClick: 'assets/sounds/click.mp3',
            // turnStart: 'assets/sounds/notification.mp3',
            // victory: 'assets/sounds/win.mp3',
            // defeat: 'assets/sounds/lose.mp3',
            // magic: 'assets/sounds/magic.mp3'
        };

        this.init();
    }

    init() {
        // Sons desabilitados - não carregar nada
        if (Object.keys(this.soundUrls).length === 0) {
            this.loaded = true;
            return;
        }

        // Pré-carregar sons (quando habilitado)
        for (const [name, url] of Object.entries(this.soundUrls)) {
            this.sounds[name] = new Audio();
            this.sounds[name].src = url;
            this.sounds[name].volume = this.volume;
            this.sounds[name].preload = 'auto';
        }
        this.loaded = true;
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;

        try {
            // Clonar o áudio para permitir sobreposição
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = this.volume;
            sound.play().catch(e => {
                // Silenciar erros de autoplay bloqueado
                console.log('Som bloqueado pelo navegador:', e.message);
            });
        } catch (e) {
            console.log('Erro ao tocar som:', e);
        }
    }

    // Sons específicos do jogo
    playCardPlay() { this.play('cardPlay'); }
    playCardDraw() { this.play('cardDraw'); }
    playAttack() { this.play('attack'); }
    playDamage() { this.play('damage'); }
    playBlock() { this.play('block'); }
    playButtonClick() { this.play('buttonClick'); }
    playTurnStart() { this.play('turnStart'); }
    playVictory() { this.play('victory'); }
    playDefeat() { this.play('defeat'); }
    playMagic() { this.play('magic'); }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.volume;
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    mute() {
        this.enabled = false;
    }

    unmute() {
        this.enabled = true;
    }
}

// Instância global
window.soundManager = new SoundManager();
