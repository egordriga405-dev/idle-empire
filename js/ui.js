class UI {
    constructor(game) {
        this.game = game;
        this.particles = [];
    }
    
    init() {
        this.bindTabs();
        this.bindClick();
        this.render();
        this.startRenderLoop();
        this.startGameLoop();
        this.showPopups();
    }
    
    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
                
                if (btn.dataset.tab === 'generators') this.renderGenerators();
                if (btn.dataset.tab === 'upgrades') this.renderUpgrades();
                if (btn.dataset.tab === 'prestige') this.renderPrestige();
                if (btn.dataset.tab === 'settings') this.renderSettings();
            });
        });
    }
    
    bindClick() {
        const target = document.getElementById('click-target');
        target.addEventListener('click', (e) => {
            const earned = this.game.click();
            this.spawnParticles(e.clientX, e.clientY, earned);
            this.updateTopBar();
        });
        
        target.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const earned = this.game.click();
            const touch = e.touches[0];
            this.spawnParticles(touch.clientX, touch.clientY, earned);
            this.updateTopBar();
        });
    }
    
    spawnParticles(x, y, amount) {
        const container = document.getElementById('particles');
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = `+${amount}`;
            particle.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                color: var(--accent);
                font-weight: bold;
                font-size: ${14 + Math.random() * 10}px;
                pointer-events: none;
                animation: floatUp 1s ease-out forwards;
                transform: translate(-50%, -50%);
                opacity: 1;
            `;
            container.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1000);
        }
    }
    
    updateTopBar() {
        document.getElementById('gold-amount').textContent = this.formatNumber(this.game.state.gold);
        document.getElementById('gems-amount').textContent = this.formatNumber(this.game.state.gems);
    }
    
    updateStats() {
        document.getElementById('gps-display').textContent = this.formatNumber(this.game.gps);
        document.getElementById('cpc-display').textContent = this.formatNumber(this.game.cpc);
        document.getElementById('streak-display').textContent = this.game.state.streak;
    }
    
    render() {
        this.updateTopBar();
        this.updateStats();
        this.renderMissions();
    }
    
    renderGenerators() {
        const container = document.getElementById('tab-generators');
        container.innerHTML = '<h2>🏗️ Генераторы</h2>';
        
        for (const gen of CONFIG.GENERATORS) {
            const owned = this.game.state.generators[gen.id] || 0;
            const cost = GeneratorsManager.getCost(gen.id, this.game);
            const production = GeneratorsManager.getProduction(gen.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            
            container.innerHTML += `
                <div class="generator-card">
                    <div class="gen-info">
                        <span class="gen-name">${gen.name}</span>
                        <span class="gen-owned">${owned} шт.</span>
                        <span class="gen-prod">+${this.formatNumber(production)}/сек</span>
                    </div>
                    <button class="buy-btn ${canBuy ? '' : 'disabled'}" 
                            onclick="window.ui.buyGen('${gen.id}')">
                        ${this.formatNumber(cost)} 🪙
                    </button>
                </div>
            `;
        }
    }
    
    renderUpgrades() {
        const container = document.getElementById('tab-upgrades');
        container.innerHTML = '<h2>⬆️ Улучшения</h2>';
        
        for (const upgrade of CONFIG.UPGRADES) {
            const level = this.game.state.upgrades[upgrade.id] || 0;
            const cost = GeneratorsManager.getUpgradeCost(upgrade.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            
            container.innerHTML += `
                <div class="upgrade-card">
                    <div class="upgrade-info">
                        <span>${upgrade.name}</span>
                        <span>Уровень: ${level}</span>
                        <span>Множитель: x${upgrade.multiplier}</span>
                    </div>
                    <button class="buy-btn ${canBuy ? '' : 'disabled'}" 
                            onclick="window.ui.buyUpgrade('${upgrade.id}')">
                        ${this.formatNumber(cost)} 🪙
                    </button>
                </div>
            `;
        }
    }
    
    renderPrestige() {
        const container = document.getElementById('tab-prestige');
        const canPrestige = this.game.canPrestige();
        
        container.innerHTML = `
            <h2>🌟 Престиж</h2>
            <p>Уровень престижа: ${this.game.state.prestigeLevel}</p>
            <p>Множитель: x${this.game.state.prestigeMultiplier}</p>
            <p>Всего заработано: ${this.formatNumber(this.game.state.totalGoldEarned)} / ${this.formatNumber(CONFIG.PRESTIGE_COST)}</p>
            <p>Сбросит прогресс, но удвоит производство!</p>
            <button id="prestige-btn" ${canPrestige ? '' : 'disabled'} onclick="window.ui.doPrestige()">
                🔄 Престиж (+1 💎)
            </button>
        `;
    }
    
    renderSettings() {
        const container = document.getElementById('tab-settings');
        container.innerHTML = `
            <h2>⚙️ Настройки</h2>
            <button onclick="Storage.reset(); location.reload();">🗑️ Сбросить прогресс</button>
            <p style="margin-top:16px;">Версия: 1.0.0</p>
        `;
    }
    
    renderMissions() {
        const container = document.getElementById('missions-list');
        container.innerHTML = '<h3>📋 Миссии</h3>';
        
        for (const mission of CONFIG.MISSIONS) {
            let progress = 0;
            if (mission.type === 'clicks') progress = this.game.state.totalClicks;
            if (mission.type === 'gold') progress = this.game.state.totalGoldEarned;
            if (mission.type === 'generators') {
                progress = Object.values(this.game.state.generators).reduce((a, b) => a + b, 0);
            }
            
            const completed = this.game.state.missionsCompleted[mission.id];
            const progressPercent = Math.min(100, (progress / mission.target) * 100);
            
            container.innerHTML += `
                <div class="mission-card ${completed ? 'completed' : ''}">
                    <span>${mission.desc}</span>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${progressPercent}%"></div>
                    </div>
                    <span>${completed ? '✅' : `${this.formatNumber(mission.reward)} 🪙`}</span>
                </div>
            `;
        }
    }
    
    showPopups() {
        // Оффлайн заработок
        const offlineEarned = this.game.processOffline();
        if (offlineEarned > 0) {
            document.getElementById('offline-amount').textContent = `+${this.formatNumber(offlineEarned)} 🪙`;
            document.getElementById('offline-time').textContent = 
                `${Math.floor(this.game.state.offlineTime / 60)} мин`;
            document.getElementById('offline-popup').style.display = 'block';
            
            document.getElementById('claim-offline').onclick = () => {
                this.game.state.gold += offlineEarned;
                document.getElementById('offline-popup').style.display = 'none';
                this.updateTopBar();
            };
        }
        
        // Ежедневная награда
        if (this.game.checkDailyLogin()) {
            const reward = this.game.getDailyReward();
            document.getElementById('daily-day').textContent = this.game.state.streak + 1;
            document.getElementById('daily-amount').textContent = `+${this.formatNumber(reward)} 🪙`;
            document.getElementById('daily-popup').style.display = 'block';
            
            document.getElementById('claim-daily').onclick = () => {
                this.game.state.gold += reward;
                document.getElementById('daily-popup').style.display = 'none';
                this.updateTopBar();
            };
        }
    }
    
    buyGen(genId) {
        if (GeneratorsManager.buyGen(genId, this.game)) {
            this.updateTopBar();
            this.renderGenerators();
            this.render();
        }
    }
    
    buyUpgrade(upgradeId) {
        if (GeneratorsManager.buyUpgrade(upgradeId, this.game)) {
            this.updateTopBar();
            this.renderUpgrades();
            this.render();
        }
    }
    
    doPrestige() {
        if (this.game.prestige()) {
            alert('Престиж выполнен! Множитель удвоен!');
            this.render();
            document.getElementById('tab-main').classList.add('active');
            document.getElementById('tab-prestige').classList.remove('active');
        }
    }
    
    startRenderLoop() {
        setInterval(() => {
            this.render();
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab.id === 'tab-generators') this.renderGenerators();
            if (activeTab.id === 'tab-upgrades') this.renderUpgrades();
            if (activeTab.id === 'tab-prestige') this.renderPrestige();
        }, 1000); // Рендеринг каждую секунду
    }
    
    startGameLoop() {
        const TICK_RATE = 0.1; // 100ms
        setInterval(() => {
            this.game.tick(TICK_RATE);
        }, TICK_RATE * 1000);
        
        // Автосохранение каждые 30 секунд
        setInterval(() => {
            Storage.save(this.game.state);
        }, 30000);
    }
    
    formatNumber(num) {
        if (num < 1000) return Math.floor(num).toString();
        if (num < 1e6) return (num / 1e3).toFixed(1) + 'K';
        if (num < 1e9) return (num / 1e6).toFixed(1) + 'M';
        if (num < 1e12) return (num / 1e9).toFixed(1) + 'B';
        return (num / 1e12).toFixed(1) + 'T';
    }
}
