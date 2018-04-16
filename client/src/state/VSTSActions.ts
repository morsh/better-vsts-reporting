import alt, { AbstractActions } from './alt';
import * as _ from 'lodash';
import * as moment from 'moment';
import { 
  Activity, 
  VSTSActivity, 
  VSTSData, 
  TimeRange, 
  WorkItems, 
  ParentLinks,
  SearchResults 
} from './VSTSInterfaces';
import { createActivity, createVSTSItemForUpdate, createNewActivity } from './VSTSHelper';
import VSTSStore from './VSTSStore';
import { ServerResponse } from 'http';
import AccountActions from './AccountActions';
import AccountStore from './AccountStore';
let request = require('xhr-request');

interface LoadActivityResults {
  workItems: WorkItems;
  parentLinks: ParentLinks;
}

interface VSTSActions {
  loadLists(): (dispatcher: (lists: any) => void) => void;
  setTimeRange(range: TimeRange): TimeRange;
  loadActivities(): (dispatcher: (result: VSTSData) => void) => void;
  updateActivity(activity: Activity): (dispatcher: (result: {result: VSTSData, activityId: number}) => void) => void;
  createActivity(activity: Activity): (dispatcher: (result: {result: VSTSData, activityId: number}) => void) => void;
  searchActivities(search: string): string;
  updateSeachResults(results: SearchResults): SearchResults;

  selectActivity(id: number): number;
  unselectActivity(id?: number): number | null;
  duplicateActivity(id: number): number;
  createNewActivityItem(start: moment.Moment);
}

class VSTSActions extends AbstractActions implements VSTSActions {

  setTimeRange(range: TimeRange) {
    return range;
  }

  loadLists() {
    return (dispatcher: (lists: any) => void) => {
      request(
        '/api/lists', 
        { json: true }, 
        (err: Error, lists: any, status: ServerResponse) => {
          if (err) { throw err; }
          if (status.statusCode === 500) { throw lists.error || 'There was an error'; }

          AccountActions.updateAccount(lists.user.email);
          return dispatcher(lists);
        }
      );
    };
  }

  loadActivities() {
    return (dispatcher: (result: VSTSData) => void) => {

      request(
        '/api/activities/' + encodeURIComponent(AccountStore.getState().accountName), 
        { json: true }, 
        (err: Error, result: LoadActivityResults, status: ServerResponse) => {
          if (err) { throw err; }
          if (status.statusCode === 500) { throw (<any> result).error || 'There was an error'; }

          let { workItems, parentLinks } = result;
          let data = <VSTSData> {
            groups: [],
            nextGroupId: 1,
            activities: {},
            workItems,
            parentLinks
          };
          
          _.values(workItems).map(item => createActivity(item, data)).forEach(item => data.activities[item.id] = item);
          
          return dispatcher(data);
        }
      );
    };
  }

  updateActivity(activity: Activity) {
    return (dispatcher: (result: {result: VSTSData, activityId: number}) => void) => {

      // Update item according to new properties
      let item = createVSTSItemForUpdate(activity);

      let data: VSTSData = VSTSStore.getState();
      let parentId = activity.parentId !== data.parentLinks[activity.id] ? activity.parentId : -1;

      request(
        '/api/activities/' + activity.id, 
        {
          method: 'POST',
          json: true,
          body: { item, parentId }
        },
        (err: Error, updatedItem: VSTSActivity, status: ServerResponse) => {
          if (err) { throw err; }
          if (status.statusCode === 500) { throw (<any> updatedItem).error || 'There was an error'; }

          // This item was deleted
          if (updatedItem.fields['System.Title'] === 'Please Delete') {
            data = VSTSStore.getState();
            delete data.parentLinks[updatedItem.id];

            delete data.activities[activity.id];
            delete data.workItems[activity.id];

            return dispatcher({ result: data, activityId: (null as any) });
          }

          data = VSTSStore.getState();
          data.parentLinks[updatedItem.id] = parentId;

          let newActivity = createActivity(updatedItem, data);
          
          // Replace the old activity & work item
          data.activities[activity.id] = newActivity;
          data.workItems[activity.id] = updatedItem;

          // the JSON result
          return dispatcher({ result: data, activityId: updatedItem.id });
        }
      );
    };
  }

  createActivity(activity: Activity) {
    return (dispatcher: (result: {result: VSTSData, activityId: number}) => void) => {

      // Update item according to new properties
      let item = createVSTSItemForUpdate(activity, true);

      let data: VSTSData = VSTSStore.getState();
      let parentId = activity.parentId !== data.parentLinks[activity.id] ? activity.parentId : -1;

      request(
        '/api/activities', 
        {
          method: 'PUT',
          json: true,
          body: { item, parentId }
        },
        (err: Error, updatedItem: VSTSActivity, status: ServerResponse) => {
          if (err) { throw err; }
          if (status.statusCode === 500) { throw (<any> updatedItem).error || 'There was an error'; }

          updatedItem.fields['System.Id'] = updatedItem.id;

          data = VSTSStore.getState();
          data.parentLinks[updatedItem.id] = parentId;

          let newActivity = createActivity(updatedItem, data);
          
          // Replace the old activity & work item
          data.activities[newActivity.id] = newActivity;
          data.workItems[newActivity.id] = updatedItem;

          // the JSON result
          return dispatcher({ result: data, activityId: updatedItem.id });
        }
      );
    };
  }

  searchActivities(search: string) {
    request(
      '/api/search/' + encodeURIComponent(search), 
      { json: true },
      (err: Error, result: LoadActivityResults, status: ServerResponse) => {
        if (err) { throw err; }
        if (status.statusCode === 500) { throw (<any> result).error || 'There was an error'; }

        let { workItems, parentLinks } = result;
        let data = <VSTSData> {
          groups: [],
          nextGroupId: 1,
          activities: {},
          workItems,
          parentLinks
        };
        
        _.values(workItems).map(item => createActivity(item, data)).forEach(item => data.activities[item.id] = item);

        // the JSON result
        return this.updateSeachResults(data);
      }
    );

    return search;
  }

  updateSeachResults(result: SearchResults) {
    return result;
  }

  selectActivity(id: number): number {
    return id;
  }

  unselectActivity(id?: number): number | null {
    return id || null;
  }

  duplicateActivity(id: number): number {
    return id;
  }

  createNewActivityItem(start: moment.Moment): moment.Moment {
    return start;
  }
}

export default alt.createActions<VSTSActions>(VSTSActions);