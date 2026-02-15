# Plano de Ação: Limpeza Visual — Glows, Shadows e Animações

## Objetivo

Uniformizar todos os efeitos visuais (box-shadow, glow, animações pulsantes) para seguir o padrão "sóbrio" estabelecido recentemente nas lands e criaturas atacantes. Remover efeitos extravagantes sem perder clareza funcional.

---

## Padrão de Referência ("Sóbrio")

Implementado em `.land-selected` e `.attacker-selected`:

```css
/* Padrão sóbrio */
border: 2px solid {cor};
filter: brightness(1.2–1.3);
transform: translateY(-6px);       /* opcional — elevação sutil */
box-shadow: 0 0 12px 3px {cor};   /* opcional — glow discreto, spread ≤ 5px */
cursor: pointer;
/* SEM animações pulsantes */
/* SEM !important */
```

Princípios:
1. **Sem pulsação** — nenhum `@keyframes` com `box-shadow` oscilante
2. **Spread máximo ~5px** — glows com spread > 8px são extravagantes
3. **Sem `!important`** — resolver conflitos com especificidade CSS
4. **Borda fina colorida** — comunica estado sem exagero
5. **Brightness** — clareia a carta ao invés de glow intenso ao redor

---

## Avaliação de Risco — Feedback Visual

### Veredicto: Ganho líquido positivo, com 3 pontos de atenção

A mudança para o padrão sóbrio é um ganho claro na maioria dos casos. Borda + brightness comunica interatividade tão bem quanto um glow grande — já validado nas lands e atacantes. Porém, **3 efeitos são críticos para legibilidade** e precisam de tratamento especial:

#### Risco BAIXO (implementar sem hesitação)
- **B1 (playable)** — indicador estático de "pode jogar". Borda verde + elevação é suficiente.
- **B4 (selected-blocker)**, **B5 (blocking)** — estados confirmados, não precisam "gritar". Mesmo raciocínio do `.attacking` que já ficou sóbrio.
- **B7 (has-ability)**, **B8 (mana-producer)** — indicadores de interatividade. A borda já comunica isso.
- **C1–C4 (auras, equipment)** — remover `!important` e reduzir glow é manutenção saudável. Borda colorida diferencia buff/debuff/equipment.

#### Risco MÉDIO (testar jogando antes de confirmar)
- **B2 (pending-cast)** — Precisa se destacar da mão. A elevação (`translateY`) ajuda, mas sem diferencial adicional pode se confundir com `.playable`. **Sugestão:** manter `border: 3px` (mais grosso que os demais) + `z-index: 100` para garantir destaque.
- **B3 (valid-target)** — **O mais crítico.** Quando o jogador conjura Murder, os alvos válidos precisam saltar aos olhos *imediatamente*, especialmente com 5+ criaturas no BF. Glow pulsante é exagerado, mas borda estática pode ser insuficiente.
- **B6 (valid-block-target)** — Mesma lógica do B3. Na fase de bloqueio, identificação rápida é essencial.

#### Alternativa para B3/B6: Brightness Pulsante (meio-termo)

Em vez de glow pulsante (extravagante) ou borda estática (pode não chamar atenção), usar **oscilação sutil de brightness**:

```css
@keyframes subtle-highlight {
    0%, 100% { filter: brightness(1.2); }
    50% { filter: brightness(1.4); }
}
.card.valid-target {
    border: 2px solid #f39c12;
    animation: subtle-highlight 1.5s ease-in-out infinite;
    box-shadow: 0 0 12px 3px rgba(243, 156, 18, 0.5);
    cursor: crosshair;
}
```

Isso mantém a atenção sem o "brilhão" do glow pulsante. É mais coerente com o padrão sóbrio, mas preserva o feedback de "algo exige sua ação agora".

### Estratégia Recomendada: 2 Ondas

| Onda | Items | Abordagem |
|------|-------|-----------|
| **Onda 1 (segura)** | B1, B4, B5, B7, B8, C1–C4 | Implementar direto, risco baixo |
| **Onda 2 (com teste)** | B2, B3, B6 | Implementar + jogar 2-3 partidas para validar legibilidade |

Se na Onda 2 a legibilidade não for satisfatória, aplicar o meio-termo de brightness pulsante nos items B3 e B6.

---

## Inventário Completo

### A. Efeitos JÁ Sóbrios (sem ação necessária)

