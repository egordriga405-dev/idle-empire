class CloudStorage {
    constructor(telegram) {
        this.tg = telegram;
        this.cloudKey = 'idle_empire_cloud';
        this.leaderboardKey = 'idle_empire_lb';
    }
    
    async saveToCloud(gameState) {
        if (!this.tg.isTelegram || !this.tg.user) return false;
        
        try {
            const data = {
                userId: this.tg.user.id,
                username: this.tg.user.username || this.tg.user.first_name,
                premium: this.tg.isPremium(),
                gameState: {
                    gold: gameState.gold,
                    totalGoldEarned: gameState.totalGoldEarned,
                    prestigeLevel: gameState.prestigeLevel,
                    prestigeMultiplier: gameState.prestigeMultiplier,
                    streak: gameState.streak,
                    gems: gameState.gems,
                    totalClicks: gameState.totalClicks,
                    generators: gameState.generators,
                },
                timestamp: Date.now(),
            };
            
            // Отправляем в бот данные для сохранения
            this.tg.sendData(JSON.stringify({
                action: 'save',
                key: this.cloudKey,
                data: data
            }));
            
            return true;
        } catch (e) {
            console.error('Cloud save error:', e);
            return false;
        }
    }
    
    async loadFromCloud() {
        if (!this.tg.isTelegram) return null;
        
        try {
            // Запрашиваем данные через sendData
            this.tg.sendData(JSON.stringify({
                action: 'load',
                key: this.cloudKey
            }));
            
            // Данные придут через событие, пока возвращаем null
            return null;
        } catch (e) {
            console.error('Cloud load error:', e);
            return null;
        }
    }
    
    async updateLeaderboard(gameState) {
        if (!this.tg.isTelegram || !this.tg.user) return [];
        
        try {
            const entry = {
                userId: this.tg.user.id,
                name: this.tg.user.first_name || 'Игрок',
                username: this.tg.user.username || '',
                premium: this.tg.isPremium(),
                score: gameState.totalGoldEarned || 0,
                prestige: gameState.prestigeLevel || 0,
                streak: gameState.streak || 0,
                timestamp: Date.now(),
            };
            
            this.tg.sendData(JSON.stringify({
                action: 'leaderboard_update',
                key: this.leaderboardKey,
                data: entry
            }));
            
            return [entry];
        } catch (e) {
            console.error('Leaderboard error:', e);
            return [];
        }
    }
    
    // Фейковый лидерборд для демо/браузера
    getFakeLeaderboard(currentGame) {
        const demoUsers = [
            { name: '🏆 DragonSlayer', score: 15000000, prestige: 5, streak: 30 },
            { name: '👑 GoldKing', score: 12000000, prestige: 4, streak: 25 },
            { name: '💎 CryptoLord', score: 10000000, prestige: 3, streak: 20 },
            { name: '⭐ StarClicker', score: 8000000, prestige: 3, streak: 18 },
            { name: '🔥 FireMaster', score: 5000000, prestige: 2, streak: 15 },
        ];
        
        let leaderboard = [...demoUsers];
        
        // Добавляем текущего игрока
        if (this.tg?.user) {
            leaderboard.push({
                name: 'Вы',
                score: currentGame.state.totalGoldEarned,
                prestige: currentGame.state.prestigeLevel,
                streak: currentGame.state.streak,
                isCurrentUser: true
            });
        }
        
        // Сортируем
        leaderboard.sort((a, b) => b.score - a.score);
        
        return leaderboard.slice(0, 10);
    }
}
