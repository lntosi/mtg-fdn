// === Inicialização do Jogo ===

document.addEventListener('DOMContentLoaded', () => {
    console.log('MTG Jumpstart - Foundations');
    console.log('Inicializando jogo...');

    // Criar instância do jogo
    const game = new GameState();
    game.init();

    // Disponibilizar globalmente para debug
    window.game = game;

    console.log('Jogo pronto! Selecione seus decks para começar.');
});
