import { state } from '../state.js';
import { ACHIEVEMENTS_DEF, ACHIEVEMENT_CATEGORIES } from '../constants.js';

const BLOCK_ICONS = ['💀', '✉️', '🔗', '🔌', '📢', '🖥️', '👤', '🚀', '🔧', '🎧', '🔄'];

class AchievementsScreen extends HTMLElement {
    connectedCallback() {
        this._boundRender = () => this.render();
        window.addEventListener('state-changed', this._boundRender);
        this.addEventListener('screen-active', this._boundRender);
        this._init();
    }

    disconnectedCallback() {
        window.removeEventListener('state-changed', this._boundRender);
        this.removeEventListener('screen-active', this._boundRender);
    }

    _init() {
        this.innerHTML = `<h2 class="text-lg font-bold mb-4">Logros</h2>`;
        this._badgeMap = new Map();

        ACHIEVEMENT_CATEGORIES.forEach(cat => {
            const sec = document.createElement('div');
            sec.className = 'mb-6';
            sec.innerHTML = `<div class="flex items-center gap-2 mb-3"><span class="text-lg">${cat.icon}</span><span class="font-bold text-sm" style="color:var(--text-dim)">${cat.name}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-3 gap-4';

            ACHIEVEMENTS_DEF.filter(a => a.category === cat.id).forEach(a => {
                const el = this._createBadge(a.icon, a.name, !!state.achievements[a.id]);
                this._badgeMap.set(a.id, el);
                grid.appendChild(el);
            });

            if (cat.id !== 'general') {
                sec._blockCatId = cat.id;
                sec._blockGrid = grid;
                this._renderBlockBadges(sec, cat.id, grid);
            }

            sec.appendChild(grid);
            this.appendChild(sec);
        });

        this._update();
    }

    _renderBlockBadges(sec, catId, grid) {
        state.blocks.forEach((block, bi) => {
            const id = catId + '_block_' + bi;
            const unlocked = !!state.achievements[id];
            const icon = block ? (BLOCK_ICONS[bi % BLOCK_ICONS.length] || '📄') : '📄';
            const el = this._createBadge(icon, block.name, unlocked);
            this._badgeMap.set(id, el);
            grid.appendChild(el);
        });
    }

    _createBadge(icon, name, unlocked) {
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center gap-1 text-center';
        el.innerHTML = `
            <div class="achievement-badge">${icon}</div>
            <div class="text-[10px] font-semibold mt-1">${name}</div>
        `;
        el._iconEl = el.querySelector('.achievement-badge');
        el._nameEl = el.querySelector('.text-\\[10px\\]');
        el._originalIcon = icon;
        this._applyBadgeState(el, unlocked);
        return el;
    }

    _applyBadgeState(el, unlocked) {
        el._iconEl.classList.toggle('unlocked', unlocked);
        el._iconEl.textContent = unlocked ? el._originalIcon : '🔒';
        el._nameEl.style.color = unlocked ? 'var(--text)' : '#a0a0a0';
    }

    render() {
        this._update();
    }

    _update() {
        for (const [id, el] of this._badgeMap) {
            const unlocked = !!state.achievements[id];
            const a = ACHIEVEMENTS_DEF.find(a => a.id === id);
            if (a) el._originalIcon = a.icon;
            el._iconEl.textContent = unlocked ? el._originalIcon : '🔒';
            this._applyBadgeState(el, unlocked);
        }
    }
}
customElements.define('achievements-screen', AchievementsScreen);
