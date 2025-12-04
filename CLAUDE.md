# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTG Jumpstart Foundations - A browser-based Magic: The Gathering game for learning purposes. Single-player vs AI using 4 Jumpstart decks from the Foundations Beginner Box (Cats, Goblins, Vampires, Elves).

## Running the Game

Open `index.html` directly in a browser. No build system, server, or dependencies required - pure vanilla JavaScript.

## Architecture

**Core Game Flow:**
- `main.js` - Entry point, creates GameState instance
- `game.js` - Main game state and turn flow controller (GameState class)
- `rules.js` - MTG rules engine: phases, mana payment, combat damage, keywords
- `ai.js` - AI opponent logic for playing cards and combat decisions
- `ui.js` - DOM manipulation, rendering, event handling (GameUI class)
- `cards.js` - Card database (CARD_DATABASE) with all 4 decks
- `sounds.js` - SoundManager (Pixabay audio) and ImageManager (Scryfall API)

**Key Classes:**
- `GameState` - Central state: players, phase, turn number, combat state. Has persistence via localStorage (saveGame/restoreGame)
- `RulesEngine` - Validates plays, calculates mana, resolves combat damage
- `GameUI` - Renders cards, handles clicks, manages graveyard popup
- `AIPlayer` - Decides which cards to play, attackers, blockers

**Game Flow:**
1. Player selects 2 decks → combined 40-card library
2. Turn phases: Untap → Upkeep → Draw → Main1 → Combat → Main2 → End
3. Combat: declareAttackers → promptForBlockers → resolveCombat
4. AI turn executed via executeAITurn() → continueAfterBlocking() → finishAITurn()

**Card Images:** Fetched from Scryfall API via ImageManager with rate limiting and caching.

**Persistence:** Game auto-saves to localStorage on key actions, restores on page reload.

## MTG Keywords Implemented

flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, tap_for_mana, etb_draw
- to memorize
- to memorize
- to memorize
- to memorize