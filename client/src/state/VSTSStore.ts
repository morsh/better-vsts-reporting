import alt, { AbstractStoreModel } from './alt';
import * as moment from 'moment';
import * as _ from 'lodash';
import { getProjectHierarchy, createNewActivity } from './VSTSHelper';
import { 
  Activity, 
  ActivityGroup, 
  VSTSData, 
  TimeRange, 
  ParentLinks, 
  WorkItems, 
  Activities, 
  SearchResults
} from './VSTSInterfaces';
import VSTSActions from './VSTSActions';

export interface ParentListItem {
  value: string;
  type: string;
}

export interface ActivitiesContainer extends VSTSData {
  projects: Array<ParentListItem>;
  visibleActivities: Array<Activity>;
  visibleGroups: Array<ActivityGroup>;

  search: string;
  searchResults: Array<ParentListItem>;

  lists: any;
  selectedActivity: Activity | null;
}

class VSTSStore extends AbstractStoreModel<ActivitiesContainer> implements ActivitiesContainer {

  workItems: WorkItems;
  parentLinks: ParentLinks;
  activities: Activities;

  groups: Array<ActivityGroup>;
  visibleGroups: Array<ActivityGroup>;

  projects: Array<ParentListItem>;
  visibleActivities: Array<Activity>;
  nextGroupId: number;
  from: moment.Moment;
  to: moment.Moment;

  search: string;
  searchResultsFull: SearchResults;
  searchResults: Array<ParentListItem>;

  lists: any;
  selectedActivity: Activity | null;

  constructor() {
    super();

    this.workItems = {};
    this.parentLinks = {};
    this.projects = [];
    this.groups = [];
    this.nextGroupId = 1;
    this.activities = [];
    this.visibleActivities = [];
    this.visibleGroups = [];
    this.from = moment();
    this.to = moment();

    this.search = '';
    this.searchResultsFull = { 
      workItems: {},
      activities: {},
      parentLinks: {}
    };
    this.searchResults = [];

    this.lists = {};
    this.selectedActivity = null;

    this.bindListeners({
      loadLists: [VSTSActions.loadLists],
      setTimeRange: [VSTSActions.setTimeRange],
      loadActivities: [VSTSActions.loadActivities],
      updateActivity: [VSTSActions.updateActivity],
      createActivity: [VSTSActions.createActivity],
      searchActivities: [VSTSActions.searchActivities],
      updateSeachResults: [VSTSActions.updateSeachResults],
      selectActivity: [VSTSActions.selectActivity],
      unselectActivity: [VSTSActions.unselectActivity],
      duplicateActivity: [VSTSActions.duplicateActivity],
      createNewActivityItem: [VSTSActions.createNewActivityItem]
    });
  }

  setTimeRange(range: TimeRange) {
    this.from = range.from;
    this.to = range.to;
    this.updateVisibleActivities();
  }

  updateTimeRange() {
    if (this.selectedActivity) {
      this.setTimeRange({ 
        from: moment(this.selectedActivity.start_time).startOf('month'),
        to: moment(this.selectedActivity.end_time).endOf('month')
      });
    }
  }

  loadLists(lists: any) {
    this.lists = lists;
  }

  loadActivities(result: VSTSData) {
    this.workItems = result.workItems;
    this.parentLinks = result.parentLinks;
    this.activities = result.activities;
    this.groups = result.groups;
    this.nextGroupId = result.nextGroupId;
  
    this.projects = 
      _.filter(this.activities, act => act.type === 'Organization' || act.type === 'Project or Engagement')
      .map(act => ({
        value: getProjectHierarchy(act.item, result),
        type: act.type === 'Organization' ? 'organization' : 'project'
      }));
    this.updateVisibleActivities();
  }

  createActivity({ result, activityId }: { result: VSTSData, activityId: number }) {
    this.loadActivities(result);
    this.selectedActivity = this.activities[activityId];
    this.updateTimeRange();
  }

  updateActivity({ result, activityId }: { result: VSTSData, activityId: number }) {
    this.loadActivities(result);
    this.selectedActivity = null;
  }

  updateVisibleActivities() {
    this.visibleActivities = _.values(this.activities).filter(act =>
      (act.start_time <= this.to && act.start_time >= this.from) ||
      (act.end_time <= this.to && act.end_time >= this.from)
    );

    this.visibleGroups = this.groups.filter(group => _.find(this.visibleActivities, { group: group.id }));
  }

  searchActivities(search: string) {
    this.search = search;
  }

  updateSeachResults(result: SearchResults) {
    this.searchResultsFull = result;
    this.searchResults = _.values(result.activities).map(res => ({
      value: getProjectHierarchy(res.item, result),
      type: res.type === 'Organization' ? 'organization' : 'project'
    }));
  }

  selectActivity(activityId: number) {
    this.selectedActivity = this.activities[activityId];
    this.updateTimeRange();
  }

  unselectActivity(activityId: number | null) {
    if (!activityId) {
      this.selectedActivity = null;
    } else {
      this.selectedActivity = this.activities[activityId];
      this.updateTimeRange();
    }
  }

  duplicateActivity(activityId: number) {
    let activity = this.activities[activityId];
    let newActivity = _.cloneDeep(activity);
    newActivity.id = newActivity.item.id = newActivity.item.fields['System.Id'] = -1;
    newActivity.assigned_to = this.lists.user.email;
    this.selectedActivity = newActivity;
  }

  createNewActivityItem(start: moment.Moment) {
    let newActivity = createNewActivity(moment(start), this.lists.user.email);
    this.selectedActivity = newActivity;
  }
}

export default alt.createStore<ActivitiesContainer>(
  (VSTSStore as AltJS.StoreModel<ActivitiesContainer>), 'VSTSStore');