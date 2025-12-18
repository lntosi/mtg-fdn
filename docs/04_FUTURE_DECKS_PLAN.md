# Plano de Implementação - 5 Decks Restantes da Beginner Box

Este documento descreve o plano para adicionar os 5 decks Jumpstart restantes da Foundations Beginner Box.

## Decks Atuais (Implementados)
- ✅ Cats (Branco)
- ✅ Goblins (Vermelho)
- ✅ Vampires (Preto)
- ✅ Elves (Verde)
- ✅ Pirates (Azul)

## Decks a Implementar

| Deck | Cor | Mecânica Principal | Complexidade |
|------|-----|-------------------|--------------|
| **Healing** | Branco | Lifegain triggers | Média |
| **Wizards** | Azul | Kicker, spell synergy | Alta |
| **Undead** | Preto | Graveyard recursion | Alta |
| **Inferno** | Vermelho | Dragon tribal, cost reduction | Média |
| **Primal** | Verde | Fight, +1/+1 counters | Média |

---

## 1. HEALING (Branco) - Lifegain Triggers

### Cards (20)
| Card | Tipo | P/T | Habilidade |
|------|------|-----|------------|
| Plains | Land | - | Produz W |
| Uncharted Haven | Land | - | Produz cor escolhida |
| Ajani's Pridemate | Creature | 2/2 | Lifegain → +1/+1 counter |
| Ancestor Dragon | Creature | 5/6 | Flying, atacantes dão vida |
| Bishop's Soldier | Creature | 2/2 | Lifelink |
| Dazzling Angel | Creature | 2/3 | Flying, lifegain → untap |
| Herald of Faith | Creature | 4/3 | Flying, ataca → gain 2 life |
| Hinterland Sanctifier | Creature | 3/2 | ETB: gain 1 life |
| Inspiring Overseer | Creature | 2/1 | Flying, ETB: draw + gain 1 life |
| Twinblade Paladin | Creature | 3/3 | Double strike se life >= starting |
| Adamant Will | Instant | - | +2/+2 e indestructible |
| Deadly Riposte | Instant | - | Destroy tapped creature |
| Prayer of Binding | Enchantment | - | Exile creature/planeswalker, lifegain ETB |
| Quick-Draw Katana | Artifact | - | Equipment: first strike |

### Mecânicas Novas Necessárias

#### 1. Lifegain Triggers
```javascript
// triggers.js - novo método
onLifeGain(player, amount) {
    player.battlefield.forEach(card => {
        // Ajani's Pridemate - +1/+1 counter
        if (card.id === 'ajanis_pridemate') {
            card.counters.plusOnePlusOne++;
        }

        // Dazzling Angel - untap
        if (card.id === 'dazzling_angel') {
            card.tapped = false;
        }
    });
}
```

#### 2. Condicional baseado em vida inicial
```javascript
// rules.js - Twinblade Paladin
if (creature.id === 'twinblade_paladin' && controller.life >= 20) {
    keywords.push('double_strike');
}
```

#### 3. "Destroy tapped creature" (Deadly Riposte)
- Novo filtro em `getValidSpellTargets()` para criaturas viradas

### Arquivos a Modificar
- `cards.js` - Definições das cartas
- `triggers.js` - `onLifeGain()`, ETBs
- `rules.js` - Twinblade Paladin condicional
- `game.js` - Spells (Deadly Riposte, Adamant Will)
- Chamar `onLifeGain()` em todos os lugares que ganham vida

### Estimativa de Esforço: **Médio**
- 1 mecânica nova (lifegain triggers)
- Maioria das cartas usa padrões existentes

---

## 2. WIZARDS (Azul) - Kicker e Spell Synergy

