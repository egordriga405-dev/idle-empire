class UI {
    constructor(game, tgAPI, cloud) {
        this.game = game;
        this.tg = tgAPI;
        this.cloud = cloud;
        this.particles = [];
        this.missionCompletedCache = {};
        this.leaderboardVisible = false;
    }
    
    init() {
        this.bindTabs();
        this.bindClick();
        this.render();
        this.startRenderLoop();
        this.startGameLoop();
        this.showPopups();
        this.addOrbitRing();
        
        // Обновляем лидерборд при загрузке
        if (this.tg.isTelegram) {
            this.cloud.updateLeaderboard(this.game.state);
        }
    }
    
    addOrbitRing() {
        const clickArea = document.querySelector('.click-area');
        if (!clickArea) return;
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
                if (tabContent) {
                    tabContent.classList.add('active');
                }
                
                this.renderTabContent(btn.dataset.tab);
                
                // Показываем BackButton в Telegram если не на главной
                if (btn.dataset.tab !== 'main' && this.tg?.tg?.BackButton) {
                    this.tg.tg.BackButton.show();
                } else if (this.tg?.tg?.BackButton) {
                    this.tg.tg.BackButton.hide();
                }
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
            case 'main': break;
        }
    }
    
    bindClick() {
        const target = document.getElementById('click-target');
        if (!target) return;
        
        const handleClick = (e) => {
            e.preventDefault();
            const earned = this.game.click();
            const pos = this.getClickPosition(e);
            this.spawnParticles(pos.x, pos.y, earned);
            this.updateTopBar();
            this.checkRareDrop();
            
            // Тактильная отдача
            if (this.tg) {
                this.tg.hapticImpact('light');
            }
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
        if (!container) return;
        
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
            if (target) {
                const rect = target.getBoundingClientRect();
                this.spawnParticles(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    1,
                    'gem'
                );
            }
            this.showToast('💎 Найден редкий самоцвет!');
            
            // Тактильная отдача для редкого дропа
            if (this.tg) {
                this.tg.hapticImpact('heavy');
            }
        }
    }
    
    updateTopBar() {
        const goldEl = document.getElementById('gold-amount');
        const gemsEl = document.getElementById('gems-amount');
        
        if (goldEl) {
            const newGold = this.formatNumber(this.game.state.gold);
            if (goldEl.textContent !== newGold) {
                goldEl.textContent = newGold;
                const goldDisplay = document.getElementById('gold-display');
                if (goldDisplay) {
                    goldDisplay.classList.add('gain');
                    setTimeout(() => goldDisplay.classList.remove('gain'), 300);
                }
            }
        }
        
        if (gemsEl) {
            gemsEl.textContent = this.formatNumber(this.game.state.gems);
        }
    }
    
    updateStats() {
        const gpsEl = document.getElementById('gps-display');
        const cpcEl = document.getElementById('cpc-display');
        const streakEl = document.getElementById('streak-display');
        
        if (gpsEl) gpsEl.textContent = this.formatNumber(this.game.gps);
        if (cpcEl) cpcEl.textContent = this.formatNumber(this.game.cpc);
        if (streakEl) streakEl.textContent = this.game.state.streak;
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
        
        // Обновляем бейдж на вкладке Missions
        this.updateMissionsBadge();
    }
    
    updateMissionsBadge() {
        const missionsBtn = document.querySelector('[data-tab="missions"]');
        if (!missionsBtn) return;
        
        // Считаем завершённые, но не собранные миссии
        let readyToClaim = 0;
        for (const mission of CONFIG.MISSIONS) {
            if (!this.game.state.missionsCompleted[mission.id]) {
                const progress = this.getMissionProgress(mission);
                if (progress >= mission.target) {
                    readyToClaim++;
                }
            }
        }
        
        // Удаляем старый бейдж
        const oldBadge = missionsBtn.querySelector('.tab-badge');
        if (oldBadge) oldBadge.remove();
        
        // Добавляем новый если есть что забирать
        if (readyToClaim > 0) {
            const badge = document.createElement('span');
            badge.className = 'tab-badge';
            badge.textContent = readyToClaim;
            missionsBtn.appendChild(badge);
        }
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
        
        // Тактильная отдача
        if (this.tg) {
            this.tg.hapticImpact('heavy');
        }
        
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
            max-width: 90%;
            text-align: center;
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
        if (!container) return;
        
        let html = '<h2>🏗️ Генераторы</h2>';
        
        CONFIG.GENERATORS.forEach((gen, index) => {
            const owned = this.game.state.generators[gen.id] || 0;
            const cost = GeneratorsManager.getCost(gen.id, this.game);
            const production = GeneratorsManager.getProduction(gen.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            const nameParts = gen.name.split(' ');
            const icon = nameParts[0];
            const name = nameParts.slice(1).join(' ');
            
            html += `
                <div class="generator-card" style="animation-delay:${index * 0.05}s">
                    <div class="gen-icon">${icon}</div>
                    <div class="gen-info">
                        <span class="gen-name">${name}</span>
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
        if (!container) return;
        
        let html = '<h2>⬆️ Улучшения</h2>';
        
        CONFIG.UPGRADES.forEach((upgrade, index) => {
            const level = this.game.state.upgrades[upgrade.id] || 0;
            const cost = GeneratorsManager.getUpgradeCost(upgrade.id, this.game);
            const canBuy = this.game.state.gold >= cost;
            const appliesToText = upgrade.appliesTo === 'click' ? 'Клик' : 
                                 upgrade.appliesTo === 'all' ? 'Всё' : 
                                 CONFIG.GENERATORS.find(g => g.id === upgrade.appliesTo)?.name?.split(' ').slice(1).join(' ') || upgrade.appliesTo;
            const multiplier = Math.pow(upgrade.multiplier, level);
            
            html += `
                <div class="upgrade-card" style="animation-delay:${index * 0.05}s">
                    <div class="gen-icon">⬆️</div>
                    <div class="gen-info">
                        <span class="gen-name">${upgrade.name}</span>
                        <span class="gen-owned">Уровень: ${level} | Множитель: x${multiplier}</span>
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
        if (!container) return;
        
        const canPrestige = this.game.canPrestige();
        const progress = Math.min(100, (this.game.state.totalGoldEarned / CONFIG.PRESTIGE_COST) * 100);
        
        container.innerHTML = `
            <h2>🌟 Престиж</h2>
            <div class="prestige-info">
                <div class="prestige-level">${this.game.state.prestigeLevel}</div>
                <p style="color:var(--text-secondary);">Текущий уровень</p>
                <div style="margin:20px 0;">
                    <p>Множитель производства: <strong style="color:var(--accent-purple);">x${this.game.state.prestigeMultiplier}</strong></p>
                    <p>Самоцветов: <strong style="color:var(--accent-purple);">${this.game.state.gems} 💎</strong></p>
                </div>
                <div class="progress-bar" style="margin:16px 0;">
                    <div class="progress-fill" style="width:${progress}%; background: linear-gradient(90deg, var(--accent-purple), var(--accent-pink));"></div>
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
        if (!container) return;
        
        const saveSize = Storage.getSaveSize();
        
        container.innerHTML = `
            <h2>⚙️ Настройки</h2>
            
            <div class="player-card" style="background:var(--bg-secondary);border-radius:var(--radius);padding:16px;margin:10px 0;display:flex;align-items:center;gap:12px;">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:20px;">
                    ${this.tg.isPremium() ? '👑' : '🎮'}
                </div>
                <div>
                    <div style="font-weight:700;">${this.tg.user?.first_name || 'Игрок'} ${this.tg.isPremium() ? '⭐' : ''}</div>
                    <div style="font-size:13px;color:var(--text-secondary);">
                        @${this.tg.user?.username || 'player'}
                        ${this.tg.isPremium() ? ' · Telegram Premium' : ''}
                    </div>
                </div>
            </div>
            
            <div style="background:var(--bg-secondary);border-radius:var(--radius);padding:16px;margin:10px 0;">
                <p><strong>🆔 ID:</strong> ${this.tg.user?.id || 'N/A'}</p>
                <p><strong>📱 Платформа:</strong> ${this.tg.platform}</p>
                <p><strong>🌐 WebApp:</strong> v${this.tg.version}</p>
                <p><strong>💾 Локальное сохранение:</strong> ${saveSize}</p>
                <p><strong>💎 Telegram Premium:</strong> ${this.tg.isPremium() ? 'Да' : 'Нет'}</p>
            </div>
            
            <button class="settings-btn" onclick="window.ui.saveManually()">
                💾 Сохранить сейчас
            </button>
            
            <button class="settings-btn" onclick="window.ui.saveToCloud()">
                ☁️ Сохранить в облако
            </button>
            
            <button class="settings-btn" onclick="window.ui.showLeaderboard()">
                🏆 Таблица лидеров
            </button>
            
            <button class="settings-btn" onclick="window.ui.shareGame()">
                📤 Поделиться игрой
            </button>
            
            <button class="settings-btn" onclick="window.ui.inviteFriend()">
                👥 Пригласить друга
            </button>
            
            <button class="settings-btn" onclick="window.ui.openChannel()">
                📢 Наш канал
            </button>
            
            <button class="settings-btn" onclick="window.ui.exportSave()">
                📋 Экспорт сохранения
            </button>
            
            <button class="settings-btn danger" onclick="window.ui.resetWithConfirm()">
                🗑️ Сбросить прогресс
            </button>
            
            <div id="leaderboard-container" style="margin-top:16px;"></div>
        `;
    }
    
    saveManually() {
        Storage.save(this.game.state);
        if (this.tg) this.tg.hapticImpact('medium');
        this.showToast('💾 Сохранено локально!');
        this.renderSettings();
    }
    
    saveToCloud() {
        if (!this.tg.isTelegram) {
            this.showToast('⚠️ Доступно только в Telegram');
            return;
        }
        
        this.cloud.saveToCloud(this.game.state);
        if (this.tg) this.tg.hapticImpact('heavy');
        this.showToast('☁️ Сохранено в облаке!');
    }
    
    showLeaderboard() {
        const container = document.getElementById('leaderboard-container');
        if (!container) return;
        
        const leaderboard = this.cloud.getFakeLeaderboard(this.game);
        
        // Обновляем в облаке
        if (this.tg.isTelegram) {
            this.cloud.updateLeaderboard(this.game.state);
        }
        
        let html = '<h3 style="margin-top:16px;">🏆 Таблица лидеров</h3>';
        
        leaderboard.forEach((player, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            const isMe = player.name === 'Вы' || player.isCurrentUser;
            
            html += `
                <div style="background:${isMe ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'};border-radius:var(--radius-sm);padding:12px;margin:6px 0;display:flex;align-items:center;gap:10px;border:1px solid ${isMe ? 'var(--accent)' : 'var(--border)'};">
                    <div style="font-size:24px;width:40px;text-align:center;">${medal}</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;${isMe ? 'color:var(--accent);' : ''}">
                            ${player.premium ? '👑 ' : ''}${player.name} ${isMe ? '(Вы)' : ''}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);">
                            Престиж: ${player.prestige} · Стрик: ${player.streak} дн.
                        </div>
                    </div>
                    <div style="font-weight:700;color:var(--accent);">
                        ${this.formatNumber(player.score)} 🪙
                    </div>
                </div>
            `;
        });
        
        html += `
            <p style="text-align:center;margin-top:8px;font-size:12px;color:var(--text-secondary);">
                Обновляется каждый час · Игроков: ${leaderboard.length}
            </p>
        `;
        
        container.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth' });
        
        if (this.tg) this.tg.hapticImpact('light');
    }
    
    shareGame() {
        const text = '🎮 Idle Empire — зарабатывай золото даже в оффлайне! Присоединяйся!';
        const url = 'https://t.me/IdleEmpireBot/start';
        
        if (this.tg.isTelegram) {
            if (this.tg.tg?.shareToStory) {
                this.tg.shareToStory('', text, url);
            } else {
                this.tg.openTelegramLink(`share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
            }
        } else {
            navigator.clipboard?.writeText(`${text} ${url}`);
            this.showToast('📋 Ссылка скопирована!');
        }
        
        if (this.tg) this.tg.hapticImpact('medium');
    }
    
    inviteFriend() {
        if (this.tg.isTelegram) {
            this.tg.openTelegramLink('share/url?url=' + encodeURIComponent('https://t.me/IdleEmpireBot/start'));
        }
    }
    
    openChannel() {
        if (this.tg.isTelegram) {
            this.tg.openTelegramLink('IdleEmpireChannel');
        } else {
            window.open('https://t.me/IdleEmpireChannel', '_blank');
        }
    }
    
    resetWithConfirm() {
        if (this.tg.isTelegram) {
            this.tg.showConfirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс? Это действие необратимо!', (confirmed) => {
                if (confirmed) {
                    Storage.reset();
                    if (this.tg) this.tg.hapticImpact('heavy');
                    this.tg.showAlert('Прогресс сброшен! Игра перезапустится.', () => {
                        location.reload();
                    });
                }
            });
        } else {
            if (confirm('Вы уверены, что хотите сбросить ВЕСЬ прогресс? Это действие необратимо!')) {
                Storage.reset();
                location.reload();
            }
        }
    }
    
    exportSave() {
        const data = JSON.stringify(this.game.state, null, 2);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data).then(() => {
                this.showToast('📋 Сохранение скопировано в буфер!');
            }).catch(() => {
                this.showToast('❌ Не удалось скопировать');
            });
        } else {
            this.showToast('📋 Сохранение: ' + data.substring(0, 100) + '...');
        }
    }
    
    showPopups() {
        const offlineEarned = this.game.processOffline();
        if (offlineEarned > 0) {
            this.showOfflinePopup(offlineEarned);
        }
        
        if (this.game.checkDailyLogin()) {
            const reward = this.game.getDailyReward();
            const dayIndex = Math.min(this.game.state.streak, CONFIG.DAILY_REWARDS.length - 1);
            
            const dailyPopup = document.getElementById('daily-popup');
            const dailyDay = document.getElementById('daily-day');
            const dailyAmount = document.getElementById('daily-amount');
            const claimDailyBtn = document.getElementById('claim-daily');
            
            if (dailyPopup && dailyDay && dailyAmount && claimDailyBtn) {
                dailyDay.textContent = dayIndex + 1;
                dailyAmount.innerHTML = `+${this.formatNumber(reward)} 🪙`;
                dailyPopup.style.display = 'block';
                
                claimDailyBtn.onclick = () => {
                    this.game.state.gold += reward;
                    this.game.state.totalGoldEarned += reward;
                    dailyPopup.style.animation = 'slideIn 0.3s ease reverse';
                    setTimeout(() => {
                        dailyPopup.style.display = 'none';
                    }, 300);
                    this.updateTopBar();
                    Storage.save(this.game.state);
                    
                    if (this.tg) this.tg.hapticImpact('medium');
                };
            }
        }
    }
    
    showOfflinePopup(offlineEarned) {
        if (offlineEarned <= 0) return;
        
        const offlinePopup = document.getElementById('offline-popup');
        const offlineAmount = document.getElementById('offline-amount');
        const offlineTime = document.getElementById('offline-time');
        const claimOfflineBtn = document.getElementById('claim-offline');
        
        if (!offlinePopup || !offlineAmount || !offlineTime || !claimOfflineBtn) return;
        
        const mins = Math.floor(this.game.state.offlineTime / 60);
        const secs = this.game.state.offlineTime % 60;
        
        offlineAmount.innerHTML = `+${this.formatNumber(offlineEarned)} 🪙`;
        offlineTime.textContent = 
            mins > 0 ? `${mins} мин ${secs} сек` : `${secs} сек`;
        offlinePopup.style.display = 'block';
        
        claimOfflineBtn.onclick = () => {
            this.game.state.gold += offlineEarned;
            this.game.state.totalGoldEarned += offlineEarned;
            offlinePopup.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                offlinePopup.style.display = 'none';
            }, 300);
            this.updateTopBar();
            Storage.save(this.game.state);
            
            if (this.tg) this.tg.hapticImpact('medium');
        };
    }
    
    handleCloudData(data) {
        if (data && data.type === 'save_loaded') {
            this.showToast('☁️ Данные из облака загружены');
        }
    }
    
    buyGen(genId) {
        const event = window.event;
        const card = event?.target?.closest('.generator-card');
        
        if (GeneratorsManager.buyGen(genId, this.game)) {
            this.updateTopBar();
            this.renderGenerators();
            this.render();
            
            if (this.tg) this.tg.hapticImpact('light');
            
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
            
            if (this.tg) this.tg.hapticImpact('medium');
        }
    }
    
    doPrestige() {
        if (this.game.prestige()) {
            if (this.tg) {
                this.tg.hapticImpact('heavy');
                this.tg.showAlert('🌟 Престиж выполнен! Множитель удвоен!');
            }
            
            this.showToast('🌟 Престиж выполнен! Множитель удвоен!');
            this.render();
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            const mainBtn = document.querySelector('[data-tab="main"]');
            if (mainBtn) mainBtn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const mainTab = document.getElementById('tab-main');
            if (mainTab) mainTab.classList.add('active');
            
            if (this.tg?.tg?.BackButton) {
                this.tg.tg.BackButton.hide();
            }
        }
    }
    
    startRenderLoop() {
        setInterval(() => {
            this.render();
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                switch(activeTab.id) {
                    case 'tab-generators': this.renderGenerators(); break;
                    case 'tab-upgrades': this.renderUpgrades(); break;
                    case 'tab-missions': this.renderMissionsTab(); break;
                    case 'tab-prestige': this.renderPrestige(); break;
                }
            }
        }, 1000);
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
        if (num === undefined || num === null) return '0';
        if (num < 1000) return Math.floor(num).toString();
        if (num < 1e6) return (num / 1e3).toFixed(1) + 'K';
        if (num < 1e9) return (num / 1e6).toFixed(1) + 'M';
        if (num < 1e12) return (num / 1e9).toFixed(1) + 'B';
        return (num / 1e12).toFixed(1) + 'T';
    }
}
