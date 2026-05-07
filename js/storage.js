class Storage {
    static SAVE_KEY = 'idle_empire_save_v2';
    static SETTINGS_KEY = 'idle_empire_settings';
    
    static save(state) {
        try {
            const data = {
                ...state,
                lastSave: Date.now(),
                version: '2.0',
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }
    
    static load() {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (!data) return null;
            
            const state = JSON.parse(data);
            
            // Миграция с v1 на v2
            if (!state.version || state.version === '1.0') {
                state.gems = state.gems || 0;
                state.version = '2.0';
            }
            
            if (state.lastSave) {
                state.offlineTime = Math.floor((Date.now() - state.lastSave) / 1000);
            }
            
            return state;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }
    
    static saveSettings(settings) {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
            return false;
        }
    }
    
    static loadSettings() {
        try {
            const data = localStorage.getItem(this.SETTINGS_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }
    
    static reset() {
        localStorage.removeItem(this.SAVE_KEY);
    }
    
    static getSaveSize() {
        const data = localStorage.getItem(this.SAVE_KEY);
        return data ? (data.length / 1024).toFixed(1) + ' KB' : '0 KB';
    }
}
