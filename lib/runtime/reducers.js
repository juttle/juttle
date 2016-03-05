'use strict';

var DEQueue = require('double-ended-queue');
var Digest = require('tdigest').Digest;
var values = require('./values');
var ops = require('./ops');
var math = require('./modules/math');

//XXX
// scalar function
// implements init, consume(pt), result()
//
var reducers = {};

reducers.count = {
    id: 0,
    combine: true,
    arg_count: [0, 1],
    fn: function(field) {
        var fld = field;
        var counter = 0;
        return {
            result: function() {
                return counter;
            },
            update: function(pt) {
                if (!fld || pt[fld] !== undefined) {
                    counter += 1;
                }
            },
            combine: function(value) {
                counter += value;
            },
            expire: function(pt) {
                if (!fld || pt[fld] !== undefined) {
                    counter -= 1;
                }
            }
        };
    }
};


reducers.min = {
    id: -Infinity,
    combine: true,
    arg_count: 1,
    fn:function(field) {
        var val = Infinity;
        function _update(v) {
            if (val === Infinity || ops.lt(v, val)) {
                val = v;
            }
        }
        return {
            result: function() {
                return val;
            },
            update: function(pt) {
                var v = pt[field];

                if (v === undefined) {
                    return;
                }
                _update(v);
            },
            combine: function(v) {
                _update(v);
            }
        };
    }
};

reducers.max = {
    id: Infinity,
    combine: true,
    arg_count: 1,
    fn: function(field) {
        var val = -Infinity;
        function _update(v) {
            if (val === -Infinity || ops.gt(v, val)) {
                val = v;
            }
        }
        return {
            result: function() {
                return val;
            },
            update: function(pt) {
                var v = pt[field];

                if (v === undefined) {
                    return;
                }
                _update(v);
            },
            combine: function(v) {
                _update(v);
            }
        };
    }
};

reducers.avg = {
    id: null,
    // This reducer does have combine (and unit tests that exercise it) but we
    // set the combine bit to false because we can't make use of it with
    // optimization. See PROD-7244 for details.
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var sum = 0;
        var n = 0;
        return {
            result: function() {
                return n ? ops.div(sum, n) : null;
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.add(sum, v);
                    n += 1;
                }
            },
            combine: function(v) {
                sum += v.sum;
                n += v.count;
            },
            expire: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.sub(sum, v);
                    n -= 1;
                }
            }
        };
    }
};

reducers.sum = {
    id: 0,
    combine: true,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var sum = 0;
        return {
            result: function() {
                return sum;
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.add(sum, v);
                }
            },
            combine: function(v) {
                sum = ops.add(sum, v);
            },
            expire: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.sub(sum, v);
                }
            }
        };
    }
};

reducers.delta =  {
    // delta notes the most recent point value at each call to
    // result(), and returns the difference between the current value
    // and value used in the previous call to result(). This does not
    // play well with epoch teardown/reset -- don't forget to say
    // -reset false if you are running batched or -every, or you will
    // be sad. It also does not work with -over because teardown/reset
    // cannot be overridden for windows.
    //
    // optional parameters:
    //
    // empty: value to return when a current or previous value is not present
    //        (eg, no point has been observed since last call), default is 0.
    //
    // wrap:  field is an incrementing counter that wraps.
    //        When wrap is specified, any field value that is less than the previous value
    //        is assumed to have wrapped. There are 3 ways to specify what should be returned:
    //        wrap != 0:  add wrap to delta (to make it positive). Use this for ingesting counters like
    //            statsd's bytes-in, which wraps when it reaches a specified maximum (eg, 2^32).
    //        wrap=0: return the current (not delta) value.
    //            Use this for statsd's "periodic counters", which regularly reset themselves
    //            to 0 but are otherwise cumulative (and thus their first reading after a reset is
    //            in fact the delta value).
    //        wrap=true: return the "empty" value.
    //            Use this when you know you have a wrapping counter, but do not know the wrap value.
    //
    combine: false,
    arg_count: [1, 3],
    fn: function(fld, empty, wrap) {
        var previous = null;
        var current = null;
        empty = (empty === undefined) ? 0 : empty;

        return {
            update: function(pt) {
                if (pt[fld] !== undefined) {
                    current = pt[fld];
                }
            },
            result: function() {
                var delta = empty;
                if (current !== null && previous !== null ) {
                    delta = ops.sub(current, previous);
                    if (wrap !== undefined && ops.lt(current, previous)) {
                        if (wrap === true) {
                            delta = empty;
                        } else if (wrap === 0) {
                            delta = current;
                        } else {
                            delta = ops.add(delta, wrap);
                        }
                    }
                }
                previous = (current !== null) ? current : previous;
                current = null;
                return delta;
            },
        };
    }
};

