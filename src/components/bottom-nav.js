import { switchTab } from '../router.js';

class BottomNav extends HTMLElement {
    connectedCallback() {
        this.render();
        window.addEventListener('state-changed', () => this.updateActive());
    }

    render() {
        this.innerHTML = `
            <nav class="fixed bottom-0 left-0 right-0 flex" style="background:var(--bg-card);border-top:1px solid var(--border);z-index:50">
                <button class="nav-tab active" data-tab="dashboard">
                    <i data-lucide="home" class="w-5 h-5"></i><span>Inicio</span>
                </button>
                <button class="nav-tab" data-tab="map">
                    <i data-lucide="map" class="w-5 h-5"></i><span>Mapa</span>
                </button>
                <button class="nav-tab" data-tab="code">
                    <i data-lucide="file-text" class="w-5 h-5"></i><span>Código</span>
                </button>
                <button class="nav-tab" data-tab="editor">
                    <i data-lucide="code" class="w-5 h-5"></i><span>Practicar</span>
                </button>
                <button class="nav-tab" data-tab="stats">
                    <i data-lucide="bar-chart-2" class="w-5 h-5"></i><span>Stats</span>
                </button>
                <button class="nav-tab" data-tab="achievements">
                    <i data-lucide="trophy" class="w-5 h-5"></i><span>Logros</span>
                </button>
            </nav>
        `;

        this.querySelectorAll('.nav-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                if (tab === 'editor') {
                    window.dispatchEvent(new CustomEvent('start-mode', { detail: { mode: 'continue' } }));
                } else {
                    switchTab(tab);
                }
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    updateActive() {
        const active = document.querySelector('.screen.active');
        if (!active) return;
        const name = active.id.replace('screen-', '');
        this.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === name);
        });
    }
}
customElements.define('bottom-nav', BottomNav);
