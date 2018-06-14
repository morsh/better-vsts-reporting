import * as React from 'react';
import { observer, inject } from 'mobx-react';

import {
  DataTable,
  TableHeader,
  TableBody,
  TableRow,
  TableColumn as Column,
} from 'react-md';
import * as _ from 'lodash';

import './activities-list.css';

import { VSTSStore } from '../state/VSTS';

interface IState {
  ascending: boolean;
  field: string;
}

interface IProps {
  vstsStore?: VSTSStore;
}

@inject('vstsStore')
@observer
export default class ActivitiesList extends React.Component<IProps, IState> {

  vstsStore: VSTSStore;

  constructor(props: IProps) {
    super(props);

    this.vstsStore = props.vstsStore!;

    this.state = {
      ascending: false,
      field: 'name'
    };
  }

  componentWillMount() {
    this.vstsStore.loadActivities();
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
    const activities =  _.orderBy(_.values(this.vstsStore.activities).slice(), [field], [ascending ? 'asc' : 'desc']);
    
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