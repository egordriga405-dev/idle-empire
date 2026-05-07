class GeneratorsManager {
    static getCost(genId, game) {
        const gen = CONFIG.GENERATORS.find(g => g.id === genId);
        const owned = game.state.generators[genId] || 0;
        return Math.floor(gen.baseCost * Math.pow(gen.costMultiplier, owned));
    }
    
    static getProduction(genId, game) {
        const gen = CONFIG.GENERATORS.find(g => g.id === genId);
        const owned = game.state.generators[genId] || 0;
        return gen.baseProduction * owned;
    }
    
    static buyGen(genId, game) {
        const cost = this.getCost(genId, game);
        if (game.state.gold < cost) return false;
        
        game.state.gold -= cost;
        game.state.generators[genId] = (game.state.generators[genId] || 0) + 1;
        game.recalculate();
        return true;
    }
    
    static getUpgradeCost(upgradeId, game) {
        const upgrade = CONFIG.UPGRADES.find(u => u.id === upgradeId);
        const level = game.state.upgrades[upgradeId] || 0;
        return Math.floor(upgrade.baseCost * Math.pow(2, level));
    }
    
    static buyUpgrade(upgradeId, game) {
        const cost = this.getUpgradeCost(upgradeId, game);
        if (game.state.gold < cost) return false;
        
        game.state.gold -= cost;
        game.state.upgrades[upgradeId] = (game.state.upgrades[upgradeId] || 0) + 1;
        game.recalculate();
        return true;
    }
}
