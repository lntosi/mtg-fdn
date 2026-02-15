# Plano de Ação: Sistema de Auras, Encantamentos e Equipamentos

## Resumo da Análise

Análise abrangente do sistema de auras/encantamentos/equipamentos realizada com 5 agentes de investigação + 3 agentes de revisão (consistência visual, elegância de código, clareza documental).

**Problema principal encontrado:** Inconsistência visual grave — auras em terrenos e equipamentos em criaturas possuem badges interativos (hover mostra preview da carta), mas auras em criaturas **não têm badge nenhum**, apenas uma borda colorida. O jogador não consegue inspecionar a aura anexada a uma criatura diretamente no campo de batalha.

---

## Inconsistência Visual Principal

### O que existe hoje (3 sistemas diferentes):

| Tipo | No campo | Badge interativo | Hover → Preview | Inspecionável |
|------|----------|-------------------|-----------------|---------------|
| **Aura em terreno** (New Horizons) | Borda verde + badge `✨` | Sim | Sim | Sim |
| **Equipamento em criatura** (Cutlass, Katana) | Borda dourada + badge `⚔` | Sim | Sim | Sim (dblclick re-equipa) |
| **Aura em criatura** (Pacifism, Untamed Hunger, etc.) | Apenas borda colorida | **Não** | **Não** | **Não** |

### O problema:
- Terrenos encantados com New Horizons têm um badge verde (`✨`) que ao hover mostra o preview da aura no painel lateral (`ui.js:1337-1343`)
- Equipamentos têm badge dourado (`⚔`) com hover → preview e até dblclick para re-equipar (`ui.js:1375-1397`)
- Auras em criaturas (Pacifism, Eaten by Piranhas, Untamed Hunger, Starlight Snare) **só têm `box-shadow`** — sem badge, sem hover direto, sem forma de inspecionar a aura no campo (`ui.js:1281-1307`)
- A única forma de ver a aura é fazer hover na **criatura** e ler o texto no preview lateral

### Código envolvido:
- `renderAttachedAurasOnLand()` (ui.js:1316-1349) — **tem badges** ✅
- `renderAttachedEquipments()` (ui.js:1353-1397) — **tem badges** ✅
- `renderAttachedAuras()` (ui.js:1265-1308) — **só borda, sem badges** ❌

---

## Catálogo Completo de Cartas

| Carta | Tipo | Custo | Efeito | Arquivo Principal |
|-------|------|-------|--------|-------------------|
| Pacifism | Aura | 1W | Criatura não ataca/bloqueia | rules.js:757 (`hasPacifism()` → `canAttackOrBlock()`) |
| Untamed Hunger | Aura | 2B | +2/+1, menace | rules.js:1187-1190 (bonuses) + rules.js:1341-1343 (keywords) |
| Eaten by Piranhas | Aura | 1U | Base 1/1, perde habilidades | rules.js:1221-1241 (override stats) + rules.js:1383-1389 (clear keywords) |
| New Horizons | Aura (Land) | 2G | Terreno produz 2 mana + ETB counter | rules.js:347-367 (mana) + triggers.js:193-217 (ETB `_handleNewHorizonsETB`) |
| Starlight Snare | Aura | 2U | Tapa criatura, não desvira | triggers.js:188-195 (ETB tap) + rules.js:1495-1512 (`canUntapCreature()`) |
| Goblin Oriflamme | Encantamento | 1R | +1/+0 a atacantes | rules.js:1125-1127 (`isAttacking` check) |
| Prayer of Binding | Encantamento | 3W | Exila permanente até sair | triggers.js:927-985 (ETB exile) + triggers.js:1532-1575 (onLeaveBattlefield retorna exilado) |
| Pirate's Cutlass | Equipamento | 3 | +2/+1, ETB equipa Pirata | triggers.js:498-524 (ETB) + game.js:3330-3393 (Equip 2) |
| Quick-Draw Katana | Equipamento | 2 | +2/+0, first strike no seu turno | rules.js:1176-1178 (bonuses) + game.js:3395-3440 (Equip 2) |

