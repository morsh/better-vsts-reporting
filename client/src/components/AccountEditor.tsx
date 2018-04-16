import * as React from 'react';
import connectToStores from 'alt-utils/lib/connectToStores';

import { TextField, Button, FontIcon } from 'react-md';

import AccountStore, { AccountState } from '../state/AccountStore';
import { VSTSActions } from '../state';
import AccountActions from '../state/AccountActions';

import './account.css';

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
      <div className="acct-edit">

        <TextField 
          placeholder="Account"
          id="account-text"
          className="acct-edit-userName" 
          leftIcon={<FontIcon>account_circle</FontIcon>}
          value={this.props.accountName} 
          onChange={value => AccountActions.updateAccount(value)}
        />

        <Button 
          icon={true} 
          className="acct-edit-submit" 
          onClick={() => VSTSActions.loadActivities()}
        >play_arrow
        </Button>

      </div>
    );
  }
}

export default connectToStores(AccountEditor);