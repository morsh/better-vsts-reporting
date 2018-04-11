import * as React from 'react';
import * as _ from 'lodash';
import { Card, Button, TextField, DatePicker, SelectField, CardTitle, CardText, Autocomplete, Switch } from 'react-md';
import { VSTSActions, VSTSStore, ActivitiesContainer, Activity } from '../state';
import { createNewActivity } from '../state/VSTSHelper';
import connectToStores from 'alt-utils/lib/connectToStores';
import Timeline from 'react-calendar-timeline/lib';
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
}

class Page1 extends React.Component<ActivitiesContainer, State> {

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

    this.onItemSelect = this.onItemSelect.bind(this);
    this.onItemDoubleClick = this.onItemDoubleClick.bind(this);
    this.getSelectedValue = this.getSelectedValue.bind(this);
    this.onItemSave = this.onItemSave.bind(this);
    this.onItemCancel = this.onItemCancel.bind(this);
    this.onItemMove = this.onItemMove.bind(this);
    this.onItemResize = this.onItemResize.bind(this);
    this.onItemDuplicate = this.onItemDuplicate.bind(this);

    this.onStartDateChange = this.onStartDateChange.bind(this);
    this.onDurationChange = this.onDurationChange.bind(this);
    this.onLinkChange = this.onLinkChange.bind(this);
    this.handleAutocomplete = this.handleAutocomplete.bind(this);
    this.onAreaChange = this.onAreaChange.bind(this);

    this.removeTag = this.removeTag.bind(this);
    this.addTag = this.addTag.bind(this);

    this.state = {
      start: moment('2018-09-01').startOf('month').valueOf(),
      end: moment('2018-09-01').endOf('month').valueOf(),
      filteredData: [],
      search: '',
      searchServer: false
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

  componentDidUpdate() {
    let { selectedItem } = this.state;
    if (selectedItem && selectedItem.item.updating) {
      let activity = _.find(this.props.visibleActivities, { id: selectedItem.id });
      if (activity && !activity.item.updating) {
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
    let activity = createNewActivity(VSTSStore.getState(), moment(this.state.start), this.props.lists.user.email);
    this.setState({ selectedItem: activity });
  }

  editItem(item?: Activity) {
    if (item) {
      alert(item.title);
    } else {
      alert('Nothing selected');
    }
  }

  onItemSelect(itemId: number): Activity | undefined {
    let selectedItem = this.props.visibleActivities.find(item => item.id === itemId);
    this.setState({ selectedItem, search: selectedItem && selectedItem.parentPath || '' });
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

    this.setState({ selectedItem: undefined });
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

    let newItem = _.cloneDeep(selectedItem);
    newItem.id = newItem.item.id = newItem.item.fields['System.Id'] = -1;
    this.setState({ selectedItem: newItem });
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

    let actions = (
      <div style={{ padding: 7 }}>
        <Button icon={true} primary={true} onClick={this.previousMonth}>keyboard_arrow_left</Button>
        <Button icon={true} primary={true} onClick={this.nextMonth}>keyboard_arrow_right</Button>
        <Button icon={true} primary={true} onClick={this.goToToday}>today</Button>
        <Button icon={true} primary={true} onClick={this.onCreateNewActivity}>add</Button>
      </div>
    );

    let { visibleGroups, visibleActivities } = this.props;
    if (visibleGroups.length === 0) {
      visibleGroups = [{
        id: 1,
        title: 'No Activities Found'
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
          groups={visibleGroups}
          items={visibleActivities}
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
              <CardTitle 
                title={this.state.selectedItem.id !== -1 ? 'Edit Item' : 'Create New Item'}
                subtitle={'[' + this.getSelectedValue('System.Id') + '] ' + this.getSelectedValue('System.Title')}
              />
              <CardText className="md-grid">
                <div className="md-cell md-cell--6">
                  <div className="md-grid">

                    <Switch
                      id="switch-search-server"
                      className="md-cell"
                      label="Seach VSTS"
                      name="server"
                      checked={this.state.searchServer}
                      onChange={checked => {
                        this.setState({ searchServer: checked });
                        VSTSActions.searchActivities(this.state.search || '');
                      }}
                    />

                    <Autocomplete
                      id="select-organization"
                      label="Organization / Project"
                      placeholder="..."
                      className="md-cell md-cell--12"
                      data={this.state.searchServer ? this.props.searchResults : this.props.projects}
                      filter={Autocomplete.caseInsensitiveFilter}
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
                      className="md-cell md-cell--3"
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
                      <Button raised={true} onClick={this.onItemSave}>Save</Button>
                      <Button raised={true} onClick={this.onItemCancel}>Cancel</Button>
                      <Button raised={true} onClick={this.onItemDuplicate}>Duplicate</Button>
                    </div>
                  </div>
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