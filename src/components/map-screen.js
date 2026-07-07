import { state } from '../state.js';
import { switchTab } from '../router.js';

class MapScreen extends HTMLElement {
    connectedCallback() {
        window.addEventListener('state-changed', () => this.render());
        this.addEventListener('screen-active', () => this.render());
        this.render();
    }

    render() {
        this.innerHTML = '<h2 class="text-lg font-bold mb-4">Camino del código</h2><div id="map-container" class="flex flex-col items-center gap-0"></div>';
        const container = this.querySelector('#map-container');

        if (state.blocks.length === 0) {
            container.innerHTML = '<p style="color:#a0a0a0">Carga código primero</p>';
            return;
        }

        const getBlockPct = (bi) => {
            const block = state.blocks[bi];
            if (!block) return 0;
            const done = block.lines.filter(li => state.completedLines.has(li)).length;
            return block.lines.length > 0 ? Math.round(done / block.lines.length * 100) : 0;
        };

        const mode = state.examMode;

        state.blocks.forEach((block, bi) => {
            const completedCount = block.lines.filter(li => state.completedLines.has(li)).length;
            const total = block.lines.length;
            const pct = total > 0 ? Math.round(completedCount / total * 100) : 0;
            const stars = state.blockStars[bi] || 0;
            const isCompleted = pct === 100;
            const isExcluded = state.excludedBlocks.has(bi);
            const isCurrent = !isCompleted && !isExcluded &&
                (bi === 0 || getBlockPct(bi - 1) === 100);
            const isLocked = mode === 'practice'
                ? (!isCompleted && !isExcluded && !isCurrent && bi > 0 && getBlockPct(bi - 1) < 100)
                : false;
            const examPassed = state.examRealPassed.has(bi);

            if (bi > 0) {
                const line = document.createElement('div');
                line.className = 'node-line';
                line.style.background = isCompleted || isCurrent ? 'var(--green)' : '#333';
                container.appendChild(line);
            }

            const node = document.createElement('div');
            node.className = 'map-node' + (isLocked ? ' locked' : '') +
                (isCompleted ? ' completed' : '') + (isCurrent ? ' current' : '');
            if (isExcluded) node.style.opacity = '0.5';
            node.innerHTML = `
                <div class="node-icon"><span class="text-xl">${block.icon}</span></div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold truncate">${block.name}${isExcluded ? ' (saltar)' : ''}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="flex-1 h-1.5 rounded-full" style="background:#333">
                            <div class="h-full rounded-full" style="background:var(--green);width:${pct}%"></div>
                        </div>
                        <span class="text-[10px]" style="color:#a0a0a0">${pct}%</span>
                    </div>
                    <div class="text-xs mt-1" style="color:var(--yellow)">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                    ${examPassed ? '<div class="text-[10px]" style="color:var(--green)">✅ Examen superado</div>' : ''}
                </div>
            `;
            if (!isLocked) {
                node.addEventListener('click', () => {
                    if (mode === 'practice') {
                        window.dispatchEvent(new CustomEvent('start-mode', {
                            detail: { mode: 'block', blockIndex: bi }
                        }));
                    } else if (mode === 'easy-exam') {
                        window.dispatchEvent(new CustomEvent('start-mode', {
                            detail: { mode: 'block-easy-exam', blockIndex: bi }
                        }));
                    } else {
                        window.dispatchEvent(new CustomEvent('start-mode', {
                            detail: { mode: 'block-exam', blockIndex: bi }
                        }));
                    }
                });
            }
            container.appendChild(node);
        });
    }
}
customElements.define('map-screen', MapScreen);
