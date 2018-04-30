import alt, { AbstractStoreModel } from './alt';

import toastActions from './ToastActions';

export interface Toast {
  text: string;
  action?: any;
}

export interface ToastStoreState {
  toasts: Toast[];
  queued: Array<Toast>;
  autohideTimeout: number;
  autohide: boolean;
}

const MIN_TIMEOUT_MS = 3000;
const AVG_WORDS_PER_SEC: number = 2;

class ToastStore extends AbstractStoreModel<ToastStoreState> implements ToastStoreState {
  toasts: Toast[];
  queued: Array<Toast>;
  autohideTimeout: number;
  autohide: boolean;

  constructor() {
    super();

    this.toasts = [];
    this.queued = Array<Toast>();
    this.autohideTimeout = MIN_TIMEOUT_MS;
    this.autohide = true;

    this.bindListeners({
      addToast: toastActions.addToast,
      removeToast: toastActions.removeToast,
    });
  }

  addToast(toast: Toast): void {
    if (this.toastExists(toast)) {
      return; // ignore dups
    }
    if (this.toasts.length === 0) {
      this.toasts.push(toast);
    } else {
      this.queued.push(toast);
    }
    this.updateSnackbarAttributes(toast);
  }

  removeToast(): void {
    if (this.queued.length > 0) {
      this.toasts = this.queued.splice(0, 1);
    } else if (this.toasts.length > 0) {
      const [, ...toasts] = this.toasts;
      this.toasts = toasts;
    }
  }

  private toastExists(toast: Toast): boolean {
    return this.toasts.findIndex(x => x.text === toast.text) > -1
        || this.queued.findIndex(x => x.text === toast.text) > -1;
  }

  private updateSnackbarAttributes(toast: Toast): void {
    const words = toast.text.split(' ').length;
    this.autohideTimeout = Math.max(MIN_TIMEOUT_MS, (words / AVG_WORDS_PER_SEC) * 1000);
    this.autohide = !toast.action;
  }
}

const toastStore = alt.createStore<ToastStoreState>(ToastStore as AltJS.StoreModel<any>, 'ToastStore');

export default toastStore;
