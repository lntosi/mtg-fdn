# Plano de Ação: Uniformização Visual de Habilidades Ativadas

## Resumo da Análise

Varredura com 3 agentes + revisão com 3 agentes (UX/Design, Arquitetura de Código, Completude/Precisão).

**Problema principal:** O sistema visual atual usa um único indicador genérico (roxo + `⚡`) para todas as habilidades ativadas, sem distinguir tipo ou timing. O indicador desaparece quando a habilidade não pode ser ativada, fazendo o jogador perder a informação de que a criatura TEM uma habilidade. Treasure Token é tratado inconsistentemente.

**Bug encontrado:** Mystic Archaeologist tem lógica em `game.js:canActivateAbility()` e `activateAbility()` mas **não existe em `cards.js`** (carta fantasma — nunca aparece no jogo).

---

## Estado Atual — 4 Sistemas Visuais Inconsistentes

| Sistema | Cor | Ícone | Interação | Quando Aparece |
|---------|-----|-------|-----------|----------------|
| Habilidade ativada (genérica) | Roxo `#9b59b6` | `⚡` (bottom-left) | Dblclick | Só quando pode ativar AGORA |
| Produtor de mana (`tap_for_mana`) | Verde `#2ecc71` | `✓` (selecionado) | Click | Quando não tapado |
| Re-equipar equipamento | Dourado (pulsa) | `⚔` badge | Dblclick no badge | Só quando pode re-equipar |
| Habilidade do cemitério | Verde `#2ecc71` | Botão "Ativar" | Click no botão | Quando cemitério aberto |
| *Ability highlight (animação)* | Cyan `#00bfff` | *Pulsante* | *Informativo* | *Contexto específico* |

### Problemas identificados:

1. **Sem distinção por tipo**: Tap, sacrifício, combat-only — tudo é `⚡` roxo
2. **Indicador desaparece**: Quando não pode ativar (sem mana, SS, fase errada), o `⚡` some
3. **Treasure Token inconsistente**: Produz mana como Llanowar Elves, mas usa sistema roxo
4. **Sem indicação de custo**: Jogador precisa ler o preview para saber o custo

---

## Catálogo Completo

### Campo de Batalha — Produtores de Mana (5)

| # | Carta | Custo | Efeito | Sistema Visual Atual |
|---|-------|-------|--------|---------------------|
| 1 | Llanowar Elves | T | +1 G | Verde (mana-producer) |
| 2 | Druid of the Cowl | T | +1 G | Verde (mana-producer) |
| 3 | Elvish Archdruid | T | +G por Elfo | Verde (mana-producer) + Roxo (dual) |
| 4 | Carnelian Orb of Dragonkind | T | +1 R (haste se Dragon) | Verde (mana-producer) |
| 5 | **Treasure Token** | Sac | +1 qualquer cor | **Roxo (inconsistente)** |

### Campo de Batalha — Habilidades Ativadas (11)

| # | Carta | Custo | Tap? | Sac? | Timing | Efeito |
|---|-------|-------|------|------|--------|--------|
| 6 | Vampire Neonate | 2+T | Sim | Não | Qualquer | Drena 1 vida |
| 7 | Goblin Smuggler | T | Sim | Não | Qualquer | Criatura p≤2 imbloqueável |
| 8 | Spectral Sailor | 3U | **Não** | Não | Instant speed | Compra 1 carta |
| 9 | ~~Mystic Archaeologist~~ | ~~3UU~~ | — | — | — | **BUG: não existe em cards.js** |
| 10 | Wildheart Invoker | 8 | Não | Não | Qualquer | +5/+5 trample em criatura |
| 11 | Dropkick Bomber | R | Não | Não | Qualquer | Goblin ganha flying |
| 12 | Mild-Mannered Librarian | 3G | Não | Não | Uma vez | Transform + counters + draw |
| 13 | Thrashing Brontodon | 1+Sac | Não | Sim | Qualquer | Destrói artefato/encantamento |
| 14 | Goblin Firebomb | 7+T+Sac | Sim | Sim | Qualquer | Destrói permanente |
| 15 | Jazal Goldmane | 3WW | Não | Não | **Só combate** | Atacantes +X/+X |
| 16 | Ingenious Leonin | 3W | Não | Não | **Só combate** | +1/+1 counter em atacante |

