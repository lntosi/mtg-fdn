# UX Improvements — Roadmap

Status: ✅ Implementado · 🔜 Próximo · 💡 Planejado

---

## Alto Impacto

### 1. Feedback visual de "o que posso fazer agora" 💡
- Highlight pulsante nas cartas jogáveis na mão (borda verde suave)
- Criaturas que podem atacar/bloquear com indicador visual antes do clique
- Lands que podem ser jogadas com brilho sutil

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

### 4. Tutorial/onboarding para iniciantes 💡
- Modo tutorial guiado nos primeiros turnos
- Exemplos: "Clique na terra para jogá-la", "Agora selecione atacantes"
- Importante pois o jogo é voltado para aprendizado

---

## Médio Impacto

### 5. Indicador de fase mais proeminente 💡
- Timeline horizontal com as fases (estilo breadcrumb)
- Mostra onde o jogador está no turno
- Ajuda bastante jogadores novos a entender o fluxo

### 6. Tooltip contextual no hover de cartas na mão 💡
- Mostrar se o jogador tem mana suficiente
- Indicar qual mana falta

### 7. `prefers-reduced-motion` para acessibilidade 💡
- Respeitar a preferência do sistema operacional para reduzir animações
- Desabilitar `card-enter`, `card-exit`, `float-damage-up` quando ativado

### 8. Contador de dano no combate ✅
- **Floating Damage Numbers**: números flutuantes (estilo RPG) sobre criaturas e vida
- Vermelho para dano (`-N`), verde para cura (`+N` lifelink)
- Animação `float-damage-up` (1.2s, sobe e desaparece)
- `combatDetails` em `rules.js` agora inclui referências de objetos (`attackerObj`/`blockerObj`)

---

## Baixo Impacto (Polish)

### 9. Drag & drop mais fluido (mobile-friendly) 💡
- O drag & drop existe mas poderia ser mais fluido em touch screens

### 10. Atalhos de teclado 💡
- Espaço = passar prioridade/confirmar
- A = declarar atacantes
- Enter = confirmar ação

### 11. Tema claro alternativo 💡
- Nem todos jogam no escuro
- Tema claro opcional

### 12. Zoom no campo de batalha 💡
- Quando muitas criaturas estão no campo, fica apertado
- Mini-zoom ou scroll horizontal

---

## Implementação Técnica (referência)

### Arquivos modificados (features 2, 3, 8)

| Arquivo | Mudanças |
|---------|----------|
| `css/style.css` | 6 `@keyframes` + classes CSS (~170 linhas) |
| `js/ui.js` | 4 métodos + `renderBattlefield()` com detecção de novos cards + construtor |
| `js/game.js` | Hooks em `resolveCombat()` + `notifyCardLeaving()` em 8 pontos de `splice` |
| `js/rules.js` | `attackerObj`/`blockerObj` em `combatDetails` (4 locais) |
| `index.html` | `<div id="combat-summary-overlay">` |

---

*Última atualização: Fevereiro 2026*
