import { state } from '../state.js';
import { parseCode, tokenize, getTokenClass } from '../parser.js';
import { switchTab } from '../router.js';
import { showToast } from './toast-container.js';

class AdminScreen extends HTMLElement {
    connectedCallback() {
        this._boundRefresh = () => this.refresh();
        this.addEventListener('screen-active', this._boundRefresh);
        this.render();
    }

    disconnectedCallback() {
        this.removeEventListener('screen-active', this._boundRefresh);
    }

    render() {
        this.innerHTML = `
            <h2 class="text-lg font-bold mb-4">Admin</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Cargar código (.c / .h)</label>
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
            state.excludedLines = new Set();
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

    _renderCodeLine(lineIdx) {
        const ln = state.lines[lineIdx];
        const indent = '&nbsp;'.repeat(ln.indent * 4);
        const tokens = tokenize(ln.text);
        let html = indent;
        tokens.forEach((tok, ti) => {
            const escaped = tok.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (tok.type === 'ws') {
                html += escaped.replace(/ /g, '&nbsp;');
                return;
            }
            const cls = getTokenClass(tok, tokens, ti);
            if (cls) {
                html += `<span class="${cls}">${escaped}</span>`;
            } else {
                html += escaped;
            }
        });
        return html;
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

            const wrapper = document.createElement('div');
            wrapper.className = 'exclusion-block';
            wrapper.style.cssText = 'margin-bottom:6px';

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;min-height:44px';
            header.innerHTML = `
                <span class="toggle-lines" style="color:var(--blue);font-size:13px;cursor:pointer;flex-shrink:0;padding:2px 4px;width:20px;text-align:center">▸</span>
                <input type="checkbox" ${isExcluded ? 'checked' : ''} data-block="${bi}" class="block-cb" style="cursor:pointer;width:18px;height:18px;flex-shrink:0">
                <span style="flex:1;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${block.icon} ${block.name}</span>
            `;
            wrapper.appendChild(header);

            const lineList = document.createElement('div');
            lineList.className = 'line-exclusions';
            lineList.style.cssText = 'display:none;margin:0;padding:2px 0 4px 20px;border-left:2px solid var(--border)';

            block.lines.forEach(li => {
                const ln = state.lines[li];
                const lineChecked = state.excludedLines.has(li);
                const codeHtml = this._renderCodeLine(li);

                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 6px;min-height:36px;border-radius:4px;transition:background .1s';
                row.onmouseenter = function () { this.style.background = 'rgba(47,128,237,.06)'; };
                row.onmouseleave = function () { this.style.background = ''; };

                row.innerHTML = `
                    <input type="checkbox" ${lineChecked ? 'checked' : ''} data-line="${li}" class="line-cb" style="cursor:pointer;width:16px;height:16px;flex-shrink:0" ${isExcluded ? 'disabled' : ''}>
                    <span class="msv-gutter" style="min-width:28px;flex-shrink:0;font-size:10px;color:#555;text-align:right;padding-right:6px;user-select:none">${li + 1}</span>
                    <span class="code-font" style="font-size:12px;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:1px 0;min-width:0">${codeHtml}</span>
                `;

                lineList.appendChild(row);
            });

            wrapper.appendChild(lineList);

            const blockCb = header.querySelector('.block-cb');
            const lineCbs = lineList.querySelectorAll('.line-cb');

            const updateBlockCbState = () => {
                const checkedCount = Array.from(lineCbs).filter(c => c.checked).length;
                const totalLines = lineCbs.length;
                blockCb.checked = checkedCount === totalLines;
                blockCb.indeterminate = checkedCount > 0 && checkedCount < totalLines;
            };

            lineCbs.forEach(lcb => {
                lcb.addEventListener('change', updateBlockCbState);
            });

            updateBlockCbState();

            header.querySelector('.toggle-lines')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = lineList.style.display !== 'none';
                lineList.style.display = isVisible ? 'none' : 'block';
                e.currentTarget.textContent = isVisible ? '▸' : '▾';
            });

            blockCb.addEventListener('change', (e) => {
                const checked = e.target.checked;
                blockCb.indeterminate = false;
                lineCbs.forEach(lcb => {
                    lcb.checked = checked;
                    lcb.disabled = checked;
                });
            });

            listEl.appendChild(wrapper);
        });
    }

    saveExclusions() {
        state.excludedBlocks = new Set();
        state.excludedLines = new Set();
        this.querySelectorAll('.block-cb').forEach(cb => {
            if (cb.checked) {
                state.excludedBlocks.add(Number(cb.dataset.block));
            }
        });
        this.querySelectorAll('.line-cb').forEach(cb => {
            if (cb.checked) {
                const lineIdx = Number(cb.dataset.line);
                const blockCb = cb.closest('.exclusion-block')?.querySelector('.block-cb');
                if (blockCb && blockCb.checked) return;
                state.excludedLines.add(lineIdx);
                state.completedLines.add(lineIdx);
            }
        });
        state.save();
        state.notify();
        showToast('Exclusiones guardadas', 'success');
        this.refresh();
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
        state.modeCompleted = { practice: new Set(), easy: new Set(), real: new Set() };
        state.blockStars = {};
        state.todayMissionDone = 0;
        state.excludedLines = new Set();
        state.save();
        state.notify();
        this.querySelector('#reset-confirm').classList.add('hidden');
        switchTab('dashboard');
    }
}
customElements.define('admin-screen', AdminScreen);
