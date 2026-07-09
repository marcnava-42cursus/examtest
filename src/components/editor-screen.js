import { state } from '../state.js';
import { tokenize, getTokenClass } from '../parser.js';
import { addXP, getLevel, checkAchievement } from '../xp.js';
import { switchTab, exitEditor } from '../router.js';
import { KEYWORDS, TYPES, FUNCTIONS } from '../constants.js';



function createLine(num, active) {
    const row = document.createElement('div');
    row.className = 'msv-line code-font' + (active ? ' active' : '');
    const gutter = document.createElement('div');
    gutter.className = 'msv-gutter';
    gutter.textContent = num;
    const content = document.createElement('div');
    content.className = 'msv-content';
    row.appendChild(gutter);
    row.appendChild(content);
    return row;
}

function createHintLine(text) {
    const row = document.createElement('div');
    row.className = 'msv-line code-font';
    row.id = 'hint-line';
    const gutter = document.createElement('div');
    gutter.className = 'msv-gutter';
    gutter.textContent = '';
    const content = document.createElement('div');
    content.className = 'msv-content';
    content.style.color = '#888';
    content.textContent = text;
    row.appendChild(gutter);
    row.appendChild(content);
    return row;
}

const AUTO_PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };

function stripComments(s) {
    let idx;
    if ((idx = s.indexOf('//')) !== -1) s = s.slice(0, idx);
    if ((idx = s.indexOf('/*')) !== -1) {
        const end = s.indexOf('*/', idx + 2);
        if (end !== -1) s = s.slice(0, idx) + s.slice(end + 2);
    }
    return s.trimEnd().replace(/\s+/g, ' ').trim();
}

