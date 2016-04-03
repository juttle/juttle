'use strict';

var _ = require('underscore');
var values = require('../runtime/values');
var procs = require('../runtime/procs');
var errors = require('../errors');
var SemanticPass = require('./semantic');

function proc_name(node) {
    return (node.name || node.type).replace('Proc', '').toLowerCase();
}

function is_source(node) {
    return node.type !== 'NativeModuleProc' && node.type !== 'View' && procs[proc_name(node)].info.type === 'source';
}

function is_sink(node) {
    return node.type !== 'NativeModuleProc' && (node.type === 'View' || procs[proc_name(node)].info.type === 'sink');
}

function build_pname(index) {
    return 'p' + index;
}

class GraphBuilder {
    constructor(options) {
        this.nodes = [];
        this.inputs = [];
        this.functions = [];
        this.reducers = [];
        this.native_modules = [];
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
    }
    alloc_pname() {
        return build_pname(this.nproc++);
    }
    //
    // go through all the nodes and remove head and tail data structures
    // that were used to build the graph.  this isn't needed after the
    // flowgraph has been built (and interferes with JSON.stringify)
    //
    cleanup() {
        var k, nodes = this.nodes;
        for (k = 0; k < nodes.length; ++k) {
            delete nodes[k].head;
            delete nodes[k].tail;
        }
        delete this.bnames;
    }
    graph() {
        this.cleanup();
        return {nodes: this.nodes,
                inputs: this.inputs,
                functions: this.functions,
                reducers: this.reducers,
                native_modules: this.native_modules,
                now: this.now,
                stats: this.stats};
    }
    shortname(node) {
        return node.type + ' (' + node.uname + ')';
    }
    //XXX too simple but ok for a start
    describe_node(node) {
        var k, out = node.out;
        var desc = this.shortname(node) + '\n';
        for (k = 0; k < out.length; ++k) {
            desc += '\t-> ' + this.shortname(out[k]) + '\n';
        }
        return desc;
    }
    describe() {
        var k, nodes = this.nodes, desc = '';
        for (k = 0; k < nodes.length; ++k) {
            desc += this.describe_node(nodes[k]);
        }
        return desc;
    }
    add_node(node) {
        node.pname= node.pname.value;
        this.nodes.push(node);
        node.head = [ node ];
        node.tail = [ node ];
        node.out = [];
        node.in = [];
        node.shortcuts = [];
    }
    //XXX need a disconnect method
    connect(from, to) {
        if (is_sink(from)) {
            return false;
        }
        if (is_source(to)) {
            return false;
        }
        from.out.push(to.pname);
        to.in.push(from.pname);
        return true;
    }
    append(from, to) {
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
                throw errors.compileError('PROC-AFTER-SINK', {
                    proc: proc_name(head[0]),
                    location: head[0].location
                });
            }
            if (_.any(head, is_source)) {
                throw errors.compileError('PROC-BEFORE-SOURCE', {
                    proc: proc_name(tail[0]),
                    location: tail[0].location
                });
            }
        }
        from.tail = to.tail;
    }
    combine(a, b) {
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
    }
    uname(uname) {
        if (this.bnames[uname]) {
            return this.bnames[uname];
        } else {
            return uname;
        }
    }
    alloc_const(uname, initializer) {
        return uname + '_' + this.uid++;
    }

    input_bname(mod_name, sub_list, input_name) {
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
    }
    define_input(bname, input_name, options, isStatic) {
        var input = {id: bname, name: input_name, options: options, static: isStatic};
        input.value = this._compute_input_val(input);
        this.inputs.push(input);
        return input.value;
    }
    add_function(ast) {
        var bname = ast.symbol.uname + '_' + this.uid++;
        this.bnames[ast.symbol.uname] = bname;
        ast.sname = ast.symbol.uname;
        ast.symbol.uname = bname;
        this.functions.push(ast);
    }
    add_reducer(ast) {
        var bname = ast.symbol.uname + '_' + this.uid++;
        this.bnames[ast.symbol.uname] = bname;
        ast.symbol.uname = bname;
        this.reducers.push(ast);
    }
    set_const(uname, val) {
        this.consts[uname] = val;
    }
    get_const(uname, val) {
        if (!this.consts.hasOwnProperty(uname)) {
            throw new Error('GraphBuilder.get_const: attempt to retrieve undefined const ' + uname);
        }
        return this.consts[uname];
    }
    value_ast(result) {
        // The _semantic_ast call is needed to correctly process filter
        // literals.
        var semantic = new SemanticPass({ now: this.now });
        var ast = values.toAST(result);

        semantic.sa_expr(ast);

        return ast;
    }
    build_sub_args(sub_sig, callopts, subname, location) {
        var opts = {};
        var argnames = _.pluck(sub_sig, 'name');

        // Explicitly passed params override those passed via -o
        _.each(callopts, function(opt) {
            if (!_.contains(argnames, opt.id)) {
                throw errors.compileError('SUB-INVALID-ARG', {
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
                throw errors.compileError('SUB-MISSING-ARG', {
                    sub: subname,
                    arg: arg.name,
                    location: location
                });
            }
            return val;
        });
        return sub_params;
    }
    record_stats(stats) {
        this.stats = stats;
    }
    _compute_input_val(input) {
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
    native_module(uname, path, source) {
        this.native_modules.push({uname: uname, path: path, source: source});
    }
}

module.exports = {
    GraphBuilder: GraphBuilder,
    build_pname: build_pname,
    is_sink: is_sink
};
