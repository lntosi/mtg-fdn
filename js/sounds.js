// === Sistema de Sons ===
// Arquivos de áudio locais em assets/sounds/

class SoundManager {
    constructor() {
        this.enabled = true;
        this.sfxVolume = 0.5;      // Volume dos efeitos sonoros
        this.musicVolume = 0.3;    // Volume da música de fundo
        this.sounds = {};

        // Sistema de crossfade para música (dois players alternados)
        this.musicPlayers = [null, null];
        this.activePlayer = 0;     // Índice do player ativo (0 ou 1)
        this.crossfadeTime = 2.0;  // Segundos de crossfade
        this.crossfadeInterval = null;

        this.musicPlaying = false;
        this.loaded = false;
        this.pendingMusicPlay = false;          // Aguardando interação para tocar
        this.interactionListenerAdded = false;  // Listener de interação já adicionado

        // Sons do jogo - arquivos locais (OGG para menor tamanho)
        this.soundUrls = {
            cardPlay: 'assets/sounds/card-play.ogg',      // Carta jogada / magia conjurada
            attack: 'assets/sounds/attack.ogg',           // Combate resolvido
            damage: 'assets/sounds/damage.ogg',           // Dano ao jogador
            turnStart: 'assets/sounds/turn-start.ogg',    // Início do turno do jogador
            victory: 'assets/sounds/victory.ogg',         // Vitória
            defeat: 'assets/sounds/defeat.ogg'            // Derrota
        };

        // Faixas de música disponíveis
        this.musicTracks = {
            heroic: { url: 'assets/sounds/heroic-suspenseful.ogg', label: 'Heroica' },
            cave: { url: 'assets/sounds/Ambience_Cave_00.ogg', label: 'Caverna' }
        };
        this.currentTrack = 'heroic'; // Faixa padrão
        this.musicUrl = this.musicTracks[this.currentTrack].url;

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

        // Criar dois players de música para crossfade seamless
        for (let i = 0; i < 2; i++) {
            this.musicPlayers[i] = new Audio();
            this.musicPlayers[i].src = this.musicUrl;
            this.musicPlayers[i].volume = 0;
            this.musicPlayers[i].preload = 'auto';
            this.musicPlayers[i].addEventListener('error', () => {
                console.warn(`Música não encontrada: ${this.musicUrl}`);
            });
        }

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
    playCardDraw() { /* removido */ }
    playAttack() { this.play('attack'); }
    playBlock() { /* removido - sem som de bloqueio */ }
    playDamage() { this.play('damage'); }
    playMagic() { this.play('cardPlay'); }        // Usa mesmo som de cardPlay
    playTurnStart() { this.play('turnStart'); }
    playVictory() { this.play('victory'); }
    playDefeat() { this.play('defeat'); }

    // === MÚSICA DE FUNDO (Sistema de Crossfade) ===

    playMusic() {
        if (!this.enabled || this.musicPlaying || this.currentTrack === 'none') return;

        const player = this.musicPlayers[this.activePlayer];
        if (!player) return;

        player.currentTime = 0;
        player.volume = this.musicVolume;

        player.play().then(() => {
            this.musicPlaying = true;
            this.pendingMusicPlay = false;
            this._setupCrossfadeLoop();
        }).catch(e => {
            if (e.name === 'NotAllowedError') {
                // Navegador bloqueou autoplay - aguardar interação do usuário
                this.pendingMusicPlay = true;
                this.setupInteractionListener();
            } else {
                console.log('Erro ao tocar música:', e.message);
            }
        });
    }

    /**
     * Configura o loop de crossfade - monitora o player ativo e inicia
     * o crossfade quando está próximo do fim
     */
    _setupCrossfadeLoop() {
        // Limpar interval anterior se existir
        if (this.crossfadeInterval) {
            clearInterval(this.crossfadeInterval);
        }

        this.crossfadeInterval = setInterval(() => {
            if (!this.musicPlaying) return;

            const currentPlayer = this.musicPlayers[this.activePlayer];
            if (!currentPlayer) return;

            const timeRemaining = currentPlayer.duration - currentPlayer.currentTime;

            // Iniciar crossfade quando faltar crossfadeTime segundos
            if (timeRemaining <= this.crossfadeTime && timeRemaining > 0) {
                this._startCrossfade();
            }
        }, 100); // Verificar a cada 100ms
    }

    /**
     * Inicia o crossfade entre os dois players
     */
    _startCrossfade() {
        const fadingOut = this.activePlayer;
        const fadingIn = 1 - this.activePlayer;

        const outPlayer = this.musicPlayers[fadingOut];
        const inPlayer = this.musicPlayers[fadingIn];

        if (!outPlayer || !inPlayer) return;

        // Preparar o próximo player
        inPlayer.currentTime = 0;
        inPlayer.volume = 0;

        // Iniciar o próximo player
        inPlayer.play().catch(() => {});

        // Trocar o player ativo
        this.activePlayer = fadingIn;

        // Executar o crossfade gradual
        const fadeSteps = 20;
        const fadeInterval = (this.crossfadeTime * 1000) / fadeSteps;
        let step = 0;

        const fadeTimer = setInterval(() => {
            step++;
            const progress = step / fadeSteps;

            // Fade out do player atual
            outPlayer.volume = Math.max(0, this.musicVolume * (1 - progress));

            // Fade in do próximo player
            inPlayer.volume = Math.min(this.musicVolume, this.musicVolume * progress);

            if (step >= fadeSteps) {
                clearInterval(fadeTimer);
                // Parar completamente o player que terminou o fade out
                outPlayer.pause();
                outPlayer.currentTime = 0;
                outPlayer.volume = 0;
                // Garantir volume final correto
                inPlayer.volume = this.musicVolume;
            }
        }, fadeInterval);
    }

    setupInteractionListener() {
        if (this.interactionListenerAdded) return;
        this.interactionListenerAdded = true;

        const startMusicOnInteraction = () => {
            if (this.pendingMusicPlay && this.enabled && !this.musicPlaying) {
                this.playMusic();
            }
            // Remover listeners após primeira interação
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
            this.interactionListenerAdded = false;
        };

        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('keydown', startMusicOnInteraction, { once: true });
        document.addEventListener('touchstart', startMusicOnInteraction, { once: true });
    }

    stopMusic() {
        // Limpar interval de crossfade
        if (this.crossfadeInterval) {
            clearInterval(this.crossfadeInterval);
            this.crossfadeInterval = null;
        }

        // Parar ambos os players
        this.musicPlayers.forEach(player => {
            if (player) {
                player.pause();
                player.currentTime = 0;
                player.volume = 0;
            }
        });

        this.musicPlaying = false;
        this.activePlayer = 0;
    }

    pauseMusic() {
        if (!this.musicPlaying) return;

        // Pausar o player ativo
        const player = this.musicPlayers[this.activePlayer];
        if (player) {
            player.pause();
        }

        // Limpar interval de crossfade
        if (this.crossfadeInterval) {
            clearInterval(this.crossfadeInterval);
            this.crossfadeInterval = null;
        }

        this.musicPlaying = false;
    }

    resumeMusic() {
        if (this.musicPlaying || !this.enabled) return;

        const player = this.musicPlayers[this.activePlayer];
        if (player) {
            player.play().then(() => {
                this.musicPlaying = true;
                this._setupCrossfadeLoop();
            }).catch(() => {});
        }
    }

    // === SELEÇÃO DE FAIXA ===

    /**
     * Troca a faixa de música. 'none' para desativar música.
     * @param {string} trackId - ID da faixa ('heroic', 'cave', 'none')
     */
    setMusicTrack(trackId) {
        if (trackId === 'none') {
            this.currentTrack = 'none';
            this.stopMusic();
            return;
        }

        const track = this.musicTracks[trackId];
        if (!track) return;

        const wasPlaying = this.musicPlaying;
        this.stopMusic();

        this.currentTrack = trackId;
        this.musicUrl = track.url;

        // Recarregar players com nova URL
        for (let i = 0; i < 2; i++) {
            this.musicPlayers[i].src = this.musicUrl;
            this.musicPlayers[i].load();
        }

        // Retomar se estava tocando
        if (wasPlaying) {
            this.playMusic();
        }
    }

    getMusicTrack() {
        return this.currentTrack;
    }

    getMusicTracks() {
        return this.musicTracks;
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
        // Atualizar volume do player ativo
        const activePlayer = this.musicPlayers[this.activePlayer];
        if (activePlayer && this.musicPlaying) {
            activePlayer.volume = this.musicVolume;
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
