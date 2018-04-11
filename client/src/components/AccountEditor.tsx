import * as React from 'react';
import connectToStores from 'alt-utils/lib/connectToStores';

import { TextField, Button } from 'react-md';

import AccountStore, { AccountState } from '../state/AccountStore';
import { VSTSActions } from '../state';
import AccountActions from '../state/AccountActions';

class AccountEditor extends React.Component<AccountState> {

  static getStores(props: {}) {
    return [AccountStore];
  }

  static getPropsFromStores(props: {}) {
      return AccountStore.getState();
  }

  constructor(props: AccountState) {
    super(props);
  }

  render () {
    return (
      <div className="md-grid acct-edit">

        <TextField 
          id="account-text"
          className="md-cell md-cell--10" 
          value={this.props.accountName} 
          onChange={value => AccountActions.updateAccount(value)}
        />

        <Button 
          icon={true} 
          className="md-cell md-cell--1" 
          onClick={() => VSTSActions.loadActivities()}
        >refresh
        </Button>

      </div>
    );
  }
}

export default connectToStores(AccountEditor);