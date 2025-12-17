// === Sistema de Sons ===
// Arquivos de áudio locais em assets/sounds/

class SoundManager {
    constructor() {
        this.enabled = true;
        this.sfxVolume = 0.5;      // Volume dos efeitos sonoros
        this.musicVolume = 0.3;    // Volume da música de fundo
        this.sounds = {};
        this.music = null;
        this.musicPlaying = false;
        this.loaded = false;

        // Sons do jogo - arquivos locais (OGG para menor tamanho)
        this.soundUrls = {
            cardPlay: 'assets/sounds/card-play.ogg',      // Carta jogada / magia conjurada
            cardDraw: 'assets/sounds/card-draw.ogg',      // Carta comprada
            damage: 'assets/sounds/damage.ogg',           // Som de combate (ataque/bloqueio/dano)
            turnStart: 'assets/sounds/turn-start.ogg',    // Início do turno do jogador
            victory: 'assets/sounds/victory.ogg',         // Vitória
            defeat: 'assets/sounds/defeat.ogg'            // Derrota
        };

        // Música de fundo
        this.musicUrl = 'assets/sounds/Ambience_Cave_00.ogg';

        this.init();
    }

    init() {
        // Pré-carregar efeitos sonoros
        for (const [name, url] of Object.entries(this.soundUrls)) {
            this.sounds[name] = new Audio();
            this.sounds[name].src = url;
            this.sounds[name].volume = this.sfxVolume;
            this.sounds[name].preload = 'auto';

            // Log de erro se arquivo não encontrado
            this.sounds[name].addEventListener('error', () => {
                console.warn(`Som não encontrado: ${url}`);
            });
        }

        // Carregar música de fundo
        this.music = new Audio();
        this.music.src = this.musicUrl;
        this.music.volume = this.musicVolume;
        this.music.loop = true;
        this.music.preload = 'auto';
        this.music.addEventListener('error', () => {
            console.warn(`Música não encontrada: ${this.musicUrl}`);
        });

        this.loaded = true;
    }

    // === EFEITOS SONOROS ===

    play(soundName, delay = 0) {
        if (!this.enabled || !this.sounds[soundName]) return;

        const playSound = () => {
            try {
                // Clonar o áudio para permitir sobreposição
                const sound = this.sounds[soundName].cloneNode();
                sound.volume = this.sfxVolume;
                sound.play().catch(e => {
                    // Silenciar erros de autoplay bloqueado
                    if (e.name !== 'NotAllowedError') {
                        console.log('Erro ao tocar som:', e.message);
                    }
                });
            } catch (e) {
                console.log('Erro ao tocar som:', e);
            }
        };

        if (delay > 0) {
            setTimeout(playSound, delay);
        } else {
            playSound();
        }
    }

    // Sons específicos do jogo
    playCardPlay() { this.play('cardPlay'); }
    playCardDraw() { this.play('cardDraw'); }
    playAttack() { this.play('damage'); }
    playBlock() { this.play('damage', 400); }     // Delay após attack
    playDamage() { this.play('damage', 600); }    // Delay após attack/block
    playMagic() { this.play('cardPlay'); }        // Usa mesmo som de cardPlay
    playTurnStart() { this.play('turnStart'); }
    playVictory() { this.play('victory'); }
    playDefeat() { this.play('defeat'); }

    // === MÚSICA DE FUNDO ===

    playMusic() {
        if (!this.enabled || !this.music || this.musicPlaying) return;

        this.music.volume = this.musicVolume;
        this.music.play().then(() => {
            this.musicPlaying = true;
        }).catch(e => {
            if (e.name !== 'NotAllowedError') {
                console.log('Erro ao tocar música:', e.message);
            }
        });
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
            this.musicPlaying = false;
        }
    }

    pauseMusic() {
        if (this.music && this.musicPlaying) {
            this.music.pause();
            this.musicPlaying = false;
        }
    }

    resumeMusic() {
        if (this.music && !this.musicPlaying && this.enabled) {
            this.music.play().then(() => {
                this.musicPlaying = true;
            }).catch(() => {});
        }
    }

    // === CONTROLE DE VOLUME ===

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        for (const sound of Object.values(this.sounds)) {
            sound.volume = this.sfxVolume;
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }

    // Retrocompatibilidade - define ambos os volumes
    setVolume(vol) {
        this.setSfxVolume(vol);
        this.setMusicVolume(vol);
    }

    getSfxVolume() {
        return this.sfxVolume;
    }

    getMusicVolume() {
        return this.musicVolume;
    }

    // === CONTROLE GERAL ===

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.pauseMusic();
        }
        return this.enabled;
    }

    mute() {
        this.enabled = false;
        this.pauseMusic();
    }

    unmute() {
        this.enabled = true;
    }

    isEnabled() {
        return this.enabled;
    }

    isMusicPlaying() {
        return this.musicPlaying;
    }
}

// Instância global
window.soundManager = new SoundManager();
