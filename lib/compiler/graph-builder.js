'use strict';

var Base = require('extendable-base');
var JuttleMoment = require('../moment').JuttleMoment;   // eslint-disable-line
var Filter = require('../runtime/filter');   // eslint-disable-line
var _ = require('underscore');
var values = require('../runtime/values');
var Juttle = require('../runtime/procs/procs');
var errors = require('../errors');

function proc_name(node) {
    return (node.name || node.type).replace('Proc', '').toLowerCase();
}

function is_source(node) {
    return node.type !== 'View' && Juttle.proc[proc_name(node)].info.type === 'source';
}

function is_sink(node) {
    return node.type === 'View' || Juttle.proc[proc_name(node)].info.type === 'sink';
}

function value_ast(result) {
    switch (values.typeOf(result)) {
        case 'Null':
            return {type: 'NullLiteral'};
        case 'Array':
            return {type: 'ArrayLiteral',
                    elements: _.map(result, function(el) { return value_ast(el);})};
        case 'RegExp':
            var flags = '';
            flags += result.global ? 'g' : '';
            flags += result.multiline ? 'm' : '';
            flags += result.ignoreCase ? 'i' : '';
            return {type: 'RegularExpressionLiteral',
                    value: result.source,
                    flags: flags};
        case 'Date':
            return {type:'MomentLiteral',
                    value:result.valueOf()};
        case 'Duration':
            return {type:'DurationLiteral',
                    value:result.valueOf()};
        case 'String':
            return {type: 'StringLiteral',
                    value: result};
        case 'Number':
            if (result === Infinity) {
                return {type: 'InfinityLiteral', negative: false};
            } else if (result === -Infinity) {
                return {type: 'InfinityLiteral', negative: true};
            } else if (result !== result) {
                return {type: 'NaNLiteral'};
            } else {
                return {type: 'NumericLiteral', value: result};
            }
            break;   // silence JSHint
        case 'Boolean':
            return {type: 'BooleanLiteral',
                    value: result};
        case 'Object':
            return {type: 'ObjectLiteral',
                    properties: _.map(result, function(value, key) {
                        return {type: 'ObjectProperty', key: value_ast(key), value: value_ast(value)};
                    })};
        case 'Filter':
            return {type: 'FilterLiteral',
                    ast: result.ast,
                    text: result.text};
        default:
            return result;
    }
}

function build_pname(index) {
    return 'p' + index;
}

