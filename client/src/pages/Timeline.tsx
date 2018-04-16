import * as React from 'react';
import * as _ from 'lodash';
import { 
  Card, 
  Button, 
  TextField, 
  DatePicker, 
  SelectField, 
  CardTitle, 
  Autocomplete, 
  Chip,
  SelectionControl
} from 'react-md';
import { VSTSActions, VSTSStore, ActivitiesContainer, Activity } from '../state';
import connectToStores from 'alt-utils/lib/connectToStores';
import CalendarTimeline from 'react-calendar-timeline/lib';
import containerResizeDetector from 'react-calendar-timeline/lib/resize-detector/container';
import * as moment from 'moment';

import './timeline.css';
import TagChip from '../components/TagChip';

const NUMBER_ITEMS = _.times(31, n => n + 1);

interface State {
  start: number;
  end: number;
  selectedItem?: Activity;
  filteredData?: any[];
  search?: string;
  searchServer?: boolean;
  askDelete?: boolean;
}

class Timeline extends React.Component<ActivitiesContainer, State> {

  private autocompleteTimeoutId: NodeJS.Timer | null = null;  

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
    this.goToToday = this.goToToday.bind(this);
    this.onCreateNewActivity = this.onCreateNewActivity.bind(this);

    this.getSelectedValue = this.getSelectedValue.bind(this);
    this.onItemSave = this.onItemSave.bind(this);
    this.onItemCancel = this.onItemCancel.bind(this);
    this.onItemMove = this.onItemMove.bind(this);
    this.onItemResize = this.onItemResize.bind(this);
    this.onItemDuplicate = this.onItemDuplicate.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onSureDelete = this.onSureDelete.bind(this);
    this.onCancelDelete = this.onCancelDelete.bind(this);

    this.onStartDateChange = this.onStartDateChange.bind(this);
    this.onDurationChange = this.onDurationChange.bind(this);
    this.onLinkChange = this.onLinkChange.bind(this);
    this.handleAutocomplete = this.handleAutocomplete.bind(this);
    this.onAreaChange = this.onAreaChange.bind(this);

