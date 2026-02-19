/**
 * Motor de regras simplificado para testes
 * Replica a lógica essencial do rules.js para testes isolados
 */

class TestRulesEngine {
    constructor(gameState = {}) {
        this.game = gameState;
    }

    // Calcula bônus de lords e outras fontes estáticas
    getCreatureBonuses(creature) {
        const bonuses = { power: 0, toughness: 0 };

        if (!this.game || !this.game.player) return bonuses;

        // Encontrar o controlador da criatura
        const isPlayerCreature = this.game.player.battlefield &&
            this.game.player.battlefield.includes(creature);
        const controller = isPlayerCreature ? this.game.player : this.game.opponent;

        if (!controller || !controller.battlefield) return bonuses;

        // Verificar lords no campo de batalha do controlador
        controller.battlefield.forEach(card => {
            // Elvish Archdruid: outros Elfos têm +1/+1
            if (card.id === 'elvish_archdruid' && card !== creature &&
                creature.subtype && creature.subtype.includes('Elf')) {
                bonuses.power += 1;
                bonuses.toughness += 1;
            }

            // Dropkick Bomber: outros Goblins têm +1/+1
            if (card.id === 'dropkick_bomber' && card !== creature &&
                creature.subtype && creature.subtype.includes('Goblin')) {
                bonuses.power += 1;
                bonuses.toughness += 1;
            }
        });

        return bonuses;
    }

    // Calcula o poder efetivo de uma criatura
    getCreaturePower(creature) {
        let power = creature.power || 0;
        power += creature.powerModifier || 0;

        // Bônus de lords
        const bonuses = this.getCreatureBonuses(creature);
        power += bonuses.power;

        // Contadores +1/+1 (suporta ambos os formatos para compatibilidade)
        if (creature.counters) {
            if (creature.counters.plusOnePlusOne) {
                power += creature.counters.plusOnePlusOne;
            } else if (creature.counters['+1/+1']) {
                power += creature.counters['+1/+1'];
            }
        }

        // Contadores -1/-1
        if (creature.counters && creature.counters['-1/-1']) {
            power -= creature.counters['-1/-1'];
        }

        return Math.max(0, power);
    }

    // Calcula a resistência efetiva de uma criatura
    getCreatureToughness(creature) {
        let toughness = creature.toughness || 0;
        toughness += creature.toughnessModifier || 0;

        // Bônus de lords
        const bonuses = this.getCreatureBonuses(creature);
        toughness += bonuses.toughness;

        // Contadores +1/+1 (suporta ambos os formatos para compatibilidade)
        if (creature.counters) {
            if (creature.counters.plusOnePlusOne) {
                toughness += creature.counters.plusOnePlusOne;
            } else if (creature.counters['+1/+1']) {
                toughness += creature.counters['+1/+1'];
            }
        }

        // Contadores -1/-1
        if (creature.counters && creature.counters['-1/-1']) {
            toughness -= creature.counters['-1/-1'];
        }

        return toughness;
    }

    // Verifica se uma criatura está morta
    isCreatureDead(creature) {
        const toughness = this.getCreatureToughness(creature);
        const damage = creature.damage || 0;
        return toughness <= 0 || damage >= toughness;
    }

    // Verifica se dano é letal (considera deathtouch)
    isLethalDamage(attacker, defender) {
        const damage = this.getCreaturePower(attacker);
        const toughness = this.getCreatureToughness(defender);

        // Deathtouch: qualquer dano > 0 é letal
        if (attacker.keywords && attacker.keywords.includes('deathtouch')) {
            return damage > 0;
        }

        return damage >= toughness;
    }

    // Verifica se criatura pode atacar
    canAttack(creature) {
        if (creature.tapped) return false;
        if (creature.summoningSickness && !this.hasHaste(creature)) return false;
        return true;
    }

    // Verifica se criatura tem haste
    hasHaste(creature) {
        return creature.keywords && creature.keywords.includes('haste');
    }

    // Verifica se criatura tem uma keyword (base, temporária ou condicional)
    hasKeyword(creature, keyword, checkConditional = true) {
        if (creature.keywords && creature.keywords.includes(keyword)) return true;
        if (creature.temporaryKeywords && creature.temporaryKeywords.includes(keyword)) return true;
        return false;
    }

    // Verifica se criatura pode bloquear
    canBlock(blocker, attacker) {
        if (blocker.tapped) return false;

        // Não pode bloquear
        if (blocker.keywords && blocker.keywords.includes('cant_block')) {
            return false;
        }

        // Flying só pode ser bloqueado por flying ou reach
        if (attacker.keywords && attacker.keywords.includes('flying')) {
            const hasFlying = blocker.keywords && blocker.keywords.includes('flying');
            const hasReach = blocker.keywords && blocker.keywords.includes('reach');
            if (!hasFlying && !hasReach) return false;
        }

        // Menace precisa de 2+ bloqueadores (simplificado: sempre pode bloquear)
        // A verificação real seria no momento de confirmar bloqueios

        return true;
    }

