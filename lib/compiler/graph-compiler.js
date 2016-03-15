'use strict';

var _ = require('underscore');
var CodeGenerator = require('./code-generator');
var filters = require('./filters');
var FilterSimplifier = require('./filters/filter-simplifier');
var StaticFilterChecker = filters.StaticFilterChecker;
var DynamicFilterChecker = filters.DynamicFilterChecker;
var FilterJSCompiler = filters.FilterJSCompiler;
var errors = require('../errors');

var UNARY_OPS_TO_FUNCTIONS = {
    '+':   'pos',
    '-':   'neg',
    '~':   'bnot',
    'NOT': 'lnot'
};

var BINARY_OPS_TO_FUNCTIONS = {
    '+':   'add',
    '-':   'sub',
    '*':   'mul',
    '/':   'div',
    '%':   'mod',
    '&':   'band',
    '|':   'bor',
    '^':   'bxor',
    '<<':  'shl',
    '>>':  'shr',
    '>>>': 'shrz',
    '==':  'eql',
    '!=':  'neq',
    '=~':  'match',
    '!~':  'nmatch',
    '<':   'lt',
    '>':   'gt',
    '<=':  'lte',
    '>=':  'gte',
    'in':  'in',
    'AND': 'land',
    'OR':  'lor',
    '??':  'coal'
};