---

## Problemas Encontrados

### Bug 1: Array `attachedAuras` Redundante (Prioridade Média)
- **Local:** `game.js` linhas 663-664
- **Problema:** Quando uma aura resolve da stack, o código adiciona a aura a `stackItem.target.attachedAuras[]`. Porém, esse array **nunca é consultado** em nenhum lugar do código. O rastreamento real é feito via `card.attachedTo = creature.instanceId`.
- **Impacto:** Desperdício de memória, código confuso, possível fonte de inconsistência futura.
- **Correção:** Remover as 2 linhas que criam/populam `attachedAuras`. Confirmado: nenhuma outra referência no codebase.

### Bug 2: Detecção de Debuff Hardcoded e Duplicada (Prioridade Média)
- **Locais:** `ui.js:630-632` (preview panel) **E** `ui.js:1288-1290` (renderAttachedAuras)
- **Problema:** A mesma lógica de detecção de debuff está duplicada em 2 lugares. Usa IDs hardcoded (`pacifism`, `eaten_by_piranhas`) + heurística fallback. Starlight Snare depende da heurística (não está hardcoded).
- **Correção:** Centralizar em método `isAuraDebuff(aura)` + adicionar `isDebuff` nas definições de carta.

### Bug 3: Lógica de Badge Triplicada (Violação DRY)
- **Locais:** `renderAttachedAurasOnLand()`, `renderAttachedEquipments()`, e futuro `renderAttachedAuras()`
- **Problema:** Os 3 métodos repetem a mesma estrutura: criar container DOM → criar badges → adicionar hover events → appendChild. ~40 linhas duplicadas.
- **Correção:** Extrair helper `createAttachmentBadges()` compartilhado pelos 3 métodos.

### Bug 4: Métodos de Busca Quase Idênticos
- **Locais:** `getAttachedAuras()` (ui.js:702-708) e `getAttachedEquipments()` (ui.js:713-719)
- **Problema:** Idênticos exceto pelo filtro `subtype`.
- **Correção:** Extrair `getAttachedBySubtype(creature, subtype)` e manter os métodos atuais como wrappers.

---

## Edge Cases Verificados (OK)

| Cenário | Resultado | Status |
|---------|-----------|--------|
| Eaten by Piranhas + counter +1/+1 | Base 1/1 + bonus = 2/2 | OK |
| Pacifism + Eaten by Piranhas na mesma criatura | Ambos efeitos aplicados independentemente | OK |
| Starlight Snare durante combate | Não desfaz combate, previne untap no próximo turno | OK |
| New Horizons em múltiplos terrenos | Cada um produz 2 mana corretamente | OK |
| Criatura morre com múltiplas auras | Todas vão pro cemitério via `detachFromCreature()` | OK |
| Criatura morre com equipamento | Equipamento fica no campo (correto por regras MTG) | OK |
| Prayer of Binding exila criatura com aura | Aura vai pro cemitério, criatura retorna quando Prayer sai | OK |
| Angelic Edict pode exilar encantamento | Targeting inclui criaturas E encantamentos | OK |
| Criatura com aura E equipamento simultaneamente | Ambos rastreados independentemente via `attachedTo` | OK |

### Edge Cases a Verificar na Implementação
| Cenário | O que testar |
|---------|-------------|
| Criatura com aura + equipamento | Badges não colidem visualmente |
| Múltiplas auras na mesma criatura | Badges empilham corretamente com gap |
| Starlight Snare vs criatura com vigilance | Freeze deve ter prioridade (previne untap) |
| Remoção de Pacifism mid-game | Borda e badge devem desaparecer no próximo render |

---

## Plano de Ação

### Fase 1: Refatorar Infraestrutura de Badges (Prioridade Alta)

**Objetivo:** Criar infraestrutura compartilhada antes de adicionar novos badges, evitando triplicar código.

