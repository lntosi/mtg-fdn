# Handover: MTG Standard 60-Card Project

## Origem

Este projeto é uma cópia do MTG Jumpstart Foundations — um jogo browser-based de Magic: The Gathering para aprendizado. O código original implementa os 10 half-decks do Beginner Box (20 cartas cada, combina 2 para jogar com 40).

## Objetivo do Novo Projeto

Adaptar para **5 decks mono-color de 60 cartas** no formato Standard, mantendo o engine e layout existentes.

## O que manter (não precisa mexer)

- **Engine completo**: game.js, rules.js, triggers.js, ai.js, ui.js, sounds.js, images.js
- **Stack system**: counterspells, priority, instant-speed responses
- **Combat**: first strike, trample, lifelink, deathtouch, menace, etc.
- **Preview panel**: imagem Scryfall, stats, keywords, mana tooltip
- **Som e imagens**: Pixabay audio, Scryfall API
- **Stats system**: stats.js com localStorage

## O que precisa mudar

### 1. `cards.js` — Substituir card database

**Atual**: 10 decks de 20 cartas (cats, goblins, vampires, elves, pirates, healing, inferno, primal, wizards, undead)

**Novo**: 5 decks mono-color de 60 cartas (W, U, B, R, G)

Estrutura existente em cards.js:
```js
const CARD_DATABASE = {
    deck_name: {
        name: "Display Name",
        colors: ["R"],
        cards: [
            { id: "card_id", name: "Card Name", type: "creature", subtype: "Goblin",
              cost: "1R", cmc: 2, power: 2, toughness: 2, keywords: [...], text: "...", qty: 4 }
        ]
    }
}
```

Cada carta precisa: `id`, `name`, `type`, `cost`, `cmc`, e campos específicos por tipo (creature: power/toughness; instant/sorcery: keywords para efeitos). Consultar `docs/07_CARD_IMPLEMENTATION_CHECKLIST.md` para o checklist completo.

**Keywords já implementadas** (ver CLAUDE.md seção "MTG Keywords Implemented"):
- Combat: flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, flash, ward, hexproof, indestructible
- ETB: etb_draw, etb_bounce, etb_counter_two, etb_drain_2, etb_treasure, etc.
- Lords: goblin_lord, elf_lord, pirate_lord, zombie_skeleton_lord
- Misc: tap_for_mana, counterspell, equipment, enchant, scry_N, draw_N

Cartas com habilidades que não estão entre as keywords existentes precisam de implementação nova nos arquivos do engine (triggers.js, game.js, rules.js).

### 2. Seleção de deck — Simplificar

**Atual** (index.html + ui.js): jogador escolhe 2 half-decks → combina em 40 cartas

**Novo**: jogador escolhe 1 deck de 60 cartas

Arquivos envolvidos:
- `index.html` — tela de seleção de deck (div `#deck-selection`)
- `ui.js` — `renderDeckSelection()`, lógica de seleção
- `game.js` — `startGame()` recebe decks selecionados, monta library

### 3. Avatares — Atualizar

**Atual** (images.js): mapeia deck → planeswalker (cats→ajani, goblins→chandra, etc.)

**Novo**: mapear cada cor para um planeswalker ou personagem adequado.

### 4. Esquema de cores (opcional)

CSS em `css/style.css`. Tema atual: purple/dark. Pode mudar livremente — cores base estão no body e #game-container. Componentes usam rgba() com opacidade.

### 5. Vida inicial

Já é 20 por padrão, sem mudança necessária.

## Arquitetura (referência rápida)

| Arquivo | Responsabilidade |
|---------|-----------------|
| `cards.js` | Base de dados de cartas |
| `game.js` | Game state, turn flow, spell resolution, activated abilities |
| `triggers.js` | ETBs, death triggers, combat triggers, end-step triggers |
| `rules.js` | Mana, combat damage, keyword checks, lord bonuses |
| `ai.js` | AI decisions (play cards, attack, block, instants) |
| `ui.js` | DOM rendering, events, modals, prompts |
| `images.js` | Scryfall API para imagens |
| `sounds.js` | Audio manager |
| `stats.js` | Player statistics |

## Decisão de design para novas cartas

Ao escolher cartas para os decks de 60, priorizar:
1. Cartas cujas keywords já estão implementadas (zero código novo)
2. Cartas com efeitos simples e similares aos existentes (pouco código)
3. Evitar planeswalkers e mecânicas muito complexas (saga, transform, etc.)

## Testes

```bash
npm test                              # 694 testes existentes
node tools/validate-cards.js          # Validar cartas contra Scryfall
node tools/validate-cards.js --missing # Cartas sem testes
```

Os testes existentes testam o engine. Ao adicionar novas cartas, adicionar testes correspondentes.

## Referências

- `CLAUDE.md` — Instruções completas do projeto (architecture, patterns, keywords)
- `docs/07_CARD_IMPLEMENTATION_CHECKLIST.md` — Checklist para implementar cartas novas
- `docs/06_SPELL_TARGETING_CHECKLIST.md` — Checklist para instants/sorceries com alvo
- `docs/PITFALLS.md` — Bugs comuns e soluções
