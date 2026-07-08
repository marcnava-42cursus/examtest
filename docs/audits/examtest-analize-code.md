# Towel Found — Audit Report

## Date
- 2026-07-08

## Scope reviewed
- **Application**: Full single-page application for memorizing C code (mini_serv.c from 42 school)
- **Files reviewed**:
  - `index.html`
  - `src/app.js`, `src/state.js`, `src/parser.js`, `src/router.js`, `src/xp.js`, `src/constants.js`, `src/styles.css`
  - `src/components/app-shell.js`, `bottom-nav.js`, `progress-ring.js`, `toast-container.js`
  - `src/components/dash-screen.js`, `map-screen.js`, `code-screen.js`, `editor-screen.js`, `stats-screen.js`, `achievements-screen.js`, `admin-screen.js`
- **Runtime assumptions**: Single-user client-side app running in a browser; no backend; `localStorage` persistence; optional `window.dataSdk` for external data injection.

## Stack classification
- **Web Components** (no React, no framework)

## Inputs and methodology
- **Skills used**: analize-code (Web Components lane)
- **Code areas inspected**: All 7 screens, global state, parser, router, XP/achievement system, styles, HTML shell
- **Runtime/build verification performed**: Static analysis only
- **Limitations**: Backend and `dataSdk` interface were not available for testing; no HTTP/network layer was in scope.

## Executive summary

The application is a well-structured Web Components SPA for spaced-repetition memorization of C source code, targeting 42 students. The architecture is clean: a global observable state, a standalone parser, and screen-level custom elements that subscribe to state changes.

**Major strengths**: Coherent visual design, responsive layout, solid gamification loop (XP, streaks, achievements, exam modes), functional diff display, and practical exam simulation.

**Critical issues**: None found.

**High-priority issues**: (1) No `disconnectedCallback` anywhere — custom elements leak event listeners and never clean up. (2) `render()` replaces `innerHTML` on every state change, destroying DOM state and preventing transitions. (3) `toast-container.js` duplicates the container `div` if called before the HTML shell mounts.

**Medium-priority issues**: Large module-level mutable state in `editor-screen.js`, no Shadow DOM usage (style collisions possible), `generateGaps` uses `Math.random` without seed — random failures during exams are non-deterministic.

## Findings by severity

### Critical
None.

### High

#### 1. No `disconnectedCallback` in any custom element — memory leak
- **Why it matters**: Every screen registers `'state-changed'` listeners on `window`. When elements are removed or screens replaced, listeners remain attached, causing stale closures, phantom renders, and memory leaks over long sessions.
- **Evidence**: `dash-screen.js:8`, `map-screen.js:6`, `bottom-nav.js:6`, `stats-screen.js:6`, `achievements-screen.js:8` all use `window.addEventListener('state-changed', ...)` with no corresponding `disconnectedCallback` / `removeEventListener`.
- **Affected files**: All screen components + `bottom-nav.js`
- **Recommended fix**: Add `disconnectedCallback()` to every component that registers `window` listeners. Store the handler reference (or use `AbortController`) to allow removal.

#### 2. `render()` replaces `innerHTML` on every state change — destroys focus, scroll, and input state
- **Why it matters**: The pattern `this.innerHTML = '...'` followed by `this.querySelector(...)` re-creates the entire DOM subtree on each `state-changed` event. This loses scroll position, input focus, text selection, and any ephemeral DOM state. It also causes unnecessary layout thrashing.
- **Evidence**: `dash-screen.js:32`, `map-screen.js:12`, `stats-screen.js:15`, `achievements-screen.js:14`
- **Affected files**: `dash-screen.js`, `map-screen.js`, `stats-screen.js`, `achievements-screen.js`
- **Recommended fix**: Use a render-once pattern with targeted DOM updates, or use a minimal diff strategy. At minimum, debounce renders and avoid full innerHTML swaps for frequently-changing data (e.g., progress bars).

