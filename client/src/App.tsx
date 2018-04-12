import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import * as H from 'history';
import { NavigationDrawer } from 'react-md';
import NavLink from './components/NavLink';
import Spinner from './components/Spinner';
import AccountEditor from './components/AccountEditor';

import './App.css';

import Timeline from './pages/Timeline';
import ListActivities from './pages/ListActivities';

interface NavSettings {
  exact?: boolean;
  label: string;
  to: string;
  icon: string;
  component: React.ComponentClass;
}

const DEFAULT_TITLE = 'Welcome';
const navItems: NavSettings[] = [
  {
    exact: true,
    label: 'Timeline',
    to: '/',
    icon: 'timeline',
    component: Timeline
  },
  {
    label: 'List Activities',
    to: '/list',
    icon: 'list',
    component: ListActivities
  }
];

class App extends React.Component {

  getLocationTitle(location: H.Location): string {
    let currentPage = navItems.find(item => item.to === location.pathname);
    return currentPage && currentPage.label || DEFAULT_TITLE;
  }

  render() {

    return (
      <Route
        render={({ location }) => (
          <NavigationDrawer
            toolbarTitle={this.getLocationTitle(location)}
            toolbarChildren={<Spinner />}
            drawerHeaderChildren={<AccountEditor />}
            navItems={navItems.map(props => <NavLink {...props} key={props.to} />)}
          >
            <Switch key={location.key}>
              {
                navItems.map(props => (
                  <Route
                    key={props.to}
                    exact={props.exact}
                    path={props.to}
                    location={location}
                    component={props.component}
                  />
                ))
              }
            </Switch>
          </NavigationDrawer>
        )}
      />
    );
  }
}

export default App;
