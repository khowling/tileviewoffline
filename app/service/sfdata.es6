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
    this._host = creds.host;
    this._access_token = creds.access_token;
    this._soups = soups;
    this._smartStore = new MockStore(this._soups);
    this._smartSync = new MockSync(this._smartStore, this);
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
    });
  }

  syncDownSoup (soupMeta) {
    var promise = new Promise( (resolve, reject) => {
      this._smartSync.syncDown(
        {type:"soql", query:  soupMeta.syncQuery || SFData._buildSOQL (soupMeta.sObject, soupMeta.allFields)},
        soupMeta.sObject,
        {mergeMode:"Force.MERGE_MODE_DOWNLOAD.OVERWRITE"},
        (syncDownValue) => {
          if (syncDownValue.success) {
            resolve(syncDownValue.recordsSynced);
          } else {
            reject(syncDownValue.message);
          }
        })
    });
    return promise;
  }

  queryLocal(obj, fields , where) {
    var promise = new Promise( (resolve, reject) => {

      let qspec;
      let smartqsl;

      let soup = this._soups.find (s => s.sObject === obj ),
          smartstore = this._smartStore;

      if (!soup) reject("Object not found");

      if (!where || where.length == 0) {
        console.log ('offline search running buildAllQuerySpec : ' + soup.primaryField);
        qspec = smartstore.buildAllQuerySpec (soup.primaryField, null, 100);
      }
      else if (where.length == 1 && where[0].equals) {
        console.log ('offline search running buildExactQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        qspec = smartstore.buildExactQuerySpec (where[0].field, where[0].equals, null, 100);
      }
      else if (where.length == 1 && where[0].like) {
        console.log ('offline search running buildLikeQuerySpec : ' + where[0].field + ' = ' + where[0].equals);
        qspec = smartstore.buildLikeQuerySpec (where[0].field, where[0].like + "%", null, 100);
      }
      else {
        // SmartQuery requires Everyfield to be indexed & ugly post processing ! the others do not!
        smartqsl = SFData._buildSOQL (soup.sObject, fields, null, null, true);
        console.log ('offline search running smartqsl : ' + smartqsl);
        qspec = smartstore.buildSmartQuerySpec(smartqsl, 100);
      }

      var success = function (val) {
        //console.log ('querySoup got data ' + JSON.stringify(val));
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
        //console.log ('queryLocal() runSmartQuery ' + qspec);
        smartstore.runSmartQuery(qspec, success, error);
      } else {
        //console.log ('queryLocal() querySoup ' + qspec);
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
            reject(this.statusText);
          }
        };
        client.onerror = function () {
          reject(this.statusText);
        };
      });
      return promise;
  }

  cordovaReady (cordova) {
    console.log ('running cordovaReady');

    this.cordova = cordova;
    //_sfdcoauth = cordova.require("com.salesforce.plugin.oauth");
    this._smartStore = cordova.require("com.salesforce.plugin.smartstore");
    this._bootstrap = cordova.require("com.salesforce.util.bootstrap");
    this._smartSync = cordova.require("com.salesforce.plugin.smartsync");

    this.isOnline = _bootstrap.deviceIsOnline();
    /*
    document.addEventListener("online", function() {
    	console.log ("online addEventListener");
    	_setOnline (true, true);  }, false);
    document.addEventListener("offline", function() {
    	console.log ("offline addEventListener");
    	_setOnline ( false, true);  }, false);
    */

    var promise = new Promise( (resolve, reject) => {
    this._smartStore.registerSoup(this._soups[0].sObject, this._soups[0].indexSpec,
      (success) => {
        this._smartStore.registerSoup(this._soups[1].sObject, this._soups[1].indexSpec,
          (success) => {
            resolve();
          }, (error) => {
            reject(error);
          });
      }, (error) => {
        reject(error);
      });
    });
    return promis;

    /*
    setupOauthCreds(_sfdcoauth).then (function () {
    	console.log ('calling registerSoups');
    	registerSoups (_smartstore).then ( function () {
    		console.log  ('done, resolve cordova init');
    		navigator.splashscreen.hide();
    		resolveCordova (cordova);
    	})
    });
    */
  }
}
