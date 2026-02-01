# Plano de Melhorias do Sistema de Dificuldade da IA

Este documento detalha o sistema de dificuldade da IA e as melhorias implementadas.

---

## Resumo Executivo

O sistema de dificuldade da IA utiliza **thresholds explícitos** por nível de dificuldade, tornando o comportamento previsível e fácil de ajustar.

---

## Estado Atual

### Parâmetros por Nível de Dificuldade

| Parâmetro | Aprendiz | Mago | Planeswalker | Descrição |
|-----------|:--------:|:----:|:------------:|-----------|
| `attackWithZeroPower` | true | false | false | Ataca com criaturas power 0 |
| `useActivatedAbilities` | false | true | true | Usa habilidades ativadas |
| `holdManaForInstants` | false | false | true | Reserva mana para respostas |
| `mistakeRate` | 0.25 | 0 | 0 | Chance de escolha subótima |

### Thresholds por Nível

| Threshold | Aprendiz | Mago | Planeswalker | Uso |
|-----------|:--------:|:----:|:------------:|-----|
| `attackPower` | 1 | 3 | 4 | Mínimo power para considerar trade |
| `lifeAdvantage` | 2 | 5 | 8 | Vantagem de vida para atacar agressivamente |
| `tradePower` | 2 | 4 | 5 | Power mínimo para aceitar trade em bloqueio |
| `panicMultiplier` | 3 | 2 | 1.5 | Multiplicador para bloqueio defensivo |

---

## Comportamentos por Dificuldade

### Aprendiz (Fácil)
- ❌ Ataca com criaturas power 0 (erro)
- ❌ Não usa habilidades ativadas
- ❌ Não reserva mana para instants
- ⚠️ 25% de chance de escolher alvo/carta subótimo
- 🗡️ Ataca agressivamente (thresholds baixos)
- 🛡️ Bloqueia cedo demais (panic multiplier alto)
- 💀 Aceita trades ruins (tradePower baixo)

### Mago (Médio)
- ✅ Não ataca com power 0
- ✅ Usa habilidades ativadas
- ❌ Não reserva mana para instants
- ✅ Escolhas sempre ótimas
- ⚖️ Ataque equilibrado
- ⚖️ Bloqueio equilibrado
- ⚖️ Trades razoáveis

### Planeswalker (Difícil)
- ✅ Não ataca com power 0
- ✅ Usa habilidades ativadas
- ✅ Reserva mana para instants
- ✅ Escolhas sempre ótimas
- 🎯 Ataque seletivo (só trades muito favoráveis)
- 🎯 Bloqueio seletivo (evita trades ruins)
- 🎯 Só aceita trades vantajosos

---

## Implementação Técnica

### Estrutura de Configuração

```javascript
const AI_DIFFICULTY = {
    aprendiz: {
        name: 'Aprendiz',
        description: 'IA fácil - comete erros frequentes',
        attackWithZeroPower: true,
        useActivatedAbilities: false,
        holdManaForInstants: false,
        mistakeRate: 0.25,
        thresholds: {
            attackPower: 1,
            lifeAdvantage: 2,
            tradePower: 2,
            panicMultiplier: 3
        }
    },
    mago: {
        name: 'Mago',
        description: 'IA equilibrada - joga competentemente',
        attackWithZeroPower: false,
        useActivatedAbilities: true,
        holdManaForInstants: false,
        mistakeRate: 0,
        thresholds: {
            attackPower: 3,
            lifeAdvantage: 5,
            tradePower: 4,
            panicMultiplier: 2
        }
    },
    planeswalker: {
        name: 'Planeswalker',
        description: 'IA difícil - joga otimizadamente',
        attackWithZeroPower: false,
        useActivatedAbilities: true,
        holdManaForInstants: true,
        mistakeRate: 0,
        thresholds: {
            attackPower: 4,
            lifeAdvantage: 8,
            tradePower: 5,
            panicMultiplier: 1.5
        }
    }
};
```

### Uso dos Thresholds

