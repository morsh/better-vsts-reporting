import { observable, action } from 'mobx';
import { bindXHRRequest } from './BindXHRRequests';

export interface ISpinnerStore {
  pageLoading?: number;
  requestLoading?: number;
}

export class SpinnerStore {

  @observable pageLoading: number = 0;
  @observable requestLoading: number = 0;
  
  @action startPageLoading(): void {
    this.pageLoading++;
  }

  @action endPageLoading(): void {
    this.pageLoading--;
  }

  @action startRequestLoading(): void {
    this.requestLoading++;
  }

  @action endRequestLoading(): void {
    this.requestLoading--;
  }
}

const spinnerStore = new SpinnerStore();
bindXHRRequest(spinnerStore);

export { spinnerStore };
