# UX Improvements — Roadmap

Status: ✅ Implementado · 🔜 Próximo · 💡 Planejado

---

## Alto Impacto

### 1. Feedback visual de "o que posso fazer agora" ✅
- **Mão**: cartas jogáveis já têm glow verde (`.playable` existente)
- **Atacantes**: pulso verde sutil (`.can-attack`) em criaturas que podem atacar durante DECLARE_ATTACKERS
- **Bloqueadores**: pulso verde sutil (`.can-block`) em criaturas que podem bloquear durante fase de bloqueio
- Animação `pulse-can-act` (1.5s loop) — desaparece ao selecionar/confirmar

### 2. Animação de cartas entrando/saindo do campo ✅
- **Entrada**: scale 0.3→1.08→1 com glow dourado (0.35s)
- **Saída**: shrink + desaturate + fade (0.4s) via `notifyCardLeaving()`
- Funciona para player e IA (usa `_recentlyEnteredIds` persistente)
- Hooks em: `destroyPermanent`, `sacrificeCreature`, `bounceToHand`, `exilePermanent`, combat deaths, SBA deaths, counterspell, treasure sacrifice

### 3. Histórico de combate mais claro ✅
- **Combat Summary Overlay**: painel central semi-transparente pós-combate
- Mostra dano entre criaturas, dano ao jogador, mortes e mudanças de vida
- Auto-dismiss após 4s, clique para fechar imediatamente
- Complementa o log textual com resumo visual

### 4. ~~Tutorial/onboarding para iniciantes~~ ❌ Descartado
- Exigiria partida scriptada com sequência fixa de cartas
- Sem script, testar todas as combinações seria inviável
- Custo/benefício não justifica a complexidade

---

## Médio Impacto

### 5. Indicador de fase (pips minimalistas) ✅
- **5 dots** no `#phase-indicator`: Begin · Main1 · Combat · Main2 · End
- Dot ativo com glow amarelo (combate fica vermelho)
- Dots passados ficam semi-transparentes
- Ocupa ~30px, não polui a interface

### 6. Tooltip contextual no hover de cartas na mão 💡
- Mostrar se o jogador tem mana suficiente
- Indicar qual mana falta

### 7. `prefers-reduced-motion` para acessibilidade ✅
- `@media (prefers-reduced-motion: reduce)` desabilita todas as animações
- Afeta: card-enter, card-exit, floating damage, combat summary, pulse-can-act
- Cards acionáveis usam glow estático ao invés de pulso

### 8. Contador de dano no combate ✅
- **Floating Damage Numbers**: números flutuantes (estilo RPG) sobre criaturas e vida
- Vermelho para dano (`-N`), verde para cura (`+N` lifelink)
- Animação `float-damage-up` (1.2s, sobe e desaparece)
- `combatDetails` em `rules.js` agora inclui referências de objetos (`attackerObj`/`blockerObj`)

---

## Baixo Impacto (Polish)

### 9. Drag & drop mais fluido (mobile-friendly) 💡
- O drag & drop existe mas poderia ser mais fluido em touch screens

### 10. Atalhos de teclado 🔜
Teclas implementadas:
- **Espaço** = ação principal (próxima fase / confirmar atacantes / confirmar bloqueadores / passar prioridade) — replica o botão central
- **E** = End Turn (pular para o end step) — replica o botão "End Turn"
- **G** = abrir/fechar cemitério do jogador

Teclas sugeridas (não implementadas):
- Enter = confirmar ação (redundante com Espaço)
- Z = desfazer seleção de terrenos
- 1-5 = selecionar carta da mão (esquerda para direita)

Bloqueio: atalhos desabilitados quando um modal obrigatório está aberto (`_awaitingMandatoryAction`), durante o turno da IA, ou na tela de seleção de decks.

### 11. Tema claro alternativo 💡
- Nem todos jogam no escuro
- Tema claro opcional

### 12. Zoom no campo de batalha 💡
- Quando muitas criaturas estão no campo, fica apertado
- Mini-zoom ou scroll horizontal

---

## Implementação Técnica (referência)

### Arquivos modificados

| Arquivo | Features | Mudanças |
|---------|----------|----------|
| `css/style.css` | 1,2,3,5,7,8 | 7 `@keyframes` + classes CSS + `prefers-reduced-motion` (~250 linhas) |
| `js/ui.js` | 1,2,3,5,8 | 4 métodos + `renderBattlefield()` + `renderPhase()` + construtor |
| `js/game.js` | 2,3,8 | Hooks em `resolveCombat()` + `notifyCardLeaving()` em 8 pontos de `splice` |
| `js/rules.js` | 8 | `attackerObj`/`blockerObj` em `combatDetails` (4 locais) |
| `index.html` | 3,5 | `<div id="combat-summary-overlay">` + phase pips |

---

*Última atualização: Fevereiro 2026*