//
// take a dataflow graph representation and generate a JavaScript program
// that runs against the Juttle JavaScript runtime
//
class GraphCompiler extends CodeGenerator {
    constructor() {
        super();
        // XXX/sm we can easily get rid of emit and just recursively return
        // the code strings, except we rely on returning the uname for the
        // proc when building the graph contruction code
        this.code = '';
    }
    gen(graph) {
        var code, body, entry;
        this.gen_functionDefs(graph.functions);
        this.gen_reducerDefs(graph.reducers);
        entry = this.gen_procs(graph.nodes);

        body = this.code;
        //
        // wrap main in a closure so it does not pollute the name space.
        // call main and return its value, which is the flowgraph head object.
        // this should be the only object reference into the entire
        // compiled world and associated runtime.
        //
        code = '(function(juttle, program) {\n';
        code += 'var views=[];\n';
        code += body;
        code += 'return { views: views, graph: ' + entry + ' };\n';
        code += '})';
        return code;
    }
    emit(s) {
        this.code += s;
    }
    gen_functionDefs(fns) {
        var k;
        for (k = 0; k < fns.length; ++k) {
            this.gen_FunctionDef(fns[k]);
        }
    }
    gen_reducerDefs(reducers) {
        var k;
        for (k = 0; k < reducers.length; ++k) {
            this.gen_ReducerDef(reducers[k]);
        }
    }
    //XXX we shouldn't have to do this, but to support the old FlowGraph
    // module that reaches into the head field of the proc nodes, we do
    // this here and call combine() to set things up.  once we clean up
    // the FlowGraph implementation, we can simply and/or remove this
    find_sources(procs) {
        var k, i, id, out, touch = {}, srcs = [];
        for (k = 0; k < procs.length; ++k) {
            id = procs[k].pname;
            out = procs[k].out;
            for (i = 0; i < out.length; ++i) {
                touch[out[i]] = true;
            }
        }
        for (k = 0; k < procs.length; ++k) {
            id = procs[k].pname;
            if (!touch[id]) {
                srcs.push(id);
            }
        }
        return srcs;
    }
    gen_procs(procs) {
        var k, i, first, proc, from, out, shorts, srcs;
        for (k = 0; k < procs.length; ++k) {
            proc = this.gen_proc_element(procs[k]);
            if (!first) {
                first = proc;
            }
        }
        for (k = 0; k < procs.length; ++k) {
            from = procs[k].pname;
            out = procs[k].out;
            for (i = 0; i < out.length; ++i) {
                this.emit(from + '.connect(' + out[i] + ');\n');
            }
        }
        for (k = 0; k < procs.length; ++k) {
            from = procs[k].pname;
            shorts = procs[k].shortcuts;
            for (i = 0; i < shorts.length; ++i) {
                this.emit(from + '.shortcut(' + shorts[i].dest + ',' + shorts[i].pair + ', "' + shorts[i].name + '");\n');
            }
        }
        srcs = this.find_sources(procs);
        first = srcs[0];
        for (k = 1; k < srcs.length; ++k) {
            this.emit(first + '.combine(' + srcs[k] + ');\n');
        }
        return first;
    }
    gen_var(uname) {
        return 'var ' + uname + ';\n';
    }
    gen_var_decl(decl) {
        var code = this.gen_var(decl.symbol.uname);
        code += decl.symbol.uname;
        code += ' = ';
        code += decl.expr ? this.gen_expr(decl.expr) : 'null';
        code += ';\n';
        return code;
    }
    gen_const_decl(decl) {
        var uname = decl.symbol.uname;
        var code = this.gen_var(uname);
        code += uname;
        code += ' = ';
        code += this.gen_expr(decl.expr);
        code += ';\n';
        return code;
    }
    gen_BuiltinProc(node) {
        // When everything is switched over, gen_proc can
        // take node.name from node and we don't need to pass it as arg
        return this.gen_proc(node, node.name);
    }
    gen_proc(node, procName, params) {
        var pname = node.pname;
        params = params || {};
        params.$pname = pname;
        var soptions = this.gen_options(node.options,
                                        node.location,
                                        params);
        var code = 'var ' + pname + ' = ';
        code += 'new juttle.procs.' + procName + '('
            + soptions + ', '
            + JSON.stringify(node.location) + ', '
            + 'program'
            + ');\n';
        this.emit(code);
        return pname;
    }
    extend_options(opts, location) {
        var options = { type: 'ObjectLiteral', properties: [], location: location };
        function setopt(name, val, location) {
            var parts = name.split('.');
            var o = options;
            for (var i=0; i<parts.length-1; i++) {
                var part = parts[i];
                var index = _.findIndex(o.properties, function(property) {
                    return property.key.value === part;
                });
                if (index === -1) {
                    o.properties.push({
                        type: 'ObjectProperty',
                        key: { type: 'StringLiteral', value: part, location: location },
                        value: { type: 'ObjectLiteral', properties: [], location: location },
                        location: location
                    });
                    index = o.properties.length - 1;
                }
                o = o.properties[index].value;
                if (o.type !== 'ObjectLiteral') {
                    throw errors.compileError('BAD-NESTED-OPTION', {
                        name: name,
                        location: location
                    });
                }
            }
            o.properties.push({
                type: 'ObjectProperty',
                key: { type: 'StringLiteral', value: parts[parts.length-1], location: location },
                value: val,
                location: location
            });
        }

        _.each(opts, function(option) {
            if (option.id === 'o' || option.id === 'options') {
                if (option.val.type === 'ObjectLiteral' && !option.val.type !== 'ArrayLiteral') {
                    _.each(option.val.properties, function(property) {
                        setopt(property.key.value, property.value);
                    } );
                } else {
                    throw errors.compileError('INVALID-SINK-OPTIONS', {
                        procName: '',
                        location: location
                    });
                }
            } else {
                setopt(option.id, option.val, option.location);
            }
        });

        return options;
    }
    gen_options(options, location, params) {
        params = params || {};

        var code = this.gen_expr(this.extend_options(options, location));
        code += ',';
        code += this.gen_params(params);
        return code;
    }
    gen_params(params) {
        var code = '{';
        var comma = '';
        _.each(params, function(val, name) {
            var e;
            code += comma;
            if (name[0] !== '$') {
                e = val;
            } else {
                e = JSON.stringify(val);
                name = name.substring(1);
            }
            code+= name + ':' + e;
            comma = ',\n ';
        } );
        code += '}';
        return code;
    }

    // statements that can appear inside functions or reducers
    gen_function_statement(node) {
        switch (node.type) {
            case 'StatementBlock':
            case 'FunctionDef':
            case 'ConstStatement':
            case 'VarStatement':
            case 'EmptyStatement':
            case 'ExpressionStatement':
            case 'IfStatement':
            case 'ReturnStatement':
            case 'ErrorStatement':
                return this['gen_' + node.type](node);

            default:
                throw new Error('unrecognized function statement type ' + node.type);
        }
    }
    gen_fill_args(args) {
        for (var k = 0; k < args.length; k++) {
            if (args[k].default) {
                this.emit('if (' + args[k].symbol.uname + ' === undefined) {\n');
                this.emit(args[k].symbol.uname + ' = ' + this.gen_expr(args[k].default) + ';\n');
                this.emit('}\n');
            }
        }
    }
    gen_FunctionDef(node) {
        var k, elems = node.elements;
        var args = _.map(node.args, arg => arg.symbol.uname);
        if (node.stream) {
            args.unshift('pt');
        }
        this.emit('var ' + node.symbol.uname + '= function(' + args.join(', ') + ') {\n');
        this.emit('var ' + node.sname + ' = ' + node.symbol.uname + ';\n');
        this.gen_fill_args(node.args);
        for (k = 0; k < elems.length; ++k) {
            this.gen_function_statement(elems[k]);
        }
        this.emit('return null;\n');
        this.emit('};\n');
        this.emit(node.symbol.uname + '.location = ' + JSON.stringify(node.location) + ';\n');
    }

