import * as React from 'react';
import * as moment from 'moment';
import * as _ from 'lodash';
import { inject, observer } from 'mobx-react';
import { Card, Button, TextField, DatePicker, SelectField, Autocomplete, SelectionControl } from 'react-md';

import { VSTSStore, Activity } from '../../state/VSTS';
import { SelectedItemStore } from '../../state/SelectedItem';
import TagChip from '../TagChip';

interface State {
  start: number;
  end: number;
  filteredData?: any[];
  searchServer?: boolean;
  askDelete?: boolean;
}

interface IProps {
  vstsStore?: VSTSStore;
  selectedItemStore?: SelectedItemStore;
}

const NUMBER_ITEMS = _.times(31, n => n + 1);

@inject('selectedItemStore', 'vstsStore')
@observer
export default class ActivityEdit extends React.Component<IProps, State> {

  vstsStore: VSTSStore;
  selectedItemStore: SelectedItemStore;

  private autocompleteTimeoutId: NodeJS.Timer | null = null;  
  // private visibleActivitiesCount: number = -1;

  constructor(props: IProps) {
    super(props);

    this.vstsStore = props.vstsStore!;
    this.selectedItemStore = props.selectedItemStore!;

    this.state = {
      start: moment().startOf('month').valueOf(),
      end: moment().endOf('month').valueOf(),
      filteredData: [],
      searchServer: false,
      askDelete: false
    };
  }

  render() {

    const { selectedItem } = this.selectedItemStore;
    const { lists } = this.vstsStore;

    if (!selectedItem) {
      return null;
    }

    let tagList = (selectedItem.tags && selectedItem.tags.split(';').map(tag => tag.trim())) || [];
    tagList = tagList.filter(tag => tag);
    const chips = tagList.map(tag => <TagChip key={tag} tag={tag} onClick={this.removeTag} />);

    let assignedTo = selectedItem.assigned_to || '';
    let atOpen = assignedTo.indexOf('<');
    let atClose = assignedTo.indexOf('>');
    if (atOpen >= 0 && atClose > atOpen) {
      assignedTo = assignedTo.substr(atOpen + 1, atClose - atOpen - 1);
    }
    let isMyActivity = assignedTo === lists.user.email || false;

    let itemType = selectedItem.type;

    // let isActivity = itemType === 'Activity';
    // let isOrganization = itemType === 'Organization';
    // let isProject = itemType === 'Project or Engagement';
    let isParticipant = itemType === 'Participant';

    return (
      <div className="md-grid">
        <Card className="md-cell--12" >
          <div className="md-grid" style={{ maxWidth: 600, marginLeft: 0 }}>

            <div className="timeline-title md-cell md-cell--12">
              <h2>{selectedItem.id !== -1 ? 'Edit Item' : 'Create New Item'}</h2>
              <h3>
                {<p>
                  [{this.getSelectedValue('System.Id', true)}] {this.getSelectedValue('System.Title')}
                    {isParticipant ? ' - Participant' : ''}
                </p>}
              </h3>
            </div>

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
                this.vstsStore.searchActivities(this.selectedItemStore.searchParentPath || '');
              }}
            />

            <Autocomplete
              id="select-organization"
              label="Organization / Project"
              placeholder="..."
              className="md-cell md-cell--10 project-type"
              data={this.state.searchServer ? this.vstsStore.searchResults as any : this.vstsStore.projects as any}
              dataLabel="value"
              filter={Autocomplete.caseInsensitiveFilter}
              autocompleteWithLabel={true}
              inlineSuggestionStyle={{ background: 'red' }}
              value={this.selectedItemStore.searchParentPath || ''}
              onChange={this.onLinkChange}
              onAutocomplete={this.handleAutocomplete}
            />

            <TextField
              id="activity-title"
              label="Title"
              lineDirection="center"
              placeholder="Acivity title"
              className="md-cell md-cell--6"
              value={selectedItem.name}
              onChange={(this.onTextChange.bind(this, 'name'))}
            />

            {selectedItem.type === 'Activity' && (
                <DatePicker
                  id="inline-date-picker-auto"
                  label="Start"
                  className="md-cell md-cell--3"
                  inline={true}
                  fullWidth={false}
                  autoOk={true}
                  value={selectedItem.start_time.format('YYYY-MM-DD')}
                  onChange={this.onStartDateChange}
                />
            )}

            {selectedItem.type === 'Activity' && (
                <SelectField
                  id="select-field-1"
                  label="Duration"
                  placeholder="Placeholder"
                  className="md-cell md-cell--2"
                  menuItems={NUMBER_ITEMS}
                  simplifiedMenu={true}
                  value={selectedItem.duration}
                  onChange={this.onDurationChange}
                />
            )}

            {selectedItem.type === 'Activity' && (
                <DatePicker
                  id="end-time"
                  style={{ maxWidth: 25 }}
                  className="md-cell md-cell--1 md-cell--bottom md-cell--center"
                  minDate={selectedItem.start_time.toDate()}
                  maxDate={moment(selectedItem.start_time).endOf('month').toDate()}
                  value={moment(selectedItem.end_time).add(-1, 'day').format('YYYY-MM-DD')}
                  autoOk={true}
                  onChange={this.onEndDateChange}
                />
            )}

            <Autocomplete
              id="tags-autocomplete"
              label="Select tags"
              className="md-cell md-cell--6"
              data={this.vstsStore.lists.tags}
              onAutocomplete={this.addTag}
              clearOnAutocomplete={true}
            />

            <div className="md-cell md-cell--12">
              {chips}
            </div>

