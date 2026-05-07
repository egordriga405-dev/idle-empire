// Инициализация Telegram Mini App
let tg = window.Telegram?.WebApp;

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram
    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0a0e17');
        tg.setBackgroundColor('#0a0e17');
        console.log('Telegram Mini App initialized');
    }
    
    // Инициализация игры
    const game = new Game().init();
    const ui = new UI(game);
    window.ui = ui; // Глобальный доступ для onclick
    
    ui.init();
    
    // Сохранение при закрытии
    window.addEventListener('beforeunload', () => {
        Storage.save(game.state);
    });
});

// Particle animation
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
    }
    
    .generator-card, .upgrade-card, .mission-card {
        background: var(--bg-secondary);
        border-radius: var(--radius);
        padding: 16px;
        margin: 12px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid var(--border);
        transition: all 0.2s ease;
    }
    
    .generator-card:hover, .upgrade-card:hover {
        border-color: var(--accent);
    }
    
    .buy-btn {
        padding: 8px 16px;
        font-size: 14px;
        margin: 0;
    }
    
    .buy-btn.disabled {
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        cursor: not-allowed;
    }
    
    .progress-bar {
        width: 100%;
        height: 6px;
        background: var(--bg-tertiary);
        border-radius: 3px;
        overflow: hidden;
        margin: 4px 0;
    }
    
    .progress-fill {
        height: 100%;
        background: var(--accent-secondary);
        transition: width 0.3s ease;
    }
    
    .mission-card.completed {
        opacity: 0.5;
        border-color: var(--success);
    }
    
    h2 { font-size: 20px; margin-bottom: 16px; }
    h3 { font-size: 16px; margin-bottom: 8px; }
    
    button:disabled {
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);
