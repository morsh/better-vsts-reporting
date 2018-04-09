
const vsts = require('vso-node-api');
const ba = require('vso-node-api/BuildApi');
const bi = require('vso-node-api/interfaces/BuildInterfaces');
const _ = require('lodash');

// your collection url
let collectionUrl = "https://cseng.visualstudio.com";

// ideally from config
let token = "35ctrcehlo5eh2gtne73evz4ql55osl3qcxq76gwwbnyubn56kjq"; 

let authHandler = vsts.getPersonalAccessTokenHandler(token); 
let connect = new vsts.WebApi(collectionUrl, authHandler);    

async function run() {
    let project = 'CSEng';

    try {
      let vstsWork = await connect.getWorkItemTrackingApi();

      //let defs = await vstsWork.getWorkItems([620839]);

      let defs = await vstsWork.queryByWiql({
        query: `
          Select [System.Id], [Title], [System.State] 
          From WorkItems 
          Where ([System.WorkItemType] = 'Activity' OR [System.WorkItemType] = 'Participant') AND
                [System.AssignedTo] = @Me AND 
                [State] <> 'Removed'
        `
      }, { project });

      let ids = defs.workItems.map(workItem => workItem.id);
      let fields = [
        "System.Id",
        "System.WorkItemType",
        "System.Title",
        "System.State",
        "System.AreaPath",
        "System.IterationPath",
        "CSEngineering.ActivityStartDate",
        "CSEngineering.ActivityDuration",
        "CSEngineering.ParticipationStartDate",
        "CSEngineering.ParticipationDurationDays"
      ];

      let allWorkItems = await vstsWork.getWorkItems(ids, fields);
      let a = allWorkItems;

    } catch (e) {
      console.error(e);
    }
}

run();
