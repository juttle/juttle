'use strict';

var _ = require('underscore');
var errors = require('../../errors');

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

// Needs to be below the module.exports assignment becasue of the circular
// dependency mentioned above.
var procs = require('../procs');

Juttle.adapters = adapters;
Juttle.proc = procs;

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
