import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { SpinnerStore } from '../state/Spinner';

import CircularProgress from 'react-md/lib/Progress/CircularProgress';

interface IProps {
  spinnerStore?: SpinnerStore;
}

@inject('spinnerStore')
@observer
export default class Spinner extends React.Component<IProps> {

  spinnerStore: SpinnerStore;

  constructor(props: IProps) {
    super(props);

    this.spinnerStore = this.props.spinnerStore!;
  }

  render () {

    const { pageLoading, requestLoading } = this.spinnerStore;
    let refreshing = pageLoading || requestLoading || false;

    return (
      <div style={{ padding: 5 }}>
        {refreshing && <CircularProgress key="progress" id="contentLoadingProgress" />}
      </div>
    );
  }
}