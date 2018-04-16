import * as _ from 'lodash';
import * as moment from 'moment';
import { VSTSActivity, Activity, VSTSData, ParentLinks, WorkItems } from './VSTSInterfaces';

function getGroupId(item: VSTSActivity, data: VSTSData): number {
  let groupName = item.fields['System.Title'];
  let group = _.find(data.groups, { title: groupName, parentId: data.parentLinks[item.id] });
  if (group) { return group.id; }

  let groupId = data.nextGroupId++;
  let parent = data.parentLinks[item.id] && data.workItems[data.parentLinks[item.id]] || null;
  let parentPath = getProjectHierarchy(parent, data, false);

  data.groups.push({
    id: groupId,
    title: groupName,
    parentId: data.parentLinks[item.id],
    path: '[' + item.id + '] ' + (parentPath ? (parentPath + ' / ') : '') + groupName
  });

  return groupId;
}

function getStartDate(item: VSTSActivity): moment.Moment {
  return moment(
    item.fields['CSEngineering.ActivityStartDate'] ||
    item.fields['CSEngineering.ParticipationStartDate'] ||
    '2000-01-01'
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

export function getProjectHierarchy(
  parent: VSTSActivity | null, 
  data: { parentLinks: ParentLinks, workItems: WorkItems},
  includeId: boolean = true): string {

  if (!parent) { return ''; }

  let idInPath = (includeId ? '[' + parent.id + '] ' : '');
  let hierarchy = idInPath + parent.fields['System.Title'];

  if (parent.fields['System.WorkItemType'] === 'Project or Engagement') {
    let projectParentId = data.parentLinks[parent.id];
    if (projectParentId !== -1) {

      let projectParent = data.workItems[projectParentId];
      hierarchy = idInPath + projectParent.fields['System.Title'] + ' / ' + parent.fields['System.Title'];
    }
  }

  return hierarchy;
}

function setParentHierarchy(item: Activity, data: VSTSData) {
  item.parentId = -1;
  item.parentPath = '';

  if (item.type === 'Organization') { return; }

  if (typeof data.parentLinks[item.id] !== 'undefined') {
    let parentId = data.parentLinks[item.id];
    if (parentId === -1) { return; }

    let parent = data.workItems[parentId];
    item.parentId = parentId;
    item.parentPath = getProjectHierarchy(parent, data);
  }
}

export function createActivity(item: VSTSActivity, data: VSTSData): Activity {

  let activity = <Activity> {
    id: item.id,
    rev: item.rev,
    item: item,
    type: item.fields['System.WorkItemType'],
    name: item.fields['System.Title'],
    
    group: getGroupId(item, data),
    
    title: getDurationTitle(item),
    start_time: getStartDate(item),
    duration: getDuration(item),
    end_time: getEndDate(item),

    area_path: item.fields['System.AreaPath'],
    iteration_path: item.fields['System.IterationPath'],
    state: item.fields['System.State'],
    assigned_to: item.fields['System.AssignedTo'],
    tags: item.fields['System.Tags'],
    
    activity_type: item.fields['CSEngineering.ActivityType'],
    country_selection: item.fields['CSEngineering.CountrySelection'],
    short_description: item.fields['CSEngineering.ShortDescription']
  };

  setParentHierarchy(activity, data);

  return activity;
}

export function createNewActivity(start: moment.Moment, assignedTo: string): Activity {
  let activity = <Activity> {
    id: -1,
    rev: 0,
    item: { id: -1, rev: 0, url: '', fields: { 'System.Id': -1 } },
    type: 'Activity',
    name: 'Activity Name',
    
    group: -1,
    
    title: '',
    start_time: moment(start),
    duration: 5,
    end_time: moment(start).add(5, 'days'),

    area_path: 'CSEng\\DWR\\Reactive',
    iteration_path: 'CSEng',
    state: 'New',
    assigned_to: assignedTo,
    tags: '#Tech_Azure',
    
    activity_type: 'Technical qualifying and envisioning',
    country_selection: 'Israel',
    short_description: ''
  };
  return activity;
}

export function createVSTSItemForUpdate(activity: Activity, create: boolean = false): any {

  let item = { 
    id: activity.id, 
    rev: activity.rev, 
    url: activity.item.url, 
    fields: {
      'System.Title': activity.name
    }
  };

  function addIfChanged(fieldName: string, value: string | number) {
    if (create || !activity.item || activity.item.fields[fieldName] !== value) {
      item.fields[fieldName] = value;
    }
  }

  addIfChanged('System.WorkItemType', activity.type);

  if (activity.type === 'Participant') {
    addIfChanged('CSEngineering.ParticipationStartDate', activity.start_time.toISOString());
    addIfChanged('CSEngineering.ParticipationDurationDays', activity.duration);
  } else {
    addIfChanged('CSEngineering.ActivityStartDate', activity.start_time.toISOString());
    addIfChanged('CSEngineering.ActivityDuration', activity.duration);
  }

  addIfChanged('System.AreaPath', activity.area_path);
  addIfChanged('System.IterationPath', activity.iteration_path);
  addIfChanged('System.State', activity.state);
  addIfChanged('System.AssignedTo', activity.assigned_to);
  addIfChanged('System.Tags', activity.tags);
  addIfChanged('CSEngineering.ActivityType', activity.activity_type);
  addIfChanged('CSEngineering.CountrySelection', activity.country_selection);
  addIfChanged('CSEngineering.ShortDescription', activity.short_description);

  return item;
}