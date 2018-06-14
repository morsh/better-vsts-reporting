import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'mobx-react';
import App from './App';
import './index.css';
import * as WebFontLoader from 'webfontloader';
import { BrowserRouter as Router } from 'react-router-dom';
import { toastStore } from './state/Toasts';
import { spinnerStore } from './state/Spinner';
import { vstsStore } from './state/VSTS';
import { accountStore } from './state/Account';

WebFontLoader.load({
  google: {
    families: ['Roboto:300,400,500,700', 'Material Icons'],
  },
});

const stores = {
  toastStore,
  spinnerStore,
  vstsStore,
  accountStore
};

ReactDOM.render(
  <Provider {...stores}>
    <Router><App /></Router>
  </Provider>,
  document.getElementById('root') as HTMLElement
);
