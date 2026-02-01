# Checklist de Verificação - Spells com Alvo

Este documento rastreia o fluxo completo de cada spell com alvo: mão → validação → seleção → resolução.

---

## Funções Críticas

| # | Função | Arquivo | Propósito |
|---|--------|---------|-----------|
| 1 | `spellNeedsTarget()` | game.js | "Esta carta precisa de alvo?" |
| 2 | `hasValidTargets()` | rules.js | "Existem alvos válidos?" (janela de prioridade) |
| 3 | `getValidSpellTargets()` | game.js | "QUAIS são os alvos?" (lista clicável) |
| 4 | `resolveSpellWithTarget()` | game.js | "O que acontece com o alvo?" |

**Regra:** Todo spell com alvo DEVE estar presente nas 4 funções (ou ter tratamento especial).

---

## Matriz de Verificação

### Buffs (Alvo: Própria Criatura)

| Spell | needsTarget | hasValid | getTargets | resolve | Status |
|-------|:-----------:|:--------:|:----------:|:-------:|:------:|
| moment_of_triumph | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| kindled_fury | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| snakeskin_veil | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| offer_immortality | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| adamant_will | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| giant_growth | ✅ | ✅ | ✅ | ✅ | ✅ OK (corrigido) |

### Remoção (Alvo: Criatura do Oponente)

| Spell | needsTarget | hasValid | getTargets | resolve | Status |
|-------|:-----------:|:--------:|:----------:|:-------:|:------:|
| moment_of_craving | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| heros_downfall | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| incinerating_blast | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| scorching_dragonfire | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| fiery_annihilation | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| murder | ✅ | ✅ | ✅ | ✅ | ✅ OK |

### Remoção Condicional

| Spell | needsTarget | hasValid | getTargets | resolve | Status |
|-------|:-----------:|:--------:|:----------:|:-------:|:------:|
| deadly_riposte | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| volley | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| elspeths_smite | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| broken_wings | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| angelic_edict | ✅ | ⚠️ default | ✅ | ✅ | ⚠️ Funciona (default true) |

### Debuffs / Bounce

| Spell | needsTarget | hasValid | getTargets | resolve | Status |
|-------|:-----------:|:--------:|:----------:|:-------:|:------:|
| fleeting_distraction | ✅ | ✅ | ❌ FALTA | ✅ | ❌ **BUG** |
| into_the_roil | ✅ | ✅ | ❌ FALTA | ✅ | ❌ **BUG** |

### Dois Alvos (Tratamento Especial)

| Spell | needsTarget | hasValid | getTargets | resolve | Status |
|-------|:-----------:|:--------:|:----------:|:-------:|:------:|
| felling_blow | ✅ | ✅ | ✅ (parcial) | ✅ | ✅ OK |
| bite_down | ✅ | ✅ | N/A (fluxo especial) | N/A | ✅ OK |

### Multi-Alvo (Tratamento em resolveSpell)

| Spell | needsTarget | hasValid | Tratamento | Status |
|-------|:-----------:|:--------:|:----------:|:------:|
| biogenic_upgrade | N/A | ✅ | resolveSpell + promptMultiTarget | ✅ OK |

### Alvo no Cemitério / Jogador

| Spell | needsTarget | hasValid | Tratamento | Status |
|-------|:-----------:|:--------:|:----------:|:------:|
| rise_again | N/A | ✅ | resolveSpell + prompt graveyard | ✅ OK |
| mind_rot | N/A | ✅ | resolveSpell (oponente auto) | ✅ OK |

### Counterspells (Alvo na Stack)

| Spell | needsTarget | hasValid | Tratamento | Status |
|-------|:-----------:|:--------:|:----------:|:------:|
| cancel | ✅ (keyword) | ✅ | Stack targeting | ✅ OK |
| essence_scatter | ✅ (keyword) | ✅ | Stack targeting (creature only) | ✅ OK |

---

## GAPS ENCONTRADOS

### ❌ BUG 1: `fleeting_distraction`
- **Problema:** Falta em `getValidSpellTargets()`
- **Sintoma:** Jogador não consegue selecionar alvo
- **Correção:** Adicionar case para retornar criaturas de ambos os campos

### ❌ BUG 2: `into_the_roil`
- **Problema:** Falta em `getValidSpellTargets()`
- **Sintoma:** Jogador não consegue selecionar alvo
- **Correção:** Adicionar case para retornar permanentes não-terreno

### ⚠️ MELHORIA: `angelic_edict`
- **Problema:** Falta em `hasValidTargets()` (usa default true)
- **Sintoma:** Janela de prioridade aparece mesmo sem alvos válidos
- **Correção:** Adicionar validação explícita

---

## Correções Necessárias

### game.js - `getValidSpellTargets()`

```javascript
// Adicionar antes do 'default':

case 'fleeting_distraction':
    // -1/-0 em qualquer criatura
    targets = [
        ...caster.battlefield.filter(c => c.type === 'creature'),
        ...opponent.battlefield.filter(c => c.type === 'creature' && this.rules.canBeTargetedBy(c, caster))
    ];
    break;

case 'into_the_roil':
    // Bounce qualquer permanente não-terreno
    targets = [
        ...caster.battlefield.filter(c => c.type !== 'land'),
        ...opponent.battlefield.filter(c => c.type !== 'land' && this.rules.canBeTargetedBy(c, caster))
    ];
    break;
```

### rules.js - `hasValidTargets()`

```javascript
// Adicionar validação para angelic_edict:

if (card.id === 'angelic_edict') {
    return opponent.battlefield.some(c =>
        c.type === 'creature' || c.type === 'enchantment'
    );
}
```

---

## Como Usar Esta Checklist

Ao adicionar um novo spell com alvo:

1. [ ] Adicionar em `spellNeedsTarget()` se precisa de alvo
2. [ ] Adicionar em `hasValidTargets()` com validação correta
3. [ ] Adicionar em `getValidSpellTargets()` para retornar alvos clicáveis
4. [ ] Adicionar em `resolveSpellWithTarget()` com o efeito
5. [ ] Testar manualmente no jogo
6. [ ] Atualizar esta checklist

---

*Última atualização: Fevereiro 2026*