| # | Seletor | Efeito Atual | Contexto |
|---|---------|-------------|----------|
| 1 | `.card.land-selected` | `border: 2px solid` + `brightness(1.3)` + `translateY(-6px)` | Seleção de land para mana |
| 2 | `.card.attacker-selected` | `border: 2px solid` + `brightness(1.3)` + `translateY(-6px)` | Seleção de atacante (pré-confirmação) |
| 3 | `.card.attacking` | `border: 2px solid` + `brightness(1.2)` + `box-shadow: 0 0 12px 3px` | Atacante confirmado |
| 4 | `.card.has-ability.inactive` | `box-shadow: none` | Habilidade indisponível |
| 5 | `.card.land-selectable:hover` | `brightness(1.1)` | Hover em land tapável |

---

### B. Efeitos para Converter ao Padrão Sóbrio

#### B1. Cartas jogáveis na mão

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.playable` | `box-shadow: 0 0 20px 8px #2ecc71` | Glow verde intenso, spread 8px |

**Proposta:**
```css
.card.playable {
    border: 2px solid #2ecc71;
    filter: brightness(1.2);
    transform: translateY(-6px);
    box-shadow: none;
}
```

- [ ] Implementar
- [ ] Testar em mão do jogador (MAIN1, MAIN2, instants com flash)

---

#### B2. Carta sendo conjurada (aguardando alvo)

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.pending-cast` | `box-shadow: 0 0 25px 10px #3498db` + `pending-cast-pulse` 1s + `!important` | Glow azul pulsante, spread 10px, !important |

**Proposta:**
```css
.card.pending-cast {
    border: 3px solid #3498db;
    filter: brightness(1.3);
    transform: translateY(-8px);
    box-shadow: 0 0 12px 3px rgba(52, 152, 219, 0.5);
    z-index: 100;
    animation: none;
}
```

- [ ] Implementar
- [ ] Remover `@keyframes pending-cast-pulse` (ou manter como dead code para rollback)
- [ ] Testar com instants que pedem alvo

---

#### B3. Alvos válidos para spell/habilidade

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.valid-target` | `box-shadow: 0 0 25px 10px #f39c12` + `pulse-target` 0.6s | Glow laranja pulsante |

**Proposta:**
```css
.card.valid-target {
    border: 2px solid #f39c12;
    filter: brightness(1.3);
    box-shadow: 0 0 12px 3px rgba(243, 156, 18, 0.5);
    cursor: crosshair;
    animation: none;
}
```

**Nota:** Este é um efeito de feedback crítico. A pulsação ajuda a chamar atenção para os alvos. Considerar manter uma animação mais sutil (`brightness` oscilando entre 1.2 e 1.35) em vez de glow pulsante.

- [ ] Implementar
- [ ] Remover `@keyframes pulse-target`
- [ ] Testar com Murder, Lightning Bolt, auras com alvo

---

#### B4. Bloqueador selecionado

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.selected-blocker` | `box-shadow: 0 0 30px 12px #9b59b6` + `pulse-selected-blocker` 0.6s | Glow roxo enorme (30px blur, 12px spread), pulsante |

**Proposta:**
```css
.card.selected-blocker {
    border: 2px solid #9b59b6;
    filter: brightness(1.3);
    transform: translateY(-6px);
    box-shadow: 0 0 12px 3px rgba(155, 89, 182, 0.5);
    animation: none;
}
```

- [ ] Implementar
- [ ] Remover `@keyframes pulse-selected-blocker`
- [ ] Testar na fase DECLARE_BLOCKERS

---

#### B5. Bloqueio confirmado

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.blocking` | `box-shadow: 0 0 25px 10px #3498db` | Glow azul intenso, spread 10px |

**Proposta:**
```css
.card.blocking {
    border: 2px solid #3498db;
    filter: brightness(1.2);
    box-shadow: 0 0 12px 3px rgba(52, 152, 219, 0.5);
}
```

- [ ] Implementar
- [ ] Testar bloqueio durante combate

---

#### B6. Alvo de bloqueio válido

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.valid-block-target` | `box-shadow: 0 0 25px 10px #e74c3c` + `pulse-block-target` 0.6s | Glow vermelho pulsante |

**Proposta:**
```css
.card.valid-block-target {
    border: 2px solid #e74c3c;
    filter: brightness(1.3);
    box-shadow: 0 0 12px 3px rgba(231, 76, 60, 0.5);
    cursor: crosshair;
    animation: none;
}
```

- [ ] Implementar
- [ ] Remover `@keyframes pulse-block-target`
- [ ] Testar com seleção de bloqueadores

---

#### B7. Habilidade ativável

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.has-ability` | `box-shadow: 0 0 15px 5px #9b59b6` | Glow roxo médio, spread 5px |

**Proposta:**
```css
.card.has-ability {
    border: 2px solid #9b59b6;
    filter: brightness(1.15);
    box-shadow: none;
    cursor: pointer;
}
```