#### Em `chooseAttackers()`:
```javascript
// Threshold de power para considerar trade
const attackPowerThreshold = this.difficulty.thresholds.attackPower;
// Threshold de vantagem de vida para atacar agressivamente
const lifeAdvantageThreshold = this.difficulty.thresholds.lifeAdvantage;

if (canKill && (hasLifelink || attackerPower >= attackPowerThreshold)) {
    attackers.push(attacker);
} else if (lifeAdvantage > lifeAdvantageThreshold) {
    attackers.push(attacker);
}
```

#### Em `chooseBlockers()`:
```javascript
// Threshold de power para aceitar trade
const tradePowerThreshold = this.difficulty.thresholds.tradePower;
// Multiplicador para bloqueio de pânico
const panicMultiplier = this.difficulty.thresholds.panicMultiplier;

if (attackerPower >= tradePowerThreshold && attackerDies) {
    assignBlockers(attacker, [blocker]);
} else if (this.game.opponent.life <= attackerPower * panicMultiplier) {
    assignBlockers(attacker, [blocker]);
}
```

#### Em `holdManaForInstants`:
```javascript
if (this.difficulty.holdManaForInstants) {
    const instantsInHand = opponent.hand.filter(c => c.type === 'instant');
    if (instantsInHand.length > 0) {
        const cheapestCmc = Math.min(...instantsInHand.map(c => c.cmc || 2));
        const manaToHold = Math.min(cheapestCmc, 3);

        playableCards = playableCards.filter(card => {
            const costAfterPlay = totalMana - (card.cmc || 0);
            return costAfterPlay >= manaToHold;
        });
    }
}
```

#### Em `mistakeRate` (escolhas subótimas):
```javascript
// Em chooseBestSpellTarget(), chooseBestCard(), chooseBestAuraTarget()
if (this.difficulty.mistakeRate > 0 && Math.random() < this.difficulty.mistakeRate) {
    // Escolha aleatória ao invés de ótima
    return validTargets[Math.floor(Math.random() * validTargets.length)];
}
```

---

## Verificação de Comportamento

### Testes Manuais Recomendados

| Teste | Aprendiz | Mago | Planeswalker |
|-------|:--------:|:----:|:------------:|
| Ataca com power 0 | ✅ Sim | ❌ Não | ❌ Não |
| Usa Vampire Neonate ability | ❌ Não | ✅ Sim | ✅ Sim |
| Guarda mana para Cancel | ❌ Não | ❌ Não | ✅ Sim |
| Bloqueia 1/1 com 5/5 | ✅ Sim | ❌ Não | ❌ Não |
| Às vezes escolhe alvo fraco | ✅ ~25% | ❌ Não | ❌ Não |

### Cenários de Teste

1. **Aprendiz atacando:**
   - Deve atacar mesmo quando o jogador tem bloqueadores maiores
   - Deve fazer trades ruins (2/2 vs 4/4)

2. **Mago bloqueando:**
   - Deve bloquear criaturas 4+ power mesmo morrendo
   - Não deve bloquear criaturas 2 power se vai morrer

3. **Planeswalker com mana aberta:**
   - Se tem Cancel (1UU) na mão e 5 mana, deve jogar criatura de até 2 mana
   - Deve reservar 3 mana para a resposta

---

## Métricas de Sucesso

| Métrica | Antes | Depois |
|---------|:-----:|:------:|
| Parâmetros utilizados | 2/5 (40%) | 5/5 (100%) |
| Thresholds configuráveis | 0 | 4 |
| Comportamentos diferenciados | ~3 | ~10 |
| Facilidade de ajuste | Baixa | Alta |

---

## Histórico de Alterações

### Fevereiro 2026 - Implementação Completa

- ✅ Substituído sistema de fórmulas por thresholds explícitos
- ✅ Implementado `holdManaForInstants` para Planeswalker
- ✅ Implementado `mistakeRate` para erros do Aprendiz
- ✅ Aplicados thresholds em `chooseAttackers()` e `chooseBlockers()`
- ✅ Removido parâmetro `aggressiveness` (substituído por thresholds)
- ✅ Removido parâmetro `evaluateTrades` (substituído por thresholds)

---

## Referências

- **Código fonte**: `js/ai.js`
- **Configuração**: `AI_DIFFICULTY` (início do arquivo)

---

*Última atualização: Fevereiro 2026*
