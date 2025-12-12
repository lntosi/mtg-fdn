// === Sistema de Sons ===
// Arquivos de áudio locais em assets/sounds/

class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sounds = {};
        this.loaded = false;

        // Sons do jogo - arquivos locais
        // Formatos suportados: .mp3, .ogg, .wav
        this.soundUrls = {
            cardPlay: 'assets/sounds/card-play.wav',      // Carta jogada na mesa
            cardDraw: 'assets/sounds/card-draw.wav',      // Carta comprada
            attack: 'assets/sounds/attack.wav',           // Atacantes declarados
            block: 'assets/sounds/block.wav',             // Bloqueadores declarados
            damage: 'assets/sounds/damage.wav',           // Dano de combate
            magic: 'assets/sounds/magic.wav',             // Magia conjurada
            turnStart: 'assets/sounds/turn-start.wav',    // Início do turno do jogador
            victory: 'assets/sounds/victory.wav',         // Vitória
            defeat: 'assets/sounds/defeat.wav'            // Derrota
        };

        this.init();
    }

    init() {
        if (Object.keys(this.soundUrls).length === 0) {
            this.loaded = true;
            return;
        }

        // Pré-carregar sons
        for (const [name, url] of Object.entries(this.soundUrls)) {
            this.sounds[name] = new Audio();
            this.sounds[name].src = url;
            this.sounds[name].volume = this.volume;
            this.sounds[name].preload = 'auto';

            // Log de erro se arquivo não encontrado
            this.sounds[name].addEventListener('error', () => {
                console.warn(`Som não encontrado: ${url}`);
            });
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
                if (e.name !== 'NotAllowedError') {
                    console.log('Erro ao tocar som:', e.message);
                }
            });
        } catch (e) {
            console.log('Erro ao tocar som:', e);
        }
    }

    // Sons específicos do jogo
    playCardPlay() { this.play('cardPlay'); }
    playCardDraw() { this.play('cardDraw'); }
    playAttack() { this.play('attack'); }
    playBlock() { this.play('block'); }
    playDamage() { this.play('damage'); }
    playMagic() { this.play('magic'); }
    playTurnStart() { this.play('turnStart'); }
    playVictory() { this.play('victory'); }
    playDefeat() { this.play('defeat'); }

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
