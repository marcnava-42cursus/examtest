import { state } from '../state.js';
import { getLevel } from '../xp.js';
import { switchTab } from '../router.js';
import { LEVELS } from '../constants.js';

class DashScreen extends HTMLElement {
    connectedCallback() {
        window.addEventListener('state-changed', () => this.render());
        this.addEventListener('screen-active', () => this.render());
        this.render();
    }

    render() {
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

        const mode = state.examMode;
        const modes = [
            { id: 'practice', label: '🧠 Practicar' },
            { id: 'easy-exam', label: '📝 Examen fácil' },
            { id: 'real-exam', label: '🎯 Examen real' }
        ];

        this.innerHTML = `
            <header class="mb-5">
                <h1 class="code-font text-xl font-bold" style="color:#f5f5f5;font-size:22px;">Towel Found: Compile before panic</h1>
                <p class="text-sm mt-1" style="color:#a0a0a0;font-size:15px;">Hoy toca escribir, no leer.</p>
            </header>

            <div class="grid grid-cols-4 gap-2 mb-3">
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold streak-flame">${state.streak}</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Racha</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--yellow)">${state.xpToday}</div>
                    <div class="text-[10px]" style="color:#a0a0a0">XP hoy</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--blue)">${pct}%</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Memorizado</div>
                </div>
                <div class="card text-center py-3 px-2">
                    <div class="text-lg font-bold" style="color:var(--red)">${fails}</div>
                    <div class="text-[10px]" style="color:#a0a0a0">Fallos</div>
                </div>
            </div>

            <div class="card mb-4 flex items-center gap-4">
                <progress-ring progress="${progress}" label="${lvl + 1}"></progress-ring>
                <div>
                    <div class="text-sm font-bold">Nivel ${lvl + 1}</div>
                    <div class="text-xs" style="color:#a0a0a0">${LEVELS[lvl]?.name || ''}</div>
                    <div class="text-xs mt-1" style="color:var(--yellow)">${state.xpTotal} / ${nextLvlXP} XP</div>
                </div>
            </div>

            <div id="no-code-state" class="text-center py-10 ${hasCode ? 'hidden' : ''}">
                <div class="text-4xl mb-3">📂</div>
                <p class="text-lg font-bold mb-2" style="color:#f5f5f5;font-size:15px;">Carga tu mini_serv.c</p>
                <p class="text-sm mb-5" style="color:#a0a0a0;font-size:15px;">La app convierte tu código real en una ruta de práctica línea a línea. Sin teoría.</p>
                <button class="w-full py-3 rounded-xl font-bold text-white" style="background:var(--blue)">Cargar mini_serv_rf.c</button>
            </div>

            <div id="has-code-state" class="${hasCode ? '' : 'hidden'}">
                <div class="flex gap-1 mb-3 bg-[#1a1a2e] rounded-xl p-1" id="mode-selector">
                    ${modes.map(m => `
                        <button class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all mode-btn ${mode === m.id ? 'text-white' : ''}"
                            style="${mode === m.id ? 'background:var(--blue)' : 'color:#666'}"
                            data-mode="${m.id}">${m.label}</button>
                    `).join('')}
                </div>

                <div id="practice-controls" class="${mode === 'practice' ? '' : 'hidden'}">
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
                            <div class="text-[10px]" style="color:#a0a0a0">${fails} pendientes</div>
                        </button>
                    </div>
                </div>

                <div id="exam-controls" class="${mode !== 'practice' ? '' : 'hidden'}">
                    <button class="w-full py-4 rounded-xl font-bold text-lg text-white mb-3 flex items-center justify-center gap-2" style="background:linear-gradient(135deg, var(--blue), var(--purple))" id="btn-start-exam">
                        <i data-lucide="play" class="w-5 h-5"></i> ${mode === 'easy-exam' ? 'Empezar examen fácil' : 'Empezar examen real'}
                    </button>
                    <p class="text-xs text-center" style="color:#a0a0a0">
                        ${mode === 'easy-exam' ? 'Escribe solo las palabras que faltan. Un fallo reinicia el examen desde el principio.' : 'Línea completa sin ayuda. Cero errores permitidos.'}
                    </p>
                </div>

                <div class="card mb-3">
                    <div class="text-xs font-bold mb-2" style="color:var(--yellow)">🎯 MISIÓN DIARIA</div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm">Completa 10 líneas</span>
                        <span class="text-xs font-bold" style="color:var(--green)">${done}/${missionTarget}</span>
                    </div>
                    <div class="h-1.5 rounded-full mt-2" style="background:#333">
                        <div class="h-full rounded-full transition-all" style="background:var(--green);width:${done / missionTarget * 100}%"></div>
                    </div>
                </div>
                <button class="text-xs py-2 px-4 rounded-lg" style="background:var(--bg-card);color:#a0a0a0" id="btn-admin">
                    <i data-lucide="settings" class="w-3 h-3 inline"></i> Admin
                </button>
            </div>
        `;

        this.querySelector('#mode-selector')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            state.examMode = btn.dataset.mode;
            this.render();
        });

        this.querySelector('#btn-continue')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'continue' } }));
        });
        this.querySelector('#btn-quick')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'quick' } }));
        });
        this.querySelector('#btn-review')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'review' } }));
        });
        this.querySelector('#btn-start-exam')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: state.examMode } }));
        });
        this.querySelector('#btn-admin')?.addEventListener('click', () => switchTab('admin'));
        this.querySelector('#no-code-state button')?.addEventListener('click', () => switchTab('admin'));

        if (window.lucide) lucide.createIcons();
    }
}
customElements.define('dash-screen', DashScreen);