### Equipamentos — Equip (2)

| # | Carta | Custo | Timing | Sistema Visual Atual |
|---|-------|-------|--------|---------------------|
| 17 | Pirate's Cutlass | Equip 2 | Main phase (sorcery) | Dourado (badge ⚔) |
| 18 | Quick-Draw Katana | Equip 2 | Main phase (sorcery) | Dourado (badge ⚔) |

### Cemitério (2)

| # | Carta | Custo | Timing | Sistema Visual Atual |
|---|-------|-------|--------|---------------------|
| 19 | Reassembling Skeleton | 1B | Instant speed | Botão verde "Ativar" |
| 20 | Suspicious Shambler | 4BB | Sorcery speed | Botão verde "Ativar" |

### Tokens Completos (7 tipos)

| Token | Tipo | Stats | Habilidade | Criado por |
|-------|------|-------|------------|------------|
| **Treasure Token** | Artifact | — | Sac: +1 mana | Corsair Captain, Rapacious Dragon, Seize the Spoils |
| Cat Token | Creature | 1/1 | — | Cubwarden, Leonin Warleader |
| Elf Warrior Token | Creature | 1/1 | — | Dwynen's Elite |
| Zombie Token | Creature | 2/2 | — | Maalfeld Twins, Suspicious Shambler |
| Goblin Token | Creature | 1/1 | — | Dragon Fodder |
| Faerie Token | Creature | 1/1 flying | — (keyword passiva) | Mischievous Mystic |
| Skeleton Token | Creature | 1/1 | — | Skeleton Archer |

---

## Proposta: Sistema Visual Revisado

### Decisões da revisão:

1. **Metadata em `cards.js`** (não listas hardcoded em `ui.js`) — seguir padrão de `isDebuff`
2. **CSS com modificadores BEM** (`.has-ability.inactive`) — sem duplicar posicionamento
3. **Categoria combate (laranja) ADIADA** — apenas 2 cartas, overdesign; usar tooltip por enquanto
4. **Estado inativo**: badge opaco (mantido) — importante para aprendizado

### 2 Categorias visuais no campo de batalha:

```
 CATEGORIA A: PRODUTOR DE MANA          CATEGORIA B: HABILIDADE ATIVADA
 (gera mana via tap ou sacrifice)       (efeito não-mana)

  Verde #2ecc71                           Roxo #9b59b6
  Click para selecionar                   Dblclick para ativar
  Sem badge (glow + ✓ quando selecionado) Badge ⚡ (bottom-left, 28px)

  Cartas:                                 Cartas:
  - Llanowar Elves (T: +G)               - Vampire Neonate (2+T: drain)
  - Druid of the Cowl (T: +G)            - Goblin Smuggler (T: imbloqueável)
  - Elvish Archdruid (T: +G×Elfos)       - Spectral Sailor (3U: draw)
  - Carnelian Orb (T: +R)                - Wildheart Invoker (8: buff)
  - Treasure Token (Sac: +qualquer) ←NEW - Dropkick Bomber (R: flying)
                                          - Mild-Mannered Librarian (3G: transform)
                                          - Thrashing Brontodon (1+Sac: destroy)
                                          - Goblin Firebomb (7+T+Sac: destroy)
                                          - Jazal Goldmane (3WW: combate)*
                                          - Ingenious Leonin (3W: combate)*

  * tooltip indica "Só durante combate"
```

### Estado ativo vs inativo (padrão BEM):

```
 PODE ATIVAR AGORA                    NÃO PODE (mas TEM habilidade)

 ┌──────────┐                         ┌──────────┐
 │          │  glow roxo              │          │  sem glow
 │ Criatura │  cursor: pointer        │ Criatura │  cursor: default
 │     ⚡   │  opacity: 1             │     ⚡   │  opacity: 0.4 + grayscale
 └──────────┘  dblclick ativa         └──────────┘  tooltip: motivo

 CSS: .has-ability                    CSS: .has-ability.inactive
```

