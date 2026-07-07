const containerId = 'toast-container';

function getContainer() {
    let el = document.getElementById(containerId);
    if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        document.body.appendChild(el);
    }
    return el;
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
