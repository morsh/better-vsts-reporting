import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { ToastStore } from '../state/Toasts';

import Snackbar from 'react-md/lib/Snackbars';

interface IProps {
  toastStore?: ToastStore;
}

@inject('toastStore')
@observer
export default class ToastBar extends React.Component<IProps> {

  toastStore: ToastStore;

  constructor(props: IProps) {
    super(props);

    this.toastStore = this.props.toastStore!;

    this.removeToast = this.removeToast.bind(this);
  }

  render() {
    const { toasts, autohide, autohideTimeout } = this.toastStore;
    return (
      <Snackbar
        toasts={toasts}
        autohide={autohide}
        autohideTimeout={autohideTimeout}
        onDismiss={this.removeToast}
        lastChild={true}
      />
    );
  }

  private removeToast() {
    this.toastStore.removeToast();
  }
}