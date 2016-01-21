var _ = require('underscore');
var Promise = require('bluebird');
var errors = require('../../errors');

var reducers = require('../reducers').reducers;
var adapters = require('../adapters');

// Juttle namespace
//
// Assign Juttle to module.exports early to satisfy/break a circular dependency
// from base.js
var Juttle = module.exports = {
    hub: {},
    droppedChanName: function(program_id) {
        return 'drops-' + program_id;
    },
    visitGen:0,
    teardown: function(entryNode) {
        var k;
        Juttle.visitGen += 1;
        // loop over the head array to handle the case where
        // the onramp to the graph is a parallel path
        for (k = 0; k < entryNode.head.length; ++k) {
            entryNode.head[k].deactivate(Juttle.visitGen);
        }
    }
};

Juttle.reducers = reducers;
Juttle.adapters = adapters;

// stash the filter compiler in the runtime to enable adapters to
// leverage the filters in their implementation.
var FilterJSCompiler = require('../../compiler/filters/filter-js-compiler.js');
Juttle.FilterJSCompiler = FilterJSCompiler;

var base = require('./base');
var fanin = require('./fanin');

var PASS_INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var pass = fanin.extend({
    procName: 'pass'
}, {
    info: PASS_INFO
});

Juttle.proc = {
    base: base,
    join: require('./join'),
    filter: require('./filter'),
    tail: require('./tail'),
    head: require('./head'),
    skip: require('./skip'),
    sort: require('./sort'),
    source: require('./source'),
    split: require('./split'),
    batch: require('./batch'),
    unbatch: require('./unbatch'),
    put: require('./put'),
    remove: require('./remove'),
    keep: require('./keep'),
    emit: require('./emit'),
    pace: require('./pace'),
    pass: pass,
    sequence: require('./sequence'),
    uniq: require('./uniq'),
    reduce: require('./reduce'),
    fanin: fanin
};

// base class for all sinks (both client-side views and adapter write procs)
Juttle.proc.sink = fanin.extend({
    initialize: function(options, params) {
        // To indicate when the sink is finished, stash a completion trigger in
        // this.done() that resolves the `isDone` promise.
        //
        // The runtime will use this promise to wait until all the sinks have
        // gotten an eof to declare that the program is complete.
        var self = this;
        this.isDone = new Promise(function(resolve, reject) {
            self.done = resolve;
        });
    },
});

var PUBLISH_INFO = {
    type: 'sink',
    options: {}   // documented, non-deprecated options only
};

//XXX make sure mark works right between flowgraphs
Juttle.proc.publish = Juttle.proc.sink.extend({
    initialize: function(options) {
        this.channel = options.channel || '__DEFAULT';
    },
    procName: 'publish',
    mark: function(time) {
        var targets = Juttle.hub[this.channel];
        var self = this;
        _(targets).each(function(target) {
            target.consume_mark(time, self);
        });
    },
    tick: function(time) {
        var targets = Juttle.hub[this.channel];
        var self = this;
        _(targets).each(function(target) {
            target.consume_tick(time, self);
        });
    },
    eof: function() {
        var targets = Juttle.hub[this.channel];
        var self = this;
        _(targets).each(function(target) {
            target.consume_eof(self);
        });
    },
    process: function(points) {
        var targets = Juttle.hub[this.channel];
        var self = this;
        _(targets).each(function(target) {
            target.consume(points.slice(0), self);
        });
    }
}, {
    info: PUBLISH_INFO
});

var SUBSCRIBE_INFO = {
    type: 'source',
    options: {}   // documented, non-deprecated options only
};

