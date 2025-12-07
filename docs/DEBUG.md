# Modo Debug - Guia de Comandos

O modo debug permite testar manualmente o jogo através do console do navegador. Após iniciar uma partida, abra o console (F12) e use `debug.help()` para ver todos os comandos.

## Como Usar

1. Inicie uma partida normalmente
2. Abra o console do navegador (F12 → Console)
3. Digite `debug.help()` para ver a lista de comandos
4. Execute comandos como `debug.setLife(50)` ou `debug.addToBattlefield("Savannah Lions")`

---

## Comandos Disponíveis

### Cartas

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `debug.draw(nome)` | Compra carta específica do seu deck | `debug.draw("Savannah")` |
| `debug.drawAny(nome)` | Compra carta de qualquer deck | `debug.drawAny("Jazal")` |
| `debug.addToHand(nome, jogador?)` | Adiciona carta à mão | `debug.addToHand("Pacifism", "opponent")` |
| `debug.addToBattlefield(nome, jogador?)` | Coloca carta direto no campo | `debug.addToBattlefield("Frenzied Goblin")` |
| `debug.listCards(deck?)` | Lista todas as cartas | `debug.listCards("cats")` |

**Nota:** O parâmetro `jogador` aceita: `"player"`, `"p"`, `"opponent"`, `"o"`, `"ai"`

### Vida e Mana

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `debug.setLife(valor, jogador?)` | Define vida | `debug.setLife(5, "opponent")` |
| `debug.addMana(cor, quantidade?)` | Adiciona mana ao pool | `debug.addMana("R", 5)` |
| `debug.fullMana()` | Dá 10 de cada mana | `debug.fullMana()` |
| `debug.untapAll(jogador?)` | Desvira todas as permanentes | `debug.untapAll()` |

**Cores de mana:** `W` (branco), `U` (azul), `B` (preto), `R` (vermelho), `G` (verde), `C` (incolor)

### Turno e Fase

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `debug.setPhase(fase)` | Pula para fase específica | `debug.setPhase("MAIN1")` |
| `debug.nextTurn()` | Avança para o próximo turno | `debug.nextTurn()` |
| `debug.skipTo(fase)` | Avança até fase no seu turno | `debug.skipTo("DECLARE_ATTACKERS")` |
| `debug.phases()` | Lista todas as fases | `debug.phases()` |

**Fases disponíveis:**
- `UNTAP` - Desvirar
- `UPKEEP` - Manutenção
- `DRAW` - Compra
- `MAIN1` - Primeira fase principal
- `COMBAT_BEGIN` - Início do combate
- `DECLARE_ATTACKERS` - Declarar atacantes
- `DECLARE_BLOCKERS` - Declarar bloqueadores
- `COMBAT_DAMAGE` - Dano de combate
- `COMBAT_END` - Fim do combate
- `MAIN2` - Segunda fase principal
- `END` - Fim do turno
- `CLEANUP` - Limpeza

### Mão Inicial

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `debug.setHand(nomes[])` | Define mão com cartas específicas | `debug.setHand(["Plains", "Savannah Lions", "Pacifism"])` |
| `debug.clearHand(jogador?)` | Limpa a mão | `debug.clearHand("opponent")` |

### Estado do Jogo

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `debug.state()` | Mostra estado completo do jogo | `debug.state()` |
| `debug.battlefield(jogador?)` | Lista criaturas em campo | `debug.battlefield("both")` |
| `debug.hand(jogador?)` | Mostra cartas na mão | `debug.hand()` |
| `debug.kill(nome, jogador?)` | Mata criatura específica | `debug.kill("Goblin")` |

### Testes Rápidos

| Comando | Descrição |
|---------|-----------|
| `debug.setupCombat()` | Prepara cenário de combate básico com criaturas de ambos os lados |
| `debug.help()` | Mostra ajuda com todos os comandos |

---

## Lista Completa de Cartas

Use o nome completo ou parcial da carta. O sistema encontra cartas que **contêm** o texto digitado.

### Cats (Branco) 🐱

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Plains | Land | - | - | `"Plains"` |
| Uncharted Haven | Land | - | - | `"Haven"` ou `"Uncharted"` |
| Savannah Lions | Creature | W | 2/1 | `"Savannah"` ou `"Lions"` |
| Leonin Vanguard | Creature | W | 1/1 | `"Vanguard"` ou `"Leonin V"` |
| Helpful Hunter | Creature | 1W | 1/1 | `"Helpful"` ou `"Hunter"` |
| Leonin Skyhunter | Creature | WW | 2/2 flying | `"Skyhunter"` |
| Ingenious Leonin | Creature | 4W | 4/4 | `"Ingenious"` |
| Prideful Parent | Creature | 2W | 2/2 vigilance | `"Prideful"` ou `"Parent"` |
| Felidar Savior | Creature | 3W | 2/3 lifelink | `"Felidar"` ou `"Savior"` |
| Jazal Goldmane | Creature | 2WW | 4/4 first_strike | `"Jazal"` ou `"Goldmane"` |
| Moment of Triumph | Instant | W | - | `"Triumph"` ou `"Moment"` |
| Pacifism | Enchantment | 1W | - | `"Pacifism"` |
| Elspeth's Smite | Instant | W | - | `"Smite"` ou `"Elspeth"` |
| Angelic Edict | Sorcery | 4W | - | `"Edict"` ou `"Angelic"` |

