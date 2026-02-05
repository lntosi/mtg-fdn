/**
 * Factory functions para criar objetos de teste
 * Simula as estruturas do jogo sem precisar carregar todo o código
 */

// Cria uma criatura básica para testes
function createCreature(overrides = {}) {
    return {
        instanceId: `creature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Creature',
        type: 'creature',
        subtype: '',
        power: 2,
        toughness: 2,
        damage: 0,
        tapped: false,
        summoningSickness: true,
        keywords: [],
        powerModifier: 0,
        toughnessModifier: 0,
        counters: {},
        ...overrides
    };
}

// Cria um jogador básico para testes
function createPlayer(overrides = {}) {
    return {
        name: 'Test Player',
        life: 20,
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        landsPlayedThisTurn: 0,
        ...overrides
    };
}

// Cria um terreno básico
function createLand(overrides = {}) {
    return {
        instanceId: `land_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Forest',
        type: 'land',
        subtype: 'basic',
        produces: 'G',
        tapped: false,
        ...overrides
    };
}

// Cria um feitiço básico
function createSpell(overrides = {}) {
    return {
        instanceId: `spell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Spell',
        type: 'instant',
        cost: '1R',
        cmc: 2,
        ...overrides
    };
}

// Cria um estado de jogo mínimo para testes
function createGameState(overrides = {}) {
    return {
        player: createPlayer({ name: 'Player' }),
        opponent: createPlayer({ name: 'Opponent' }),
        activePlayer: null,
        phase: 'main1',
        turnNumber: 1,
        currentAttackers: [],
        blockerAssignments: {},
        stack: [],
        ...overrides
    };
}

// Criaturas específicas do jogo
const CREATURES = {
    beastKinRanger: () => createCreature({
        id: 'beast_kin_ranger',
        name: 'Beast-Kin Ranger',
        subtype: 'Elf Ranger',
        power: 3,
        toughness: 3,
        keywords: ['trample']
    }),

    vampireInterloper: () => createCreature({
        id: 'vampire_interloper',
        name: 'Vampire Interloper',
        subtype: 'Vampire Rogue',
        power: 2,
        toughness: 1,
        keywords: ['flying', 'cant_block']
    }),

    thornwealdArcher: () => createCreature({
        id: 'thornweald_archer',
        name: 'Thornweald Archer',
        subtype: 'Elf Archer',
        power: 1,
        toughness: 2,
        keywords: ['reach', 'deathtouch']
    }),

    llanowarElves: () => createCreature({
        id: 'llanowar_elves',
        name: 'Llanowar Elves',
        subtype: 'Elf Druid',
        power: 1,
        toughness: 1,
        keywords: ['tap_for_mana'],
        produces: 'G'
    }),

    elvishArchdruid: () => createCreature({
        id: 'elvish_archdruid',
        name: 'Elvish Archdruid',
        subtype: 'Elf Druid',
        power: 2,
        toughness: 2
    }),

    leoninVanguard: () => createCreature({
        id: 'leonin_vanguard',
        name: 'Leonin Vanguard',
        subtype: 'Cat Soldier',
        power: 1,
        toughness: 1
    }),

    frenziedGoblin: () => createCreature({
        id: 'frenzied_goblin',
        name: 'Frenzied Goblin',
        subtype: 'Goblin Berserker',
        power: 1,
        toughness: 1
    }),

    goblinSmuggler: () => createCreature({
        id: 'goblin_smuggler',
        name: 'Goblin Smuggler',
        subtype: 'Goblin Rogue',
        power: 2,
        toughness: 2,
        keywords: ['haste']
    }),

    dropkickBomber: () => createCreature({
        id: 'dropkick_bomber',
        name: 'Dropkick Bomber',
        subtype: 'Goblin Warrior',
        power: 2,
        toughness: 3,
        keywords: ['goblin_lord']
    }),

    ragingRedcap: () => createCreature({
        id: 'raging_redcap',
        name: 'Raging Redcap',
        subtype: 'Goblin Knight',
        power: 1,
        toughness: 2,
        keywords: ['double_strike']
    }),

    swabGoblin: () => createCreature({
        id: 'swab_goblin',
        name: 'Swab Goblin',
        subtype: 'Goblin Pirate',
        power: 2,
        toughness: 2
    }),

    crosswayTroublemakers: () => createCreature({
        id: 'crossway_troublemakers',
        name: 'Crossway Troublemakers',
        subtype: 'Vampire',
        power: 5,
        toughness: 5
    }),

    vampireNeonate: () => createCreature({
        id: 'vampire_neonate',
        name: 'Vampire Neonate',
        subtype: 'Vampire',
        power: 1,
        toughness: 1
    }),

    // Counter Synergy creatures
    wildwoodScourge: () => createCreature({
        id: 'wildwood_scourge',
        name: 'Wildwood Scourge',
        subtype: 'Hydra',
        power: 1,
        toughness: 1,
        keywords: ['counter_synergy']
    }),

    ajanisPridemate: () => createCreature({
        id: 'ajani_pridemate',
        name: "Ajani's Pridemate",
        subtype: 'Cat Soldier',
        power: 2,
        toughness: 2,
        keywords: ['lifegain_counter']
    }),

    // Lord creatures
    deathBaron: () => createCreature({
        id: 'death_baron',
        name: 'Death Baron',
        subtype: 'Zombie Wizard',
        power: 2,
        toughness: 2,
        keywords: ['zombie_skeleton_lord']
    }),

    gravedigger: () => createCreature({
        id: 'gravedigger',
        name: 'Gravedigger',
        subtype: 'Zombie',
        power: 2,
        toughness: 2
    }),

    skeletonArcher: () => createCreature({
        id: 'skeleton_archer',
        name: 'Skeleton Archer',
        subtype: 'Skeleton Archer',
        power: 3,
        toughness: 3
    }),

    mildManneredLibrarian: () => createCreature({
        id: 'mild_mannered_librarian',
        name: 'Mild-Mannered Librarian',
        subtype: 'Human',
        power: 1,
        toughness: 1
    })
};

// Feitiços específicos do jogo
const SPELLS = {
    elspethsSmite: () => createSpell({
        id: 'elspeths_smite',
        name: "Elspeth's Smite",
        type: 'instant',
        cost: 'W',
        cmc: 1,
        text: 'Exile target attacking or blocking creature.'
    }),

    volley: () => createSpell({
        id: 'volley',
        name: 'Volley',
        type: 'instant',
        cost: '1R',
        cmc: 2,
        text: 'Volley deals 3 damage to target creature with flying.'
    }),

    momentOfTriumph: () => createSpell({
        id: 'moment_of_triumph',
        name: 'Moment of Triumph',
        type: 'instant',
        cost: 'W',
        cmc: 1,
        text: 'Target creature gets +2/+2 until end of turn. You gain 2 life.'
    })
};

module.exports = {
    createCreature,
    createPlayer,
    createLand,
    createSpell,
    createGameState,
    CREATURES,
    SPELLS
};
