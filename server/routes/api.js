const path = require('path');
const fs = require('fs');
const vsts = require('vso-node-api');
const buildApi = require('vso-node-api/BuildApi');
const workItemTrackingInterfaces = require("vso-node-api/interfaces/WorkItemTrackingInterfaces");
const _ = require('lodash');

const express = require('express');
const router = new express.Router();

const VSTS_COLLECTION_URL = process.env.API_URL;
const VSTS_AUTH_TOKEN = process.env.API_TOKEN; 
const VSTS_PROJECT = process.env.API_PROJECT;
const VSTS_ITERATION_LIMIT = 200;

const FIELDS = [
  "System.Id",
  "System.WorkItemType",
  "System.Title",
  "System.State",
  "System.AreaPath",
  "System.AssignedTo",
  "System.Tags",
  "System.IterationPath",
  "CSEngineering.ActivityStartDate",
  "CSEngineering.ActivityDuration",
  "CSEngineering.ActivityType",
  "CSEngineering.ParticipationStartDate",
  "CSEngineering.ParticipationDurationDays",
  "CSEngineering.CountrySelection",
  "CSEngineering.ShortDescription"
];

let authHandler = vsts.getPersonalAccessTokenHandler(VSTS_AUTH_TOKEN); 
let connect = new vsts.WebApi(VSTS_COLLECTION_URL, authHandler);    

function addItemFieldToArray(arr, item, field) {
  if (item.fields[field]) {
    arr.push({ "op": "add", "path": "/fields/" + field, "value": item.fields[field] });;
  }
}

function createWorkItemUpdate(item) {
  let wijson = [];
  FIELDS.filter(f => f !== "System.Id").forEach(field => addItemFieldToArray(wijson, item, field));
  return wijson;
}

router.get('/', (req, res) => {

  res.send({ status: 'ok' });
});

router.get('/lists', async (req, res) => {

  let valuesPath = path.join(__dirname, 'values');
  let tagsPath = path.join(valuesPath, 'tags.txt');
  let tagsString = fs.readFileSync(tagsPath).toString();
  let tags = tagsString.trim().split(/\r?\n/);

  let areasPath = path.join(valuesPath, 'areas.txt');
  let areasString = fs.readFileSync(areasPath).toString();
  let areas = areasString.trim().split(/\r?\n/);

  let activityTypesPath = path.join(valuesPath, 'activityTypes.txt');
  let activityTypesString = fs.readFileSync(activityTypesPath).toString();
  let activityTypes = activityTypesString.trim().split(/\r?\n/);;

  let vstsWork = await connect.getWorkItemTrackingApi();
  
  res.send({ tags, areas, activityTypes, user: {
    displayName: req.user.displayName,
    email: req.user.email
  } });
});

router.get('/search/:query?', async (req, res) => {

  let { query } = req.params;

  query = query || '';

  let queryId = null;
  if (query && query.startsWith('[') && query.indexOf(']')) {
    try {
      queryId = parseInt(query.substr(1, query.indexOf(']')), 0) || 0;
      query = query.substr(query.indexOf(']') + 1).trim();
    } catch (e) { }
  }

  let queryParent = null;
  if (query.indexOf('/') >= 0) {
    queryParent = query.substr(0, query.indexOf('/')).trim();
    query = query.substr(query.indexOf('/') + 1).trim();
  }

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let wiqlQuery = `
      SELECT [System.Id]
      FROM workitemLinks
      WHERE
          [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward' `;

    if (queryId) {
      wiqlQuery += `
        AND (
            [Target].[System.TeamProject] = @project
            AND [Target].[System.Id] = '${queryId}'
        ) `
    }

    if (!queryId && queryParent) {
      wiqlQuery += `
        AND (
                [Source].[System.TeamProject] = @project
                AND [Source].[System.WorkItemType] = 'Organization'
                AND [Source].[System.Title] CONTAINS '${queryParent}'
            ) `
    }

    if (!queryId) {

      try {
        queryId = parseInt(query, 0);
      } catch (e) { }

      if (queryId) {
        wiqlQuery += `
          AND (
              [Target].[System.TeamProject] = @project
              AND (
                [Target].[System.Id] = ${queryId} OR
                (
                  [Target].[System.WorkItemType] = 'Project or Engagement'
                  AND [Target].[System.Title] CONTAINS '${query}'
                )
              )
          ) `;
      } else if (query) {
        wiqlQuery += `
          AND (
              [Target].[System.TeamProject] = @project
              AND [Target].[System.WorkItemType] = 'Project or Engagement'
              AND [Target].[System.Title] CONTAINS '${query}'
          ) `;
      } else {
        wiqlQuery += `
          AND (
              [Target].[System.TeamProject] = @project
              AND [Target].[System.WorkItemType] = 'Project or Engagement'
          ) `;
      }
    }

    let links = await vstsWork.queryByWiql({ query: wiqlQuery }, { project: VSTS_PROJECT }, null, 100);

    let ids = [];
    ids.push.apply(ids, links.workItemRelations.filter(rel => rel.source).map(rel => rel.source.id));
    ids.push.apply(ids, links.workItemRelations.filter(rel => rel.target).map(rel => rel.target.id));
    ids = _.uniq(ids);

    let items = await vstsWork.getWorkItems(ids, ["System.Id", "System.WorkItemType", "System.Title"]);

    let workItems = {};
    items.forEach(wi => workItems[wi.id] = wi);

    let parentLinks = {};
    links.workItemRelations.filter(rel => rel.target).forEach(rel => {
      parentLinks[rel.target.id] = rel.source && rel.source.id || -1;
    });

    res.send({ workItems, parentLinks });

  } catch (e) {
    res.status(500).send(e);
  }
});

