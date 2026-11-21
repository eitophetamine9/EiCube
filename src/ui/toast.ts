export class ToastManager {
  private container: HTMLElement | null = null;

  constructor() {
    if (typeof document === 'undefined') return;

    let existing = document.getElementById('toast-container');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'toast-container';
      existing.className = 'toast-container';
      document.body.appendChild(existing);
    }
    this.container = existing;
  }

  show(message: string, durationMs: number = 2400): void {
    if (typeof document === 'undefined' || !this.container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    toast.textContent = message;

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }, durationMs);
  }
}

export const toast = new ToastManager();
