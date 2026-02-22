# Prompt para Auditoria Multi-Agente

## Prompt Base

> Lance 6 agentes em background para auditar o jogo:
>
> **3 simulações de partida** (matchups diferentes dos anteriores) — cada agente simula 10+ turnos entre dois decks, fase por fase, verificando cada carta jogada contra o Oracle text do Scryfall e a implementação no código (game.js, rules.js, triggers.js, ai.js, cards.js). Foco em: ETBs, keywords, dano de combate, death triggers, stack/priority, mortes simultâneas.
>
> **2 auditorias de cartas** — cada agente pega decks ainda não auditados, busca o Oracle text de cada carta no Scryfall (`api.scryfall.com/cards/named?fuzzy=`), e compara atributos + habilidades contra o código. Rastreia targeting (`hasValidTargets`, `getValidSpellTargets`), static effects (`getCreatureBonuses`, `getCreatureKeywords`), e activated abilities.
>
> **1 análise de paridade player/AI** — compara `handlePhase()` vs `executeAITurn`/`finishAITurn` fase por fase, verificando que triggers, priority windows e resets existem em ambos os caminhos.
>
> Output de cada agente: **BUGS** (card, expected vs actual, file:line, severidade) + **VERIFIED CORRECT**. Ao receber os resultados, consolide bugs únicos, corrija, adicione testes, e apresente para minha confirmação antes de commit. **Após o commit, atualize este arquivo** (`docs/AGENT_AUDIT_PROMPT.md`) com os matchups testados, bugs encontrados e testes adicionados na nova rodada.

## Dicas de Uso

- **Direcionar matchups**: Troque "matchups diferentes dos anteriores" por decks específicos (ex: "Wizards vs Primal, Healing vs Undead, Pirates vs Inferno")
- **Direcionar auditorias**: Adicione "decks X e Y ainda não foram auditados" para evitar retrabalho
- **Escopo reduzido**: Se quiser só simulações ou só auditorias, ajuste o número de agentes
- **Foco específico**: Adicione "foco especial em [mecânica]" para direcionar atenção (ex: "foco especial em counterspells e stack interactions")
- **Rate limits**: Agentes podem bater no rate limit da API. Os que completam parcialmente ainda geram achados úteis nos logs

## Matchups Já Testados

| Rodada | Simulações | Auditorias | Fase/Prioridade |
|--------|-----------|------------|-----------------|
| R2 | Cats vs Vampires, Goblins vs Elves | Cats+Healing+Inferno, Goblins+Pirates, Elves+Vampires+Undead | Sim |
| R3 | Wizards vs Primal, Healing vs Undead*, Pirates vs Inferno* | Wizards*, Primal | Sim* |
| R4 | Goblins vs Undead, Cats vs Wizards, Elves vs Inferno | Wizards (re-audit) | Sim |
| R5 | Vampires vs Wizards, Healing vs Pirates, Primal vs Goblins, Undead vs Cats | Combat & Keywords (deep audit) | Sim |
| R6 | Elves vs Vampires, Cats vs Inferno, Pirates vs Undead, Healing vs Goblins | Equipment & Auras, Stack & Counterspells | Sim |
| R7 | — (foco em qualidade da IA) | AI Resource Mgmt, Combat Decisions, Card Priority, Targeting, Mulligan, Instant-Speed | Sim |

\* = agente bateu no rate limit (resultado parcial ou sem resultado)

## Decks Completamente Auditados (carta por carta vs Scryfall)

- Cats, Healing, Inferno (R2)
- Goblins, Pirates (R2)
- Elves, Vampires, Undead (R2)
- Primal (R3)
- Wizards (R4 — re-audit completo, 0 bugs)

**Todos os 10 decks auditados.**

## Bugs por Rodada

| Rodada | Bugs | Testes Adicionados |
|--------|------|--------------------|
| R1 (manual) | 18 | — |
| R2 (6 agentes) | 13 | 34 |
| R3 (6 agentes) | 4 | 10 |
| R4 (6 agentes) | 9 | 14 |
| R5 (6 agentes) | 13 | 22 |
| R6 (6 agentes) | 11 | 32 |
| R7 (6 agentes — AI quality) | 20 | 36 |
| **Total agentes** | **70** | **148** |
