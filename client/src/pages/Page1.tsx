import * as React from 'react';
import * as _ from 'lodash';
import { Card, Button, TextField, DatePicker, SelectField, CardTitle, CardText } from 'react-md';
import { VSTSActions, VSTSStore, ActivitiesContainer, Activity } from '../state';
import connectToStores from 'alt-utils/lib/connectToStores';
import Timeline from 'react-calendar-timeline/lib';
import containerResizeDetector from 'react-calendar-timeline/lib/resize-detector/container';
import * as moment from 'moment';

import './timeline.css';

const NUMBER_ITEMS = _.times(31, n => n + 1);

interface State {
  start: number;
  end: number;
  selectedItem?: Activity;
}

class Page1 extends React.Component<ActivitiesContainer, State> {

  static getStores(props: {}) {
    return [VSTSStore];
  }

  static getPropsFromStores(props: {}) {
      return VSTSStore.getState();
  }

  constructor(props: ActivitiesContainer) {
    super(props);

    this.previousMonth = this.previousMonth.bind(this);
    this.nextMonth = this.nextMonth.bind(this);
    this.onItemSelect = this.onItemSelect.bind(this);
    this.onItemDoubleClick = this.onItemDoubleClick.bind(this);
    this.getSelectedValue = this.getSelectedValue.bind(this);
    this.onItemSave = this.onItemSave.bind(this);
    this.onItemCancel = this.onItemCancel.bind(this);
    this.onItemMove = this.onItemMove.bind(this);
    this.onItemResize = this.onItemResize.bind(this);
    this.onItemDuplicate = this.onItemDuplicate.bind(this);

    this.state = {
      start: moment('2018-09-01').startOf('month').valueOf(),
      end: moment('2018-09-01').endOf('month').valueOf()
    };
  }

  componentWillMount() {
    VSTSActions.setTimeRange({
      from: moment().startOf('month'), 
      to: moment().endOf('month')
    });
    VSTSActions.loadActivities();
  }

  componentWillUpdate() {
    let { selectedItem } = this.state;
    if (selectedItem) {
      let activity = _.find(this.props.activities, { id: selectedItem.id });
      if (activity && (
            activity.item.rev !== selectedItem.item.rev || 
            (activity.item.rev === 1 && selectedItem.id === -1))) {
        this.setState({ selectedItem: undefined });
      }
    }
  }

  onTimeChange(timeStart: number, timeEnd: number, updateScrollCanvas: (start: number, end: number) => void) {
    VSTSActions.setTimeRange({
      from: moment(timeStart),
      to: moment(timeEnd)
    });
    updateScrollCanvas(timeStart, timeEnd);
  }

  previousMonth() {
    this.setState({
      start: moment(this.state.start).add(-1, 'month').valueOf(),
      end:  moment(this.state.start).add(-1, 'month').endOf('month').valueOf()
    });
    VSTSActions.setTimeRange({
      from: moment(this.state.start).add(-1, 'month'),
      to: moment(this.state.start).add(-1, 'month').endOf('month')
    });
  }

  nextMonth() {
    this.setState({
      start: moment(this.state.start).add(1, 'month').valueOf(),
      end: moment(this.state.start).add(1, 'month').endOf('month').valueOf()
    });
    VSTSActions.setTimeRange({
      from: moment(this.state.start).add(1, 'month'),
      to:  moment(this.state.start).add(1, 'month').endOf('month')
    });
  }

  editItem(item?: Activity) {
    if (item) {
      alert(item.title);
    } else {
      alert('Nothing selected');
    }
  }

  onItemSelect(itemId: number): Activity | undefined {
    let selectedItem = this.props.activities.find(item => item.id === itemId);
    this.setState({ selectedItem });
    return selectedItem;
  }

  onItemDoubleClick(itemId: number) {
    let item = this.onItemSelect(itemId);
    this.editItem(item);
  }

  groupRenderer({ group }: any) {
    return (
      <div className="custom-group">
        <div className="rct-sidebar-row" title={group.title}>{group.title}</div>
      </div>
    );
  }

  getSelectedValue(fieldName: string): any {
    return this.state.selectedItem && this.state.selectedItem.item.fields[fieldName] || null;
  }

