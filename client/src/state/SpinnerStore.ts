import alt, { AbstractStoreModel } from './alt';

import spinnerActions from './SpinnerActions';

export interface SpinnerStoreState {
  pageLoading?: number;
  requestLoading?: number;
}

const openOriginal = XMLHttpRequest.prototype.open;
const sendOriginal = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method: string, url: string, async?: boolean, _?: string, __?: string) {
  spinnerActions.startRequestLoading.defer(null);
  openOriginal.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(data: any) {
  let _xhr: XMLHttpRequest = this;
  _xhr.onreadystatechange = (response) => {

    // readyState === 4: means the response is complete
    if (_xhr.readyState === 4) {
      spinnerActions.endRequestLoading.defer(null);
    }
  };
  sendOriginal.apply(_xhr, arguments);
};

class SpinnerStore extends AbstractStoreModel<SpinnerStoreState> implements SpinnerStoreState {

  pageLoading: number;
  requestLoading: number;

  constructor() {
    super();

    this.pageLoading = 0;
    this.requestLoading = 0;

    this.bindListeners({
      startPageLoading: spinnerActions.startPageLoading,
      endPageLoading: spinnerActions.endPageLoading,
      startRequestLoading: spinnerActions.startRequestLoading,
      endRequestLoading: spinnerActions.endRequestLoading,
    });
  }
  
  startPageLoading(): void {
    this.pageLoading++;
  }

  endPageLoading(): void {
    this.pageLoading--;
  }

  startRequestLoading(): void {
    this.requestLoading++;
  }

  endRequestLoading(): void {
    this.requestLoading--;
  }
}

const spinnerStore = alt.createStore<SpinnerStoreState>(SpinnerStore as any, 'SpinnerStore');

export default spinnerStore;
