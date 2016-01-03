
var _ = require('underscore');
var Base = require('extendable-base');
var Filter = require('./runtime/filter');
var JuttleMoment = require('./moment').JuttleMoment;
var value_ast = require('./compiler/graph-builder').value_ast;
var build_pname = require('./compiler/graph-builder').build_pname;


var Graph = Base.extend({
    get_inputs: function() {
        return this.built_graph.inputs;
    },

    add_node: function(type, name) {
        var index = this.get_nodes().length;
        var new_pname = build_pname(index);

        var node = { type: type,
                     options: [],
                     pname: new_pname,
                     out: [],
                     in: [],
                     shortcuts: [] };
        if (name) {
            node.name = name;
        }
        this.built_graph.nodes.push(node);
        return node;
    },
    get_roots: function() {
        return _.filter(this.built_graph.nodes, function(node) { return node.in.length === 0;});
    },
    get_leaves: function() {
        return _.filter(this.built_graph.nodes, function(node) { return node.out.length === 0;});
    },
    _get_node: function(pname) {
        return _.findWhere(this.built_graph.nodes, {pname: pname});
    },
    get_nodes: function() {
        return this.built_graph.nodes;
    },
    node_get_outputs: function(node) {
        var self = this;
        return _.map(node.out, function(pname) { return self._get_node(pname);});
    },

    swap_neighbors: function(left, right) {
        var left_inputs = this.node_get_inputs(left);
        var right_outputs = this.node_get_outputs(right);

        // reverse edge between the left and right nodes
        this.remove_edge(left, right);
        this.add_edge(right, left);

        // make edges going into left node
        // go into right node instead
        _.each(left_inputs, function(node) {
            this.remove_edge(node, left);
            this.add_edge(node, right);
        }, this);

        // make edges going out of the right node
        // go out of the left node instead
        _.each(right_outputs, function(node) {
            this.remove_edge(right, node);
            this.add_edge(left, node);
        }, this);
    },
    node_get_inputs: function(node) {
        var self = this;
        return _.map(node.in, function(pname) { return self._get_node(pname);});
    },
    // If an option with this name is already present, it will be overridden
    node_set_option: function(node, name, value) {
        var ast = value_ast(value);
        var opt_ast = _.findWhere(node.options, {id: name});
        if (opt_ast) {
            opt_ast.val = ast;
        } else {
            node.options.push({id: name, val: ast});
        }
    },
    node_set_param: function(node, name, value) {
        node[name] = value;
    },
    node_has_option: function(node, name) {
        var opt_ast = _.findWhere(node.options, {id: name});
        return opt_ast !== undefined;
    },
    node_get_param: function(node, name) {
        return node[name];
    },
    node_get_option_names: function(node) {
        return _.pluck(node.options, 'id');
    },
    node_get_option: function(node, name) {
        var opt_ast = _.findWhere(node.options, {id: name});

        function build_literal(literal_ast) {
            switch(literal_ast.type) {
                case 'NumericLiteral':
                case 'StringLiteral':
                case 'BooleanLiteral':
                    return literal_ast.value;
                case 'InfinityLiteral':
                    return literal_ast.negative ? -Infinity : Infinity;
                case 'NaNLiteral':
                    return NaN;
                case 'ArrayLiteral':
                    return _.map(literal_ast.elements, build_literal);
                case 'ObjectLiteral':
                    return _.object(_.map(literal_ast.properties, function(prop) {
                        return [build_literal(prop.key), build_literal(prop.value)];
                    }));
                case 'DurationLiteral':
                    return new JuttleMoment.duration(literal_ast.value);
                case 'MomentLiteral':
                    return new JuttleMoment(literal_ast.value);
                case 'FilterLiteral':
                    return new Filter(literal_ast.ast, literal_ast.text);
                default:
                    throw new Error("Program.node_get_option doesn't know how to handle " + literal_ast.type);
            }
        }
        if (opt_ast === undefined) {
            return undefined;
        }
        return build_literal(opt_ast.val);
    },
    // Returns whether or not the given node has only the given option keys
    node_contains_only_options: function(node, options) {
        return _.difference(this.node_get_option_names(node), options).length === 0;
    },
    // Danger! If you add an edge between nodes that are already connected by
    // another directed path, fan-in accounting at the dest will likely be
    // confused, with unpredictable runtime results.
    add_edge: function(src, dest) {
        if (_.contains(src.out, dest.pname)) {
            throw new Error('Invalid edge');
        }
        src.out.push(dest.pname);
        dest.in.push(src.pname);
    },

    remove_edge: function(src, dest) {
        if (!_.contains(src.out, dest.pname)) {
            throw new Error('Invalid edge: does not exist');
        }

        src.out = _.without(src.out, dest.pname);
        dest.in = _.without(dest.in, src.pname);
    },
    remove_node: function(node) {
        var self = this;
        var inputs = this.node_get_inputs(node);
        var outputs = this.node_get_outputs(node);

        inputs.forEach(function disconnectInput(input) {
            self.remove_edge(input, node);
        });

        outputs.forEach(function disconnectOutput(output) {
            self.remove_edge(node, output);
        });

        inputs.forEach(function connectInToOuts(input) {
            outputs.forEach(function connectInToOut(output) {
                self.add_edge(input, output);
            });
        });

        var index = this.built_graph.nodes.indexOf(node);
        if (index === -1) {
            throw new Error('tried to remove nonexistent node');
        }

        this.built_graph.nodes.splice(index, 1);
    },
    // Unlike edges, shortcuts can be added between nodes that already have a
    // directed path between them. This works by having the shortcut appear
    // (to the dest) to be coming from a 'pair' node rather than the actual
    // source. The pair must be connected to one of the dest's inputs.
    add_shortcut: function(src, pair, dest, shortcut_name) {
        if (!_.contains(dest.in, pair.pname)) {
            throw new Error('Invalid shortcut (pair)');
        }
        if (_.contains(src.out, dest.pname)) {
            throw new Error('Invalid shortcut (connecting to neighbor)');
        }
        src.shortcuts.push({dest: dest.pname,
                            pair: pair.pname,
                            name: shortcut_name});
    }
});

module.exports = Graph;