---

## Plano de Ação

### Fase 0: Corrigir Bug — Mystic Archaeologist

1. **Investigar** se Mystic Archaeologist deveria existir em `cards.js` (deck Wizards?)
   - Se sim: adicionar carta completa ao deck
   - Se não: remover lógica morta de `game.js` (`canActivateAbility` e `activateAbility`)

### Fase 1: Metadata em `cards.js`

**Objetivo:** Declarar habilidades ativadas na definição da carta (fonte única de verdade).

2. Adicionar campo `hasActivatedAbility: true` em **todas** as cartas com habilidade ativada:
   - Vampire Neonate, Goblin Smuggler, Spectral Sailor, Wildheart Invoker
   - Dropkick Bomber, Mild-Mannered Librarian, Thrashing Brontodon, Goblin Firebomb
   - Jazal Goldmane, Ingenious Leonin
   - Elvish Archdruid (além de `tap_for_mana`)

3. Adicionar `activationTiming` para cartas com restrição:
   - Jazal Goldmane: `activationTiming: "combat"`
   - Ingenious Leonin: `activationTiming: "combat"`
   - (demais: implícito "any")

### Fase 2: Helpers em `game.js`

4. Criar método `hasActivatedAbility(card)`:
   ```javascript
   hasActivatedAbility(card) {
       return card.hasActivatedAbility === true;
   }
   ```

### Fase 3: Unificar Treasure Token com Produtores de Mana

**Objetivo:** Treasure Token usa visual verde (como Llanowar Elves), não roxo.

5. Em `ui.js`, na renderização de permanentes:
   - Artefatos com `sacrifice_for_mana` recebem `.mana-producer-selectable`
   - Click seleciona para mana (mesmo padrão de Llanowar Elves)
   - **Risco para IA: ZERO** — lógica da IA é baseada em keywords, não CSS classes

6. Em `css/style.css`:
   - Garantir que `.mana-producer-selectable` funcione em artefatos (verificar seletores)

### Fase 4: Estado Inativo com CSS BEM

**Objetivo:** Criaturas com habilidade SEMPRE mostram indicador.

7. Refatorar CSS usando modificadores (sem duplicar posicionamento):
   ```css
   /* Base (posicionamento definido uma vez) */
   .card.has-ability::after {
       content: '⚡';
       position: absolute;
       bottom: 28px;
       left: 4px;
       background: linear-gradient(135deg, #9b59b6, #8e44ad);
       color: white;
       font-size: 0.8em;
       padding: 2px 5px;
       border-radius: 4px;
       z-index: 10;
   }

   /* Ativo: glow + cursor */
   .card.has-ability {
       box-shadow: 0 0 15px 5px #9b59b6;
       cursor: pointer;
   }

   /* Inativo: sem glow, badge opaco */
   .card.has-ability.inactive {
       box-shadow: none;
       cursor: default;
   }
   .card.has-ability.inactive::after {
       opacity: 0.4;
       filter: grayscale(1);
   }
   ```

8. Em `ui.js`, atualizar lógica de renderização:
   ```javascript
   const hasAbility = this.game.hasActivatedAbility(card);
   const canActivate = this.game.canActivateAbility(card, player);

   if (hasAbility) {
       cardEl.classList.add('has-ability');
       if (canActivate) {
           cardEl.addEventListener('dblclick', () =>
               this.game.activateAbility(card, player));
           cardEl.title = 'Clique duplo para ativar habilidade';
       } else {
           cardEl.classList.add('inactive');
           cardEl.title = this.getInactivationReason(card);
       }
   }
   ```

9. Criar `getInactivationReason(card)` em `ui.js`:
   - Tapado → "Habilidade indisponível: tapado"
   - Summoning sickness → "Habilidade indisponível: enjoo de invocação"
   - Sem mana → "Habilidade indisponível: mana insuficiente"
   - Fase errada → "Habilidade só pode ser ativada durante combate"
   - Perdeu habilidades → não mostra badge (Eaten by Piranhas)

