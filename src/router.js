import { state } from './state.js';

export function switchTab(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-' + name);
    if (screen) {
        screen.classList.add('active');
        screen.dispatchEvent(new CustomEvent('screen-active'));
    }
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === name);
    });
    state.notify();
}

export function exitEditor() {
    switchTab('dashboard');
}
