# Plano de Melhorias do Sistema de Dificuldade da IA

Este documento detalha o estado atual do sistema de dificuldade da IA e o plano para implementação das melhorias pendentes.

---

## Resumo Executivo

O sistema de dificuldade da IA possui **5 parâmetros configurados**, mas apenas **2 são efetivamente utilizados** no código. Este plano detalha como implementar os 3 parâmetros "decorativos" e adicionar novos comportamentos diferenciados por nível.

---

## Estado Atual

### Parâmetros Definidos vs Utilizados

| Parâmetro | Aprendiz | Mago | Planeswalker | Usado? | Local |
|-----------|----------|------|--------------|--------|-------|
| `attackWithZeroPower` | true | false | false | ✅ Sim | ai.js:516 |
| `useActivatedAbilities` | false | true | true | ✅ Sim | ai.js:231 |
| `holdManaForInstants` | false | false | true | ❌ Não | - |
| `evaluateTrades` | false | true | true | ❌ Não | - |
| `aggressiveness` | 0.9 | 0.6 | 0.4 | ❌ Não | - |

### Valores Hardcoded que Precisam Parametrização

| Local | Valor | Função | Deveria Variar Por |
|-------|-------|--------|-------------------|
| ai.js:556 | `>= 3` | Power threshold para trades | `aggressiveness` |
| ai.js:558 | `> 5` | Life advantage para atacar | `aggressiveness` |
| ai.js:622 | `>= 4` | Trade power (menace) | `evaluateTrades` |
| ai.js:702 | `>= 4` | Trade power (normal) | `evaluateTrades` |
| ai.js:705 | `* 2` | Life threat multiplier | `aggressiveness` |

---

## Implementação Proposta

### Fase 1: Implementar `aggressiveness` (Prioridade Alta)

**Arquivo**: `js/ai.js`

#### 1.1 Criar helper para calcular thresholds dinâmicos

```javascript
// Novo método na classe AIPlayer
calculateThreshold(baseValue, inverse = false) {
    // aggressiveness: 0.9 (Aprendiz) → 0.4 (Planeswalker)
    // inverse=false: valor DIMINUI com mais agressividade
    // inverse=true: valor AUMENTA com mais agressividade
    const modifier = inverse
        ? this.difficulty.aggressiveness
        : (1 - this.difficulty.aggressiveness);
    return Math.round(baseValue * (0.5 + modifier));
}
```

#### 1.2 Aplicar em `chooseAttackers()` (linhas 556-558)

**Antes:**
```javascript
else if (canKill && (hasLifelink || attackerPower >= 3)) {
    attackers.push(attacker);
} else if (lifeAdvantage > 5) {
    attackers.push(attacker);
}
```

**Depois:**
```javascript
// Power threshold: Aprendiz=1, Mago=3, Planeswalker=4
const powerThreshold = this.calculateThreshold(4, true);
// Life threshold: Aprendiz=2, Mago=5, Planeswalker=8
const lifeThreshold = this.calculateThreshold(8, false);

else if (canKill && (hasLifelink || attackerPower >= powerThreshold)) {
    attackers.push(attacker);
} else if (lifeAdvantage > lifeThreshold) {
    attackers.push(attacker);
}
```

**Comportamento resultante:**
| Dificuldade | Power Threshold | Life Threshold |
|-------------|-----------------|----------------|
| Aprendiz (0.9) | 1+ | 2+ |
| Mago (0.6) | 3+ | 5+ |
| Planeswalker (0.4) | 4+ | 8+ |

---

### Fase 2: Implementar `evaluateTrades` (Prioridade Alta)

**Arquivo**: `js/ai.js`

#### 2.1 Aplicar em `chooseBlockers()` (linhas 702-705)

**Antes:**
```javascript
else if (attackerPower >= 4 && attackerDies) {
    assignBlockers(attacker, [blocker]);
    break;
} else if (this.game.opponent.life <= attackerPower * 2) {
    assignBlockers(attacker, [blocker]);
    break;
}
```

**Depois:**
```javascript
// Trade threshold: Aprendiz=2, Mago=4, Planeswalker=5
const tradeThreshold = this.difficulty.evaluateTrades
    ? this.calculateThreshold(6, false)
    : 2; // Aprendiz sempre bloqueia

// Life multiplier: Aprendiz=3, Mago=2, Planeswalker=1.5
const lifePanicMultiplier = this.difficulty.evaluateTrades
    ? 1.5 + (1 - this.difficulty.aggressiveness)
    : 3;

else if (attackerPower >= tradeThreshold && attackerDies) {
    assignBlockers(attacker, [blocker]);
    break;
} else if (this.game.opponent.life <= attackerPower * lifePanicMultiplier) {
    assignBlockers(attacker, [blocker]);
    break;
}
```

**Comportamento resultante:**
| Dificuldade | Bloqueia Power | Pânico Multiplier |
|-------------|---------------|-------------------|
| Aprendiz | 2+ (trades ruins) | 3x (cedo) |
| Mago | 4+ | 2x |
| Planeswalker | 5+ (seletivo) | 1.5x (tarde) |

---

