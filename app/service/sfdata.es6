'use strict';

import MockStore from './mockstore.es6';
import MockSync from './mocksync.es6';

let instance = null;
const SF_API_VERSION = '/services/data/v32.0';
export default class SFData {


  constructor (creds, soups) {
    if (instance) {
      throw "SFData() only allow to construct once";
    }
    this._soups = soups;
    instance = this;
  }

  static get instance() {
    if (!instance) throw "SFData() need to construct first";
    return instance;
  }



  static _buildSOQL (obj, fields, where, orderby, soupQuery) {
    let qstr = "SELECT " + fields.map(f => soupQuery? "{" + obj + ":" + f + "}" : f).join(', ') + " FROM " + (soupQuery? "{" + obj + "}" : obj);
    if (where) {
      let wildcard = soupQuery ? "%" : "%25";
      qstr += " WHERE " + where.map(i =>
        i.field +
        i.contains && (" LIKE '" + wildcard + i.contains + wildcard + "'") ||
        i.like && (" LIKE '" + i.like + wildcard + "%'") ||
        i.equals && (" = '" + i.equals + "'") || ''
        ).join(' AND ');
    }
    if (orderby)
      qstr += " ORDER BY " + soupQuery? "{" + obj + ":" + orderby + "}" : orderby ;
    console.log ('_buildSOQL: ' + qstr);
    return qstr;
  }

  syncAll (progressCallback) {
    progressCallback({progress: 0.5, msg: this._soups[0].sObject});
    this.syncDownSoup (this._soups[0]).then ( (success) => {
      progressCallback({progress: 1, msg: this._soups[1].sObject});
      this.syncDownSoup (this._soups[1]).then ( (success) => {
        progressCallback({progress: 0, msg: "last sync just now"});
      }, function (fail) {
        progressCallback({progress: -1, msg: "Error: " + fail});
      });
    }, function (fail) {
      progressCallback({progress: -1, msg: "Error: " + fail});
    });
  }

  syncDownSoup (soupMeta) {
    var promise = new Promise( (resolve, reject) => {
      this._smartSync.syncDown(
        {type:"soql", query:  soupMeta.syncQuery || SFData._buildSOQL (soupMeta.sObject, soupMeta.allFields)},
        soupMeta.sObject,
        {},
        (syncDownValue) => {
          console.log ('syncDown Val: ' + JSON.stringify(syncDownValue));
          resolve (syncDownValue);
        }, (err) => {
          console.log ('syncDown error: ' + JSON.stringify(err));
          reject(err);
        });
    });
    return promise;
  }

