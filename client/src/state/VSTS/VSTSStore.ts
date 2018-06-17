import * as moment from 'moment';
import * as _ from 'lodash';
import { observable, action } from 'mobx';
import { getProjectHierarchy, createNewActivity, createActivity } from './VSTSHelper';
import { 
  Activity, 
  ActivityGroup, 
  VSTSData, 
  TimeRange, 
  ParentLinks, 
  WorkItems, 
  Activities, 
  SearchResults,
  ParentListItem,
} from './Interfaces';
import { api } from './Api';
import { selectedItemStore } from '../SelectedItem';

export class VSTSStore {

  @observable workItems: WorkItems = {};
  @observable parentLinks: ParentLinks = {};
  @observable activities: Activities = [];

  @observable groups: Array<ActivityGroup> = [];
  @observable visibleGroups: Array<ActivityGroup> = [];

  @observable projects: Array<ParentListItem> = [];
  @observable visibleActivities: Array<Activity> = [];
  @observable nextGroupId: number = 1;
  @observable from: moment.Moment = moment();
  @observable to: moment.Moment = moment();

  @observable search: string = '';
  @observable searchResultsFull: SearchResults = { 
    workItems: {},
    activities: {},
    parentLinks: {}
  } as any;
  @observable searchResults: Array<ParentListItem> = [];

  @observable lists: any = {};
  @observable selectedActivity: Activity | null = null;

  @action setTimeRange(range: TimeRange) {
    this.from = range.from;
    this.to = range.to;
    this.updateVisibleActivities();
  }

  @action updateTimeRange() {
    if (this.selectedActivity) {
      this.setTimeRange({ 
        from: moment(this.selectedActivity.start_time).startOf('month'),
        to: moment(this.selectedActivity.end_time).endOf('month')
      });
    }
  }

  @action async loadLists() {
    this.lists = await api.loadLists();
  }

  @action async loadActivities() {

    if (!this.lists.user) {
      await this.loadLists();
    }

    const result = await api.loadActivities();
    this.workItems = result.workItems;
    this.parentLinks = result.parentLinks;
    this.activities = result.activities;
    this.groups = result.groups as any;
    this.nextGroupId = result.nextGroupId;
  
    this.projects = 
      _.filter(this.activities, act => act.type === 'Organization' || act.type === 'Project or Engagement')
      .map(act => ({
        value: getProjectHierarchy(act.item, result),
        type: act.type === 'Organization' ? 'organization' : 'project'
      }));
    this.updateVisibleActivities();
  }

  @action async createActivity(activity: Activity) {
    const { activityId } = await api.createActivity(activity, this.getState());
    
    this.loadActivities();
    this.selectedActivity = this.activities[activityId];
    this.updateTimeRange();
  }

  @action async updateActivity(activity: Activity) {
    await api.updateActivity(activity, this.getState());
    this.loadActivities();
    this.unselectActivity();
  }

  updateVisibleActivities() {
    this.visibleActivities = _.values(this.activities).filter(act =>
      (act.start_time <= this.to && act.start_time >= this.from) ||
      (act.end_time <= this.to && act.end_time >= this.from)
    );

    this.visibleGroups = this.groups.filter(group => _.find(this.visibleActivities, { group: group.id }));
  }

  @action async searchActivities(search: string) {
    const data = await api.searchActivities(search);
    this.updateSeachResults(data);
    this.search = search;
  }

  @action updateSeachResults(result: SearchResults) {
    this.searchResultsFull = result;
    this.searchResults = _.values(result.activities).map(res => ({
      value: getProjectHierarchy(res.item, result),
      type: res.type === 'Organization' ? 'organization' : 'project'
    }));
  }

  @action selectActivity(activityId: number) {
    this.selectedActivity = this.activities[activityId];
    this.updateTimeRange();
    selectedItemStore.selectItem(this.selectedActivity);
  }

  @action unselectActivity(id?: number) {

    const activityId = id || null;

    // Canceling changes to activity
    if (this.selectedActivity && this.selectedActivity.id > 0) {
      this.activities[this.selectedActivity.id] = createActivity(this.selectedActivity.item, this);
    }

    if (!activityId) {
      this.selectedActivity = null;
    } else {
      this.selectedActivity = this.activities[activityId];
      this.updateTimeRange();
    }

    this.updateVisibleActivities();
    selectedItemStore.unselectItem();
  }

  @action duplicateActivity(activityId: number) {
    let activity = this.activities[activityId];
    let newActivity = _.cloneDeep(activity);
    newActivity.id = newActivity.item.id = newActivity.item.fields['System.Id'] = -1;
    newActivity.assigned_to = this.lists.user.email;
    this.selectedActivity = newActivity;
    this.updateTimeRange();
    selectedItemStore.selectItem(this.selectedActivity);
  }

  @action createNewActivityItem(start: moment.Moment) {
    let newActivity = createNewActivity(moment(start), this.lists.user.email);
    this.selectedActivity = newActivity;
    selectedItemStore.selectItem(this.selectedActivity);
  }

  private getState(): VSTSData {
    return { 
      groups: this.groups,
      nextGroupId: this.nextGroupId, 
      workItems: this.workItems, 
      activities: this.activities, 
      parentLinks: this.parentLinks 
    };
  }
}

const vstsStore = new VSTSStore();
export { vstsStore };