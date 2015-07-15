import React, {Component} from 'react/addons';
import { range, seq, compose, map, filter } from 'transducers.js';
import SFData from '../service/sfdata.es6';

import Velocity from 'velocity-animate';
import 'velocity-animate/velocity.ui';

class Report extends Component {
    constructor () {
      super();
      console.log ('TileList InitialState : ');
      this.state = { open: false, quickview: []};
      this.handleCollapse = this.handleCollapse.bind(this);
      this.navToReport = this.navToReport.bind(this);
    }

    handleCollapse  (event) {
        console.log ('handleCollapse event');
        //Find the box parent
        var box = $(event.currentTarget).parents(".box").first();
        //Find the body and the footer
        var bf = box.find(".box-body, .box-footer");
        var self = this;
        if (!box.hasClass("collapsed-box")) {
            box.addClass("collapsed-box");
            //Convert minus into plus
            $(event.currentTarget).children(".fa-minus").removeClass("fa-minus").addClass("fa-plus");
            bf.slideUp();
            box.find(".bar-chart").empty();
            setTimeout( () => self.setState({open: false}), 200);
        } else {
            box.removeClass("collapsed-box");
            //Convert plus into minus
            $(event.currentTarget).children(".fa-plus").removeClass("fa-plus").addClass("fa-minus");
            bf.slideDown();

            console.log ('handleCollapse event, update state: ');

            // get new data!!!
            var rdata = this.props.data.Report__r;
            console.log ('get Quickview for report : ' + rdata.Id);

            self.setState({ loading: true });
            let sf = SFData.instance;
            sf.queryLocal ('QuickView__c', ['Id', 'Name', 'Actual__c', 'Target__c', 'Report__r.Visual_Type__c'], [{field: 'Report__c', equals: rdata.Id}]).then (
              function (value) {
                let viewtype = (value.length > 0) && value[0].Report__r.Visual_Type__c || 'NONE';
                if (viewtype === 'GRAPH') {
                  new Morris.Bar({
                    // ID of the element in which to draw the chart.
                    element: box.find(".bar-chart"),
                    // Chart data records -- each entry in this array corresponds to a point on
                    // the chart.
                    data: value,
                    // The name of the data record attribute that contains x-values.
                    xkey: 'Name',
                    // A list of names of data record attributes that contain y-values.
                    ykeys: ['Actual__c', 'Target__c'],
                    // Labels for the ykeys -- will be displayed when you hover over the
                    // chart.
                    labels: ['Actual', 'Target']
                  });
                }
                setTimeout( () => self.setState({open: true, loading: false, quickview:  value, viewtype: viewtype}), 200);

              }, function (reason) {
                console.log ('reason : ' + JSON.stringify(reason));
              }
            );
        }
    }

    navToReport () {
      var rdata = this.props.data.Report__r,
          sf = SFData.instance,
          localUrl = sf.fileLocation + rdata.Document_ID__c + '.pdf';

      if (rdata.Source__c === 'Salesforce') {
        try {
            console.log ('navToReport got sforce');
            sforce.one.navigateToSObject( id);
        }  catch (e) {

          if (sf.mobileSDK) {
            SitewaertsDocumentViewer.viewDocument(localUrl, 'application/pdf');
          } else if (sf.browserFileSystem) {
            window.open(localUrl, '_blank');
          }
        }
      } else {
        alert ('file source tbc');
      }
    }

