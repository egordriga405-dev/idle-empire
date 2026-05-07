class Storage {
    static SAVE_KEY = 'idle_empire_save';
    
    static save(state) {
        try {
            const data = JSON.stringify({ ...state, lastSave: Date.now() });
            localStorage.setItem(this.SAVE_KEY, data);
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
            if (state.lastSave) {
                state.offlineTime = Math.floor((Date.now() - state.lastSave) / 1000);
            }
            return state;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }
    
    static reset() {
        localStorage.removeItem(this.SAVE_KEY);
    }
}