            <SelectField
              id="select-field-4"
              label="Area"
              className="md-cell md-cell--6"
              value={selectedItem.area_path}
              onChange={this.onAreaChange}
              menuItems={this.vstsStore.lists.areas}
            />

            {selectedItem.type === 'Activity' && (
                <SelectField
                  id="select-field-5"
                  label="Activity Type"
                  placeholder="Placeholder"
                  className="md-cell md-cell--6"
                  menuItems={this.vstsStore.lists.activityTypes}
                  simplifiedMenu={true}
                  value={selectedItem.activity_type}
                  onChange={this.onActivityTypeChange}
                />
            )}

            <div className="md-cell md-cell--12">
              <Button raised={true} primary={true} onClick={this.onItemSave} disabled={!isMyActivity}>Save</Button>
              <Button raised={true} onClick={this.onItemCancel}>Cancel</Button>

              {!this.state.askDelete &&
                <Button raised={true} onClick={this.onItemDuplicate}>Duplicate</Button>}

              {!this.state.askDelete &&
                <Button raised={true} onClick={this.onDelete} disabled={!isMyActivity}>Delete</Button>}
              {this.state.askDelete &&
                <Button raised={true} onClick={this.onSureDelete} disabled={!isMyActivity}>
                  I'm sure I want to delete
                </Button>}
              {this.state.askDelete &&
                <Button raised={true} onClick={this.onCancelDelete} disabled={!isMyActivity}>Don't delete</Button>}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  private getSelectedValue = (fieldName: string, hyperlink: boolean = false): JSX.Element => {
    const { selectedItem } = this.selectedItemStore;
    const value = selectedItem && selectedItem.item.fields[fieldName] || null;
    if (hyperlink && selectedItem && selectedItem.id > 0) {
      return this.getActivityLink(selectedItem, value);
    }
    return value;
  }

  private getActivityLink = (activity: Activity, value: string | null = null) => {
    return (
      <a href={'https://cseng.visualstudio.com/CSEng/_queries?id=' + activity.id}>{value || activity.id}</a>
    );
  }

  // Add/Remove Tags
  // ==============================

  private removeTag = (tag: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }
    if (!selectedItem.tags) { return; }
    
    tag = tag.trim();
    selectedItem.tags = selectedItem.tags.split(';').map(t => t.trim()).filter(t => t !== tag).join(';');

    this.selectedItemStore.selectItem(selectedItem);
  }

  private addTag = (tag: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    if (!selectedItem.tags) { selectedItem.tags = ''; }

    selectedItem.tags += ';' + tag;
    this.selectedItemStore.selectItem(selectedItem);
  }

  // Autocomplete parent search
  // ==============================

  private onLinkChange = (value: any) => {
    if (this.state.searchServer) {
      this.selectedItemStore.searchParent(value || '');

      if (this.autocompleteTimeoutId) { clearTimeout(this.autocompleteTimeoutId); }
      this.autocompleteTimeoutId = 
        setTimeout(
          () => {
            this.autocompleteTimeoutId = null;
            this.vstsStore.searchActivities(value || '');
          }, 
          200
        );
    } else {
      this.selectedItemStore.searchParent(value || '');
    }
  }

  private handleAutocomplete = (value: string, index: number, matches: any[]) => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    selectedItem.parentPath = value;
    selectedItem.parentId = parseInt(value.substr(1, value.indexOf(']')), 0);

    this.selectedItemStore.selectItem(selectedItem);
    this.selectedItemStore.searchParent(value);
  }

  // Activity duration and dates
  // =================================

  private onTextChange = (prop: string, value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      selectedItem[prop] = value;
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  private onStartDateChange = (value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      selectedItem.start_time = moment(value, 'MM/DD/YYYY');
      selectedItem.end_time = moment(selectedItem.start_time).add(selectedItem.duration, 'days');
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  private onEndDateChange = (value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      let duration = moment.duration(moment(value, 'MM/DD/YYYY').diff(selectedItem.start_time)).asDays() + 1;
      selectedItem.duration = duration;
      selectedItem.end_time = moment(selectedItem.start_time).add(duration, 'days');
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  private onDurationChange = (value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      selectedItem.duration = parseInt(value, 0);
      selectedItem.end_time = moment(selectedItem.start_time).add(selectedItem.duration, 'days');
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  // Field Value changes
  // ===============================

  private onActivityTypeChange = (value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      selectedItem.activity_type = value;
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  private onAreaChange = (value: string) => {
    let { selectedItem } = this.selectedItemStore;
    if (selectedItem) {
      selectedItem.area_path = value;
      this.selectedItemStore.selectItem(selectedItem);
    }
  }

  // Item Actions
  // ================================

  private onItemSave = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    selectedItem.item.updating = true;
    if (selectedItem.id === -1) {
      this.vstsStore.createActivity(selectedItem);
    } else {
      this.vstsStore.updateActivity(selectedItem);
    }
  }

  private onItemCancel = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    this.vstsStore.unselectActivity();
  }

  private onItemDuplicate = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    this.vstsStore.duplicateActivity(selectedItem.id);
  }

  private onDelete = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    this.setState({ askDelete: true });
  }

  private onSureDelete = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    selectedItem.name = 'Please Delete';
    this.vstsStore.updateActivity(selectedItem);
    this.setState({ askDelete: false });
  }

  private onCancelDelete = () => {
    let { selectedItem } = this.selectedItemStore;
    if (!selectedItem) { return; }

    this.setState({ askDelete: false });
  }
}