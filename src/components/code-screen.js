import { state } from '../state.js';
import { tokenize, getTokenClass } from '../parser.js';

class CodeScreen extends HTMLElement {
    connectedCallback() {
        this._boundRender = () => this.render();
        this._boundExpand = () => {
            const container = this.closest('[class*="max-w-lg"]');
            if (container && !this._expanded) {
                this._savedMaxWidth = container.style.maxWidth;
                container.style.maxWidth = '100%';
                this._expanded = true;
            }
        };
        this._boundRestore = (e) => {
            if (e.target !== this && this._expanded) {
                const container = this.closest('[class*="max-w-lg"]');
                if (container) container.style.maxWidth = this._savedMaxWidth || '';
                this._expanded = false;
            }
        };
        this.addEventListener('screen-active', this._boundRender);
        this.addEventListener('screen-active', this._boundExpand);
        document.addEventListener('screen-active', this._boundRestore);
        this.render();
    }

    disconnectedCallback() {
        this.removeEventListener('screen-active', this._boundRender);
        this.removeEventListener('screen-active', this._boundExpand);
        document.removeEventListener('screen-active', this._boundRestore);
        if (this._expanded) {
            const container = this.closest('[class*="max-w-lg"]');
            if (container) container.style.maxWidth = this._savedMaxWidth || '';
            this._expanded = false;
        }
    }

    render() {
        if (!state.rawCode) {
            this.innerHTML = `
                <h2 class="text-lg font-bold mb-4">Código</h2>
                <p class="text-sm" style="color:var(--text-dim)">Carga un archivo en Administrar para ver el código.</p>
            `;
            return;
        }

        this.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">Código</h2>
                <span class="text-xs" style="color:var(--text-dim)">${state.lines.filter(l => l.quiz).length} líneas · ${state.blocks.length} bloques</span>
            </div>
            <div class="code-font" style="font-size:12px;line-height:1.6;overflow-x:auto" id="code-lines"></div>
        `;

        const container = this.querySelector('#code-lines');
        state.lines.forEach((line, i) => {
            const row = document.createElement('div');
            row.className = 'msv-line';
            const gutter = document.createElement('div');
            gutter.className = 'msv-gutter';
            gutter.textContent = i + 1;
            const content = document.createElement('div');
            content.className = 'msv-content';

            const indent = document.createTextNode('    '.repeat(line.indent));

            if (!line.quiz) {
                content.style.color = '#555';
                content.appendChild(indent);
                content.append(line.text);
            } else {
                content.appendChild(indent);
                const tokens = tokenize(line.text);
                tokens.forEach((tok, ti) => {
                    const span = document.createElement('span');
                    span.textContent = tok.text;
                    const cls = getTokenClass(tok, tokens, ti);
                    if (cls) span.className = cls;
                    content.appendChild(span);
                });
            }

            row.appendChild(gutter);
            row.appendChild(content);
            container.appendChild(row);
        });
    }
}

customElements.define('code-screen', CodeScreen);