    gen_ReducerDef(node) {
        var k, code;
        var uname = node.symbol.uname;
        var args = _.map(node.args, arg => arg.symbol.uname);
        this.emit('var ' + uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(node.args);
        for (k = 0; k < node.elements.length; ++k) {
            var element = node.elements[k];
            this.gen_function_statement(element);
        }
        //
        // return object literal of the special functions
        // (and check they exist).  this creates a closure around
        // the state variables of the reducer.
        //
        var mapping = _.map(['update', 'expire', 'reset', 'result'], function(name) {
            var fn = node[name + '_uname'];
            if (fn === undefined && name !== 'expire' && name !== 'reset') {
                throw errors.compileError('MISSING-FUNCTION-IN-REDUCER', {
                    function: name,
                    reducer: node.name,
                    location: node.location
                });
            }
            return name + ':' + fn;
        } );
        code = '{' + mapping.join(',') + '}';

        this.emit('return ' + code + ';\n');
        this.emit('};\n');
    }
    gen_StatementBlock(node) {
        for (var k = 0; k < node.elements.length; ++k) {
            this.gen_function_statement(node.elements[k]);
        }
    }

    // elements of a flowgraph
    gen_proc_element(node) {
        // XXX
        var methods = {
            ParallelGraph: this.gen_ParallelGraph,
            SequentialGraph: this.gen_SequentialGraph,

            BuiltinProc: this.gen_BuiltinProc,
            SequenceProc: this.gen_SequenceProc,
            FilterProc: this.gen_FilterProc,
            PutProc: this.gen_PutProc,
            ReadProc: this.gen_ReadProc,
            ReduceProc: this.gen_ReduceProc,
            View: this.gen_View,
            SortProc: this.gen_SortProc,
            WriteProc: this.gen_WriteProc
        };
        if (methods.hasOwnProperty(node.type)) {
            return methods[node.type].call(this, node);
        }

        throw new Error('unrecognized processor or sub: ' + node.type);
    }

    gen_EmptyStatement(node) {
    }
    gen_ExpressionStatement(node) {
        this.emit(this.gen_expr(node.expression) + ';\n');
    }
    gen_AssignmentExpression(node) {
        var code = this.gen_assignment_lhs(node.left);
        code += ' ' + node.operator + ' ';
        code += this.gen_expr(node.right);
        return code;
    }

    gen_VarStatement(node) {
        var k, decls = node.declarations;
        for (k = 0; k < decls.length; ++k) {
            this.emit(this.gen_var_decl(decls[k]));
        }
    }
    gen_ConstStatement(node) {
        var k, decls = node.declarations;
        for (k = 0; k < decls.length; ++k) {
            this.emit(this.gen_const_decl(decls[k]));
        }
    }
    gen_IfStatement(node) {
        this.emit('if (');
        this.emit('juttle.values.ensureBoolean('
            + this.gen_expr(node.condition)
            + ', \'if statement: Invalid condition type (<type>).\')');
        this.emit(') {\n');
        this.gen_function_statement(node.ifStatement);
        this.emit('}\n');
        if (node.elseStatement) {
            this.emit('else {\n');
            this.gen_function_statement(node.elseStatement);
            this.emit('}\n');
        }
    }
    gen_ReturnStatement(node) {
        this.emit('return (' + (node.value ? this.gen_expr(node.value) : 'null') + ');\n');
    }
    gen_ErrorStatement(node) {
        this.emit('throw juttle.errors.runtimeError(\'CUSTOM-ERROR\', {\n');
        this.emit('message: juttle.values.ensureString('
            + this.gen_expr(node.message)
            + ', \'error statement: Invalid message type (<type>).\'),\n');
        this.emit('location: ' + JSON.stringify(node.location) + '\n');
        this.emit('});');
    }
    gen_ReadProc(node) {
        if (node.filter) {
            var checker = new StaticFilterChecker();
            checker.check(node.filter);

            var simplifier = new FilterSimplifier();
            node.filter = simplifier.simplify(node.filter);
        }

        var params = {
            $adapter: node.adapter,
            $filter_ast: node.filter,
            $optimization_info: node.optimization_info
        };

        return this.gen_proc(node, 'read', params);
    }
    gen_WriteProc(node) {
        return this.gen_proc(node, 'write', {$adapter: node.adapter});
    }
    gen_FilterProc(node) {
        var checker = new DynamicFilterChecker();
        checker.check(node.filter);

        var simplifier = new FilterSimplifier();
        node.filter = simplifier.simplify(node.filter);

        var compiler = new FilterJSCompiler();
        var code = compiler.compile(node.filter);

        return this.gen_proc(node, 'filter', {predicate: code});
    }
    gen_SequenceProc(node) {
        var checker = new DynamicFilterChecker();
        _.each (node.filters, (filter) => { checker.check(filter);});

        var simplifier = new FilterSimplifier();
        node.filters = _.map(node.filters, (filter) => simplifier.simplify(filter));

        var filters = _.map(node.filters, function(filter) {
            var compiler = new FilterJSCompiler();
            return compiler.compile(filter);
        });
        var code = '[' + filters.join (',') + ']';

        return this.gen_proc(node, 'sequence', {predicates: code});
    }
    gen_SortProc(node) {
        return this.gen_proc(node, 'sort');
    }
    gen_View(node) {
        // silly special case for node.name due to sink's special-case parsing
        // and AST.
        var proc = this.gen_proc(node, 'view', {$name: node.name});

        this.emit('views.push({name: "' + node.name + '",' +
                  'channel: ' + proc + '.channel,' +
                  'location: ' + JSON.stringify(node.location) + '});\n');

        return proc;
    }
    gen_CalendarExpression(node) {
        if (node.direction === 'up') {
            return 'juttle.types.JuttleMoment.endOf('+ this.gen_expr(node.expression) +', "'+ node.unit +'")';
        } else {
            return 'juttle.types.JuttleMoment.startOf('+ this.gen_expr(node.expression) +', "'+ node.unit +'")';
        }
    }
    gen_reducers(aName, reducers) {
        var k, uname, args;
        var code = '';
        for (k = 0; k < reducers.length; ++k) {
            uname = reducers[k].uname;
            args = reducers[k].arguments || [];
            var self = this;
            var argstr = _.map(args, function(arg) {
                return self.gen_expr(arg);
            } ).join(',');

            code += aName + '.push(' + uname + '(' + argstr + '));\n';
        }
        return code;
    }
    gen_reifier(reducers) {
        var code = '';

        //
        // build a function that creates each needed reducer
        // to evaluate the set of expression so the reduce proc
        // module can call this function to generate unique
        // reducer instances for each group
        //
        code += 'function() {\n';
        code += 'var reducers = [];\n';
        code += this.gen_reducers('reducers', reducers);
        code += 'return reducers;\n';
        code += '}';

        return code;
    }
    gen_ReifierProc(node, which) {
        var k;

        var maker, expr = 'function(pt, fns) {\n';
        for (k = 0; k < node.exprs.length; ++k) {
            expr += this.gen_expr(node.exprs[k]) + ';';
        }
        expr += '}';

        maker = this.gen_reifier(node.reducers);
        var reducer_index = _.pluck(node.reducers, 'index');
        var lhs = node.exprs.map(function(expr) {
            return expr.left.type === 'Field' ? expr.left.name : expr.left.argument.value;
        });

        return this.gen_proc(node, which, {
            expr: expr,
            funcMaker: maker,
            $reducer_index: reducer_index,
            $lhs: lhs
        });
    }

    gen_ReduceProc(node) {
        return this.gen_ReifierProc(node, 'reduce');
    }
    gen_PutProc(node) {
        return this.gen_ReifierProc(node, 'put');
    }
    gen_assignment_lhs(node) {
        switch (node.type) {
            case 'UnaryExpression':
                return this.gen_UnaryExpression(node, { lhs: true });
            case 'MemberExpression':
                return this.gen_MemberExpression(node, { lhs: true });
            case 'Variable':
                return this.gen_Variable(node, { lhs: true });
            case 'Field':
                return this.gen_Field(node, { lhs: true });
            default:
                throw new Error('unrecognized expression lhs ' + node.type);
        }
    }

    gen_expr(node) {

        switch (node.type) {
            case 'AssignmentExpression':
            case 'CallExpression':
            case 'BinaryExpression':
            case 'CalendarExpression':
            case 'NullLiteral':
            case 'NumberLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'BooleanLiteral':
            case 'StringLiteral':
            case 'MultipartStringLiteral':
            case 'RegExpLiteral':
            case 'FilterLiteral':
            case 'ArrayLiteral':
            case 'Variable':
            case 'ToString':
            case 'ObjectLiteral':
            case 'ConditionalExpression':
            case 'PostfixExpression':
            case 'MomentLiteral':
            case 'DurationLiteral':
                return this['gen_' + node.type](node);

            case 'Field':
                return this.gen_Field(node, {});

            case 'UnaryExpression':
                return this.gen_UnaryExpression(node, {});

            case 'MemberExpression':
                return this.gen_MemberExpression(node, {});

            default:
                throw new Error('unrecognized expression type ' + node.type +
                            '\n' + JSON.stringify(node, 0, 4));
        }
    }

    gen_PostfixExpression(node) {
        var expr = this.gen_expr(node.expression);
        var op = node.operator;

        return '(juttle.values.ensureNumber('
            + expr
            + ', \'"' + op + '" operator: Invalid operand type (<type>).\'),'
            + expr + op + ')';
    }
    gen_CallExpression(node) {
        switch (node.callee.symbol.type) {
            case 'function':
                var k, code;
                code = 'juttle.ops.call(' + node.fname;
                if (node.arguments) {
                    for (k = 0; k < node.arguments.length; ++k) {
                        code += ', ';
                        code += this.gen_expr(node.arguments[k]);
                    }
                }
                code += ')';
                return code;

            case 'reducer':
                var result = 'fns[' + node.reducer_call_index + '].result()';
                if (node.context === 'put') {
                    // put must consume the current point before calling result
                    result = '(fns[' + node.reducer_call_index + '].update(pt),' + result + ')';
                }
                return result;

            default:
                throw new Error('Invalid symbol type: ' + node.callee.symbol.type + '.');
        }
    }

    gen_UnaryExpression(node, opts) {
        var expr = this.gen_expr(node.argument);
        var op = node.operator;

        switch (op) {
            case '*':
                if (opts.lhs) {
                    return 'pt[' + expr + ']';
                } else {
                    return 'juttle.ops.pget(pt,' + expr + ')';
                }
                break;   // silence ESLint

            case '++':
            case '--':
                return '(juttle.values.ensureNumber('
                    + expr
                    + ', \'"' + op + '" operator: Invalid operand type (<type>).\'),'
                    + op + expr + ')';

            case '!':
                return '!juttle.values.ensureBoolean('
                    + expr
                    + ', \'"!" operator: Invalid operand type (<type>).\')';

            default:
                return 'juttle.ops.' + UNARY_OPS_TO_FUNCTIONS[op] + '(' + expr + ')';
        }
    }
    gen_BinaryExpression(node) {
        var left = this.gen_expr(node.left);
        var right = this.gen_expr(node.right);

        if (node.operator === '&&' || node.operator === '||') {
            return 'juttle.values.ensureBoolean('
                + left
                + ', \'"' + node.operator + '" operator: Invalid operand type (<type>).\')'
                + ' ' + node.operator + ' '
                + 'juttle.values.ensureBoolean('
                + right
                + ', \'"' + node.operator + '" operator: Invalid operand type (<type>).\')';
        } else {
            return 'juttle.ops.'
                + BINARY_OPS_TO_FUNCTIONS[node.operator]
                + '(' + left + ', ' + right + ')';
        }
    }
    gen_ConditionalExpression(node) {
        return '(juttle.values.ensureBoolean('
            + this.gen_expr(node.test)
            + ', \'Ternary operator: Invalid operand type (<type>).\')?('
            + this.gen_expr(node.alternate) + '):('
            + this.gen_expr(node.consequent) + '))';
    }
    gen_Variable(node) {
        return node.symbol.uname;
    }
    gen_Field(node, opts) {
        var name = JSON.stringify(node.name);
        if (opts.lhs) {
            return 'pt[' + name + ']';
        } else {
            return 'juttle.ops.pget(pt,' + name + ')';
        }
    }
    gen_MemberExpression(node, opts) {
        if (node.symbol) {
            return node.symbol.uname;
        } else {
            if (opts.lhs) {
                return this.gen_expr(node.object)
                    + '[' + this.gen_expr(node.property) + ']';
            } else {
                return 'juttle.ops.get('
                    + this.gen_expr(node.object) + ','
                    + this.gen_expr(node.property)
                    + ')';
            }
        }
    }
}

module.exports = GraphCompiler;
