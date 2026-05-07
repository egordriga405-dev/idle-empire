class UI {
    constructor(game) {
        this.game = game;
        this.particles = [];
        this.missionCompletedCache = {};
    }
    
    init() {
        this.bindTabs();
        this.bindClick();
        this.render();
        this.startRenderLoop();
        this.startGameLoop();
        this.showPopups();
        this.addOrbitRing();
    }
    
    addOrbitRing() {
        const clickArea = document.querySelector('.click-area');
        const ring = document.createElement('div');
        ring.className = 'orbit-ring';
        clickArea.appendChild(ring);
    }
    
    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const tabContent = document.getElementById(`tab-${btn.dataset.tab}`);
                tabContent.classList.add('active');
                
                this.renderTabContent(btn.dataset.tab);
            });
        });
    }
    
    renderTabContent(tab) {
        switch(tab) {
            case 'generators': this.renderGenerators(); break;
            case 'upgrades': this.renderUpgrades(); break;
            case 'missions': this.renderMissionsTab(); break;
            case 'prestige': this.renderPrestige(); break;
            case 'settings': this.renderSettings(); break;
        }
    }
    
    bindClick() {
        const target = document.getElementById('click-target');
        
        const handleClick = (e) => {
            e.preventDefault();
            const earned = this.game.click();
            const pos = this.getClickPosition(e);
            this.spawnParticles(pos.x, pos.y, earned);
            this.updateTopBar();
            this.checkRareDrop();
        };
        
        target.addEventListener('click', handleClick);
        target.addEventListener('touchstart', handleClick, { passive: false });
    }
    
    getClickPosition(e) {
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }
    
    spawnParticles(x, y, amount, type = 'gold') {
        const container = document.getElementById('particles');
        const count = 6;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${type}`;
            particle.textContent = `+${this.formatNumber(amount)}`;
            
            const angle = (Math.random() * Math.PI * 2);
            const distance = 30 + Math.random() * 60;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance - 40;
            
            particle.style.cssText = `
                left: ${x}px;
                top: ${y}px;
                font-size: ${14 + Math.random() * 12}px;
                --tx: ${tx}px;
                --ty: ${ty}px;
                animation: none;
                transform: translate(-50%, -50%);
                opacity: 1;
            `;
            
            container.appendChild(particle);
            
            // Анимация через requestAnimationFrame для плавности
            requestAnimationFrame(() => {
                particle.style.transition = 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                particle.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
                particle.style.opacity = '0';
            });
            
            setTimeout(() => particle.remove(), 1200);
        }
    }
    
    checkRareDrop() {
        // 1% шанс дропа гема при клике
        if (Math.random() < 0.01) {
            this.game.state.gems++;
            const target = document.getElementById('click-target');
            const rect = target.getBoundingClientRect();
            this.spawnParticles(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                1,
                'gem'
            );
            this.showToast('💎 Найден редкий самоцвет!');
        }
    }
    
    updateTopBar() {
        const goldEl = document.getElementById('gold-amount');
        const gemsEl = document.getElementById('gems-amount');
        
        const newGold = this.formatNumber(this.game.state.gold);
        const newGems = this.formatNumber(this.game.state.gems);
        
        if (goldEl.textContent !== newGold) {
            goldEl.textContent = newGold;
            document.getElementById('gold-display').classList.add('gain');
            setTimeout(() => document.getElementById('gold-display').classList.remove('gain'), 300);
        }
        
        gemsEl.textContent = newGems;
    }
    
    updateStats() {
        document.getElementById('gps-display').textContent = this.formatNumber(this.game.gps);
        document.getElementById('cpc-display').textContent = this.formatNumber(this.game.cpc);
        document.getElementById('streak-display').textContent = this.game.state.streak;
    }
    
    render() {
        this.updateTopBar();
        this.updateStats();
        this.updateMissionsPreview();
    }
    
    updateMissionsPreview() {
        const container = document.getElementById('missions-list');
        if (!container) return;
        
        let html = '<h3>📋 Активные миссии</h3>';
        let hasIncomplete = false;
        
        for (const mission of CONFIG.MISSIONS) {
            if (this.game.state.missionsCompleted[mission.id]) continue;
            hasIncomplete = true;
            
            const progress = this.getMissionProgress(mission);
            const percent = Math.min(100, (progress / mission.target) * 100);
            
            html += `
                <div class="mission-card" style="padding:10px;margin:6px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:13px;">${mission.desc}</span>
                        <span style="color:var(--accent);font-weight:700;font-size:12px;">+${this.formatNumber(mission.reward)} 🪙</span>
                    </div>
                    <div class="progress-bar" style="height:4px;margin:4px 0;">
                        <div class="progress-fill" style="width:${percent}%"></div>
                    </div>
                    <span style="font-size:10px;color:var(--text-secondary);">${this.formatNumber(progress)}/${this.formatNumber(mission.target)}</span>
                </div>
            `;
        }
        
        if (!hasIncomplete) {
            html += '<p style="color:var(--accent-green);text-align:center;padding:20px;">🎉 Все миссии выполнены!</p>';
        }
        
        container.innerHTML = html;
    }
    
    renderMissionsTab() {
        const container = document.getElementById('tab-missions');
        if (!container) return;
        
        let html = '<h2>📋 Задания</h2>';
        
        // Проверяем новые завершенные миссии
        const newlyCompleted = [];
        for (const mission of CONFIG.MISSIONS) {
            if (!this.game.state.missionsCompleted[mission.id] && 
                !this.missionCompletedCache[mission.id]) {
                const progress = this.getMissionProgress(mission);
                if (progress >= mission.target) {
                    newlyCompleted.push(mission.id);
                }
            }
        }
        
        // Сохраняем в кеш
        for (const id of newlyCompleted) {
            this.missionCompletedCache[id] = true;
        }
        
        for (const mission of CONFIG.MISSIONS) {
            const completed = this.game.state.missionsCompleted[mission.id];
            const progress = this.getMissionProgress(mission);
            const percent = Math.min(100, (progress / mission.target) * 100);
            const canClaim = !completed && progress >= mission.target;
            
            html += `
                <div class="mission-card ${completed ? 'completed-mission' : ''}">
                    <div class="mission-header">
                        <div class="mission-title">
                            ${completed ? '✅' : '📋'} ${mission.desc}
                        </div>
                        <div class="mission-reward">+${this.formatNumber(mission.reward)} 🪙</div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${percent}%"></div>
                    </div>
                    <div class="progress-text">
                        <span>${this.formatNumber(progress)} / ${this.formatNumber(mission.target)}</span>
                        <span>${Math.floor(percent)}%</span>
                    </div>
                    <button class="claim-btn ${canClaim ? 'completed' : ''}" 
                            ${!canClaim ? 'disabled' : ''}
                            onclick="window.ui.claimMission('${mission.id}')">
                        ${completed ? '✅ Получено' : canClaim ? '🎁 Забрать награду!' : '🔒 Выполняется...'}
                    </button>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    claimMission(missionId) {
        const mission = CONFIG.MISSIONS.find(m => m.id === missionId);
        if (!mission || this.game.state.missionsCompleted[missionId]) return;
        
        const progress = this.getMissionProgress(mission);
        if (progress < mission.target) return;
        
        // Выдаём награду
        this.game.state.missionsCompleted[missionId] = true;
        this.game.state.gold += mission.reward;
        this.game.state.totalGoldEarned += mission.reward;
        
        // Эффект
        this.showToast(`🎉 Задание выполнено! +${this.formatNumber(mission.reward)} 🪙`);
        
        // Обновляем UI
        this.updateTopBar();
        this.renderMissionsTab();
        this.updateMissionsPreview();
        Storage.save(this.game.state);
    }
    
    getMissionProgress(mission) {
        switch(mission.type) {
            case 'clicks': return this.game.state.totalClicks;
            case 'gold': return this.game.state.totalGoldEarned;
            case 'generators': 
                return Object.values(this.game.state.generators).reduce((a, b) => a + b, 0);
            default: return 0;
        }
    }
    
    showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-tertiary);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 30px;
            font-weight: 700;
            z-index: 200;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            border: 1px solid var(--accent);
            animation: bounceIn 0.5s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    renderGenerators() {
        const container = document.getElementById('tab-generators');
        let html = '<h2>🏗️ Генераторы</h2>';
        
        CONFIG.GENERATORS.forEach((gen, index) => {
            const owned = this.game.state.generators[gen.id] || 0;
            const cost = GeneratorsManager.getCost(gen.id, this.game);
            const production = GeneratorsManager.getProduction(gen.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            
            html += `
                <div class="generator-card" style="animation-delay:${index * 0.05}s">
                    <div class="gen-icon">${gen.name.split(' ')[0]}</div>
                    <div class="gen-info">
                        <span class="gen-name">${gen.name.split(' ').slice(1).join(' ')}</span>
                        <span class="gen-owned">Владею: ${owned}</span>
                        <span class="gen-prod">+${this.formatNumber(production)}/сек</span>
                    </div>
                    <button class="buy-btn ${canBuy ? '' : 'disabled'}" 
                            onclick="window.ui.buyGen('${gen.id}')">
                        ${this.formatNumber(cost)} 🪙
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    renderUpgrades() {
        const container = document.getElementById('tab-upgrades');
        let html = '<h2>⬆️ Улучшения</h2>';
        
        CONFIG.UPGRADES.forEach((upgrade, index) => {
            const level = this.game.state.upgrades[upgrade.id] || 0;
            const cost = GeneratorsManager.getUpgradeCost(upgrade.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            const appliesToText = upgrade.appliesTo === 'click' ? 'Клик' : 
                                 upgrade.appliesTo === 'all' ? 'Всё' : 
                                 CONFIG.GENERATORS.find(g => g.id === upgrade.appliesTo)?.name || upgrade.appliesTo;
            
            html += `
                <div class="upgrade-card" style="animation-delay:${index * 0.05}s">
                    <div class="gen-icon">⬆️</div>
                    <div class="gen-info">
                        <span class="gen-name">${upgrade.name}</span>
                        <span class="gen-owned">Уровень: ${level} | Множитель: x${Math.pow(upgrade.multiplier, level)}</span>
                        <span class="gen-prod">Применяется: ${appliesToText}</span>
                    </div>
                    <button class="buy-btn ${canBuy ? '' : 'disabled'}" 
                            onclick="window.ui.buyUpgrade('${upgrade.id}')">
                        ${this.formatNumber(cost)} 🪙
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    renderPrestige() {
        const container = document.getElementById('tab-prestige');
        const canPrestige = this.game.canPrestige();
        const progress = (this.game.state.totalGoldEarned / CONFIG.PRESTIGE_COST) * 100;
        
        container.innerHTML = `
            <div class="prestige-info">
                <h2>🌟 Престиж</h2>
                <div class="prestige-level">${this.game.state.prestigeLevel}</div>
                <p style="color:var(--text-secondary);">Текущий уровень</p>
                <div style="margin:20px 0;">
                    <p>Множитель производства: <strong style="color:var(--accent-purple);">x${this.game.state.prestigeMultiplier}</strong></p>
                    <p>Самоцветов: <strong style="color:var(--accent-purple);">${this.game.state.gems} 💎</strong></p>
                </div>
                <div class="progress-bar" style="margin:16px 0;">
                    <div class="progress-fill" style="width:${Math.min(100, progress)}%; background: linear-gradient(90deg, var(--accent-purple), var(--accent-pink));"></div>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);">${this.formatNumber(this.game.state.totalGoldEarned)} / ${this.formatNumber(CONFIG.PRESTIGE_COST)} 🪙</p>
                <p style="margin:12px 0;color:var(--accent-red);">⚠️ Сбросит весь прогресс кроме самоцветов!</p>
                <button class="prestige-btn" ${canPrestige ? '' : 'disabled'} onclick="window.ui.doPrestige()">
                    ${canPrestige ? '🔄 Выполнить Престиж (+1 💎)' : '🔒 Недостаточно золота'}
                </button>
            </div>
        `;
    }
    
    renderSettings() {
        const container = document.getElementById('tab-settings');
        container.innerHTML = `
            <h2>⚙️ Настройки</h2>
            <div style="background:var(--bg-secondary);border-radius:var(--radius);padding:16px;margin:10px 0;">
                <p><strong>Версия:</strong> 2.0.0</p>
                <p><strong>ID:</strong> ${tg?.initDataUnsafe?.user?.id || 'N/A'}</p>
                <p><strong>Сохранений:</strong> localStorage</p>
            </div>
            <button class="settings-btn" onclick="Storage.save(window.ui.game.state); window.ui.showToast('💾 Прогресс сохранён!')">
                💾 Сохранить вручную
            </button>
            <button class="settings-btn" onclick="window.ui.exportSave()">
                📋 Экспорт сохранения
            </button>
            <button class="settings-btn danger" onclick="if(confirm('Точно сбросить ВЕСЬ прогресс?')){Storage.reset();location.reload();}">
                🗑️ Сбросить прогресс
            </button>
        `;
    }
    
    exportSave() {
        const data = JSON.stringify(this.game.state, null, 2);
        navigator.clipboard?.writeText(data);
        this.showToast('📋 Сохранение скопировано в буфер!');
    }
    
    showPopups() {
        const offlineEarned = this.game.processOffline();
        if (offlineEarned > 0) {
            const mins = Math.floor(this.game.state.offlineTime / 60);
            const secs = this.game.state.offlineTime % 60;
            
            document.getElementById('offline-amount').innerHTML = `+${this.formatNumber(offlineEarned)} 🪙`;
            document.getElementById('offline-time').textContent = 
                mins > 0 ? `${mins} мин ${secs} сек` : `${secs} сек`;
            document.getElementById('offline-popup').style.display = 'block';
            
            document.getElementById('claim-offline').onclick = () => {
                this.game.state.gold += offlineEarned;
                this.game.state.totalGoldEarned += offlineEarned;
                document.getElementById('offline-popup').style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    document.getElementById('offline-popup').style.display = 'none';
                }, 300);
                this.updateTopBar();
                Storage.save(this.game.state);
            };
        }
        
        if (this.game.checkDailyLogin()) {
            const reward = this.game.getDailyReward();
            const dayIndex = Math.min(this.game.state.streak, CONFIG.DAILY_REWARDS.length - 1);
            
            document.getElementById('daily-day').textContent = dayIndex + 1;
            document.getElementById('daily-amount').innerHTML = `+${this.formatNumber(reward)} 🪙`;
            document.getElementById('daily-popup').style.display = 'block';
            
            document.getElementById('claim-daily').onclick = () => {
                this.game.state.gold += reward;
                this.game.state.totalGoldEarned += reward;
                document.getElementById('daily-popup').style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    document.getElementById('daily-popup').style.display = 'none';
                }, 300);
                this.updateTopBar();
                Storage.save(this.game.state);
            };
        }
    }
    
    buyGen(genId) {
        const card = event?.target?.closest('.generator-card');
        if (GeneratorsManager.buyGen(genId, this.game)) {
            this.updateTopBar();
            this.renderGenerators();
            this.render();
            
            // Анимация успешной покупки
            if (card) {
                card.style.transform = 'scale(1.05)';
                card.style.borderColor = 'var(--accent-green)';
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.borderColor = '';
                }, 300);
            }
        } else {
            // Анимация ошибки
            if (card) {
                card.style.animation = 'shake 0.5s ease';
                setTimeout(() => card.style.animation = '', 500);
            }
        }
    }
    
    buyUpgrade(upgradeId) {
        if (GeneratorsManager.buyUpgrade(upgradeId, this.game)) {
            this.updateTopBar();
            this.renderUpgrades();
            this.render();
            this.showToast('⬆️ Улучшение куплено!');
        }
    }
    
    doPrestige() {
        if (this.game.prestige()) {
            this.showToast('🌟 Престиж выполнен! Множитель удвоен!');
            this.render();
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-tab="main"]').classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-main').classList.add('active');
        }
    }
    
    startRenderLoop() {
        setInterval(() => {
            this.render();
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab?.id === 'tab-generators') this.renderGenerators();
            if (activeTab?.id === 'tab-upgrades') this.renderUpgrades();
            if (activeTab?.id === 'tab-missions') this.renderMissionsTab();
        }, 1000);
    }
    
    startGameLoop() {
        const TICK_RATE = 0.1;
        setInterval(() => {
            this.game.tick(TICK_RATE);
        }, TICK_RATE * 1000);
        
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
