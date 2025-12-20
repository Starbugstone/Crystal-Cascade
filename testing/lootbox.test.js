import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LootboxService } from '../src/game/engine/LootboxService';
import { useInventoryStore } from '../src/stores/inventoryStore';
import { createPinia, setActivePinia } from 'pinia';

describe('LootboxService', () => {
    let lootbox;

    beforeEach(() => {
        lootbox = new LootboxService();
    });

    it('should return a valid power ID and rarity when rolling', () => {
        const result = lootbox.roll();

        expect(result).toHaveProperty('powerId');
        expect(result).toHaveProperty('rarity');
        expect(typeof result.powerId).toBe('string');
        expect(typeof result.rarity).toBe('string');
        expect(['common', 'rare', 'epic', 'legendary']).toContain(result.rarity);
    });

    it('should respect rarity override', () => {
        const result = lootbox.roll('legendary');

        expect(result.rarity).toBe('legendary');
        expect(result.powerId).toBe('tile-breaker'); // Only legendary power
    });

    it('should return more common powers than legendary on average', () => {
        const results = { common: 0, rare: 0, epic: 0, legendary: 0 };

        for (let i = 0; i < 1000; i++) {
            const { rarity } = lootbox.roll();
            results[rarity]++;
        }

        expect(results.common).toBeGreaterThan(results.legendary);
        expect(results.common).toBeGreaterThan(results.epic);
        expect(results.rare).toBeGreaterThan(results.legendary);
    });

    it('should return correct rarity colors', () => {
        expect(lootbox.getRarityColor('common')).toBe('#9ca3af');
        expect(lootbox.getRarityColor('rare')).toBe('#3b82f6');
        expect(lootbox.getRarityColor('epic')).toBe('#a855f7');
        expect(lootbox.getRarityColor('legendary')).toBe('#f59e0b');
        expect(lootbox.getRarityColor('unknown')).toBe('#9ca3af'); // Fallback
    });

    it('should return correct power labels', () => {
        expect(lootbox.getPowerLabel('hammer')).toBe('Hammer');
        expect(lootbox.getPowerLabel('color-wand')).toBe('Color Wand');
        expect(lootbox.getPowerLabel('unknown')).toBe('unknown'); // Fallback
    });
});

describe('InventoryStore awardPower', () => {
    let inventoryStore;

    beforeEach(() => {
        setActivePinia(createPinia());
        inventoryStore = useInventoryStore();
    });

    it('should increase power quantity when awarding known power', () => {
        const initialQty = inventoryStore.quickAccessSlots.find(s => s.id === 'hammer').quantity;

        const result = inventoryStore.awardPower('hammer');

        expect(result).toBe(true);
        expect(inventoryStore.quickAccessSlots.find(s => s.id === 'hammer').quantity).toBe(initialQty + 1);
    });

    it('should award multiple quantities at once', () => {
        const initialQty = inventoryStore.quickAccessSlots.find(s => s.id === 'shuffle').quantity;

        inventoryStore.awardPower('shuffle', 5);

        expect(inventoryStore.quickAccessSlots.find(s => s.id === 'shuffle').quantity).toBe(initialQty + 5);
    });

    it('should return false for unknown power', () => {
        const result = inventoryStore.awardPower('unknown-power');

        expect(result).toBe(false);
    });
});
