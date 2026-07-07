import { LEVELS, ACHIEVEMENTS_DEF, ACHIEVEMENT_CATEGORIES } from './constants.js';
import { state } from './state.js';
import { showToast } from './components/toast-container.js';

const CAT_MAP = Object.fromEntries(ACHIEVEMENT_CATEGORIES.map(c => [c.id, c.name]));

export function addXP(amount) {
    state.xpTotal += amount;
    state.xpToday += amount;
    state.save();
}

export function getLevel() {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (state.xpTotal >= LEVELS[i].xp) return i;
    }
    return 0;
}

export function checkAchievement(id, condition, displayName) {
    if (condition && !state.achievements[id]) {
        state.achievements[id] = new Date().toISOString();
        const a = ACHIEVEMENTS_DEF.find(a => a.id === id);
        const name = a ? a.name : (displayName || id);
        const cat = a ? a.category : id.split('_')[0];
        const label = CAT_MAP[cat] ? CAT_MAP[cat] + ': ' + name : name;
        showToast('🏆 ' + label, 'achievement');
        state.save();
    }
}
