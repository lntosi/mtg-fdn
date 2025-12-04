// === Sistema de Sons ===
// Sons gratuitos do Pixabay/Mixkit

class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        this.sounds = {};
        this.loaded = false;

        // URLs de sons gratuitos (Pixabay - sem necessidade de atribuição)
        this.soundUrls = {
            // Sons de cartas
            cardPlay: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7a39095a92.mp3', // Card flip
            cardDraw: 'https://cdn.pixabay.com/audio/2022/03/15/audio_8a0e6dc819.mp3', // Card slide

            // Sons de ação
            attack: 'https://cdn.pixabay.com/audio/2022/03/24/audio_d9166af0b4.mp3', // Swoosh
            damage: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3', // Hit
            block: 'https://cdn.pixabay.com/audio/2022/10/30/audio_5ace8ab68f.mp3', // Shield

            // Sons de UI
            buttonClick: 'https://cdn.pixabay.com/audio/2022/03/15/audio_3b6b3e0e8e.mp3', // Click
            turnStart: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3', // Notification

            // Sons de resultado
            victory: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c518b55a13.mp3', // Win fanfare
            defeat: 'https://cdn.pixabay.com/audio/2022/03/15/audio_7625acd24f.mp3', // Lose

            // Ambiente
            magic: 'https://cdn.pixabay.com/audio/2022/03/15/audio_61e02f6c00.mp3' // Magic spell
        };

        this.init();
    }

    init() {
        // Pré-carregar sons
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

// === Sistema de Imagens via Scryfall ===

class ImageManager {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.baseUrl = 'https://api.scryfall.com/cards/named';
        this.requestDelay = 100; // 100ms entre requisições (respeitar rate limit)
        this.lastRequest = 0;
    }

    // Busca a URL da imagem de uma carta pelo nome
    async getCardImageUrl(cardName, size = 'normal') {
        // Verificar cache
        const cacheKey = `${cardName}_${size}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Verificar se já está carregando
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        // Criar promise de carregamento
        const loadPromise = this.fetchCardImage(cardName, size);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const url = await loadPromise;
            this.cache.set(cacheKey, url);
            return url;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    async fetchCardImage(cardName, size) {
        // Respeitar rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < this.requestDelay) {
            await this.delay(this.requestDelay - timeSinceLastRequest);
        }
        this.lastRequest = Date.now();

        try {
            // Normalizar nome da carta para busca
            const searchName = this.normalizeCardName(cardName);

            const response = await fetch(
                `${this.baseUrl}?fuzzy=${encodeURIComponent(searchName)}`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                console.log(`Imagem não encontrada para: ${cardName}`);
                return null;
            }

            const data = await response.json();

            // Retornar URL da imagem no tamanho solicitado
            if (data.image_uris && data.image_uris[size]) {
                return data.image_uris[size];
            }

            // Para cartas de duas faces
            if (data.card_faces && data.card_faces[0].image_uris) {
                return data.card_faces[0].image_uris[size];
            }

            return null;
        } catch (error) {
            console.log(`Erro ao buscar imagem de ${cardName}:`, error);
            return null;
        }
    }

    normalizeCardName(name) {
        // Remover sufixos como "_1", "_2" usados para identificação interna
        return name
            .replace(/_\d+$/, '')
            .replace(/ Token$/, '')
            .trim();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Pré-carregar imagens de um deck
    async preloadDeck(cards) {
        const uniqueNames = [...new Set(cards.map(c => c.name))];
        const promises = uniqueNames.map(name => this.getCardImageUrl(name));
        await Promise.allSettled(promises);
    }
}

// Instâncias globais
window.soundManager = new SoundManager();
window.imageManager = new ImageManager();