    this.removeTag = this.removeTag.bind(this);
    this.addTag = this.addTag.bind(this);

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
    VSTSActions.setTimeRange({
      from: moment().startOf('month'), 
      to: moment().endOf('month')
    });
    VSTSActions.loadActivities();
    VSTSActions.loadLists();
  }

  private visibleActivitiesCount = -1;
  componentDidUpdate() {
    let { selectedItem } = this.state;
    if (selectedItem && selectedItem.item.updating) {
      let activity = _.find(this.props.visibleActivities, { id: selectedItem.id });
      if (activity && !activity.item.updating) {
        this.setState({ selectedItem: undefined });
      }
    }

    // A fix, since sometimes the activities are not displayed on the first rendering
    if (this.props.activities && this.props.visibleActivities.length !== this.visibleActivitiesCount) {
      this.visibleActivitiesCount = this.props.visibleActivities.length;
      setTimeout(() => {
        VSTSActions.setTimeRange({
          from: moment(this.state.start),
          to: moment(this.state.end)
        });
      }, 1000);
    }

    // Making sure the right activity is displayed after update
    // Only need to update the state to display the current time
    if (this.props.selectedActivity) {
      let activity = this.props.selectedActivity;
    
      if (!this.state.selectedItem || activity.id !== this.state.selectedItem.id) {

        let start = moment(activity.start_time).startOf('month').valueOf();
        let end = moment(activity.start_time).endOf('month').valueOf();
        if (this.state.selectedItem && this.state.selectedItem.id === -1) {
          
          // When a new item was created
          this.setState({ start, end, selectedItem: undefined, search: '', askDelete: false });
        } else {

          // When a new activity was selected
          this.setState({ start, end, selectedItem: activity, search: activity.parentPath, askDelete: false });
        }
      }
    } else if (this.state.selectedItem) {
      this.setState({  selectedItem: undefined, search: '', askDelete: false });
    }
  }

  onTimeChange(timeStart: number, timeEnd: number, updateScrollCanvas: (start: number, end: number) => void) {
    VSTSActions.setTimeRange({
      from: moment(timeStart),
      to: moment(timeEnd)
    });
    updateScrollCanvas(timeStart, timeEnd);
  }

  getWorkPercentage(from: number, to: number): number {
    
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
    this.props.visibleActivities.forEach(act => {
      if ((act.start_time.isBetween(from, to) || act.start_time.isSame(from)) && 
          (act.end_time.isBetween(from, to) || act.end_time.isSame(to))) {
        activityDays += act.duration;
      }
    });

    return Math.round(activityDays / workDays * 100);
  }
  
  previousMonth() {
    let start = moment(this.state.start).add(-1, 'month').valueOf();
    let end = moment(this.state.start).add(-1, 'month').endOf('month').valueOf();

    this.setState({ start, end });
    VSTSActions.setTimeRange({ from: moment(start), to: moment(end) });
  }

  nextMonth() {
    let start = moment(this.state.start).add(1, 'month').valueOf();
    let end = moment(this.state.start).add(1, 'month').endOf('month').valueOf();

    this.setState({ start, end });
    VSTSActions.setTimeRange({ from: moment(start), to: moment(end) });
  }

  goToToday() {
    let start = moment().startOf('month').valueOf();
    let end = moment().endOf('month').valueOf();

    this.setState({ start, end });
    VSTSActions.setTimeRange({ from: moment(start), to: moment(end) });
  }

  onCreateNewActivity() {
    VSTSActions.createNewActivityItem(moment(this.state.start));
  }

  groupRenderer({ group }: any) {
    return (
      <div className="custom-group">
        <div className="rct-sidebar-row" title={group.path}>{group.title}</div>
      </div>
    );
  }

  getSelectedValue(fieldName: string, hyperlink: boolean = false): JSX.Element {
    let value = this.state.selectedItem && this.state.selectedItem.item.fields[fieldName] || null;
    if (hyperlink && this.state.selectedItem && this.state.selectedItem.id > 0) {
      return (
        <a href={"https://cseng.visualstudio.com/CSEng/_queries?id=" + this.state.selectedItem.item.id}>{value}</a>
      );
    }
    return value;
  }

  onTextChange(prop: string, value: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem[prop] = value;
      this.setState({ selectedItem });
    }
  }

  onStartDateChange(value: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem.start_time = moment(value, 'MM/DD/YYYY');
      selectedItem.end_time = moment(selectedItem.start_time).add(selectedItem.duration, 'days');
      this.setState({ selectedItem });
    }
  }

  onDurationChange(value: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem.duration = parseInt(value, 0);
      selectedItem.end_time = moment(selectedItem.start_time).add(selectedItem.duration, 'days');
      this.setState({ selectedItem });
    }
  }

  onAreaChange(value: string) {
    let { selectedItem } = this.state;
    if (selectedItem) {
      selectedItem.area_path = value;
      this.setState({ selectedItem });
    }
  }

  onItemSave() {
    if (!this.state.selectedItem) { return; }

    this.state.selectedItem.item.updating = true;
    if (this.state.selectedItem.id === -1) {
      VSTSActions.createActivity(this.state.selectedItem);
    } else {
      VSTSActions.updateActivity(this.state.selectedItem);
    }
  }

  onItemCancel() {
    if (!this.state.selectedItem) { return; }

    VSTSActions.unselectActivity();
  }

  onItemMove(itemId: number, dragTime: Date, newGroupOrder: number) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    selectedItem.start_time = moment(dragTime);
    selectedItem.name = this.props.visibleGroups[newGroupOrder].title;

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
    selectedItem.start_time = start;
    selectedItem.end_time = end;
    selectedItem.duration = duration;

    VSTSActions.updateActivity(selectedItem);    
  }

  onItemDuplicate() {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    VSTSActions.duplicateActivity(selectedItem.id);
  }

  onDelete() {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    this.setState({ askDelete: true });
  }

  onSureDelete() {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    selectedItem.name = 'Please Delete';
    VSTSActions.updateActivity(selectedItem);
    this.setState({ askDelete: false });
  }

  onCancelDelete() {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    this.setState({ askDelete: false });
  }

  onLinkChange(value: any) {
    if (this.state.searchServer) {
      this.setState({ search: value || ''});

      if (this.autocompleteTimeoutId) { clearTimeout(this.autocompleteTimeoutId); }
      this.autocompleteTimeoutId = 
        setTimeout(
          () => {
            this.autocompleteTimeoutId = null;
            VSTSActions.searchActivities(value || '');
          }, 
          200
        );
    } else {
      this.setState({ search: value || ''});
    }
  }

  handleAutocomplete(value: string, index: number, matches: any[]) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    selectedItem.parentPath = value;
    selectedItem.parentId = parseInt(value.substr(1, value.indexOf(']')), 0);
    this.setState({ search: value, selectedItem });
  }

  removeTag(tag: string) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }
    if (!selectedItem.tags) { return; }
    
    tag = tag.trim();
    selectedItem.tags = selectedItem.tags.split(';').map(t => t.trim()).filter(t => t !== tag).join(';');

    this.setState({ selectedItem });
  }

  addTag(tag: string) {
    let { selectedItem } = this.state;
    if (!selectedItem) { return; }

    if (!selectedItem.tags) { selectedItem.tags = ''; }

    selectedItem.tags += ';' + tag;
    this.setState({ selectedItem });
  }

  render() {

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

    let { visibleGroups, visibleActivities } = this.props;
    if (visibleGroups.length === 0) {
      visibleGroups = [{
        id: 1,
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

    let tagList = (
      this.state.selectedItem && 
      this.state.selectedItem.tags &&
      this.state.selectedItem.tags.split(';').map(tag => tag.trim())
    ) || [];
    tagList = tagList.filter(tag => tag);
    const chips = tagList.map(tag => <TagChip key={tag} tag={tag} onClick={this.removeTag} />);

    let isMyActivity = false;
    if (this.state.selectedItem) {
      let assignedTo = this.state.selectedItem.assigned_to || '';
      let atOpen = assignedTo.indexOf('<');
      let atClose = assignedTo.indexOf('>');
      if (atOpen >= 0 && atClose > atOpen) {
        assignedTo = assignedTo.substr(atOpen + 1, atClose - atOpen - 1);
      }
      isMyActivity = assignedTo === this.props.lists.user.email || false;
    }
    
    return (
      <div>
        <CalendarTimeline 
          sidebarWidth={clientWidth < 800 ? 160 : 300}
          headerLabelGroupHeight={clientWidth < 800 ? 80 : undefined}

          stackItems={true}
          canMove={true}
          canResize={true}
          resizeDetector={containerResizeDetector}

          sidebarContent={actions}
          groupRenderer={this.groupRenderer}
          groups={visibleGroups}
          items={visibleActivities}
          selected={this.state.selectedItem && [ this.state.selectedItem.id ] || []}

          dragSnap={60 * 60 * 1000 * 24}

          visibleTimeStart={this.state.start}
          visibleTimeEnd={this.state.end}

          itemTouchSendsClick={true}
          onTimeChange={this.onTimeChange}
          onItemSelect={VSTSActions.selectActivity}
          onItemMove={this.onItemMove}
          onItemResize={this.onItemResize}
        />

        {this.state.selectedItem && (
          <div className="md-grid">
            <Card className="md-cell--12" >
              <CardTitle 
                title={this.state.selectedItem.id !== -1 ? 'Edit Item' : 'Create New Item'}
                subtitle={<p>[{this.getSelectedValue('System.Id', true)}] {this.getSelectedValue('System.Title')}</p>}
              />
              <div className="md-grid" style={{ maxWidth: 600, marginLeft: 0 }}>

                <SelectionControl
                  id="switch-search-server"
                  type="switch"
                  className="md-cell md-cell--2 md-cell--bottom"
                  label="Full"
                  labelBefore={true}
                  name="server"
                  checked={this.state.searchServer}
                  onChange={(checked: boolean) => {
                    this.setState({ searchServer: checked });
                    VSTSActions.searchActivities(this.state.search || '');
                  }}
                />

                <Autocomplete
                  id="select-organization"
                  label="Organization / Project"
                  placeholder="..."
                  className="md-cell md-cell--10 project-type"
                  data={this.state.searchServer ? this.props.searchResults as any : this.props.projects as any}
                  dataLabel="value"
                  filter={Autocomplete.caseInsensitiveFilter}
                  autocompleteWithLabel={true}
                  inlineSuggestionStyle={{ background: 'red' }}
                  value={this.state.search}
                  onChange={this.onLinkChange}
                  onAutocomplete={this.handleAutocomplete}
                />

                <TextField
                  id="activity-title"
                  label="Title"
                  lineDirection="center"
                  placeholder="Acivity title"
                  className="md-cell md-cell--6"
                  value={this.state.selectedItem.name}
                  onChange={(this.onTextChange.bind(this, 'name'))}
                />

                {this.state.selectedItem.type === 'Activity' && (
                    <DatePicker
                      id="inline-date-picker-auto"
                      label="Select a date"
                      className="md-cell md-cell--3"
                      inline={true}
                      fullWidth={false}
                      autoOk={true}
                      value={this.state.selectedItem.start_time.format('YYYY-MM-DD')}
                      onChange={this.onStartDateChange}
                    />
                )}

                {this.state.selectedItem.type === 'Activity' && (
                    <SelectField
                      id="select-field-1"
                      label="Numbers"
                      placeholder="Placeholder"
                      className="md-cell md-cell--3"
                      menuItems={NUMBER_ITEMS}
                      simplifiedMenu={true}
                      value={this.state.selectedItem.duration}
                      onChange={this.onDurationChange}
                    />                
                )}

                <Autocomplete
                  id="tags-autocomplete"
                  label="Select tags"
                  className="md-cell md-cell--6"
                  data={this.props.lists.tags}
                  onAutocomplete={this.addTag}
                  clearOnAutocomplete={true}
                />

                <SelectField
                  id="select-field-4"
                  label="Area"
                  className="md-cell md-cell--3"
                  value={this.state.selectedItem.area_path}
                  onChange={this.onAreaChange}
                  menuItems={this.props.lists.areas}
                />

                <div className="md-cell md-cell--12">
                  {chips}
                </div>

                <div className="md-cell md-cell--12">
                  <Button raised={true} primary={true} onClick={this.onItemSave} disabled={!isMyActivity}>Save</Button>
                  <Button raised={true} onClick={this.onItemCancel}>Cancel</Button>

                  {!this.state.askDelete &&
                    <Button raised={true} onClick={this.onItemDuplicate}>Duplicate</Button>}

                  {!this.state.askDelete &&
                    <Button raised={true} onClick={this.onDelete} disabled={!isMyActivity}>Delete</Button>}
                  {this.state.askDelete &&
                    <Button raised={true} onClick={this.onSureDelete} disabled={!isMyActivity}>I'm sure I want to delete</Button>}
                  {this.state.askDelete &&
                    <Button raised={true} onClick={this.onCancelDelete} disabled={!isMyActivity}>Don't delete</Button>}
                </div>
              </div>
            </Card>
          </div>
        )}
              
      </div>
    );
  }
}

export default connectToStores(Timeline);