Juttle.proc.subscribe = Juttle.proc.source.extend({
    // sub is special, it is not stitched to its upstream pub
    // by connect(), but pub will be calling its consume().
    // stick with the old gods here.
    initialize: function(options) {
        this.channel = this.channelName(options);
        var targets = Juttle.hub[this.channel];
        if (targets === undefined) {
            targets = Juttle.hub[this.channel] = [];
        }
        targets.push(this);
    },
    start: function() {
    },
    channelName: function(options) {
        return options.channel || '__DEFAULT';
    },
    procName: 'subscribe',
    process: function(points) {
        this.emit(points);
    },
    teardown: function() {
        var k;
        var targets = Juttle.hub[this.channel];
        for (k = 0; k < targets.length; ++k) {
            if (targets[k] === this) {
                targets.splice(k, 1);
                if (targets.length === 0) {
                    delete Juttle.hub[this.channel];
                }
                return;
            }
        }
        this.logger.warn('subscribe could not find self in Juttle.hub');
    }
}, {
    info: SUBSCRIBE_INFO
});

var DROPPED_INFO = {
    type: 'source',
    options: {}   // documented, non-deprecated options only
};

Juttle.proc.dropped = Juttle.proc.subscribe.extend({
    channelName: function() {
        return Juttle.droppedChanName(this.program.id);
    },
    procName: 'dropped'
}, {
    info: DROPPED_INFO
});


var nchannels = 0;
function alloc_channel(prefix) {
    prefix = prefix || 'chan';
    while (true) {
        var name = prefix + (nchannels++);
        if (!Juttle.hub.hasOwnProperty(name)) {
            // insert an empty list to "claim" this channel
            Juttle.hub[name] = [];
            return name;
        }
    }
}

Juttle.alloc_channel = alloc_channel;

var SINK_INFO = {
    type: 'sink',
    options: {}   // documented, non-deprecated options only
};

// XXX/demmer this should not inherit from publish but until we convert the
// clients
Juttle.proc.view = Juttle.proc.publish.extend({
    initialize: function(options, params) {
        this.name = params.name;
        this.options = options;
        var chan = alloc_channel('sink');
        this.channel = chan;
    },

    procName: 'view',

    // When views get points/marks/ticks, they emit events on
    // the related program object. Program users will subscribe for
    // these events to receive the information from the views.
    //
    // Note: not using base.js::trigger as that's used for triggering
    // error/warning events and has special handling of arguments to
    // include proc names including the error/warning.

    mark: function(time) {
        Juttle.proc.publish.prototype.mark.call(this, time);
        this.program.trigger("view:mark", {channel: this.channel, time: time});
    },
    tick: function(time) {
        Juttle.proc.publish.prototype.tick.call(this, time);
        this.program.trigger("view:tick", {channel: this.channel, time: time});
    },
    eof: function() {
        Juttle.proc.publish.prototype.eof.call(this);
        this.program.trigger("view:eof", {channel: this.channel});
        this.done();
    },
    process: function(points) {
        Juttle.proc.publish.prototype.process.call(this, points);
        this.program.trigger("view:points", {channel: this.channel, points: points});
    }

}, {
    info: SINK_INFO
});

// read is a fake proc since the actual implementation comes from the adapter
Juttle.proc.read = {};
Juttle.proc.read.info = {
    type: 'source',
    options: {}
};

// write is a fake proc since the actual implementation comes from the adapter
Juttle.proc.write = {};
Juttle.proc.write.info = {
    type: 'sink',
    options: {}
};

// Additional Functions

Juttle.extend_options = function(opts, location) {

    var options = {};
    function setopt(name, val) {
        var parts = name.split('.');
        var o = options;
        for (var i=0; i<parts.length-1; i++) {
            var part = parts[i];
            if (!o.hasOwnProperty(part)) {
                o[part] = {};
            }
            o = o[part];
            if (o.constructor !== Object) {
                throw errors.compileError('RT-BAD-NESTED-OPTION', {
                    name: name,
                    location: location
                });
            }
        }
        o[parts[parts.length-1]] = val;
    }

    _.each(opts, function(option) {
        if (option.name === 'o' || option.name === 'options') {
            if (_(option.val).isObject() && !_(option.val).isArray()) {
                _.each(option.val, function(val, name) {
                    setopt(name, val);
                } );
            } else {
                throw errors.compileError('RT-INVALID-SINK-OPTIONS-ERROR', {
                    procName: '',
                    location: location
                });
            }
        } else {
            setopt(option.name, option.val);
        }
    });

    return options;
};