  queryLocal(obj, fields , where) {
    var promise = new Promise( (resolve, reject) => {

      let qspec;
      let smartqsl = false;

      let soup = this._soups.find (s => s.sObject === obj ),
          smartstore = this._smartStore;

      if (!soup) reject("Object not found");

      if (!where || where.length == 0) {
        console.log ('offline search running buildAllQuerySpec : ' + soup.primaryField);
        qspec = smartstore.buildAllQuerySpec (soup.primaryField, 'ascending', 400);
      }
      else if (where.length == 1 && where[0].equals) {
        console.log ('offline search running buildExactQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        qspec = smartstore.buildExactQuerySpec (where[0].field, where[0].equals, 'ascending', 400);
      }
      else if (where.length == 1 && where[0].like) {
        console.log ('offline search running buildLikeQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        qspec = smartstore.buildLikeQuerySpec (where[0].field, where[0].like + "%", 'ascending', 400);
      }
      else {
        // SmartQuery requires Everyfield to be indexed & ugly post processing ! the others do not!
        smartqsl = SFData._buildSOQL (soup.sObject, fields, null, null, true);
        console.log ('offline search running smartqsl : ' + smartqsl);
        qspec = smartstore.buildSmartQuerySpec(smartqsl, 100);
      }

      var success = function (val) {
        console.log ('querySoup success got data ' + JSON.stringify(val));
        if (smartqsl) { // using smartSQL, need to do some reconstruction UGH!!!
          var results = [];
          for (var rrecidx in val.currentPageOrderedEntries) {
            var res = {},
              rrec = val.currentPageOrderedEntries[rrecidx];
            for (var fidx in fields) {
              res[fields[fidx]] = rrec[fidx];
            }
            results.push (res);
          }
          resolve(results);
        } else {
          resolve(val.currentPageOrderedEntries);
        }
      }

      var error = function (val) {
        //console.log  ('querySoup error ' + JSON.stringify(val));
        reject(val);
      }

      if (smartqsl) {
        console.log ('queryLocal() runSmartQuery ' + qspec);
        smartstore.runSmartQuery(qspec, success, error);
      } else {
        console.log ('queryLocal() querySoup: ' + soup.sObject + ' : ' + JSON.stringify(qspec));
        smartstore.querySoup(soup.sObject, qspec, success, error);
      }

    });
    return promise;
  }

  query(soql) {
    // Creating a promise
      var promise = new Promise( (resolve, reject) => {
        // Instantiates the XMLHttpRequest
        var client = new XMLHttpRequest();
        client.open('GET', this._host + SF_API_VERSION + '/query.json?q=' + encodeURIComponent(soql));
        client.setRequestHeader ("Authorization", "OAuth " + this._access_token);
        client.send();
        client.onload = function () {
          if (this.status == 200) {
            // Performs the function "resolve" when this.status is equal to 200
            //console.log ('got records : ' + this.response);
            resolve(JSON.parse(this.response).records);
          } else {
            // Performs the function "reject" when this.status is different than 200
            reject("Response Error:" + this.statusText);
          }
        };
        client.onerror = function (e) {
          reject("Network Error: " + this.statusText);
        };
      });
      return promise;
  }

  cordovaReady (cordova) {
    return new Promise( (resolve, reject) => {
      console.log ('running cordovaReady');

      try {
        this.cordova = cordova;
        this._oauth = cordova.require("com.salesforce.plugin.oauth");
        this._smartStore = cordova.require("com.salesforce.plugin.smartstore");
        this._bootstrap = cordova.require("com.salesforce.util.bootstrap");

        this._smartSync = new MockSync(this._smartStore, this);
    //  this._smartSync = cordova.require("com.salesforce.plugin.smartsync");

      //  this.isOnline = this._bootstrap.deviceIsOnline();

        /*
        document.addEventListener("online", function() {
        	console.log ("online addEventListener");
        	_setOnline (true, true);  }, false);
        document.addEventListener("offline", function() {
        	console.log ("offline addEventListener");
        	_setOnline ( false, true);  }, false);
        */

        this._smartStore.registerSoup(this._soups[0].sObject, this._soups[0].indexSpec,
          (success) => {
            console.log ('registerSoup success: ' + this._soups[0].sObject);
            this._smartStore.registerSoup(this._soups[1].sObject, this._soups[1].indexSpec,
              (success) => {
                console.log ('registerSoup success: ' + this._soups[1].sObject);
                this._oauth.getAuthCredentials((JsonCredentials) => {
                    console.log ('JsonCredentials: ' + JSON.stringify(JsonCredentials));
                    this._host = JsonCredentials.instanceUrl;
                    this._access_token = JsonCredentials.accessToken;
                    resolve();
                  }, (authError) => {
                    reject(authError);
                  });
              }, (error) => {
                reject(error);
              });
          }, (error) => {
            reject(error);
          });
      } catch (e) {
        reject (e);
      }
    });
  }

  webReady(creds) {
    return new Promise( (resolve, reject) => {
      this._host = creds.host;
      this._access_token = creds.session_api;
      this._smartStore = new MockStore(this._soups);
      this._smartSync = new MockSync(this._smartStore, this);
      resolve();
    });
  }
}