1. **Criar helper `createAttachmentBadges()` em `ui.js`**
   ```javascript
   createAttachmentBadges(attachments, containerClass, badgeClass, iconGetter) {
       const container = document.createElement('div');
       container.className = containerClass;
       attachments.forEach((attachment) => {
           const badge = document.createElement('div');
           badge.className = badgeClass;
           badge.textContent = iconGetter(attachment);
           badge.title = attachment.name;
           badge.addEventListener('mouseenter', (e) => {
               e.stopPropagation();
               this.showCardPreview(attachment);
           });
           badge.addEventListener('mouseleave', (e) => {
               e.stopPropagation();
               this.hideCardPreview();
           });
           container.appendChild(badge);
       });
       return container;
   }
   ```

2. **Criar helper `getAttachedBySubtype(creature, subtype)` em `ui.js`**
   ```javascript
   getAttachedBySubtype(creature, subtype) {
       if (!this.game) return [];
       const all = [...this.game.player.battlefield, ...this.game.opponent.battlefield];
       return all.filter(c => c.subtype === subtype && c.attachedTo === creature.instanceId);
   }
   ```
   - `getAttachedAuras()` e `getAttachedEquipments()` passam a chamar este helper

3. **Criar método `isAuraDebuff(aura)` em `ui.js`**
   ```javascript
   isAuraDebuff(aura) {
       if (aura.isDebuff !== undefined) return aura.isDebuff;
       // Fallback heurístico para auras sem campo isDebuff
       const auraController = this.game.player.battlefield.includes(aura)
           ? this.game.player : this.game.opponent;
       const targetCreature = /* busca criatura pelo attachedTo */;
       const creatureController = this.game.player.battlefield.includes(targetCreature)
           ? this.game.player : this.game.opponent;
       return auraController !== creatureController && !aura.text?.includes('+');
   }
   ```
   - Substituir lógica hardcoded em `ui.js:630-632` e `ui.js:1288-1290`

4. **Refatorar `renderAttachedAurasOnLand()` e `renderAttachedEquipments()`** para usar `createAttachmentBadges()`
   - Manter comportamento idêntico, apenas eliminar duplicação
   - Equipamento mantém lógica extra de dblclick re-equip (adicionada após criação do badge)

### Fase 2: Adicionar Badges de Aura em Criaturas (Prioridade Alta)

5. **Atualizar `renderAttachedAuras()` em `ui.js`** (~linhas 1265-1308)
   - Manter a borda colorida (verde/vermelha) que já existe
   - Adicionar badges usando `createAttachmentBadges()`
   - Ícone: `✨` (reutilizar o mesmo dos terrenos para consistência visual)
   - Diferenciação por cor do badge: verde para buff, vermelho para debuff

6. **Adicionar CSS para badges de aura em criaturas** em `style.css`

   **Posicionamento:** Top-left (evita colisão com equipment-indicators que ficam top-center)
   ```css
   .creature-aura-indicators {
       position: absolute;
       top: -6px;
       left: -6px;
       display: flex;
       gap: 2px;
       z-index: 20;
   }
   ```

   **Badge buff (verde):** Mesmo estilo do `.land-aura-badge` para consistência
   ```css
   .creature-aura-badge {
       width: 18px;
       height: 18px;
       border-radius: 50%;
       display: flex;
       align-items: center;
       justify-content: center;
       font-size: 10px;
       cursor: pointer;
       transition: transform 0.2s, box-shadow 0.2s;
   }
   .creature-aura-badge.buff {
       background: linear-gradient(135deg, #228b22 0%, #32cd32 50%, #228b22 100%);
       border: 2px solid #90ee90;
       box-shadow: 0 0 6px rgba(50, 205, 50, 0.8);
   }
   .creature-aura-badge.debuff {
       background: linear-gradient(135deg, #8b0000 0%, #dc143c 50%, #8b0000 100%);
       border: 2px solid #ff6b6b;
       box-shadow: 0 0 6px rgba(220, 20, 60, 0.8);
   }
   .creature-aura-badge:hover {
       transform: scale(1.2);
   }
   ```

