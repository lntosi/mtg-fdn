# Plano de Ação: Limpeza Visual — Glows, Shadows e Animações

## Objetivo

Uniformizar todos os efeitos visuais (box-shadow, glow, animações pulsantes) com intensidade reduzida e esquema de cores coerente. Manter glow como indicador visual, mas com intensidade padronizada.

---

## Padrão de Referência (Validado)

Após testes, o padrão que funcionou melhor foi **glow reduzido** (não border+brightness):

```css
/* Padrão glow sóbrio */
box-shadow: 0 0 12px 4px rgba({cor}, 0.6);
/* SEM animações pulsantes */
/* blur: 12px, spread: 4px, opacidade: 0.5–0.6 */
```

Exceções que mantêm border+brightness (validadas anteriormente):
- `.card.attacking` — `border: 2px solid` + `brightness(1.2)` + glow sutil
- `.card.land-selected` — `border: 2px solid` + `brightness(1.3)` + `translateY(-6px)`

---

## Esquema de Cores (Reorganizado)

| Semântica | Cor | Seletores |
|-----------|-----|----------|
| **"Pode usar"** (mana, jogável) | Verde `rgba(46, 204, 113)` | `.playable`, `.mana-producer-*` |
| **"Ataque"** (combate ofensivo) | Vermelho `rgba(231, 76, 60)` | `.attacker-selected`, `.attacking` |
| **"Defesa"** (combate defensivo) | Azul `rgba(52, 152, 219)` | `.selected-blocker`, `.blocking` |
| **"Alvo clicável"** (exige ação) | Laranja `rgba(243, 156, 18)` | `.valid-target`, `.valid-block-target` |
| **"Conjuração ativa"** (spell na stack) | Ciano `rgba(0, 188, 212)` | `.pending-cast` |
| **"Habilidade ativável"** | Roxo `rgba(155, 89, 182)` | `.has-ability` |
| **Estado: buff** | Verde floresta `rgba(34, 139, 34)` | `.has-buff-aura` |
| **Estado: debuff** | Vermelho escuro `rgba(139, 0, 0)` | `.has-debuff-aura` |
| **Estado: equipment** | Dourado `rgba(218, 165, 32)` | `.has-equipment` |
| **Estado: land aura** | Verde lima `rgba(50, 205, 50)` | `.has-land-aura` |

Mudanças de cor aplicadas:
- `.selected-blocker`: roxo → **azul** (coerência com `.blocking`)
- `.valid-block-target`: vermelho → **laranja** (coerência com `.valid-target`)
- `.pending-cast`: azul → **ciano** (distingue de bloqueio)

---

## Status da Implementação

### [x] Implementado — Glow Reduzido + Cores Coerentes

Todos os efeitos abaixo foram convertidos ao padrão `0 0 12px 4px rgba(cor, 0.6)`:

| # | Seletor | Antes | Depois | Status |
|---|---------|-------|--------|--------|
| 1 | `.playable` | `0 0 20px 8px` sólido | `0 0 12px 4px` rgba 0.6 verde | [x] |
| 2 | `.attacker-selected` | border+brightness+translateY | `0 0 12px 4px` rgba 0.6 vermelho | [x] |
| 3 | `.blocking` | `0 0 25px 10px` sólido | `0 0 12px 4px` rgba 0.6 azul | [x] |
| 4 | `.selected-blocker` | `0 0 30px 12px` + pulsação | `0 0 12px 4px` rgba 0.6 **azul** | [x] |
| 5 | `.valid-target` | `0 0 25px 10px` + pulsação | `0 0 12px 4px` rgba 0.6 laranja | [x] |
| 6 | `.valid-block-target` | `0 0 25px 10px` + pulsação | `0 0 12px 4px` rgba 0.6 **laranja** | [x] |
| 7 | `.pending-cast` | `0 0 25px 10px` + pulsação | `0 0 12px 4px` rgba 0.6 **ciano** | [x] |
| 8 | `.has-ability` | `0 0 15px 5px` sólido | `0 0 12px 4px` rgba 0.6 roxo | [x] |
| 9 | `.mana-producer-selected` | `0 0 20px 8px` sólido | `0 0 12px 4px` rgba 0.6 verde | [x] |
| 10 | `.mana-producer-selectable:hover` | `0 0 15px 5px` | `0 0 12px 4px` rgba 0.4 verde | [x] |
| 11 | `.has-debuff-aura` | borda 3px + glow !important | `0 0 12px 4px` rgba 0.6 !important | [x] |
| 12 | `.has-buff-aura` | borda 3px + glow !important | `0 0 12px 4px` rgba 0.6 !important | [x] |
| 13 | `.has-equipment` | borda 3px + glow !important | `0 0 12px 4px` rgba 0.6 !important | [x] |
| 14 | `.has-land-aura` | borda 2px + glow !important | `0 0 12px 4px` rgba 0.5 !important | [x] |

