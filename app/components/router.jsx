'use strict';

import React, {Component} from 'react';

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
          if (n === 'gid') {
            let [view, id] = v.split (':');
            paramjson.view = view;
            paramjson.id = id;
          } else
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
        //if (newComp !== this.state.renderThis) {
        //this.props.updateRoute (newComp.hash);
        this.setState ({renderThis: newComp.hash, urlparam: newComp.params});
        //};
      });

      var newComp = Router.getURLNav();
      console.log ('App Initial URL : ' + JSON.stringify(newComp));
      //this.props.updateRoute (newComp.hash);
      this.state =  {renderThis: newComp.hash, urlparam: newComp.params, formdata: []};
    }

    render() {
      console.log ('Router() Rendering new Component: ' + this.state.renderThis);
      let Routefactory = this.props.componentFactories[this.state.renderThis];
      if (Routefactory) {
          return Routefactory(
            {key: JSON.stringify(this.state.urlparam),
             urlparam: this.state.urlparam});
      } else return (
          <div>404 {this.state.renderThis}</div>
      )
    }
}
