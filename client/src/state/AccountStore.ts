import alt, { AbstractStoreModel } from './alt';

import AccountActions from './AccountActions';

export interface AccountState {
  accountName?: string;
}

class AccountStore extends AbstractStoreModel<AccountState> implements AccountState {

  accountName: string;

  constructor() {
    super();

    this.accountName = '';

    this.bindListeners({
      updateAccount: [ AccountActions.updateAccount ]
    });
  }
  
  updateAccount(accountName: string) {
    this.accountName = accountName;
  }
}

export default alt.createStore<AccountStore>((AccountStore as AltJS.StoreModel<AccountStore>), 'AccountStore');