4 keyframes de pulsação removidos: `pulse-selected-blocker`, `pulse-block-target`, `pending-cast-pulse`, `pulse-target`.

### Efeitos já sóbrios (sem mudança)

| Seletor | Efeito | Motivo |
|---------|--------|--------|
| `.attacking` | `border + brightness(1.2) + box-shadow 12px 3px` | Já convertido em sessão anterior |
| `.land-selected` | `border + brightness(1.3) + translateY(-6px)` | Já convertido em sessão anterior |
| `.has-ability.inactive` | `box-shadow: none` | Correto — sem glow quando inativo |
| `.land-selectable:hover` | `brightness(1.1)` | Sutil, adequado |

---

## Checklist de Validação

### Partida 1 — Elves + Primal (vs qualquer)
Foco: mana producers, habilidades ativadas, cartas jogáveis, combate básico

| # | O que validar | Cor esperada | Como testar | OK? |
|---|--------------|-------------|-------------|-----|
| 1 | `.playable` | Verde | Olhar mão na MAIN1 — cartas jogáveis têm glow verde sutil | [x] |
| 2 | `.attacker-selected` | Vermelho | Clicar criatura para atacar (antes de confirmar) | [x] |
| 3 | `.attacking` | Vermelho | Confirmar ataque (border + brightness) | [x] |
| 4 | `.mana-producer-selectable` | Verde (hover) | Hover sobre Llanowar Elves / Druid of the Cowl untapped | [x] |
| 5 | `.mana-producer-selected` | Verde | Clicar Llanowar Elves para selecionar mana | [x] |
| 6 | `.has-ability` ativo | Roxo | Thrashing Brontodon / Wildheart Invoker com mana disponível | [x] |
| 7 | `.has-ability.inactive` | Sem glow | Mesmas criaturas sem mana ou com summoning sickness | [x] |
| 8 | `.has-ability.inactive` + atacante | Vermelho | Selecionar Thrashing Brontodon como atacante (glow vermelho prevalece) | [x] |

### Partida 2 — Inferno + Pirates (vs qualquer com criaturas)
Foco: instants com alvo, pending-cast, bloqueio, treasure token

| # | O que validar | Cor esperada | Como testar | OK? |
|---|--------------|-------------|-------------|-----|
| 9 | `.pending-cast` | Ciano | Conjurar Lightning Bolt / Kindled Fury (carta se eleva na mão com glow ciano) | [x] |
| 10 | `.valid-target` | Laranja | Ao conjurar instant com alvo — criaturas alvo ficam laranja | [x] |
| 11 | `.selected-blocker` | Azul | IA ataca, clicar criatura sua para bloquear | [x] |
| 12 | `.valid-block-target` | Laranja | Após selecionar bloqueador, atacantes clicáveis ficam laranja | [x] |
| 13 | `.blocking` | Azul | Após confirmar bloqueio | [x] |
| 14 | Treasure Token | Verde | Treasure Token aparece com visual verde de mana-producer (não roxo) | [x] |

### Partida 3 — Vampires + Undead (vs Cats ou Elves)
Foco: auras, equipment, debuffs

