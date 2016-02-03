'use strict';

var _ = require('underscore');
var CodeGenerator = require('./code-generator');
var filters = require('./filters');
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

var SYMBOL_TYPE_NAMES = {
    'function': 'function',
    'reducer': 'reducer',
    'sub': 'subgraph',
    'import': 'module'
};

//
// take a dataflow graph representation and generate a javascript program
// that runs against the Juttle javascript runtime
//
var GraphCompiler = CodeGenerator.extend({
    initialize: function() {
        // XXX/sm we can easily get rid of emit and just recursively return
        // the code strings, except we rely on returning the uname for the
        // proc when building the graph contruction code
        this.code = '';
    },
    gen: function(graph) {
        var code, body, entry;
        this.now = graph.now;
        this.gen_now(graph.now);
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
        code = '(function(juttle) {\n';
        code += 'var views=[];\n';
        code += 'var program = {};\n';
        code += body;
        code += 'return { program: program, now: program.now, views: views,';
        code += 'graph: ' + entry + ' };\n';
        code += '})';
        return code;
    },
    emit: function(s) {
        this.code += s;
    },
    gen_now: function(now) {
        this.emit('program.now = ' + 'new juttle.types.JuttleMoment("' + now + '");');
    },
    gen_functionDefs: function(fns) {
        var k;
        for (k = 0; k < fns.length; ++k) {
            this.gen_FunctionDef(fns[k]);
        }
    },
    gen_reducerDefs: function(reducers) {
        var k;
        for (k = 0; k < reducers.length; ++k) {
            this.gen_ReducerDef(reducers[k]);
        }
    },
    //XXX we shouldn't have to do this, but to support the old FlowGraph
    // module that reaches into the head field of the proc nodes, we do
    // this here and call combine() to set things up.  once we clean up
    // the FlowGraph implementation, we can simply and/or remove this
    find_sources: function(procs) {
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
    },
    gen_procs: function(procs) {
        var k, i, first, node, from, out, shorts, srcs;
        for (k = 0; k < procs.length; ++k) {
            node = this.gen_proc_element(procs[k]);
            if (!first) {
                first = node;
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
    },
    gen_var: function(uname) {
        return 'var ' + uname + ';\n';
    },
    gen_var_decl: function(decl) {
        var code = this.gen_var(decl.uname);
        code += decl.uname;
        code += ' = ';
        code += decl.expr ? this.gen_expr(decl.expr) : 'null';
        code += ';\n';
        return code;
    },
    gen_const_decl: function(decl) {
        var uname = decl.uname;
        var code = this.gen_var(uname);
        code += uname;
        code += ' = ';
        code += this.gen_expr(decl.expr);
        code += ';\n';
        return code;
    },
    gen_BuiltinProc: function(ast) {
        // When everything is switched over, gen_proc can
        // take ast.name from ast and we don't need to pass it as arg
        return this.gen_proc(ast, ast.name);
    },
    gen_proc: function(ast, procName, params) {
        var pname = ast.pname;
        var soptions = this.gen_options(ast.options,
                                        ast.location,
                                        params);
        var code = 'var ' + pname + ' = ';
        code += 'new juttle.procs.' + procName + '('
            + soptions + ', '
            + JSON.stringify(ast.location) + ', '
            + 'program'
            + ');\n';
        this.emit(code);
        return pname;
    },
    gen_options: function(options, location, params) {
        params = params || {};

        var code = 'Juttle.extend_options([';
        var comma = '';
        var that = this;

        _.each(options, function(option) {
            var e;
            code += comma;
            e = that.gen_expr(option.val);
            code += '{name: "' + option.id + '", val:' + e + '}';
            comma = ',\n ';
        });
        code += '], ';
        code += JSON.stringify(location);
        code += ')';
        code += ',';
        code += this.gen_params(params);
        return code;
    },
    gen_params: function(params) {
        var code = '';
        var comma = '';
        if (typeof params === 'string') {
            code += params;
        } else {
            code += '{';
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
        }
        return code;
    },

    // statements that can appear inside functions or reducers
    gen_function_statement: function(ast) {
        switch (ast.type) {
            case 'StatementBlock':
            case 'FunctionDef':
            case 'ConstStatement':
            case 'VarStatement':
            case 'EmptyStatement':
            case 'AssignmentStatement':
            case 'IfStatement':
            case 'ReturnStatement':
            case 'ErrorStatement':
                return this['gen_' + ast.type](ast);

            default:
                throw new Error('unrecognized function statement type ' + ast.type);
        }
    },
    gen_fill_args: function(args) {
        for (var k = 0; k < args.length; k++) {
            if (args[k].default) {
                this.emit('if (' + args[k].uname + ' === undefined) {\n');
                this.emit(args[k].uname + ' = ' + this.gen_expr(args[k].default) + ';\n');
                this.emit('}\n');
            }
        }
    },
    gen_FunctionDef: function(ast) {
        var k, elems = ast.elements;
        var args = _.pluck(ast.args, 'uname');
        if (ast.stream) {
            args.unshift('pt');
        }
        this.emit('var ' + ast.uname + '= function(' + args.join(', ') + ') {\n');
        this.emit('var ' + ast.sname + ' = ' + ast.uname + ';\n');
        this.gen_fill_args(ast.args);
        for (k = 0; k < elems.length; ++k) {
            this.gen_function_statement(elems[k]);
        }
        this.emit('return null;\n');
        this.emit('};\n');
        this.emit(ast.uname + '.location = ' + JSON.stringify(ast.location) + ';\n');
    },

    gen_ReducerDef: function(ast) {
        var k, code;
        var uname = ast.uname;
        var args = _.pluck(ast.args, 'uname');
        this.emit('var ' + uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(ast.args);
        for (k = 0; k < ast.elements.length; ++k) {
            var node = ast.elements[k];
            this.gen_function_statement(node);
        }
        //
        // return object literal of the special functions
        // (and check they exist).  this creates a closure around
        // the state variables of the reducer.
        //
        var mapping = _.map(['update', 'expire', 'reset', 'result'], function(name) {
            var fn = ast[name + '_uname'];
            if (fn === undefined && name !== 'expire' && name !== 'reset') {
                throw errors.compileError('RT-MISSING-FUNCTION-IN-REDUCER', {
                    function: name,
                    reducer: ast.name,
                    location: ast.location
                });
            }
            return name + ':' + fn;
        } );
        code = '{' + mapping.join(',') + '}';

        this.emit('return ' + code + ';\n');
        this.emit('};\n');
    },
    gen_StatementBlock: function(ast) {
        for (var k = 0; k < ast.elements.length; ++k) {
            this.gen_function_statement(ast.elements[k]);
        }
    },

    // elements of a flowgraph
    gen_proc_element: function(ast) {
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
        if (methods.hasOwnProperty(ast.type)) {
            return methods[ast.type].call(this, ast);
        }

        throw new Error('unrecognized processor or sub: ' + ast.type);
    },

    gen_EmptyStatement: function(ast) {
    },
    // this type of assignment lives only in places where there are
    // no points or reducers
    gen_AssignmentStatement: function(ast) {
        var code = this.gen_assignment_lhs(ast.left);
        //XXX need to handle op's other than "="
        code +=  ' = ' + this.gen_expr(ast.expr) + ';\n';
        this.emit(code);
    },
    // this type of assignment lives in places where there can be
    // points or reducers
    gen_AssignmentExpression: function(ast) {
        var code = this.gen_assignment_lhs(ast.left);
        code += ' ' + ast.operator + ' ';
        code += this.gen_expr(ast.right);
        return code;
    },

    gen_VarStatement: function(ast) {
        var k, decls = ast.declarations;
        for (k = 0; k < decls.length; ++k) {
            this.emit(this.gen_var_decl(decls[k]));
        }
    },
    gen_ConstStatement: function(ast) {
        var k, decls = ast.declarations;
        for (k = 0; k < decls.length; ++k) {
            this.emit(this.gen_const_decl(decls[k]));
        }
    },
    gen_IfStatement: function(ast) {
        this.emit('if (');
        this.emit('juttle.values.ensureBoolean('
            + this.gen_expr(ast.condition)
            + ', \'if statement: Invalid condition type (<type>).\')');
        this.emit(') {\n');
        this.gen_function_statement(ast.ifStatement);
        this.emit('}\n');
        if (ast.elseStatement) {
            this.emit('else {\n');
            this.gen_function_statement(ast.elseStatement);
            this.emit('}\n');
        }
    },
    gen_ReturnStatement: function(ast) {
        this.emit('return (' + (ast.value ? this.gen_expr(ast.value) : 'null') + ');\n');
    },
    gen_ErrorStatement: function(ast) {
        this.emit('throw juttle.errors.runtimeError(\'RT-CUSTOM-ERROR\', {\n');
        this.emit('message: juttle.values.ensureString('
            + this.gen_expr(ast.message)
            + ', \'error statement: Invalid message type (<type>).\'),\n');
        this.emit('location: ' + JSON.stringify(ast.location) + '\n');
        this.emit('});');
    },
    gen_ReadProc: function(ast) {
        if (ast.filter) {
            var checker = new StaticFilterChecker();
            checker.check(ast.filter);
        }

        var params = {
            $adapter: ast.adapter,
            $filter_ast: ast.filter,
            $optimization_info: ast.optimization_info
        };

        return this.gen_proc(ast, 'read', params);
    },
    gen_WriteProc: function(ast) {
        return this.gen_proc(ast, 'write', {$adapter: ast.adapter});
    },
    gen_FilterProc: function(ast) {
        var checker = new DynamicFilterChecker();
        checker.check(ast.filter);

        var compiler = new FilterJSCompiler();
        var code = compiler.compile(ast.filter);

        return this.gen_proc(ast, 'filter', '{predicate: ' + code + '}');
    },
    gen_SequenceProc: function(ast) {
        var checker = new DynamicFilterChecker();
        _.each (ast.filters, (filter) => { checker.check(filter);});


        var filters = _.map(ast.filters, function(filter) {
            var compiler = new FilterJSCompiler();
            return compiler.compile(filter);
        });
        var code = '[' + filters.join (',') + ']';

        return this.gen_proc(ast, 'sequence', '{predicates: ' + code + '}');
    },
    gen_SortProc: function(ast) {
        return this.gen_proc(ast, 'sort');
    },
    gen_View: function(ast) {
        // silly special case for ast.name due to sink's special-case parsing
        // and AST.
        var proc = this.gen_proc(ast, 'view', '{name: "'+ast.name+'"}');

        this.emit('views.push({name: "' + ast.name + '",' +
                  'channel: ' + proc + '.channel,' +
                  'location: ' + JSON.stringify(ast.location) + '});\n');

        return proc;
    },
    gen_CalendarExpression: function(ast) {
        if (ast.direction === 'up') {
            return 'juttle.types.JuttleMoment.endOf('+ this.gen_expr(ast.expression) +', "'+ ast.unit +'")';
        } else {
            return 'juttle.types.JuttleMoment.startOf('+ this.gen_expr(ast.expression) +', "'+ ast.unit +'")';
        }
    },
    gen_reducers: function(aName, reducers) {
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
    },
    gen_reifier: function(reducers) {
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
    },
    gen_ReifierProc: function(ast, which) {
        var k;

        var maker, expr = 'function(pt, fns) {\n';
        for (k = 0; k < ast.exprs.length; ++k) {
            expr += this.gen_expr(ast.exprs[k]) + ';';
        }
        expr += '}';

        maker = this.gen_reifier(ast.reducers);
        var reducer_index = _.pluck(ast.reducers, 'index');
        var lhs = ast.exprs.map(function(expr) {
            return expr.left.expression.value;
        });

        return this.gen_proc(ast, which,
                             '{ expr:' + expr + ',' +
                             ' funcMaker:' + maker + ',' +
                             ' reducer_index:' + JSON.stringify(reducer_index) + ',' +
                             ' lhs:' + JSON.stringify(lhs) + '}');
    },

    gen_ReduceProc: function(ast) {
        return this.gen_ReifierProc(ast, 'reduce');
    },
    gen_PutProc: function(ast) {
        return this.gen_ReifierProc(ast, 'put');
    },
    gen_assignment_lhs: function(ast) {
        switch (ast.type) {
            case 'UnaryExpression':
                return this.gen_UnaryExpression(ast, { lhs: true });
            case 'PropertyAccess':
                return this.gen_PropertyAccess(ast, { lhs: true });
            case 'Variable':
                return ast.uname;
            default:
                throw new Error('unrecognized expression lhs ' + ast.type);
        }
    },

    gen_expr: function(ast) {

        switch (ast.type) {
            case 'AssignmentExpression':
            case 'FunctionCall':
            case 'ReducerCall':
            case 'BinaryExpression':
            case 'CalendarExpression':
            case 'NullLiteral':
            case 'NumericLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'BooleanLiteral':
            case 'StringLiteral':
            case 'MultipartStringLiteral':
            case 'RegularExpressionLiteral':
            case 'FilterLiteral':
            case 'ArrayLiteral':
            case 'Variable':
            case 'ToString':
            case 'ObjectLiteral':
            case 'ConditionalExpression':
            case 'PostfixExpression':
            case 'MomentLiteral':
            case 'DurationLiteral':
                return this['gen_' + ast.type](ast);

            case 'UnaryExpression':
                return this.gen_UnaryExpression(ast, {});

            case 'PropertyAccess':
                return this.gen_PropertyAccess(ast, {});

            default:
                throw new Error('unrecognized expression type ' + ast.type +
                            '\n' + JSON.stringify(ast, 0, 4));
        }
    },

    gen_PostfixExpression: function(ast) {
        var expr = this.gen_expr(ast.expression);
        var op = ast.operator;

        return '(juttle.values.ensureNumber('
            + expr
            + ', \'"' + op + '" operator: Invalid operand type (<type>).\'),'
            + expr + op + ')';
    },
    gen_FunctionCall: function(ast) {
        var k, code;
        code = 'juttle.ops.call(' + ast.fname;
        if (ast.arguments) {
            for (k = 0; k < ast.arguments.length; ++k) {
                code += ', ';
                code += this.gen_expr(ast.arguments[k]);
            }
        }
        code += ')';
        return code;
    },
    gen_ReducerCall: function(ast) {
        var result = 'fns[' + ast.reducer_call_index + '].result()';
        if (ast.context === 'stream') {
            // put must consume the current point before calling result
            result = '(fns[' + ast.reducer_call_index + '].update(pt),' + result + ')';
        }
        return result;
    },

    gen_UnaryExpression: function(ast, opts) {
        var expr = this.gen_expr(ast.expression);
        var op = ast.operator;

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
    },
    gen_BinaryExpression: function(ast) {
        var left = this.gen_expr(ast.left);
        var right = this.gen_expr(ast.right);

        if (ast.operator === '&&' || ast.operator === '||') {
            return 'juttle.values.ensureBoolean('
                + left
                + ', \'"' + ast.operator + '" operator: Invalid operand type (<type>).\')'
                + ' ' + ast.operator + ' '
                + 'juttle.values.ensureBoolean('
                + right
                + ', \'"' + ast.operator + '" operator: Invalid operand type (<type>).\')';
        } else {
            return 'juttle.ops.'
                + BINARY_OPS_TO_FUNCTIONS[ast.operator]
                + '(' + left + ', ' + right + ')';
        }
    },
    gen_ConditionalExpression: function(ast) {
        return '(juttle.values.ensureBoolean('
            + this.gen_expr(ast.condition)
            + ', \'Ternary operator: Invalid operand type (<type>).\')?('
            + this.gen_expr(ast.trueExpression) + '):('
            + this.gen_expr(ast.falseExpression) + '))';
    },
    gen_Variable: function(ast) {
        switch (ast.symbol.type) {
            case 'import':
            case 'function':
            case 'reducer':
            case 'sub':
                throw errors.compileError('RT-CANNOT-USE-AS-VARIABLE', {
                    thing: SYMBOL_TYPE_NAMES[ast.symbol.type],
                    location: ast.location
                });
            default:
                return ast.uname;
        }
    },
    gen_PropertyAccess: function(ast, opts) {
        if (!ast.computed) {
            return ast.uname;
        } else {
            if (opts.lhs) {
                return this.gen_expr(ast.base)
                    + '[' + this.gen_expr(ast.name) + ']';
            } else {
                return 'juttle.ops.get('
                    + this.gen_expr(ast.base) + ','
                    + this.gen_expr(ast.name)
                    + ')';
            }
        }
    }
});

module.exports = GraphCompiler;
