import React, {Component} from 'react/addons';
import { range, seq, compose, map, filter } from 'transducers.js';
import SFData from '../service/sfdata.es6';

class Report extends Component {
    constructor () {
      super();
      console.log ('TileList InitialState : ');
      this.state = { open: false, quickview: []};
      this.handleCollapse = this.handleCollapse.bind(this);
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

    componentWillUpdate( nextProps,  nextState) {
        console.log ('Report componentWillUpdate : state ' + JSON.stringify (nextState));
        //Use this as an opportunity to perform preparation before an update occurs
        // You cannot use this.setState() in this method

    }

    componentDidMount () {
        console.log ('Report componentDidMount: ');
    }

    navToReport (id) {
        console.log ('navToReport event : ' + id);
        try {
            console.log ('navToReport got sforce');
            sforce.one.navigateToSObject( id);
        }  catch (e) {
            window.location =  '/apex/OVReport?id=' + id;
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

        var chatp = {width: "55%"};

        return (
            <div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">

                <div className={boxclass}>
                    <div className="box-header" data-toggle="tooltip" title="" data-original-title="Header tooltip">
                        <h3 className="box-title">{rdata.Name}<br/>
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

                        <a className="btn-kh  btn-block btn-success" onClick={this.navToReport.bind(this, rdata.Id)}>
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

        // When the component is clicked, trigger the onClick handler that
        // was passed as an attribute when it was constructed:
        this.props.onTileClick(id);
    }

    render () {
        var tdata = this.props.data,
            boxclass = "small-box " + tdata.Tile_Colour__c,
            iclass = "ion " + tdata.Tile_Icon__c;

        return (
            <div className="col-xs-12 col-sm-4 col-md-3 col-lg-2">
                <a href="#" onClick={this.setFilter.bind(this, tdata.Id)} className={boxclass}>
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
      this.state =  { breadcrumbs: [], tiles: [], loading: false, filter: null, funct: 'All' };

      this.handleNavClick = this.handleNavClick.bind(this);
    }

    componentWillReceiveProps (nextProps) {
        let cbc = this.state.breadcrumbs,
            cflt = nextProps.flt; //this.getParams().flt;
        console.log ('TileList componentWillReceiveProps : ' + cflt);
         if  (cflt == null) {
            this.setState({breadcrumbs: []});
         } else {
             var foundit = false,
                 inhistory = seq(cbc, filter(function(x) {
                 if (foundit == false && x.id == cflt) {
                     foundit = true; return foundit;
                 } else return !foundit}));
             if (foundit) {
                 this.setState({breadcrumbs:inhistory});
                 }
             else {
                 let newname = seq(this.state.tiles,
                     compose(
                         filter(x => x.Id == cflt),
                         map(x => x.Name)
                     ))[0]
                 this.setState({breadcrumbs: this.state.breadcrumbs.concat({id: cflt, name: newname})});
             }
         }
    }

    _loadTileData() {
      var sf = SFData.instance;
      //var qsttr = "select Id, Name, Tile_Colour__c, Tile_Icon__c, parent__c, Function__c, (select name, id, report__r.Id, report__r.Name, report__r.summary__c, report__r.actual__c, report__r.target__c, report__r.difference__c, report__r.Source__c, report__r.Status__c from Associated_Reports__r where report__r.Status__c = 'Published' ) from Tiles__c where Status__c = 'Published' order by Order__c asc",
      // [{field: 'Status__c', equals: 'Published'}]
      return new Promise( (resolve, reject) => {
        sf.queryLocal ('Tiles__c').then (
          function (value) {
            console.log ('queryLocal success value : ' + JSON.stringify(value));
            var res = null;
            do {
                console.log ('calling rollup with : ' + JSON.stringify (res));
                res = (function (calcChildTot, recs) {
                    let calcParent = {}, firsttime = !calcChildTot;
                    for (var tidx in recs) {
                        var tile = recs[tidx];
                        if (firsttime) {
                            console.log('This is the first time, set tcnt on all tiles to number of child accociated reports')
                            tile.tcnt = tile.Associated_Reports__r && tile.Associated_Reports__r.totalSize || 0;
                        } else if (calcChildTot[tile.Id] > 0 ) {
                            console.log ('Not first time & found a child rollup number for this parent, add it to the tcnt')
                            tile.tcnt = calcChildTot[tile.Id] + (tile.tcnt || 0);
                        }
                        if (tile.tcnt > 0 && tile.Parent__c && (firsttime || calcChildTot[tile.Id] > 0 )) {
                            console.log ('Need to Calculate Parent of : ' + tile.Name + ' : ' + tile.tcnt);
                            calcParent[tile.Parent__c] = (firsttime && tile.tcnt || calcChildTot[tile.Id]) + (calcParent[tile.Parent__c] || 0) ;
                        }
                    }
                    return calcParent;
                })(res, value);
            } while (Object.keys(res).length >0)
            resolve(value);
          }, function (reason) {
            reject (JSON.stringify(reason));
          }
        );
      });
    }
    // The statics object allows you to define static methods that can be called on the component class
    componentDidMount() {
        console.log ('TileList componentDidMount');

        this._loadTileData().then((value) => {
          this.setState({  loading: false, tiles: value});
        }, (err) => {
            console.log ('queryLocal error reason : ' + err);
        })
    }

    handleNavClick (cflt) {
        let cbc = this.state.breadcrumbs,
            new_state = {filter: cflt};

        console.log ('TileList handleNavClick: ' + cflt + ', breadcrumbs ['+ cbc +']');
        if  (cflt == null) {
            new_state.breadcrumbs = [];
            this._loadTileData().then((value) => {
              new_state.tiles = value;
              this.setState(new_state);
            }, (err) => {
                console.log ('queryLocal error reason : ' + err);
            })
        } else {
            var foundit = false,
                inhistory = seq(cbc, filter(function(x) {
                    if (foundit == false && x.id == cflt) {
                        foundit = true; return foundit;
                    } else return !foundit}));
            if (foundit) {
                new_state.breadcrumbs = inhistory;
            }
            else {
                let newname = seq(this.state.tiles,
                    compose(
                        filter(x => x.Id == cflt),
                        map(x => x.Name)
                    ))[0]
                new_state.breadcrumbs = this.state.breadcrumbs.concat({id: cflt, name: newname});
            }
            console.log ('TileList handleNavClick, setState : ' + JSON.stringify(new_state));
            this.setState(new_state);
        }
    }

    selectFunction (e) {
      console.log ('TileList selectFunction : ' + e);
      this.setState({funct: e});
    }

    render () {
        var self = this;
        let cflt = this.state.filter; // this.getParams().flt;
        console.log ('TileList render : ' + cflt + ', breadcrumbs : ' + JSON.stringify(this.state.breadcrumbs));
        let tiles = seq(this.state.tiles,
            filter(x =>  x.Parent__c == cflt && (this.state.funct == 'All' || x.Function__c == this.state.funct)));
        let tilereports = seq(this.state.tiles,
            compose(
                filter(x => x.Id == cflt ),
                map (x => x.Associated_Reports__r)
            ))[0],
            reporta = tilereports && tilereports.records || [];


        var optionalElement;
        if (this.state.loading) {
            optionalElement = (<div> loading </div>);
        }
        var padding0 =  { padding: '0px' };

        var i = 0;
        return (
            <section className="content">
                <div className="page-header-kh">

                <div className="btn-group" style={{"margin-right": "10px"}}>
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
                        <li className="margin-0"><a href="#" onClick={this.handleNavClick.bind(this, null)}><i className="fa fa-dashboard"></i> Home</a></li>
                        {this.state.breadcrumbs.map(function(rt, i) { return (
                            <li className="active"><a href="#" onClick={self.handleNavClick.bind(self, rt.id)}>{rt.name}</a></li>
                        );})}
                    </ol>
                </div>

                <div className="row">
                    {optionalElement}
                    {tiles.map(function(row, i) { return (
                        <Tile data={row} onTileClick={self.handleNavClick}/>
                    );})}
                    {reporta.map(function(row, i) { return (
                        <Report data={row} />
                    );})}
                </div>
            </section>
        )
    }
}