- [ ] Implementar
- [ ] Testar com Mystic Archaeologist, Vampire Neonate, Spectral Sailor

---

#### B8. Produtor de mana selecionado

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.mana-producer-selected` | `box-shadow: 0 0 20px 8px #2ecc71` | Glow verde intenso |
| `.card.mana-producer-selectable:hover` | `box-shadow: 0 0 15px 5px #2ecc71aa` | Glow verde no hover |

**Proposta:**
```css
.card.mana-producer-selected {
    border: 2px solid #2ecc71;
    filter: brightness(1.3);
    transform: translateY(-6px);
    box-shadow: none;
}
.card.mana-producer-selectable:hover {
    filter: brightness(1.1);
    box-shadow: none;
}
```

- [ ] Implementar
- [ ] Manter o `::after` (✓ checkmark) — informação útil
- [ ] Testar seleção de Llanowar Elves, Druid of the Cowl, Treasure Token

---

### C. Efeitos de Estado Permanente (auras, equipment)

Estes usam `!important` para override de outros glows. Precisam de atenção especial.

#### C1. Aura negativa (debuff)

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.has-debuff-aura` | `0 0 0 3px #8b0000, 0 0 12px 3px rgba(139,0,0,0.6)` + `!important` | Borda ok, mas glow 12px + !important |

**Proposta:**
```css
.card.has-debuff-aura {
    border: 2px solid #8b0000;
    filter: brightness(0.85);        /* escurece levemente */
    box-shadow: 0 0 8px 2px rgba(139, 0, 0, 0.4);
}
```

**Nota:** O efeito de escurecimento (em vez de glow) comunica "debuff" de forma mais intuitiva.

- [ ] Implementar
- [ ] Resolver conflitos sem `!important` (aumentar especificidade com `.battlefield .card.has-debuff-aura`)
- [ ] Testar com Pacifism, Eaten by Piranhas
- [ ] Testar combo `.has-debuff-aura.attacking` (se aplicável)

---

#### C2. Aura positiva (buff)

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.has-buff-aura` | `0 0 0 3px #228b22, 0 0 12px 3px rgba(34,139,34,0.6)` + `!important` | Mesmo padrão do debuff |
| `.card.has-buff-aura.attacking` | 3 camadas de shadow + `!important` | Combinação complexa |

**Proposta:**
```css
.card.has-buff-aura {
    border: 2px solid #228b22;
    filter: brightness(1.15);
    box-shadow: 0 0 8px 2px rgba(34, 139, 34, 0.4);
}
.card.has-buff-aura.attacking {
    border: 2px solid #228b22;
    filter: brightness(1.25);
    box-shadow: 0 0 12px 3px rgba(34, 139, 34, 0.5);
}
```

- [ ] Implementar
- [ ] Resolver `!important`
- [ ] Testar com Untamed Hunger, Angelic Gift
- [ ] Testar combo buff + atacante

---

#### C3. Equipment

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.has-equipment` | `0 0 0 3px #daa520, 0 0 12px 3px rgba(218,165,32,0.6)` + `!important` | Glow dourado + !important |
| `.card.has-equipment.attacking` | 3 camadas + `!important` | Mesmo padrão |

**Proposta:**
```css
.card.has-equipment {
    border: 2px solid #daa520;
    filter: brightness(1.15);
    box-shadow: 0 0 8px 2px rgba(218, 165, 32, 0.4);
}
.card.has-equipment.attacking {
    border: 2px solid #daa520;
    filter: brightness(1.25);
    box-shadow: 0 0 12px 3px rgba(218, 165, 32, 0.5);
}
```

- [ ] Implementar
- [ ] Resolver `!important`
- [ ] Testar com Marauder's Axe, Short Sword

---

#### C4. Land Aura

| Seletor | Efeito Atual | Problema |
|---------|-------------|----------|
| `.card.has-land-aura` | `0 0 0 2px #32cd32, 0 0 10px 3px rgba(50,205,50,0.5)` + `!important` | Mesmo padrão |

**Proposta:**
```css
.card.has-land-aura {
    border: 2px solid #32cd32;
    filter: brightness(1.15);
    box-shadow: 0 0 8px 2px rgba(50, 205, 50, 0.4);
}
```

- [ ] Implementar
- [ ] Resolver `!important`

---

### D. Efeitos Fora do Escopo Principal (UI, non-card)

Estes são efeitos em elementos que não são cartas no battlefield. Podem ser ajustados em fase posterior.

