'use strict';

var _ = require('underscore');
var logger = require('../../logger').getLogger('program_stats');
var builtin_reducers = _.keys(require('../../runtime/reducers').reducers);

function proc_name(node) {
    if (node.name) {
        return node.name;
    } else {
        return node.type.replace('Proc', '').toLowerCase();
    }
}

function sanitize_time(val) {
    if (!val || !val.moment || val.isEnd() || val.isBeginning()) {
        return null;
    } else {
        return val;
    }
}

function input_stats(g) {
    var stats = {};
    var inputs = g.get_inputs();
    _.each(inputs, function (input) {
        if (!_.has(stats, input.name)) {
            stats[input.name] = 1;
        } else {
            stats[input.name]++;
        }
    });
    return stats;
}

function source_stats(g) {

    var sources = g.get_roots();
    return _.map(sources, function(source) {
        if (source.type === 'ReadProc') {
            return {
                type: proc_name(source),
                from: sanitize_time(g.node_get_option(source, 'from')),
                to: sanitize_time(g.node_get_option(source, 'to')),
                last: g.node_get_option(source, 'last') || null
            };
        } else {
            return {
                type: proc_name(source)
            };
        }
    });
}


function getReducerName(node) {
    return node.callee.name;
}

function isField(node) {
    return node.type === 'Field';
}

function isReducerCall(node) {
    return (node.type === 'CallExpression' && node.callee.symbol.type === 'reducer');
}


function reducer_stats(g) {
    var stats = {};
    var reduces = _.where(g.get_nodes(), {type: 'ReduceProc'});
    _.each(reduces, function(reduce) {
        _.each(reduce.exprs, function(expr) {
            if (!isReducerCall(expr.right)) {
                return;
            }
            if (!isField(expr.left)) {
                logger.error('Found unexpected reduce lhs while optimizing: ', expr.left);
                return;
            }
            var r = getReducerName(expr.right);
            if (!_.contains(builtin_reducers, r)) {
                r = 'user-defined';
            }
            if (!_.has(stats, r)) {
                stats[r] = 1;
            } else {
                stats[r]++;
            }
        });
    });
    return stats;
}

function proc_stats(g) {
    var stats = {};
    var nodes = g.get_nodes();
    _.each(nodes, function (node) {
        if (node.type === 'View') {
            return;
        }
        var name = proc_name(node);
        if (!_.has(stats, name)) {
            stats[name] = 1;
        } else {
            stats[name]++;
        }
    });
    return stats;
}

function view_stats(g) {
    var stats = {};
    var nodes = g.get_nodes();
    _.each(nodes, function (node) {
        if (node.type !== 'View') {
            return;
        }
        if (!_.has(stats, node.name)) {
            stats[node.name] = 1;
        } else {
            stats[node.name]++;
        }
    });
    return stats;
}

function function_stats(g) {
    // properly counting all function calls turns out to be more complicated
    // than it should, because the there is no distinction between a reducer
    // call and a function call in the AST. That distinction is present in
    // the semantic AST, but the ast-visitor doesn't work on that.

    // So for now we count the number of defined functions instead of counting
    // the number of function calls.

    var count = g.built_graph.functions.length;

    return {'user-defined' : count};
}

function sub_stats(g) {
    return g.built_graph.stats.subs;
}

function import_stats(g) {
    return g.built_graph.stats.imports;
}

function count_procs(p) {
    var total = 0;
    for (var prop in p) {
        if (p.hasOwnProperty(prop)) {
            total += p[prop];
        }
    }
    return total;
}

// Call this with a Program object
function extract_program_stats(prog) {
    var stats = {};
    var sources_array = source_stats(prog);

    stats.inputs = input_stats(prog);
    stats.input_total = count_procs(stats.inputs);
    stats.sources = sources_array;
    stats.source_total = sources_array.length;
    stats.reducers = reducer_stats(prog);
    stats.reducer_total = count_procs(stats.reducers);
    stats.functions = function_stats(prog);
    stats.procs = proc_stats(prog);
    stats.proc_total = count_procs(stats.procs);
    stats.views = view_stats(prog);
    stats.view_total = count_procs(stats.views);
    stats.subs = sub_stats(prog);
    stats.imports = import_stats(prog);
    return stats;
}

module.exports = extract_program_stats;
