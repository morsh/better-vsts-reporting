import * as React from 'react';
import connectToStores from 'alt-utils/lib/connectToStores';

import {
  DataTable,
  TableHeader,
  TableBody,
  TableRow,
  TableColumn as Column,
} from 'react-md';
import * as _ from 'lodash';

import './activities-list.css';

import VSTSStore, { ActivitiesContainer } from '../state/VSTSStore';
import VSTSActions from 'src/state/VSTSActions';

interface State {
  ascending: boolean;
  field: string;
}

class ActivitiesList extends React.Component<ActivitiesContainer, State> {

  static getStores(props: {}) {
    return [VSTSStore];
  }

  static getPropsFromStores(props: {}) {
      return VSTSStore.getState();
  }

  constructor(props: ActivitiesContainer) {
    super(props);

    this.state = {
      ascending: false,
      field: 'name'
    };
  }

  componentWillMount() {
    VSTSActions.loadActivities();
  }

  sort = (field) => {
    let ascending = this.state.ascending;
    if (field === this.state.field) {
      ascending = !ascending;
    }

    this.setState({ ascending, field });
  }

  sorted = (field: string): boolean | undefined => {
    if (field && field === this.state.field) {
      return this.state.ascending;
    }
    return undefined;
  }

  render () {

    const { field, ascending } = this.state;
    const activities =  _.orderBy(_.values(this.props.activities).slice(), [field], [ascending ? 'asc' : 'desc']);
    
    const rows = activities.map(({ id, name, type, start_time, end_time, parentPath }) => (
      <TableRow key={id} selectable={false}>
        <Column numeric={true}>{id}</Column>
        <Column>{name}</Column>
        <Column>{type}</Column>
        <Column>{start_time.format('YYYY-MM-DD')}</Column>
        <Column>{end_time.format('YYYY-MM-DD')}</Column>
        <Column>{parentPath}</Column>
      </TableRow>
    ));

    return (
      <DataTable baseId="activities" className="activities-list">
        <TableHeader>
          <TableRow selectable={false}>
            <Column sorted={this.sorted('id')} onClick={this.sort.bind(this, 'id')} numeric={true}>Id</Column>
            <Column sorted={this.sorted('name')} onClick={this.sort.bind(this, 'name')}>Title</Column>
            <Column sorted={this.sorted('type')} onClick={this.sort.bind(this, 'type')}>Type</Column>
            <Column sorted={this.sorted('start_time')} onClick={this.sort.bind(this, 'start_time')}>Start</Column>
            <Column sorted={this.sorted('end_time')} onClick={this.sort.bind(this, 'end_time')}>End</Column>
            <Column sorted={this.sorted('parentId')} onClick={this.sort.bind(this, 'parentId')}>Parent</Column>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows}
        </TableBody>
      </DataTable>
    );
  }
}

export default connectToStores(ActivitiesList);