    render () {
        console.log ('Report render : ');
        var rdata = this.props.data.Report__r;

        var divStyleHidden =  this.state.open == false && { display: 'none' } || {};
        var cx = React.addons.classSet,
            boxclass = cx({
                "box": true,
                "collapsed-box": this.state.open == false,
                "box-success": rdata.Actual__c >= rdata.Target__c,
                "box-warning": rdata.Actual__c < rdata.Target__c}),
            buttongoodbad = cx({
                "btn-kh btn-sm ": true,
                "btn-success": rdata.Actual__c >= rdata.Target__c,
                "btn-warning": rdata.Actual__c < rdata.Target__c}),
            styleupdown = cx({
                "fa": true,
                "fa-arrow-up text-green": rdata.Actual__c >= rdata.Target__c,
                "fa-arrow-down text-red": rdata.Actual__c < rdata.Target__c});

        //var chatp = {width: "55%"};
        return (
            <div className="col-xs-12 col-sm-6 col-md-4 col-lg-3" style={{display: "none"}}>

                <div className={boxclass}>
                    <div className="box-header" data-toggle="tooltip" title="" data-original-title="Header tooltip">
                        <h3 className="box-title">{rdata.Name} <small>{rdata.Source__c}</small><br/>
                            <small>Actual: <code>{rdata.Actual__c}</code></small>
                            <small>Target: <code>{rdata.Target__c}</code></small>
                            <i className={styleupdown}></i></h3>

                        <div className="box-tools pull-right">
                            <button onClick={this.handleCollapse} className={buttongoodbad} data-widget="collapse"><i className="fa fa-plus"></i></button>
                        </div>
                    </div>
                    <div className="box-body" style={divStyleHidden}>
                        <p>{rdata.Summary__c}
                        </p><br/>
                        <div className="box-body no-padding">

                            <div className="chart-responsive">
                                <div className="chart bar-chart"  style={{'max-height': '300px'}}>
                                </div>
                            </div>

                            { this.state.viewtype == 'TABLE' && (
                            <table className="table table-striped">
                                <tbody>
                                    <tr>
                                        <th className="wdth-l">QuickView</th>
                                        <th>Actual</th>
                                        <th >Target</th>
                                        <th className="wdth-s">Diff</th>
                                    </tr>
                                    {this.state.quickview.map(function(row, i) { return (
                                    <tr>
                                        <td>{row.Name}</td>
                                        <td>
                                            {(row.Actual__c || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            {(row.Target__c || 0).toFixed(2)}
                                        </td>
                                        <td>
                                        {(row.Actual__c - row.Target__c).toFixed(2) }<i className={cx({
                                            "fa": true,
                                            "fa-arrow-up text-green": row.Actual__c >= row.Target__c,
                                            "fa-arrow-down text-red": row.Actual__c < row.Target__c})}></i>
                                          </td>
                                    </tr>
                                    );})}
                              </tbody></table>
                              )}
                        </div><br/>
                    </div>
                    <div className="box-footer" style={divStyleHidden}>

                        <a className="btn-kh  btn-block btn-success" onClick={this.navToReport}>
                            <i className="fa fa-play"></i> Open
                        </a>
                    </div>
                </div>
            </div>
        );
    }
}



class Tile extends Component {

    // This component doesn't hold any state - it simply transforms
    // whatever was passed as attributes into HTML that represents a picture.
    setFilter (id) {
      //onClick={this.setFilter.bind(this, tdata.Id)}
        // When the component is clicked, trigger the onClick handler that
        // was passed as an attribute when it was constructed:
        this.props.onTileClick(id);
    }

    render () {
        var tdata = this.props.data,
            boxclass = "small-box " + tdata.Tile_Colour__c,
            iclass = "ion " + tdata.Tile_Icon__c;

        return (
            <div className="col-xs-12 col-sm-4 col-md-3 col-lg-2" style={{display: "none"}}>
                <a href={"#TileList?cflt="+tdata.Id+"&lbl="+encodeURIComponent(tdata.Name)}  className={boxclass}>
                    <div className="inner">
                        <h3>  {tdata.tcnt}</h3>
                        <p>{tdata.Name}</p>
                    </div>
                    <div className="icon">
                        <i className={iclass}></i>
                    </div>
                    <div  className="small-box-footer">
                        Explore {tdata.Name} <i className="fa fa-arrow-circle-right"></i>
                    </div>
                </a>
            </div>
        );
    }
}

export default class TileList extends Component {

    constructor () {
      super();
      console.log ('TileList constructor');
      this.state =  { breadcrumbs: [], tiles: [], ass_reports: [], loading: false, filter: null, funct: 'All' };
    }

    // Called automatically by Sync
    static shapeData (value) {
      var res = null;
      do {
          console.log ('calling rollup with : ' + JSON.stringify (res));
          res = (function (calcChildTot, recs) {
              let calcParent = {}, firsttime = !calcChildTot;
              for (var tidx in recs) {
                  var tile = recs[tidx];
                  delete tile["attributes"];
                  if (firsttime) {
                      console.log('This is the first time, set tcnt on all tiles to number of child accociated reports')
                      tile.tcnt = tile.Associated_Reports__r && tile.Associated_Reports__r.totalSize || 0;
                  } else if (calcChildTot[tile.Id] > 0 ) {
                      console.log ('Not first time & found a child rollup number for this parent, add it to the tcnt')
                      tile.tcnt = calcChildTot[tile.Id] + (tile.tcnt || 0);
                  }
                  if (tile.tcnt > 0 && tile.Parent_Filter__c && (firsttime || calcChildTot[tile.Id] > 0 )) {
                      console.log ('Need to Calculate Parent of : ' + tile.Name + ' : ' + tile.tcnt);
                      calcParent[tile.Parent_Filter__c] = (firsttime && tile.tcnt || calcChildTot[tile.Id]) + (calcParent[tile.Parent_Filter__c] || 0) ;
                  }
              }
              return calcParent;
          })(res, value);
      } while (Object.keys(res).length >0)
      return value;
    }

    componentDidUpdate() {
        Velocity.animate(
          React.findDOMNode(this.refs.tiles).children,
          "transition.slideLeftIn", { stagger: 50 });
    }

    componentDidMount() {
      let sf = SFData.instance,
          level = this.props.cflt || 'TOP',
          newState = {};

      console.log ('TileList componentDidMount ()');
      sf.queryLocal ('Tiles__c', ['Id', 'Name', 'Tile_Colour__c', 'Tile_Icon__c', 'Parent_Filter__c', 'Function__c'], [{field: 'Parent_Filter__c', equals: level}]).then ((value) => {
        //console.log ('queryLocal success value : ' + JSON.stringify(value));
        newState.tiles = value;
        if  (level == 'TOP') {
          //console.log ('TileList componentDidMount, setState : ' + JSON.stringify(newState));
          this.setState(newState);
        } else {
          // get Associated_Reports__r
          sf.queryLocal ('Tiles__c', ['Id', 'Associated_Reports__r'], [{field: 'Id', equals: level}]).then ((value) => {
            if (value[0].Associated_Reports__r) {
              newState.ass_reports = value[0].Associated_Reports__r.records;
            }
            //console.log ('TileList componentDidMount, setState : ' + JSON.stringify(newState));
            this.setState(newState);
          }, (err) => {
              console.log ('queryLocal ass reports error reason : ' + err);
          });
        }
      }, (err) => {
          console.log ('queryLocal error reason : ' + err);
      });
    }

    selectFunction (e) {
      console.log ('TileList selectFunction : ' + e);
      this.setState({funct: e});
    }

    render () {
        var self = this,
            level = this.props.cflt || 'TOP';

        console.log ('TileList render : ' + level + ', breadcrumbs : ' + JSON.stringify(this.state.breadcrumbs));

        // filter to selected function
        let tiles = seq(this.state.tiles,
            filter(x =>  this.state.funct == 'All' || x.Function__c == this.state.funct));

        var padding0 =  { padding: '0px' };

        var i = 0;
        return (
            <section className="content">
                <div className="page-header-kh">

                <div className="btn-group" style={{"marginRight": "10px"}}>
                  <button type="button" className="btn-kh btn-primary dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                    Function: {this.state.funct} <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu" role="menu">
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'CD')}>CD</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'ETS')}>ETS</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'Finance')}>Finance</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'HR')}>HR</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'Marketing')}>Marketing</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'R&D')}>R&D</a></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'SC')}>SC</a></li>
                    <li className="divider"></li>
                    <li><a href="#" onClick={this.selectFunction.bind(this, 'All')}>Reset</a></li>
                  </ul>
                </div>
                <div className="btn-group">
                  <button type="button" className="btn-kh btn-success dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                    Region:  <span className="caret"></span>
                  </button>
                  <ul className="dropdown-menu" role="menu">
                    <li><a href="#" >EMEA</a></li>
                    <li><a href="#" >APAC</a></li>
                    <li className="divider"></li>
                    <li><a href="#" >Reset</a></li>
                  </ul>
                </div>

                </div><br/>
                <div className="page-header-kh">
                    <ol className="breadcrumb" style={padding0}>
                        <li className="margin-0"><a href="#TileList?cflt=TOP" ><i className="fa fa-dashboard"></i> Home</a></li>
                        {this.props.breadcrumbs.map(function(rt, i) { return (
                            <li className="active"><a href={"#TileList?cflt="+rt.Id+"&lbl="+encodeURIComponent(rt.Name)} >{rt.Name}</a></li>
                        );})}
                    </ol>
                </div>

                <div ref="tiles" className="row">
                    {tiles.map(function(row, i) { return (
                        <Tile key={row.Id} data={row} />
                    );})}
                    {this.state.ass_reports.map(function(row, i) { return (
                        <Report key={row.Id} data={row} />
                    );})}
                </div>
            </section>
        )
    }
}
