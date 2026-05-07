// ==================== IDLE EMPIRE APP ====================
let tgAPI;
let cloud;

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram API
    tgAPI = new TelegramAPI();
    const isTelegram = tgAPI.init();
    
    // Инициализация облачного хранилища
    cloud = new CloudStorage(tgAPI);
    
    // Инициализация игры
    const game = new Game().init();
    const ui = new UI(game, tgAPI, cloud);
    window.ui = ui;
    window.game = game;
    window.tgAPI = tgAPI;
    
    ui.init();
    
    // Автосохранение при закрытии
    window.addEventListener('beforeunload', () => {
        Storage.save(game.state);
        
        // Сохраняем в облако если в Telegram
        if (tgAPI.isTelegram) {
            cloud.saveToCloud(game.state);
        }
    });
    
    // Принимаем данные от облака (если бот вернёт)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'cloud_data') {
            ui.handleCloudData(event.data.payload);
        }
    });
    
    // Восстановление после сворачивания
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const loaded = Storage.load();
            if (loaded && loaded.offlineTime > 60) {
                game.state.offlineTime = loaded.offlineTime;
                ui.showOfflinePopup(game.processOffline());
            }
            Storage.save(game.state);
        }
    });
    
    console.log('🎮 Idle Empire v2.0 готов!');
    console.log(`📱 Платформа: ${tgAPI.platform}`);
    console.log(`👤 Игрок: ${tgAPI.user?.first_name || 'Аноним'}`);
    console.log(`💎 Премиум: ${tgAPI.isPremium() ? 'Да' : 'Нет'}`);
});
