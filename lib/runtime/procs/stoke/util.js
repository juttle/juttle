/*jshint -W061 */
var _ =  require('underscore');
var dur = require('../../../moment').JuttleMoment.duration;
var gex = require('gex');
var FIFOCache = require('tiny-fifo-cache');
var FilterJSCompiler = require('../../../compiler/filters/filter-js-compiler');
var PartialFilterJSCompiler = require('../../../compiler/filters/partial-filter-js-compiler');
var juttle = require('../../../runtime/runtime'); // jshint ignore:line
var juttleErrors = require('../../../errors');

/**
 useful stuff for random timeseries.
*/

function bound(val, min, max) {
    // trim the value to be within min..max (if min..max are specified)
    val = (min !== undefined)? Math.max(val, min) : val;
    val = (max !== undefined)? Math.min(val, max) : val;
    return val ;
}

function step_by(from, to, by, f) {
    // evaluate f(moment, next) over the half-open interval [from..to)
    // stepping by by. This will take a special final step that may be
    // less than by so the interval is covered. Use this to compute
    // events as a sum of events over by intervals to get repeatable
    // aggregatable events over larger intervals when called with the
    // same by.
    if (by.unixms() === 0) {
        // special case, a single point interval
        f(from, to);
        return ;
    }
    var moment=from;
    var next=moment.add(by);
    while (next.lte(to)) {
        f(moment, next) ;
        moment=next;
        next=moment.add(by);
    }
    if (moment.lt(to)) {
        f(moment, to);
    }
}

var step_quanta = [ dur(1,'s'), dur(2,'s'), dur(5,'s'), dur(10,'s'), dur(30,'s'),
                    dur(1,'m'), dur(10,'m'), dur(30,'m'),
                    dur(1,'h'), dur(2,'h'), dur(4,'h'), dur(6,'h'), dur(12,'h'),
                    dur(1,'d'), dur(7,'d'), dur(30,'d')
                  ];

function nice_steps(duration, maxsteps) {
    var i;
    for (i = 0 ; i < step_quanta.length - 1; i++) {
        if (duration.divide(step_quanta[i]) <= maxsteps) {
            break;
        }
    }
    return step_quanta[i];
}

var EWMACache = new FIFOCache(10000);
var EWMA_CacheID = 0;

// XXX/demmer expose in the browser for debuggability
/* global window */
if (typeof window !== 'undefined') {
    window.EWMACache = EWMACache;
}

function _ewma(alpha, f, from, to, by) {
    // evaluate f(moment) over from...to, and return the
    // exponentailly-weighted average value
    var values = from.mapInterval(f, to, by) ;
    var result = values.shift() ;
    values.forEach(function(value) {
        result = alpha * value + (1 - alpha) * result ;
    }) ;
    return result ;
}

function ewma(alpha, f, from, to, by) {
    // XXX Yuck
    if (! f._ewma_cache_id) {
        f._ewma_cache_id = EWMA_CacheID++;
    }
    var key = f._ewma_cache_id +
        '-alpha-' + alpha +
        '-to-' + to.milliseconds() +
        '-by-' + by.milliseconds();
    var result = EWMACache.get(key);
    if (result !== null) {
        return result;
    }
    // commented out the block below because the difference between
    // cached versus computed values was leading to erratic ripple
    // behavior.  revisit this optimization later.
    //
    // // Check if we are computing one step past a previously-calculated ewma.
    // // If so, use the previous calculation to get us one step closer.
    // var prev = f._ewma_cache_id +
    //     '-alpha-' + alpha +
    //     '-to-' + to.subtract(by).milliseconds() +
    //     '-by-' + by.milliseconds();

    // result = EWMACache.get(prev);
    // if (result) {
    //     result = (1 - alpha) * result + alpha * f(to);
    // } else {
    //     result = _ewma(alpha, f, from, to, by);
    // }
    result = _ewma(alpha, f, from, to, by);
    EWMACache.put(key, result);
    return result;
}

function day_wave(moment) {
    // a 24-hour sine wave with min===0 at midnight PST and max===1 at noon
    var daysecs = moment.subtract(moment.startOf('day')).seconds();
    daysecs -= 8 * 3600 ; // XXX PST adjustment. should be leveraging moment!
    return Math.sin(2 * Math.PI * (-1/4 + daysecs / (24 * 3600)))/2 + 0.5;
}

function day_pulse(moment, duty) {
    // a 24-hour square wave with min===0 at midnight PST and max===1 at noon
    var daysecs = moment.subtract(moment.startOf('day')).seconds();
    daysecs -= 8 * 3600 ; // XXX PST adjustment. should be leveraging moment.
    daysecs += (daysecs < 0) ? 24 * 3600 : 0;
    duty = duty || (9 / 24) ; // hours the pulse is "on"
    return (daysecs > 10 * 3600 && daysecs < (10 + duty * 24) * 3600) ? 1 : 0;
}

function live_filter(filter) {
    // compile and return a filter function for live points
    var live = function(pt) { return true; };

    if (filter && filter.filter_ast) {
        try {
            var compiler = new FilterJSCompiler();
            var jsfilter = eval(compiler.compile(filter.filter_ast));
            live = function(pt) {
                try {
                    return jsfilter(pt) ;
                } catch (err) {
                    if (err.message.indexOf("Invalid operand types") >= 0 &&
                        err.message.indexOf("null") >= 0) {
                        // presumed to be a type error from a missing field. skip.
                        return false ;
                    } else {
                        throw err;
                    }
                }
            };
        }
        catch (err) {
            throw juttleErrors.compileError('RT-FREE-TEXT-STOCHASTIC', {
                location: filter.filter_ast.location
            });
        }
    }
    return live;
}

function partial_filter(filter, fields) {
    // compile and return a filter function that only tests against
    // listed fields in a point, and assumes filter functions over any
    // other fields would ultimately yield true. A point that fails
    // the partial_filter test is guaranteed to fail the live_filter
    // regardless of what is in other fields.
    var partial = function(pt) { return true; };

    if (filter && filter.filter_ast) {
        try {
            var compiler = new PartialFilterJSCompiler();
            partial = eval(compiler.compile(filter.filter_ast, fields));
        }
        catch (err) {
            throw juttleErrors.compileError('RT-FREE-TEXT-STOCHASTIC', {
                location: filter.filter_ast.location
            });
        }
    }
    return partial;
}

function emittable(pt, gexen, filter) {
    // test partial field values against gexen and filters to decide
    // if the point should be emitted.
    if (gexen && gexen.length > 0) {
        return gex(gexen).on(pt.name) === pt.name;
    } else if (filter) {
        var pfilter = partial_filter(filter, _.keys(pt));
        return pfilter(pt);
    }
    return true;
}

module.exports = {
    step_by: step_by,
    nice_steps: nice_steps,
    ewma: ewma,
    day_wave: day_wave,
    day_pulse: day_pulse,
    bound: bound,
    emittable: emittable,
    live_filter: live_filter
};
