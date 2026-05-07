class TelegramAPI {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.ready = false;
        this.user = null;
        this.isTelegram = !!this.tg;
        this.platform = 'unknown';
        this.version = '0.0';
    }
    
    init() {
        if (!this.isTelegram) {
            console.warn('⚠️ Не в Telegram окружении, запуск в браузере');
            this.setupBrowserFallback();
            return false;
        }
        
        try {
            this.tg.ready();
            this.tg.expand();
            
            // Определяем версию API
            this.version = this.tg.version || '6.0';
            
            // Настройка цветов под тему Telegram
            this.applyTelegramTheme();
            this.listenThemeChanges();
            
            // Получаем данные пользователя
            this.initUser();
            
            // Настраиваем кнопки и меню
            this.setupMainButton();
            this.setupBackButton();
            
            // Включаем подтверждение закрытия
            this.enableClosingConfirmation();
            
            // Определяем платформу
            this.platform = this.tg.platform || 'unknown';
            
            // Делаем WebApp полностью видимым
            this.tg.setHeaderColor('#0a0e17');
            this.tg.setBackgroundColor('#0a0e17');
            
            // Запрещаем вертикальный свайп
            if (this.tg.version >= '7.0') {
                this.tg.disableVerticalSwipes();
            }
            
            // Включаем тактильную обратную связь
            if (this.tg.HapticFeedback) {
                this.haptic = this.tg.HapticFeedback;
            }
            
            this.ready = true;
            console.log('✅ Telegram Mini App инициализирован v' + this.version);
            return true;
            
        } catch (e) {
            console.error('Ошибка инициализации Telegram:', e);
            this.setupBrowserFallback();
            return false;
        }
    }
    
    setupBrowserFallback() {
        this.user = {
            id: 'browser_' + Math.random().toString(36).substr(2, 9),
            first_name: 'Игрок',
            username: 'player'
        };
        this.ready = true;
        document.body.classList.add('browser-mode');
    }
    
    applyTelegramTheme() {
        if (!this.tg) return;
        
        const theme = this.tg.colorScheme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        if (theme === 'light') {
            document.documentElement.style.setProperty('--bg-primary', '#f0f2f5');
            document.documentElement.style.setProperty('--bg-secondary', '#ffffff');
            document.documentElement.style.setProperty('--bg-tertiary', '#e4e6eb');
            document.documentElement.style.setProperty('--text-primary', '#1c1e21');
            document.documentElement.style.setProperty('--text-secondary', '#65676b');
            document.documentElement.style.setProperty('--border', '#dadde1');
        }
        
        // Используем цвета из темы Telegram
        if (this.tg.themeParams) {
            const tp = this.tg.themeParams;
            if (tp.bg_color) document.documentElement.style.setProperty('--bg-primary', tp.bg_color);
            if (tp.secondary_bg_color) document.documentElement.style.setProperty('--bg-secondary', tp.secondary_bg_color);
            if (tp.text_color) document.documentElement.style.setProperty('--text-primary', tp.text_color);
            if (tp.hint_color) document.documentElement.style.setProperty('--text-secondary', tp.hint_color);
            if (tp.button_color) document.documentElement.style.setProperty('--accent', tp.button_color);
            if (tp.button_text_color) document.documentElement.style.setProperty('--bg-primary', tp.button_text_color);
        }
    }
    
    listenThemeChanges() {
        if (!this.tg) return;
        
        this.tg.onEvent('themeChanged', () => {
            this.applyTelegramTheme();
        });
    }
    
    initUser() {
        if (this.tg.initDataUnsafe?.user) {
            const u = this.tg.initDataUnsafe.user;
            this.user = {
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name || '',
                username: u.username || '',
                photo_url: u.photo_url || '',
                is_premium: u.is_premium || false,
            };
            console.log('👤 Пользователь:', this.user.first_name, `(@${this.user.username})`);
        } else {
            this.user = {
                id: 'tg_anon_' + Date.now(),
                first_name: 'Аноним',
                username: 'anonymous'
            };
        }
    }
    
    setupMainButton() {
        if (!this.tg?.MainButton) return;
        
        this.tg.MainButton.setParams({
            text: '🎮 ИГРАТЬ',
            color: '#f7b731',
            text_color: '#000000',
            is_active: true,
            is_visible: false
        });
    }
    
    showMainButton(text, callback) {
        if (!this.tg?.MainButton) return;
        
        this.tg.MainButton.setText(text);
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(callback);
    }
    
    hideMainButton() {
        if (!this.tg?.MainButton) return;
        this.tg.MainButton.hide();
    }
    
    setupBackButton() {
        if (!this.tg?.BackButton) return;
        
        this.tg.BackButton.onClick(() => {
            // Возврат на главный экран
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-tab="main"]')?.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-main')?.classList.add('active');
            this.tg.BackButton.hide();
        });
    }
    
    enableClosingConfirmation() {
        if (this.tg?.enableClosingConfirmation) {
            this.tg.enableClosingConfirmation();
        }
    }
    
    hapticImpact(style = 'light') {
        if (this.tg?.HapticFeedback) {
            try {
                this.tg.HapticFeedback.impactOccurred(style);
            } catch(e) {}
        }
    }
    
    showAlert(message, callback) {
        if (this.tg?.showAlert) {
            this.tg.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) callback();
        }
    }
    
    showConfirm(message, callback) {
        if (this.tg?.showConfirm) {
            this.tg.showConfirm(message, (confirmed) => {
                callback(confirmed);
            });
        } else {
            const result = confirm(message);
            callback(result);
        }
    }
    
    showPopup(title, message, buttons) {
        if (this.tg?.showPopup) {
            this.tg.showPopup({
                title: title,
                message: message,
                buttons: buttons
            });
        } else {
            alert(`${title}\n${message}`);
        }
    }
    
    shareToStory(mediaUrl, text, widgetUrl) {
        if (this.tg?.shareToStory) {
            this.tg.shareToStory(mediaUrl, {
                text: text,
                widget_link: {
                    url: widgetUrl,
                    name: 'Idle Empire'
                }
            });
        }
    }
    
    openLink(url, inApp = true) {
        if (this.tg?.openLink) {
            this.tg.openLink(url, { try_instant_view: inApp });
        } else {
            window.open(url, '_blank');
        }
    }
    
    openTelegramLink(username) {
        if (this.tg?.openTelegramLink) {
            this.tg.openTelegramLink(`https://t.me/${username}`);
        } else {
            window.open(`https://t.me/${username}`, '_blank');
        }
    }
    
    sendData(data) {
        if (this.tg?.sendData) {
            this.tg.sendData(JSON.stringify(data));
        }
    }
    
    getQueryParams() {
        const params = {};
        if (this.tg?.initData) {
            const urlParams = new URLSearchParams(this.tg.initData);
            urlParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        return params;
    }
    
    isPremium() {
        return this.user?.is_premium || false;
    }
}
