class ToastManager {
  constructor(toastElement) {
    this.toastElement = toastElement;
    this.currentTimeout = null;
  }

  show(message, isError = false, duration = 3000) {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    this.toastElement.textContent = message;
    this.toastElement.className = `toast ${isError ? 'error' : ''}`;
    this.toastElement.style.display = 'block';

    this.currentTimeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  success(message, duration = 3000) {
    this.show(message, false, duration);
  }

  error(message, duration = 3000) {
    this.show(message, true, duration);
  }

  hide() {
    this.toastElement.style.display = 'none';
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
  }
}
