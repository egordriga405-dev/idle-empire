class Game {
    constructor() {
        this.state = {
            gold: 0,
            gems: 0,
            totalGoldEarned: 0,
            totalClicks: 0,
            generators: {},
            upgrades: {},
            prestigeLevel: 0,
            prestigeMultiplier: 1,
            streak: 0,
            lastLoginDate: null,
            missionsCompleted: {},
            lastSave: Date.now(),
            offlineTime: 0,
        };
        
        this.gps = 0; // gold per second
        this.cpc = CONFIG.GOLD_PER_CLICK_BASE; // click per click
    }
    
    init() {
        const loaded = Storage.load();
        if (loaded) {
            this.state = { ...this.state, ...loaded };
            this.processOffline();
        }
        this.recalculate();
        this.checkDailyLogin();
        return this;
    }
    
    processOffline() {
        if (!this.state.offlineTime || this.state.offlineTime <= 0) return 0;
        
        const offlineSeconds = Math.min(this.state.offlineTime, CONFIG.MAX_OFFLINE_TIME);
        const earned = this.calculateGPS() * offlineSeconds * CONFIG.OFFLINE_EFFICIENCY;
        
        return Math.floor(earned);
    }
    
    calculateGPS() {
        let total = 0;
        for (const gen of CONFIG.GENERATORS) {
            const owned = this.state.generators[gen.id] || 0;
            let production = gen.baseProduction * owned;
            
            // Применяем апгрейды к этому генератору
            for (const upgrade of CONFIG.UPGRADES) {
                if (upgrade.appliesTo === gen.id && this.state.upgrades[upgrade.id]) {
                    production *= upgrade.multiplier;
                }
            }
            
            // Глобальные апгрейды
            if (this.state.upgrades['global1']) {
                production *= CONFIG.UPGRADES.find(u => u.id === 'global1').multiplier;
            }
            
            total += production;
        }
        
        return total * this.state.prestigeMultiplier;
    }
    
    calculateCPC() {
        let base = CONFIG.GOLD_PER_CLICK_BASE;
        
        for (const upgrade of CONFIG.UPGRADES) {
            if (upgrade.appliesTo === 'click' && this.state.upgrades[upgrade.id]) {
                base *= upgrade.multiplier;
            }
        }
        
        if (this.state.upgrades['global1']) {
            base *= CONFIG.UPGRADES.find(u => u.id === 'global1').multiplier;
        }
        
        // Бонус стрика
        const streakBonus = 1 + Math.min(this.state.streak * CONFIG.STREAK_MULTIPLIER, CONFIG.MAX_STREAK_BONUS);
        
        return Math.floor(base * this.state.prestigeMultiplier * streakBonus);
    }
    
    recalculate() {
        this.gps = this.calculateGPS();
        this.cpc = this.calculateCPC();
    }
    
    click() {
        const earned = this.cpc;
        this.state.gold += earned;
        this.state.totalGoldEarned += earned;
        this.state.totalClicks++;
        this.recalculate();
        return earned;
    }
    
    tick(deltaSeconds) {
        const earned = this.gps * deltaSeconds;
        this.state.gold += earned;
        this.state.totalGoldEarned += earned;
    }
    
    checkDailyLogin() {
        const today = new Date().toDateString();
        
        if (this.state.lastLoginDate !== today) {
            if (this.state.lastLoginDate) {
                const yesterday = new Date(Date.now() - 86400000).toDateString();
                if (this.state.lastLoginDate === yesterday) {
                    this.state.streak++;
                } else {
                    this.state.streak = 0;
                }
            }
            this.state.lastLoginDate = today;
            return true; // новый день
        }
        return false;
    }
    
    getDailyReward() {
        const dayIndex = Math.min(this.state.streak, CONFIG.DAILY_REWARDS.length - 1);
        return CONFIG.DAILY_REWARDS[dayIndex] * this.state.prestigeMultiplier;
    }
    
    canPrestige() {
        return this.state.totalGoldEarned >= CONFIG.PRESTIGE_COST;
    }
    
    prestige() {
        if (!this.canPrestige()) return false;
        
        this.state.prestigeLevel++;
        this.state.prestigeMultiplier *= CONFIG.PRESTIGE_MULTIPLIER;
        this.state.gold = 0;
        this.state.totalGoldEarned = 0;
        this.state.generators = {};
        this.state.upgrades = {};
        this.state.gems += this.state.prestigeLevel;
        
        this.recalculate();
        return true;
    }
    
    toJSON() {
        return this.state;
    }
}