#### 3. `toast-container.js` duplicate container risk
- **Why it matters**: `getContainer()` checks `document.getElementById(containerId)`. If `app-shell` hasn't rendered yet (async load), the container is appended to `<body>`. When `app-shell` later renders (it includes `<div id="toast-container">`), two containers coexist, creating duplicate toasts and visual glitches.
- **Evidence**: `index.html:15` `<div id="toast-container"></div>` AND `toast-container.js:6-9` creates it dynamically.
- **Affected files**: `index.html`, `toast-container.js`
- **Recommended fix**: Remove the static `<div id="toast-container">` from `index.html` and let `toast-container.js` be the single source of truth — or vice versa.

### Medium

#### 4. No Shadow DOM — style leakage and collision risk
- **Why it matters**: All components render into the light DOM. Any external stylesheet, user style, or third-party widget can affect internal component styles. Conversely, component styles leak out (e.g., `.card`, `.screen`, `.nav-tab` are global).
- **Evidence**: All components use `this.innerHTML = ...` without Shadow root. Styles are in `styles.css` as global rules.
- **Affected files**: All components
- **Recommended fix**: For a non-framework Web Components app, using `attachShadow({ mode: 'open' })` and scoping styles per component would improve encapsulation. However, since Tailwind utility classes are used, this would require duplicating styles per shadow root, which is impractical. Consider using CSS parts or a CSS-in-JS approach instead.

#### 5. Module-level mutable state in `editor-screen.js`
- **Why it matters**: Variables like `sessionXP`, `editorMode`, `reviewQueue`, `lineInput`, `waitingForRetry`, `retryCleanup`, `examErrors`, `examBlockIndex` are module-scoped, not instance-scoped. If multiple `EditorScreen` instances existed (even transiently via DOM manipulation), they would share state, causing race conditions.
- **Evidence**: `editor-screen.js:7-16` — all module-level.
- **Affected files**: `editor-screen.js`
- **Recommended fix**: Move mutable session state into instance properties on the custom element class, or into a dedicated session object.

#### 6. `generateGaps` uses `Math.random` — non-deterministic exam behavior
- **Why it matters**: In exam modes (especially "real exam"), gaps are generated randomly. Two students with the same code could see different gaps, making fair comparison impossible. Random failures cannot be reproduced for debugging.
- **Evidence**: `editor-screen.js:170-171` uses `Math.random` to shuffle gapable tokens.
- **Affected files**: `editor-screen.js`
- **Recommended fix**: Use a deterministic seed based on the line index + session ID, or use a fixed gap strategy (e.g., every N-th word, or only keywords).

#### 7. `appendHighlighted` in diff view re-tokenizes — potential XSS via code content
- **Why it matters**: `appendHighlighted` creates `document.createElement('span')` and sets `textContent`, which is safe. However, if any code token were rendered via `innerHTML` or if `textContent` were ever replaced with `innerHTML`, arbitrary C code containing `<script>` could execute. Currently safe, but fragility exists.
- **Evidence**: `editor-screen.js:102-111` — uses `textContent`. No XSS currently, but worth noting as a boundary.
- **Affected files**: `editor-screen.js`, `code-screen.js`
- **Recommended fix**: Ensure all code rendering continues to use `textContent` / `createTextNode`. Add a lint rule to prevent `innerHTML` with user-supplied code.

### Low

#### 8. `lucide.createIcons()` called in multiple places with no deduplication
- **Why it matters**: Every `render()` in components that use Lucide icons calls `lucide.createIcons()`. This re-processes the entire DOM, wasting CPU cycles on already-rendered icons.
- **Evidence**: `dash-screen.js:147`, `bottom-nav.js:44`, `editor-screen.js:225`, `app.js:52`
- **Affected files**: `dash-screen.js`, `bottom-nav.js`, `editor-screen.js`, `app.js`
- **Recommended fix**: Call `lucide.createIcons()` once after each full render cycle (e.g., after a `requestAnimationFrame` batch), or use mutation observer.

