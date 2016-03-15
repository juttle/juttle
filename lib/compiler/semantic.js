'use strict';

// performs semantic analysis of the AST, modifying the AST in place,
// and returning the modifed AST.
// - allocates variables using unique names to resolve scope
// - performs all of the juttle coercion rules for converting variable
//   names to strings
// - resolves module function names and variable names and decorates AST
//   node with resolved names

var _ = require('underscore');
var Scope = require('./scope').Scope;
var reset_scope = require('./scope').reset;
var StaticInputDetector = require('./static-input-detector');
var errors = require('../errors');

var is_builtin_reducer = require('../runtime/reducers').is_builtin_reducer;

// Rather than do builtin proc analysis in this ad hoc way, we should add builtins
// to the scope (similary to how had we add builtin modules), but we can't
// just handle built-ins as subs, because we don't want the strict
// arity-checking they have. (Also the goal of this work is to eventually
// get rid of subs). So in a second pass we should get rid of this and
// unify the way the compiler handles user-defined subs and built-in subs (and while
// we're at it support optional user-defined sub arguments, for
// conveniency, and also for consistency with builtins).
const BUILTIN_PROCS = {
    'batch': { maybe: ['arg'] },
    'emit': {},
    'head': { maybe: ['arg', 'groupby'] },
    'join': { maybe: ['columns'] },
    'keep': { always: ['columns'] },
    'pace': {},
    'pass': {},
    'remove': { always: ['columns'] },
    'read': {},
    'skip': { maybe: ['arg', 'groupby'] },
    'split': { maybe: ['columns'] },
    'tail': { maybe: ['arg', 'groupby'] },
    'uniq': { maybe: ['arg', 'groupby'] },
    'unbatch': {},
    'write': {}
};

const SYMBOL_TYPE_NAMES = {
    'function': 'function',
    'reducer': 'reducer',
    'sub': 'subgraph',
    'import': 'module'
};

