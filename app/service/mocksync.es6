'use strict';

export default class MockSync {

  constructor (smartStore, sfconnect) {
    this._smartStore = smartStore;
    this._sfconnect = sfconnect
  }

  syncDown(target, soupName, options, success, error) {
    // target {type:"soql", query:"<soql query>"}
    // optinos {mergeMode:Force.MERGE_MODE_DOWNLOAD.OVERWRITE}
    // callback called:
      //  once the sync has started.
      // When the internal REST request has completed
      // After each page of results is downloaded
    console.log ('syncDown soup : ' + soupName);
    this._sfconnect.query (target.query).then (
       (value) => {
         console.log ('sussess value : ' + value.length);
         if (options.shapeData) {
           value = options.shapeData (value);
         }
         this._smartStore.upsertSoupEntriesWithExternalId(soupName, value, "Id",
             function (valueSoup) {
               console.log ('upsert success: ' + JSON.stringify(valueSoup));
               success (value.length);
             }, function (reasonSoup) {
               console.log ('upsert error: ' + JSON.stringify(reasonSoup));
               error ("upsertSoupEntriesWithExternalId: " + JSON.stringify(reasonSoup));
             });
       }, (reason) => {
         console.log ('error reason : ' + JSON.stringify(reason));
         error ("query: " + JSON.stringify(reason));
       });

  }

  syncUp (target, soupName, options, callback) {
    // options: {fieldlist:[], mergeMode: “OVERWRITE” }
  }

}
