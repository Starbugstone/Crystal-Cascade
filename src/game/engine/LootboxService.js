/**
 * LootboxService - Handles lootbox rolling with rarity-based power drops
 */

import dropTables from '../../data/dropTables.json';

export class LootboxService {
    constructor() {
        this.rarityWeights = dropTables.rarityWeights ?? {
            common: 60,
            rare: 25,
            epic: 12,
            legendary: 3,
        };

        this.powerRarities = dropTables.powerRarities ?? {
            'clear-row': 'common',
            'shuffle': 'common',
            'hammer': 'rare',
            'color-wand': 'epic',
            'tile-breaker': 'legendary',
        };

        this.rarityColors = {
            common: '#9ca3af',    // Gray
            rare: '#3b82f6',      // Blue
            epic: '#a855f7',      // Purple
            legendary: '#f59e0b', // Orange/Gold
        };
    }

    /**
     * Get total weight for rarity calculation
     */
    _getTotalWeight() {
        return Object.values(this.rarityWeights).reduce((sum, w) => sum + w, 0);
    }

    /**
     * Roll a random rarity based on weights
     * @returns {string} Rarity tier name
     */
    _rollRarity() {
        const total = this._getTotalWeight();
        let roll = Math.random() * total;

        for (const [rarity, weight] of Object.entries(this.rarityWeights)) {
            roll -= weight;
            if (roll <= 0) {
                return rarity;
            }
        }

        // Fallback to common
        return 'common';
    }

    /**
     * Get all powers of a specific rarity
     * @param {string} rarity - The rarity tier
     * @returns {string[]} Array of power IDs
     */
    _getPowersByRarity(rarity) {
        return Object.entries(this.powerRarities)
            .filter(([, r]) => r === rarity)
            .map(([powerId]) => powerId);
    }

    /**
     * Roll a lootbox and get a random power
     * @param {string} [rarityOverride] - Force a specific rarity (for testing)
     * @returns {{ powerId: string, rarity: string }}
     */
    roll(rarityOverride = null) {
        const rarity = rarityOverride ?? this._rollRarity();
        const powers = this._getPowersByRarity(rarity);

        if (powers.length === 0) {
            // Fallback to common if no powers in this rarity
            const commonPowers = this._getPowersByRarity('common');
            const powerId = commonPowers[Math.floor(Math.random() * commonPowers.length)];
            return { powerId, rarity: 'common' };
        }

        const powerId = powers[Math.floor(Math.random() * powers.length)];
        return { powerId, rarity };
    }

    /**
     * Get the display color for a rarity tier
     * @param {string} rarity - The rarity tier
     * @returns {string} CSS color value
     */
    getRarityColor(rarity) {
        return this.rarityColors[rarity] ?? this.rarityColors.common;
    }

    /**
     * Get human-readable label for a power
     * @param {string} powerId - The power ID
     * @returns {string} Display label
     */
    getPowerLabel(powerId) {
        const labels = {
            'clear-row': 'Clear Row',
            'shuffle': 'Shuffle',
            'hammer': 'Hammer',
            'color-wand': 'Color Wand',
            'tile-breaker': 'Tile Breaker',
        };
        return labels[powerId] ?? powerId;
    }
}

// Singleton instance for easy access
export const lootboxService = new LootboxService();
