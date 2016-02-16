'use strict';

// performs semantic analysis of the AST, modifying the AST in place,
// and returning the modifed AST.
// - allocates variables using unique names to resolve scope
// - performs all of the juttle coercion rules for converting variable
//   names to strings
// - transforms FunctionCall to ReducerCall where appropriate
// - resolves module function names and variable names and decorates AST
//   node with resolved names

var _ = require('underscore');
var Base = require('extendable-base');
var Scope = require('./scope').Scope;
var reset_scope = require('./scope').reset;
var StaticInputDetector = require('./static-input-detector');
var errors = require('../errors');

var is_builtin_reducer = require('../runtime/reducers').is_builtin_reducer;

var SemanticPass = Base.extend({

    initialize: function(options) {
        reset_scope();
        this.modules = {};
        this.scope = new Scope(null, 'top');

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
    },
    import_standard_modules: function() {
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
    },
    import_math_module: function() {
        this.scope.put('Math', {
            // everything in the ES 5.1 Math module
            // http://www.ecma-international.org/ecma-262/5.1/#sec-15.8
            type: 'import',
            exported: false,
            exports: {
                /* Constants */
                E:      { type: 'const', exported: true, name: 'Math.E'                                   },
                LN10:   { type: 'const', exported: true, name: 'Math.LN10'                                },
                LN2:    { type: 'const', exported: true, name: 'Math.LN2'                                 },
                LOG2E:  { type: 'const', exported: true, name: 'Math.LOG2E'                               },
                LOG10E: { type: 'const', exported: true, name: 'Math.LOG10E'                              },
                PI:     { type: 'const', exported: true, name: 'Math.PI'                                  },
                SQRT1_2:{ type: 'const', exported: true, name: 'Math.SQRT1_2'                             },
                SQRT2:  { type: 'const', exported: true, name: 'Math.SQRT2'                               },
                /* Functions */
                abs:    { type: 'function', exported: true, name: 'juttle.modules.math.abs',    arg_count: 1             },
                acos:   { type: 'function', exported: true, name: 'juttle.modules.math.acos',   arg_count: 1             },
                asin:   { type: 'function', exported: true, name: 'juttle.modules.math.asin',   arg_count: 1             },
                atan:   { type: 'function', exported: true, name: 'juttle.modules.math.atan',   arg_count: 1             },
                atan2:  { type: 'function', exported: true, name: 'juttle.modules.math.atan2',  arg_count: 2             },
                ceil:   { type: 'function', exported: true, name: 'juttle.modules.math.ceil',   arg_count: 1             },
                cos:    { type: 'function', exported: true, name: 'juttle.modules.math.cos',    arg_count: 1             },
                exp:    { type: 'function', exported: true, name: 'juttle.modules.math.exp',    arg_count: 1             },
                floor:  { type: 'function', exported: true, name: 'juttle.modules.math.floor',  arg_count: 1             },
                log:    { type: 'function', exported: true, name: 'juttle.modules.math.log',    arg_count: 1             },
                max:    { type: 'function', exported: true, name: 'juttle.modules.math.max',    arg_count: [0, Infinity] },
                min:    { type: 'function', exported: true, name: 'juttle.modules.math.min',    arg_count: [0, Infinity] },
                pow:    { type: 'function', exported: true, name: 'juttle.modules.math.pow',    arg_count: 2             },
                random: { type: 'function', exported: true, name: 'juttle.modules.math.random', arg_count: 0             },
                round:  { type: 'function', exported: true, name: 'juttle.modules.math.round',  arg_count: 1             },
                sin:    { type: 'function', exported: true, name: 'juttle.modules.math.sin',    arg_count: 1             },
                seed:   { type: 'function', exported: true, name: 'juttle.modules.math.seed',   arg_count: 1             },
                sqrt:   { type: 'function', exported: true, name: 'juttle.modules.math.sqrt',   arg_count: 1             },
                tan:    { type: 'function', exported: true, name: 'juttle.modules.math.tan',    arg_count: 1             },
            }
        });
    },
    import_null_module: function() {
        this.scope.put('Null', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, name: 'juttle.modules.null.toString', arg_count: 1 },
            }
        });
    },
    import_array_module: function() {
        this.scope.put('Array', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                indexOf: { type: 'function', exported: true, name: 'juttle.modules.array.indexOf',  arg_count: 2 },
                length:  { type: 'function', exported: true, name: 'juttle.modules.array.length',   arg_count: 1 }
            }
        });
    },
    import_boolean_module: function() {
        this.scope.put('Boolean', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, name: 'juttle.modules.boolean.toString', arg_count: 1 },
            }
        });
    },
    import_number_module: function() {
        this.scope.put('Number', {
            type: 'import',
            exported: false,
            exports: {
                /* Constants (sorted alphabetically) */
                MAX_VALUE:         { type: 'const', exported: true, name: 'Number.MAX_VALUE'         },
                MIN_VALUE:         { type: 'const', exported: true, name: 'Number.MIN_VALUE'         },
                NaN:               { type: 'const', exported: true, name: 'Number.NaN'               },
                NEGATIVE_INFINITY: { type: 'const', exported: true, name: 'Number.NEGATIVE_INFINITY' },
                POSITIVE_INFINITY: { type: 'const', exported: true, name: 'Number.POSITIVE_INFINITY' },

                /* Functions (sorted alphabetically) */
                fromString: { type: 'function', exported: true, name: 'juttle.modules.number.fromString', arg_count: 1 },
                toString: { type: 'function', exported: true, name: 'juttle.modules.number.toString', arg_count: 1 },
            }
        });
    },
    import_string_module: function() {
        this.scope.put('String', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                length: { type: 'function', exported: true, name: 'juttle.modules.string.length', arg_count: 1             },
                concat: { type: 'function', exported: true, name: 'juttle.modules.string.concat', arg_count: [0, Infinity] },
                indexOf: { type: 'function', exported: true, name: 'juttle.modules.string.indexOf', arg_count: 2           },
                lastIndexOf: { type: 'function', exported: true, name: 'juttle.modules.string.lastIndexOf', arg_count: 2   },
                replace: { type: 'function', exported: true, name: 'juttle.modules.string.replace', arg_count: 3           },
                search: { type: 'function', exported: true, name: 'juttle.modules.string.search', arg_count: 2             },
                slice:  { type: 'function', exported: true, name: 'juttle.modules.string.slice',  arg_count: [2, 3]        },
                split:  { type: 'function', exported: true, name: 'juttle.modules.string.split',  arg_count: 2             },
                // substr is undocumented, but used in tests
                substr: { type: 'function', exported: true, name: 'juttle.modules.string.substr', arg_count: [2, 3]        },
                toLowerCase: { type: 'function', exported: true, name: 'juttle.modules.string.toLowerCase', arg_count: 1   },
                toString: { type: 'function', exported: true, name: 'juttle.modules.string.toString', arg_count: 1   },
                toUpperCase: { type: 'function', exported: true, name: 'juttle.modules.string.toUpperCase', arg_count: 1   },
            }
        });
    },
    import_object_module: function() {
        this.scope.put('Object', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                keys: { type: 'function', exported: true, name: 'juttle.modules.object.keys', arg_count: 1 }
            }
        });
    },
    import_regexp_module: function() {
        this.scope.put('RegExp', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                toString: { type: 'function', exported: true, name: 'juttle.modules.regexp.toString', arg_count: 1 },
            }
        });
    },
    import_date_module: function() {
        this.scope.put('Date', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                elapsed:     { type: 'function', exported: true, name: 'juttle.modules.date.elapsed',     arg_count: 1      },
                endOf:       { type: 'function', exported: true, name: 'juttle.modules.date.endOf',       arg_count: 2      },
                format:      { type: 'function', exported: true, name: 'juttle.modules.date.format',      arg_count: [1, 3] },
                formatTz:    { type: 'function', exported: true, name: 'juttle.modules.date.formatTz',      arg_count: 2 },
                parse:       { type: 'function', exported: true, name: 'juttle.modules.date.parse',       arg_count: [1, 2] },
                get:         { type: 'function', exported: true, name: 'juttle.modules.date.get',         arg_count: 2      },
                new:         { type: 'function', exported: true, name: 'juttle.modules.date.new',         arg_count: 1      },
                quantize:    { type: 'function', exported: true, name: 'juttle.modules.date.quantize',    arg_count: 2      },
                startOf:     { type: 'function', exported: true, name: 'juttle.modules.date.startOf',     arg_count: 2      },
                time:        { type: 'function', exported: true, name: 'juttle.modules.date.time',        arg_count: 0      },
                toString:    { type: 'function', exported: true, name: 'juttle.modules.date.toString',    arg_count: 1      },
                unix:        { type: 'function', exported: true, name: 'juttle.modules.date.unix',        arg_count: 1      },
                unixms:      { type: 'function', exported: true, name: 'juttle.modules.date.unixms',      arg_count: 1      },
            }
        });
    },
    import_duration_module: function() {
        this.scope.put('Duration', {
            type: 'import',
            exported: false,
            exports: {
                /* Functions (sorted alphabetically) */
                as:           { type: 'function', exported: true, name: 'juttle.modules.duration.as',           arg_count: 2 },
                format:       { type: 'function', exported: true, name: 'juttle.modules.duration.format',       arg_count: [1, 2] },
                get:          { type: 'function', exported: true, name: 'juttle.modules.duration.get',          arg_count: 2 },
                milliseconds: { type: 'function', exported: true, name: 'juttle.modules.duration.milliseconds', arg_count: 1 },
                new:          { type: 'function', exported: true, name: 'juttle.modules.duration.new',          arg_count: 1 },
                seconds:      { type: 'function', exported: true, name: 'juttle.modules.duration.seconds',      arg_count: 1 },
                toString:     { type: 'function', exported: true, name: 'juttle.modules.duration.toString',     arg_count: 1 },
            }
        });
    },
    import_json_module: function() {
        this.scope.put('JSON', {
            type: 'import',
            exported: false,
            exports: {
                parse:       { type: 'function', exported: true, name: 'juttle.modules.json.parse',       arg_count: 1 },
                stringify:   { type: 'function', exported: true, name: 'juttle.modules.json.stringify',   arg_count: 1 },
            }
        });
    },
    import_juttle_module: function() {
        this.scope.put('Juttle', {
            type: 'import',
            exported: false,
            exports: {
                version: { type: 'const', exported: true, name: 'juttle.modules.juttle.version' },
                adapters: { type: 'function', exported: true, name: 'juttle.modules.juttle.adapters' }
            }
        });
    },
    analyze: function(ast) {
        this.module_asts = ast.modules;

        var analyzed_ast = this.sa_SubDef(ast);

        analyzed_ast.modules = this.ordered_module_asts;
        analyzed_ast.stats = this.stats;

        return analyzed_ast;
    },
    context: function() {
        return this.scope.type;
    },

    sa_var_decl: function(decl, opts) {
        var varname = decl.name;
        if (decl.expr) {
            decl.expr = this.sa_expr(decl.expr, opts);
        }
        decl.uname = this.scope.define_variable(varname, 'var', false, false, false, decl.location);
        return decl;
    },
    sa_const_decl: function(decl, exported, can_redefine, opts) {
        var varname = decl.name;
        decl.expr = this.sa_expr(decl.expr, opts);
        decl.uname = this.scope.define_variable(varname, 'const', exported, can_redefine, decl.expr.d || false, decl.location);
        return decl;
    },
    // a flowgraph node
    sa_proc: function(ast, opts) {
        var uname = this.scope.alloc_var();
        //XXX check options and parameters for unknowns and illegals
        ast.uname = uname;
        this.sa_options(ast.options, opts);
        return ast;
    },
    sa_sub_call: function(ast, sub) {
        var that = this;
        ast.uname = this.scope.alloc_var();
        ast.uname_sub = sub.name;
        ast.options = _.map(ast.options, function(opt) {
            return {id: opt.id, expr:that.sa_expr(opt.expr), location: opt.location};
        });
        ast.sub_sig = _.map(sub.args, function(arg) {
            return { name: arg.name, required: !arg.default };
        });
        return ast;
    },
    //XXX this one operates in place on the option expressions
    //  does not check params
    // XXX should extend this to check for illegal options
    // XXX maybe even try to do some amount of type checking?
    sa_options: function(options, opts) {
        var that = this;
        _.each(options, function(option, index) {
            //XXX need sa_juttle_static_expr() that doesn't operate on stream
            //XXX need sa_juttle_static_expr() that doesn't operate on stream
            //   -> just need to pass down opts context right?!
            //   -> and right now, undefined implies build context so we are ok

            options[index].expr = that.sa_expr(option.expr, opts);
        });
    },
    enter_scope: function(context) {
        this.scope = new Scope(this.scope, context);
    },
    exit_scope: function() {
        this.scope = this.scope.next;
    },
    function_name: function(ast) {
        return ast.name.type !== 'MemberExpression'
            ? ast.name.name
            : ast.name.object.name + '.' + ast.name.property.value;
    },
    check_arg_count: function(name, type, actual_count, expected_count, location) {
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
    },
    sa_function_call: function(ast, funcInfo, opts) {
        var k, args = ast.arguments;
        ast.fname = {type: 'function_uname', uname: funcInfo.name};
        this.check_arg_count(this.function_name(ast), 'function', args.length, funcInfo.arg_count, ast.location);
        var d = true;
        if (args) {
            for (k = 0; k < args.length; ++k) {
                args[k] = this.sa_expr(args[k], opts);
                d = d && args[k].d;
            }
        }

        if (opts.context !== 'stream' && opts.context !== 'reduce') {
            ast.d = d;
        } else {
            // because we don't know if the function contains a call to
            // Math.random() (PROD-4556)
            ast.d = false;
        }
        return ast;
    },
    can_export: function() {
        return (this.context() === 'module' || this.context() === 'main');
    },
    check_export: function(ast) {
        if (ast.export  && !this.can_export()) {
            throw errors.compileError('NON-TOPLEVEL-EXPORT', {
                context: this.context(),
                location: ast.location
            });
        }
    },
    check_reducer_toplevel: function(ast, thing) {
        if (this.context() === 'reducer') {
            throw errors.compileError('REDUCER-TOPLEVEL-STATEMENT', {
                thing: thing,
                location: ast.location
            });
        }
    },

    // statements that can appear inside subs or at the top level
    sa_statement: function(ast) {
        switch (ast.type) {

            case 'SubDef':
            case 'FunctionDef':
            case 'ReducerDef':
            case 'ConstStatement':
            case 'InputStatement':
            case 'VarStatement':
            case 'EmptyStatement':
            case 'AssignmentStatement':
            case 'SequentialGraph':
            case 'ImportStatement':
            case 'ParallelGraph':
                return this['sa_' + ast.type](ast);

            default:
                throw new Error('unrecognized statement type ' + ast.type);
        }
    },
    sa_ModuleDef: function(ast) {
        // turn module name into valid js identifier since
        // it will be used in the runtime module name
        //XXX/sm I don't understand this... this doesn't seem fully robust
        // and can create collisions...
        var name_ident = ast.name.replace(/[^a-zA-Z0-9$_]/g, '_');
        var modName = this.scope.alloc_var(name_ident);
        var k, elems = ast.elements;

        ast.uname = modName;

        var saved_scope = this.scope;
        this.scope = new Scope(null, 'module');
        this.import_standard_modules();

        for (k = 0; k < elems.length; ++k) {
            elems[k] = this.sa_statement(elems[k]);
        }

        this.modules[ast.name] = {
            uname: modName,
            exports: this.scope.exports()
        };
        this.scope = saved_scope;
        return ast;
    },
    sa_SubDef: function(ast) {
        var uname, elems, k, has_graph;

        this.check_export(ast);

        uname = this.scope.define_sub(ast.name, ast.args, ast.export);
        ast.uname = uname;
        this.enter_scope(ast.name === 'main' ? 'main' : 'sub');

        elems = ast.elements;
        ast.args = this.sa_args(ast.args);
        for (k = 0; k < elems.length; ++k) {
            elems[k] = this.sa_statement(elems[k]);
        }
        this.exit_scope();

        if (this.context() === 'top') {
            has_graph = _.any(ast.elements, function(element) {
                return element.type === 'SequentialGraph' || element.type === 'ParallelGraph';
            });

            if (!has_graph) {
                throw errors.compileError('PROGRAM-WITHOUT-FLOWGRAPH', {
                    location: ast.location
                });
            }
        }

        return ast;
    },

    // statements that can appear inside functions or reducers
    sa_function_statement: function(ast, opts) {
        opts = opts || {};
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
                return this['sa_' + ast.type](ast, opts);

            default:
                throw new Error('unrecognized function statement type ' + ast.type);
        }
    },
    sa_args: function(args) {
        var is_optional;
        var seen_optional = false;

        for (var k = 0; k < args.length; k++) {
            is_optional = !!args[k].default;
            if (seen_optional && !is_optional) {
                throw errors.compileError('PARAM-ORDER', {
                    location: args[k].location
                });
            }

            args[k] = this.sa_FormalArg(args[k]);

            seen_optional = is_optional;
        }
        return args;
    },
    compute_arg_count: function(args) {
        var requiredArgs = _.filter(args, function(arg) {
            return !arg.default;
        });

        return [requiredArgs.length, args.length];
    },
    sa_FormalArg: function(ast) {
        ast.uname = this.context().match(/fn/) || this.context() === 'reducer'
            ? this.scope.define_var(ast.name, false)
            : this.scope.define_const(ast.name, false, true);

        if (ast.default) {
            ast.default = this.sa_expr(ast.default);
        }

        return ast;
    },
    sa_FunctionDef: function(ast, opts) {
        var elems, uname  = this.scope.define_func(ast.name, ast.export, this.compute_arg_count(ast.args));
        ast.uname = uname;
        this.check_export(ast);

        var context = this.context().match(/reducer/) ? 'fn-in-' + this.context() : 'fn';
        this.enter_scope(context + ':' + ast.name);

        ast.args = this.sa_args(ast.args);
        elems = ast.elements;
        for (var k = 0; k < elems.length; ++k) {
            elems[k] = this.sa_function_statement(elems[k], opts);
        }

        this.exit_scope();

        return ast;
    },

    sa_ReducerDef: function(ast) {
        var k, elems;
        var uname = this.scope.define_reducer(ast.name, ast.export, this.compute_arg_count(ast.args));
        ast.uname = uname;

        this.check_export(ast);

        this.enter_scope('reducer');
        elems = ast.elements;
        ast.args = this.sa_args(ast.args);
        for (k = 0; k < elems.length; ++k) {
            var node = elems[k];
            var opts = { context: 'build' };
            if (node.type === 'FunctionDef') {
                if ((node.name === 'update' || node.name === 'result' || node.name === 'expire' || node.name === 'reset')) {
                    if (node.args.length > 0) {
                        throw errors.compileError('REDUCER-METHOD-ARGS', {
                            name: node.name,
                            location: node.location
                        });
                    }
                    if (node.name === 'update' || node.name === 'expire') {
                        opts.context = 'stream';
                        node.stream = true;
                    }
                }
            }
            elems[k] = this.sa_function_statement(node, opts);
            if (node.type === 'FunctionDef') {
                if (node.name === 'update') {
                    ast.update_uname = node.uname;
                }
                else if (node.name === 'expire') {
                    ast.expire_uname = node.uname;
                }
                else if (node.name === 'reset') {
                    ast.reset_uname = node.uname;
                }
                else if (node.name === 'result') {
                    ast.result_uname = node.uname;
                }
            }
        }
        this.exit_scope();

        return ast;
    },
    sa_StatementBlock: function(ast, opts) {
        this.check_reducer_toplevel(ast, 'a block');

        var elems = ast.elements;
        this.enter_scope('block-in-' + this.context());
        for (var k = 0; k < elems.length; ++k) {
            elems[k] = this.sa_function_statement(elems[k], opts);
        }
        this.exit_scope();
        return ast;
    },
    // elements of a flowgraph
    sa_proc_element: function(ast) {
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
        if (methods.hasOwnProperty(ast.type)) {
            if (!ast.options) {
                ast.options = [];
            }
            return methods[ast.type].call(this, ast);
        }

        throw new Error('unrecognized processor or sub: ' + ast.type);
    },

    sa_graph: function(ast) {
        var k, elems = ast.elements;

        // ignore top-level flowgraphs for imported modules
        // we check for semantic errors in imported module even
        // if outer body isn't used
        if (this.context() === 'module') {
            // remember this context so code generator can ignore procs
            // that are in the outer scope of a module
            ast.outer_module = true;
        }
        for (k = 0; k < elems.length; k++) {
            elems[k] = this.sa_proc_element(elems[k]);
        }
        return ast;
    },

    sa_SequentialGraph: function(ast) {
        return this.sa_graph(ast);
    },
    sa_ParallelGraph: function(ast) {
        return this.sa_graph(ast);
    },

    sa_EmptyStatement: function(ast, opts) {
        return ast;
    },
    // this type of assignment lives only in places where there are
    // no points or reducers
    sa_AssignmentStatement: function(ast, opts) {
        this.check_reducer_toplevel(ast, 'an assignment');

        opts = opts || {};
        ast.left = this.sa_assignment_lhs(ast.left, opts);
        //XXX need to handle op's other than "="
        ast.expr = this.sa_expr(ast.expr, opts);
        return ast;
    },
    // this type of assignment lives in places where there can be
    // points or reducers
    sa_AssignmentExpression: function(ast, opts) {
        ast.left = this.sa_assignment_lhs(ast.left, opts);
        ast.right = this.sa_expr(ast.right, opts);
        ast.d = ast.left.d && ast.right.d;
        return ast;
    },
    sa_VarStatement: function(ast, opts) {
        opts = opts || {};
        var k, decls = ast.declarations;
        for (k = 0; k < decls.length; ++k) {
            decls[k] = this.sa_var_decl(decls[k], opts);
        }
        return ast;
    },
    sa_InputStatement: function(ast, opts) {
        var self = this;
        opts = opts || {};

        this.check_export(ast);

        ast.options = _.map(ast.options, function(opt) {
            var ret = {type: 'InputOption', id: opt.id, expr: self.sa_expr(opt.expr)};
            if (! ret.expr.d) {
                throw errors.compileError('BAD-INPUT-OPTION', {
                    input: ast.name,
                    option: opt.id,
                    location: opt.location
                });
            }
            return ret;
        });
        ast.uname = this.scope.define_variable(ast.name, 'const', ast.export, false, true, ast.location);

        var detector = new StaticInputDetector();
        ast.static = detector.isStatic(ast);

        return ast;
    },
    sa_ConstStatement: function(ast, opts) {
        opts = opts || {};
        var k, decls = ast.declarations;
        this.check_export(ast);
        for (k = 0; k < decls.length; ++k) {
            if (!decls[k].expr) {
                throw errors.compileError('UNINITIALIZED-CONST', {
                    name: decls[k].name,
                    location: ast.location
                });
            }
            decls[k] = this.sa_const_decl(decls[k], ast.export, ast.arg, opts);
        }
        return ast;
    },
    sa_ImportStatement: function(ast, functions) {
        var self = this;
        var modulename = ast.modulename.value;

        if (this.context() !== 'module' && this.context() !== 'main') {
            throw errors.compileError('NON-TOPLEVEL-IMPORT', {
                context: this.context(),
                location: ast.location
            });
        }
        if (_.contains(this.import_path, modulename)) {
            this.import_path.push(modulename); // for the error message
            throw errors.compileError('CYCLIC-IMPORT', {
                path: this.import_path.join(' -> '),
                location: ast.location
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
        this.scope.put(ast.localname, {
            type: 'import',
            exported: false,
            exports: module.exports
        });

        this.import_path.pop();
        this.stats.imports++;

        return ast;
    },

    sa_IfStatement: function(ast, opts) {
        this.check_reducer_toplevel(ast, 'an if statement');

        ast.condition = this.sa_expr(ast.condition, opts);
        ast.ifStatement = this.sa_function_statement(ast.ifStatement, opts);
        if (ast.elseStatement) {
            ast.elseStatement = this.sa_function_statement(ast.elseStatement,
                                                           opts);
        }
        return ast;
    },
    sa_ReturnStatement: function(ast, opts) {
        this.check_reducer_toplevel(ast, 'a return statement');

        if (ast.value) {
            ast.value = this.sa_expr(ast.value, opts);
        }
        return ast;
    },
    sa_ErrorStatement: function(ast, opts) {
        ast.message = this.sa_expr(ast.message, opts);
        return ast;
    },

    sa_ExpressionFilterTerm: function(ast, opts) {
        ast.expression = this.sa_expr(ast.expression, { context: 'filter', coerce_var: 'field' });
        // will be carried in AST form to a proc implementation
        ast.expression.d = false;
        ast.d = false;
        return ast;
    },
    sa_SimpleFilterTerm: function(ast) {
        ast.expression = this.sa_expr(ast.expression);
        // will be carried in AST form to a proc implementation
        ast.d = false;
        return ast;
    },
    sa_FilterLiteral: function(ast) {
        ast.ast = this.sa_expr(ast.ast);
        // will be carried in AST form to a proc implementation
        ast.d = false;
        return ast;
    },
    sa_filter_proc: function(ast, opts) {
        if (ast.filter) {
            ast.filter = this.sa_expr(ast.filter, opts);
        }
        return this.sa_proc(ast);
    },
    sa_sequence_proc: function(ast) {
        var self = this;
        if (ast.filters.length < 2) {
            throw errors.compileError('PROC-NEEDS-ARG', {
                name: 'sequence',
                location: ast.location
            });
        }
        if (ast.groupby) {
            ast.options.push({id: 'groupby', expr:ast.groupby});
            delete ast.groupby;
        }
        ast.filters = _.map(ast.filters, function (ast) { return self.sa_expr(ast); });
        return this.sa_proc(ast);
    },
    sa_FilterProc: function(ast) {
        return this.sa_filter_proc(ast, { allow_field_comparisons: true });
    },
    sa_SequenceProc: function(ast) {
        return this.sa_sequence_proc(ast);
    },
    sa_ReadProc: function(ast) {
        return this.sa_filter_proc(ast, { allow_field_comparisons: false });
    },
    sa_option_proc: function(ast, options) {
        // Some procs have syntactical sugar for parameters (e.g. the limit in
        // `head 10` or the bylist in `reduce by a, b`). They show up as named
        // attributes in the AST. We convert those into options (which are
        // really parameters) so that they can be handled uniformly by the
        // compiler)
        options = options || [];
        _.each(options, function(option) {
            if (ast[option]) {
                ast.options.push({id: option, expr: ast[option]});
                delete ast[option];
            }
        });
        return this.sa_proc(ast);
    },
    sa_SortProc: function(ast) {
        return this.sa_option_proc(ast, ['groupby', 'columns']);
    },
    sa_View: function(ast) {
        // The "coerce_var" option needs to be set explicitly so that sa_ByList
        // doesn't override.
        var opts = {
            coerce_var: 'none'
        };

        return this.sa_proc(ast, opts);
    },
    sa_ObjectLiteral: function(ast, opts) {
        var k, props;
        var d = true;
        props = ast.properties;
        for (k = 0; k < props.length; ++k) {
            props[k] = this.sa_ObjectProperty(props[k], opts);
            d = d && props[k].d;
        }
        ast.d = d;
        return ast;
    },
    sa_ObjectProperty: function(ast, opts) {
        ast.key = this.sa_expr(ast.key, opts);
        ast.value = this.sa_expr(ast.value, opts);
        ast.d = ast.key.d && ast.value.d;
        return ast;
    },
    sa_RegExpLiteral: function(ast) {
        ast.d = true;
        return ast;
    },
    sa_reducer_arg: function(arg, opts) {
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
            return {
                type:'StringLiteral',
                value:arg.name,
                location:arg.location
            };
        } else {
            // reducer *arguments* are evaluated at build time
            return this.sa_expr(arg, {context:'build'});
        }
    },
    //
    // returns an array of objects one for each reducer used in the expressions
    // previously parsed. this gets added to the tree for later use.
    // XXX would be helpful to include all the functions referenced so we can
    // make sure those that are needed are compiled into the final output
    // in the target language (as of 2014, just javascript) and available
    // in the juttle runtime
    //
    sa_reducers: function(reducers) {
        var k, op, args, reducerInfo, index;
        var out = [];
        for (k = 0; k < reducers.length; ++k) {
            //XXX need a uniform way to pass in args... we will do
            // this with locally scoped vars. see NOTES
            op = reducers[k].name;
            args = reducers[k].args || [];
            index = reducers[k].index;

            if (reducers[k].module) {
                reducerInfo = this.scope.lookup_module_reducer(reducers[k].module, op);
            } else {
                reducerInfo = is_builtin_reducer(op)
                    ? this.scope.fake_builtin_reducer_symbol(op)
                    : this.scope.get(op);
            }

            out.push({
                index: index,
                name: op,
                uname: {type: 'function_uname', uname: reducerInfo.name},
                arguments: args });
        }
        return out;
    },
    sa_reifier_proc: function(ast, opts) {
        var k, reducers = [];
        opts.reducers = reducers;

        for (k = 0; k < ast.exprs.length; ++k) {
            opts.index = k;
            ast.exprs[k] = this.sa_expr(ast.exprs[k], opts);
        }
        //
        // decorate the AST with the list of reducers that are used
        // across all of the expressions of this reduce proc.  The position
        // of a particualr reducer in this list correponds to the
        // reducer_index decoration in the expression AST node that calls
        // this particular reducer.
        //
        ast.reducers = this.sa_reducers(reducers);

        if (ast.groupby) {
            ast.options.push({id: 'groupby', expr:ast.groupby});
            delete ast.groupby;
        }
        return this.sa_proc(ast);
    },
    sa_ReduceProc: function(ast) {
        var reified = this.sa_reifier_proc(ast, {context: 'reduce'});
        reified.reducers.forEach(function(reducer) {
            if (reducer.name === 'delta') {
                throw errors.compileError('REDUCE-DELTA-ERROR', {
                    location: ast.location
                });
            }
        });
        return reified;
    },
    sa_PutProc: function(ast) {
        return this.sa_reifier_proc(ast, {context: 'stream',
                                         coerce_var: 'field'});
    },

    // Rather than do builtin proc analysis in this ad hoc way, we should add builtins
    // to the scope (similary to how had we add builtin modules), but we can't
    // just handle built-ins as subs, because we don't want the strict
    // arity-checking they have. (Also the goal of this work is to eventually
    // get rid of subs). So in a second pass we should get rid of this and
    // unify the way the compiler handles user-defined subs and built-in subs (and while
    // we're at it support optional user-defined sub arguments, for
    // conveniency, and also for consistency with builtins).
    builtin_procs:  {
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
    },
    sa_builtin_proc: function(ast) {
        ast.type = 'BuiltinProc';

        _.each(this.builtin_procs[ast.name].maybe, function(attrname) {
            if (ast[attrname]) {
                ast.options.push({id: attrname, expr: ast[attrname]});
                delete ast[attrname];
            }
        });

        _.each(this.builtin_procs[ast.name].always, function(attrname) {
            if (!ast[attrname]) {
                throw errors.compileError('PROC-NEEDS-ARG', {
                    name: ast.name,
                    location: ast.location
                });
            }
            ast.options.push({id: attrname, expr: ast[attrname]});
            delete ast[attrname];
        });
        return this.sa_proc(ast);
    },
    sa_OptionOnlyProc: function(ast) {
        return this.sa_builtin_proc(ast);
    },
    sa_WriteProc: function(ast) {
        return this.sa_proc(ast);
    },
    sa_SingleArgProc: function(ast) {
        return this.sa_builtin_proc(ast);
    },
    sa_FieldListArgProc: function(ast) {
        return this.sa_builtin_proc(ast);
    },
    sa_FunctionProc: function(ast) {
        var sub;

        if (ast.op.type === 'MemberExpression') {
            sub = this.scope.lookup_module_sub(ast.op.object.name, ast.op.property.value);
            if (sub === undefined) {
                throw errors.compileError('NOT-EXPORTED', {
                    thing: 'sub',
                    name: ast.op.property.value,
                    module: ast.op.object.name,
                    location: ast.location
                });
            }
            ast.op.object.symbol = this.scope.get(ast.op.object.name);
        } else {
            sub = this.scope.get(ast.op.name);
            if (!sub) {
                throw errors.compileError('NO-SUCH-SUB', {
                    name: ast.op.name,
                    location: ast.location
                });
            }
            if (sub.type !== 'sub') {
                throw errors.compileError('NOT-A-SUB', {
                    name: ast.op.name,
                    location: ast.location
                });
            }
            ast.op.symbol = sub;
        }

        this.stats.subs++;
        return this.sa_sub_call(ast, sub);
    },

    sa_assignment_lhs: function(ast, opts) {
        switch (ast.type) {
            case 'UnaryExpression':
                ast = this.sa_UnaryExpression(ast, opts);
                return ast;

            case 'Variable':
                if (!this.scope.lookup_variable(ast.name)) {
                    throw errors.compileError('UNDEFINED-VARIABLE', {
                        name: ast.name,
                        location: ast.location
                    });
                }
                if (!this.scope.is_mutable(ast.name, opts, this.context())) {
                    throw errors.compileError('VARIABLE-NOT-ASSIGNABLE', {
                        name: ast.name,
                        location: ast.location
                    });
                }
                return this.sa_Variable(ast, opts);

            case 'Field':
                return this.sa_Field(ast, opts);

            case 'MemberExpression':
                if (!this.scope.is_mutable(ast.object.name, opts, this.context())) {
                    throw errors.compileError('VARIABLE-NOT-MODIFIABLE', {
                        name: ast.object.name,
                        location: ast.location
                    });
                }
                return this.sa_MemberExpression(ast, opts);

            default:
                throw new Error('unrecognized expression lhs ' + ast.type);
        }
    },

    sa_expr: function(ast, opts) {
        opts = opts || {};
        switch (ast.type) {
            case 'NullLiteral':
            case 'BooleanLiteral':
            case 'NumberLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'StringLiteral':
            case 'MomentLiteral':
            case 'DurationLiteral':
                ast.d = true;
                return ast;

            case 'AssignmentExpression':
            case 'FunctionCall':
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
                return this['sa_' + ast.type](ast, opts);

            default:
                throw new Error('unrecognized expression type ' + ast.type);
        }
    },

    sa_PostfixExpression: function(ast, opts) {
        var name;
        switch (ast.expression.type) {
            case 'Variable':
            case 'MemberExpression':
                name = ast.expression.type === 'Variable' ?
                   ast.expression.name : ast.expression.object.name;
                ast.expression = this.sa_expr(ast.expression, opts);
                if (!this.scope.is_mutable(name, opts, this.context())) {
                    throw errors.compileError('INVALID-POSTFIX-USE', {
                        operator: ast.operator,
                        variable: name,
                        location: ast.location
                    });
                }
                ast.d = ast.expression.d;
                return ast;
            default:
                throw errors.compileError('INVALID-POSTFIX-LHS', {
                    location: ast.location
                });
        }
    },
    sa_FunctionCall: function(ast, opts) {
        var fname, args, funcInfo, i;
        if (ast.name.type === 'MemberExpression') {
            args = ast.arguments;

            funcInfo = this.scope.lookup_module_reducer(ast.name.object.name, ast.name.property.value);
            if (funcInfo) {
                // XXX opts.reducers implies reducer context
                if (!opts.reducers) {
                    throw errors.compileError('INVALID-REDUCER-CALL', {
                        name: ast.name.object.name + '.' + ast.name.property.value,
                        location: ast.location
                    });
                }
                opts.reducers.push({
                    module: ast.name.object.name,
                    name:ast.name.property.value,
                    args:args,
                    index: opts.index
                });
                ast.type = 'ReducerCall';
                ast.reducer_call_index = opts.reducers.length - 1;
                ast.name.object.symbol = this.scope.get(ast.name.object.name);
                this.check_arg_count(this.function_name(ast), 'reducer', args.length, funcInfo.arg_count, ast.location);
                ast.context = opts.context; // needed because reducer calls are different in put vs reduce
                for (i = 0; i < args.length; ++i) {
                    args[i] = this.sa_reducer_arg(args[i]);
                }
                return ast;
            } else {
                funcInfo = this.scope.lookup_module_func(ast.name.object.name, ast.name.property.value);
                if (funcInfo === undefined) {
                    throw errors.compileError('NOT-EXPORTED', {
                        thing: 'function',
                        name: ast.name.property.value,
                        module: ast.name.object.name,
                        location: ast.location
                    });
                }
                ast.name.object.symbol = this.scope.get(ast.name.object.name);
                return (this.sa_function_call(ast, funcInfo, opts));
            }
        } else {
            //XXX fragile b/c parser allows for expressions as function
            fname = ast.name.name;
        }

        args = ast.arguments;
        if (is_builtin_reducer(fname) || (this.scope.get(fname) && this.scope.get(fname).type === 'reducer')) {
            if (!opts.reducers) {
                throw errors.compileError('INVALID-REDUCER-CALL', {
                    name: fname,
                    location: ast.location
                });
            }
            opts.reducers.push({name:fname, args:args, index: opts.index});
            ast.type = 'ReducerCall';
            ast.reducer_call_index = opts.reducers.length - 1;
            // XXX(dmajda): Remove the fake built-in reducer symbol entries hack.
            funcInfo = is_builtin_reducer(fname)
                ? this.scope.fake_builtin_reducer_symbol(fname)
                : this.scope.get(fname);
            this.check_arg_count(this.function_name(ast), 'reducer', args.length, funcInfo.arg_count, ast.location);
            ast.name.symbol = funcInfo;
            ast.context = opts.context; // needed because reducer calls are different in put vs reduce
            for (i = 0; i < args.length; ++i) {
                args[i] = this.sa_reducer_arg(args[i]);
            }
            return ast;
        } else {
            funcInfo = this.scope.get(fname);
            if (!funcInfo) {
                throw errors.compileError('NO-SUCH-FUNCTION', {
                    name: fname,
                    location: ast.location
                });
            }
            if (funcInfo.type !== 'function') {
                throw errors.compileError('NOT-A-FUNCTION', {
                    name: fname,
                    location: ast.location
                });
            }
            ast.name.symbol = funcInfo;
            return this.sa_function_call(ast, funcInfo, opts);
        }
    },
    sa_UnaryExpression: function(ast, opts) {
        var op = ast.operator;
        var name;

        ast.expression = this.sa_expr(ast.expression, opts);
        if (op === '*') {
            if (opts.context !== 'stream' && opts.context !== 'reduce' && opts.context !== 'filter') {
                throw errors.compileError('INVALID-FIELD-REFERENCE', {
                    location: ast.location
                });
            }
            ast.d = false;
            return ast;
        }
        ast.d = ast.expression.d;
        //XXX limit allowable operators?  why only look for these two?
        if (op === '++' || op === '--') {
            name = ast.expression.type === 'Variable' ?
                ast.expression.name : ast.expression.object.name;
            if (!this.scope.is_mutable(name, opts, this.context())) {
                throw errors.compileError('INVALID-PREFIX-USE', {
                    operator: op,
                    variable: name,
                    location: ast.location
                });
            }
        }
        return ast;
    },
    sa_BinaryExpression: function(ast, opts) {
        ast.left = this.sa_expr(ast.left, opts);
        ast.right = this.sa_expr(ast.right, opts);
        ast.d = ast.left.d && ast.right.d;
        return ast;
    },
    sa_ConditionalExpression: function(ast, opts) {
        ast.condition = this.sa_expr(ast.condition, opts);
        ast.trueExpression = this.sa_expr(ast.trueExpression, opts);
        ast.falseExpression = this.sa_expr(ast.falseExpression, opts);
        //XXX can be smarter than this
        ast.d = ast.condition.d && ast.trueExpression.d && ast.falseExpression.d;
        return ast;
    },
    sa_MultipartStringLiteral: function(ast, opts) {
        var k;
        var d = true;
        for (k = 0; k < ast.parts.length; k++) {
            ast.parts[k] = this.sa_expr(ast.parts[k], opts);
            d = d && ast.parts[k].d;
        }
        ast.d = d;
        return ast;
    },
    sa_ArrayLiteral: function(ast, opts) {
        var k;
        var d = true;
        for (k = 0; k < ast.elements.length; k++) {
            ast.elements[k] = this.sa_expr(ast.elements[k], opts);
            d = d && ast.elements[k].d;
        }
        ast.d = d;
        return ast;
    },
    sa_ByList: function(ast, opts) {
        var k, elem = ast.elements;
        var d = true;
        if (!opts.coerce_var) {
            opts.coerce_var = 'string';
        }
        // ast.elements is an array of the comma separated expressions
        // each element can be an identifier (which may be a variable
        // or may be coerced to a string), an expression that evaluates
        // to an array (which may be a single variable) or to an string.
        // we need to check all this at run time and stitch together the
        // results into a top level array that is the list of strings
        // representing the field names
        for (k = 0; k < elem.length; k++) {
            elem[k] = this.sa_expr(elem[k], opts);
            d = d && elem[k].d;
        }
        ast.d = d;
        return ast;
    },
    sa_SortByList: function(ast) {
        var k, elem = ast.elements;
        var d = true;
        var opts = {coerce_var:'string'};
        for (k = 0; k < elem.length; k++) {
            elem[k].expr = this.sa_expr(elem[k].expr, opts);
            d = d && elem[k].d;
        }
        ast.d = d;
        return ast;
    },
    sa_Variable: function(ast, opts) {
        var varInfo = this.scope.get(ast.name);

        if (varInfo) {
            ast.uname = this.scope.lookup_variable(ast.name);
            ast.symbol = varInfo;
            ast.d = varInfo.d;

            return ast;
        } else {
            switch (opts.coerce_var) {
                case 'string':
                    return {
                        type: 'StringLiteral',
                        value: ast.name,
                        d:true,
                        location: ast.location
                    };

                case 'field':
                    return {
                        type: 'Field',
                        name: ast.name,
                        d:false,
                        location: ast.location
                    };

                default:
                    throw errors.compileError('UNDEFINED', {
                        name: ast.name,
                        location: ast.location
                    });
            }
        }
    },
    sa_Field: function(ast, opts) {
        if (opts.context !== 'stream' && opts.context !== 'reduce' && opts.context !== 'filter') {
            throw errors.compileError('INVALID-FIELD-REFERENCE', {
                location: ast.location
            });
        }
        ast.d = false;
        return ast;
    },
    sa_ToString: function(ast, opts) {
        ast.expression = this.sa_expr(ast.expression, opts);
        ast.d = ast.expression.d;
        return ast;
    },
    sa_MemberExpression: function(ast, opts) {
        var varInfo;
        if (!ast.computed) {
            varInfo = this.scope.lookup_module_variable(ast.object.name, ast.property.value);
            if (varInfo === undefined) {
                throw errors.compileError('NOT-EXPORTED', {
                    thing: 'variable',
                    name: ast.property.value,
                    module: ast.object.name,
                    location: ast.location
                });
            }

            ast.object = this.sa_expr(ast.object, opts);

            ast.uname = varInfo.name;
            ast.symbol = this.scope.get(ast.object.name).exports[ast.property.value];
            ast.d = true;
        }
        else {
            ast.object = this.sa_expr(ast.object, opts);
            ast.property = this.sa_expr(ast.property, opts);
            ast.d = ast.object.d && ast.property.d;
            //XXX/TBD need to track d flag in arrays...
        }
        return ast;
    }
});

module.exports = SemanticPass;