var GraphBuilder = Base.extend({
    initialize: function(options) {
        this.nodes = [];
        this.inputs = [];
        this.functions = [];
        this.reducers = [];
        this.nproc = 0;
        this.uid = 0;
        this.consts = {};
        this.now = options.now;
        this.bnames = {};
        this.input_seqnos = {};
        this.stats = {};

        // contains the set of inputs
        this.input_values = options.inputs || {};
        // contains the set of functions computing implicit defaults of inputs
        this.input_defaults = options.input_defaults || {};
    },
    alloc_pname: function() {
        return build_pname(this.nproc++);
    },
    //
    // go through all the nodes and remove head and tail data structures
    // that were used to build the graph.  this isn't needed after the
    // flowgraph has been built (and interferes with JSON.stringify)
    //
    cleanup: function() {
        var k, nodes = this.nodes;
        for (k = 0; k < nodes.length; ++k) {
            delete nodes[k].head;
            delete nodes[k].tail;
        }
        delete this.bnames;
    },
    graph: function() {
        this.cleanup();
        return {nodes: this.nodes,
                inputs: this.inputs,
                functions: this.functions,
                reducers: this.reducers,
                now: this.now,
                stats: this.stats};
    },
    shortname: function(node) {
        return node.type + ' (' + node.uname + ')';
    },
    //XXX too simple but ok for a start
    describe_node: function(node) {
        var k, out = node.out;
        var desc = this.shortname(node) + '\n';
        for (k = 0; k < out.length; ++k) {
            desc += '\t-> ' + this.shortname(out[k]) + '\n';
        }
        return desc;
    },
    describe: function() {
        var k, nodes = this.nodes, desc = '';
        for (k = 0; k < nodes.length; ++k) {
            desc += this.describe_node(nodes[k]);
        }
        return desc;
    },
    add_node: function(node) {
        node.pname= node.pname.value;
        this.nodes.push(node);
        node.head = [ node ];
        node.tail = [ node ];
        node.out = [];
        node.in = [];
        node.shortcuts = [];
    },
    //XXX need a disconnect method
    connect: function(from, to) {
        if (is_sink(from)) {
            return false;
        }
        if (is_source(to)) {
            return false;
        }
        from.out.push(to.pname);
        to.in.push(from.pname);
        return true;
    },
    append: function(from, to) {
        var t, h, tail, head;
        tail = from.tail;
        head = to.head;
        // connect the outs to the ins
        var combined = false;
        for (h = 0; h < head.length; ++h) {
            for (t = 0; t < tail.length; ++t) {
                var c = this.connect(tail[t], head[h]);
                combined = combined || c;
            }
        }
        if (!combined) {
            if (_.any(tail, is_sink)) {
                throw errors.compileError('RT-PROC-AFTER-SINK', {
                    proc: proc_name(head[0]),
                    location: head[0].location
                });
            }
            if (_.any(head, is_source)) {
                throw errors.compileError('RT-PROC-BEFORE-SOURCE', {
                    proc: proc_name(tail[0]),
                    location: tail[0].location
                });
            }
        }
        from.tail = to.tail;
    },
    combine: function(a, b) {
        var k;
        // append the head items from proc to this.head
        // and the tail items from proc to this.tail
        // so this proc becomes the combined, parallel flow graph
        for (k = 0; k < b.head.length; ++k) {
            a.head.push(b.head[k]);
        }
        for (k = 0; k < b.tail.length; ++k) {
            a.tail.push(b.tail[k]);
        }
    },
    uname: function(uname) {
        if (this.bnames[uname]) {
            return this.bnames[uname];
        } else {
            return uname;
        }
    },
    alloc_const: function(uname, initializer) {
        return uname + '_' + this.uid++;
    },

    input_bname: function(mod_name, sub_list, input_name) {
        var mod_component = mod_name ? mod_name + '/' : '';
        var sub_component = sub_list.join('.') + '.';

        if (sub_component === '.') {
            return mod_component + input_name;
        }

        var key = mod_component + sub_component + input_name;
        if (_.has(this.input_seqnos, key)) {
            this.input_seqnos[key]++;
        } else {
            this.input_seqnos[key] = 0;
        }
        return key + '[' + this.input_seqnos[key]  + ']';
    },
    define_input: function(bname, input_name, options, isStatic) {
        var input = {id: bname, name: input_name, options: options, static: isStatic};
        input.value = this._compute_input_val(input);
        this.inputs.push(input);
        return input.value;
    },
    add_function: function(ast) {
        var bname = ast.uname + '_' + this.uid++;
        this.bnames[ast.uname] = bname;
        ast.sname = ast.uname;
        ast.uname = bname;
        this.functions.push(ast);
    },
    add_reducer: function(ast) {
        var bname = ast.uname + '_' + this.uid++;
        this.bnames[ast.uname] = bname;
        ast.uname = bname;
        this.reducers.push(ast);
    },
    set_const: function(uname, val) {
        this.consts[uname] = val;
    },
    get_const: function(uname, val) {
        if (!this.consts.hasOwnProperty(uname)) {
            throw new Error('GraphBuilder.get_const: attempt to retrieve undefined const ' + uname);
        }
        return this.consts[uname];
    },
    value_ast: function(result) {
        return value_ast(result);
    },
    build_sub_args: function (sub_sig, callopts, subname, location) {
        var opts = {};
        var argnames = _.pluck(sub_sig, 'name');

        // Explicitly passed params override those passed via -o
        _.each(callopts, function(opt) {
            if (!_.contains(argnames, opt.id)) {
                throw errors.compileError('RT-SUB-INVALID-ARG', {
                    sub: subname,
                    arg: opt.id,
                    location: opt.location
                });
            }
            opts[opt.id] = opt.value;
        });

        var sub_params = _.map(sub_sig, function(arg) {
            var val = opts[arg.name];
            if (arg.required && _.isUndefined(val)) {
                throw errors.compileError('RT-SUB-MISSING-ARG', {
                    sub: subname,
                    arg: arg.name,
                    location: location
                });
            }
            return val;
        });
        return sub_params;
    },
    record_stats: function(stats) {
        this.stats = stats;
    },
    _compute_input_val: function(input) {
        if (_.has(this.input_values, input.id)) {
            return this.input_values[input.id];
        }

        if (_.has(input.options, 'default')) {
            return input.options.default;
        }

        if (_.has(this.input_defaults, input.name)) {
            return this.input_defaults[input.name](input);
        }

        return null;
    }
});

module.exports = {
    GraphBuilder: GraphBuilder,
    value_ast: value_ast,
    build_pname: build_pname,
    is_sink: is_sink
};