reducers.last = {
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var val = null;
        return {
            result: function() {
                return val;
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    val = v;
                }
            },
        };
    }
};

reducers.first = {
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var val;
        return {
            result: function() {
                if (val === undefined) {
                    return null;
                } else {
                    return val;
                }
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined && val === undefined) {
                    val = v;
                }
            }
        };
    }
};

reducers.stdev = {
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var sum = 0;
        var ssum = 0;
        var n = 0;
        return {
            result: function(ts) {
                if (n === 0) {
                    return null;
                } else if (n === 1) {
                    return 0;
                } else {
                    return math.sqrt(ops.mul(1/n, ops.sub(ssum, ops.div(ops.mul(sum, sum), n))));
                }
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.add(sum, v);
                    ssum = ops.add(ssum, ops.mul(v, v));
                    n += 1;
                }
            },
            expire: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    sum = ops.sub(sum, v);
                    ssum = ops.sub(ssum, ops.mul(v, v));
                    n -= 1;
                }
            }
        };
    }
};

// remove once sigma is fully deprecated
reducers.sigma = reducers.stdev;

reducers.mad = {
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var vals = new DEQueue();
        return {
            update: function(pt) {
                if (pt[field] !== undefined) {
                    values.ensureNumber(pt[field], 'mad expects numeric fields, but received: '+values.toString(pt[field]));
                    vals.push(pt[field]);
                }
            },
            result: function() {
                if (vals.length === 0) {
                    return null;
                }
                var edf = new Digest();
                for (var i = vals.length - 1 ; i >= 0 ; i--) {
                    edf.push(vals.get(i));
                }
                var median = edf.percentile(0.5);
                var ad_edf = new Digest();
                for (i = vals.length - 1 ; i >= 0 ; i--) {
                    ad_edf.push(Math.abs(vals.get(i) - median));
                }
                return ad_edf.percentile(0.5);
            },
            expire: function(pt) {
                if (pt[field] !== undefined) {
                    vals.shift(); // trust that expire(pt) is called in same order as update(pt)
                }
            }
        };
    }
};

reducers.pluck = {
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var fld = field;
        var result_values = [];
        return {
            result: function(ts) {
                return result_values.slice(0); // snapshot of array now
            },
            update: function(pt) {
                var v = pt[fld];
                if (v !== undefined) {
                    result_values.push(v);
                }
            }
        };
    }
};

reducers.percentile = {
    combine: false,
    arg_count: [1, 2],
    fn: function(field, pct) {
        var data = new Digest();
        pct = (pct || 0.50) ;
        return {
            result: function() {
                if (data.size() === 0) {
                    return null;
                }
                return data.percentile(pct);
            },
            update: function(pt) {
                if (pt[field] !== undefined) {
                    values.ensureNumber(pt[field], 'percentile expects numeric fields, but received: '+values.toString(pt[field]));
                    data.push(pt[field]);
                }
            }
        };
    }
};

reducers.count_unique = {
    id: 0,
    combine: false,
    arg_count: 1,
    fn: function(field) {
        var uniques = {};
        return {
            result: function() {
                return Object.keys(uniques).length;
            },
            update: function(pt) {
                if (pt[field] !== undefined) {
                    uniques[values.inspect(pt[field])] = true;
                }
            }
        };
    }
};

function is_builtin_reducer(name) {
    return reducers.hasOwnProperty(name);
}

function default_value(name) {
    return reducers[name].id;
}

module.exports = {
    reducers: reducers,
    is_builtin_reducer: is_builtin_reducer,
    default_value: default_value
};
