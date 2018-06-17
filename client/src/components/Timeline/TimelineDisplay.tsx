import * as React from 'react';
import * as moment from 'moment';
import { inject, observer } from 'mobx-react';
import { Button, Chip, Tooltipped } from 'react-md';
import Timeline from 'react-calendar-timeline/lib';
import containerResizeDetector from 'react-calendar-timeline/lib/resize-detector/container';

import { VSTSStore, Activity } from '../../state/VSTS';
import { SelectedItemStore } from '../../state/SelectedItem';

interface State {
  start: number;
  end: number;
  filteredData?: any[];
  search?: string;
  searchServer?: boolean;
  askDelete?: boolean;
}

interface IProps {
  vstsStore?: VSTSStore;
  selectedItemStore?: SelectedItemStore;
}

@inject('vstsStore', 'selectedItemStore')
@observer
export default class TimelineDisplay extends React.Component<IProps, State> {

  vstsStore: VSTSStore;
  selectedItemStore: SelectedItemStore;

  private visibleActivitiesCount: number = 0;

  constructor(props: IProps) {
    super(props);

    this.vstsStore = props.vstsStore!;
    this.selectedItemStore = props.selectedItemStore!;

    this.state = {
      start: moment().startOf('month').valueOf(),
      end: moment().endOf('month').valueOf(),
      filteredData: [],
      search: '',
      searchServer: false,
      askDelete: false
    };
  }

  componentWillMount() {
    this.vstsStore.setTimeRange({
      from: moment().startOf('month'), 
      to: moment().endOf('month')
    });
    this.vstsStore.loadActivities();
    this.vstsStore.loadLists();
  }

  componentDidUpdate() {

    // A fix, since sometimes the activities are not displayed on the first rendering
    if (this.vstsStore.activities && this.vstsStore.visibleActivities.length !== this.visibleActivitiesCount) {
      this.visibleActivitiesCount = this.vstsStore.visibleActivities.length;
      this.vstsStore.setTimeRange({
        from: moment(this.state.start),
        to: moment(this.state.end)
      });
    }

  }

  render() {

    const { selectedItem } = this.selectedItemStore;
    let workPercentage = this.getWorkPercentage(this.state.start, this.state.end);
    
    let clientWidth = document.documentElement.clientWidth || 1024;
    
    let actions = (
      <div style={{ padding: 7 }}>
        <Button icon={true} primary={true} onClick={this.previousMonth}>keyboard_arrow_left</Button>
        <Button icon={true} primary={true} onClick={this.nextMonth}>keyboard_arrow_right</Button>
        <Button icon={true} primary={true} onClick={this.goToToday}>today</Button>
        <Button icon={true} primary={true} onClick={this.onCreateNewActivity}>add</Button>
        <Chip label={workPercentage + '%'} />
      </div>
    );

    let { visibleGroups, visibleActivities } = this.vstsStore;
    if (visibleGroups.length === 0) {
      visibleGroups = [{
        id: 1,
        type: '',
        title: 'No Activities Found',
        parentId: -1,
        path: ''
      }];
      visibleActivities = [{
        id: 1,
        group: 1,
        title: '',
        start_time: moment('2000-01-01'),
        end_time: moment('2000-01-01')
      }] as any;
    }

    return (
      <Timeline 
        sidebarWidth={clientWidth < 800 ? 160 : 300}
        headerLabelGroupHeight={clientWidth < 800 ? 80 : undefined}

        stackItems={true}
        canMove={true}
        canResize={true}
        resizeDetector={containerResizeDetector}

        sidebarContent={actions}
        groupRenderer={this.groupRenderer}
        itemRenderer={this.itemRenderer}
        groups={visibleGroups}
        items={visibleActivities}
        selected={selectedItem && [ selectedItem.id ] || []}

        dragSnap={60 * 60 * 1000 * 24}

        visibleTimeStart={this.state.start}
        visibleTimeEnd={this.state.end}

        onTimeChange={this.onTimeChange}
        onItemMove={this.onItemMove}
        onItemResize={this.onItemResize}
      />
    );
  }

