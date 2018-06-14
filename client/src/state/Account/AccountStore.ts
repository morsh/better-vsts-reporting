
import { observable, action } from 'mobx';

export class AccountStore {

  @observable accountName: string = '';
  
  @action updateAccount(accountName: string) {
    this.accountName = accountName;
  }
}

const accountStore = new AccountStore();
export { accountStore };