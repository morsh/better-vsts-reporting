import alt, { AbstractActions } from './alt';
import { Toast } from './ToastStore';

interface ToastActions {
  showMessage(test: string): Toast;
  addToast(toast: Toast): Toast;
  removeToast(): void;
}

class ToastActions extends AbstractActions {
  constructor(altobj: AltJS.Alt) {
    super(altobj);

    this.generateActions(
      'addToast',
      'removeToast'
    );
  }

  addToast(toast: Toast): Toast {
    return toast;  
  }

  showMessage(text: string): Toast {
    return this.addToast({ text });
  }
}

const toastActions = alt.createActions<ToastActions>(ToastActions);

export default toastActions;
