import alt, { AbstractActions } from './alt';
import * as _ from 'lodash';
import * as moment from 'moment';
import { VSTSStore } from '.';
let request = require('xhr-request');

function getGroupId(groups: ActivityGroup[], groupName: string, groupId: number = 1): number {
  let group = _.find(groups, { title: groupName });
  if (group) { return group.id; }
  groups.push({
    id: groupId,
    title: groupName
  });

  return groupId;
}

function getStartDate(item: VSTSActivity): moment.Moment {
  return moment(
    item.fields['CSEngineering.ActivityStartDate'] ||
    item.fields['CSEngineering.ParticipationStartDate']
  ).startOf('day');
}

function getDuration(item: VSTSActivity): number {
  let duration = (
    item.fields['CSEngineering.ActivityDuration'] ||
    item.fields['CSEngineering.ParticipationDurationDays'] ||
    0
  );
  return duration < 1 ? 1 : duration;
}

function getDurationTitle(item: VSTSActivity): string {
  let duration = (
    item.fields['CSEngineering.ActivityDuration'] ||
    item.fields['CSEngineering.ParticipationDurationDays'] ||
    0
  );
  return duration + (duration <= 1 ? ' D' : ' Days');
}

function getEndDate(item: VSTSActivity): moment.Moment {
  return getStartDate(item).add(getDuration(item), 'days');
}

export interface VSTSActivity {
  id: number;
  rev: number;
  url: string;
  fields: {
    'CSEngineering.ActivityDuration': number;
    'CSEngineering.ActivityStartDate': string;
    'System.AreaPath': string;
    'System.Id': number;
    'System.IterationPath': string;
    'System.State': string;
    'System.Title': string;
    'System.WorkItemType': string;
    'CSEngineering.ActivityType': string;
  };
}

export interface Activity {
  id: number;
  type: string;
  item: VSTSActivity;
  group: number;
  title: string;
  start_time: moment.Moment;
  end_time: moment.Moment;
}

export interface ActivityGroup {
  id: number;
  title: string;
}

export interface ActivitiesResult {
  activities: Array<Activity>;
  groups: Array<ActivityGroup>;
}

export interface TimeRange {
  from: moment.Moment;
  to: moment.Moment;
}

interface VSTSActions {
  setTimeRange(range: TimeRange): TimeRange;
  loadActivities(): (dispatcher: (result: ActivitiesResult) => void) => void;
}

class VSTSActions extends AbstractActions implements VSTSActions {

  setTimeRange(range: TimeRange) {
    return range;
  }

  loadActivities() {
    return (dispatcher: (result: ActivitiesResult) => void) => {

      request(
        '/api/activities', 
        { json: true }, 
        (err: Error, data: Array<VSTSActivity>) => {
          if (err) { throw err; }

          let groups = _.cloneDeep(VSTSStore.getState().groups);
          let groupId = 1;

          let activities = data.map(item => <Activity> {
            id: item.id,
            item: item,
            type: item.fields['System.WorkItemType'],
            group: getGroupId(groups, item.fields['System.Title'], groupId++),
            title: getDurationTitle(item),
            start_time: getStartDate(item),
            end_time: getEndDate(item)
          });
          
          // the JSON result
          return dispatcher({ activities, groups: _.values(groups) });
        }
      );
    };
  }

  updateActivity(updatedItem: Activity) {
    return (dispatcher: (result: ActivitiesResult) => void) => {

      // Update item according to new properties
      let vstsItem = updatedItem.item;

      request(
        '/api/activities/' + vstsItem.id, 
        {
          method: 'POST',
          json: true,
          body: { item: vstsItem }
        },
        (err: Error, item: VSTSActivity) => {
          if (err) { throw err; }

          let { groups, activities } = VSTSStore.getState();
          let maxGroup = _.maxBy(groups, 'id');
          let groupId = (maxGroup && maxGroup.id + 1) || 1;
          
          let activity = {
            id: item.id,
            item: item,
            type: item.fields['System.WorkItemType'],
            group: getGroupId(groups, item.fields['System.Title'], groupId),
            title: getDurationTitle(item),
            start_time: getStartDate(item),
            end_time: getEndDate(item)
          };

          let index = _.findIndex(activities, { id: activity.id });
          activities.splice(index, 1, activity);

          // the JSON result
          return dispatcher({ activities, groups: _.values(groups) });
        }
      );
    };
  }

  createActivity(updatedItem: Activity) {
    return (dispatcher: (result: ActivitiesResult) => void) => {

      // Update item according to new properties
      let vstsItem = updatedItem.item;

      request(
        '/api/activities', 
        {
          method: 'PUT',
          json: true,
          body: { item: vstsItem }
        },
        (err: Error, item: VSTSActivity) => {
          if (err) { throw err; }

          let { groups, activities } = VSTSStore.getState();
          let maxGroup = _.maxBy(groups, 'id');
          let groupId = (maxGroup && maxGroup.id + 1) || 1;
          
          let activity = {
            id: item.id,
            item: item,
            type: item.fields['System.WorkItemType'],
            group: getGroupId(groups, item.fields['System.Title'], groupId),
            title: getDurationTitle(item),
            start_time: getStartDate(item),
            end_time: getEndDate(item)
          };

          activities.push(activity);

          // the JSON result
          return dispatcher({ activities, groups: _.values(groups) });
        }
      );
    };
  }
}

export default alt.createActions<VSTSActions>(VSTSActions);