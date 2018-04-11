import * as React from 'react';
import connectToStores from 'alt-utils/lib/connectToStores';

import CircularProgress from 'react-md/lib/Progress/CircularProgress';

import SpinnerStore, { SpinnerStoreState } from '../state/SpinnerStore';

class Spinner extends React.Component<SpinnerStoreState> {

  static getStores(props: {}) {
    return [SpinnerStore];
  }

  static getPropsFromStores(props: {}) {
      return SpinnerStore.getState();
  }

  render () {

    let refreshing = this.props.pageLoading || this.props.requestLoading || false;

    return (
      <div style={{ padding: 5 }}>
        {refreshing && <CircularProgress key="progress" id="contentLoadingProgress" />}
      </div>
    );
  }
}

export default connectToStores(Spinner);