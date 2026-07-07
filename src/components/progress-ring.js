class ProgressRing extends HTMLElement {
    static get observedAttributes() {
        return ['progress', 'label'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const progress = Math.min(100, Math.max(0, Number(this.getAttribute('progress')) || 0));
        const label = this.getAttribute('label') || '';
        const r = 24;
        const c = 2 * Math.PI * r;
        const offset = c - (progress / 100) * c;
        this.innerHTML = `
            <div class="progress-ring">
                <svg width="56" height="56">
                    <circle cx="28" cy="28" r="${r}" fill="none" stroke="#333" stroke-width="4"/>
                    <circle cx="28" cy="28" r="${r}" fill="none" stroke="var(--blue)" stroke-width="4"
                        stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${label}</div>
            </div>
        `;
    }
}
customElements.define('progress-ring', ProgressRing);
