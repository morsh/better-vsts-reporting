import alt, { AbstractActions } from './alt';

interface AccountActions {
  updateAccount: AltJS.Action<any>;
}

class AccountActions extends AbstractActions /*implements ISpinnerActions*/ {
  constructor(altobj: AltJS.Alt) {
    super(altobj);

    this.generateActions(
      'updateAccount'
    );
  }
}

const accountActions = alt.createActions<AccountActions>(AccountActions);

export default accountActions;