#### 9. Hardcoded file name `mini_serv_rf.c` in dashboard copy
- **Why it matters**: The app is designed for 42's mini_serv exam specifically. If reused for other code, the copy is misleading.
- **Evidence**: `dash-screen.js:70`
- **Affected files**: `dash-screen.js`
- **Recommended fix**: Derive the filename from the loaded code or make it configurable.

#### 10. `state-changed` event re-notifies while already in a notify chain
- **Why it matters**: `state.notify()` is called multiple times in sequence during operations like `startMode`, `advanceLine`, etc. Each call triggers a full re-render of all listening screens. This causes O(n*m) re-renders per user action.
- **Evidence**: `state.js:108-110` dispatches unconditionally. `checkLineAnswer` calls `state.save()` and `state.markSessionActive()` both of which call `save()` but not `notify()` directly — however, `advanceLine` calls `state.save()` and `renderEditor()` indirectly.
- **Affected files**: `state.js`
- **Recommended fix**: Consider a batched notification mechanism or dirty flag that flushes once per microtask.

## UI / UX / Accessibility review

### Visual hierarchy
- Good: Title, stats grid, progress ring, mission card are well-ordered.
- Issue: The "no code" state in dashboard disappears abruptly when code loads — no smooth transition.

### Spacing and density
- Tailwind classes used consistently. Padding and margins follow a 4px/8px/16px rhythm. The editor line height (1.7) is generous for code.

### Responsiveness
- `max-w-lg mx-auto` constrains the app to a mobile-first width. `overflow-y-auto` on screens handles scrolling. The editor goes fullscreen via `position: fixed` when active.
- Minor: `min-height: calc(100 * min(var(--vh, 1vh), 1vh))` handles mobile viewport correctly — good practice.

### Touch targets
- Nav tabs are small (44px height from `py-8px` + 10px font). The `map-node` items have 44px icon circles. Minimum recommended touch target is 44x44px — barely met.

