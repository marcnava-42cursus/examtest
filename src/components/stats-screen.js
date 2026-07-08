import { state } from '../state.js';
import { getLevel } from '../xp.js';

class StatsScreen extends HTMLElement {
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
        this.innerHTML = `
            <h2 class="text-lg font-bold mb-4">Estadísticas</h2>
            <div class="card" id="stat-overall">
                <div class="text-xs" style="color:#a0a0a0">Archivo memorizado</div>
                <div class="text-2xl font-bold mt-1" id="stat-pct">0%</div>
                <div class="h-2 rounded-full mt-2" style="background:#333">
                    <div class="h-full rounded-full" style="background:var(--green);width:0%" id="stat-pct-bar"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">XP total</div>
                    <div class="text-xl font-bold mt-1" style="color:var(--yellow)" id="stat-xp">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Racha</div>
                    <div class="text-xl font-bold mt-1 streak-flame" id="stat-streak">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Mejor racha</div>
                    <div class="text-xl font-bold mt-1" id="stat-best-streak">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Nivel</div>
                    <div class="text-xl font-bold mt-1" id="stat-level">1</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Líneas completadas</div>
                    <div class="text-xl font-bold mt-1" id="stat-lines">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Fallos pendientes</div>
                    <div class="text-xl font-bold mt-1" style="color:var(--red)" id="stat-fails">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Soluciones usadas</div>
                    <div class="text-xl font-bold mt-1" id="stat-solutions">0</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Bloques</div>
                    <div class="text-xl font-bold mt-1" id="stat-blocks">0</div>
                </div>
            </div>
        `;
        this._pctEl = this.querySelector('#stat-pct');
        this._pctBarEl = this.querySelector('#stat-pct-bar');
        this._xpEl = this.querySelector('#stat-xp');
        this._streakEl = this.querySelector('#stat-streak');
        this._bestStreakEl = this.querySelector('#stat-best-streak');
        this._levelEl = this.querySelector('#stat-level');
        this._linesEl = this.querySelector('#stat-lines');
        this._failsEl = this.querySelector('#stat-fails');
        this._solutionsEl = this.querySelector('#stat-solutions');
        this._blocksEl = this.querySelector('#stat-blocks');
        this._update();
    }

    render() {
        this._update();
    }

    _update() {
        const totalQuiz = state.lines.filter(l => l.quiz).length;
        const pct = totalQuiz > 0 ? Math.round(state.completedLines.size / totalQuiz * 100) : 0;
        if (this._pctEl) this._pctEl.textContent = pct + '%';
        if (this._pctBarEl) this._pctBarEl.style.width = pct + '%';
        if (this._xpEl) this._xpEl.textContent = state.xpTotal;
        if (this._streakEl) this._streakEl.textContent = state.streak + ' 🔥';
        if (this._bestStreakEl) this._bestStreakEl.textContent = state.bestStreak;
        if (this._levelEl) this._levelEl.textContent = getLevel() + 1;
        if (this._linesEl) this._linesEl.textContent = state.completedLines.size;
        if (this._failsEl) this._failsEl.textContent = Object.keys(state.failedLines).length;
        if (this._solutionsEl) this._solutionsEl.textContent = Object.keys(state.solutionLines).length;
        if (this._blocksEl) this._blocksEl.textContent = state.blocks.length;
    }
}
customElements.define('stats-screen', StatsScreen);
