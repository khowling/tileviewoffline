
'use strict';

import React, {Component} from 'react';
import ProgressBar from 'progressbar.js'

export default class SyncProgress extends Component {

  constructor(props) {
    super(props);
    this.state = {online: true, lastsync: "sync now", syncAvailable: true, syncprogress: 0};
  }

  componentDidMount() {
    this.progressBar = new ProgressBar.Circle(React.findDOMNode(this.refs.syncbar), {
          color: '#FCB03C',
          strokeWidth: 10,
          trailWidth: 10,
          duration: 2000,
          easing: "easeOut",
          text: {
              value: '',
              className: 'text-body--small'
          },
          step: function(state, bar) {
            if (bar.value() > 0)
              bar.setText('' + (bar.value() * 100).toFixed(0) + '');
            else
              bar.setText('');
          }
      });
  }

  openSync() {
    console.log ('open');

    this.props.sfd.syncAll((status) => {
      if (status.progress >0)
        this.progressBar.animate(status.progress);
      else
        this.progressBar.set(0);
      this.setState ({lastsync: status.msg});
    }).then(
      () => {
        this.progressBar.set(0);
        this.setState ({lastsync:  "sync <1m ago"});
        // redirect to homepage, add stime to ensure TileList receives new key, thus gets rebuilt.
        //window.location.href = '/#TileList?stime=' + new Date().getTime();
        this.props.doneRefresh();
      },
      fail => {
        this.setState ({lastsync:  "Error: " + fail});
      });
  }

  render() {
    var self = this;
    var display = this.state.syncAvailable ? 'fixed' : 'none';
    return (
        <div style={{display: display, position: "fixed",  top: "15px",  right: "15px", zIndex: "5"}} >
          <button className="button btn-kh btn-warning" style={{display: "inline-block", paddingLeft: ".5rem"}} onClick={this.openSync.bind(this)}>
            <div style={{display: "inline-block", width: "30px", verticalAlign: "middle", marginRight: "1rem", marginBottom: ".2rem"}} ref="syncbar" />
            <div className="text-heading--label" style={{verticalAlign: "middle", display: "inline-block"}}>{this.state.lastsync}</div>
          </button>
        </div>
    );
  }
}
