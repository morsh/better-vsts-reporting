import alt, { AbstractStoreModel } from './alt';
import * as moment from 'moment';
import * as _ from 'lodash';
import { getProjectHierarchy } from './VSTSHelper';
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

export interface ActivitiesContainer extends VSTSData {
  projects: Array<string>;
  visibleActivities: Array<Activity>;
  visibleGroups: Array<ActivityGroup>;

  search: string;
  searchResults: Array<string>;

  lists: any;
}

class VSTSStore extends AbstractStoreModel<ActivitiesContainer> implements ActivitiesContainer {

  workItems: WorkItems;
  parentLinks: ParentLinks;
  activities: Activities;

  groups: Array<ActivityGroup>;
  visibleGroups: Array<ActivityGroup>;

  projects: Array<string>;
  visibleActivities: Array<Activity>;
  nextGroupId: number;
  from: moment.Moment;
  to: moment.Moment;

  search: string;
  searchResultsFull: SearchResults;
  searchResults: Array<string>;

  lists: any;

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

    this.bindListeners({
      loadLists: [VSTSActions.loadLists],
      setTimeRange: [VSTSActions.setTimeRange],
      loadActivities: [VSTSActions.loadActivities, VSTSActions.updateActivity, VSTSActions.createActivity],
      searchActivities: [VSTSActions.searchActivities],
      updateSeachResults: [VSTSActions.updateSeachResults],
    });
  }

  setTimeRange(range: TimeRange) {
    this.from = range.from;
    this.to = range.to;
    this.updateVisibleActivities();
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
      .map(act => getProjectHierarchy(act.item, result));
    this.updateVisibleActivities();
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
    this.searchResults = _.values(result.activities).map(res => getProjectHierarchy(res.item, result));
  }
}

export default alt.createStore<ActivitiesContainer>(
  (VSTSStore as AltJS.StoreModel<ActivitiesContainer>), 'VSTSStore');