import alt, { AbstractActions } from './alt';
import * as _ from 'lodash';
import { 
  Activity, 
  VSTSActivity, 
  VSTSData, 
  TimeRange, 
  WorkItems, 
  ParentLinks,
  SearchResults 
} from './VSTSInterfaces';
import { createActivity, createVSTSItemForUpdate } from './VSTSHelper';
import VSTSStore from './VSTSStore';
import { ServerResponse } from 'http';
let request = require('xhr-request');

interface LoadActivityResults {
  workItems: WorkItems;
  parentLinks: ParentLinks;
}

interface VSTSActions {
  loadLists(): (dispatcher: (lists: any) => void) => void;
  setTimeRange(range: TimeRange): TimeRange;
  loadActivities(): (dispatcher: (result: VSTSData) => void) => void;
  updateActivity(activity: Activity): (dispatcher: (result: VSTSData) => void) => void;
  createActivity(activity: Activity): (dispatcher: (result: VSTSData) => void) => void;
  searchActivities(search: string): string;
  updateSeachResults(results: SearchResults): SearchResults;
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
          if (status.statusCode === 500) { throw lists.error || 'There was an error'; }

          return dispatcher(lists);
        }
      );
    };
  }

  loadActivities() {
    return (dispatcher: (result: VSTSData) => void) => {

      request(
        '/api/activities', 
        { json: true }, 
        (err: Error, result: LoadActivityResults, status: ServerResponse) => {
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
    return (dispatcher: (result: VSTSData) => void) => {

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
          if (status.statusCode === 500) { throw (<any> updatedItem).error || 'There was an error'; }

          data = VSTSStore.getState();
          let newActivity = createActivity(updatedItem, data);
          
          // Replace the old activity & work item
          data.activities[activity.id] = newActivity;
          data.workItems[activity.id] = updatedItem;

          // Replace old parent link
          data.parentLinks[activity.id] = parentId;

          // the JSON result
          return dispatcher(data);
        }
      );
    };
  }

  createActivity(activity: Activity) {
    return (dispatcher: (result: VSTSData) => void) => {

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
          if (status.statusCode === 500) { throw (<any> updatedItem).error || 'There was an error'; }

          data = VSTSStore.getState();
          let newActivity = createActivity(updatedItem, data);
          
          // Replace the old activity & work item
          data.activities[newActivity.id] = newActivity;
          data.workItems[newActivity.id] = updatedItem;

          // Replace old parent link
          data.parentLinks[newActivity.id] = parentId;

          // the JSON result
          return dispatcher(data);
        }
      );
    };
  }

  searchActivities(search: string) {
    request(
      '/api/search/' + encodeURIComponent(search), 
      { json: true },
      (err: Error, result: LoadActivityResults, status: ServerResponse) => {
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
}

export default alt.createActions<VSTSActions>(VSTSActions);