'use strict';

import React, {Component} from 'react';
import { range, seq, compose, map, filter } from 'transducers.js';

export default class Router extends Component {

    static getURLNav (lnkhash) {
      var gethash = lnkhash || decodeURI(
        // We can't use window.location.hash here because it's not
        // consistent across browsers - Firefox will pre-decode it!
        // window.location.pathname + window.location.search
        window.location.href.split('#')[1] || ''
      ) || 'TileList';
      console.log ('App _getURLNav url changed : ' + gethash);
      let [comp, parms] = gethash.split('?');
      let paramjson = {};
      if (typeof parms !== 'undefined') {
        let tfn = x => {
          let [n, v] = x.split('=');
          paramjson[n] = v;
          };

        if (parms.indexOf ('&') > -1)
          parms.split('&').map (tfn);
        else
          tfn (parms);
      }
      return ({hash: comp, params: paramjson});
    }

    static setupRouterfunction (onPopState) {
      if (true) { // use HTML5 history
        if (window.addEventListener) {
          window.addEventListener('popstate', onPopState, false);
        } else {
          window.attachEvent('popstate', onPopState);
        }
      } else {
        if (window.addEventListener) {
          window.addEventListener('hashchange', onHashChange, false);
        } else {
          window.attachEvent('onhashchange', onHashChange);
        }
      }
    }

    constructor (props) {
      super (props);
      console.log ('Router() Initialising...');
      Router.setupRouterfunction ( () => {
        var newComp = Router.getURLNav();
        console.log ('App url changed : ' + JSON.stringify(newComp));
        var cflt = newComp.params.cflt,
            lbl = newComp.params.lbl,
            newBreadcrums = [];

        if (cflt && cflt !== 'TOP') {

          var foundit = false,
              inhistory = seq(this.state.breadcrumbs, filter(function(bc) {
                  if (foundit == false && bc.Id == cflt) {
                      foundit = true; return foundit;
                  } else return !foundit}));
          if (foundit) {
              newBreadcrums = inhistory;
          } else {
              newBreadcrums = this.state.breadcrumbs.concat({Id: cflt, Name: lbl});
          }
        }
        this.setState ({renderThis: newComp.hash, urlparam: newComp.params, breadcrumbs: newBreadcrums});
      });

      var newComp = Router.getURLNav();
      console.log ('App Initial URL : ' + JSON.stringify(newComp));
      //this.props.updateRoute (newComp.hash);
      this.state =  {renderThis: newComp.hash, urlparam: newComp.params, breadcrumbs: []};
    }

    componentWillReceiveProps(nextProp) {
      if (nextProp.forceRoute) {
        this.state =  {renderThis: 'TileList', urlparam: {tstamp: nextProp.forceRoute}, breadcrumbs: []};
      }
    }

    render() {
      console.log ('Router() Rendering new Component: ' + this.state.renderThis);
      let Routefactory = this.props.componentFactories[this.state.renderThis];
      if (Routefactory) {
          return Routefactory(
            Object.assign({key: JSON.stringify(this.state.urlparam)}, this.state.urlparam, {breadcrumbs: this.state.breadcrumbs}));
      } else return (
          <div>404 {this.state.renderThis}</div>
      )
    }
}
