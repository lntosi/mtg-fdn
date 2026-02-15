// === Base de Dados das Cartas ===
// 4 Decks Jumpstart do Foundations Beginner Box

const CARD_DATABASE = {
    // ==================== CATS (Branco) ====================
    cats: {
        name: "Cats",
        color: "white",
        cards: [
            // Terrenos (7)
            { id: "cats_plains_1", name: "Plains", type: "land", subtype: "basic", produces: "W", qty: 7 },
            // Terreno especial (1)
            { id: "cats_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },
            // Criaturas (9)
            { id: "savannah_lions", name: "Savannah Lions", type: "creature", subtype: "Cat", cost: "W", cmc: 1, power: 2, toughness: 1, qty: 1 },
            { id: "leonin_vanguard", name: "Leonin Vanguard", type: "creature", subtype: "Cat Soldier", cost: "W", cmc: 1, power: 1, toughness: 1, text: "No início do combate em seu turno, se você controla três ou mais criaturas, esta criatura ganha +1/+1 até o fim do turno e você ganha 1 vida.", qty: 1 },
            { id: "helpful_hunter", name: "Helpful Hunter", type: "creature", subtype: "Cat", cost: "1W", cmc: 2, power: 1, toughness: 1, text: "Quando entra, compre uma carta.", keywords: ["etb_draw"], qty: 1 },
            { id: "leonin_skyhunter", name: "Leonin Skyhunter", type: "creature", subtype: "Cat Knight", cost: "WW", cmc: 2, power: 2, toughness: 2, keywords: ["flying"], qty: 1 },
            { id: "ingenious_leonin", name: "Ingenious Leonin", type: "creature", subtype: "Cat Soldier", cost: "4W", cmc: 5, power: 4, toughness: 4, text: "3W: Coloque um contador +1/+1 em outra criatura atacante alvo. Se ela é Cat, ganha iniciativa até o fim do turno.", qty: 1 },
            { id: "prideful_parent", name: "Prideful Parent", type: "creature", subtype: "Cat", cost: "2W", cmc: 3, power: 2, toughness: 2, keywords: ["vigilance", "etb_cat_token"], text: "Quando entra, crie um token 1/1 Cat.", qty: 1 },
            { id: "felidar_savior", name: "Felidar Savior", type: "creature", subtype: "Cat Beast", cost: "3W", cmc: 4, power: 2, toughness: 3, keywords: ["lifelink", "etb_counter_two"], text: "Quando entra, coloque um contador +1/+1 em cada uma de até duas outras criaturas alvo que você controla.", qty: 1 },
            { id: "jazal_goldmane", name: "Jazal Goldmane", type: "creature", subtype: "Cat Warrior", cost: "2WW", cmc: 4, power: 4, toughness: 4, legendary: true, keywords: ["first_strike"], text: "3WW: Criaturas atacantes têm +X/+X até o fim do turno, onde X é o número de criaturas atacantes.", qty: 1 },
            // Feitiços e Encantamentos (3)
            { id: "moment_of_triumph", name: "Moment of Triumph", type: "instant", cost: "W", cmc: 1, text: "Criatura alvo ganha +2/+2 até o fim do turno. Você ganha 2 vidas.", qty: 1 },
            { id: "pacifism", name: "Pacifism", type: "enchantment", subtype: "Aura", cost: "1W", cmc: 2, keywords: ["enchant"], isDebuff: true, text: "Encantar criatura. Criatura encantada não pode atacar nem bloquear.", qty: 1 },
            { id: "elspeths_smite", name: "Elspeth's Smite", type: "instant", cost: "W", cmc: 1, text: "Causa 3 de dano a criatura atacante ou bloqueadora alvo. Se ela morrer neste turno, exile-a.", qty: 1 },
            { id: "angelic_edict", name: "Angelic Edict", type: "sorcery", cost: "4W", cmc: 5, text: "Exile criatura ou encantamento alvo.", qty: 1 }
        ]
    },

    // ==================== GOBLINS (Vermelho) ====================
    goblins: {
        name: "Goblins",
        color: "red",
        cards: [
            // Terrenos (7)
            { id: "goblins_mountain_1", name: "Mountain", type: "land", subtype: "basic", produces: "R", qty: 7 },
            // Terreno especial (1)
            { id: "goblins_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },
            // Criaturas (9)
            { id: "frenzied_goblin", name: "Frenzied Goblin", type: "creature", subtype: "Goblin Berserker", cost: "R", cmc: 1, power: 1, toughness: 1, text: "Quando ataca, pague R: criatura alvo não pode bloquear neste turno.", qty: 1 },
            { id: "swab_goblin", name: "Swab Goblin", type: "creature", subtype: "Goblin Pirate", cost: "1R", cmc: 2, power: 2, toughness: 2, qty: 1 },
            { id: "raging_redcap", name: "Raging Redcap", type: "creature", subtype: "Goblin Knight", cost: "2R", cmc: 3, power: 1, toughness: 2, keywords: ["double_strike"], qty: 1 },
            { id: "goblin_smuggler", name: "Goblin Smuggler", type: "creature", subtype: "Goblin Rogue", cost: "2R", cmc: 3, power: 2, toughness: 2, keywords: ["haste"], text: "T: Criatura alvo com poder 2 ou menos não pode ser bloqueada neste turno.", qty: 1 },
            { id: "battle_rattle_shaman", name: "Battle-Rattle Shaman", type: "creature", subtype: "Goblin Shaman", cost: "3R", cmc: 4, power: 2, toughness: 2, text: "No início do combate, criatura alvo ganha +2/+0 até o fim do turno.", qty: 1 },
            { id: "dropkick_bomber", name: "Dropkick Bomber", type: "creature", subtype: "Goblin Warrior", cost: "2R", cmc: 3, power: 2, toughness: 3, keywords: ["goblin_lord"], text: "Outros Goblins que você controla recebem +1/+1. R: Até o fim do turno, outro Goblin alvo ganha voar e 'Quando esta criatura causar dano de combate, sacrifique-a.'", qty: 1 },
            // Feitiços (5)
            { id: "kindled_fury", name: "Kindled Fury", type: "instant", cost: "R", cmc: 1, text: "Criatura alvo ganha +1/+0 e iniciativa até o fim do turno.", qty: 1 },
            { id: "dragon_fodder", name: "Dragon Fodder", type: "sorcery", cost: "1R", cmc: 2, text: "Crie dois tokens 1/1 Goblin.", qty: 1 },
            { id: "volley_veteran", name: "Volley Veteran", type: "creature", subtype: "Goblin Warrior", cost: "3R", cmc: 4, power: 4, toughness: 2, text: "Quando entra, causa dano a criatura alvo que um oponente controla igual ao número de Goblins que você controla.", qty: 1 },
            { id: "incinerating_blast", name: "Incinerating Blast", type: "sorcery", cost: "4R", cmc: 5, text: "Causa 6 de dano a criatura alvo. Você pode descartar uma carta. Se fizer isso, compre uma carta.", qty: 1 },
            // Artefato (1)
            { id: "goblin_oriflamme", name: "Goblin Oriflamme", type: "enchantment", cost: "1R", cmc: 2, text: "Criaturas atacantes que você controla têm +1/+0.", qty: 1 },
            { id: "goblin_firebomb", name: "Goblin Firebomb", type: "artifact", cost: "1", cmc: 1, keywords: ["flash"], text: "Lampejo. 7, T, Sacrifique este artefato: Destrua permanente alvo.", qty: 1 }
        ]
    },

    // ==================== VAMPIRES (Preto) ====================
    vampires: {
        name: "Vampires",
        color: "black",
        cards: [
            // Terrenos (7)
            { id: "vampires_swamp_1", name: "Swamp", type: "land", subtype: "basic", produces: "B", qty: 7 },
            // Terreno especial (1)
            { id: "vampires_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },
            // Criaturas (9)
            { id: "vampire_neonate", name: "Vampire Neonate", type: "creature", subtype: "Vampire", cost: "B", cmc: 1, power: 0, toughness: 3, text: "2, T: Cada oponente perde 1 vida e você ganha 1 vida.", qty: 1 },
            { id: "vampire_interloper", name: "Vampire Interloper", type: "creature", subtype: "Vampire Scout", cost: "1B", cmc: 2, power: 2, toughness: 1, keywords: ["flying"], text: "Não pode bloquear.", qty: 1 },
            { id: "stromkirk_bloodthief", name: "Stromkirk Bloodthief", type: "creature", subtype: "Vampire Rogue", cost: "2B", cmc: 3, power: 2, toughness: 2, text: "No final do turno, coloque um contador +1/+1 em Vampiro alvo que você controla se um oponente perdeu vida neste turno.", qty: 1 },
            { id: "highborn_vampire", name: "Highborn Vampire", type: "creature", subtype: "Vampire", cost: "3B", cmc: 4, power: 4, toughness: 3, qty: 1 },
            { id: "vampire_spawn", name: "Vampire Spawn", type: "creature", subtype: "Vampire", cost: "2B", cmc: 3, power: 2, toughness: 3, keywords: ["etb_drain_2"], text: "Quando entra, cada oponente perde 2 vidas e você ganha 2 vidas.", qty: 1 },
            { id: "bloodtithe_collector", name: "Bloodtithe Collector", type: "creature", subtype: "Vampire", cost: "4B", cmc: 5, power: 3, toughness: 4, keywords: ["flying"], text: "Quando entra, se um oponente perdeu vida neste turno, cada oponente descarta uma carta.", qty: 1 },
            { id: "vengeful_bloodwitch", name: "Vengeful Bloodwitch", type: "creature", subtype: "Vampire Warlock", cost: "1B", cmc: 2, power: 1, toughness: 1, text: "Quando esta criatura ou outra criatura que você controla morre, oponente alvo perde 1 vida e você ganha 1 vida.", qty: 1 },
            { id: "crossway_troublemakers", name: "Crossway Troublemakers", type: "creature", subtype: "Vampire", cost: "5B", cmc: 6, power: 5, toughness: 5, text: "Vampiros atacantes têm toque mortífero e vínculo com a vida. Quando um Vampiro que você controla morre, você pode pagar 2 vidas. Se fizer isso, compre uma carta.", qty: 1 },
            // Feitiços (4)
            { id: "moment_of_craving", name: "Moment of Craving", type: "instant", cost: "1B", cmc: 2, text: "Criatura alvo recebe -2/-2 até o fim do turno. Você ganha 2 vidas.", qty: 1 },
            { id: "offer_immortality", name: "Offer Immortality", type: "instant", cost: "1B", cmc: 2, text: "Criatura alvo ganha toque mortífero e indestrutível até o fim do turno.", qty: 1 },
            { id: "heros_downfall", name: "Hero's Downfall", type: "instant", cost: "1BB", cmc: 3, text: "Destrua criatura ou planeswalker alvo.", qty: 1 },
            { id: "untamed_hunger", name: "Untamed Hunger", type: "enchantment", subtype: "Aura", cost: "2B", cmc: 3, keywords: ["enchant"], isDebuff: false, text: "Encantar criatura. Criatura encantada tem +2/+1 e ameaçar.", qty: 1 }
        ]
    },

    // ==================== ELVES (Verde) ====================
    elves: {
        name: "Elves",
        color: "green",
        cards: [
            // Terrenos (7)
            { id: "elves_forest_1", name: "Forest", type: "land", subtype: "basic", produces: "G", qty: 7 },
            // Terreno especial (1)
            { id: "elves_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },
            // Criaturas (9)
            { id: "llanowar_elves", name: "Llanowar Elves", type: "creature", subtype: "Elf Druid", cost: "G", cmc: 1, power: 1, toughness: 1, text: "T: Adicione G.", keywords: ["tap_for_mana"], produces: "G", qty: 1 },
            { id: "elvish_regrower", name: "Elvish Regrower", type: "creature", subtype: "Elf Druid", cost: "2GG", cmc: 4, power: 4, toughness: 3, text: "Quando entra, devolva card de permanente alvo do seu cemitério para sua mão.", qty: 1 },
            { id: "dwynenss_elite", name: "Dwynen's Elite", type: "creature", subtype: "Elf Warrior", cost: "1G", cmc: 2, power: 2, toughness: 2, text: "Quando entra, se você controla outro Elfo, crie um token 1/1 Elf Warrior.", qty: 1 },
            { id: "beast_kin_ranger", name: "Beast-Kin Ranger", type: "creature", subtype: "Elf Ranger", cost: "2G", cmc: 3, power: 3, toughness: 3, keywords: ["trample"], text: "Atropelar. Quando outra criatura entra em campo sob seu controle, esta criatura ganha +1/+0 até o fim do turno.", qty: 1 },
            { id: "thornweald_archer", name: "Thornweald Archer", type: "creature", subtype: "Elf Archer", cost: "1G", cmc: 2, power: 2, toughness: 1, keywords: ["reach", "deathtouch"], qty: 1 },
            { id: "elvish_archdruid", name: "Elvish Archdruid", type: "creature", subtype: "Elf Druid", cost: "1GG", cmc: 3, power: 2, toughness: 2, keywords: ["elf_lord"], text: "Outros Elfos têm +1/+1. T: Adicione G para cada Elfo que você controla.", qty: 1 },
            { id: "tajuru_pathwarden", name: "Tajuru Pathwarden", type: "creature", subtype: "Elf Warrior", cost: "4G", cmc: 5, power: 5, toughness: 4, keywords: ["vigilance", "trample"], qty: 1 },
            { id: "wildheart_invoker", name: "Wildheart Invoker", type: "creature", subtype: "Elf Shaman", cost: "2GG", cmc: 4, power: 4, toughness: 3, text: "8: Criatura alvo ganha +5/+5 e atropelar até o fim do turno.", qty: 1 },
            // Feitiços (4)
            { id: "snakeskin_veil", name: "Snakeskin Veil", type: "instant", cost: "G", cmc: 1, text: "Coloque um contador +1/+1 em criatura alvo que você controla. Ela ganha resistência a magia até o fim do turno.", qty: 1 },
            { id: "broken_wings", name: "Broken Wings", type: "instant", cost: "2G", cmc: 3, text: "Destrua artefato, encantamento ou criatura com voar alvo.", qty: 1 },
            { id: "felling_blow", name: "Felling Blow", type: "sorcery", cost: "2G", cmc: 3, text: "Coloque um contador +1/+1 em criatura alvo que você controla. Então ela causa dano igual ao seu poder a criatura alvo que um oponente controla.", qty: 1 },
            { id: "joraga_invocation", name: "Joraga Invocation", type: "sorcery", cost: "4GG", cmc: 6, text: "Cada criatura que você controla recebe +3/+3 até o fim do turno e deve ser bloqueada neste turno se possível.", qty: 1 }
        ]
    },

    // ==================== PIRATES (Azul) ====================
    pirates: {
        name: "Pirates",
        color: "blue",
        cards: [
            // Terrenos (7)
            { id: "pirates_island_1", name: "Island", type: "land", subtype: "basic", produces: "U", qty: 7 },
            // Terreno especial (1)
            { id: "pirates_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (7)
            { id: "spectral_sailor", name: "Spectral Sailor", type: "creature", subtype: "Spirit Pirate", cost: "U", cmc: 1, power: 1, toughness: 1, keywords: ["flying", "flash"], text: "Lampejo. Voar. 3U: Compre uma carta.", qty: 1 },
            { id: "kitesail_corsair", name: "Kitesail Corsair", type: "creature", subtype: "Human Pirate", cost: "1U", cmc: 2, power: 2, toughness: 1, text: "Esta criatura tem voar enquanto estiver atacando.", keywords: ["flying_when_attacking"], qty: 1 },
            { id: "brineborn_cutthroat", name: "Brineborn Cutthroat", type: "creature", subtype: "Merfolk Pirate", cost: "1U", cmc: 2, power: 2, toughness: 1, keywords: ["flash"], text: "Lampejo. Sempre que você conjurar uma mágica durante o turno de um oponente, coloque um contador +1/+1 nesta criatura.", qty: 1 },
            { id: "corsair_captain", name: "Corsair Captain", type: "creature", subtype: "Human Pirate", cost: "2U", cmc: 3, power: 2, toughness: 2, text: "Quando entra, crie um token de Tesouro. Outros Piratas que você controla recebem +1/+1.", keywords: ["pirate_lord", "etb_treasure"], qty: 1 },
            { id: "storm_fleet_spy", name: "Storm Fleet Spy", type: "creature", subtype: "Human Pirate", cost: "2U", cmc: 3, power: 2, toughness: 2, text: "Raid — Quando esta criatura entra, se você atacou neste turno, compre uma carta.", keywords: ["raid_draw"], qty: 1 },
            { id: "bigfin_bouncer", name: "Bigfin Bouncer", type: "creature", subtype: "Shark Pirate", cost: "3U", cmc: 4, power: 3, toughness: 2, text: "Quando entra, devolva criatura alvo que um oponente controla para a mão de seu dono.", keywords: ["etb_bounce"], qty: 1 },
            { id: "skyship_buccaneer", name: "Skyship Buccaneer", type: "creature", subtype: "Human Pirate", cost: "3UU", cmc: 5, power: 4, toughness: 3, keywords: ["flying", "raid_draw"], text: "Voar. Raid — Quando esta criatura entra, se você atacou neste turno, compre uma carta.", qty: 1 },
            { id: "tolarian_terror", name: "Tolarian Terror", type: "creature", subtype: "Serpent", cost: "6U", cmc: 7, power: 5, toughness: 5, keywords: ["ward"], text: "Esta mágica custa 1 a menos para cada card de mágica instantânea e feitiço em seu cemitério. Proteção 2.", qty: 1 },

            // Feitiços e Encantamentos (4)
            { id: "opt", name: "Opt", type: "instant", cost: "U", cmc: 1, text: "Vidência 1. Compre uma carta.", keywords: ["scry_1", "draw_1"], qty: 1 },
            { id: "cancel", name: "Cancel", type: "instant", cost: "1UU", cmc: 3, text: "Anule a mágica alvo.", keywords: ["counterspell"], qty: 1 },
            { id: "eaten_by_piranhas", name: "Eaten by Piranhas", type: "enchantment", subtype: "Aura", cost: "1U", cmc: 2, keywords: ["flash", "enchant"], isDebuff: true, text: "Lampejo. Encantar criatura. Criatura encantada perde todas as habilidades e é uma criatura preta Esqueleto com poder e resistência base 1/1.", qty: 1 },

            // Equipamento (1)
            { id: "pirates_cutlass", name: "Pirate's Cutlass", type: "artifact", subtype: "Equipment", cost: "3", cmc: 3, text: "Quando este Equipamento entra, anexe-o ao Pirata alvo que você controla. Criatura equipada recebe +2/+1. Equipar 2.", keywords: ["equipment", "etb_equip_pirate"], qty: 1 }
        ]
    },

    // ==================== HEALING (Branco) ====================
    healing: {
        name: "Healing",
        color: "white",
        cards: [
            // Terrenos (7)
            { id: "healing_plains_1", name: "Plains", type: "land", subtype: "basic", produces: "W", qty: 7 },
            // Terreno especial (1)
            { id: "healing_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (10)
            { id: "hinterland_sanctifier", name: "Hinterland Sanctifier", type: "creature", subtype: "Rabbit Cleric", cost: "W", cmc: 1, power: 1, toughness: 2, text: "Sempre que outra criatura entra sob seu controle, você ganha 1 vida.", keywords: ["creature_etb_lifegain"], qty: 1 },
            { id: "bishops_soldier", name: "Bishop's Soldier", type: "creature", subtype: "Vampire Soldier", cost: "1W", cmc: 2, power: 2, toughness: 2, keywords: ["lifelink"], qty: 1 },
            { id: "ajanis_pridemate", name: "Ajani's Pridemate", type: "creature", subtype: "Cat Soldier", cost: "1W", cmc: 2, power: 2, toughness: 2, text: "Sempre que você ganhar vida, coloque um contador +1/+1 nesta criatura.", keywords: ["lifegain_counter"], qty: 1 },
            { id: "dazzling_angel", name: "Dazzling Angel", type: "creature", subtype: "Angel", cost: "2W", cmc: 3, power: 2, toughness: 3, keywords: ["flying", "creature_etb_lifegain"], text: "Voar. Sempre que outra criatura entra sob seu controle, você ganha 1 vida.", qty: 1 },
            { id: "inspiring_overseer", name: "Inspiring Overseer", type: "creature", subtype: "Angel Cleric", cost: "2W", cmc: 3, power: 2, toughness: 1, keywords: ["flying", "etb_draw", "etb_gain_life_1"], text: "Voar. Quando esta criatura entra, você ganha 1 vida e compra uma carta.", qty: 1 },
            { id: "twinblade_paladin", name: "Twinblade Paladin", type: "creature", subtype: "Human Knight", cost: "3W", cmc: 4, power: 3, toughness: 3, text: "Sempre que você ganhar vida, coloque um contador +1/+1 nesta criatura. Enquanto você tiver 25 ou mais pontos de vida, esta criatura tem golpe duplo.", keywords: ["lifegain_counter"], qty: 1 },
            { id: "herald_of_faith", name: "Herald of Faith", type: "creature", subtype: "Angel", cost: "3WW", cmc: 5, power: 4, toughness: 3, keywords: ["flying", "attack_gain_life_2"], text: "Voar. Sempre que esta criatura atacar, você ganha 2 vidas.", qty: 1 },
            { id: "ancestor_dragon", name: "Ancestor Dragon", type: "creature", subtype: "Dragon", cost: "4WW", cmc: 6, power: 5, toughness: 6, keywords: ["flying", "mass_attack_lifegain"], text: "Voar. Sempre que uma ou mais criaturas que você controla atacarem, você ganha 1 vida para cada criatura atacante.", qty: 1 },

            // Instants (2)
            { id: "adamant_will", name: "Adamant Will", type: "instant", cost: "1W", cmc: 2, text: "Criatura alvo ganha +2/+2 e indestrutível até o fim do turno.", qty: 1 },
            { id: "deadly_riposte", name: "Deadly Riposte", type: "instant", cost: "1W", cmc: 2, text: "Deadly Riposte causa 3 de dano a criatura virada alvo e você ganha 2 vidas.", qty: 1 },

            // Enchantment (1)
            { id: "prayer_of_binding", name: "Prayer of Binding", type: "enchantment", cost: "3W", cmc: 4, keywords: ["flash"], text: "Lampejo. Quando este encantamento entra, exile permanente alvo que não seja terreno que um oponente controla até que este encantamento deixe o campo de batalha. Você ganha 2 vidas.", qty: 1 },

            // Equipment (1)
            { id: "quick_draw_katana", name: "Quick-Draw Katana", type: "artifact", subtype: "Equipment", cost: "2", cmc: 2, keywords: ["equipment"], text: "Durante seu turno, criatura equipada ganha +2/+0 e tem iniciativa. Equipar 2.", qty: 1 }
        ]
    },

    // ==================== INFERNO (Vermelho) ====================
    inferno: {
        name: "Inferno",
        color: "red",
        cards: [
            // Terrenos (8)
            { id: "inferno_mountain_1", name: "Mountain", type: "land", subtype: "basic", produces: "R", qty: 8 },
            // Terreno especial (1)
            { id: "inferno_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (8)
            { id: "dragonlords_servant", name: "Dragonlord's Servant", type: "creature", subtype: "Goblin Shaman", cost: "1R", cmc: 2, power: 1, toughness: 3, text: "Mágicas de Dragão que você conjura custam {1} a menos.", keywords: ["dragon_cost_reduction"], qty: 1 },
            { id: "kargan_dragonrider", name: "Kargan Dragonrider", type: "creature", subtype: "Human Warrior", cost: "1R", cmc: 2, power: 2, toughness: 2, text: "Enquanto você controlar um Dragão, esta criatura tem voar.", qty: 1 },
            { id: "firespitter_whelp", name: "Firespitter Whelp", type: "creature", subtype: "Dragon", cost: "2R", cmc: 3, power: 2, toughness: 2, keywords: ["flying", "spellcast_damage"], text: "Voar. Sempre que você conjurar uma mágica que não seja de criatura ou de Dragão, esta criatura causa 1 de dano a cada oponente.", qty: 1 },
            { id: "skyraker_giant", name: "Skyraker Giant", type: "creature", subtype: "Giant", cost: "2RR", cmc: 4, power: 4, toughness: 3, keywords: ["reach"], qty: 1 },
            { id: "fire_elemental", name: "Fire Elemental", type: "creature", subtype: "Elemental", cost: "3RR", cmc: 5, power: 5, toughness: 4, qty: 1 },
            { id: "rapacious_dragon", name: "Rapacious Dragon", type: "creature", subtype: "Dragon", cost: "4R", cmc: 5, power: 3, toughness: 3, keywords: ["flying", "etb_treasure_two"], text: "Voar. Quando esta criatura entra, crie dois tokens de Tesouro.", qty: 1 },
            { id: "terror_of_mount_velus", name: "Terror of Mount Velus", type: "creature", subtype: "Dragon", cost: "5RR", cmc: 7, power: 5, toughness: 5, keywords: ["flying", "double_strike", "etb_double_strike_all"], text: "Voar. Golpe duplo. Quando esta criatura entra, criaturas que você controla ganham golpe duplo até o fim do turno.", qty: 1 },

            // Instants (2)
            { id: "scorching_dragonfire", name: "Scorching Dragonfire", type: "instant", cost: "1R", cmc: 2, text: "Scorching Dragonfire causa 3 de dano à criatura ou planeswalker alvo. Se essa criatura ou planeswalker morrer neste turno, exile-a em vez disso.", keywords: ["exile_if_dies"], qty: 1 },
            { id: "fiery_annihilation", name: "Fiery Annihilation", type: "instant", cost: "2R", cmc: 3, text: "Fiery Annihilation causa 5 de dano à criatura alvo. Exile até um Equipamento alvo anexado àquela criatura. Se a criatura morrer neste turno, exile-a.", keywords: ["exile_if_dies"], qty: 1 },

            // Sorcery (1)
            { id: "seize_the_spoils", name: "Seize the Spoils", type: "sorcery", cost: "2R", cmc: 3, text: "Como custo adicional para conjurar esta mágica, descarte um card. Compre dois cards e crie um token de Tesouro.", keywords: ["discard_cost"], qty: 1 },

            // Artifact (1)
            { id: "carnelian_orb", name: "Carnelian Orb of Dragonkind", type: "artifact", cost: "2R", cmc: 3, text: "{T}: Adicione {R}. Se esse mana for gasto em uma mágica de criatura Dragão, ela ganha ímpeto até o fim do turno.", keywords: ["tap_for_mana", "dragon_haste_source"], produces: "R", qty: 1 }
        ]
    },

    // ==================== PRIMAL (Verde) ====================
    primal: {
        name: "Primal",
        color: "green",
        cards: [
            // Terrenos (8)
            { id: "primal_forest_1", name: "Forest", type: "land", subtype: "basic", produces: "G", qty: 8 },
            // Terreno especial (1)
            { id: "primal_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (8)
            { id: "mild_mannered_librarian", name: "Mild-Mannered Librarian", type: "creature", subtype: "Human", cost: "G", cmc: 1, power: 1, toughness: 1, text: "{3}{G}: Esta criatura se torna um Lobisomem. Coloque dois contadores +1/+1 nela e compre um card. Ative apenas uma vez.", qty: 1 },
            { id: "bear_cub", name: "Bear Cub", type: "creature", subtype: "Bear", cost: "1G", cmc: 2, power: 2, toughness: 2, qty: 1 },
            { id: "druid_of_the_cowl", name: "Druid of the Cowl", type: "creature", subtype: "Elf Druid", cost: "1G", cmc: 2, power: 1, toughness: 3, text: "{T}: Adicione {G}.", keywords: ["tap_for_mana"], produces: "G", qty: 1 },
            { id: "wildwood_scourge", name: "Wildwood Scourge", type: "creature", subtype: "Hydra", cost: "XG", cmc: 1, power: 0, toughness: 0, text: "Esta criatura entra com X contadores +1/+1. Sempre que um ou mais contadores +1/+1 forem colocados em outra criatura não-Hidra que você controla, coloque um contador +1/+1 nesta criatura.", keywords: ["counter_synergy", "etb_x_counters"], qty: 1 },
            { id: "thrashing_brontodon", name: "Thrashing Brontodon", type: "creature", subtype: "Dinosaur", cost: "1GG", cmc: 3, power: 3, toughness: 4, text: "{1}, Sacrifique esta criatura: Destrua artefato ou encantamento alvo.", qty: 1 },
            { id: "magnigoth_sentry", name: "Magnigoth Sentry", type: "creature", subtype: "Treefolk", cost: "3G", cmc: 4, power: 4, toughness: 4, keywords: ["reach"], qty: 1 },
            { id: "aggressive_mammoth", name: "Aggressive Mammoth", type: "creature", subtype: "Elephant", cost: "3GGG", cmc: 6, power: 8, toughness: 8, keywords: ["trample", "trample_lord"], text: "Atropelar. Outras criaturas que você controla têm atropelar.", qty: 1 },

            // Instants (2)
            { id: "giant_growth", name: "Giant Growth", type: "instant", cost: "G", cmc: 1, text: "Criatura alvo ganha +3/+3 até o fim do turno.", qty: 1 },
            { id: "bite_down", name: "Bite Down", type: "instant", cost: "1G", cmc: 2, text: "Criatura alvo que você controla causa dano igual ao seu poder a criatura ou planeswalker alvo que você não controla.", qty: 1 },

            // Sorcery (1)
            { id: "biogenic_upgrade", name: "Biogenic Upgrade", type: "sorcery", cost: "4GG", cmc: 6, text: "Distribua três contadores +1/+1 entre uma, duas ou três criaturas alvo, depois dobre o número de contadores +1/+1 em cada uma dessas criaturas.", qty: 1 },

            // Enchantment (1)
            { id: "new_horizons", name: "New Horizons", type: "enchantment", subtype: "Aura", cost: "2G", cmc: 3, keywords: ["enchant"], isDebuff: false, text: "Encantar terreno. Quando este encantamento entra, coloque um contador +1/+1 em criatura alvo que você controla. Terreno encantado tem '{T}: Adicione dois manas de uma mesma cor.'", qty: 1 }
        ]
    },

    // ==================== WIZARDS (Azul) ====================
    wizards: {
        name: "Wizards",
        color: "blue",
        cards: [
            // Terrenos (7)
            { id: "wizards_island_1", name: "Island", type: "land", subtype: "basic", produces: "U", qty: 7 },
            // Terreno especial (1)
            { id: "wizards_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (7)
            { id: "burrog_befuddler", name: "Burrog Befuddler", type: "creature", subtype: "Frog Wizard", cost: "1U", cmc: 2, power: 2, toughness: 1, keywords: ["flash", "etb_debuff"], text: "Lampejo. Quando esta criatura entra, criatura alvo que um oponente controla recebe -1/-0 até o fim do turno.", qty: 1 },
            { id: "mischievous_mystic", name: "Mischievous Mystic", type: "creature", subtype: "Human Wizard", cost: "1U", cmc: 2, power: 2, toughness: 1, keywords: ["flying", "second_draw_faerie"], text: "Voar. Sempre que você comprar seu segundo card em um turno, crie um token de criatura Fadinha 1/1 azul com voar.", qty: 1 },
            { id: "mystic_archaeologist", name: "Mystic Archaeologist", type: "creature", subtype: "Human Wizard", cost: "1U", cmc: 2, power: 2, toughness: 1, text: "{3}{U}{U}: Compre dois cards.", qty: 1 },
            { id: "exclusion_mage", name: "Exclusion Mage", type: "creature", subtype: "Human Wizard", cost: "2U", cmc: 3, power: 2, toughness: 2, keywords: ["etb_bounce"], text: "Quando esta criatura entra, devolva criatura alvo que um oponente controla para a mão de seu dono.", qty: 1 },
            { id: "erudite_wizard", name: "Erudite Wizard", type: "creature", subtype: "Human Wizard", cost: "2U", cmc: 3, power: 2, toughness: 3, keywords: ["second_draw_counter"], text: "Sempre que você comprar seu segundo card em um turno, coloque um contador +1/+1 nesta criatura.", qty: 1 },
            { id: "clinquant_skymage", name: "Clinquant Skymage", type: "creature", subtype: "Bird Wizard", cost: "3U", cmc: 4, power: 1, toughness: 1, keywords: ["flying", "draw_counter"], text: "Voar. Sempre que você comprar um card, coloque um contador +1/+1 nesta criatura.", qty: 1 },
            { id: "icewind_elemental", name: "Icewind Elemental", type: "creature", subtype: "Elemental", cost: "4U", cmc: 5, power: 3, toughness: 4, keywords: ["flying", "etb_loot"], text: "Voar. Quando esta criatura entra, compre um card, depois descarte um card.", qty: 1 },

            // Instants (4)
            { id: "fleeting_distraction", name: "Fleeting Distraction", type: "instant", cost: "U", cmc: 1, text: "Criatura alvo recebe -1/-0 até o fim do turno. Compre um card.", qty: 1 },
            { id: "into_the_roil", name: "Into the Roil", type: "instant", cost: "1U", cmc: 2, keywords: ["kicker"], kickerCost: "1U", text: "Encostar {1}{U}. Devolva a permanente alvo que não seja terreno para a mão de seu dono. Se esta mágica foi encostada, compre um card.", qty: 1 },
            { id: "quick_study", name: "Quick Study", type: "instant", cost: "2U", cmc: 3, keywords: ["draw_2"], text: "Compre dois cards.", qty: 1 },
            { id: "arcane_epiphany", name: "Arcane Epiphany", type: "instant", cost: "3UU", cmc: 5, keywords: ["wizard_discount", "draw_3"], text: "Esta mágica custa {1} a menos se você controlar um Mago. Compre três cards.", qty: 1 },

            // Enchantment (1)
            { id: "starlight_snare", name: "Starlight Snare", type: "enchantment", subtype: "Aura", cost: "2U", cmc: 3, keywords: ["enchant", "freeze_aura"], isDebuff: true, text: "Encantar criatura. Quando esta Aura entra, vire a criatura encantada. Criatura encantada não desvira durante a etapa de desvirar de seu controlador.", qty: 1 }
        ]
    },

    // ==================== UNDEAD (Preto) ====================
    undead: {
        name: "Undead",
        color: "black",
        cards: [
            // Terrenos (8)
            { id: "undead_swamp", name: "Swamp", type: "land", subtype: "basic", produces: "B", qty: 7 },
            { id: "undead_haven", name: "Uncharted Haven", type: "land", produces: "any", enters_tapped: true, qty: 1 },

            // Criaturas (8)
            { id: "diregraf_ghoul", name: "Diregraf Ghoul", type: "creature", subtype: "Zombie", cost: "B", cmc: 1, power: 2, toughness: 2, keywords: ["enters_tapped"], text: "Diregraf Ghoul entra em jogo virado.", qty: 1 },
            { id: "hungry_ghoul", name: "Hungry Ghoul", type: "creature", subtype: "Zombie", cost: "1B", cmc: 2, power: 2, toughness: 2, text: "{1}, Sacrifique outra criatura: Coloque um contador +1/+1 nesta criatura.", qty: 1 },
            { id: "reassembling_skeleton", name: "Reassembling Skeleton", type: "creature", subtype: "Skeleton Warrior", cost: "1B", cmc: 2, power: 1, toughness: 1, keywords: ["graveyard_return"], text: "{1}{B}: Devolva este card do seu cemitério para o campo de batalha virado.", qty: 1 },
            { id: "crow_of_dark_tidings", name: "Crow of Dark Tidings", type: "creature", subtype: "Zombie Bird", cost: "2B", cmc: 3, power: 2, toughness: 1, keywords: ["flying", "etb_mill_2", "death_mill_2"], text: "Voar. Quando esta criatura entra ou morre, coloque os dois cards do topo do seu grimório no cemitério.", qty: 1 },
            { id: "death_baron", name: "Death Baron", type: "creature", subtype: "Zombie Wizard", cost: "1BB", cmc: 3, power: 2, toughness: 2, keywords: ["zombie_skeleton_lord", "zombie_skeleton_deathtouch"], text: "Skeletons e outros Zombies que você controla recebem +1/+1 e têm toque mortífero.", qty: 1 },
            { id: "skeleton_archer", name: "Skeleton Archer", type: "creature", subtype: "Skeleton Archer", cost: "3B", cmc: 4, power: 3, toughness: 3, keywords: ["etb_ping_any"], text: "Quando esta criatura entra, ela causa 1 de dano a qualquer alvo.", qty: 1 },
            { id: "suspicious_shambler", name: "Suspicious Shambler", type: "creature", subtype: "Zombie", cost: "3B", cmc: 4, power: 4, toughness: 2, keywords: ["graveyard_create_zombies"], text: "{4}{B}{B}, Exile este card do seu cemitério: Crie dois tokens de criatura Zumbi 2/2 pretos. Ative apenas como feitiço.", qty: 1 },
            { id: "maalfeld_twins", name: "Maalfeld Twins", type: "creature", subtype: "Zombie", cost: "5B", cmc: 6, power: 4, toughness: 4, keywords: ["death_create_zombies"], text: "Quando esta criatura morre, crie dois tokens de criatura Zumbi 2/2 pretos.", qty: 1 },

            // Instants (2)
            { id: "undying_malice", name: "Undying Malice", type: "instant", cost: "B", cmc: 1, text: "Até o fim do turno, criatura alvo ganha 'Quando esta criatura morre, devolva-a ao campo de batalha virada sob o controle de seu dono com um contador +1/+1 nela.'", qty: 1 },
            { id: "deadly_plot", name: "Deadly Plot", type: "instant", cost: "3B", cmc: 4, text: "Escolha um — • Destrua a criatura ou planeswalker alvo. • Devolva card de criatura Zumbi alvo do seu cemitério para o campo de batalha virado.", qty: 1 },

            // Sorceries (2)
            { id: "cemetery_recruitment", name: "Cemetery Recruitment", type: "sorcery", cost: "1B", cmc: 2, text: "Devolva card de criatura alvo do seu cemitério para sua mão. Se for um card de Zumbi, compre um card.", qty: 1 },
            { id: "eaten_alive", name: "Eaten Alive", type: "sorcery", cost: "B", cmc: 1, keywords: ["sacrifice_cost"], text: "Como custo adicional para conjurar esta mágica, sacrifique uma criatura ou pague {3}{B}. Exile a criatura ou planeswalker alvo.", qty: 1 }
        ]
    }
};

// Contador global para garantir instanceIds únicos
let globalInstanceCounter = 0;

// Função para expandir cartas com qty > 1
function expandDeck(deckKey) {
    const deck = CARD_DATABASE[deckKey];
    const expandedCards = [];

    deck.cards.forEach(card => {
        const qty = card.qty || 1;
        for (let i = 0; i < qty; i++) {
            expandedCards.push({
                ...card,
                instanceId: `${card.id}_${globalInstanceCounter++}`,
                deckOrigin: deckKey
            });
        }
    });

    return expandedCards;
}

// Função para criar um deck combinado de 1 ou 2 jumpstarts
function createCombinedDeck(deck1Key, deck2Key) {
    const cards1 = expandDeck(deck1Key);
    // Se deck2Key não foi fornecido, retorna apenas o primeiro deck
    if (!deck2Key) {
        return cards1;
    }
    const cards2 = expandDeck(deck2Key);
    return [...cards1, ...cards2];
}

// Função para embaralhar
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Exportar para uso global
window.CARD_DATABASE = CARD_DATABASE;
window.expandDeck = expandDeck;
window.createCombinedDeck = createCombinedDeck;
window.shuffleDeck = shuffleDeck;
