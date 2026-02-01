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

### Pirates (Azul) 🏴‍☠️

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Island | Land | - | - | `"Island"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Spectral Sailor | Creature | U | 1/1 flash, flying | `"Spectral"` ou `"Sailor"` |
| Kitesail Corsair | Creature | 1U | 2/1 flying (attacking) | `"Kitesail"` ou `"Corsair"` |
| Brineborn Cutthroat | Creature | 1U | 2/1 flash | `"Brineborn"` ou `"Cutthroat"` |
| Corsair Captain | Creature | 2U | 2/2 (lord) | `"Captain"` |
| Storm Fleet Spy | Creature | 2U | 2/2 raid | `"Storm Fleet"` ou `"Spy"` |
| Bigfin Bouncer | Creature | 3U | 3/2 etb_bounce | `"Bigfin"` ou `"Bouncer"` |
| Skyship Buccaneer | Creature | 3UU | 4/3 flying, raid | `"Skyship"` ou `"Buccaneer"` |
| Tolarian Terror | Creature | 6U | 5/5 ward (cost reduction) | `"Tolarian"` ou `"Terror"` |
| Opt | Instant | U | - | `"Opt"` |
| Cancel | Instant | 1UU | - | `"Cancel"` |
| Eaten by Piranhas | Enchantment | 1U | - flash | `"Piranhas"` ou `"Eaten"` |
| Pirate's Cutlass | Artifact | 3 | - equipment | `"Cutlass"` |

### Healing (Branco) 💚

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Plains | Land | - | - | `"Plains"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Ajani's Pridemate | Creature | 1W | 2/2 lifegain_counter | `"Pridemate"` ou `"Ajani"` |
| Ancestor Dragon | Creature | 4WW | 5/6 flying | `"Ancestor"` |
| Bishop's Soldier | Creature | 1W | 2/2 lifelink | `"Bishop"` ou `"Soldier"` |
| Dazzling Angel | Creature | 2W | 2/3 flying | `"Dazzling"` ou `"Angel"` |
| Herald of Faith | Creature | 3WW | 4/3 flying | `"Herald"` ou `"Faith"` |
| Hinterland Sanctifier | Creature | 1W | 3/2 etb_lifegain | `"Hinterland"` ou `"Sanctifier"` |
| Inspiring Overseer | Creature | 2W | 2/1 flying | `"Overseer"` ou `"Inspiring"` |
| Twinblade Paladin | Creature | 3W | 3/3 double_strike_above_starting | `"Twinblade"` ou `"Paladin"` |
| Adamant Will | Instant | 1W | - | `"Adamant"` |
| Deadly Riposte | Instant | 1W | - | `"Riposte"` ou `"Deadly"` |
| Prayer of Binding | Enchantment | 3W | - | `"Prayer"` ou `"Binding"` |
| Quick-Draw Katana | Artifact | 2 | - equipment | `"Katana"` ou `"Quick-Draw"` |

### Inferno (Vermelho) 🔥

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Mountain | Land | - | - | `"Mountain"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Dragonlord's Servant | Creature | 1R | 1/3 dragon_cost_reduction | `"Servant"` ou `"Dragonlord"` |
| Fire Elemental | Creature | 3RR | 5/4 | `"Fire Elemental"` |
| Firespitter Whelp | Creature | 2R | 2/2 flying | `"Firespitter"` ou `"Whelp"` |
| Kargan Dragonrider | Creature | 1R | 2/2 | `"Kargan"` ou `"Dragonrider"` |
| Rapacious Dragon | Creature | 4R | 3/3 flying | `"Rapacious"` |
| Skyraker Giant | Creature | 2RR | 4/3 reach | `"Skyraker"` ou `"Giant"` |
| Terror of Mount Velus | Creature | 5RR | 5/5 flying, double_strike | `"Terror"` ou `"Velus"` |
| Fiery Annihilation | Sorcery | 4R | - | `"Annihilation"` ou `"Fiery"` |
| Scorching Dragonfire | Instant | 1R | - | `"Scorching"` ou `"Dragonfire"` |
| Seize the Spoils | Sorcery | 2R | - | `"Seize"` ou `"Spoils"` |
| Carnelian Orb of Dragonkind | Artifact | 2 | - | `"Carnelian"` ou `"Orb"` |

### Wizards (Azul) 🧙

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Island | Land | - | - | `"Island"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Burrog Befuddler | Creature | 1U | 1/1 flash | `"Burrog"` ou `"Befuddler"` |
| Clinquant Skymage | Creature | 2U | 2/2 flying | `"Clinquant"` ou `"Skymage"` |
| Erudite Wizard | Creature | 2U | 2/1 | `"Erudite"` |
| Exclusion Mage | Creature | 2U | 2/2 | `"Exclusion"` |
| Goblin Electromancer | Creature | UR | 2/2 wizard_discount | `"Electromancer"` |
| Icewind Elemental | Creature | 4U | 3/4 flying | `"Icewind"` |
| Mischievous Mystic | Creature | 1U | 2/1 flying | `"Mischievous"` ou `"Mystic"` |
| Mystic Archaeologist | Creature | 1U | 2/1 | `"Archaeologist"` |
| Arcane Epiphany | Instant | 4U | - | `"Epiphany"` ou `"Arcane"` |
| Essence Scatter | Instant | 1U | - counterspell_creature | `"Essence"` ou `"Scatter"` |
| Into the Roil | Instant | 1U | - kicker | `"Roil"` |
| Quick Study | Instant | 2U | - | `"Quick Study"` |
| Starlight Snare | Enchantment | 2W | - | `"Starlight"` ou `"Snare"` |

