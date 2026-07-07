import { state } from '../state.js';
import { parseCode } from '../parser.js';
import { switchTab } from '../router.js';
import { showToast } from './toast-container.js';

class AdminScreen extends HTMLElement {
    connectedCallback() {
        this.addEventListener('screen-active', () => this.refresh());
        this.render();
    }

    render() {
        this.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">Admin</h2>
                <button id="admin-close" class="text-sm" style="color:var(--blue)">Cerrar</button>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Cargar mini_serv_rf.c</label>
                    <input type="file" id="file-training" accept=".c,.h,.txt" class="text-xs mb-2 block">
                    <textarea id="paste-training" rows="6" class="w-full rounded-lg p-3 code-font text-xs resize-y"
                        style="background:var(--bg-input);border:1px solid var(--border);color:var(--text)"
                        placeholder="O pega el código aquí..."></textarea>
                    <button id="btn-load" class="mt-2 py-2 px-4 rounded-lg font-semibold text-white text-sm"
                        style="background:var(--blue)">Cargar</button>
                </div>
                <div id="admin-info" class="card">
                    <div class="text-sm font-semibold mb-2">Código cargado</div>
                    <div id="admin-stats" class="text-xs space-y-1" style="color:#a0a0a0"></div>
                    <div class="mt-4 pt-4 border-t" style="border-color:var(--border)">
                        <div class="text-sm font-semibold mb-3">Auto-saltar bloques</div>
                        <div id="exclusion-list" class="space-y-2 text-xs mb-3"></div>
                        <button id="btn-save-exclusions" class="py-2 px-3 rounded-lg text-xs font-semibold text-white"
                            style="background:var(--green)">Guardar exclusiones</button>
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button id="btn-reset" class="py-2 px-3 rounded-lg text-xs font-semibold text-white"
                            style="background:var(--red)">Resetear progreso</button>
                    </div>
                    <div id="reset-confirm" class="hidden mt-3 p-3 rounded-lg" style="background:rgba(241,76,76,.1)">
                        <p class="text-xs mb-2" style="color:var(--red)">¿Seguro? Se perderá todo el progreso.</p>
                        <button id="btn-do-reset" class="py-1 px-3 rounded text-xs font-bold text-white"
                            style="background:var(--red)">Sí, resetear</button>
                        <button id="btn-cancel-reset" class="py-1 px-3 rounded text-xs ml-2"
                            style="color:#a0a0a0">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        this.querySelector('#admin-close').addEventListener('click', () => switchTab('dashboard'));
        this.querySelector('#btn-load').addEventListener('click', () => this.loadTrainingCode());
        this.querySelector('#btn-save-exclusions').addEventListener('click', () => this.saveExclusions());
        this.querySelector('#btn-reset').addEventListener('click', () => {
            this.querySelector('#reset-confirm').classList.remove('hidden');
        });
        this.querySelector('#btn-do-reset').addEventListener('click', () => this.doReset());
        this.querySelector('#btn-cancel-reset').addEventListener('click', () => {
            this.querySelector('#reset-confirm').classList.add('hidden');
        });

        this.refresh();
    }

    refresh() {
        const hasCode = state.lines.length > 0;
        const info = this.querySelector('#admin-info');
        if (!info) return;
        info.classList.toggle('hidden', !hasCode);
        if (hasCode) this.updateAdminInfo();
    }

    loadTrainingCode() {
        const fileInput = this.querySelector('#file-training');
        const textarea = this.querySelector('#paste-training');
        const process = (code) => {
            parseCode(code);
            state.exercisesGenerated = true;
            state.completedLines = new Set();
            state.currentIdx = 0;
            state.failedLines = {};
            state.solutionLines = {};
            state.hintLines = {};
            state.blockStars = {};
            state.excludedBlocks = new Set();
            state.examRealPassed = new Set();
            state.consecutiveCorrect = 0;
            state.save();
            state.notify();
            switchTab('dashboard');
        };
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => process(e.target.result);
            reader.readAsText(fileInput.files[0]);
        } else if (textarea.value.trim()) {
            process(textarea.value);
        }
    }

    updateAdminInfo() {
        const total = state.lines.length;
        const quiz = state.lines.filter(l => l.quiz).length;
        this.querySelector('#admin-stats').innerHTML =
            `<p>Líneas totales: ${total}</p><p>Líneas practicables: ${quiz}</p><p>Bloques detectados: ${state.blocks.length}</p>`;

        const listEl = this.querySelector('#exclusion-list');
        listEl.innerHTML = '';
        state.blocks.forEach((block, bi) => {
            const isExcluded = state.excludedBlocks.has(bi);
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer';
            label.innerHTML =
                `<input type="checkbox" ${isExcluded ? 'checked' : ''} data-block="${bi}" style="cursor:pointer"> <span>${block.icon} ${block.name}</span>`;
            listEl.appendChild(label);
        });
    }

    saveExclusions() {
        state.excludedBlocks = new Set();
        this.querySelectorAll('#exclusion-list input[type="checkbox"]').forEach(cb => {
            if (cb.checked) {
                state.excludedBlocks.add(Number(cb.dataset.block));
            }
        });
        state.save();
        showToast('Exclusiones guardadas', 'success');
    }

    doReset() {
        state.currentIdx = 0;
        state.completedLines = new Set();
        state.failedLines = {};
        state.solutionLines = {};
        state.hintLines = {};
        state.xpTotal = 0;
        state.xpToday = 0;
        state.streak = 0;
        state.achievements = {};
        state.blockStars = {};
        state.todayMissionDone = 0;
        state.save();
        state.notify();
        this.querySelector('#reset-confirm').classList.add('hidden');
        switchTab('dashboard');
    }
}
customElements.define('admin-screen', AdminScreen);
