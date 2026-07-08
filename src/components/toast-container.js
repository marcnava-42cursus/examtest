const containerId = 'toast-container';

let container = null;

function getContainer() {
    if (!container || !document.body.contains(container)) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toast.style.background =
        type === 'success' ? 'var(--green)' :
        type === 'achievement' ? 'var(--yellow)' : 'var(--blue)';
    toast.style.color = type === 'achievement' ? '#000' : '#fff';
    getContainer().appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
