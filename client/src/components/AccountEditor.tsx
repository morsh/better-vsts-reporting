import * as React from 'react';
import { inject, observer } from 'mobx-react';

import { TextField, Button, FontIcon } from 'react-md';

import { AccountStore } from '../state/Account';
import { VSTSStore } from '../state/VSTS';

import './account.css';

interface IProps {
  accountStore?: AccountStore;
  vstsStore?: VSTSStore;
}

@inject('accountStore', 'vstsStore')
@observer
export default class AccountEditor extends React.Component<IProps> {

  accountStore: AccountStore;
  vstsStore: VSTSStore;

  constructor(props: IProps) {
    super(props);

    this.accountStore = props.accountStore!;
    this.vstsStore = props.vstsStore!;
  }

  render () {

    const { accountName } = this.accountStore;
    return (
      <div className="acct-edit">

        <TextField 
          placeholder="Account"
          id="account-text"
          className="acct-edit-userName" 
          leftIcon={<FontIcon>account_circle</FontIcon>}
          value={accountName} 
          onChange={value => this.accountStore.updateAccount(value + '')}
        />

        <Button 
          icon={true} 
          className="acct-edit-submit" 
          onClick={() => this.vstsStore.loadActivities()}
        >play_arrow
        </Button>

      </div>
    );
  }
}