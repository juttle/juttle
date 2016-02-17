'use strict';

// Juttle autocomplete backend.

var _ = require('underscore');
var parser = require('../parser');
var procs = require('../runtime/procs');

// List of documented, non-deprecated procs with their options.
var PROCS = {
    batch: procs.batch.info,
    emit: procs.emit.info,
    filter: procs.filter.info,
    head: procs.head.info,
    join: procs.join.info,
    keep: procs.keep.info,
    pace: procs.pace.info,
    put: procs.put.info,
    read: procs.read.info,
    reduce: procs.reduce.info,
    remove: procs.remove.info,
    skip: procs.skip.info,
    sort: procs.sort.info,
    split: procs.split.info,
    tail: procs.tail.info,
    unbatch: procs.unbatch.info,
    uniq: procs.uniq.info,
    write: procs.write.info
};

// Describes which proc types are suggested for each proc placement.
var PLACEMENTS_TO_PROC_TYPES = {
    head: ['source'],
    tail: ['proc', 'sink']
};

class Autocompleter {
    constructor(options) {
        options = options || {};

        var views = options.views || {};
        this._procs = _.extend(_.clone(PROCS), views);
    }

    getCompletions(juttle, pos) {
        var regions = this._computeRegions(juttle);
        var region = this._regionAtPos(regions, pos, juttle);

        if (region) {
            var prefix = juttle.substring(region.start, region.end);

            switch (region.type) {
                case 'proc':
                    var procTypes = PLACEMENTS_TO_PROC_TYPES[region.placement];

                    return _.chain(this._procs)
                        .pairs()
                        .filter(function(pair) {
                            return _.contains(procTypes, pair[1].type)
                                && pair[0].substr(0, prefix.length) === prefix;
                        })
                        .map(function(pair) {
                            return { type: pair[1].type, value: pair[0] };
                        })
                        .sortBy('value')
                        .value();

                case 'option_name':
                    return _.chain(this._validOptionsForRegion(region))
                        .filter(function(name) {
                            return name.substr(0, prefix.length) === prefix;
                        })
                        .map(function(name) {
                            return { type: 'option_name', proc: region.proc, value: name };
                        })
                        .value();

                case 'option_value':
                    var option = region.prevOptions[region.prevOptions.length - 1];
                    var procOption = this._procOptions(region.proc)[option.name];

                    if (procOption.acQuery) {
                        var query = procOption.acQuery(region);
                        // It is still possible that the query cannot be constructed from a given region.
                        // e.g. if source_type option was given before space, then we cannot query for available
                        // source types.
                        if (query) {
                            return [{ type: 'option_value', proc: region.proc, option: option.name, query: query }];
                        } else {
                            return [];
                        }
                    } else if (procOption.acValues) {
                        return _.map(procOption.acValues, function(value) {
                            return { type: 'option_value', proc: region.proc, option: option.name, value: value };
                        });
                    } else {
                        return [];
                    }

                    break;

                default:
                    throw new Error('Invalid region type: ' + region.type + '.');
            }
        } else {
            return [];
        }
    }

    _computeRegions(juttle) {
        var regions = [];

        try {
            parser.parseSync(juttle, {
                autocompleteCallback: function(region) {
                    regions.push(region);
                }
            });
        } catch (e) {
            // Ignore errors in order to capture regions even from an
            // unsuccessful parse.
        }

        return regions;
    }

    _validOptionsForRegion(region) {
        return _.chain(this._procOptions(region.proc))
            .keys()
            .difference(_.pluck(region.prevOptions, 'name'))
            .map(function(opt) { return '-' + opt; })
            .value();
    }

    _regionAtPos(regions, pos, juttle) {
        var self = this;

        // We return the *last* of the regions containing pos. This is because
        // in theory, the parser can parse a piece of something (emitting
        // autocomplete regions on the way), then encounter an error, backtrack,
        // and parse the input as something else (again emitting autocomplete
        // regions on the way). Taking the last of the matching regions means
        // the final successful parse (or the last unsuccessful attempt) will be
        // the authoritative source of regions in case of overlap.
        return _.chain(regions)
            .filter(function(region) {
                return region.start <= pos && region.end >= pos;
            })
            .filter(function(region) {

                // Filter out regions of type "option_value" which are adjacent
                // to a region of type "option_name" which corresponds to an
                // incomplete option. This means when autocompleting this:
                //
                //    read -sp
                //
                // we will offering a completion of the option name. On the
                // other hand, when autocompleting this:
                //
                //     read -space
                //
                // we will offer a completion of the option value.
                if (region.type !== 'option_value') { return true; }

                var adjacentRegion = _.chain(regions)
                    .filter(function(other) {
                        return other.end === region.start && other.type === 'option_name';
                    })
                    .last()
                    .value();

                var validOptions = self._validOptionsForRegion(adjacentRegion);
                var optionName = juttle.substring(adjacentRegion.start, adjacentRegion.end);
                var optionValue = juttle.substring(region.start, region.end);

                // Ensure region starts with at least one space. This is a workaround for
                // https://jut-io.atlassian.net/browse/PROD-10098
                return (_.contains(validOptions, optionName) && (optionValue.match(/^\s+/)));
            })
            .last()
            .value();
    }

    _procOptions(proc) {
        return _.has(this._procs, proc) ? this._procs[proc].options : [];
    }
}

module.exports = Autocompleter;