### Cards (20)
| Card | Tipo | P/T | Habilidade |
|------|------|-----|------------|
| Island | Land | - | Produz U |
| Uncharted Haven | Land | - | Produz cor escolhida |
| Burrog Befuddler | Creature | 1/1 | Flash, ETB: -1/-0 |
| Clinquant Skymage | Creature | 2/2 | Flying, ETB: create treasure if 5+ instants/sorceries in graveyard |
| Erudite Wizard | Creature | 2/1 | Attack trigger: scry 1 |
| Exclusion Mage | Creature | 2/2 | ETB: bounce opponent creature |
| Icewind Elemental | Creature | 3/4 | Flying, ETB: tap + freeze |
| Mischievous Mystic | Creature | 2/1 | Flying, spellcast → +1/+1 counter |
| Mystic Archaeologist | Creature | 2/1 | {3}{U}{U}: Draw 2 |
| Arcane Epiphany | Instant | - | Draw 3 |
| Fleeting Distraction | Instant | - | -1/-0, draw |
| Into the Roil | Instant | - | Bounce, **Kicker**: draw |
| Quick Study | Instant | - | Flash, draw 2 |
| Starlight Snare | Enchantment | - | Exile tapped creature |

### Mecânicas Novas Necessárias

#### 1. Kicker
```javascript
// game.js - Sistema de Kicker
async resolveSpellWithKicker(card, caster, target) {
    // Verificar se pode pagar kicker
    const canKick = this.rules.canPayKicker(card, caster);

    if (canKick && caster === this.player) {
        const wantsKicker = await this.ui.promptYesNo({
            title: `${card.name} - Kicker`,
            description: 'Pagar custo de Kicker?'
        });
        card.kicked = wantsKicker;
    }

    // Resolver com ou sem kicker
    // Into the Roil: bounce + draw if kicked
}
```

#### 2. Contar instants/sorceries no cemitério
```javascript
// Para Clinquant Skymage
const spellCount = caster.graveyard.filter(c =>
    c.type === 'instant' || c.type === 'sorcery'
).length;
```

#### 3. Spellcast trigger (diferente de Brineborn)
```javascript
// Mischievous Mystic - trigger em qualquer spell, não só no turno do oponente
onAnySpellCast(caster) {
    caster.battlefield.forEach(card => {
        if (card.id === 'mischievous_mystic') {
            card.counters.plusOnePlusOne++;
        }
    });
}
```

### Arquivos a Modificar
- `cards.js` - Definições com `kickerCost`
- `game.js` - Sistema de Kicker, activated abilities
- `triggers.js` - ETBs, spellcast triggers
- `rules.js` - Verificação de kicker cost

### Estimativa de Esforço: **Alto**
- Kicker é mecânica nova complexa
- Vários triggers condicionais

---

## 3. UNDEAD (Preto) - Graveyard Recursion

### Cards (20)
| Card | Tipo | P/T | Habilidade |
|------|------|-----|------------|
| Swamp | Land | - | Produz B |
| Uncharted Haven | Land | - | Produz cor escolhida |
| Crow of Dark Tidings | Creature | 2/1 | Flying, ETB/death: mill 2 |
| Death Baron | Creature | 2/2 | Lord: Skeletons/Zombies +1/+1 e deathtouch |
| Diregraf Ghoul | Creature | 2/2 | Enters tapped |
| Hungry Ghoul | Creature | 2/2 | Sacrifice another: +2/+1 |
| Maalfeld Twins | Creature | 4/4 | Death: create two 2/2 Zombies |
| Reassembling Skeleton | Creature | 1/1 | {1}{B}: Return from graveyard to battlefield tapped |
| Skeleton Archer | Creature | 3/3 | ETB: 1 damage to any target |
| Suspicious Shambler | Creature | 2/3 | Morbid: enters untapped |
| Deadly Plot | Instant | - | Destroy creature, create treasure |
| Undying Malice | Instant | - | Target creature gains "dies → return with +1/+1 counter" |
| Cemetery Recruitment | Sorcery | - | Return creature from graveyard, draw if Zombie |
| Eaten Alive | Sorcery | - | Exile creature, sacrifice cost reduction |

### Mecânicas Novas Necessárias

#### 1. Ativação do Cemitério
```javascript
// Reassembling Skeleton - ativar do cemitério
canActivateAbility(card, player) {
    // Verificar se está no cemitério E se é Reassembling Skeleton
    if (card.id === 'reassembling_skeleton' && player.graveyard.includes(card)) {
        return this.rules.canPayMana({B: 1, generic: 1}, player);
    }
}
```

