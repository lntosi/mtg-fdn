# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Official MTG Rules Reference

The official Magic: The Gathering Comprehensive Rules are available at `docs/MagicCompRules 20251114.txt`. Use this as the authoritative source for any rules questions or implementation decisions.

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
- `sounds.js` - SoundManager (Pixabay audio)
- `images.js` - ImageManager (Scryfall API for card images and avatars)

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

**Stack System:** Basic stack implementation for spells/abilities with priority passing:
- `addToStack(item, controller)` - Add spell/ability to stack
- `resolveTopOfStack()` - Resolve top item
- `passPriority()` - Pass priority to other player
- `isStackEmpty()`, `canRespond(player)` - Check stack state

**AI Action Delays:** AI has built-in delays between actions for better visibility:
- Phase transitions: 500-800ms
- Playing cards: 600-1200ms
- Combat decisions: 800-1200ms

## Avatars

Player and AI avatars use Scryfall art_crop images from planeswalker cards (versões com artes mais focadas no rosto):
- jace: Jace Beleren
- chandra: Chandra Nalaar
- liliana: Liliana, Dreadhorde General
- gideon: Gideon Blackblade
- nissa: Nissa Revane
- ajani: Ajani Goldmane

AI avatar is chosen based on deck theme (cats→ajani, goblins→chandra, vampires→liliana, elves→nissa).

## Damage Display System

Creatures display damage taken visually:
- **Effective Toughness**: Shows `power/effective_toughness` where effective = toughness - damage
- **Damaged Stats**: Red background on P/T display with pulse animation
- **Damage Badge**: Purple badge showing `-X` damage marked (positioned above stats)
- **Border Indicator**: Red pulsing border on damaged creatures
- Damage clears automatically at end of turn (cleanup step)

Example: A 3/3 creature with 2 damage shows as `3/1` with red stats and a `-2` badge.

## MTG Keywords Implemented

flying, lifelink, deathtouch, trample, first_strike, double_strike, vigilance, haste, reach, menace, tap_for_mana, etb_draw
- to memorize
- to memorize