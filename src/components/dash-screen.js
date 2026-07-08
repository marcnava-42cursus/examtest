import { state } from '../state.js';
import { getLevel } from '../xp.js';
import { switchTab } from '../router.js';
import { LEVELS } from '../constants.js';

class DashScreen extends HTMLElement {
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
            <header class="mb-5">
                <h1 class="code-font text-xl font-bold" style="color:#f5f5f5;font-size:22px;">Towel Found: Compile before panic</h1>
                <p class="text-sm mt-1" style="color:#a0a0a0;font-size:15px;">Hoy toca escribir, no leer.</p>
            </header>

            <div class="grid grid-cols-4 gap-2 mb-3">
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold streak-flame" id="dash-streak">0</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Racha</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--yellow)" id="dash-xp-today">0</div>
                    <div class="text-[10px]" style="color:#a0a0a0">XP hoy</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--blue)" id="dash-pct">0%</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Memorizado</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--red)" id="dash-fails">0</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Fallos</div>
                </div>
            </div>

            <div class="card mb-4 flex items-center gap-4">
                <progress-ring progress="0" label="1" id="dash-ring"></progress-ring>
                <div>
                    <div class="text-sm font-bold" id="dash-level-label">Nivel 1</div>
                    <div class="text-xs" style="color:#a0a0a0" id="dash-level-name">Primer token</div>
                    <div class="text-xs mt-1" style="color:var(--yellow)" id="dash-xp-progress">0 / 50 XP</div>
                </div>
            </div>

            <div id="no-code-state" class="text-center py-10">
                <div class="text-4xl mb-3">📂</div>
                <p class="text-lg font-bold mb-2" style="color:#f5f5f5;font-size:15px;">Carga tu código</p>
                <p class="text-sm mb-5" style="color:#a0a0a0;font-size:15px;" id="dash-no-code-desc">La app convierte tu código real en una ruta de práctica línea a línea. Sin teoría.</p>
                <button class="w-full py-3 rounded-xl font-bold text-white" style="background:var(--blue)" id="dash-load-btn">Cargar código</button>
            </div>

            <div id="has-code-state" class="hidden">
                <div class="flex gap-1 mb-3 bg-[#1a1a2e] rounded-xl p-1" id="mode-selector">
                    <button class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all mode-btn" data-mode="practice">🧠 Practicar</button>
                    <button class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all mode-btn" data-mode="easy-exam">📝 Examen fácil</button>
                    <button class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all mode-btn" data-mode="real-exam">🎯 Examen real</button>
                </div>

                <div id="practice-controls">
                    <button class="w-full py-4 rounded-xl font-bold text-lg text-white mb-3 flex items-center justify-center gap-2" style="background:linear-gradient(135deg, var(--blue), var(--purple))" id="btn-continue">
                        <i data-lucide="play" class="w-5 h-5"></i> Continuar
                    </button>
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        <button class="card text-left" id="btn-quick">
                            <div class="text-base mb-1">⚡</div>
                            <div class="text-sm font-semibold">No tengo ganas</div>
                            <div class="text-[10px]" style="color:#a0a0a0">3 min rápidos</div>
                        </button>
                        <button class="card text-left" id="btn-review">
                            <div class="text-base mb-1">🔄</div>
                            <div class="text-sm font-semibold">Repasar fallos</div>
                            <div class="text-[10px]" style="color:#a0a0a0" id="dash-review-count">0 pendientes</div>
                        </button>
                    </div>
                </div>

                <div id="exam-controls" class="hidden">
                    <button class="w-full py-4 rounded-xl font-bold text-lg text-white mb-3 flex items-center justify-center gap-2" style="background:linear-gradient(135deg, var(--blue), var(--purple))" id="btn-start-exam">
                        <i data-lucide="play" class="w-5 h-5"></i> Empezar examen
                    </button>
                    <p class="text-xs text-center" style="color:#a0a0a0" id="dash-exam-desc"></p>
                </div>

                <div class="card mb-3">
                    <div class="text-xs font-bold mb-2" style="color:var(--yellow)">🎯 MISIÓN DIARIA</div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm">Completa 10 líneas</span>
                        <span class="text-xs font-bold" style="color:var(--green)" id="dash-mission-count">0/10</span>
                    </div>
                    <div class="h-1.5 rounded-full mt-2" style="background:#333">
                        <div class="h-full rounded-full transition-all" style="background:var(--green);width:0%" id="dash-mission-bar"></div>
                    </div>
                </div>
                <button class="text-xs py-2 px-4 rounded-lg" style="background:var(--bg-card);color:#a0a0a0" id="btn-admin">
                    <i data-lucide="settings" class="w-3 h-3 inline"></i> Admin
                </button>
            </div>
        `;

        this._els = {
            streak: this.querySelector('#dash-streak'),
            xpToday: this.querySelector('#dash-xp-today'),
            pct: this.querySelector('#dash-pct'),
            fails: this.querySelector('#dash-fails'),
            ring: this.querySelector('#dash-ring'),
            levelLabel: this.querySelector('#dash-level-label'),
            levelName: this.querySelector('#dash-level-name'),
            xpProgress: this.querySelector('#dash-xp-progress'),
            noCode: this.querySelector('#no-code-state'),
            hasCode: this.querySelector('#has-code-state'),
            practiceCtrl: this.querySelector('#practice-controls'),
            examCtrl: this.querySelector('#exam-controls'),
            examBtn: this.querySelector('#btn-start-exam'),
            examDesc: this.querySelector('#dash-exam-desc'),
            reviewCount: this.querySelector('#dash-review-count'),
            missionCount: this.querySelector('#dash-mission-count'),
            missionBar: this.querySelector('#dash-mission-bar'),
        };

        this.querySelector('#mode-selector').addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            state.examMode = btn.dataset.mode;
            this._updateModeUI();
        });

        this.querySelector('#btn-continue').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'continue' } }));
        });
        this.querySelector('#btn-quick').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'quick' } }));
        });
        this.querySelector('#btn-review').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'review' } }));
        });
        this.querySelector('#btn-start-exam').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: state.examMode } }));
        });
        this.querySelector('#btn-admin').addEventListener('click', () => switchTab('admin'));
        this.querySelector('#dash-load-btn').addEventListener('click', () => switchTab('admin'));

        this._update();
    }

    render() {
        this._update();
    }

    _update() {
        const hasCode = state.lines.length > 0 && state.exercisesGenerated;
        const total = state.lines.filter(l => l.quiz).length;
        const pct = total > 0 ? Math.round((state.completedLines.size / total) * 100) : 0;
        const fails = Object.keys(state.failedLines).length;
        const lvl = getLevel();
        const nextLvlXP = lvl < LEVELS.length - 1 ? LEVELS[lvl + 1].xp : LEVELS[lvl].xp;
        const currLvlXP = LEVELS[lvl].xp;
        const progress = nextLvlXP > currLvlXP ? ((state.xpTotal - currLvlXP) / (nextLvlXP - currLvlXP)) * 100 : 100;
        const missionTarget = 10;
        const done = Math.min(state.todayMissionDone, missionTarget);

        if (this._els.streak) this._els.streak.textContent = state.streak;
        if (this._els.xpToday) this._els.xpToday.textContent = state.xpToday;
        if (this._els.pct) this._els.pct.textContent = pct + '%';
        if (this._els.fails) this._els.fails.textContent = fails;
        if (this._els.ring) {
            this._els.ring.setAttribute('progress', progress);
            this._els.ring.setAttribute('label', String(lvl + 1));
        }
        if (this._els.levelLabel) this._els.levelLabel.textContent = 'Nivel ' + (lvl + 1);
        if (this._els.levelName) this._els.levelName.textContent = LEVELS[lvl]?.name || '';
        if (this._els.xpProgress) this._els.xpProgress.textContent = state.xpTotal + ' / ' + nextLvlXP + ' XP';
        if (this._els.reviewCount) this._els.reviewCount.textContent = fails + ' pendientes';
        if (this._els.missionCount) this._els.missionCount.textContent = done + '/' + missionTarget;
        if (this._els.missionBar) this._els.missionBar.style.width = (done / missionTarget * 100) + '%';

        if (this._els.noCode) this._els.noCode.classList.toggle('hidden', hasCode);
        if (this._els.hasCode) this._els.hasCode.classList.toggle('hidden', !hasCode);

        this._updateModeUI();
    }

    _updateModeUI() {
        const mode = state.examMode;
        const isPractice = mode === 'practice';

        this.querySelectorAll('.mode-btn').forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle('text-white', isActive);
            btn.style.background = isActive ? 'var(--blue)' : '';
            btn.style.color = isActive ? '' : '#666';
        });

        if (this._els.practiceCtrl) this._els.practiceCtrl.classList.toggle('hidden', !isPractice);
        if (this._els.examCtrl) this._els.examCtrl.classList.toggle('hidden', isPractice);

        if (this._els.examBtn) {
            const label = mode === 'easy-exam' ? 'Empezar examen fácil' : 'Empezar examen real';
            this._els.examBtn.innerHTML = `<i data-lucide="play" class="w-5 h-5"></i> ${label}`;
        }
        if (this._els.examDesc) {
            this._els.examDesc.textContent = mode === 'easy-exam'
                ? 'Escribe solo las palabras que faltan. Un fallo reinicia el examen desde el principio.'
                : 'Línea completa sin ayuda. Cero errores permitidos.';
        }
    }
}
customElements.define('dash-screen', DashScreen);
