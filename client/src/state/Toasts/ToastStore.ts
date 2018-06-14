import { observable, action } from 'mobx';
import { IToast } from './Interfaces';

const MIN_TIMEOUT_MS: number = 3000;
const AVG_WORDS_PER_SEC: number = 2;

export class ToastStore {

  @observable toasts: IToast[] = [];
  @observable queued: Array<IToast> = new Array<IToast>();
  @observable autohideTimeout: number = MIN_TIMEOUT_MS;
  @observable autohide: boolean = true;
  
  @action addToast(toast: IToast) {

    // ignore duplicates
    if (this.toastExists(toast)) { return; }

    if (this.toasts.length === 0) {
      this.toasts = [toast];
    } else {
      const queued = new Array<IToast>();
      queued.push.apply(queued, this.queued);
      queued.push(toast);
      this.queued = queued;
    }

    this.updateSnackbarAttributes(toast);
  }

  @action showMessage(text: string) {
    this.addToast({ text });
  }

  @action removeToast(): void {
    if (this.queued.length > 0) {
      this.toasts = this.queued.splice(0, 1);
    } else if (this.toasts.length > 0) {
      const [, ...toasts] = this.toasts;
      this.toasts = toasts;
    }
  }

  private toastExists(toast: IToast): boolean {
    return this.toasts.findIndex(x => x.text === toast.text) > -1
        || this.queued.findIndex(x => x.text === toast.text) > -1;
  }

  private updateSnackbarAttributes(toast: IToast): void {
    const words = toast.text.split(' ').length;
    this.autohideTimeout = Math.max(MIN_TIMEOUT_MS, (words / AVG_WORDS_PER_SEC) * 1000);
    this.autohide = !toast.action;
  }
}

const toastStore = new ToastStore();
export { toastStore };