### Primal (Verde) 🦖

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Forest | Land | - | - | `"Forest"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Aggressive Mammoth | Creature | 3GGG | 8/8 trample | `"Mammoth"` ou `"Aggressive"` |
| Bear Cub | Creature | 1G | 2/2 | `"Bear"` ou `"Cub"` |
| Druid of the Cowl | Creature | 1G | 1/3 tap_for_mana | `"Druid"` ou `"Cowl"` |
| Magnigoth Sentry | Creature | 3G | 4/6 reach | `"Magnigoth"` ou `"Sentry"` |
| Mild-Mannered Librarian | Creature | 1G | 2/3 | `"Librarian"` ou `"Mild"` |
| Thrashing Brontodon | Creature | 1GG | 3/4 | `"Brontodon"` ou `"Thrashing"` |
| Wildwood Scourge | Creature | XG | 0/0 | `"Wildwood"` ou `"Scourge"` |
| Bite Down | Instant | 1G | - fight | `"Bite"` |
| Giant Growth | Instant | G | - | `"Giant Growth"` |
| Snakeskin Veil | Instant | G | - | `"Snakeskin"` ou `"Veil"` |
| Biogenic Upgrade | Sorcery | 4GG | - | `"Biogenic"` ou `"Upgrade"` |
| New Horizons | Enchantment | 2G | - aura | `"Horizons"` ou `"New"` |

### Undead (Preto) 💀

| Nome | Tipo | Custo | Stats | Como Referenciar |
|------|------|-------|-------|------------------|
| Swamp | Land | - | - | `"Swamp"` |
| Uncharted Haven | Land | - | - | `"Haven"` |
| Crow of Dark Tidings | Creature | 2B | 2/1 flying | `"Crow"` ou `"Tidings"` |
| Death Baron | Creature | 1BB | 2/2 zombie_skeleton_lord | `"Baron"` ou `"Death"` |
| Diregraf Ghoul | Creature | B | 2/2 enters_tapped | `"Diregraf"` ou `"Ghoul"` |
| Hungry Ghoul | Creature | 1B | 2/2 | `"Hungry"` |
| Maalfeld Twins | Creature | 5B | 4/4 | `"Maalfeld"` ou `"Twins"` |
| Reassembling Skeleton | Creature | 1B | 1/1 graveyard_ability | `"Reassembling"` ou `"Skeleton"` |
| Rot Hulk | Creature | 5BB | 5/5 | `"Rot"` ou `"Hulk"` |
| Skeleton Archer | Creature | 3B | 3/3 | `"Archer"` |
| Virus Beetle | Creature | 1B | 1/2 | `"Virus"` ou `"Beetle"` |
| Undying Malice | Instant | B | - | `"Undying"` ou `"Malice"` |
| Cemetery Recruitment | Sorcery | 1B | - | `"Cemetery"` ou `"Recruitment"` |
| Rise Again | Sorcery | 4B | - | `"Rise"` |

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
