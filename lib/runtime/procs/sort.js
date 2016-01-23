'use strict';

var _ = require('underscore');
var fanin = require('./fanin');
var utils = require('../juttle-utils');
var Groups = require('../groups');

var INFO = {
    type: 'proc',
    options: {   // documented, non-deprecated options only
        desc: {}
    }
};

var sort = fanin.extend({
    initialize: function(options) {
        //
        // XXX 'sortby' should be a list of fields like group-by
        // where the list comprises subkeys for subsorts
        //
        this.limit = options.limit || 100000;
        this.sortby =  options.columns;
        this.cmp = this.sortfunc();
        this.groups = new Groups(this, options);
        this.n_pts = 0;
    },
    procName:  'sort',
    _run: function(time) {
        var self = this;
        _.each(this.groups.table, function(row) {
            _.each(self.sortby, function(sortKey) {
                var field = sortKey.field;
                _.each(row.pts, function(pt) {
                    if (!_.has(pt, field)) {
                        self.trigger('warning', self.runtime_error('RT-FIELD-NOT-FOUND', {
                            field: field
                        }));
                    }
                });
            });

            row.pts.sort(self.cmp);

            self.emit(_.map(row.pts, function(pt) {
                var out_pt;
                if (time) {
                    out_pt = _.clone(pt);
                    out_pt.time = time;
                } else {
                    out_pt = _.omit(pt, 'time');
                }
                return out_pt;
            }));
        });

        this.groups.reset();
        this.n_pts = 0;
    },
    process: function(points) {
        var k, row;
        var space_left = this.limit - this.n_pts;
        if (space_left < points.length) {
            this.trigger('warning', this.runtime_error('RT-SORT-LIMIT-EXCEEDED', {
                field: this.sortBy,
            }));
            if (!space_left)  {
                return;
            }
        }
        points = points.slice(0, Math.min(points.length, space_left));

        for (k = 0; k < points.length; ++k) {
            row = this.groups.lookup(points[k]);
            if (!row.pts) {
                row.pts = [];
            }
            row.pts.push(points[k]);
        }
        this.n_pts += points.length;
    },
    mark: function(time, from) {
        // process and publish each mark
        this._run(time);
        this.emit_mark(time);
    },
    eof: function(from) {
        this._run(null);
        this.emit_eof();
    },
    sortfunc: function() {
        var cmps = this.sortby.map(function(sortKey) {
            return utils.pointSortFunc(sortKey.field, sortKey.direction);
        });
        return function(first, second) {
            return cmps.reduce(function(sofar, cmp) {
                return (sofar !== 0) ?  sofar : cmp(first, second);
            }, 0);
        };
    }
}, {
    info: INFO
});

module.exports = sort;
