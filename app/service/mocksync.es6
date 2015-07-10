'use strict';

export default class MockSync {

  constructor (smartStore, sfconnect) {
    this._smartStore = smartStore;
    this._sfconnect = sfconnect
  }

  syncDown(target, soupName, options, callback) {
    // target {type:"soql", query:"<soql query>"}
    // optinos {mergeMode:Force.MERGE_MODE_DOWNLOAD.OVERWRITE}
    // callback called:
      //  once the sync has started.
      // When the internal REST request has completed
      // After each page of results is downloaded
    console.log ('_syncDown soup : ' + soupName);
    this._sfconnect.query (target.query).then (
       (value) => {
         console.log ('sussess value : ' + value.length);
         this._smartStore.upsertSoupEntriesWithExternalId(soupName, value, "Id",
             function (valueSoup) {
               console.log ('upsert success: ' + JSON.stringify(valueSoup));
               callback ({success: true, recordsSynced: value.length});
             }, function (reasonSoup) {
               console.log ('upsert error: ' + JSON.stringify(reasonSoup));
               callback ({success: false, message: "upsertSoupEntriesWithExternalId: " + JSON.stringify(reasonSoup)});
             });
       }, (reason) => {
         //console.log ('error reason : ' + JSON.stringify(reason));
         callback ({success: false, message: "query: " + JSON.stringify(reason)});
       });

  }

  syncUp (target, soupName, options, callback) {
    // options: {fieldlist:[], mergeMode: “OVERWRITE” }
  }

}