  private onTimeChange = (start: number, end: number, updateScrollCanvas: (start: number, end: number) => void) => {
    this.vstsStore.setTimeRange({
      from: moment(start),
      to: moment(end)
    });
    updateScrollCanvas(start, end);
  }

  private getWorkPercentage = (from: number, to: number): number => {
    
    let workDays = 0;
    let checkDay = moment(from);
    while (checkDay.diff(to, 'days') < 0) {

      // decrease "days" only if it's a weekday.
      if (checkDay.isoWeekday() !== 6 && checkDay.isoWeekday() !== 7) {
        workDays++;
      }

      checkDay = checkDay.add(1, 'days');
    }

    let activityDays = 0;
    this.vstsStore.visibleActivities.forEach(act => {
      if ((act.start_time.isBetween(from, to) || act.start_time.isSame(from)) && 
          (act.end_time.isBetween(from, to) || act.end_time.isSame(to))) {
        activityDays += act.duration;
      }
    });

    return Math.round(activityDays / workDays * 100);
  }
  
  private previousMonth = () => {
    let start = moment(this.state.start).add(-1, 'month').valueOf();
    let end = moment(this.state.start).add(-1, 'month').endOf('month').valueOf();

    this.setState({ start, end });
    this.vstsStore.setTimeRange({ from: moment(start), to: moment(end) });
  }

  private nextMonth = () => {
    let start = moment(this.state.start).add(1, 'month').valueOf();
    let end = moment(this.state.start).add(1, 'month').endOf('month').valueOf();

    this.setState({ start, end });
    this.vstsStore.setTimeRange({ from: moment(start), to: moment(end) });
  }

  private goToToday = () => {
    let start = moment().startOf('month').valueOf();
    let end = moment().endOf('month').valueOf();

    this.setState({ start, end });
    this.vstsStore.setTimeRange({ from: moment(start), to: moment(end) });
  }

  private onCreateNewActivity = () => {
    this.vstsStore.createNewActivityItem(moment(this.state.start));
  }

  private groupRenderer = ({ group }: any) => {
    return (
      <div className="timeline-group">
        <div className="rct-sidebar-row" title={group.path}>
          {group.title}{group.type === 'Participant' ? ' [Participant]' : ''}
        </div>
      </div>
    );
  }

  private itemRenderer = ({ item }: { item: Activity }) => {

    let tooltip = (
      <span style={{ textAlign: 'left' }}>
        <div>{item.parentPath}</div>
        <div style={{ paddingLeft: 20 }}>[{item.id}] {item.name}</div>
      </span>
    );

    let position: 'right' | 'left' = item.start_time.date() < 15 ? 'right' : 'left';

    return (
      <Tooltipped
        label={tooltip}
        position={position}
      >
        <div 
          className="timeline-item"
          data-item-id={item.id}
          onClick={e => this.vstsStore.selectActivity(parseInt(e.currentTarget.getAttribute('data-item-id') || '', 0))}
          onTouchEnd={e => 
            this.vstsStore.selectActivity(parseInt(e.currentTarget.getAttribute('data-item-id') || '', 0))}
        >
          <span className="title">{item.title}</span>
        </div>
      </Tooltipped>
    );
  }

  private onItemMove = (itemId: number, dragTime: Date, newGroupOrder: number) => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    selectedItem.start_time = moment(dragTime);
    selectedItem.end_time = moment(dragTime).add(selectedItem.duration, 'days');
    selectedItem.name = this.vstsStore.visibleGroups[newGroupOrder].title;   
  }

  private onItemResize = (itemId: number, time: Date, edge: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    let start = selectedItem.start_time;
    let end = selectedItem.end_time;
    if (edge === 'left') {
      start = moment(time);
    } else {
      end = moment(time);
    }

    let duration = moment.duration(end.diff(start)).asDays();
    selectedItem.start_time = start;
    selectedItem.end_time = end;
    selectedItem.duration = duration;    
  }
}