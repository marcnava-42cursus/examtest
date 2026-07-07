import { state } from './state.js';
import { parseCode } from './parser.js';
import { switchTab } from './router.js';
import './components/app-shell.js';
import './components/bottom-nav.js';
import './components/progress-ring.js';
import './components/toast-container.js';
import './components/dash-screen.js';
import './components/map-screen.js';
import './components/code-screen.js';
import './components/editor-screen.js';
import './components/stats-screen.js';
import './components/achievements-screen.js';
import './components/admin-screen.js';

const savedData = state.load();
if (savedData) {
    state.applyLoaded(savedData);
    if (state.rawCode) {
        parseCode(state.rawCode);
        state.save();
    }
}

state.notify();

const dataHandler = {
    onDataChanged(data) {
        if (data.length > 0 && !state.rawCode) {
            const training = data.find(r => r.file_type === 'training');
            if (training && training.file_content) {
                parseCode(training.file_content);
                state.exercisesGenerated = true;
                state.currentIdx = Number(training.current_line_index) || 0;
                try { state.completedLines = new Set(JSON.parse(training.failed_lines || '[]')); } catch (e) { }
                state.save();
                state.notify();
            }
        }
    }
};

async function initDataSdk() {
    try { await window.dataSdk.init(dataHandler); } catch (e) { }
}

if (state.lines.length > 0) {
    state.notify();
}
initDataSdk();

if (window.lucide) lucide.createIcons();
