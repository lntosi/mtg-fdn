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
            ajani: 'Ajani Goldmane',
            garruk: 'Garruk Wildspeaker',
            elspeth: 'Elspeth, Sun\'s Champion',
            sorin: 'Sorin Markov',
            teferi: 'Teferi, Hero of Dominaria'
        };
    }

    // Busca a URL da imagem de uma carta pelo nome
    async getCardImageUrl(cardName, size = 'normal') {
        // Verificar se é uma basic land (usar URLs fixas do Foundations)
        const basicLandUrl = this.getBasicLandUrl(cardName, size);
        if (basicLandUrl) {
            return basicLandUrl;
        }

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

            // Primeiro: tentar buscar versão de Foundations (FDN)
            let response = await fetch(
                `${this.baseUrl}?exact=${encodeURIComponent(searchName)}&set=fdn`,
                { headers: { 'Accept': 'application/json' } }
            );

            // Se não encontrou em FDN, tentar Jumpstart Foundations (J25)
            if (!response.ok) {
                await this.delay(this.requestDelay);
                response = await fetch(
                    `${this.baseUrl}?exact=${encodeURIComponent(searchName)}&set=j25`,
                    { headers: { 'Accept': 'application/json' } }
                );
            }

            // Fallback: busca fuzzy (qualquer set)
            if (!response.ok) {
                await this.delay(this.requestDelay);
                response = await fetch(
                    `${this.baseUrl}?fuzzy=${encodeURIComponent(searchName)}`,
                    { headers: { 'Accept': 'application/json' } }
                );
            }

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
            .trim();

        // Mapeamento de cartas com nomes customizados para cartas reais do Scryfall
        const cardNameMapping = {
            'Volley': 'Tears of Valakut', // Carta customizada -> carta vermelha que causa dano a flying
        };

        return cardNameMapping[normalized] || normalized;
    }

    // URLs fixas para basic lands do Foundations (evita puxar de outros sets como Avatar TLA)
    getBasicLandUrl(cardName, size = 'normal') {
        // Normalizar nome (remover sufixos como _1, _2)
        const normalizedName = cardName.replace(/_\d+$/, '').trim();

        const basicLandUrls = {
            'Plains': {
                normal: 'https://cards.scryfall.io/normal/front/4/e/4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3.jpg?1730489617',
                art_crop: 'https://cards.scryfall.io/art_crop/front/4/e/4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3.jpg?1730489617'
            },
            'Island': {
                normal: 'https://cards.scryfall.io/normal/front/1/7/17e2b637-72b1-4457-aaba-66d51107be4c.jpg?1730489625',
                art_crop: 'https://cards.scryfall.io/art_crop/front/1/7/17e2b637-72b1-4457-aaba-66d51107be4c.jpg?1730489625'
            },
            'Swamp': {
                normal: 'https://cards.scryfall.io/normal/front/3/1/319bc1f0-ee42-44e5-b08b-735613ded2ba.jpg?1730489632',
                art_crop: 'https://cards.scryfall.io/art_crop/front/3/1/319bc1f0-ee42-44e5-b08b-735613ded2ba.jpg?1730489632'
            },
            'Mountain': {
                normal: 'https://cards.scryfall.io/normal/front/2/7/279df7e2-2a3b-464a-a7df-e91da28e3a8c.jpg?1730489639',
                art_crop: 'https://cards.scryfall.io/art_crop/front/2/7/279df7e2-2a3b-464a-a7df-e91da28e3a8c.jpg?1730489639'
            },
            'Forest': {
                normal: 'https://cards.scryfall.io/normal/front/d/2/d232fcc2-12f6-401a-b1aa-ddff11cb9378.jpg?1730489646',
                art_crop: 'https://cards.scryfall.io/art_crop/front/d/2/d232fcc2-12f6-401a-b1aa-ddff11cb9378.jpg?1730489646'
            }
        };

        if (basicLandUrls[normalizedName]) {
            return basicLandUrls[normalizedName][size] || basicLandUrls[normalizedName].normal;
        }
        return null;
    }

    // Verifica se o nome é de um token
    isToken(cardName) {
        return cardName.toLowerCase().includes('token');
    }

    // Busca imagem de token usando a API de busca do Scryfall
    async getTokenImageUrl(tokenName, size = 'normal') {
        const cacheKey = `token_${tokenName}_${size}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        const loadPromise = this.fetchTokenImage(tokenName, size);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const url = await loadPromise;
            this.cache.set(cacheKey, url);
            return url;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    async fetchTokenImage(tokenName, size) {
        // Respeitar rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < this.requestDelay) {
            await this.delay(this.requestDelay - timeSinceLastRequest);
        }
        this.lastRequest = Date.now();

        try {
            // Extrair o tipo do token (ex: "Goblin Token" -> "Goblin")
            const tokenType = tokenName.replace(/ Token$/i, '').trim();

            // Tentar primeiro no set tfdn (Foundations tokens) para consistência visual
            const fdnResponse = await fetch(
                `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(tokenType)}&set=tfdn`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (fdnResponse.ok) {
                const fdnData = await fdnResponse.json();
                if (fdnData.image_uris && fdnData.image_uris[size]) {
                    return fdnData.image_uris[size];
                }
                if (fdnData.card_faces && fdnData.card_faces[0].image_uris) {
                    return fdnData.card_faces[0].image_uris[size];
                }
            }

            // Fallback: busca genérica por tokens
            await this.delay(this.requestDelay);
            this.lastRequest = Date.now();

            const searchQuery = encodeURIComponent(`${tokenType} t:token`);
            const response = await fetch(
                `https://api.scryfall.com/cards/search?q=${searchQuery}&order=released&dir=desc`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!response.ok) {
                console.log(`Token não encontrado para: ${tokenName}`);
                return null;
            }

            const data = await response.json();

            // Procurar o token mais apropriado (preferir 1/1 simples)
            if (data.data && data.data.length > 0) {
                const basicToken = data.data.find(t =>
                    t.power === '1' && t.toughness === '1' &&
                    (!t.oracle_text || t.oracle_text === '')
                ) || data.data[0];

                if (basicToken.image_uris && basicToken.image_uris[size]) {
                    return basicToken.image_uris[size];
                }

                if (basicToken.card_faces && basicToken.card_faces[0].image_uris) {
                    return basicToken.card_faces[0].image_uris[size];
                }
            }

            return null;
        } catch (error) {
            console.log(`Erro ao buscar token ${tokenName}:`, error);
            return null;
        }
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
