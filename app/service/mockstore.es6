'use strict';

export default class MockStore {

  constructor(soups) {
    if (window.localStorage)
      this._store = window.localStorage;
    else {
      this._store = {};
    // register soups
      soups.forEach(s => this._store[s.sObject] = JSON.stringify([]));
    }
  }

  _find (obj, key, val) {
    var sobjs = this._store[obj]? JSON.parse(this._store[obj]) : [];
    if (val) {
        //console.log ('_find, for each existing record ' + sobjs.length);
      for (var i in sobjs) {
        var r = sobjs[i];
        //console.log ('_find, testing ' + r[key] + ' == ' + val);
        if (r[key] == val) {
          return i;
        }
      }
    }
    return -1;
  }

  upsertSoupEntriesWithExternalId  (obj, records, keyfld, success, error) {
    //console.log ('SFDCMockStore upsertSoupEntriesWithExternalId '+obj+' on : ' + keyfld);
    var sobjs = this._store[obj]? JSON.parse(this._store[obj]) : [];
    for (var r in records) {
      var rec = records[r];
      var exist = this._find(obj, keyfld, rec[keyfld]);
      if (exist == -1) {
        //console.log ('SFDCMockStore upsertSoupEntriesWithExternalId, inserting key record: ' + rec[keyfld]);
        rec._soupEntryId = sobjs.length +1;
        sobjs.push (rec);
      } else {
        //console.log ('SFDCMockStore upsertSoupEntriesWithExternalId, updating existing key : ' + rec[keyfld]);
        // sobjs[exist] = rec
        // real store merges the data!
        for (var elidx in rec) {
          sobjs[exist][elidx] = rec[elidx];
        }
      }
    }
    this._store[obj] = JSON.stringify(sobjs);
    success (records);
  }

  registerSoup (sname, idxes, success, error) {
    console.log ('SFDCMockStore registerSoup : ' + sname);
    this._store[sname] = JSON.stringify([]);
    success();
  }

  removeSoup (sname, success, error) {
    console.log ('SFDCMockStore removeSoup : ' + sname);
    this._store.removeItem(sname);
    success();
  }

  upsertSoupEntries (obj, records, success, error) {
    this.upsertSoupEntriesWithExternalId (obj, records, "_soupEntryId", success, error);
  }


  buildAllQuerySpec (field, order, limit) {
    return {};
  }

  buildExactQuerySpec (field, equals, order, limit) {
    return {"field": field, "equals": equals};
  }

  buildLikeQuerySpec (field, like, order, limit) {
    return {"field": field, "like": like.substring(0, like.length -1)};
  }

  buildSmartQuerySpec (smartqsl, limit) {
    return {"smartsql": smartqsl};
  }

  runSmartQuery (qspec, success,error) {
    // TODO
  }

  querySoup  (obj, qspec, success,error) {
    console.log ('SFDCMockStore querySoup : ' + obj +' : ' + JSON.stringify (qspec));
    var sobjs = JSON.parse(this._store[obj]);
    if (!qspec.field) {
      success ( {currentPageOrderedEntries: Array.from (sobjs)});
    } else if (qspec.field) {

      var res = [];
      for (var r in sobjs) {
        var rec = sobjs[r];
        var cval = rec[qspec.field];
        if (cval) {
          if (qspec.like && cval.indexOf(qspec.like) > -1) {
            res.push (rec);
          } else if (qspec.equals && qspec.equals == cval) {
            res.push (rec);
          }
        }
      }
      success( {currentPageOrderedEntries: Array.from (res)});
    } else {
      success ({currentPageOrderedEntries:[]});
    }
  }
}
