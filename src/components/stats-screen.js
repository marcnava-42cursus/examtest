import { state } from '../state.js';
import { getLevel } from '../xp.js';

class StatsScreen extends HTMLElement {
    connectedCallback() {
        window.addEventListener('state-changed', () => this.render());
        this.addEventListener('screen-active', () => this.render());
        this.render();
    }

    render() {
        const totalQuiz = state.lines.filter(l => l.quiz).length;
        const pct = totalQuiz > 0 ? Math.round(state.completedLines.size / totalQuiz * 100) : 0;

        this.innerHTML = `
            <h2 class="text-lg font-bold mb-4">Estadísticas</h2>
            <div class="card">
                <div class="text-xs" style="color:#a0a0a0">Archivo memorizado</div>
                <div class="text-2xl font-bold mt-1">${pct}%</div>
                <div class="h-2 rounded-full mt-2" style="background:#333">
                    <div class="h-full rounded-full" style="background:var(--green);width:${pct}%"></div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">XP total</div>
                    <div class="text-xl font-bold mt-1" style="color:var(--yellow)">${state.xpTotal}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Racha</div>
                    <div class="text-xl font-bold mt-1 streak-flame">${state.streak} 🔥</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Mejor racha</div>
                    <div class="text-xl font-bold mt-1">${state.bestStreak}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Nivel</div>
                    <div class="text-xl font-bold mt-1">${getLevel() + 1}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Líneas completadas</div>
                    <div class="text-xl font-bold mt-1">${state.completedLines.size}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Fallos pendientes</div>
                    <div class="text-xl font-bold mt-1" style="color:var(--red)">${Object.keys(state.failedLines).length}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Soluciones usadas</div>
                    <div class="text-xl font-bold mt-1">${Object.keys(state.solutionLines).length}</div>
                </div>
                <div class="card">
                    <div class="text-xs" style="color:#a0a0a0">Bloques</div>
                    <div class="text-xl font-bold mt-1">${state.blocks.length}</div>
                </div>
            </div>
        `;
    }
}
customElements.define('stats-screen', StatsScreen);