router.get('/activities/:user?', async (req, res) => {

  if (!req.user) { return res.status(500).send({ error: 'Not Authenticated' }); }
  let { user } = req.params;

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let links = await vstsWork.queryByWiql({
      query: `
        SELECT
            [System.Id], [System.WorkItemType], [System.Title], [System.AreaPath], [System.AssignedTo],
            [System.State], [System.Tags], [CSEngineering.ActivityStartDate], [CSEngineering.ActivityDuration]
        FROM workitemLinks
        WHERE
            (
                [Source].[System.TeamProject] = @project
                AND [Source].[System.WorkItemType] <> ''
            )
            AND (
                [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            )
            AND (
                [Target].[System.TeamProject] = @project
                AND [Target].[System.Title] <> 'Please Delete'
                AND [Target].[System.AssignedTo] = '${user || req.user.upn}'
            )
        MODE (Recursive, ReturnMatchingChildren)
      `
    }, { project: VSTS_PROJECT });

    let ids = [];
    ids.push.apply(ids, links.workItemRelations.filter(rel => rel.source).map(rel => rel.source.id));
    ids.push.apply(ids, links.workItemRelations.filter(rel => rel.target).map(rel => rel.target.id));
    ids = _.uniq(ids);
    
    let fromIndex = 0;
    let workItems = {};
    while (ids.length > fromIndex) {
      let iterationIds = ids.slice(fromIndex, fromIndex + VSTS_ITERATION_LIMIT);
      let items = await vstsWork.getWorkItems(iterationIds, FIELDS);
      
      items.forEach(wi => workItems[wi.id] = wi);

      fromIndex += VSTS_ITERATION_LIMIT;
    }

    let parentLinks = {};
    links.workItemRelations.filter(rel => rel.target).forEach(rel => {
      parentLinks[rel.target.id] = rel.source && rel.source.id || -1;
    });

    res.send({ workItems, parentLinks });
  } catch (e) {
    res.error(e);
  }
});

router.post('/activities/:id', async (req, res) => {

  let itemId = req.params.id;
  let { item, parentId } = req.body;
  let vstsItem = null;
  let wijson = null;

  try {

    let vstsWork = await connect.getWorkItemTrackingApi();

    if (parentId && parentId !== -1) {

      // Get work item relations to delete old parent link
      let vstsItem = await vstsWork.getWorkItem(item.id, null, null, workItemTrackingInterfaces.WorkItemExpand.Relations);

      // Find parent links
      if (vstsItem && vstsItem.relations) {
        let parentLinkIndex = vstsItem.relations.findIndex(rel => 
            rel.rel === 'System.LinkTypes.Hierarchy-Forward' || rel.rel === 'System.LinkTypes.Hierarchy-Reverse');
        if (parentLinkIndex >= 0) {
          // Requesting to delete the relationship
          wijson = [{ "op": "remove", "path": "/relations/" + parentLinkIndex }];
          vstsItem = await vstsWork.updateWorkItem(null, wijson, item.id);
        }
      }

      // Requesting to create a new parent link
      wijson = [{ 
        "op": "add", 
        "path": "/relations/-", 
        "value": {
          "rel": "System.LinkTypes.Hierarchy-Forward",
          "url": `${VSTS_COLLECTION_URL}/${VSTS_PROJECT}/_apis/wit/workItems/${item.id}`
        }
      }];

      let vstsParentItem = await vstsWork.updateWorkItem(null, wijson, parentId);
    }

    // Update item fields
    wijson = createWorkItemUpdate(item);
    vstsItem = await vstsWork.updateWorkItem(null, wijson, itemId);

    res.send(vstsItem);
  } catch (e) {
    res.status(500).send({ error: 'There was a problem updating the work item', e });
  }
});

router.put('/activities', async (req, res) => {

  let { item, parentId } = req.body;

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let wijson = createWorkItemUpdate(item);
    let vstsItem = await vstsWork.createWorkItem(null, wijson, VSTS_PROJECT, item.fields["System.WorkItemType"]);

    if (parentId && parentId !== -1) {

      // Requesting to create a new parent link
      wijson = [{ 
        "op": "add", 
        "path": "/relations/-", 
        "value": {
          "rel": "System.LinkTypes.Hierarchy-Forward",
          "url": `${VSTS_COLLECTION_URL}/${VSTS_PROJECT}/_apis/wit/workItems/${vstsItem.id}`
        }
      }];

      let vstsParentItem = await vstsWork.updateWorkItem(null, wijson, parentId);
    }

    res.send(vstsItem);
  } catch (e) {
    res.error(e);
  }
});

module.exports = {
  router
}