### Fase 3: Limpeza de Dados

7. **Adicionar campo `isDebuff` nas definições de aura** em `cards.js`
   - Pacifism: `isDebuff: true`
   - Eaten by Piranhas: `isDebuff: true`
   - Starlight Snare: `isDebuff: true`
   - Untamed Hunger: `isDebuff: false`
   - New Horizons: `isDebuff: false`

8. **Remover `attachedAuras` redundante** em `game.js` (linhas 663-664)
   - Remover as 2 linhas que criam/populam o array

### Fase 4: Documentação
9. Atualizar este documento após implementação

---

## Critérios de Aceitação

### Fase 1 completa quando:
- [ ] `createAttachmentBadges()` existe e é chamado por todos os 3 métodos de render
- [ ] `getAttachedBySubtype()` existe e é usado por `getAttachedAuras()` e `getAttachedEquipments()`
- [ ] `isAuraDebuff()` existe e substituiu lógica duplicada em ambos os locais (preview + render)
- [ ] Comportamento existente de badges em terrenos e equipamentos não mudou (regressão zero)

### Fase 2 completa quando:
- [ ] Criatura com aura buff mostra badge verde `✨` no canto superior esquerdo
- [ ] Criatura com aura debuff mostra badge vermelho `✨` no canto superior esquerdo
- [ ] Hover no badge exibe preview da aura no painel lateral
- [ ] Criatura com aura + equipamento mostra ambos badges sem sobreposição
- [ ] Múltiplas auras na mesma criatura empilham badges horizontalmente com gap
- [ ] Funciona corretamente em zoom 70-80% do navegador

### Fase 3 completa quando:
- [ ] Todas as 5 auras têm campo `isDebuff` em `cards.js`
- [ ] Array `attachedAuras` removido de `game.js`
- [ ] Nenhuma referência residual a `attachedAuras` no codebase

---

## Cenários de Teste

| # | Cenário | Validação |
|---|---------|-----------|
| 1 | Criatura com Untamed Hunger | Badge verde `✨` top-left, hover mostra preview |
| 2 | Criatura com Pacifism | Badge vermelho `✨` top-left, hover mostra preview |
| 3 | Criatura com Pirate's Cutlass | Badge `⚔` top-center (existente, sem mudança) |
| 4 | Criatura com aura + equipamento | Badge aura top-left + badge equip top-center, sem colisão |
| 5 | Criatura com 2 auras | 2 badges empilhados horizontalmente |
| 6 | Terreno com New Horizons | Badge verde `✨` top-right (existente, sem mudança) |
| 7 | Remoção de aura (criatura morre) | Badge desaparece no próximo render |
| 8 | Eaten by Piranhas em criatura | Badge vermelho + borda vermelha + stats 1/1 no preview |

---

## Arquitetura do Sistema (Referência)

```
Fluxo de uma Aura sendo jogada:
  1. game.js: playAura() → valida alvo, paga mana
  2. game.js: attachAura() → seta card.attachedTo, coloca no battlefield
  3. triggers.js: resolveETB() → efeitos de entrada (New Horizons counter, Starlight Snare tap)
  4. rules.js: getCreatureBonuses() → aplica buffs/debuffs estáticos
  5. ui.js: render() → mostra indicadores visuais (bordas, badges)

Fluxo de remoção (criatura morre):
  1. game.js: detachFromCreature() →
     - Auras → cemitério + unregisterSpecialEffect()
     - Equipamentos → ficam no campo, perdem attachedTo
  2. triggers.js: onLeaveBattlefield() → efeitos de saída (Prayer of Binding retorna exilado)
  3. ui.js: render() → atualiza visual

Posicionamento dos badges no campo:
  - Aura em criatura: top-left (-6px, -6px)
  - Equipamento em criatura: top-center (-8px, 50%)
  - Aura em terreno: top-right (-6px, -6px)
```

---

*Documento gerado em 15/02/2026. Análise: 5 agentes. Revisão: 3 agentes (visual, código, documentação).*