### Fase 5: Equipamentos e Cemitério (Sem Mudanças)

10. **Equipamentos** já têm badge dourado `⚔` próprio — manter como está.
11. **Cemitério** já tem botão verde "Ativar" — manter como está.

### Fase 6: Documentação

12. Atualizar este documento após implementação.
13. Atualizar `CLAUDE.md` com novos campos de metadata (`hasActivatedAbility`, `activationTiming`).

---

## Critérios de Aceitação

### Fase 0:
- [x] Mystic Archaeologist resolvido (adicionado ao deck Wizards em sessão anterior)

### Fase 1:
- [x] Todas as cartas com habilidade ativada têm `hasActivatedAbility: true` em `cards.js`
- [x] Jazal e Leonin têm `activationTiming: "combat"`

### Fase 2:
- [x] `game.hasActivatedAbility(card)` existe e retorna `true` para cartas corretas

### Fase 3:
- [x] Treasure Token usa visual verde, click ativa para mana
- [x] IA continua usando Treasure normalmente (215 testes passam)

### Fase 4:
- [x] Criatura com habilidade que pode ativar: `⚡` roxo brilhante + glow + dblclick
- [x] Criatura com habilidade que não pode ativar: `⚡` cinza opaco + tooltip com motivo
- [x] Badge permanece visível em todas as fases
- [x] Eaten by Piranhas: sem badge (perdeu habilidades)
- [ ] Funciona em zoom 70-80% (a verificar manualmente)

---

## Cenários de Teste

| # | Cenário | Validação |
|---|---------|-----------|
| 1 | Treasure Token no campo | Visual verde, click seleciona para mana |
| 2 | Llanowar Elves no campo | Visual verde, click seleciona (sem mudança) |
| 3 | Vampire Neonate com mana | `⚡` roxo brilhante, dblclick ativa |
| 4 | Vampire Neonate sem mana | `⚡` cinza opaco, tooltip "mana insuficiente" |
| 5 | Vampire Neonate tapado | `⚡` cinza opaco, tooltip "tapado" |
| 6 | Vampire Neonate com summoning sickness | `⚡` cinza opaco, tooltip "enjoo de invocação" |
| 7 | Spectral Sailor com summoning sickness | `⚡` roxo ativo (ignora SS, não requer tap) |
| 8 | Jazal Goldmane fora de combate | `⚡` cinza opaco, tooltip "só durante combate" |
| 9 | Jazal Goldmane em combate com mana | `⚡` roxo brilhante, dblclick ativa |
| 10 | Thrashing Brontodon com Eaten by Piranhas | Sem badge (perdeu habilidades) |
| 11 | Equipamento com equip disponível | `⚔` dourado pulsando (sem mudança) |
| 12 | Graveyard com Reassembling Skeleton | Botão verde "Ativar" (sem mudança) |
| 13 | Elvish Archdruid (dual: mana + habilidade) | Verde mana-producer (prioridade mana) |
| 14 | Criatura com aura + equip + habilidade | 3 badges sem sobreposição |

---

## Diagrama de Posicionamento

```
          CRIATURA COM TODOS OS BADGES (cenário máximo)

                       ⚔ (equipment)
                     top-center, -8px
          ┌─────────────────────────┐
     ✨   │                         │
  (aura)  │       CRIATURA          │
 top-left │                         │
  -6,-6   │                         │
          │  ⚡                      │  ← badge habilidade
          │  bottom-left, 28px       │    (posição existente)
          └─────────────────────────┘


          TREASURE TOKEN (após Fase 3)

          ┌─────────────────────────┐
          │                         │
          │    TREASURE TOKEN       │  visual verde
          │    (click = mana)       │  como Llanowar Elves
          │                         │
          └─────────────────────────┘
```

---

*Documento gerado em 15/02/2026. Análise: 3 agentes. Revisão: 3 agentes (UX/Design, Arquitetura, Completude).*
*Implementado em 15/02/2026.*
