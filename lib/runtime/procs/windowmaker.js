// windowMaker wraps a passed-in generated function funcMaker() (that
// produces the list of reducers for a reduce or put) to return a
// replacement function that creates an array of windowed versions of
// those same reducers.
//
// windowMaker does not expose the expire() functions of its passed-in
// reducers, since it calls them directly and no other code does.
//
var _ = require('underscore');
var JuttleMoment = require('../../moment').JuttleMoment;
var DEQueue = require('double-ended-queue');

function windowMaker(funcMaker, over, location) {
    var _fns = funcMaker();
    // pts will persist a per-function array of windowed points across calls to windowfuncMaker
    var pts = _fns.map(function() { return new DEQueue(); });
    var all_expire = _.every(_fns, function(fn) { return Boolean(fn.expire); });
    return function() {
        var fns = _fns;
        if (!all_expire) {
            // instantiate a new copy of any fn that doesnt have an expire function.
            fns = funcMaker();
            fns.forEach(function(fn, idx) {
                if (fn.expire) {
                    fns[idx] = _fns[idx] ; // persist the original
                }
            });
        }
        // create and return a function that makes the row's array of fns, keeping
        // reference to the pts array for window playback.
        var windowfuncMaker = fns.map(function (fn, idx) {
            var windowedFn = {
                result: function() {
                    if (!fn.expire) {
                        // play the window into fn's update(). we
                        // wait until result() to do this so that
                        // expired points have all been shifted
                        // out of the window.
                        for (var i = 0; i < pts[idx].length ; i++) {
                            fn.update(pts[idx].get(i));
                        }
                    }
                    return fn.result();
                },
                update: function(pt) {
                    pts[idx].push(_.clone(pt));
                    if (fn.expire) {
                        // update as window advances (and never replay)
                        fn.update(pts[idx].peekBack());
                    }
                    windowedFn.advance(pt.time);
                },
                advance: function(time) {
                    // age points out of the window given the new time.
                    // This gets called as each point arrives to advance
                    // the window and recover storage, and at end of batch
                    // (with an epsilon moment) when a mark is being processed.
                    var edge = time.subtract(over);
                    if (time.epsilon) {
                        edge = JuttleMoment.epsMoment(edge);
                    }
                    while (pts[idx].length > 0 && pts[idx].peekFront().time.lte(edge)) {
                        if (fn.expire) {
                            fn.expire(pts[idx].peekFront()); // expire as window advances
                        }
                        pts[idx].shift();
                    }
                }
            };
            return windowedFn;
        });
        windowfuncMaker.is_empty = function() {
            return pts[0].length === 0;
        };
        return windowfuncMaker;
    };
}

module.exports = windowMaker;
