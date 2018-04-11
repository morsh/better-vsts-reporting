import alt, { AbstractActions } from './alt';
import * as _ from 'lodash';
import { Activity, VSTSActivity, VSTSData, TimeRange, WorkItems, ParentLinks, SearchActivity } from './VSTSInterfaces';
import { createActivity, createVSTSItemForUpdate } from './VSTSHelper';
import VSTSStore from './VSTSStore';
let request = require('xhr-request');

interface LoadActivityResults {
  workItems: WorkItems;
  parentLinks: ParentLinks;
}

interface VSTSActions {
  setTimeRange(range: TimeRange): TimeRange;
  loadActivities(): (dispatcher: (result: VSTSData) => void) => void;
  updateActivity(activity: Activity): (dispatcher: (result: VSTSData) => void) => void;
  createActivity(activity: Activity): (dispatcher: (result: VSTSData) => void) => void;
  searchActivities(search: string): (dispatcher: (activities: Array<SearchActivity>) => void) => void;
}

class VSTSActions extends AbstractActions implements VSTSActions {

  setTimeRange(range: TimeRange) {
    return range;
  }

  loadActivities() {
    return (dispatcher: (result: VSTSData) => void) => {

      request(
        '/api/activities', 
        { json: true }, 
        (err: Error, result: LoadActivityResults) => {
          if (err) { throw err; }

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
        (err: Error, updatedItem: VSTSActivity) => {
          if (err) { throw err; }

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
        (err: Error, updatedItem: VSTSActivity) => {
          if (err) { throw err; }

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
    return (dispatcher: (activities: Array<SearchActivity>) => void) => {
      request(
        '/api/search/' + encodeURIComponent(search), 
        { json: true },
        (err: Error, activities: Array<SearchActivity>) => {
          if (err) { throw err; }

          // the JSON result
          return dispatcher(activities);
        }
      );
    };
  }
}

export default alt.createActions<VSTSActions>(VSTSActions);