import { SpinnerStore } from './SpinnerStore';

export function bindXHRRequest(spinnerStore: SpinnerStore) {
  const openOriginal = XMLHttpRequest.prototype.open;
  const sendOriginal = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string, async?: boolean, _?: string, __?: string) {
    spinnerStore.startRequestLoading();
    openOriginal.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(data: any) {
    let _xhr: XMLHttpRequest = this;
    _xhr.onreadystatechange = (response) => {

      // readyState === 4: means the response is complete
      if (_xhr.readyState === 4) {
        spinnerStore.endRequestLoading();
      }
    };
    sendOriginal.apply(_xhr, arguments);
  };
}