const CONFIG = {
    GOLD_PER_CLICK_BASE: 1,
    MAX_OFFLINE_TIME: 28800, // 8 часов в секундах
    OFFLINE_EFFICIENCY: 0.5, // 50% эффективности оффлайн
    DAILY_REWARD_BASE: 100,
    DAILY_REWARD_MULTIPLIER: 1.5,
    STREAK_MULTIPLIER: 0.1, // +10% к клику за день стрика
    MAX_STREAK_BONUS: 2.0, // максимум x2 от стрика
    PRESTIGE_COST: 1000000,
    PRESTIGE_MULTIPLIER: 2,
    
    GENERATORS: [
        { id: 'miner', name: '⛏️ Шахтёр', baseCost: 10, baseProduction: 1, costMultiplier: 1.15 },
        { id: 'factory', name: '🏭 Завод', baseCost: 100, baseProduction: 8, costMultiplier: 1.15 },
        { id: 'lab', name: '🔬 Лаборатория', baseCost: 1000, baseProduction: 47, costMultiplier: 1.15 },
        { id: 'portal', name: '🌀 Портал', baseCost: 10000, baseProduction: 260, costMultiplier: 1.15 },
        { id: 'ai', name: '🤖 ИИ-Центр', baseCost: 100000, baseProduction: 1400, costMultiplier: 1.15 },
    ],
    
    UPGRADES: [
        { id: 'click1', name: 'Усиление клика', baseCost: 50, multiplier: 2, appliesTo: 'click' },
        { id: 'click2', name: 'Супер-клик', baseCost: 500, multiplier: 3, appliesTo: 'click' },
        { id: 'gen1', name: 'Эффективность шахт', baseCost: 200, multiplier: 2, appliesTo: 'miner' },
        { id: 'global1', name: 'Глобальный буст', baseCost: 5000, multiplier: 2, appliesTo: 'all' },
    ],
    
    MISSIONS: [
        { id: 'clicks100', desc: '100 кликов', target: 100, reward: 50, type: 'clicks' },
        { id: 'gold1000', desc: 'Накопить 1000 🪙', target: 1000, reward: 100, type: 'gold' },
        { id: 'gen5', desc: 'Купить 5 генераторов', target: 5, reward: 200, type: 'generators' },
    ],
    
    DAILY_REWARDS: [100, 150, 225, 340, 500, 750, 1000],
};
