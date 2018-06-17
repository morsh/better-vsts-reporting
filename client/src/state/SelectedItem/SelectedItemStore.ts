import { observable, action } from 'mobx';
import { Activity } from '../VSTS';

/**
 * This class is meant to hold an editable item that will be saved back to vsts
 */
export class SelectedItemStore {
  @observable selectedItem: Activity | null = null;
  @observable searchParentPath: string | null = null;

  @action selectItem(item: Activity) {
    this.selectedItem = item;
    this.searchParentPath = this.selectedItem.parentPath;
  }

  @action unselectItem() {
    this.selectedItem = null;
    this.searchParentPath = null;
  }

  @action searchParent(search: string) {
    this.searchParentPath = search;
  }
}

const selectedItemStore = new SelectedItemStore();
export { selectedItemStore };