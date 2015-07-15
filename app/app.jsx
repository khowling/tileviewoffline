'use strict';

import './index.html';
import 'babel-core/polyfill';

import React, {Component} from 'react';
import SFData from './service/sfdata.es6';
import Router from './components/router.jsx';

import TileList from './components/tiles.jsx';
import SyncProgress from './components/syncprogress.jsx';


class App extends Component {
  constructor () {
    super();
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
            syncQuery: "select Id, Name, Tile_Colour__c, Tile_Icon__c, Parent_Filter__c, Function__c, Status__c, Order__c, (select name, id, report__r.Id, report__r.Name, report__r.summary__c, report__r.actual__c, report__r.target__c, report__r.difference__c, report__r.Source__c, report__r.Status__c, report__r.Document_ID__c from Associated_Reports__r where report__r.Status__c = 'Published' ) from Tiles__c where Status__c = 'Published' order by Order__c asc",
            allFields: ["Id", "Name", "Tile_Colour__c", "Tile_Icon__c", "Parent_Filter__c", "Function__c", "Status__c", "Order__c"],
            indexSpec:[{"path":"Id","type":"string"},{"path":"Status__c","type":"string"},{"path":"Parent_Filter__c","type":"string"},{"path":"Order__c","type":"string"}],
            shapeData: TileList.shapeData
          }
        ]);

    this.routeFactories = App.createFactories (TileList);
    this.state = {booted: false, bootmsg: 'booting'};
  }

  static createFactories (...comps) {
    let factories = [];
    for (let mods of comps) {
      //console.log ('import mods : ' + mods);
      if (typeof mods === "function" ) {
        //console.log ('creating factory : ' + mods.name);
        factories[mods.name] = React.createFactory(mods);
      }
    }
    return factories;
  }

  componentWillMount() {
    console.log ('APP componentWillMount: setting up services');
    if (this.props.cordova) {
      //this.setState ({ bootmsg:  'got cordova deviceready'});
      this.sfd.cordovaReady(this.props.cordova).then (() => {
          this.setState ({ booted: true, bootmsg: 'cordova ready'});
      }, (error) => {
          this.setState ({ bootmsg: 'error ' + error});
      });
    };

    if (this.props.sfdccreds) {
      this.setState ({ bootmsg:  'got localhost'});
      this.sfd.webReady(this.props.sfdccreds).then (() => {
          this.setState ({ booted: true, bootmsg: 'local ready'});
        }, (error) => {
            this.setState ({ bootmsg: 'error ' + error});
        });
    }

  }

  doneRefresh() {
    console.log ('APP SyncProgress says its finished');
    //this.forceUpdate();
    this.setState({forceRoute: new Date().getTime()});
  }

  render() {
    console.log ('APP rendering: ' + this.state.bootmsg);
    if (this.state.booted) {
      return (
        <div>
          <SyncProgress sfd={this.sfd} doneRefresh={this.doneRefresh.bind(this)}/>
          <Router componentFactories={this.routeFactories} forceRoute={this.state.forceRoute}/>
        </div>
      );
    } else return (
      <div>{this.state.bootmsg}</div>
    );
  }
}
document.getElementById("app").innerHTML =  'waiting for deviceready ' + window.location.href;
document.addEventListener('deviceready', function() {
      React.render(<App cordova={window.cordova}/>,  document.getElementById('app'));
});

if (window.location.href.indexOf ('localhost') >0) {
    React.render(<App sfdccreds={_sfdccreds}/>,  document.getElementById('app'));
}