### Goblins (Vermelho) 👺

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Mountain | Land | - | - | `"Mountain"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Frenzied Goblin | Creature | R | 1/1 haste | `"Frenzied"` |
| Goblin Assailant | Creature | 1R | 2/2 | `"Assailant"` |
| Goblin Smuggler | Creature | 2R | 2/2 haste | `"Smuggler"` |
| Raging Redcap | Creature | 2R | 1/2 double_strike | `"Redcap"` ou `"Raging"` |
| Battle-Rattle Shaman | Creature | 3R | 2/2 | `"Rattle"` ou `"Shaman"` |
| Dropkick Bomber | Creature | 3R | 2/3 (lord) | `"Dropkick"` ou `"Bomber"` |
| Goblin Trashmaster | Creature | 2RR | 3/3 | `"Trashmaster"` |
| Veteran's Goblin Firebomb | Artifact | 1 | - | `"Firebomb"` ou `"Veteran"` |
| Dragon Fodder | Sorcery | 1R | - | `"Fodder"` ou `"Dragon"` |
| Volley | Instant | R | - | `"Volley"` |
| Kindled Fury | Instant | R | - | `"Kindled"` ou `"Fury"` |
| Incinerating Blast | Sorcery | 4R | - | `"Incinerating"` ou `"Blast"` |

### Vampires (Preto) 🧛

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Swamp | Land | - | - | `"Swamp"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Vampire Neonate | Creature | 1B | 0/3 | `"Neonate"` |
| Vampire Interloper | Creature | 1B | 2/1 flying, cant_block | `"Interloper"` |
| Vampire Spawn | Creature | 2B | 2/3 | `"Spawn"` |
| Stromkirk Bloodthief | Creature | 2B | 2/2 | `"Stromkirk"` ou `"Bloodthief"` |
| Vengeful Bloodwitch | Creature | 3B | 3/3 flying | `"Bloodwitch"` ou `"Vengeful"` |
| Bloodtithe Collector | Creature | 4B | 3/2 | `"Bloodtithe"` ou `"Collector"` |
| Moment of Craving | Instant | 1B | - | `"Craving"` |
| Hero's Downfall | Instant | 1BB | - | `"Downfall"` ou `"Hero"` |
| Offer Immortality | Instant | 1B | - | `"Immortality"` ou `"Offer"` |
| Untamed Hunger | Enchantment | 2B | - | `"Hunger"` ou `"Untamed"` |

### Elves (Verde) 🧝

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Forest | Land | - | - | `"Forest"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Llanowar Elves | Creature | G | 1/1 tap_for_mana | `"Llanowar"` |
| Elvish Visionary | Creature | 1G | 1/1 etb_draw | `"Visionary"` |
| Beast-Kin Ranger | Creature | 2G | 3/3 trample | `"Beast-Kin"` ou `"Ranger"` |
| Dwynen's Elite | Creature | 1G | 2/2 | `"Dwynen"` ou `"Elite"` |
| Thornweald Archer | Creature | 1G | 2/1 reach, deathtouch | `"Thornweald"` ou `"Archer"` |
| Elvish Regrower | Creature | 3G | 3/3 | `"Regrower"` |
| Elvish Archdruid | Creature | 1GG | 2/2 (lord) | `"Archdruid"` |
| Wildheart Invoker | Creature | 2GG | 4/3 | `"Wildheart"` ou `"Invoker"` |
| Snakeskin Veil | Instant | G | - | `"Snakeskin"` ou `"Veil"` |
| Broken Wings | Instant | 2G | - | `"Broken"` ou `"Wings"` |
| Felling Blow | Instant | 2G | - | `"Felling"` ou `"Blow"` |
| Joraga Invocation | Sorcery | 4GG | - | `"Joraga"` ou `"Invocation"` |

---

## Exemplos de Uso

### Testar combate básico
```javascript
debug.setupCombat()  // Cria criaturas e vai para fase de ataque
```

### Testar uma carta específica
```javascript
debug.addToBattlefield("Jazal")  // Coloca Jazal no campo
debug.fullMana()                  // Dá mana para ativar habilidade
debug.setPhase("DECLARE_ATTACKERS")  // Vai para combate
```

### Simular cenário de fim de jogo
```javascript
debug.setLife(3, "opponent")  // Oponente com pouca vida
debug.addToBattlefield("Savannah Lions")  // Criatura para atacar
debug.untapAll()  // Garantir que está desvirada
```

### Testar trigger de Stromkirk Bloodthief
```javascript
debug.addToBattlefield("Stromkirk")  // Coloca em campo
debug.addToBattlefield("Vampire Spawn")  // Outro vampiro para ser alvo
debug.setLife(19, "opponent")  // Simula perda de vida
// Avançar para fim do turno para ver o trigger
```

### Forçar mão inicial específica
```javascript
debug.clearHand()
debug.setHand(["Plains", "Plains", "Savannah Lions", "Leonin Skyhunter", "Pacifism"])
```

### Ver estado do jogo
```javascript
debug.state()       // Resumo geral
debug.battlefield() // Criaturas em campo
debug.hand()        // Sua mão
```

---

## Dicas

1. **Busca parcial**: Não precisa digitar o nome completo. `"Jazal"` encontra "Jazal Goldmane"

2. **Case insensitive**: `"jazal"`, `"JAZAL"` e `"Jazal"` funcionam igual

3. **Jogador padrão**: Se não especificar o jogador, o padrão é `"player"` (você)

4. **Listar cartas**: Use `debug.listCards()` para ver todas, ou `debug.listCards("goblins")` para um deck específico

5. **Summoning Sickness**: Criaturas adicionadas com `addToBattlefield` têm summoning sickness (exceto com haste). Use `debug.setupCombat()` que já remove isso.

6. **Múltiplas cartas iguais**: Se houver várias cartas com nome similar, a primeira encontrada será usada.