function handleAutoClose(e, input) {
    const close = AUTO_PAIRS[e.key];
    if (!close) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const start = input.selectionStart, end = input.selectionEnd;
    if (start !== end) return;
    e.preventDefault();
    const text = input.value;
    input.value = text.slice(0, start) + e.key + close + text.slice(end);
    input.selectionStart = input.selectionEnd = start + 1;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleAutoBackspace(e, input) {
    if (e.key !== 'Backspace') return;
    const start = input.selectionStart, end = input.selectionEnd;
    if (start !== end) return;
    if (start === 0 || start >= input.value.length) return;
    const prev = input.value[start - 1];
    const next = input.value[start];
    const close = AUTO_PAIRS[prev];
    if (close && close === next) {
        e.preventDefault();
        input.value = input.value.slice(0, start - 1) + input.value.slice(end + 1);
        input.selectionStart = input.selectionEnd = start - 1;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function tokenizeLine(text) {
    const re = /(\s+|\w+|.)/g;
    const parts = [];
    let m;
    while ((m = re.exec(text)) !== null) parts.push(m[1]);
    return parts;
}

function appendHighlighted(container, text) {
    const tokens = tokenize(text);
    tokens.forEach((tok, i) => {
        const span = document.createElement('span');
        span.textContent = tok.text;
        const cls = getTokenClass(tok, tokens, i);
        if (cls) span.className = cls;
        container.appendChild(span);
    });
}

function isLineExcluded(lineIdx) {
    if (state.excludedLines.has(lineIdx)) return true;
    for (let bi = 0; bi < state.blocks.length; bi++) {
        if (state.excludedBlocks.has(bi) && state.blocks[bi].lines.includes(lineIdx)) {
            return true;
        }
    }
    return false;
}

function skipToNextQuiz() {
    while (state.currentIdx < state.lines.length && (!state.lines[state.currentIdx].quiz || isLineExcluded(state.currentIdx))) {
        state.currentIdx++;
    }
}

function seededRandom(seedVal) {
    let s = (seedVal * 1103515245 + 12345) | 0;
    return function () {
        s = (s * 1103515245 + 12345) | 0;
        return ((s >>> 16) & 0x7FFF) / 0x8000;
    };
}

function generateGaps(text, seed) {
    const tokens = [];
    let idx = 0;
    while (idx < text.length) {
        if (/\s/.test(text[idx])) {
            let end = idx;
            while (end < text.length && /\s/.test(text[end])) end++;
            tokens.push({ text: text.slice(idx, end), gapable: false });
            idx = end;
        } else {
            let end = idx;
            while (end < text.length && !/\s/.test(text[end])) end++;
            const chunk = text.slice(idx, end);
            let ci = 0;
            while (ci < chunk.length) {
                if (!/\w/.test(chunk[ci])) {
                    let pEnd = ci;
                    while (pEnd < chunk.length && !/\w/.test(chunk[pEnd])) pEnd++;
                    tokens.push({ text: chunk.slice(ci, pEnd), gapable: false });
                    ci = pEnd;
                } else {
                    let wEnd = ci;
                    while (wEnd < chunk.length && /\w/.test(chunk[wEnd])) wEnd++;
                    tokens.push({ text: chunk.slice(ci, wEnd), gapable: true });
                    ci = wEnd;
                }
            }
            idx = end;
        }
    }

    const gapable = tokens.map((t, i) => t.gapable ? i : -1).filter(i => i >= 0);
    const n = gapable.length;

    let gapIndices;
    if (n === 0) {
        gapIndices = [];
    } else if (n === 1) {
        gapIndices = [gapable[0]];
    } else {
        const gapSeed = seed != null ? seed : text.length;
        const rng = seededRandom(gapSeed);
        const numGaps = 1 + Math.floor(rng() * (n - 1));
        const shuffled = [...gapable];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        gapIndices = shuffled.slice(0, numGaps).sort((a, b) => a - b);
    }

    return {
        tokens,
        gapIndices,
        expected: gapIndices.map(i => tokens[i].text).join(' ')
    };
}

class EditorScreen extends HTMLElement {
    constructor() {
        super();
        this.sessionXP = 0;
        this.editorMode = 'continue';
        this.reviewQueue = [];
        this.lineInput = null;
        this.waitingForRetry = false;
        this.hintVisible = true;
        this.retryCleanup = null;
        this.examErrors = 0;
        this.examBlockIndex = -1;
        this.reviewCorrectCount = 0;
    }

    modePrefix() {
        if (this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam') return 'easy';
        if (this.editorMode === 'real-exam' || this.editorMode === 'block-exam') return 'real';
        return 'practice';
    }

    connectedCallback() {
        this._boundStartMode = (e) => this.startMode(e.detail);
        this._boundScreenActive = () => {
            if (this.lineInput && !this.lineInput.disabled) this.lineInput.focus();
        };
        this._boundKeydown = (e) => this.handleGlobalKeydown(e);
        window.addEventListener('start-mode', this._boundStartMode);
        this.addEventListener('screen-active', this._boundScreenActive);
        document.addEventListener('keydown', this._boundKeydown);
        this.renderShell();
    }

    disconnectedCallback() {
        window.removeEventListener('start-mode', this._boundStartMode);
        this.removeEventListener('screen-active', this._boundScreenActive);
        document.removeEventListener('keydown', this._boundKeydown);
    }

    renderShell() {
        this.innerHTML = `
            <div class="p-3 flex items-center justify-between" style="background:var(--bg-card);border-bottom:1px solid var(--border)">
                <button id="editor-close" class="p-1"><i data-lucide="x" class="w-5 h-5" style="color:#a0a0a0"></i></button>
                <div class="flex-1 mx-3">
                    <div class="h-2 rounded-full" style="background:#333">
                        <div class="h-full rounded-full transition-all" style="background:var(--green);width:0%" id="editor-bar"></div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold" style="color:var(--yellow)" id="editor-xp">0 XP</span>
                </div>
            </div>
            <div class="px-4 py-2 text-xs flex justify-between items-center" style="color:#a0a0a0">
                <span id="editor-block-name">Bloque</span>
                <span id="editor-line-info">0/0</span>
                <span id="editor-mode-badge" class="text-[10px] px-2 py-0.5 rounded-full" style="background:var(--bg-input);border:1px solid var(--border)"></span>
            </div>
            <div class="flex-1 overflow-hidden mx-2 rounded-lg" style="border:1px solid var(--border)">
                <div class="msv-editor code-font" id="editor-code"></div>
            </div>
            <div class="p-3 flex gap-2 flex-wrap">
                <button id="btn-check" class="flex-1 py-3 rounded-xl font-bold text-white" style="background:var(--green)">Comprobar</button>
                <button id="btn-solution" class="py-3 px-4 rounded-xl font-semibold" style="background:var(--bg-card);color:#a0a0a0">👁 Solución</button>
            </div>
        `;

        this.querySelector('#editor-close').addEventListener('click', () => exitEditor());
        this.querySelector('#btn-check').addEventListener('click', () => this.checkLineAnswer());
        this.querySelector('#btn-solution').addEventListener('click', () => this.handleSolution());
    }

    handleGlobalKeydown(e) {
        const isActive = document.getElementById('screen-editor')?.classList.contains('active');
        if (!isActive) return;

        if ((e.key === 'h' || e.key === 'H') && (e.ctrlKey || e.metaKey)) {
            if (!this.lineInput || this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam') return;
            this.hintVisible = !this.hintVisible;
            const hintLine = this.querySelector('#hint-line');
            if (hintLine) hintLine.style.display = this.hintVisible ? '' : 'none';
            e.preventDefault();
        }

        if (e.key === 'Enter' && this.waitingForRetry) {
            e.preventDefault();
            this.waitingForRetry = false;
            if (this.retryCleanup) {
                this.retryCleanup();
                this.retryCleanup = null;
            }
        }
    }

    startMode(detail) {
        const mode = detail.mode;
        this.editorMode = mode;
        this.sessionXP = 0;
        this.hintVisible = true;
        this.waitingForRetry = false;
        this.retryCleanup = null;
        this.examErrors = 0;
        this.examBlockIndex = -1;
        state.sessionLinesCompleted = 0;
        state.sessionNoHints = true;

        if (!state.exercisesGenerated || state.lines.length === 0) {
            switchTab('admin');
            return;
        }

        if (mode === 'continue') {
            let found = false;
            for (let i = 0; i < state.lines.length; i++) {
                if (state.lines[i].quiz && !state.completedLines.has(i) && !isLineExcluded(i)) {
                    state.currentIdx = i;
                    found = true;
                    break;
                }
            }
            if (!found) { switchTab('editor'); this.showComplete(); return; }
        } else if (mode === 'sequential') {
            state.currentIdx = 0;
            skipToNextQuiz();
        } else if (mode === 'review') {
            this.reviewQueue = Object.keys(state.failedLines).map(Number).filter(i => !isLineExcluded(i)).sort(() => Math.random() - 0.5);
            if (this.reviewQueue.length === 0) { switchTab('dashboard'); return; }
            state.currentIdx = this.reviewQueue.shift();
            this.reviewCorrectCount = 0;
        } else if (mode === 'quick') {
            const quizLines = state.lines.map((l, i) => l.quiz && !isLineExcluded(i) ? i : -1).filter(i => i >= 0);
            this.reviewQueue = quizLines.sort(() => Math.random() - 0.5).slice(0, 5);
            if (this.reviewQueue.length === 0) { switchTab('dashboard'); return; }
            state.currentIdx = this.reviewQueue.shift();
            this.reviewCorrectCount = 0;
        } else if (mode === 'easy-exam' || mode === 'real-exam') {
            state.currentIdx = 0;
            skipToNextQuiz();
            if (state.currentIdx >= state.lines.length) {
                switchTab('dashboard');
                return;
            }
        } else if (mode === 'block-exam' || mode === 'block-easy-exam') {
            const bi = detail.blockIndex;
            if (bi === undefined || !state.blocks[bi]) { switchTab('dashboard'); return; }
            this.examBlockIndex = bi;
            const blockQuizLines = state.blocks[bi].lines.filter(li => state.lines[li].quiz && !isLineExcluded(li));
            if (blockQuizLines.length === 0) { switchTab('dashboard'); return; }
            this.reviewQueue = [...blockQuizLines];
            state.currentIdx = this.reviewQueue.shift();
        } else if (mode === 'block') {
            const bi = detail.blockIndex;
            this.examBlockIndex = bi;
            const block = state.blocks[bi];
            const blockQuizLines = block.lines.filter(li => state.lines[li].quiz && !isLineExcluded(li));
            if (state.excludedBlocks.has(bi) || blockQuizLines.every(li => state.completedLines.has(li))) {
                return;
            }
            this.reviewQueue = [...blockQuizLines];
            if (this.reviewQueue.length === 0) return;
            state.currentIdx = this.reviewQueue.shift();
        }

        switchTab('editor');
        this.renderEditor();
    }

    renderEditor() {
        if (!this.querySelector('#editor-code')) this.renderShell();
        if (state.currentIdx >= state.lines.length || !state.lines[state.currentIdx]) {
            if (state.completedLines.size > 0) { switchTab('editor'); this.showComplete(); return; }
            switchTab('dashboard'); return;
        }
        const codeEl = this.querySelector('#editor-code');
        codeEl.innerHTML = '';
        this.lineInput = null;
        this.waitingForRetry = false;
        this.retryCleanup = null;
        this.querySelector('#btn-check').classList.remove('hidden');
        this.querySelector('#btn-solution').classList.remove('hidden');

        const isExam = this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';

        if (isExam) {
            this.querySelector('#btn-solution').classList.add('hidden');
        }

        let total, doneCount;
        const isBlockFlow = this.editorMode === 'block' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        if (isBlockFlow && this.examBlockIndex >= 0) {
            const block = state.blocks[this.examBlockIndex];
            total = block ? block.lines.filter(li => state.lines[li].quiz).length : 0;
            doneCount = block ? block.lines.filter(li => state.completedLines.has(li)).length : 0;
        } else {
            total = state.lines.filter(l => l.quiz).length;
            doneCount = state.modeCompleted[this.modePrefix()].size;
        }
        const donePct = total > 0 ? (doneCount / total * 100) : 0;
        this.querySelector('#editor-bar').style.width = donePct + '%';
        this.querySelector('#editor-xp').textContent = this.sessionXP + ' XP';

        const badge = this.querySelector('#editor-mode-badge');
        if (this.editorMode === 'easy-exam') {
            badge.textContent = '📝 Examen fácil';
            badge.style.color = 'var(--blue)';
        } else if (this.editorMode === 'real-exam') {
            badge.textContent = '🎯 Examen real';
            badge.style.color = 'var(--red)';
        } else if (this.editorMode === 'block-exam') {
            badge.textContent = '🎯 Examen función';
            badge.style.color = 'var(--purple)';
        } else if (this.editorMode === 'block-easy-exam') {
            badge.textContent = '📝 Examen función fácil';
            badge.style.color = 'var(--blue)';
        } else {
            badge.textContent = '🧠 Practicar';
            badge.style.color = 'var(--green)';
        }

        const currentBlock = state.blocks.find(b => b.lines.includes(state.currentIdx));
        const blockNameEl = this.querySelector('#editor-block-name');
        const isExamMode = this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        blockNameEl.textContent = isExamMode ? '' : (currentBlock ? currentBlock.icon + ' ' + currentBlock.name : '');
        blockNameEl.style.display = isExamMode ? 'none' : '';

        let contextStart = 0;
        if ((this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam') && currentBlock) {
            contextStart = currentBlock.allLines[0];
        }
        this.querySelector('#editor-line-info').textContent = `Línea ${state.currentIdx + 1}/${state.lines.length}`;

        for (let i = contextStart; i < state.currentIdx; i++) {
            const l = state.lines[i];
            const row = createLine(i + 1, false);
            const content = row.querySelector('.msv-content');
            content.textContent = '    '.repeat(l.indent);
            appendHighlighted(content, l.text);
            codeEl.appendChild(row);
        }

        if (state.currentIdx >= state.lines.length) {
            this.showComplete();
            return;
        }

        const activeLine = state.lines[state.currentIdx];

        if (this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam') {
            const gaps = generateGaps(activeLine.text, state.currentIdx + Date.now());
            const gapRow = createLine(state.currentIdx + 1, true);
            const gapContent = gapRow.querySelector('.msv-content');
            gapContent.textContent = '    '.repeat(activeLine.indent);

            const gapInputs = [];
            gaps.tokens.forEach((tok, i) => {
                const isGap = gaps.gapIndices.includes(i);
                if (isGap) {
                    const input = document.createElement('input');
                    input.className = 'gap-input';
                    input.type = 'text';
                    input.spellcheck = false;
                    input.autocomplete = 'off';
                    input.style.width = Math.max(tok.text.length * 9 + 16, 40) + 'px';
                    input.style.minWidth = '40px';
                    input.style.background = 'var(--bg-input)';
                    input.style.color = '#fff';
                    input.style.border = '1px solid #3e3e42';
                    input.style.borderRadius = '4px';
                    input.style.padding = '2px 6px';
                    input.style.fontFamily = "'Fira Code', monospace";
                    input.style.fontSize = '13px';
                    input.style.textAlign = 'center';
                    input.style.outline = 'none';
                    input.dataset.expected = tok.text;
                    gapInputs.push(input);
                    gapContent.appendChild(input);
                } else {
                    const span = document.createElement('span');
                    span.textContent = tok.text;
                    span.style.color = '#f5f5f5';
                    span.style.whiteSpace = 'pre';
                    gapContent.appendChild(span);
                }
            });

            codeEl.appendChild(gapRow);
            codeEl.scrollTop = codeEl.scrollHeight;

            if (gapInputs.length === 0) {
                this.advanceLine();
                return;
            }

            const expectedGaps = gaps.gapIndices.map(i => gaps.tokens[i].text).join(' ');

            const handleGapEnter = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.lineInput = gapInputs[0];
                    this.checkLineAnswer();
                }
            };

            gapInputs.forEach((inp, idx) => {
                inp.addEventListener('keydown', (e) => {
                    handleAutoClose(e, inp);
                    handleAutoBackspace(e, inp);
                    if (e.key === 'Enter') {
                        handleGapEnter(e);
                    }
                    if (e.key === 'Tab' && !e.shiftKey && idx < gapInputs.length - 1) {
                        e.preventDefault();
                        gapInputs[idx + 1].focus();
                    }
                    if (e.key === 'Tab' && e.shiftKey && idx > 0) {
                        e.preventDefault();
                        gapInputs[idx - 1].focus();
                    }
                });
            });

            if (gapInputs.length > 0) {
                this.lineInput = gapInputs[0];
                this.lineInput.dataset.expected = expectedGaps;
                gapInputs[0].focus();
            }

            return;
        }

        if (!isExam) {
            const hintRow = createHintLine('    '.repeat(activeLine.indent) + activeLine.text);
            if (!this.hintVisible) hintRow.style.display = 'none';
            codeEl.appendChild(hintRow);
        }

        const row = createLine(state.currentIdx + 1, true);
        const content = row.querySelector('.msv-content');
        content.textContent = '    '.repeat(activeLine.indent);

        this.lineInput = document.createElement('input');
        this.lineInput.type = 'text';
        this.lineInput.className = 'msv-input';
        this.lineInput.style.width = '100%';
        this.lineInput.style.textAlign = 'left';
        this.lineInput.style.padding = '2px 6px';
        this.lineInput.style.fontFamily = "'Fira Code', monospace";
        this.lineInput.style.fontSize = '13px';
        this.lineInput.style.lineHeight = '1.7';
        this.lineInput.spellcheck = false;
        this.lineInput.autocomplete = 'off';
        this.lineInput.dataset.expected = activeLine.text;
        content.appendChild(this.lineInput);

        codeEl.appendChild(row);
        codeEl.scrollTop = codeEl.scrollHeight;

        this.lineInput.focus();

        this.lineInput.addEventListener('keydown', (e) => {
            handleAutoClose(e, this.lineInput);
            handleAutoBackspace(e, this.lineInput);
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                this.checkLineAnswer();
            }
        });
    }

    checkLineAnswer() {
        if (state.currentIdx >= state.lines.length) return;
        if (!this.lineInput || this.waitingForRetry) return;

        const isExam = this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        const isBlockExam = this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';

        let isCorrect;
        if (this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam') {
            const gaps = this.querySelectorAll('.gap-input');
            const got = Array.from(gaps).map(g => g.value.trim()).join(' ');
            const expected = this.lineInput.dataset.expected;
            isCorrect = got.toLowerCase() === expected.toLowerCase();
        } else {
            const got = stripComments(this.lineInput.value);
            const expected = stripComments(this.lineInput.dataset.expected);
            isCorrect = got.toLowerCase() === expected.toLowerCase();
            if (isCorrect) {
                const raw = this.lineInput.value.replace(/\s+/g, ' ').trim();
                const rawExp = this.lineInput.dataset.expected.replace(/\s+/g, ' ').trim();
                if ((raw.includes('//') || raw.includes('/*')) && !rawExp.includes('//') && !rawExp.includes('/*')) {
                    checkAchievement('general_wrote_comment', true);
                }
            }
        }

        if (isCorrect) {
            if (!isExam || isBlockExam) {
                state.completedLines.add(state.currentIdx);
            }
            state.modeCompleted[this.modePrefix()].add(state.currentIdx);
            state.consecutiveCorrect++;
            state.sessionLinesCompleted++;
            state.todayMissionDone++;

            if (!isExam) {
                const xp = state.sessionNoHints ? 10 : 6;
                addXP(xp);
                this.sessionXP += xp;
                this.showXPFloat('+' + xp);

                delete state.failedLines[state.currentIdx];
            }

            if (this.editorMode === 'review' || this.editorMode === 'quick' || this.editorMode === 'block') {
                this.reviewCorrectCount++;
                if (this.reviewCorrectCount >= 5) {
                    checkAchievement(this.modePrefix() + '_review_5', true);
                }
            }

            state.markSessionActive();
            checkAchievement('general_streak_3', state.streak >= 3);
            checkAchievement('general_streak_7', state.streak >= 7);
            checkAchievement('general_first_line', true);
            checkAchievement('general_ten_streak', state.consecutiveCorrect >= 10);
            const pfx = this.modePrefix();
            const quizLines = state.lines.filter(l => l.quiz).length;
            const modeCompleted = state.modeCompleted[pfx].size;
            checkAchievement(pfx + '_pct_25', modeCompleted >= Math.floor(quizLines * 0.25));
            checkAchievement(pfx + '_half_file', modeCompleted >= Math.floor(quizLines / 2));
            checkAchievement(pfx + '_pct_75', modeCompleted >= Math.floor(quizLines * 0.75));

            if (!isExam) {
                const block = state.blocks.find(b => b.lines.includes(state.currentIdx));
                if (block) {
                    const bi = state.blocks.indexOf(block);
                    if (block.lines.every(li => state.completedLines.has(li))) {
                        addXP(50);
                        this.sessionXP += 50;
                        if (!state.blockStars[bi]) state.blockStars[bi] = 1;
                        if (state.sessionNoHints && state.blockStars[bi] < 2) state.blockStars[bi] = 2;
                        checkAchievement('general_first_block', true);
                        checkAchievement(this.modePrefix() + '_block_' + bi, true, block.name);
                    }
                }
            }

            if (this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam') {
                this.querySelectorAll('.gap-input').forEach(inp => {
                    inp.style.borderColor = 'var(--green)';
                    inp.style.background = 'rgba(35,197,82,.15)';
                    inp.disabled = true;
                });
            } else if (this.lineInput) {
                this.lineInput.style.borderColor = 'var(--green)';
                this.lineInput.style.background = 'rgba(35,197,82,.15)';
                this.lineInput.disabled = true;
            }
            this.querySelector('#btn-check').classList.add('hidden');
            this.querySelector('#btn-solution').classList.add('hidden');
            this.advanceLine();
        } else {
            state.consecutiveCorrect = 0;

            if (isExam) {
                this.examErrors++;
                let got, expected;
                if (this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam') {
                    const gaps = this.querySelectorAll('.gap-input');
                    got = Array.from(gaps).map(g => g.value.trim()).join(' ');
                    expected = this.lineInput.dataset.expected;
                } else {
                    got = this.lineInput.value.replace(/\s+/g, ' ').trim();
                    expected = this.lineInput.dataset.expected.replace(/\s+/g, ' ').trim();
                }
                this.showDiff(got, expected);
                this.waitingForRetry = true;
                this.retryCleanup = (this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam') ? () => {
                    const block = state.blocks[this.examBlockIndex];
                    if (!block) { switchTab('dashboard'); return; }
                    const blockQuizLines = block.lines.filter(li => state.lines[li].quiz && !isLineExcluded(li));
                    this.reviewQueue = [...blockQuizLines];
                    if (this.reviewQueue.length === 0) { switchTab('dashboard'); return; }
                    state.currentIdx = this.reviewQueue.shift();
                    this.renderEditor();
                } : () => {
                    state.currentIdx = 0;
                    skipToNextQuiz();
                    if (state.currentIdx >= state.lines.length) { switchTab('dashboard'); return; }
                    this.renderEditor();
                };
            } else {
                state.failedLines[state.currentIdx] = (state.failedLines[state.currentIdx] || 0) + 1;
                state.sessionNoHints = false;

                this.showDiff(stripComments(this.lineInput.value), stripComments(this.lineInput.dataset.expected));
                this.waitingForRetry = true;

                if (this.editorMode === 'block') {
                    const block = state.blocks[this.examBlockIndex];
                    if (block) {
                        block.lines.forEach(li => {
                            state.completedLines.delete(li);
                            state.modeCompleted[this.modePrefix()].delete(li);
                        });
                        const blockQuizLines = block.lines.filter(li => state.lines[li].quiz && !isLineExcluded(li));
                        this.reviewQueue = [...blockQuizLines];
                        if (this.reviewQueue.length === 0) { switchTab('dashboard'); return; }
                        this.retryCleanup = () => {
                            state.currentIdx = this.reviewQueue.shift();
                            this.renderEditor();
                        };
                    } else {
                        this.retryCleanup = () => this.renderEditor();
                    }
                } else {
                    this.retryCleanup = () => this.renderEditor();
                }
                state.save();
            }
        }
    }

    showDiff(typed, expected) {
        if (!this.lineInput) return;
        const row = this.lineInput.closest('.msv-content');
        if (!row) return;
        row.innerHTML = '';

        const activeLine = state.lines[state.currentIdx];
        const indent = activeLine.indent;
        const fullExpected = activeLine.text;
        const pad = '    '.repeat(indent);

        const expectLine = document.createElement('div');
        expectLine.style.cssText = 'opacity:.7;font-size:13px';
        {
            const lead = document.createElement('span');
            lead.textContent = pad;
            expectLine.appendChild(lead);
            appendHighlighted(expectLine, fullExpected);
        }

        const diffLine = document.createElement('div');
        diffLine.style.cssText = 'margin-top:4px';
        {
            const lead = document.createElement('span');
            lead.textContent = pad;
            diffLine.appendChild(lead);

            const tParts = tokenizeLine(typed);
            const eParts = tokenizeLine(expected);
            let ti = 0, ei = 0;
            while (ti < tParts.length && ei < eParts.length) {
                if (tParts[ti] === eParts[ei]) {
                    if (eParts[ei].trim()) {
                        const span = document.createElement('span');
                        appendHighlighted(span, eParts[ei]);
                        diffLine.appendChild(span);
                    } else {
                        diffLine.appendChild(document.createTextNode(eParts[ei]));
                    }
                    ti++; ei++;
                } else {
                    if (ti < tParts.length && tParts[ti].trim()) {
                        const bad = document.createElement('span');
                        bad.textContent = tParts[ti];
                        bad.style.cssText = 'background:rgba(241,76,76,.3);border-radius:3px;padding:0 1px';
                        diffLine.appendChild(bad);
                    }
                    if (eParts[ei].trim()) {
                        const arrow = document.createElement('span');
                        arrow.textContent = '→';
                        arrow.style.cssText = 'color:#6a9955;font-weight:600';
                        diffLine.appendChild(arrow);
                    }
                    const good = document.createElement('span');
                    appendHighlighted(good, eParts[ei]);
                    diffLine.appendChild(good);
                    if (ti < tParts.length) ti++;
                    ei++;
                }
            }
            while (ti < tParts.length) {
                if (tParts[ti].trim()) {
                    const bad = document.createElement('span');
                    bad.textContent = tParts[ti];
                    bad.style.cssText = 'background:rgba(241,76,76,.3);border-radius:3px;padding:0 1px';
                    diffLine.appendChild(bad);
                }
                ti++;
            }
            while (ei < eParts.length) {
                if (eParts[ei].trim()) {
                    const arrow = document.createElement('span');
                    arrow.textContent = '→';
                    arrow.style.cssText = 'color:#6a9955;font-weight:600';
                    diffLine.appendChild(arrow);
                }
                const good = document.createElement('span');
                appendHighlighted(good, eParts[ei]);
                diffLine.appendChild(good);
                ei++;
            }
        }

        row.appendChild(expectLine);
        row.appendChild(diffLine);

        const isExam = this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        const msg = document.createElement('div');
        msg.style.cssText = 'font-size:11px;color:#f48771;margin-top:2px;';
        msg.textContent = this.editorMode === 'block-exam' ? 'Enter para reiniciar función' : isExam ? 'Enter para reiniciar examen' : 'Enter para repetir';
        row.appendChild(msg);
    }

    handleSolution() {
        if (!this.lineInput) return;
        if (this.editorMode === 'easy-exam' || this.editorMode === 'real-exam' || this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam') return;
        state.sessionNoHints = false;
        this.lineInput.value = this.lineInput.dataset.expected;
        this.lineInput.disabled = true;
        this.lineInput.style.borderColor = 'var(--blue)';
        this.lineInput.style.background = 'rgba(47,128,237,.15)';
        state.solutionLines[state.currentIdx] = true;
        this.querySelector('#btn-check').classList.add('hidden');
        this.querySelector('#btn-solution').classList.add('hidden');
        this.waitingForRetry = true;
        this.retryCleanup = () => this.renderEditor();
        state.save();
    }

    advanceLine() {
        const isExam = this.editorMode === 'easy-exam' || this.editorMode === 'real-exam';
        const isBlockExam = this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';

        if (isBlockExam) {
            if (this.reviewQueue.length > 0) {
                state.currentIdx = this.reviewQueue.shift();
                state.save();
                this.renderEditor();
            } else {
                state.save();
                const bi = this.examBlockIndex;
                if (bi >= 0) {
                    state.examRealPassed.add(bi);
                    const block = state.blocks[bi];
                    if (block && block.lines.every(li => state.completedLines.has(li))) {
                        addXP(50);
                        this.sessionXP += 50;
                        if (!state.blockStars[bi]) state.blockStars[bi] = 1;
                        if (state.sessionNoHints && state.blockStars[bi] < 2) state.blockStars[bi] = 2;
                        checkAchievement('general_first_block', true);
                        checkAchievement(this.modePrefix() + '_block_' + bi, true, block.name);
                    }
                    state.save();
                }
                this.showExamPassed();
            }
            return;
        }

        if (isExam) {
            state.currentIdx++;
            skipToNextQuiz();
            if (state.currentIdx >= state.lines.length) {
                state.save();
                checkAchievement(this.modePrefix() + '_no_hints', true);
                this.showExamPassed();
            } else {
                state.save();
                this.renderEditor();
            }
            return;
        }

        if (this.editorMode === 'review' || this.editorMode === 'quick' || this.editorMode === 'block') {
            if (this.reviewQueue.length > 0) {
                state.currentIdx = this.reviewQueue.shift();
            } else {
                if (this.editorMode === 'quick') {
                    state.markSessionActive();
                    addXP(20);
                    this.sessionXP += 20;
                    checkAchievement(this.modePrefix() + '_no_hints', state.sessionNoHints);
                    switchTab('dashboard');
                } else if (this.editorMode === 'block') {
                    this.showBlockComplete();
                } else {
                    checkAchievement(this.modePrefix() + '_no_hints', state.sessionNoHints);
                    switchTab('dashboard');
                }
                return;
            }
        } else {
            state.currentIdx++;
            skipToNextQuiz();
            if (state.currentIdx >= state.lines.length) {
                const totalQuiz = state.lines.filter(l => l.quiz).length;
                const excludedQuiz = state.lines.filter((l, i) => l.quiz && isLineExcluded(i)).length;
                const pfx = this.modePrefix();
                if (state.modeCompleted[pfx].size >= totalQuiz - excludedQuiz) {
                    checkAchievement(pfx + '_full_file', true);
                    addXP(500);
                    this.sessionXP += 500;
                    this.showComplete();
                    return;
                }
                switchTab('dashboard'); return;
            }
        }
        state.save();
        this.renderEditor();
    }

    showExamPassed() {
        const isEasy = this.editorMode === 'easy-exam' || this.editorMode === 'block-easy-exam';
        const isBlock = this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        const codeEl = this.querySelector('#editor-code');
        codeEl.innerHTML = '';

        state.lines.forEach((l, i) => {
            if (l.quiz) {
                state.completedLines.add(i);
                state.modeCompleted[this.modePrefix()].add(i);
            }
        });
        if (this.editorMode === 'real-exam' && this.examErrors === 0) {
            state.blocks.forEach((_, bi) => state.examRealPassed.add(bi));
        }
        state.save();

        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;';
        let icon = '🎉', title, subtitle;
        if (isBlock) {
            icon = '🎯';
            const name = state.blocks[this.examBlockIndex]?.name || 'Función';
            title = `<span style="color:var(--green)">${name} dominada</span>`;
            subtitle = this.examErrors === 0 ? '<div style="color:var(--yellow);font-size:13px">✅ Sin errores</div>' : '';
        } else if (isEasy) {
            icon = '📝';
            title = 'Examen fácil completado';
            subtitle = '';
        } else {
            title = '¡Examen real superado!';
            subtitle = this.examErrors === 0 ? '<div style="color:var(--yellow);font-size:13px">✅ Código dominado sin errores</div>' : '';
        }
        const isBlockExam = this.editorMode === 'block-exam' || this.editorMode === 'block-easy-exam';
        el.innerHTML = `
            <div class="text-5xl">${icon}</div>
            <div class="text-xl font-bold" style="color:var(--green)">${title}</div>
            ${subtitle}
            <div class="text-sm" style="color:#a0a0a0">${this.examErrors} errores</div>
            <button class="w-48 py-3 rounded-xl font-bold text-white" style="background:var(--blue)" id="exam-return">Volver al inicio</button>
            <button class="w-48 py-3 rounded-xl font-bold" style="background:var(--bg-card);color:#a0a0a0" id="exam-repeat">Repetir</button>
            <div class="text-xs" style="color:#a0a0a0;margin-top:4px">Presiona <kbd style="background:var(--bg-input);padding:1px 6px;border-radius:3px;border:1px solid var(--border)">Enter</kbd> para repetir</div>
        `;
        codeEl.appendChild(el);
        this.querySelector('#btn-check').classList.add('hidden');
        this.querySelector('#btn-solution').classList.add('hidden');

        const examRepeatBtn = el.querySelector('#exam-repeat');
        examRepeatBtn.focus();

        el.querySelector('#exam-return').addEventListener('click', () => switchTab('dashboard'));
        examRepeatBtn.addEventListener('click', () => {
            if (isBlockExam) {
                const block = state.blocks[this.examBlockIndex];
                if (block) {
                    block.lines.forEach(i => {
                        state.completedLines.delete(i);
                        state.modeCompleted[this.modePrefix()].delete(i);
                    });
                    state.save();
                }
            }
            window.dispatchEvent(new CustomEvent('start-mode', {
                detail: isBlockExam ? { mode: this.editorMode, blockIndex: this.examBlockIndex } : { mode: this.editorMode }
            }));
        });
    }

    showBlockComplete() {
        const codeEl = this.querySelector('#editor-code');
        codeEl.innerHTML = '';

        const bi = this.examBlockIndex;
        const block = bi >= 0 ? state.blocks[bi] : null;
        const name = block ? block.name : 'Función';
        const icon = block ? block.icon : '🎯';

        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px';
        el.innerHTML = `
            <div class="text-5xl">${icon}</div>
            <div class="text-xl font-bold" style="color:var(--green)">${name} dominada</div>
            <div style="color:var(--yellow);font-size:13px">✅ Sin errores</div>
            <button class="w-48 py-3 rounded-xl font-bold text-white" style="background:var(--blue)" id="block-return">Volver al inicio</button>
            <button class="w-48 py-3 rounded-xl font-bold" style="background:var(--bg-card);color:#a0a0a0" id="block-repeat">Repasar</button>
            <div class="text-xs" style="color:#a0a0a0;margin-top:4px">Presiona <kbd style="background:var(--bg-input);padding:1px 6px;border-radius:3px;border:1px solid var(--border)">Enter</kbd> para repetir</div>
        `;
        codeEl.appendChild(el);
        this.querySelector('#btn-check').classList.add('hidden');
        this.querySelector('#btn-solution').classList.add('hidden');

        const repeatBtn = el.querySelector('#block-repeat');
        repeatBtn.focus();

        el.querySelector('#block-return').addEventListener('click', () => switchTab('dashboard'));
        repeatBtn.addEventListener('click', () => {
            const block = state.blocks[this.examBlockIndex];
            if (block) {
                block.lines.forEach(i => {
                    state.completedLines.delete(i);
                    state.modeCompleted[this.modePrefix()].delete(i);
                });
                state.save();
            }
            window.dispatchEvent(new CustomEvent('start-mode', {
                detail: { mode: 'block', blockIndex: this.examBlockIndex }
            }));
        });
    }

    showXPFloat(text) {
        const el = document.createElement('div');
        el.className = 'xp-float';
        el.textContent = text;
        el.style.left = '50%';
        el.style.top = '40%';
        this.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }

    showComplete() {
        const totalQuiz = state.lines.filter(l => l.quiz).length;
        const el = document.createElement('div');
        el.innerHTML = `
            <div class="flex-1 p-4 pb-20 overflow-y-auto items-center justify-center text-center" style="display:flex;flex-direction:column">
                <div class="animate-pop">
                    <div class="text-6xl mb-4">🏆</div>
                    <h2 class="text-2xl font-bold mb-2" style="color:#f5f5f5;font-size:23px;font-weight:800">Código reconstruido entero</h2>
                    <p class="text-sm mb-6" style="color:#a0a0a0;font-size:15px;">Ya no estás leyendo código. Lo estás sacando de memoria.</p>
                    <div class="card text-left mb-4 space-y-2">
                        <div class="flex justify-between"><span style="color:#a0a0a0">Líneas dominadas</span><span class="font-bold">${state.completedLines.size}/${totalQuiz}</span></div>
                        <div class="flex justify-between"><span style="color:#a0a0a0">XP total</span><span class="font-bold" style="color:var(--yellow)">${state.xpTotal}</span></div>
                        <div class="flex justify-between"><span style="color:#a0a0a0">Racha</span><span class="font-bold">${state.streak} días</span></div>
                        <div class="flex justify-between"><span style="color:#a0a0a0">Nivel</span><span class="font-bold">${getLevel() + 1}</span></div>
                    </div>
                    <button class="w-full py-3 rounded-xl font-bold text-white mb-2" style="background:var(--blue)" id="complete-map">Volver al mapa</button>
                    <button class="w-full py-3 rounded-xl font-bold" style="background:var(--bg-card);color:#a0a0a0" id="complete-repeat">Repetir todo</button>
                </div>
            </div>
        `;
        el.querySelector('#complete-map').addEventListener('click', () => switchTab('map'));
        el.querySelector('#complete-repeat').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'sequential' } }));
        });
        this.innerHTML = '';
        this.appendChild(el);
    }
}
customElements.define('editor-screen', EditorScreen);
