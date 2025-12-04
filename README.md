# MTG Jumpstart Foundations

Um jogo de Magic: The Gathering para navegador, focado em aprendizado e prática contra IA.

![MTG Jumpstart](https://cards.scryfall.io/art_crop/front/6/8/68b90f54-d629-4126-82cc-13b51d6c1c3e.jpg)

## Sobre

Jogo offline de MTG usando os 4 decks Jumpstart do **Foundations Beginner Box**:
- 🐱 **Cats** (Branco) - Criaturas com lifelink e tokens
- 👺 **Goblins** (Vermelho) - Agressivo com haste e dano direto
- 🧛 **Vampires** (Preto) - Dreno de vida e flying
- 🧝 **Elves** (Verde) - Ramp de mana e criaturas grandes

## Como Jogar

1. Abra `index.html` no navegador
2. Selecione 2 decks para formar seu baralho de 40 cartas
3. A IA jogará com os 2 decks restantes
4. Vença reduzindo a vida do oponente a 0!

## Funcionalidades

- ✅ Regras básicas de MTG (fases, combate, mana)
- ✅ Keywords: Flying, Lifelink, Deathtouch, Trample, First Strike, Vigilance, Haste, Reach, Menace
- ✅ Imagens das cartas via Scryfall API
- ✅ Efeitos sonoros
- ✅ Auto-save (persiste ao recarregar página)
- ✅ IA com estratégia básica
- ✅ Sistema de Auras
- ✅ Encantamentos globais com bônus visuais
- ✅ Visualização de cemitério

## Tecnologias

- Vanilla JavaScript (ES6+)
- CSS3 com animações
- HTML5
- Scryfall API (imagens)
- LocalStorage (persistência)

## Estrutura

```
mtg/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos e tema Foundations
├── js/
│   ├── main.js         # Inicialização
│   ├── game.js         # Estado e fluxo do jogo
│   ├── rules.js        # Motor de regras MTG
│   ├── ai.js           # Inteligência artificial
│   ├── ui.js           # Interface e renderização
│   ├── cards.js        # Base de dados das cartas
│   └── sounds.js       # Sons e imagens
├── CLAUDE.md           # Guia para Claude Code
└── ROADMAP.md          # Plano de desenvolvimento
```

## Roadmap

Veja [ROADMAP.md](ROADMAP.md) para o plano completo de desenvolvimento, incluindo:
- Efeitos de cartas pendentes
- Melhorias de UI/UX
- Melhorias de IA
- Novos conteúdos planejados

## Créditos

- Imagens: [Scryfall](https://scryfall.com/)
- Sons: [Pixabay](https://pixabay.com/)
- Inspirado no projeto [Forge](https://github.com/Card-Forge/forge)

---

*Projeto pessoal para aprendizado. Magic: The Gathering é marca registrada da Wizards of the Coast.*