| # | O que validar | Cor esperada | Como testar | OK? |
|---|--------------|-------------|-------------|-----|
| 15 | `.has-buff-aura` | Verde floresta | Criatura com Untamed Hunger ou outra aura buff | [x] |
| 16 | `.has-buff-aura.attacking` | Verde + vermelho | Atacar com criatura com aura buff | [x] |
| 17 | `.has-debuff-aura` | Vermelho escuro | IA usa Pacifism ou Eaten by Piranhas em sua criatura | [x] |
| 18 | `.has-equipment` | Dourado | Criatura com Short Sword / Marauder's Axe | [x] |
| 19 | `.has-equipment.attacking` | Dourado + vermelho | Atacar com criatura equipada | [x] |

### Partida 4 (ou debug) — Qualquer
Foco: view-mode, legibilidade geral

| # | O que validar | Cor esperada | Como testar | OK? |
|---|--------------|-------------|-------------|-----|
| 20 | View-mode limpo | Sem glows de interação | Terminar partida e inspecionar BF | [x] |
| 21 | View-mode preserva estado | Aura/equipment visíveis | Mesma inspeção — auras e equipamentos ainda com glow | [x] |
| 22 | Legibilidade de `.valid-target` | Laranja visível | Com 5+ criaturas no BF, conjurar instant com alvo — alvos são identificáveis? | [x] |
| 23 | Legibilidade de `.valid-block-target` | Laranja visível | Com 3+ atacantes, selecionar bloqueador — atacantes bloqueáveis são claros? | [x] |

### Veredicto Final

- [x] **Todos os glows visíveis e distinguíveis** entre si
- [x] **Cores coerentes** com a semântica (verde=mana, vermelho=ataque, azul=defesa, laranja=alvo, ciano=conjuração, roxo=habilidade)
- [x] **Legibilidade suficiente** sem pulsação (ou precisa de brightness pulsante em B3/B6?)
- [x] **View-mode** limpo
- [x] Aprovado para remover keyframes mortos e fechar plano

---

## Pendências Futuras

### Keyframes mortos (remover após validação completa)

Os keyframes abaixo já não são referenciados por nenhum seletor `.card.*`, mas permanecem no CSS como dead code para rollback seguro:

| Keyframe | Era usado por |
|----------|--------------|
| `pulse-selected-blocker` | `.selected-blocker` |
| `pulse-block-target` | `.valid-block-target` |
| `pending-cast-pulse` | `.pending-cast` |
| `pulse-target` | `.valid-target` |

- [x] Remover keyframes mortos após validação completa (pulse-attack duplicado removido em auditoria)

### `!important` restantes

Auras e equipment ainda usam `!important` para override de outros box-shadows. Remover requer reestruturar especificidade CSS.

- [ ] Fase futura: resolver `!important` com especificidade CSS

### Efeitos fora do escopo (UI, non-card)

| # | Seletor | Efeito | Decisão |
|---|---------|--------|---------|
| 1 | `.card-stats.buffed` | Glow verde pulsante | Converter para estático |
| 2 | `.card-stats.damaged` | Glow vermelho pulsante | Converter para estático |
| 3 | `.card-stats.attack-buffed` | Glow laranja pulsante | Converter para estático |
| 4 | `.continue-button` | Pulsação azul | Manter |
| 5 | `.turn-indicator` | Pulsação verde/vermelho | Manter |
| 6 | `.mana-icon.floating-mana` | Glow dourado + scale | Manter |
| 7 | `.player-avatar` damage/heal | Shake/glow momentâneo | Manter |
| 8 | Deck selection glows | Glow por cor do deck | Manter |

- [ ] Fase futura: converter `.card-stats` pulsantes para glow estático

### Animações de movimento (manter)

| Seletor | Animação | Decisão |
|---------|----------|---------|
| `.attacking-animation` | Move para frente | Manter |
| `.blocking-animation` | Move para posição de bloqueio | Manter |

---

## Bug Fix Incluído

**AI não jogava criaturas** — `ai.js:getNextCardToPlay()` reservava mana para instants durante Main Phase 1, impedindo a IA de jogar criaturas nos turnos iniciais. Fix: reserva de mana agora só se aplica na Main Phase 2 (`phase === 2`).
