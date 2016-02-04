'use strict';

var Base = require('extendable-base');
var values = require('./values');

// a class wrapping functions that group points by the value(s)
// of one or more fields, which we call a "row"
// the group-by fields are arranged into a hierarchical table where
// the leaf nodes represent the "key" to a give group of values.
// the keyIDs are small ints and can be enumerated 0...nkeys-1
//
// The big customers of this class are the put and reduce procs,
// who store reducer instances in each group row, and need to
// have these instances created when new group rows are referenced
// and removed when a group row becomes irrelevant. A 'funcMaker'
// factory can be supplied that is invoked as part of the
// group row lifecycle (and this stuff really ought to be broken out
// from mundane uses of group as in the sort or join procs)
//
// Also beware that deleting a group row does not clear it from
// the index.
//
var NO_GROUP_KEY = 'NO_GROUP_KEY';

var Groups = Base.extend({
    initialize: function(proc, options, funcMaker) {
        this.proc = proc;
        // array of field names to act as keys (and subkeys) by
        // which to group points (for processing as units)
        this.by = options.groupby || [];
        if (typeof this.by === 'string') {
            this.by = [ this.by ];
        }
        this.reset_groups();

        // funcMaker creates new functions for a group row, and
        // defaults to no functions if the child class does not
        // override it.
        this.funcMaker = funcMaker || function () { return []; };
        // if overridden, funcMakerMaker is a funcMaker factory called
        // for each new group row (eg, for per-row bookkeeping during
        // reduce -over by), and this.funcMaker may be used in its
        // construction. else this.funcMaker will be used for each
        // row.
        this.funcMakerMaker = null;

        this._undefined_fields_warned = {};
        this.no_groupby_warning = options.no_groupby_warning;
    },

    reset: function() {
        this.reset_groups();
    },

    // Resets the state of all rows and index.
    reset_groups: function() {
        this.table = {};
        this.index = {};
        this.nkeys = 0;
        this.key_vals = [];
    },

    // removes a particular group from the table
    delete_group: function(keyID) {
        delete this.table[keyID];
        // don't bother updating the index, it is complicated and not necessary
    },

    // Resets the state of each row's funcs
    reset_fns: function() {
        var self = this;
        this.apply(function(key) {
            self.reset_row(self.get_row(key));
        });
    },

    reset_row: function(row) {
        if (!row.funcMaker) {
            row.funcMaker =  this.funcMakerMaker ? this.funcMakerMaker() : this.funcMaker;
        }
        row.fns = row.funcMaker();
        row.pts = null;
        row.npts = 0;
    },

    mixin_keys: function(pt, keyID) {
        var by, colno, n, vals;
        by = this.by;
        n = by.length;
        if (n === 0) {
            return;
        }
        vals = this.key_vals[keyID];
        for (colno = 0; colno < n; ++colno) {
            pt[by[colno]] = vals[colno];
        }
    },
    //
    // for a given point, lookup a unique group-by key for the
    // by fields of this group returns a keyID (integer) for that
    // key tuple.  if not all by fields exist in the point,
    // returns undefined.
    // the index is simply a multidimensional object where
    // index[val1][val2]...[valn] -> keyID
    // keyID can be used to index an array of state by subclasses
    // you can enumerate all of the keyIDs in the table by
    // simply iterating from 0 to this.nkeys - 1.
    // XXX a simpler implementation could build one, top-level
    // key string index from all the key values in a way that
    // guarantees that the input data won't mess things up
    //
    lookup_key: function(pt) {
        var colno, field;
        var by = this.by;
        var n = by.length;
        if (n === 0) {
            return NO_GROUP_KEY;
        }
        for (colno = 0; colno < n; ++colno) {
            field = by[colno];
            if (pt[field] === undefined) {
                if (!this._undefined_fields_warned[field] && !this.no_groupby_warning) {
                    this.proc.trigger('warning', this.proc.runtime_error('GROUP-BY-UNDEFINED', {
                        field: field,
                    }));
                    this._undefined_fields_warned[field] = true;
                }
                var clone = {};
                for (var copyField in pt) {
                    clone[copyField] = pt[copyField];
                }
                clone[field] = null;
                pt = clone;
            }
        }
        var keyID = this._get_key(pt);
        if (keyID === undefined) {
            keyID = this._insert_key(pt);
        }
        return keyID;
    },
    _get_key: function(pt) {
        var index = this.index;
        var by = this.by;

        for (var colno = 0; colno < by.length - 1; ++colno) {
            var currentField = pt[by[colno]];

            index = index[values.inspect(currentField)];

            if (index === undefined) {
                return undefined;
            }
        }

        var lastField = pt[by[by.length - 1]];
        return index[values.inspect(lastField)];
    },

    _insert_key: function(pt) {
        var index = this.index;
        var next_index;
        var by = this.by;
        var keyID, val, vals = [], colno, n = by.length;

        for (colno = 0; colno < n - 1; ++colno) {
            val = pt[by[colno]];
            vals[colno] = val;
            next_index = index[values.inspect(val)];
            if (next_index === undefined) {
                index[values.inspect(val)] = next_index = {};
            }
            index = next_index;
        }
        keyID = this.nkeys++;
        val = pt[by[n - 1]];
        vals[n - 1] = val;
        index[values.inspect(val)] = keyID;
        this.key_vals[keyID] = vals;
        return keyID;
    },

    // Looks up and returns the row for the point. If a row doesn't exist, it
    // creates one and sets the rows functions by calling the appropriate funcMaker().
    lookup: function(pt) {
        var keyID = this.lookup_key(pt);
        if (keyID === undefined) {
            return;
        }

        return this.get_row(keyID);
    },

    get_row: function(keyID) {
        var row = this.table[keyID] || {};

        if (!row.fns) {
            this.reset_row(row);
        }

        this.table[keyID] = row;

        return row;
    },
    //
    // apply a function to every (leaf) key in the table
    // the function takes the key objects and the group-by
    // values of this key
    //
    apply: function(fn) {
        if (this.by.length === 0) {
            // Ensure row exists and reducers are initialized.
            this.get_row(NO_GROUP_KEY);
            fn(NO_GROUP_KEY);
            return;
        }
        for (var keyID = 0; keyID < this.nkeys; ++keyID) {
            if (this.table[keyID]) {
                fn(keyID);
            }
        }
    }
});


module.exports = Groups;