class SemanticPass {
    constructor(options) {
        reset_scope();
        this.modules = {};
        this.scope = new Scope(null, 'top');

        this.context = 'build';
        this.coercion_mode = 'none';
        this.expr_mode = 'result';
        this.reducers = null;
        this.index = null;

        // As we encounter module imports, we will build up this list of
        // module ASTs, in the order we encounter them. We'll then replace the
        // original (unordered) list with this one, so that the build pass can
        // generate variables in their order of use.
        this.ordered_module_asts = [];

        // record current import path here to detect cycles
        this.import_path = [];
        this.import_standard_modules();
        this.stats = {
            imports: 0,
            subs: 0
        };
    }
    import_standard_modules() {
        this.import_math_module();
        this.import_null_module();
        this.import_array_module();
        this.import_boolean_module();
        this.import_number_module();
        this.import_string_module();
        this.import_regexp_module();
        this.import_date_module();
        this.import_duration_module();
        this.import_object_module();
        this.import_json_module();
        this.import_juttle_module();
    }
    import_math_module() {
        this.scope.put('Math', {
            // everything in the ES 5.1 Math module
            // http://www.ecma-international.org/ecma-262/5.1/#sec-15.8
            type: 'import',
            exported: false,
            exports: {
                /* Constants */
                E:      { type: 'const', exported: true, uname: 'Math.E',       d: true                    },
                LN10:   { type: 'const', exported: true, uname: 'Math.LN10',    d: true                    },
                LN2:    { type: 'const', exported: true, uname: 'Math.LN2',     d: true                    },
                LOG2E:  { type: 'const', exported: true, uname: 'Math.LOG2E',   d: true                    },
                LOG10E: { type: 'const', exported: true, uname: 'Math.LOG10E',  d: true                    },
                PI:     { type: 'const', exported: true, uname: 'Math.PI',      d: true                    },
                SQRT1_2:{ type: 'const', exported: true, uname: 'Math.SQRT1_2', d: true                    },
                SQRT2:  { type: 'const', exported: true, uname: 'Math.SQRT2',   d: true                    },
                /* Functions */
                abs:    { type: 'function', exported: true, uname: 'juttle.modules.math.abs',    arg_count: 1             },
                acos:   { type: 'function', exported: true, uname: 'juttle.modules.math.acos',   arg_count: 1             },
                asin:   { type: 'function', exported: true, uname: 'juttle.modules.math.asin',   arg_count: 1             },
                atan:   { type: 'function', exported: true, uname: 'juttle.modules.math.atan',   arg_count: 1             },
                atan2:  { type: 'function', exported: true, uname: 'juttle.modules.math.atan2',  arg_count: 2             },
                ceil:   { type: 'function', exported: true, uname: 'juttle.modules.math.ceil',   arg_count: [1, 2]        },
                cos:    { type: 'function', exported: true, uname: 'juttle.modules.math.cos',    arg_count: 1             },
                exp:    { type: 'function', exported: true, uname: 'juttle.modules.math.exp',    arg_count: 1             },
                floor:  { type: 'function', exported: true, uname: 'juttle.modules.math.floor',  arg_count: [1, 2]        },
                log:    { type: 'function', exported: true, uname: 'juttle.modules.math.log',    arg_count: 1             },
                max:    { type: 'function', exported: true, uname: 'juttle.modules.math.max',    arg_count: [0, Infinity] },
                min:    { type: 'function', exported: true, uname: 'juttle.modules.math.min',    arg_count: [0, Infinity] },
                pow:    { type: 'function', exported: true, uname: 'juttle.modules.math.pow',    arg_count: 2             },
                random: { type: 'function', exported: true, uname: 'juttle.modules.math.random', arg_count: 0             },
                round:  { type: 'function', exported: true, uname: 'juttle.modules.math.round',  arg_count: [1, 2]        },
                sin:    { type: 'function', exported: true, uname: 'juttle.modules.math.sin',    arg_count: 1             },
                seed:   { type: 'function', exported: true, uname: 'juttle.modules.math.seed',   arg_count: 1             },
                sqrt:   { type: 'function', exported: true, uname: 'juttle.modules.math.sqrt',   arg_count: 1             },
                tan:    { type: 'function', exported: true, uname: 'juttle.modules.math.tan',    arg_count: 1             },
            }
        });
    }
    import_null_module() {
        this.scope.put('Null', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, uname: 'juttle.modules.null.toString', arg_count: 1 },
            }
        });
    }
    import_array_module() {
        this.scope.put('Array', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                concat: { type: 'function', exported: true, uname: 'juttle.modules.array.concat', arg_count: [0, Infinity]},
                indexOf: { type: 'function', exported: true, uname: 'juttle.modules.array.indexOf',  arg_count: 2 },
                join: { type: 'function', exported: true, uname: 'juttle.modules.array.join', arg_count: 2},
                lastIndexOf: { type: 'function', exported: true, uname: 'juttle.modules.array.lastIndexOf',  arg_count: 2 },
                length:  { type: 'function', exported: true, uname: 'juttle.modules.array.length',   arg_count: 1 },
                pop:  { type: 'function', exported: true, uname: 'juttle.modules.array.pop',   arg_count: 1 },
                push:  { type: 'function', exported: true, uname: 'juttle.modules.array.push',   arg_count: [1, Infinity] },
                reverse:  { type: 'function', exported: true, uname: 'juttle.modules.array.reverse',   arg_count: 1 },
                shift:  { type: 'function', exported: true, uname: 'juttle.modules.array.shift',   arg_count: 1 },
                slice: { type: 'function', exported: true, uname: 'juttle.modules.array.slice', arg_count: [1, 3]},
                sort:  { type: 'function', exported: true, uname: 'juttle.modules.array.sort',   arg_count: 1 },
                splice: { type: 'function', exported: true, uname: 'juttle.modules.array.splice', arg_count: [1, Infinity]},
                toString: { type: 'function', exported: true, uname: 'juttle.modules.array.toString', arg_count: 1},
                unshift:  { type: 'function', exported: true, uname: 'juttle.modules.array.unshift',   arg_count: [1, Infinity] },
            }
        });
    }
    import_boolean_module() {
        this.scope.put('Boolean', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, uname: 'juttle.modules.boolean.toString', arg_count: 1 },
            }
        });
    }
    import_number_module() {
        this.scope.put('Number', {
            type: 'import',
            exported: false,
            exports: {
                /* Constants (sorted alphabetically) */
                MAX_VALUE:         { type: 'const', exported: true, uname: 'Number.MAX_VALUE',         d: true },
                MIN_VALUE:         { type: 'const', exported: true, uname: 'Number.MIN_VALUE',         d: true },
                NaN:               { type: 'const', exported: true, uname: 'Number.NaN',               d: true },
                NEGATIVE_INFINITY: { type: 'const', exported: true, uname: 'Number.NEGATIVE_INFINITY', d: true },
                POSITIVE_INFINITY: { type: 'const', exported: true, uname: 'Number.POSITIVE_INFINITY', d: true },

                /* Functions (sorted alphabetically) */
                fromString: { type: 'function', exported: true, uname: 'juttle.modules.number.fromString', arg_count: 1 },
                toString: { type: 'function', exported: true, uname: 'juttle.modules.number.toString', arg_count: 1 },
            }
        });
    }
    import_string_module() {
        this.scope.put('String', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                length: { type: 'function', exported: true, uname: 'juttle.modules.string.length', arg_count: 1             },
                charAt: { type: 'function', exported: true, uname: 'juttle.modules.string.charAt', arg_count: 2             },
                charCodeAt: { type: 'function', exported: true, uname: 'juttle.modules.string.charCodeAt', arg_count: 2     },
                concat: { type: 'function', exported: true, uname: 'juttle.modules.string.concat', arg_count: [0, Infinity] },
                fromCharCode: { type: 'function', exported: true, uname: 'juttle.modules.string.fromCharCode', arg_count: [0, Infinity]},
                indexOf: { type: 'function', exported: true, uname: 'juttle.modules.string.indexOf', arg_count: 2           },
                lastIndexOf: { type: 'function', exported: true, uname: 'juttle.modules.string.lastIndexOf', arg_count: 2   },
                match: { type: 'function', exported: true, uname: 'juttle.modules.string.match', arg_count: 2               },
                replace: { type: 'function', exported: true, uname: 'juttle.modules.string.replace', arg_count: 3           },
                search: { type: 'function', exported: true, uname: 'juttle.modules.string.search', arg_count: 2             },
                slice:  { type: 'function', exported: true, uname: 'juttle.modules.string.slice',  arg_count: [2, 3]        },
                split:  { type: 'function', exported: true, uname: 'juttle.modules.string.split',  arg_count: 2             },
                // substr is undocumented, but used in tests
                substr: { type: 'function', exported: true, uname: 'juttle.modules.string.substr', arg_count: [2, 3]        },
                toLowerCase: { type: 'function', exported: true, uname: 'juttle.modules.string.toLowerCase', arg_count: 1   },
                toString: { type: 'function', exported: true, uname: 'juttle.modules.string.toString', arg_count: 1   },
                toUpperCase: { type: 'function', exported: true, uname: 'juttle.modules.string.toUpperCase', arg_count: 1   },
                trim: { type: 'function', exported: true, uname: 'juttle.modules.string.trim', arg_count: 1                 },
            }
        });
    }
    import_object_module() {
        this.scope.put('Object', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                keys: { type: 'function', exported: true, uname: 'juttle.modules.object.keys', arg_count: 1 },
                toString: { type: 'function', exported: true, uname: 'juttle.modules.object.toString', arg_count: 1},
                values: { type: 'function', exported: true, uname: 'juttle.modules.object.values', arg_count: 1 },
            }
        });
    }
    import_regexp_module() {
        this.scope.put('RegExp', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, uname: 'juttle.modules.regexp.toString', arg_count: 1 },
            }
        });
    }
    import_date_module() {
        this.scope.put('Date', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                elapsed:     { type: 'function', exported: true, uname: 'juttle.modules.date.elapsed',     arg_count: 1      },
                endOf:       { type: 'function', exported: true, uname: 'juttle.modules.date.endOf',       arg_count: 2      },
                format:      { type: 'function', exported: true, uname: 'juttle.modules.date.format',      arg_count: [1, 3] },
                formatTz:    { type: 'function', exported: true, uname: 'juttle.modules.date.formatTz',      arg_count: 2 },
                parse:       { type: 'function', exported: true, uname: 'juttle.modules.date.parse',       arg_count: [1, 2] },
                get:         { type: 'function', exported: true, uname: 'juttle.modules.date.get',         arg_count: 2      },
                new:         { type: 'function', exported: true, uname: 'juttle.modules.date.new',         arg_count: 1      },
                quantize:    { type: 'function', exported: true, uname: 'juttle.modules.date.quantize',    arg_count: 2      },
                startOf:     { type: 'function', exported: true, uname: 'juttle.modules.date.startOf',     arg_count: 2      },
                time:        { type: 'function', exported: true, uname: 'juttle.modules.date.time',        arg_count: 0      },
                toString:    { type: 'function', exported: true, uname: 'juttle.modules.date.toString',    arg_count: 1      },
                unix:        { type: 'function', exported: true, uname: 'juttle.modules.date.unix',        arg_count: 1      },
                unixms:      { type: 'function', exported: true, uname: 'juttle.modules.date.unixms',      arg_count: 1      },
            }
        });
    }
    import_duration_module() {
        this.scope.put('Duration', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                as:           { type: 'function', exported: true, uname: 'juttle.modules.duration.as',           arg_count: 2 },
                format:       { type: 'function', exported: true, uname: 'juttle.modules.duration.format',       arg_count: [1, 2] },
                get:          { type: 'function', exported: true, uname: 'juttle.modules.duration.get',          arg_count: 2 },
                milliseconds: { type: 'function', exported: true, uname: 'juttle.modules.duration.milliseconds', arg_count: 1 },
                new:          { type: 'function', exported: true, uname: 'juttle.modules.duration.new',          arg_count: 1 },
                seconds:      { type: 'function', exported: true, uname: 'juttle.modules.duration.seconds',      arg_count: 1 },
                toString:     { type: 'function', exported: true, uname: 'juttle.modules.duration.toString',     arg_count: 1 },
            }
        });
    }
    import_json_module() {
        this.scope.put('JSON', {
            type: 'import',
            exported: false,
            exports: {
                parse:       { type: 'function', exported: true, uname: 'juttle.modules.json.parse',       arg_count: 1 },
                stringify:   { type: 'function', exported: true, uname: 'juttle.modules.json.stringify',   arg_count: 1 },
            }
        });
    }
    import_juttle_module() {
        this.scope.put('Juttle', {
            type: 'import',
            exported: false,
            exports: {
                version: { type: 'const', exported: true, uname: 'juttle.modules.juttle.version', d: true },
                adapters: { type: 'function', exported: true, uname: 'juttle.modules.juttle.adapters' }
            }
        });
    }
    analyze(ast) {
        this.module_asts = ast.modules;

        this.sa_SubDef(ast);

        ast.modules = this.ordered_module_asts;
        ast.stats = this.stats;

        return ast;
    }
    with_context(context, fn) {
        var saved_context = this.context;
        this.context = context;
        try {
            fn();
        } finally {
            this.context = saved_context;
        }
    }
    with_coercion_mode(coercion_mode, fn) {
        var saved_coercion_mode = this.coercion_mode;
        this.coercion_mode = coercion_mode;
        try {
            fn();
        } finally {
            this.coercion_mode = saved_coercion_mode;
        }
    }
    with_expr_mode(expr_mode, fn) {
        var saved_expr_mode = this.expr_mode;
        this.expr_mode = expr_mode;
        try {
            fn();
        } finally {
            this.expr_mode = saved_expr_mode;
        }
    }

    sa_var_decl(decl) {
        var varname = decl.name;
        if (decl.expr) {
            this.sa_expr(decl.expr);
        }
        decl.symbol = this.scope.define_variable(varname, 'var', false, false, false, decl.location);
    }
    sa_const_decl(decl, exported, can_redefine) {
        var varname = decl.name;
        this.sa_expr(decl.expr);
        decl.symbol = this.scope.define_variable(varname, 'const', exported, can_redefine, decl.expr.d || false, decl.location);
    }
    // a flowgraph node
    sa_proc(node) {
        var uname = this.scope.alloc_var();
        //XXX check options and parameters for unknowns and illegals
        node.uname = uname;
        this.sa_options(node.options);
    }
    sa_sub_call(node, sub) {
        var that = this;
        node.uname = this.scope.alloc_var();
        node.uname_sub = sub.uname;
        node.options = _.map(node.options, function(opt) {
            that.sa_expr(opt.expr);
            return {id: opt.id, expr: opt.expr, location: opt.location};
        });
        node.sub_sig = _.map(sub.args, function(arg) {
            return { name: arg.name, required: !arg.default };
        });
    }
    //XXX this one operates in place on the option expressions
    //  does not check params
    // XXX should extend this to check for illegal options
    // XXX maybe even try to do some amount of type checking?
    sa_options(options) {
        var that = this;
        _.each(options, function(option, index) {
            //XXX need sa_juttle_static_expr() that doesn't operate on stream
            //XXX need sa_juttle_static_expr() that doesn't operate on stream
            //   -> just need to pass down opts context right?!
            //   -> and right now, undefined implies build context so we are ok

            that.sa_expr(option.expr);
        });
    }
    enter_scope(type) {
        this.scope = new Scope(this.scope, type);
    }
    exit_scope() {
        this.scope = this.scope.next;
    }
    function_name(node) {
        return node.callee.type !== 'MemberExpression'
            ? node.callee.name
            : node.callee.object.name + '.' + node.callee.property.value;
    }
    check_arg_count(name, type, actual_count, expected_count, location) {
        var min_count, max_count;

        if (_.isArray(expected_count)) {
            min_count = expected_count[0];
            max_count = expected_count[1];
        } else {
            min_count = expected_count;
            max_count = expected_count;
        }

        if (actual_count < min_count || actual_count > max_count) {
            if (min_count === max_count) {
                if (min_count === 1) {
                    throw errors.compileError('WRONG-ARG-COUNT-SINGULAR', {
                        type: type,
                        name: name,
                        actual_count: actual_count,
                        location: location
                    });
                } else {
                    throw errors.compileError('WRONG-ARG-COUNT-PLURAL', {
                        type: type,
                        name: name,
                        expected_count: min_count,
                        actual_count: actual_count,
                        location: location
                    });
                }
            } else {
                throw errors.compileError('WRONG-ARG-COUNT-RANGE', {
                    type: type,
                    name: name,
                    min_count: min_count,
                    max_count: max_count,
                    actual_count: actual_count,
                    location: location
                });
            }
        }
    }
    sa_function_call(node, symbol) {
        var k, args = node.arguments;
        node.fname = {type: 'function_uname', uname: symbol.uname};
        this.check_arg_count(this.function_name(node), 'function', args.length, symbol.arg_count, node.location);
        var d = true;
        if (args) {
            for (k = 0; k < args.length; ++k) {
                this.with_expr_mode('result', () => {
                    this.sa_expr(args[k]);
                });
                d = d && args[k].d;
            }
        }

        if (this.context !== 'put' && this.context !== 'reduce' && this.context !== 'filter') {
            node.d = d;
        } else {
            // because we don't know if the function contains a call to
            // Math.random() (PROD-4556)
            node.d = false;
        }
    }
    sa_reducer_call(node, symbol) {
        var i, args = node.arguments;
        if (this.context !== 'put' && this.context !== 'reduce') {
            throw errors.compileError('INVALID-REDUCER-CALL', {
                name: this.function_name(node),
                location: node.location
            });
        }
        this.reducers.push({name:this.function_name(node), symbol:symbol, args:args, index: this.index});
        node.reducer_call_index = this.reducers.length - 1;
        this.check_arg_count(this.function_name(node), 'reducer', args.length, symbol.arg_count, node.location);
        node.context = this.context; // needed because reducer calls are different in put vs reduce
        for (i = 0; i < args.length; ++i) {
            this.sa_reducer_arg(args[i]);
        }
    }
    can_export() {
        return (this.scope.type === 'module' || this.scope.type === 'main');
    }
    check_export(node) {
        if (node.export  && !this.can_export()) {
            throw errors.compileError('NON-TOPLEVEL-EXPORT', {
                entity: this.scope.type,
                location: node.location
            });
        }
    }
    check_reducer_toplevel(node, thing) {
        if (this.scope.type === 'reducer') {
            throw errors.compileError('REDUCER-TOPLEVEL-STATEMENT', {
                thing: thing,
                location: node.location
            });
        }
    }
    check_symbol(node, symbol) {
        // We can be in one of 3 situations:
        //
        //   1. We are processing a "bare" variable (one that has no ".",
        //      "[...]" or "(...)" operator applied to it). In that case, we
        //      need to check variable's symbol type (there is nobody else
        //      who can do that).
        //
        //   2. We are processing a variable inside a member expression
        //      (e.g. "foo" in "foo.bar" or "foo['bar']"). In that case, we
        //      don't check anything because all the checks will be
        //      performed by sa_MemberExpression (which has necessary
        //      context).
        //
        //   3. We are processing a variable inside a call expressions (e.g.
        //      "foo" in "foo()"). In that case, we also don't check
        //      anything because all the checks will be performed by
        //      sa_CallExpression (which has necessary context).
        if (this.expr_mode === 'result') {
            if (symbol.type !== 'const' && symbol.type !== 'var') {
                throw errors.compileError('CANNOT-USE-AS-VARIABLE', {
                    thing: SYMBOL_TYPE_NAMES[symbol.type],
                    location: node.location
                });
            }
        }
    }

    // statements that can appear inside subs or at the top level
    sa_statement(node) {
        switch (node.type) {

            case 'SubDef':
            case 'FunctionDef':
            case 'ReducerDef':
            case 'ConstStatement':
            case 'InputStatement':
            case 'VarStatement':
            case 'EmptyStatement':
            case 'ExpressionStatement':
            case 'SequentialGraph':
            case 'ImportStatement':
            case 'ParallelGraph':
                this['sa_' + node.type](node);
                break;

            default:
                throw new Error('unrecognized statement type ' + node.type);
        }
    }
    sa_ModuleDef(node) {
        var k, elems = node.elements;

        var saved_scope = this.scope;
        this.scope = new Scope(null, 'module');
        this.import_standard_modules();

        for (k = 0; k < elems.length; ++k) {
            this.sa_statement(elems[k]);
        }

        this.modules[node.name] = {
            exports: this.scope.exports()
        };
        this.scope = saved_scope;
    }
    sa_SubDef(node) {
        var symbol, elems, k, has_graph;

        this.check_export(node);

        symbol = this.scope.define_sub(node.name, node.args, node.export);
        node.symbol = symbol;
        this.enter_scope(node.name === 'main' ? 'main' : 'sub');

        elems = node.elements;
        this.sa_args(node.args);
        for (k = 0; k < elems.length; ++k) {
            this.sa_statement(elems[k]);
        }
        this.exit_scope();

        has_graph = _.any(node.elements, function(element) {
            return element.type === 'SequentialGraph' || element.type === 'ParallelGraph';
        });

        if (!has_graph) {
            if (this.scope.type === 'top') {
                throw errors.compileError('PROGRAM-WITHOUT-FLOWGRAPH', {
                    location: node.location
                });
            } else {
                throw errors.compileError('SUB-WITHOUT-FLOWGRAPH', {
                    location: node.location
                });
            }
        }
    }

    // statements that can appear inside functions or reducers
    sa_function_statement(node) {
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
                this['sa_' + node.type](node);
                break;

            default:
                throw new Error('unrecognized function statement type ' + node.type);
        }
    }
    sa_args(args) {
        var is_optional;
        var seen_optional = false;

        for (var k = 0; k < args.length; k++) {
            is_optional = !!args[k].default;
            if (seen_optional && !is_optional) {
                throw errors.compileError('PARAM-ORDER', {
                    location: args[k].location
                });
            }

            this.sa_FormalArg(args[k]);

            seen_optional = is_optional;
        }
    }
    compute_arg_count(args) {
        var requiredArgs = _.filter(args, function(arg) {
            return !arg.default;
        });

        return [requiredArgs.length, args.length];
    }
    sa_FormalArg(node) {
        node.symbol = this.scope.type.match(/fn/) || this.scope.type === 'reducer'
            ? this.scope.define_var(node.name, false)
            : this.scope.define_const(node.name, false, true);

        if (node.default) {
            this.sa_expr(node.default);
        }
    }
    sa_FunctionDef(node) {
        var elems, symbol  = this.scope.define_func(node.name, node.export, this.compute_arg_count(node.args));
        node.symbol = symbol;
        this.check_export(node);

        var base = this.scope.type.match(/reducer/) ? 'fn-in-' + this.scope.type : 'fn';
        this.enter_scope(base + ':' + node.name);

        this.sa_args(node.args);
        elems = node.elements;
        for (var k = 0; k < elems.length; ++k) {
            this.sa_function_statement(elems[k]);
        }

        this.exit_scope();
    }

    sa_ReducerDef(node) {
        var k, elems;
        var symbol = this.scope.define_reducer(node.name, node.export, this.compute_arg_count(node.args));
        node.symbol = symbol;

        this.check_export(node);

        this.enter_scope('reducer');
        elems = node.elements;
        this.sa_args(node.args);
        for (k = 0; k < elems.length; ++k) {
            var elem = elems[k];
            var context = 'build';
            if (elem.type === 'FunctionDef') {
                if ((elem.name === 'update' || elem.name === 'result' || elem.name === 'expire' || elem.name === 'reset')) {
                    if (elem.args.length > 0) {
                        throw errors.compileError('REDUCER-METHOD-ARGS', {
                            name: elem.name,
                            location: elem.location
                        });
                    }
                    if (elem.name === 'update' || elem.name === 'expire') {
                        context = 'put';
                        elem.stream = true;
                    }
                }
            }
            this.with_context(context, () => {
                this.sa_function_statement(elem);
            });
            if (elem.type === 'FunctionDef') {
                if (elem.name === 'update') {
                    node.update_uname = elem.symbol.uname;
                }
                else if (elem.name === 'expire') {
                    node.expire_uname = elem.symbol.uname;
                }
                else if (elem.name === 'reset') {
                    node.reset_uname = elem.symbol.uname;
                }
                else if (elem.name === 'result') {
                    node.result_uname = elem.symbol.uname;
                }
            }
        }
        this.exit_scope();
    }
    sa_StatementBlock(node) {
        this.check_reducer_toplevel(node, 'a block');

        var elems = node.elements;
        this.enter_scope('block-in-' + this.scope.type);
        for (var k = 0; k < elems.length; ++k) {
            this.sa_function_statement(elems[k]);
        }
        this.exit_scope();
    }
    // elements of a flowgraph
    sa_proc_element(node) {
        // XXX
        var methods = {
            ParallelGraph: this.sa_ParallelGraph,
            SequentialGraph: this.sa_SequentialGraph,
            SequenceProc: this.sa_SequenceProc,
            FilterProc: this.sa_FilterProc,
            FieldListArgProc: this.sa_FieldListArgProc,
            FunctionProc: this.sa_FunctionProc,
            OptionOnlyProc: this.sa_OptionOnlyProc,
            PutProc: this.sa_PutProc,
            ReadProc: this.sa_ReadProc,
            ReduceProc: this.sa_ReduceProc,
            SingleArgProc: this.sa_SingleArgProc,
            View: this.sa_View,
            SortProc: this.sa_SortProc,
            WriteProc: this.sa_WriteProc
        };
        if (methods.hasOwnProperty(node.type)) {
            if (!node.options) {
                node.options = [];
            }
            methods[node.type].call(this, node);
        } else {
            throw new Error('unrecognized processor or sub: ' + node.type);
        }
    }

    sa_graph(node) {
        var k, elems = node.elements;

        // ignore top-level flowgraphs for imported modules
        // we check for semantic errors in imported module even
        // if outer body isn't used
        if (this.scope.type === 'module') {
            // remember this context so code generator can ignore procs
            // that are in the outer scope of a module
            node.outer_module = true;
        }
        for (k = 0; k < elems.length; k++) {
            this.sa_proc_element(elems[k]);
        }
    }

    sa_SequentialGraph(node) {
        this.sa_graph(node);
    }
    sa_ParallelGraph(node) {
        this.sa_graph(node);
    }

    sa_EmptyStatement(node) {
    }
    sa_ExpressionStatement(node) {
        this.check_reducer_toplevel(node, 'an expression statement');

        this.sa_expr(node.expression);
    }
    sa_AssignmentExpression(node) {
        this.with_expr_mode('assign', () => {
            this.sa_assignment_lhs(node.left);
        });
        this.with_expr_mode('result', () => {
            this.sa_expr(node.right);
        });
        node.d = node.left.d && node.right.d;
    }
    sa_VarStatement(node) {
        var k, decls = node.declarations;
        for (k = 0; k < decls.length; ++k) {
            this.sa_var_decl(decls[k]);
        }
    }
    sa_InputStatement(node) {
        var self = this;

        this.check_export(node);

        node.options = _.map(node.options, function(opt) {
            self.sa_expr(opt.expr);
            var ret = {type: 'InputOption', id: opt.id, expr: opt.expr};
            if (! ret.expr.d) {
                throw errors.compileError('BAD-INPUT-OPTION', {
                    input: node.name,
                    option: opt.id,
                    location: opt.location
                });
            }
            return ret;
        });
        node.symbol = this.scope.define_variable(node.name, 'const', node.export, false, true, node.location);

        var detector = new StaticInputDetector();
        node.static = detector.isStatic(node);
    }
    sa_ConstStatement(node) {
        var k, decls = node.declarations;
        this.check_export(node);
        for (k = 0; k < decls.length; ++k) {
            if (!decls[k].expr) {
                throw errors.compileError('UNINITIALIZED-CONST', {
                    name: decls[k].name,
                    location: node.location
                });
            }
            this.sa_const_decl(decls[k], node.export, node.arg);
        }
    }
    sa_ImportStatement(node, functions) {
        var self = this;
        var modulename = node.modulename.value;

        if (this.scope.type !== 'module' && this.scope.type !== 'main') {
            throw errors.compileError('NON-TOPLEVEL-IMPORT', {
                entity: this.scope.type,
                location: node.location
            });
        }
        if (_.contains(this.import_path, modulename)) {
            this.import_path.push(modulename); // for the error message
            throw errors.compileError('CYCLIC-IMPORT', {
                path: this.import_path.join(' -> '),
                location: node.location
            });
        }

        this.import_path.push(modulename);

        var module_ast = _.findWhere(self.module_asts, {name: modulename});

        if (module_ast !== undefined) {
            if (!this.modules.hasOwnProperty(modulename)) {
                this.sa_ModuleDef(module_ast);
                this.ordered_module_asts.push(module_ast);
            }
        } else {
            throw new Error('Cannot find module ' + modulename);
        }
        // localname is the juttle "as" name of the module
        var module = this.modules[modulename];
        this.scope.define_import(node.localname, module.exports, node.location);
        this.import_path.pop();
        this.stats.imports++;
    }

    sa_IfStatement(node) {
        this.check_reducer_toplevel(node, 'an if statement');

        this.sa_expr(node.condition);
        this.sa_function_statement(node.ifStatement);
        if (node.elseStatement) {
            this.sa_function_statement(node.elseStatement);
        }
    }
    sa_ReturnStatement(node) {
        this.check_reducer_toplevel(node, 'a return statement');

        if (node.value) {
            this.sa_expr(node.value);
        }
    }
    sa_ErrorStatement(node) {
        this.sa_expr(node.message);
    }

    sa_ExpressionFilterTerm(node) {
        this.with_context('filter', () => {
            this.with_coercion_mode('field', () => {
                this.sa_expr(node.expression);
            });
        });
        // will be carried in AST form to a proc implementation
        node.expression.d = false;
        node.d = false;
    }
    sa_SimpleFilterTerm(node) {
        this.sa_expr(node.expression);
        // will be carried in AST form to a proc implementation
        node.d = false;
    }
    sa_FilterLiteral(node) {
        this.sa_expr(node.ast);
        // will be carried in AST form to a proc implementation
        node.d = false;
    }
    sa_filter_proc(node) {
        if (node.filter) {
            this.sa_expr(node.filter);
        }
        this.sa_proc(node);
    }
    sa_sequence_proc(node) {
        var self = this;
        if (node.filters.length < 2) {
            throw errors.compileError('PROC-NEEDS-ARG', {
                name: 'sequence',
                location: node.location
            });
        }
        if (node.groupby) {
            node.options.push({id: 'groupby', expr:node.groupby});
            delete node.groupby;
        }
        _.each(node.filters, function (node) { self.sa_expr(node); });
        this.sa_proc(node);
    }
    sa_FilterProc(node) {
        this.sa_filter_proc(node);
    }
    sa_SequenceProc(node) {
        this.sa_sequence_proc(node);
    }
    sa_ReadProc(node) {
        this.sa_filter_proc(node);
    }
    sa_option_proc(node, options) {
        // Some procs have syntactical sugar for parameters (e.g. the limit in
        // `head 10` or the bylist in `reduce by a, b`). They show up as named
        // attributes in the AST. We convert those into options (which are
        // really parameters) so that they can be handled uniformly by the
        // compiler)
        options = options || [];
        _.each(options, function(option) {
            if (node[option]) {
                node.options.push({id: option, expr: node[option]});
                delete node[option];
            }
        });
        this.sa_proc(node);
    }
    sa_SortProc(node) {
        this.sa_option_proc(node, ['groupby', 'columns']);
    }
    sa_View(node) {
        this.sa_proc(node);
    }
    sa_ObjectLiteral(node) {
        var k, props;
        var d = true;
        props = node.properties;
        for (k = 0; k < props.length; ++k) {
            this.sa_ObjectProperty(props[k]);
            d = d && props[k].d;
        }
        node.d = d;
    }
    sa_ObjectProperty(node) {
        this.with_expr_mode('result', () => {
            this.sa_expr(node.key);
            this.sa_expr(node.value);
        });
        node.d = node.key.d && node.value.d;
    }
    sa_RegExpLiteral(node) {
        node.d = true;
    }
    sa_reducer_arg(arg) {
        // coerce a naked name to a string (ie a field name) if it
        // isn't visible as a variable.
        if (arg.type === 'Variable'
            && this.scope.lookup_variable(arg.name) === undefined) {
            //XXX this shouldn't have to be special cased and we should
            // just be passing down the opts argument and letting this
            // happen in sa_Variable XXX that is, unless we want only
            // single variable arguments to be coerced...? and other
            // reducer undefined variables to be flagged as such...
            // not sure
            arg.type ='StringLiteral';
            arg.value = arg.name;
            delete arg.name;
        } else {
            // reducer *arguments* are evaluated at build time
            this.with_context('build', () => {
                this.with_expr_mode('result', () => {
                    this.sa_expr(arg);
                });
            });
        }
    }
    //
    // returns an array of objects one for each reducer used in the expressions
    // previously parsed. this gets added to the tree for later use.
    // XXX would be helpful to include all the functions referenced so we can
    // make sure those that are needed are compiled into the final output
    // in the target language (as of 2014, just JavaScript) and available
    // in the juttle runtime
    //
    sa_reducers(reducers) {
        var k, op, args, symbol, index;
        var out = [];
        for (k = 0; k < reducers.length; ++k) {
            //XXX need a uniform way to pass in args... we will do
            // this with locally scoped vars. see NOTES
            op = reducers[k].name;
            args = reducers[k].args || [];
            index = reducers[k].index;
            symbol = reducers[k].symbol;

            out.push({
                index: index,
                name: op,
                uname: {type: 'function_uname', uname: symbol.uname},
                arguments: args });
        }
        return out;
    }
    sa_reifier_proc(node) {
        var k, reducers = [];
        this.reducers = reducers;

        for (k = 0; k < node.exprs.length; ++k) {
            this.index = k;
            this.sa_expr(node.exprs[k]);
        }
        //
        // decorate the AST with the list of reducers that are used
        // across all of the expressions of this reduce proc.  The position
        // of a particualr reducer in this list correponds to the
        // reducer_index decoration in the expression AST node that calls
        // this particular reducer.
        //
        node.reducers = this.sa_reducers(reducers);

        if (node.groupby) {
            node.options.push({id: 'groupby', expr:node.groupby});
            delete node.groupby;
        }
        this.sa_proc(node);
    }
    sa_ReduceProc(node) {
        this.with_context('reduce', () => {
            this.sa_reifier_proc(node);
        });
        node.reducers.forEach(function(reducer) {
            if (reducer.name === 'delta') {
                throw errors.compileError('REDUCE-DELTA-ERROR', {
                    location: node.location
                });
            }
        });
    }
    sa_PutProc(node) {
        this.with_context('put', () => {
            this.with_coercion_mode('field', () => {
                this.sa_reifier_proc(node);
            });
        });
    }

    sa_builtin_proc(node) {
        node.type = 'BuiltinProc';

        _.each(BUILTIN_PROCS[node.name].maybe, function(attrname) {
            if (node[attrname]) {
                node.options.push({id: attrname, expr: node[attrname]});
                delete node[attrname];
            }
        });

        _.each(BUILTIN_PROCS[node.name].always, function(attrname) {
            if (!node[attrname]) {
                throw errors.compileError('PROC-NEEDS-ARG', {
                    name: node.name,
                    location: node.location
                });
            }
            node.options.push({id: attrname, expr: node[attrname]});
            delete node[attrname];
        });
        this.sa_proc(node);
    }
    sa_OptionOnlyProc(node) {
        this.sa_builtin_proc(node);
    }
    sa_WriteProc(node) {
        this.sa_proc(node);
    }
    sa_SingleArgProc(node) {
        this.sa_builtin_proc(node);
    }
    sa_FieldListArgProc(node) {
        this.sa_builtin_proc(node);
    }
    sa_FunctionProc(node) {
        this.with_expr_mode('sub', () => {
            this.sa_expr(node.op);
        });

        if (node.op.symbol) {
            if (node.op.symbol.type === 'sub') {
                this.stats.subs++;
                this.sa_sub_call(node, node.op.symbol);
            } else {
                throw errors.compileError('NOT-A-SUB', {
                    name: this.function_name(node.op),
                    location: node.location
                });
            }
        } else {
            throw errors.compileError('NO-SUCH-SUB', {
                name: this.function_name(node.op),
                location: node.location
            });
        }
    }

    sa_assignment_lhs(node) {
        switch (node.type) {
            case 'UnaryExpression':
                this.sa_UnaryExpression(node);
                break;

            case 'Variable':
                if (!this.scope.lookup_variable(node.name)) {
                    throw errors.compileError('UNDEFINED-VARIABLE', {
                        name: node.name,
                        location: node.location
                    });
                }
                if (!this.scope.is_mutable(node.name, this.scope.type)) {
                    throw errors.compileError('VARIABLE-NOT-ASSIGNABLE', {
                        name: node.name,
                        location: node.location
                    });
                }
                this.sa_Variable(node);
                break;

            case 'Field':
                this.sa_Field(node);
                break;

            case 'MemberExpression':
                if (!this.scope.is_mutable(node.object.name, this.scope.type)) {
                    throw errors.compileError('VARIABLE-NOT-MODIFIABLE', {
                        name: node.object.name,
                        location: node.location
                    });
                }
                this.sa_MemberExpression(node);
                break;

            default:
                throw new Error('unrecognized expression lhs ' + node.type);
        }
    }

    sa_expr(node) {
        switch (node.type) {
            case 'NullLiteral':
            case 'BooleanLiteral':
            case 'NumberLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'StringLiteral':
            case 'MomentLiteral':
            case 'DurationLiteral':
                node.d = true;
                break;

            case 'AssignmentExpression':
            case 'CallExpression':
            case 'BinaryExpression':
            case 'UnaryExpression':
            case 'MultipartStringLiteral':
            case 'RegExpLiteral':
            case 'ArrayLiteral':
            case 'ByList':
            case 'SortByList':
            case 'Variable':
            case 'Field':
            case 'ToString':
            case 'ObjectLiteral':
            case 'ConditionalExpression':
            case 'MemberExpression':
            case 'PostfixExpression':
            case 'ExpressionFilterTerm':
            case 'SimpleFilterTerm':
            case 'FilterLiteral':
                this['sa_' + node.type](node);
                break;

            default:
                throw new Error('unrecognized expression type ' + node.type);
        }
    }

    sa_PostfixExpression(node) {
        var name;
        switch (node.expression.type) {
            case 'Variable':
            case 'MemberExpression':
                name = node.expression.type === 'Variable' ?
                   node.expression.name : node.expression.object.name;
                this.with_expr_mode('update', () => {
                    this.sa_expr(node.expression);
                });
                if (!this.scope.is_mutable(name, this.scope.type)) {
                    throw errors.compileError('INVALID-POSTFIX-USE', {
                        operator: node.operator,
                        variable: name,
                        location: node.location
                    });
                }
                node.d = node.expression.d;
                break;
            default:
                throw errors.compileError('INVALID-POSTFIX-LHS', {
                    location: node.location
                });
        }
    }
    sa_CallExpression(node) {
        this.with_expr_mode('call', () => {
            this.sa_expr(node.callee);
        });

        if (node.callee.symbol) {
            switch (node.callee.symbol.type) {
                case 'function':
                    this.sa_function_call(node, node.callee.symbol);
                    break;

                case 'reducer':
                    this.sa_reducer_call(node, node.callee.symbol);
                    break;

                default:
                    throw errors.compileError('NOT-A-FUNCTION-OR-REDUCER', {
                        name: this.function_name(node),
                        location: node.location
                    });
            }
        } else {
            throw errors.compileError('CANNOT-USE-AS-FUNCTION-OR-REDUCER', {
                location: node.location
            });
        }
    }
    sa_UnaryExpression(node) {
        var op = node.operator;
        var name;

        switch (op) {
            case '*':
                this.with_expr_mode('result', () => {
                    this.sa_expr(node.argument);
                });
                if (this.context !== 'put' && this.context !== 'reduce' && this.context !== 'filter') {
                    throw errors.compileError('INVALID-FIELD-REFERENCE', {
                        location: node.location
                    });
                }
                node.d = false;
                return;

            case '++':
            case '--':
                this.with_expr_mode('update', () => {
                    this.sa_expr(node.argument);
                });
                name = node.argument.type === 'Variable' ?
                    node.argument.name : node.argument.object.name;
                if (!this.scope.is_mutable(name, this.scope.type)) {
                    throw errors.compileError('INVALID-PREFIX-USE', {
                        operator: op,
                        variable: name,
                        location: node.location
                    });
                }
                node.d = node.argument.d;
                return;

            default:
                this.with_expr_mode('result', () => {
                    this.sa_expr(node.argument);
                });
                node.d = node.argument.d;
                return;
        }
    }
    sa_BinaryExpression(node) {
        this.with_expr_mode('result', () => {
            this.sa_expr(node.left);
            this.sa_expr(node.right);
        });
        node.d = node.left.d && node.right.d;
    }
    sa_ConditionalExpression(node) {
        this.with_expr_mode('result', () => {
            this.sa_expr(node.test);
            this.sa_expr(node.alternate);
            this.sa_expr(node.consequent);
        });
        //XXX can be smarter than this
        node.d = node.test.d && node.alternate.d && node.consequent.d;
    }
    sa_MultipartStringLiteral(node) {
        var k;
        var d = true;
        for (k = 0; k < node.parts.length; k++) {
            this.with_expr_mode('result', () => {
                this.sa_expr(node.parts[k]);
            });
            d = d && node.parts[k].d;
        }
        node.d = d;
    }
    sa_ArrayLiteral(node) {
        var k;
        var d = true;
        for (k = 0; k < node.elements.length; k++) {
            this.with_expr_mode('result', () => {
                this.sa_expr(node.elements[k]);
            });
            d = d && node.elements[k].d;
        }
        node.d = d;
    }
    sa_ByList(node) {
        var k, elem = node.elements;
        var d = true;
        // node.elements is an array of the comma separated expressions
        // each element can be an identifier (which may be a variable
        // or may be coerced to a string), an expression that evaluates
        // to an array (which may be a single variable) or to an string.
        // we need to check all this at run time and stitch together the
        // results into a top level array that is the list of strings
        // representing the field names
        for (k = 0; k < elem.length; k++) {
            this.with_coercion_mode('string', () => {
                this.sa_expr(elem[k]);
            });
            d = d && elem[k].d;
        }
        node.d = d;
    }
    sa_SortByList(node) {
        var k, elem = node.elements;
        var d = true;
        for (k = 0; k < elem.length; k++) {
            this.with_coercion_mode('string', () => {
                this.sa_expr(elem[k].expr);
            });
            d = d && elem[k].d;
        }
        node.d = d;
    }
    sa_Variable(node) {
        var symbol;

        if (this.expr_mode === 'call') {
            // XXX(dmajda): Remove the fake built-in reducer symbol entries hack.
            symbol = is_builtin_reducer(node.name)
                ? this.scope.fake_builtin_reducer_symbol(node.name)
                : this.scope.get(node.name);
        } else {
            symbol = this.scope.get(node.name);
        }

        if (symbol) {
            this.check_symbol(node, symbol);

            node.symbol = symbol;
            node.d = symbol.d;
        } else {
            switch (this.coercion_mode) {
                case 'string':
                    node.type = 'StringLiteral';
                    node.value = node.name;
                    node.d = true;
                    delete node.name;
                    break;

                case 'field':
                    node.type = 'Field';
                    node.d = false;
                    break;

                default:
                    throw errors.compileError('UNDEFINED', {
                        name: node.name,
                        location: node.location
                    });
            }
        }
    }
    sa_Field(node) {
        if (this.context !== 'put' && this.context !== 'reduce' && this.context !== 'filter') {
            throw errors.compileError('INVALID-FIELD-REFERENCE', {
                location: node.location
            });
        }
        node.d = false;
    }
    sa_ToString(node) {
        this.sa_expr(node.expression);
        node.d = node.expression.d;
    }
    sa_MemberExpression(node) {
        var symbol;

        this.with_expr_mode('member', () => {
            this.sa_expr(node.object);
        });
        this.with_expr_mode('result', () => {
            this.sa_expr(node.property);
        });

        if (this.expr_mode === 'assign' || this.expr_mode === 'update') {
            if (!node.computed) {
                symbol = this.scope.lookup_module_variable(node.object.name, node.property.value);
                if (symbol === undefined) {
                    throw errors.compileError('NOT-EXPORTED', {
                        name: node.property.value,
                        module: node.object.name,
                        location: node.location
                    });
                }

                node.symbol = this.scope.get(node.object.name).exports[node.property.value];
            }
        } else {
            if (node.computed) {
                if (node.object.symbol) {
                    if (node.object.symbol.type !== 'const' && node.object.symbol.type !== 'var') {
                        throw errors.compileError('CANNOT-USE-AS-VARIABLE', {
                            thing: SYMBOL_TYPE_NAMES[node.object.symbol.type],
                            location: node.object.location
                        });
                    }
                }
            } else {
                // We are processing an expression like "foo.bar". If "foo" is a
                // module, the expression is *static* and in later stage, it
                // will be compiled as a reference to exported module entity
                // "bar" (which has to exist). If "foo" is not a module, the
                // expression is *dynamic* and it will be compiled in the same
                // way as "foo['bar']". The compiler distinguishes these cases
                // by presence of node.symbol.
                if (node.object.symbol) {
                    if (node.object.symbol.type !== 'const' && node.object.symbol.type !== 'var' && node.object.symbol.type !== 'import') {
                        throw errors.compileError('CANNOT-USE-AS-VARIABLE', {
                            thing: SYMBOL_TYPE_NAMES[node.object.symbol.type],
                            location: node.object.location
                        });
                    }

                    if (node.object.symbol.type === 'import') {
                        symbol = node.object.symbol.exports[node.property.value];
                        if (symbol === undefined) {
                            throw errors.compileError('NOT-EXPORTED', {
                                name: node.property.value,
                                module: node.object.name,
                                location: node.location
                            });
                        }

                        this.check_symbol(node, symbol);

                        node.symbol = symbol;
                    }
                }
            }
        }

        if (node.symbol) {
            node.d = symbol.d;
        } else {
            node.d = node.object.d && node.property.d;
        }
    }
}

module.exports = SemanticPass;
