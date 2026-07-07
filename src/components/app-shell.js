import { state } from '../state.js';
import { parseCode } from '../parser.js';
import { switchTab } from '../router.js';

class AppShell extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <div class="flex flex-col w-full max-w-lg mx-auto" style="min-height:calc(100 * min(var(--vh, 1vh), 1vh))">
                <dash-screen id="screen-dashboard" class="screen active flex-1 p-4 pb-20 overflow-y-auto"></dash-screen>
                <map-screen id="screen-map" class="screen flex-1 p-4 pb-20 overflow-y-auto"></map-screen>
                <code-screen id="screen-code" class="screen flex-1 p-4 pb-20 overflow-y-auto"></code-screen>
                <editor-screen id="screen-editor" class="screen flex-1 pb-20 overflow-hidden"></editor-screen>
                <stats-screen id="screen-stats" class="screen flex-1 p-4 pb-20 overflow-y-auto"></stats-screen>
                <achievements-screen id="screen-achievements" class="screen flex-1 p-4 pb-20 overflow-y-auto"></achievements-screen>
                <admin-screen id="screen-admin" class="screen flex-1 p-4 pb-20 overflow-y-auto"></admin-screen>
                <bottom-nav></bottom-nav>
            </div>
        `;
    }
}
customElements.define('app-shell', AppShell);