| # | Seletor | Efeito | Ação Sugerida |
|---|---------|--------|---------------|
| 1 | `.card-stats.buffed` | Glow verde pulsante (`buff-glow` 2s) | Remover pulsação, manter glow estático |
| 2 | `.card-stats.damaged` | Glow vermelho pulsante (`damage-pulse` 1.5s) | Remover pulsação, manter glow estático |
| 3 | `.card-stats.attack-buffed` | Glow laranja pulsante (`attack-buff-glow` 1s) | Remover pulsação, manter glow estático |
| 4 | `.continue-button` | Pulsação azul (`continueButtonPulse` 1.5s) | Manter — botão de ação precisa chamar atenção |
| 5 | `.turn-indicator.green/.red` | Pulsação (`turn-glow-*` 1.5s) | Manter — indicador de turno é informação crítica |
| 6 | `.mana-icon.floating-mana` | Glow dourado + scale (`floating-mana-glow` 0.8s) | Manter — feedback de mana produzida |
| 7 | `.player-avatar.avatar-damage` | Shake vermelho + `!important` | Manter — feedback de dano é momentâneo |
| 8 | `.player-avatar.avatar-heal` | Glow verde + `!important` | Manter — feedback de cura é momentâneo |
| 9 | Deck selection glows | Glow colorido por cor do deck | Manter — tela de seleção separada do jogo |

- [ ] Fase posterior: converter `.card-stats` pulsantes para glow estático

---

### E. Animações de Movimento (manter)

Estas animações NÃO são glows — são transições de posição que comunicam ações de combate.

| Seletor | Animação | Decisão |
|---------|----------|---------|
| `.attacking-animation` | Move para frente | Manter |
| `.blocking-animation` | Move para posição de bloqueio | Manter |

---

### F. View-Mode — Atualizar Overrides

Após converter os efeitos, verificar se os overrides em `#game-container.view-mode` ainda são necessários ou precisam de ajustes.

- [ ] Revisar todos os overrides view-mode após implementação
- [ ] Garantir que estados permanentes (aura, equipment, tapped) permaneçam visíveis
- [ ] Garantir que estados de combate/interação sejam neutralizados

---

## Ordem de Implementação

### Onda 1 — Segura (risco baixo, implementar direto)

| Fase | Items | Descrição |
|------|-------|-----------|
| **1.1** | B1 (playable) | Efeito simples na mão, fácil de testar |
| **1.2** | B7 (has-ability), B8 (mana-producer) | Efeitos de seleção no BF do jogador |
| **1.3** | B4 (selected-blocker), B5 (blocking) | Combate — bloqueio (estados confirmados) |
| **1.4** | C1–C4 (auras, equipment, land-aura) | Resolver `!important`, testar combos |

### Onda 2 — Com Teste (jogar 2-3 partidas para validar)

| Fase | Items | Descrição |
|------|-------|-----------|
| **2.1** | B2 (pending-cast) | Destaque da carta sendo conjurada |
| **2.2** | B3 (valid-target), B6 (valid-block-target) | **Crítico** — alvos que exigem ação imediata |
| **2.3** | Avaliar resultado da Onda 2 | Se legibilidade insuficiente → aplicar brightness pulsante em B3/B6 |

### Posterior

| Fase | Items | Descrição |
|------|-------|-----------|
| **3.1** | D (card-stats pulsantes) | Secundário, não-card |
| **3.2** | F (view-mode review) | Revisão final de consistência |

---

## Keyframes a Remover

Após implementação completa, estes keyframes podem ser deletados:

| Keyframe | Usado por | Fase |
|----------|----------|------|
| `pending-cast-pulse` | `.pending-cast` | Fase 4 |
| `pulse-target` | `.valid-target` | Fase 4 |
| `pulse-selected-blocker` | `.selected-blocker` | Fase 3 |
| `pulse-block-target` | `.valid-block-target` | Fase 3 |

**Manter** (não remover):
- `continueButtonPulse`, `turn-glow-green`, `turn-glow-red`, `floating-mana-glow` — UI feedback
- `avatar-shake`, `avatar-glow` — animações momentâneas
- `buff-glow`, `damage-pulse`, `attack-buff-glow` — converter para estático na Fase 6

---

## Checklist de Validação Final

- [ ] Nenhum efeito com `box-shadow` spread > 5px em cartas do BF
- [ ] Nenhum `!important` em seletores `.card.*`
- [ ] Nenhuma animação pulsante em `.card.*` (exceto se deliberadamente mantido)
- [ ] Todos os efeitos visíveis tanto no BF do jogador quanto no BF da IA
- [ ] View-mode neutraliza todos os efeitos de interação
- [ ] View-mode preserva estados permanentes (aura, equipment, tapped)
- [ ] Padrão sóbrio consistente: `border` + `brightness` + opcional `translateY` + opcional `box-shadow` sutil
