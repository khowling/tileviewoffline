'use strict';

import './index.html';
import 'babel-core/polyfill';

import React, {Component} from 'react';
import SFData from './service/sfdata.es6';

import TileList from './components/tiles.jsx';
import SyncProgress from './components/syncprogress.jsx';


class App extends Component {

  constructor () {
    super();
    this.factories = {};
    this.createFactories (TileList);

    this.sfd = new SFData ({
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
          syncQuery: "select Id, Name, Tile_Colour__c, Tile_Icon__c, Parent_Filter__c, Function__c, (select name, id, report__r.Id, report__r.Name, report__r.summary__c, report__r.actual__c, report__r.target__c, report__r.difference__c, report__r.Source__c, report__r.Status__c from Associated_Reports__r where report__r.Status__c = 'Published' ) from Tiles__c where Status__c = 'Published' order by Order__c asc",
          allFields: ["Id", "Name", "Tile_Colour__c", "Tile_Icon__c", "Parent_Filter__c", "Function__c", "Status__c", "Order__c"],
          indexSpec:[{"path":"Id","type":"string"},{"path":"Name","type":"string"},{"path":"Status__c","type":"string"},{"path":"Order__c","type":"string"}],
        }
      ]);

      this.state = {showSync: false, cordovaStatus: 'app starting'};
  }

  createFactories (...comps) {
    for (let mods of comps) {
      //console.log ('import mods : ' + mods);
      if (typeof mods === "function" ) {
          //console.log ('creating factory : ' + mods.name);
          this.factories[mods.name] = React.createFactory(mods);
      }
    }
  }

  componentDidMount() {
    //console.log ('App: add listener for cordova deviceready');
    this.setState ({cordovaStatus: 'add listener'});
    document.addEventListener('deviceready', function() {
      console.log ('got cordova deviceready');
      this.setState ({cordovaStatus: 'got cordova deviceready'});
      this.sfd.cordovaReady(window.cordova). then (() => {
          this.setState ({showSync: true});
      }, (error) => {
          this.setState ({cordovaStatus: error});
      });

    });
  }

  render () {
    return (
      <div>
        { this.state.showSync &&
          <SyncProgress sfd={this.sfd}/>
        }
        <TileList/>
        <div>{this.state.cordovaStatus}</div>
      </div>
    )
  }
}

React.render(<App/>,  document.getElementById('app'));