### Contrast and readability
- Dark theme (#0f1117 background, #f5f5f5 text). Code font (Fira Code) at 13px. Diff view uses color-coded spans with background highlights — readable.
- Issue: `.msv-gutter` color (#555) on dark background may be too low contrast for some users (ratio ~3:1).

### Keyboard / focus behavior
- Editor input uses `textarea` with `keydown` handlers for Enter/auto-close. Gap inputs support Tab navigation.
- Missing: No visible focus ring on interactive elements besides `.msv-input:focus`. Buttons have no `:focus-visible` styles. No `aria-` attributes on custom elements.

### Loading, empty and error states
- Handled: No-code state (`dash-screen.js:66`), empty map (`map-screen.js:16`), exam complete (`showExamPassed`), file complete (`showComplete`).
- Missing: No loading spinner for file reading (though FileReader is usually fast). No error state if `parseCode` fails on malformed input.

### Copy clarity
- Spanish copy is informal, motivational, and tonally consistent ("Hoy toca escribir, no leer"). Good for the target audience.

## Stack-specific best-practices review (Web Components)

### Lifecycle usage
- `connectedCallback` is used for initial render + event registration. Good.
- **Issue**: `disconnectedCallback` is never used anywhere. Event listeners, timeouts (`showComplete`'s `setTimeout`), and floating XP elements are never cleaned up.

### Attributes vs properties
- Components use properties via module-imported `state` object. No observed attributes except `ProgressRing`. This is acceptable for this architecture.

### Shadow DOM and styling
- No Shadow DOM used (see Finding #4). All styles are global. This works with Tailwind's utility approach but breaks encapsulation.

### Events and public element API
- Screens communicate via `window` custom events (`'state-changed'`, `'start-mode'`, `'screen-active'`). This is a valid pub-sub pattern but creates a global event namespace.
- The event-based API is implicit (not documented on element classes) — a consumer would need to read the source to know what events to dispatch.

### DOM cleanup and rendering patterns
- Full `innerHTML` replacement on every render (see Finding #2). No DOM recycling or targeted updates. This is the single biggest performance and UX issue.
- The editor screen manages DOM more carefully (append-only pattern in `renderEditor`), which is better.

## Architecture / Maintainability review

**Element API design**: Screens are independent custom elements registered with `customElements.define`. They each import `state` directly. Coupling to global state is tight — unit testing requires the full state object.

**Separation of concerns**: Well-divided:
- `state.js` — all application state, persistence
- `parser.js` — code parsing, tokenization, block detection
- `router.js` — tab switching, URL-less navigation
- `xp.js` — XP math, level calculation, achievement checks
- `constants.js` — all config, levels, achievements, keywords
- Components — screen presentation, event wiring

**Reusability**: `ProgressRing` and `ToastContainer` are small reusable elements. Screen components are not intended for reuse (each bound to a specific screen ID).

**Maintainability risks**:
- Module-level mutable variables in `editor-screen.js` make reasoning about state difficult.
- Global event listeners require manual cleanup tracking.
- No tests were found in the repo.

## Security review

- **Auth/session**: None. Entirely client-side. No backend.
- **Unsafe content**: Code text is rendered via `textContent`, not `innerHTML`. Safe from XSS.
- **Upload**: `FileReader` reads `.c`/`.h`/`.txt` files from user's own machine. No network upload.
- **localStorage**: Game progress stored in `localStorage` under `msv_trainer_v2`. No sensitive data.
- **`dataSdk`**: External SDK interface (`app.js:44`) is invoked with a handler that accepts `data`. The handler trusts `data[].file_content`, `current_line_index`, `failed_lines`. If the SDK is compromised or misconfigured, arbitrary code could be injected into the app's state via `parseCode`. However, this is code content, not executable JS — risk is limited to display logic.
- **Overall**: Minimal attack surface. The SDK integration is the only untrusted input boundary.

## Cross-cutting improvements

1. **Adopt a targeted DOM update pattern**: Replace full `innerHTML` swaps with granular updates using `textContent` / `classList.toggle` / `style.width` for things like progress bars, XP counters, and stats. Reserve `innerHTML` for structural changes only.
2. **Add `disconnectedCallback` to all components**: Use a `#cleanup` array or `AbortController` to remove all event listeners on disconnect.
3. **Unify event dispatch**: Consider a single `state-changed` event with a dirty-check mechanism rather than unconditional re-renders.
4. **Add focus management**: After `render()`, re-focus the active element or the first focusable element. The editor already does this for `lineInput`.
5. **Add Cypress or Playwright tests**: The app is well-structured for E2E testing via custom events.

## Prioritized action plan

### Immediate fixes
1. Remove duplicate `#toast-container` from `index.html` or `toast-container.js`
2. Add `disconnectedCallback` with `removeEventListener` to all 8 components that register window listeners

### Short-term cleanup
3. Replace `innerHTML` full re-renders with targeted updates for volatile data (progress, XP, stats)
4. Move module-level state in `editor-screen.js` to instance properties
5. Debounce `lucide.createIcons()` calls

### Structural improvements
6. Add deterministic gap generation for exam fairness
7. Add `:focus-visible` styles and `aria-` attributes for accessibility
8. Add error handling for malformed code in `parseCode`

### Optional polish
9. Make the filename dynamic instead of hardcoded `mini_serv_rf.c`
10. Add a loading state for file reading
11. Consider extracting the diff algorithm into a separate module for testability

## Open questions / assumptions

- The `dataSdk` interface was not available for review. If it sends data from a remote source, the trust boundary (what the SDK validates before passing to the app) should be documented.
- No build step or bundler is used — pure ES modules loaded via `type="module"`. This is fine for small apps but may require a bundler as the app grows.
- Tailwind is loaded via CDN (`cdn.tailwindcss.com`). This adds a network dependency and latency. Consider a pre-built CSS approach for production.
