import { state } from '../state.js';
import { ACHIEVEMENTS_DEF, ACHIEVEMENT_CATEGORIES } from '../constants.js';

const BLOCK_ICONS = ['💀', '✉️', '🔗', '🔌', '📢', '🖥️', '👤', '🚀', '🔧', '🎧', '🔄'];

class AchievementsScreen extends HTMLElement {
    connectedCallback() {
        window.addEventListener('state-changed', () => this.render());
        this.addEventListener('screen-active', () => this.render());
        this.render();
    }

    render() {
        this.innerHTML = `<h2 class="text-lg font-bold mb-4">Logros</h2>`;
        const container = this;

        ACHIEVEMENT_CATEGORIES.forEach(cat => {
            const sec = document.createElement('div');
            sec.className = 'mb-6';
            sec.innerHTML = `<div class="flex items-center gap-2 mb-3"><span class="text-lg">${cat.icon}</span><span class="font-bold text-sm" style="color:var(--text-dim)">${cat.name}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-3 gap-4';

            ACHIEVEMENTS_DEF.filter(a => a.category === cat.id).forEach(a => {
                const unlocked = !!state.achievements[a.id];
                this.appendBadge(grid, unlocked ? a.icon : '🔒', a.name, unlocked);
            });

            if (cat.id !== 'general') {
                state.blocks.forEach((block, bi) => {
                    const unlocked = !!state.achievements[cat.id + '_block_' + bi];
                    const icon = block ? (BLOCK_ICONS[bi % BLOCK_ICONS.length] || '📄') : '📄';
                    this.appendBadge(grid, unlocked ? icon : '🔒', block.name, unlocked);
                });
            }

            sec.appendChild(grid);
            container.appendChild(sec);
        });
    }

    appendBadge(grid, icon, name, unlocked) {
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center gap-1 text-center';
        el.innerHTML = `
            <div class="achievement-badge ${unlocked ? 'unlocked' : ''}">${icon}</div>
            <div class="text-[10px] font-semibold mt-1" style="color:${unlocked ? 'var(--text)' : '#a0a0a0'}">${name}</div>
        `;
        grid.appendChild(el);
    }
}
customElements.define('achievements-screen', AchievementsScreen);
