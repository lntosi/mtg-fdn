// === Sistema de Imagens via Scryfall ===

class ImageManager {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.baseUrl = 'https://api.scryfall.com/cards/named';
        this.requestDelay = 100; // 100ms entre requisições (respeitar rate limit)
        this.lastRequest = 0;

        // Mapeamento de avatares para cartas de planeswalker no Scryfall
        // Usando versões com artes mais focadas no rosto/busto (headshot)
        this.avatarCards = {
            jace: 'Jace Beleren',
            chandra: 'Chandra Nalaar',
            liliana: 'Liliana, Dreadhorde General',
            gideon: 'Gideon Blackblade',
            nissa: 'Nissa Revane',
            ajani: 'Ajani Goldmane'
        };
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
        let normalized = name
            .replace(/_\d+$/, '')
            .replace(/ Token$/, '')
            .trim();

        // Mapeamento de cartas com nomes customizados para cartas reais do Scryfall
        const cardNameMapping = {
            'Volley': 'Tears of Valakut', // Carta customizada -> carta vermelha que causa dano a flying
        };

        return cardNameMapping[normalized] || normalized;
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

    // Busca a URL da imagem de avatar (art_crop) de um planeswalker
    async getAvatarImageUrl(avatarId) {
        const cardName = this.avatarCards[avatarId];
        if (!cardName) return null;

        const cacheKey = `avatar_${avatarId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        const loadPromise = this.fetchAvatarImage(cardName);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const url = await loadPromise;
            this.cache.set(cacheKey, url);
            return url;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    async fetchAvatarImage(cardName) {
        // Respeitar rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < this.requestDelay) {
            await this.delay(this.requestDelay - timeSinceLastRequest);
        }
        this.lastRequest = Date.now();

        try {
            const response = await fetch(
                `${this.baseUrl}?fuzzy=${encodeURIComponent(cardName)}`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                console.log(`Avatar não encontrado para: ${cardName}`);
                return null;
            }

            const data = await response.json();

            // Usar art_crop para avatar (mostra apenas a arte, sem bordas)
            if (data.image_uris && data.image_uris.art_crop) {
                return data.image_uris.art_crop;
            }

            // Fallback para cartas de duas faces
            if (data.card_faces && data.card_faces[0].image_uris) {
                return data.card_faces[0].image_uris.art_crop;
            }

            return null;
        } catch (error) {
            console.log(`Erro ao buscar avatar de ${cardName}:`, error);
            return null;
        }
    }

    // Pré-carregar todas as imagens de avatares
    async preloadAvatars() {
        const avatarIds = Object.keys(this.avatarCards);
        const promises = avatarIds.map(id => this.getAvatarImageUrl(id));
        await Promise.allSettled(promises);
    }
}

// Instância global
window.imageManager = new ImageManager();