    // Resolve dano de combate entre atacante e bloqueador
    resolveCombatDamage(attacker, blocker) {
        const attackerPower = this.getCreaturePower(attacker);
        const blockerPower = this.getCreaturePower(blocker);

        // First Strike / Double Strike
        const attackerHasFirstStrike = attacker.keywords &&
            (attacker.keywords.includes('first_strike') || attacker.keywords.includes('double_strike'));
        const blockerHasFirstStrike = blocker.keywords &&
            (blocker.keywords.includes('first_strike') || blocker.keywords.includes('double_strike'));

        const result = {
            attackerDamage: 0,
            blockerDamage: 0,
            attackerDies: false,
            blockerDies: false
        };

        // Fase de First Strike
        if (attackerHasFirstStrike && !blockerHasFirstStrike) {
            // Atacante causa dano primeiro
            blocker.damage = (blocker.damage || 0) + attackerPower;
            if (this.isLethalDamage(attacker, blocker) || this.isCreatureDead(blocker)) {
                result.blockerDies = true;
                result.blockerDamage = attackerPower;
                return result; // Bloqueador morre antes de causar dano
            }
        } else if (blockerHasFirstStrike && !attackerHasFirstStrike) {
            // Bloqueador causa dano primeiro
            attacker.damage = (attacker.damage || 0) + blockerPower;
            if (this.isLethalDamage(blocker, attacker) || this.isCreatureDead(attacker)) {
                result.attackerDies = true;
                result.attackerDamage = blockerPower;
                return result;
            }
        }

        // Fase de dano normal
        attacker.damage = (attacker.damage || 0) + blockerPower;
        blocker.damage = (blocker.damage || 0) + attackerPower;

        result.attackerDamage = blockerPower;
        result.blockerDamage = attackerPower;

        // Verificar mortes (considera deathtouch)
        result.attackerDies = this.isLethalDamage(blocker, attacker) || this.isCreatureDead(attacker);
        result.blockerDies = this.isLethalDamage(attacker, blocker) || this.isCreatureDead(blocker);

        return result;
    }

    // Calcula dano de trample ao jogador
    calculateTrampleDamage(attacker, blockers) {
        const attackerPower = this.getCreaturePower(attacker);
        let totalBlockerToughness = 0;

        blockers.forEach(blocker => {
            totalBlockerToughness += this.getCreatureToughness(blocker) - (blocker.damage || 0);
        });

        const excessDamage = attackerPower - totalBlockerToughness;
        return Math.max(0, excessDamage);
    }

    // Verifica se criatura tem Pacifism (ou efeito similar)
    hasPacifism(creature) {
        if (!this.game || !this.game.player) return false;

        const allBattlefields = [
            ...(this.game.player.battlefield || []),
            ...(this.game.opponent?.battlefield || [])
        ];

        return allBattlefields.some(card =>
            card.id === 'pacifism' && card.attachedTo === creature.instanceId
        );
    }

    // Verifica se uma criatura pode ser alvo de um jogador
    canBeTargetedBy(creature, caster) {
        if (!this.game?.player?.battlefield) {
            return true;
        }
        const playerHasCreature = this.game.player.battlefield.some(c => c.instanceId === creature.instanceId);
        const creatureController = playerHasCreature ? this.game.player : this.game.opponent;

        // Own creatures can always be targeted
        if (caster === creatureController) {
            return true;
        }

        // Hexproof blocks opponent targeting
        if (this.hasKeyword(creature, 'hexproof', false)) {
            return false;
        }

        return true;
    }

    // Verifica se tem mana suficiente (simplificado)
    hasEnoughMana(cost, availableMana) {
        const parsed = this.parseCost(cost);
        let totalAvailable = Object.values(availableMana).reduce((a, b) => a + b, 0);
        let totalNeeded = parsed.generic + parsed.colored.length;
        return totalAvailable >= totalNeeded;
    }

    // Parse de custo de mana
    parseCost(cost) {
        if (!cost) return { generic: 0, colored: [] };

        const result = { generic: 0, colored: [] };
        const matches = cost.match(/(\d+)|([WUBRG])/g) || [];

        matches.forEach(m => {
            if (/\d+/.test(m)) {
                result.generic = parseInt(m);
            } else {
                result.colored.push(m);
            }
        });

        return result;
    }
}

module.exports = { TestRulesEngine };
