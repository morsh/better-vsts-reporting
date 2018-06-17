import * as React from 'react';

import TimelineDisplay from '../components/Timeline/TimelineDisplay';
import ActivityEdit from '../components/Timeline/ActivityEdit';

import './timeline.css';

export default class Timeline extends React.Component<any> {

  render() {

    return (
      <div>
        <TimelineDisplay />
        <ActivityEdit />
      </div>
    );
  }
}