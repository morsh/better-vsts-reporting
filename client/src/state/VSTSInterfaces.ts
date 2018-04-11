import * as _ from 'lodash';
import * as moment from 'moment';

export interface VSTSActivity {
  id: number;
  rev: number;
  url: string;
  updating?: boolean;
  fields: {
    'System.AreaPath': string;
    'System.Id': number;
    'System.IterationPath': string;
    'System.State': string;
    'System.Title': string;
    'System.WorkItemType': string;
    'System.AssignedTo': string;
    'System.Tags': string;
    'CSEngineering.ActivityDuration'?: number;
    'CSEngineering.ActivityStartDate'?: string;
    'CSEngineering.ParticipationStartDate'?: string;
    'CSEngineering.ParticipationDurationDays'?: number;
  };
}

export  interface Activity {
  id: number;
  item: VSTSActivity;
  rev: number;
  type: string;
  name: string;
  
  parentId: number;
  parentPath: string;

  group: number;
  
  title: string;
  start_time: moment.Moment;
  end_time: moment.Moment;
  duration: number;

  area_path: string;
  iteration_path: string;
  state: string;
  assigned_to: string;
  tags: string;
  activity_type: string;
  country_selection: string;
  short_description: string;
}

export interface ActivityGroup {
  id: number;
  title: string;
}

export declare type WorkItems = _.NumericDictionary<VSTSActivity>;
export declare type Activities = _.NumericDictionary<Activity>;
export declare type ParentLinks = _.NumericDictionary<number>;

export interface TimeRange {
  from: moment.Moment;
  to: moment.Moment;
}

export interface VSTSData {
  groups: Array<ActivityGroup>;
  nextGroupId: number;
  workItems: WorkItems;
  activities: Activities;
  parentLinks: ParentLinks;
}

export interface SearchActivity {
  id: number;
  title: string;
}