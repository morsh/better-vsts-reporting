import alt, { AbstractStoreModel } from './alt';
import * as moment from 'moment';
import * as _ from 'lodash';
import VSTSActions, { Activity, ActivityGroup, ActivitiesResult, TimeRange } from './VSTSActions';

export interface ActivitiesContainer {
  activities: Array<Activity>;
  groups: Array<ActivityGroup>;
}

class VSTSStore extends AbstractStoreModel<ActivitiesContainer> implements ActivitiesContainer {

  allActivities: Array<Activity>;
  activities: Array<Activity>;
  allGroups: Array<ActivityGroup>;
  groups: Array<ActivityGroup>;
  from: moment.Moment;
  to: moment.Moment;

  constructor() {
    super();

    this.allActivities = [];
    this.activities = [];
    this.allGroups = [];
    this.groups = [];
    this.from = moment();
    this.to = moment();

    this.bindListeners({
      setTimeRange: [ VSTSActions.setTimeRange ],
      loadActivities: [ VSTSActions.loadActivities, VSTSActions.updateActivity, VSTSActions.createActivity ]
    });
  }

  setTimeRange(range: TimeRange) {
    this.from = range.from;
    this.to = range.to;
    this.updateVisibleActivities();
  }
  
  loadActivities(result: ActivitiesResult) {
    this.allActivities = result.activities;
    this.allGroups = result.groups;
    this.updateVisibleActivities();
  }

  updateVisibleActivities() {
    this.activities = this.allActivities.filter(act =>
      (act.start_time <= this.to && act.start_time >= this.from) ||
      (act.end_time <= this.to && act.end_time >= this.from)
    );

    this.groups = this.allGroups.filter(group => _.find(this.activities, { group: group.id }));
  }
}

export default alt.createStore<ActivitiesContainer>(
  (VSTSStore as AltJS.StoreModel<ActivitiesContainer>), 'VSTSStore');