#### 2. Sacrifice como custo
```javascript
// Hungry Ghoul, Eaten Alive
async paySacrificeCost(player, filter = 'creature') {
    const validSacrifices = player.battlefield.filter(c => c.type === filter);
    const chosen = await this.ui.promptTriggerTarget({
        title: 'Sacrificar Criatura',
        validTargets: validSacrifices
    });
    this.destroyPermanent(chosen, player);
}
```

#### 3. Mill (colocar do topo do grimório no cemitério)
```javascript
// Crow of Dark Tidings
mill(player, amount) {
    for (let i = 0; i < amount && player.library.length > 0; i++) {
        const card = player.library.shift();
        player.graveyard.push(card);
    }
}
```

#### 4. Morbid (verificar se criatura morreu este turno)
```javascript
// Já temos flags similares para Bloodtithe Collector
// creatureDiedThisTurn = true quando uma criatura morre
```

#### 5. "Undying" temporário (Undying Malice)
```javascript
// Flag na criatura: returnOnDeath = true
// Em onCreatureDeath: verificar flag, retornar com +1/+1
```

### Arquivos a Modificar
- `cards.js` - Definições
- `game.js` - Sacrifice cost, graveyard activation
- `triggers.js` - Death triggers complexos, ETBs
- `rules.js` - Mill, Morbid check

### Estimativa de Esforço: **Alto**
- Ativação do cemitério é mecânica nova
- Sacrifice como custo é complexo
- Múltiplos death triggers interativos

---

## 4. INFERNO (Vermelho) - Dragon Tribal

### Cards (20)
| Card | Tipo | P/T | Habilidade |
|------|------|-----|------------|
| Mountain | Land | - | Produz R |
| Uncharted Haven | Land | - | Produz cor escolhida |
| Dragonlord's Servant | Creature | 1/3 | Dragon spells cost {1} less |
| Fire Elemental | Creature | 5/4 | - (Vanilla) |
| Firespitter Whelp | Creature | 2/2 | Flying, attack: 1 damage to any target |
| Kargan Dragonrider | Creature | 3/4 | Flying if controlling Dragon |
| Rapacious Dragon | Creature | 3/3 | Flying, ETB: create 2 treasures |
| Skyraker Giant | Creature | 4/3 | Reach |
| Terror of Mount Velus | Creature | 5/5 | Flying, double strike, ETB: creatures gain double strike |
| Fiery Annihilation | Instant | - | 5 damage to creature |
| Scorching Dragonfire | Instant | - | 3 damage, exile if dies |
| Seize the Spoils | Sorcery | - | Discard, draw 2, create treasure |
| Carnelian Orb of Dragonkind | Artifact | - | {T}: Add R, Dragons have haste |

### Mecânicas Novas Necessárias

#### 1. Cost Reduction para tipo de criatura
```javascript
// rules.js - Similar ao Tolarian Terror
getSpellCost(card, player) {
    let cost = {...card.cost};

    // Dragonlord's Servant: Dragons cost {1} less
    if (card.subtype?.includes('Dragon')) {
        player.battlefield.forEach(c => {
            if (c.id === 'dragonlords_servant') {
                cost.generic = Math.max(0, (cost.generic || 0) - 1);
            }
        });
    }
    return cost;
}
```

#### 2. Condicional baseado em controlar tipo
```javascript
// Kargan Dragonrider: flying if you control a Dragon
if (creature.id === 'kargan_dragonrider') {
    const hasDragon = controller.battlefield.some(c =>
        c.subtype?.includes('Dragon')
    );
    if (hasDragon) keywords.push('flying');
}
```

#### 3. Criar múltiplos Treasures
```javascript
// Rapacious Dragon: ETB create 2 treasures
// Já temos createTreasureToken(), chamar 2x
```

#### 4. Dar haste globalmente (Carnelian Orb)
```javascript
// rules.js - Similar aos lords
if (card.id === 'carnelian_orb_of_dragonkind') {
    if (creature.subtype?.includes('Dragon')) {
        keywords.push('haste');
    }
}
```

### Arquivos a Modificar
- `cards.js` - Definições
- `rules.js` - Cost reduction, condicionais
- `triggers.js` - ETBs, attack triggers
- `game.js` - Spells de dano com exile