### Fase 3: Implementar `holdManaForInstants` (Prioridade Alta)

**Arquivo**: `js/ai.js`

#### 3.1 Modificar `playMainPhase()` (após linha 157)

```javascript
// Após filtrar cartas jogáveis
let cardsToPlay = playableCards;

// Planeswalker: reservar mana para instants
if (this.difficulty.holdManaForInstants) {
    const hasInstantsInHand = opponent.hand.some(c =>
        c.type === 'instant' && this.rules.hasEnoughMana(c, opponent)
    );

    if (hasInstantsInHand) {
        const baseMana = this.rules.calculateAvailableMana(opponent);
        const totalMana = Object.values(baseMana).reduce((a, b) => a + b, 0);

        // Reservar 2-3 mana para respostas
        const manaToHold = Math.min(3, Math.floor(totalMana * 0.4));

        cardsToPlay = playableCards.filter(card => {
            const cardCost = card.cmc || 0;
            return cardCost <= totalMana - manaToHold;
        });

        if (cardsToPlay.length < playableCards.length) {
            this.game.ui.log(`IA reservando ${manaToHold} mana para respostas`);
        }
    }
}
```

**Comportamento resultante:**
| Dificuldade | Reserva Mana |
|-------------|--------------|
| Aprendiz | Não |
| Mago | Não |
| Planeswalker | Sim (~40%, máx 3) |

---

### Fase 4: Melhorias em `chooseBestSpellTarget()` (Prioridade Média)

**Arquivo**: `js/ai.js` (linhas 720-760)

```javascript
chooseBestSpellTarget(spell, validTargets) {
    if (validTargets.length === 0) return null;

    // Aprendiz: 30% chance de escolher alvo subótimo
    if (!this.difficulty.evaluateTrades && Math.random() < 0.3) {
        return validTargets[Math.floor(Math.random() * validTargets.length)];
    }

    // Resto da lógica existente...
}
```

---

### Fase 5: Melhorias em `chooseBestCard()` (Prioridade Média)

**Arquivo**: `js/ai.js` (linhas 410-423)

```javascript
chooseBestCard(playableCards) {
    // Aprendiz: 20% chance de escolher carta subótima
    if (!this.difficulty.evaluateTrades && Math.random() < 0.2) {
        return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    // Planeswalker: considerar eficiência de mana
    if (this.difficulty.holdManaForInstants) {
        const creatures = playableCards.filter(c => c.type === 'creature');
        if (creatures.length > 0) {
            return creatures.sort((a, b) => {
                const aEfficiency = ((a.power || 0) + (a.toughness || 0)) / (a.cmc || 1);
                const bEfficiency = ((b.power || 0) + (b.toughness || 0)) / (b.cmc || 1);
                return bEfficiency - aEfficiency;
            })[0];
        }
    }

    // Lógica existente para Mago...
}
```

---

### Fase 6: Novos Parâmetros (Prioridade Baixa - Futuro)

Sugestões para expansão futura:

| Parâmetro | Descrição | Aprendiz | Mago | Planeswalker |
|-----------|-----------|----------|------|--------------|
| `mulliganQuality` | Threshold para aceitar mão | 0.3 | 0.5 | 0.7 |
| `bluffing` | Deixar mana aberta sem instant | false | false | true |
| `focusThreats` | Priorizar remover ameaças | false | true | true |
| `deckPersonality` | Ajustar por tipo de deck | - | - | - |

---

## Ordem de Implementação Recomendada

| Ordem | Fase | Descrição | Impacto |
|:-----:|:----:|-----------|---------|
| 1 | Fase 1 | `aggressiveness` em ataques | Alto - visível imediatamente |
| 2 | Fase 2 | `evaluateTrades` em bloqueios | Alto - complementa Fase 1 |
| 3 | Fase 3 | `holdManaForInstants` | Alto - diferencia Planeswalker |
| 4 | Fase 4 | Targeting subótimo | Médio - polish |
| 5 | Fase 5 | Card selection | Médio - polish |
| 6 | Fase 6 | Novos parâmetros | Baixo - expansão futura |

---

## Testes Recomendados

Após implementação, verificar:

- [ ] Aprendiz ataca com trades ruins (power 1-2)
- [ ] Aprendiz faz blocks subótimos
- [ ] Aprendiz às vezes escolhe alvos/cartas subótimos
- [ ] Mago não ataca com trades ruins
- [ ] Mago faz blocks razoáveis
- [ ] Planeswalker reserva mana para instants
- [ ] Planeswalker só ataca com trades muito favoráveis
- [ ] Planeswalker faz blocks muito seletivos
- [ ] Todos os 140+ testes existentes continuam passando

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|:-----:|:------:|
| Parâmetros utilizados | 2/5 (40%) | 5/5 (100%) |
| Comportamentos diferenciados | ~3 | ~10+ |
| Percepção de dificuldade | Sutil | Clara |

---

## Referências

- **Código fonte**: `js/ai.js`
- **Configuração**: `AI_DIFFICULTY` (linhas 4-32)
- **Documentação geral**: `CLAUDE.md` seção "IA com 3 Níveis de Dificuldade"

---

*Última atualização: Fevereiro 2026*
