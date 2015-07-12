'use strict';

import './index.html';
import 'babel-core/polyfill';

import React, {Component} from 'react';
import SFData from './service/sfdata.es6';

import TileList from './components/tiles.jsx';
import SyncProgress from './components/syncprogress.jsx';

var sfd = new SFData ({
  host: _sfdccreds.host,
  access_token: _sfdccreds.session_api},
  [
    {
      sObject: "QuickView__c",
      primaryField: 'Name',
      allFields: ["Id", "Name", "Actual__c", "Target__c", "Report__r.Visual_Type__c", "Report__c"],
      indexSpec:[{"path":"Id","type":"string"},{"path":"Name","type":"string"},{"path":"Report__c","type":"string"}]
    },
    {
      sObject: "Tiles__c",
      primaryField: 'Name',
      syncQuery: "select Id, Name, Tile_Colour__c, Tile_Icon__c, Parent_Filter__c, Function__c, Status__c, Order__c, (select name, id, report__r.Id, report__r.Name, report__r.summary__c, report__r.actual__c, report__r.target__c, report__r.difference__c, report__r.Source__c, report__r.Status__c from Associated_Reports__r where report__r.Status__c = 'Published' ) from Tiles__c where Status__c = 'Published' order by Order__c asc",
      allFields: ["Id", "Name", "Tile_Colour__c", "Tile_Icon__c", "Parent_Filter__c", "Function__c", "Status__c", "Order__c"],
      indexSpec:[{"path":"Id","type":"string"},{"path":"Status__c","type":"string"},{"path":"Parent_Filter__c","type":"string"},{"path":"Order__c","type":"string"}],
      shapeData: TileList.shapeData
    }
  ]);

document.getElementById("app").innerHTML =  'waiting for deviceready ' + window.location.href;
document.addEventListener('deviceready', function() {
  document.getElementById("app").innerHTML =  'got cordova deviceready';
  sfd.cordovaReady(window.cordova).then (() => {
      React.render(
        <div>
          <div><br/>Device Ready</div>
          <SyncProgress sfd={sfd}/>
          <TileList/>
        </div>,  document.getElementById('app'));
  }, (error) => {
      document.getElementById("app").innerHTML =  'error ' + error;
  });
});

if (window.location.href.indexOf ('localhost') >0) {
  sfd.webReady(_sfdccreds).then (() => {
    React.render(
      <div>
        <div><br/>Running in localhost {window.location.href}</div>
        <SyncProgress sfd={sfd}/>
        <TileList/>
      </div>,  document.getElementById('app'));
  });
}