### Estimativa de Esforço: **Médio**
- Cost reduction já existe (Tolarian Terror)
- Maioria usa padrões existentes
- Carnelian Orb é novo tipo de artefato global

---

## 5. PRIMAL (Verde) - Fight e Counters

### Cards (20)
| Card | Tipo | P/T | Habilidade |
|------|------|-----|------------|
| Forest | Land | - | Produz G |
| Uncharted Haven | Land | - | Produz cor escolhida |
| Aggressive Mammoth | Creature | 8/8 | Trample, outras criaturas têm trample |
| Bear Cub | Creature | 2/2 | - (Vanilla) |
| Druid of the Cowl | Creature | 1/3 | {T}: Add G |
| Magnigoth Sentry | Creature | 4/6 | Reach |
| Mild-Mannered Librarian | Creature | 2/2 | ETB/dies: create 1/1 Squirrel |
| Thrashing Brontodon | Creature | 3/4 | {1}, sacrifice: destroy artifact/enchantment |
| Wildwood Scourge | Creature | 1/1 | Counter synergy: +1/+1 when counter placed on another |
| Bite Down | Instant | - | Your creature **fights** target creature |
| Giant Growth | Instant | - | +3/+3 |
| Biogenic Upgrade | Sorcery | - | Distribute 3 +1/+1 counters, double counters on each |
| New Horizons | Enchantment | - | Aura on land, +1/+1 counter, land taps for extra mana |

### Mecânicas Novas Necessárias

#### 1. Fight
```javascript
// triggers.js ou game.js
fight(creature1, creature2) {
    // Cada criatura causa dano igual ao seu poder à outra
    const power1 = this.rules.getCreaturePower(creature1);
    const power2 = this.rules.getCreaturePower(creature2);

    creature1.damage += power2;
    creature2.damage += power1;

    // Deathtouch se aplica em fight
    if (this.rules.hasKeyword(creature1, 'deathtouch')) {
        creature2.markedForDeath = true;
    }
    if (this.rules.hasKeyword(creature2, 'deathtouch')) {
        creature1.markedForDeath = true;
    }

    this.checkCreatureDeath(creature1);
    this.checkCreatureDeath(creature2);
}
```

#### 2. Seleção de dois alvos (Bite Down)
```javascript
// Similar ao Felling Blow que já implementamos!
// 1. Escolher sua criatura
// 2. Escolher criatura do oponente
// 3. Fight
```

#### 3. Counter Synergy (Wildwood Scourge)
```javascript
// triggers.js
onCounterPlaced(creature, counterType, amount, controller) {
    if (counterType === 'plusOnePlusOne') {
        controller.battlefield.forEach(card => {
            if (card.id === 'wildwood_scourge' && card !== creature) {
                card.counters.plusOnePlusOne += amount;
            }
        });
    }
}
```

#### 4. Distribuir counters (Biogenic Upgrade)
```javascript
// UI para distribuir X counters entre Y criaturas
// Depois dobrar counters em cada criatura alvo
async promptDistributeCounters(creatures, totalCounters) {
    // Modal para distribuir
}
```

#### 5. Aura em Land (New Horizons)
```javascript
// Novo tipo de aura - anexar a terreno
// Land produz mana extra
// ETB: +1/+1 counter em criatura
```

### Arquivos a Modificar
- `cards.js` - Definições
- `game.js` - Fight spell (Bite Down), Biogenic Upgrade
- `triggers.js` - Counter synergy, ETBs
- `rules.js` - Trample global (Aggressive Mammoth)

### Estimativa de Esforço: **Médio**
- Fight é uma mecânica nova, mas já temos one-sided fight (Felling Blow)
- Counter distribution é UI complexa
- Aura em land é novo mas similar ao existente

---

## Ordem de Implementação Recomendada

### Fase 1: Mecânicas Base
1. **HEALING** - Introduz lifegain triggers
2. **INFERNO** - Usa padrões existentes, adiciona cost reduction para tipos

### Fase 2: Mecânicas Intermediárias
3. **PRIMAL** - Introduz Fight (baseado em Felling Blow)
4. **WIZARDS** - Introduz Kicker

### Fase 3: Mecânicas Avançadas
5. **UNDEAD** - Graveyard activation, sacrifice costs (mais complexo)

