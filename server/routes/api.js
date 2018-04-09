const vsts = require('vso-node-api');
const ba = require('vso-node-api/BuildApi');
const bi = require('vso-node-api/interfaces/BuildInterfaces');
const _ = require('lodash');

const express = require('express');
const router = new express.Router();

const VSTS_COLLECTION_URL = process.env.API_URL;
const VSTS_AUTH_TOKEN = process.env.API_TOKEN; 
const VSTS_PROJECT = process.env.API_PROJECT;
const VSTS_ITERATION_LIMIT = 200;

let authHandler = vsts.getPersonalAccessTokenHandler(VSTS_AUTH_TOKEN); 
let connect = new vsts.WebApi(VSTS_COLLECTION_URL, authHandler);    

router.get('/', (req, res) => {

  res.send({ status: 'ok' });
});

router.get('/activities', async (req, res) => {

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    //let defs = await vstsWork.getWorkItems([620839]);

    let defs = await vstsWork.queryByWiql({
      query: `
        Select [System.Id], [Title], [System.State] 
        From WorkItems 
        Where ([System.WorkItemType] = 'Activity' OR [System.WorkItemType] = 'Participant') AND
              [System.AssignedTo] = @Me AND [Title] <> 'Please Delete' AND
              [State] <> 'Removed'
      `
    }, { project: VSTS_PROJECT });

    let ids = defs.workItems.map(workItem => workItem.id);
    let fields = [
      "System.Id",
      "System.WorkItemType",
      "System.Title",
      "System.State",
      "System.AreaPath",
      "System.IterationPath",
      "CSEngineering.ActivityType",
      "CSEngineering.ActivityStartDate",
      "CSEngineering.ActivityDuration",
      "CSEngineering.ParticipationStartDate",
      "CSEngineering.ParticipationDurationDays"
    ];

    let fromIndex = 0;
    let allWorkItems = [];
    while (ids.length > fromIndex) {
      let iterationIds = ids.slice(fromIndex, fromIndex + VSTS_ITERATION_LIMIT);
      let workItems = await vstsWork.getWorkItems(iterationIds, fields);
      allWorkItems.push.apply(allWorkItems, workItems);

      fromIndex += VSTS_ITERATION_LIMIT;
    }

    res.send(allWorkItems);
  } catch (e) {
    res.error(e);
  }
});

router.post('/activities/:id', async (req, res) => {

  let itemId = req.params.id;
  let item = req.body.item;

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let wijson = [
      { "op": "add", "path": "/fields/System.Title", "value": item.fields["System.Title"] },
      { "op": "add", "path": "/fields/CSEngineering.ActivityStartDate", "value": item.fields["CSEngineering.ActivityStartDate"] },
      { "op": "add", "path": "/fields/CSEngineering.ActivityDuration", "value": item.fields["CSEngineering.ActivityDuration"] }
    ];

    item = await vstsWork.updateWorkItem(null, wijson, itemId);

    res.send(item);
  } catch (e) {
    res.error(e);
  }
});

router.get('/orgtree', async (req, res) => {

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let defs = await vstsWork.queryByWiql({
      query: `
        Select [System.Id], [Title], [System.State] 
        From WorkItems 
        Where ([System.WorkItemType] = 'Activity' OR [System.WorkItemType] = 'Participant') AND
              [System.AssignedTo] = @Me AND [Title] <> 'Please Delete' AND
              [State] <> 'Removed'
      `
    }, { project: VSTS_PROJECT });

    let ids = defs.workItems.map(workItem => workItem.id);
    let fields = [
      "System.Id",
      "System.WorkItemType",
      "System.Title",
      "System.State",
      "System.AreaPath",
      "System.IterationPath",
      "CSEngineering.ActivityType",
      "CSEngineering.ActivityStartDate",
      "CSEngineering.ActivityDuration",
      "CSEngineering.ParticipationStartDate",
      "CSEngineering.ParticipationDurationDays"
    ];

    let fromIndex = 0;
    let allWorkItems = [];
    while (ids.length > fromIndex) {
      let iterationIds = ids.slice(fromIndex, fromIndex + VSTS_ITERATION_LIMIT);
      let workItems = await vstsWork.getWorkItems(iterationIds, fields);
      allWorkItems.push.apply(allWorkItems, workItems);

      fromIndex += VSTS_ITERATION_LIMIT;
    }

    res.send(allWorkItems);
  } catch (e) {
    res.error(e);
  }
});

function addItemFieldToArray(arr, item, field) {
  if (item.fields[field]) {
    arr.push({ "op": "add", "path": "/fields/" + field, "value": item.fields[field] });;
  }
}

router.put('/activities', async (req, res) => {

  let item = req.body.item;

  try {
    let vstsWork = await connect.getWorkItemTrackingApi();

    let wijson = [];
    addItemFieldToArray(wijson, item, "System.Title");
    addItemFieldToArray(wijson, item, "CSEngineering.ActivityStartDate");
    addItemFieldToArray(wijson, item, "CSEngineering.ActivityDuration");
    addItemFieldToArray(wijson, item, "CSEngineering.ActivityType");
    addItemFieldToArray(wijson, item, "System.State");
    addItemFieldToArray(wijson, item, "System.AreaPath");
    addItemFieldToArray(wijson, item, "System.IterationPath");
    addItemFieldToArray(wijson, item, "CSEngineering.ParticipationStartDate");
    addItemFieldToArray(wijson, item, "CSEngineering.ParticipationDurationDays");

    item = await vstsWork.createWorkItem(null, wijson, VSTS_PROJECT, item.fields["System.WorkItemType"]);

    res.send(item);
  } catch (e) {
    res.error(e);
  }
});

module.exports = {
  router
}