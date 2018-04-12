import * as React from 'react';
import { Card, CardTitle, CardText } from 'react-md';

export default class ListActivities extends React.Component {
  render() {
    return (
      <div className="md-grid md-text-container">
        <h2 className="md-cell md-cell--12">
          List Activities
        </h2>
        <Card className="md-cell">
          <CardTitle title="Card 1" />
          <CardText>
            <p>Not implemented yet - supposed to contain a list of your activities</p>
          </CardText>
        </Card>
      </div>
    );
  }
}