---

## Checklist por Deck

### Template de Implementação

> **IMPORTANTE**: Para cada carta individual, siga o fluxo detalhado em `CLAUDE.md` → "Adding Individual Cards - Complete Checklist"

Para cada deck, seguir este checklist:

```
[ ] 1. Pesquisar todas as cartas no Scryfall (API ou web)
[ ] 2. Adicionar definições em cards.js (seguir estrutura por tipo de carta)
[ ] 3. Identificar mecânicas novas necessárias
[ ] 4. Implementar mecânicas novas (se houver)
[ ] 5. Implementar ETB triggers em triggers.js
[ ] 6. Implementar death triggers em triggers.js
[ ] 7. Implementar combat triggers em triggers.js
[ ] 8. Implementar activated abilities em game.js
[ ] 9. Implementar spells em game.js
[ ] 10. Implementar static effects em rules.js
[ ] 11. Adicionar targeting validation em rules.js
[ ] 12. Atualizar IA para usar novas cartas
[ ] 13. Escrever testes
[ ] 14. Testar manualmente (`npm test`)
[ ] 15. Verificar consistência arquitetural (keywords vs card.id)
[ ] 16. Atualizar CARD_VALIDATION.md
[ ] 17. Atualizar CLAUDE.md (novos keywords se criados)
```

### Regras de Consistência Arquitetural

Antes de considerar um deck completo, verificar:

| Verificação | Padrão Correto | Padrão Errado |
|-------------|----------------|---------------|
| ETB simples e reutilizável | `keywords: ["etb_draw"]` | `if (card.id === 'helpful_hunter')` |
| ETB complexo com targeting | `if (card.id === '...')` | OK neste caso |
| Localização de triggers | Todos em `triggers.js` | Inline em `game.js` |
| Lord effects | `rules.js: calculateBonuses()` | Qualquer outro arquivo |

---

## Novas Mecânicas Necessárias (Resumo)

| Mecânica | Deck(s) | Complexidade | Arquivos |
|----------|---------|--------------|----------|
| Lifegain triggers | Healing | Média | triggers.js, game.js |
| Kicker | Wizards | Alta | game.js, rules.js |
| Graveyard activation | Undead | Alta | game.js |
| Sacrifice as cost | Undead | Alta | game.js, ui.js |
| Mill | Undead | Baixa | game.js |
| Morbid | Undead | Baixa | triggers.js |
| Fight | Primal | Média | game.js |
| Counter synergy | Primal | Média | triggers.js |
| Cost reduction by type | Inferno | Baixa | rules.js |
| Global keyword (artifact) | Inferno | Média | rules.js |
| Distribute counters | Primal | Alta | ui.js, game.js |
| Aura on land | Primal | Média | game.js |

---

## Dependências entre Mecânicas

```
Lifegain Triggers ← (standalone)
    ↳ Ajani's Pridemate, Dazzling Angel

Cost Reduction by Type ← (baseado em Tolarian Terror)
    ↳ Dragonlord's Servant

Fight ← (baseado em Felling Blow one-sided)
    ↳ Bite Down

Kicker ← (nova UI de escolha)
    ↳ Into the Roil

Graveyard Activation ← Sacrifice as Cost
    ↳ Reassembling Skeleton depende de ambos

Counter Synergy ← (nova hook em addCounter)
    ↳ Wildwood Scourge
```

---

## Estimativa Total de Esforço

| Deck | Cards | Mecânicas Novas | Esforço |
|------|-------|-----------------|---------|
| Healing | 14 | 2 | ⭐⭐ |
| Inferno | 14 | 2 | ⭐⭐ |
| Primal | 14 | 3 | ⭐⭐⭐ |
| Wizards | 14 | 2 | ⭐⭐⭐ |
| Undead | 14 | 4 | ⭐⭐⭐⭐ |

**Total: 70 novas cartas, ~13 mecânicas novas**

---

## Referências

- [Foundations Beginner Box Contents](https://magic.wizards.com/en/news/feature/foundations-beginner-box-contents)
- [Scryfall - Foundations Set](https://scryfall.com/sets/fdn)
- [MTG Comprehensive Rules](docs/MagicCompRules%2020251114.txt)
