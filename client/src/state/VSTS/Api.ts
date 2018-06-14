import { toastStore } from '../Toasts';
import { ServerResponse } from 'http';
import { accountStore } from '../Account';
import { VSTSData, LoadActivityResults, Activity, VSTSActivity, SearchResults } from './Interfaces';
import { createActivity, createVSTSItemForUpdate } from './VSTSHelper';
import * as _ from 'lodash';

import request from '../request';

export class VSTSApi {

  private loadListsTimeoutHandle?: NodeJS.Timer;

  checkForError(error: Error, response: any, status: ServerResponse): boolean {

    if (error || status.statusCode === 500) { 
      toastStore.showMessage(
        'Error: ' +
        ((error && error.toString()) || '') +
        (status.statusMessage || '') +
        (response.error || 'There was an error')
      );

      return true;
    }

    return false;
  }

  async loadLists() {

    if (typeof this.loadListsTimeoutHandle !== 'undefined') {
      clearTimeout(this.loadListsTimeoutHandle);
    }

    this.loadListsTimeoutHandle = setTimeout(
      () => {

        if (typeof this.loadListsTimeoutHandle === 'undefined') { return; }

        if (window.location.host === 'localhost:3000') {
          let iframe = document.createElement('iframe');
          iframe.style.display = 'block';
          iframe.style.top = '0';
          iframe.style.zIndex = '20';
          iframe.style.position = 'absolute';
          iframe.src = 'http://localhost:4000';
          iframe.style.width = '300px';
          iframe.style.height = '300px';
          
          iframe.onload = () => {
            if (typeof this.loadListsTimeoutHandle !== 'undefined') {
              window.location.reload(true);
            } else {
              iframe.remove();
            }
          };
          document.body.appendChild(iframe);
        } else {
          window.location.replace('/auth/login?redirect_uri=%2f');
        }
      },
      3000
    );
    
    const lists = await request<any>('api/lists', { json: true });
    if (typeof this.loadListsTimeoutHandle !== 'undefined') {
      clearTimeout(this.loadListsTimeoutHandle);
      this.loadListsTimeoutHandle = undefined;
    }

    accountStore.updateAccount(lists.user.email);
    return lists;
  }

  async loadActivities() {

    const result = await request<LoadActivityResults>(
      '/api/activities/' + encodeURIComponent(accountStore.accountName), 
      { json: true }
    );

    let { workItems, parentLinks } = result;
    let data: VSTSData = <any> {
      groups: [],
      nextGroupId: 1,
      activities: {},
      workItems,
      parentLinks
    };
    
    _.values(workItems).map(item => createActivity(item, data)).forEach(item => data.activities[item.id] = item);
    
    return data;
  }

  async updateActivity(activity: Activity, state: VSTSData) {

    // Update item according to new properties
    let item = createVSTSItemForUpdate(activity);

    let data: VSTSData = { 
      groups: state.groups,
      nextGroupId: state.nextGroupId, 
      workItems: state.workItems, 
      activities: state.activities, 
      parentLinks: state.parentLinks 
    };
    let parentId = activity.parentId !== data.parentLinks[activity.id] ? activity.parentId : -1;

    const updatedItem = await request<VSTSActivity>(
      '/api/activities/' + activity.id, 
      {
        method: 'POST',
        json: true,
        body: { item, parentId }
      });

          // This item was deleted
    if (updatedItem.fields['System.Title'] === 'Please Delete') {
      data = { 
        groups: state.groups,
        nextGroupId: state.nextGroupId, 
        workItems: state.workItems, 
        activities: state.activities, 
        parentLinks: state.parentLinks 
      };
      delete data.parentLinks[updatedItem.id];

      delete data.activities[activity.id];
      delete data.workItems[activity.id];

      return { result: data, activityId: (null as any) };
    }

    updatedItem.fields['System.Id'] = updatedItem.id;

    data = { 
      groups: state.groups,
      nextGroupId: state.nextGroupId, 
      workItems: state.workItems, 
      activities: state.activities, 
      parentLinks: state.parentLinks 
    };
    data.parentLinks[updatedItem.id] = (parentId === -1 ? activity.parentId : parentId) || -1;

    let newActivity = createActivity(updatedItem, data);
          
    // Replace the old activity & work item
    data.activities[activity.id] = newActivity;
    data.workItems[activity.id] = updatedItem;

    toastStore.showMessage(`Item "[${activity.id}] ${activity.name}" was updated successfully`);

    // the JSON result
    return { result: data, activityId: updatedItem.id };
  }

  async createActivity(activity: Activity, state: VSTSData) {

    // Update item according to new properties
    let item = createVSTSItemForUpdate(activity, true);

    let data: VSTSData = { 
      groups: state.groups,
      nextGroupId: state.nextGroupId, 
      workItems: state.workItems, 
      activities: state.activities, 
      parentLinks: state.parentLinks 
    };
    let parentId = activity.parentId || -1;

    const updatedItem = await request<VSTSActivity>(
      '/api/activities', 
      {
        method: 'PUT',
        json: true,
        body: { item, parentId }
      });

    updatedItem.fields['System.Id'] = updatedItem.id;

    data = { 
      groups: state.groups,
      nextGroupId: state.nextGroupId, 
      workItems: state.workItems, 
      activities: state.activities, 
      parentLinks: state.parentLinks 
    };
    data.parentLinks[updatedItem.id] = parentId;

    let newActivity = createActivity(updatedItem, data);
        
    // Replace the old activity & work item
    data.activities[newActivity.id] = newActivity;
    data.workItems[newActivity.id] = updatedItem;

    toastStore.showMessage(`Item "[${activity.id}] ${activity.name}" was created successfully`);
        
    // the JSON result
    return { result: data, activityId: updatedItem.id };
  }

  async searchActivities(search: string): Promise<VSTSData> {
    const result = await request<SearchResults>('/api/search/' + encodeURIComponent(search), { json: true });

    let { workItems, parentLinks } = result;
    let data: VSTSData = <any> {
      groups: [],
      nextGroupId: 1,
      activities: {},
      workItems,
      parentLinks
    };
        
    _.values(workItems).map(item => createActivity(item, data)).forEach(item => data.activities[item.id] = item);

    return data;
  }
}

const api = new VSTSApi();
export { api };