  onFieldChange(fieldName: string, newValue: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem.item.fields[fieldName] = newValue;
      this.setState({ selectedItem });
    }
  }

  onDateFieldChange(fieldName: string, newValue: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem.item.fields[fieldName] = moment(newValue, 'MM/DD/YYYY').toISOString();
      this.setState({ selectedItem });
    }
  }

  onItemSave() {
    if (!this.state.selectedItem) { return; }

    if (this.state.selectedItem.id === -1) {
      VSTSActions.createActivity(this.state.selectedItem);
    } else {
      VSTSActions.updateActivity(this.state.selectedItem);
    }
  }

  onItemCancel() {
    if (!this.state.selectedItem) { return; }

    this.setState({ selectedItem: undefined });
  }

  onItemMove(itemId: number, dragTime: Date, newGroupOrder: number) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    selectedItem.item.fields['CSEngineering.ActivityStartDate'] = moment(dragTime).toISOString();
    selectedItem.item.fields['System.Title'] = this.props.groups[newGroupOrder].title;
    VSTSActions.updateActivity(selectedItem);    
  }

  onItemResize(itemId: number, time: Date, edge: string) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    let start = selectedItem.start_time;
    let end = selectedItem.end_time;
    if (edge === 'left') {
      start = moment(time);
    } else {
      end = moment(time);
    }

    let duration = moment.duration(end.diff(start)).asDays();
    selectedItem.item.fields['CSEngineering.ActivityStartDate'] = start.toISOString();
    selectedItem.item.fields['CSEngineering.ActivityDuration'] = duration;
    VSTSActions.updateActivity(selectedItem);    
  }

  onItemDuplicate() {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    let newItem = _.cloneDeep(selectedItem);
    newItem.id = newItem.item.id = newItem.item.fields['System.Id'] = -1;
    this.setState({ selectedItem: newItem });
  }

  render() {

    let actions = (
      <div style={{ padding: 7 }}>
        <Button icon={true} primary={true} onClick={this.previousMonth}>keyboard_arrow_left</Button>
        <Button icon={true} primary={true} onClick={this.nextMonth}>keyboard_arrow_right</Button>
      </div>
    );

    let { groups, activities } = this.props;
    if (groups.length === 0) {
      groups = [{
        id: 1,
        title: 'No Activities Found'
      }];
      activities = [{
        id: 1,
        group: 1,
        title: '',
        start_time: moment('2000-01-01'),
        end_time: moment('2000-01-01')
      }] as any;
    }

    return (
      <div>
        <Timeline 
          sidebarWidth={300}

          stackItems={true}
          canMove={true}
          canResize={true}
          resizeDetector={containerResizeDetector}

          sidebarContent={actions}
          groupRenderer={this.groupRenderer}
          groups={groups}
          items={activities}
          selected={this.state.selectedItem && [ this.state.selectedItem.id ] || []}

          dragSnap={60 * 60 * 1000 * 24}

          visibleTimeStart={this.state.start}
          visibleTimeEnd={this.state.end}

          onTimeChange={this.onTimeChange}
          onItemClick={this.onItemSelect}
          onItemMove={this.onItemMove}
          onItemResize={this.onItemResize}
        />

        {this.state.selectedItem && (
          <div className="md-grid">
            <Card className="md-cell--12">
              {this.state.selectedItem.id !== -1 && 
                <CardTitle title="Edit Item" subtitle={this.getSelectedValue('System.Title')} />}
              {this.state.selectedItem.id === -1 && 
                <CardTitle title="Create New Item" subtitle={this.getSelectedValue('System.Title')} />}
              <CardText>
                <TextField
                  id="text-field-1"
                  label="Title"
                  lineDirection="center"
                  placeholder="Item title"
                  className="md-cell md-cell--bottom"
                  value={this.getSelectedValue('System.Title')}
                  onChange={this.onFieldChange.bind(this, 'System.Title')}
                />

                {this.state.selectedItem.type === 'Activity' && (
                  <div className="md-grid">
                    <DatePicker
                      id="inline-date-picker-auto"
                      label="Select a date"
                      className="md-cell md-cell--1"
                      inline={true}
                      fullWidth={false}
                      autoOk={true}
                      value={moment(this.getSelectedValue('CSEngineering.ActivityStartDate')).format('YYYY-MM-DD')}
                      onChange={this.onDateFieldChange.bind(this, 'CSEngineering.ActivityStartDate')}
                    />

                    <SelectField
                      id="select-field-1"
                      label="Numbers"
                      placeholder="Placeholder"
                      className="md-cell md-cell--1"
                      menuItems={NUMBER_ITEMS}
                      simplifiedMenu={true}
                      value={this.getSelectedValue('CSEngineering.ActivityDuration')}
                      onChange={this.onFieldChange.bind(this, 'CSEngineering.ActivityDuration')}
                    />                
                  </div>
                )}

                <div>
                  <Button raised={true} onClick={this.onItemSave}>Save</Button>
                  <Button raised={true} onClick={this.onItemCancel}>Cancel</Button>
                  <Button raised={true} onClick={this.onItemDuplicate}>Duplicate</Button>
                </div>
              </CardText>
            </Card>
          </div>
        )}
              
      </div>
    );
  }
}

export default connectToStores(Page1);