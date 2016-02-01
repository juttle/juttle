'use strict';

var _ = require('underscore');
var errors = require('../../errors');

var reducers = require('../reducers').reducers;
var adapters = require('../adapters');

// Juttle namespace
//
// Assign Juttle to module.exports early to satisfy/break a circular dependency
// from base.js
var Juttle = module.exports = {
    channels:0,
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
    read: require('./read'),
    write: require('./write'),
    join: require('./join'),
    filter: require('./filter'),
    tail: require('./tail'),
    head: require('./head'),
    skip: require('./skip'),
    sort: require('./sort'),
    source: require('./source'),
    sink: require('./sink'),
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

var VIEW_INFO = {
    type: 'view',
    options: {}   // documented, non-deprecated options only
};

Juttle.proc.view = Juttle.proc.sink.extend({
    initialize: function(options, params) {
        this.name = params.name;
        this.options = options;
        this.channel = 'view' + (Juttle.channels++);
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
        this.program.trigger('view:mark', {channel: this.channel, time: time});
    },
    tick: function(time) {
        this.program.trigger('view:tick', {channel: this.channel, time: time});
    },
    eof: function() {
        this.program.trigger('view:eof', {channel: this.channel});
        this.done();
    },
    process: function(points) {
        this.program.trigger('view:points', {channel: this.channel, points: points});
    }

}, {
    info: VIEW_INFO
});

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
