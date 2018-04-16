import * as React from 'react';
import ActivitiesList from '../components/ActivitiesList';

export default class ListActivities extends React.Component {
  render() {
    return (
      <ActivitiesList {...({} as any)}/>
    );
  }
}
