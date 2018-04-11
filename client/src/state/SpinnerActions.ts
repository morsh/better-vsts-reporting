import alt, { AbstractActions } from './alt';

interface SpinnerActions {
  startPageLoading: AltJS.Action<any>;
  endPageLoading: AltJS.Action<any>;
  startRequestLoading: AltJS.Action<any>;
  endRequestLoading: AltJS.Action<any>;
}

class SpinnerActions extends AbstractActions /*implements ISpinnerActions*/ {
  constructor(altobj: AltJS.Alt) {
    super(altobj);

    this.generateActions(
      'startPageLoading',
      'endPageLoading',
      'startRequestLoading',
      'endRequestLoading'
    );
  }
}

const spinnerActions = alt.createActions<SpinnerActions>(SpinnerActions);

export default spinnerActions;
