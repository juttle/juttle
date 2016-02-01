'use strict';

var _ = require('underscore');
var CodeGenerator = require('./code-generator');
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
// generate a javascript program that when run returns a flowgraph
// datastructure representing the juttle program fully evaluated
// in build context.  this intermediate form can then be optimized,
// before a final pass traverses it and spits out the target implementation
// (which is currently limited to javascript running against the
// juttle js runtime)
//
var Build = CodeGenerator.extend({
    initialize: function() {
        // XXX/sm we can easily get rid of emit and just recursively return
        // the code strings, except we rely on returning the uname for the
        // proc when building the graph contruction code
        this.code = '';
    },
    gen: function(ast) {
        var code, body;
        var self = this;

        _.each(ast.modules, function(ast) {
            self.gen_ModuleDef(ast);
        } );

        this.gen_SubDef(ast, {path_info: {mod: '', sub: []}});
        body = this.code;
        //
        // wrap main in a closure so it does not pollute the name space.
        // call main and return its value, which is the flowgraph head object.
        // this should be the only object reference into the entire
        // compiled world and associated runtime.
        //
        code = '(function(builder, juttle) {\n';
        code += body;
        code += 'builder.record_stats(' + JSON.stringify(ast.stats) + ');';
        code += ast.uname + '();\n';
        code += '});\n';
        return code;
    },
    emit: function(s) {
        this.code += s;
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
        code += 'builder.set_const("' + uname + '",' + uname + ');\n';
        return code;
    },
    //
    // this is like JSON.stringify except we walk the object and for
    // code nodes we output the code directly instead of a string rep
    // of the code
    // XXX generalize this (google a deepcopy routine)
    //
    build_code_ast: function(ast) {
        var s;
        var self = this;
        if (ast === null || typeof(ast) !== 'object') {
            return JSON.stringify(ast);
        }
        if (ast.type === 'Eval') {
            return 'builder.value_ast(' + ast.expr + ')';
        }

        if (ast.type === 'function_uname') {
            return 'builder.uname("' + ast.uname + '")';
        }

        if (Array.isArray(ast)) {
            s = '[\n' +
                _.map(ast, function(el) { return self.build_code_ast(el); }).join(' ,') +
                ']\n';
        } else {
            s = '{\n' +
                _.map(ast, function(val, key) {
                    return key + ': ' + self.build_code_ast(val);
                }).join(' ,') +
                '}';
        }
        return s;
    },
    gen_BuiltinProc: function(ast) {
        return this.gen_proc(ast);
    },
    gen_proc: function(ast) {
        var code;
        ast.pname = {type:'Eval', expr:'builder.alloc_pname()' };
        code = 'var ' + ast.uname + ' = ';
        this.build_options(ast);
        code += this.build_code_ast(ast) + ';';
        code += 'builder.add_node(' + ast.uname + ');\n';
        this.emit(code);
        return ast.uname;
    },
    gen_sub_call: function(ast) {
        var code = '';
        var self = this;
        var subname = ast.op.type === 'Variable' ? ast.op.name : ast.op.base.name + '.' + ast.op.name.value;
        code += 'var ' + ast.uname + ' = ' + ast.uname_sub + '.apply(';
        code += 'null, ';
        code += 'builder.build_sub_args(';
        code += JSON.stringify(ast.sub_sig) + ', [';
        code += _.map(ast.options, function(option) {
            return '{ id: "' + option.id + '", ' + 'value: ' + self.gen_expr(option.expr) + ', location:' + JSON.stringify(option.location) + '}';
        }).join(', ');
        code += '], ';
        code += '"' + subname + '",\n';
        code += JSON.stringify(ast.location) + '));\n';
        this.emit(code);
        return ast.uname;
    },
    build_options: function(ast) {
        var that = this;
        ast.options = _.map(ast.options, function(option) {
            // when we finally set 'd' bit everywhere properly, we should be
            // able to uncomment this line without it throwing
            // if (!val.d) throw new Error ("All proc options should have 'd'!");

            return {
                id: option.id,
                val: {type:'Eval', expr:that.gen_expr(option.expr)},
                location: option.location
            };
        } );
    },

    // statements that can appear inside subs or at the top level
    gen_statement: function(ast, opts) {
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
                return this['gen_' + ast.type](ast, opts);
            default:
                throw new Error('unrecognized statement type ' + ast.type);
        }
    },
    gen_ModuleDef: function(ast) {
        //
        // just spit out the module elements in the main scope since
        // the semantic pass flattened out all the module contents
        // with unames
        //
        var self = this;
        _.each(ast.elements, function(stmt) {
            self.gen_statement(stmt, {path_info: {mod: ast.name, sub: []}});
        } );
    },
    gen_SubDef: function(ast, opts) {
        opts = opts || {};
        opts.path_info = opts.path_info || {};
        var flowgraph, returnVal;
        var args = _.pluck(ast.args, 'uname');
        this.emit('var ' + ast.uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(ast.args, true);

        var self = this;

        // This could also be a top-level program (type 'MainModuleDef') in
        // which case we don't want to record a sub name
        if (ast.type === 'SubDef') {
            opts.path_info.sub.push(ast.name);
        }
        flowgraph = _.chain(ast.elements)
            .map(function(stmt) { return self.gen_statement(stmt, opts); })
            .filter(function(g) { return g !== undefined; } )
            .value();

        opts.path_info.sub.pop();

        //XXX TBD
        returnVal = this.stitch(flowgraph);
        if (returnVal !== undefined) {
            this.emit('return ' + returnVal + ';\n');
        }
        this.emit('};\n');
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
    gen_fill_args: function(args, define_consts) {
        for (var k = 0; k < args.length; k++) {
            if (args[k].default) {
                this.emit('if (' + args[k].uname + ' === undefined) {\n');
                this.emit(args[k].uname + ' = ' + this.gen_expr(args[k].default) + ';\n');
                this.emit('}\n');
            }

            if (define_consts) {
                this.emit('builder.set_const("' + args[k].uname + '",' + args[k].uname + ');\n');
            }
        }
    },
    define_consts: function(elems) {
        var j, k, decls;

        for (k = 0; k < elems.length; ++k) {
            if (elems[k].type === 'ConstStatement') {
                decls = elems[k].declarations;
                for (j = 0; j < decls.length; ++j) {
                    if (decls[j].expr.d) {
                        this.emit(this.gen_const_decl(decls[j]));
                    }
                }
            }
        }
    },
    gen_FunctionDef: function(ast) {
        var k, elems = ast.elements;
        var args = _.pluck(ast.args, 'uname');
        this.emit('var ' + ast.uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(ast.args, false);
        for (k = 0; k < elems.length; ++k) {
            this.gen_function_statement(elems[k]);
        }
        this.emit('return null;\n');
        this.emit('};\n');
        this.emit(ast.uname + '.location = ' + JSON.stringify(ast.location) + ';\n');

        ast = this.build_reify(ast);

        // Define const statements outside of the function's scope so that
        // they are avaialble in the add_function call below.
        this.define_consts(elems);

        //XXX should only do add_functions for functions that are referenced
        //from stream context, otherwise, they should just go away after
        // this pass because they aren't needed at runtime
        this.emit('builder.add_function(' + this.build_code_ast(ast) + ');\n');
    },
    build_reify: function(ast) {
        var self = this;
        if (ast === null || typeof(ast) !== 'object') {
            return ast;
        }
        if (ast.type === 'Variable' && ast.symbol.type === 'const' && ast.d) {
            return this.build_reifier_expr(ast);
        }
        _.each(ast, function(val, name) {
            ast[name] = self.build_reify(val);
        });
        return ast;
    },
    gen_ReducerDef: function(ast) {
        ast = this.build_reify(ast);

        // Define const statements outside of the reducer's scope so that they
        // are avaialble in the add_reducer call below.
        this.define_consts(ast.elements);

        this.emit('builder.add_reducer(' + this.build_code_ast(ast) + ');\n');
    },
    gen_StatementBlock: function(ast) {
        for (var k = 0; k < ast.elements.length; ++k) {
            this.gen_function_statement(ast.elements[k]);
        }
    },
    stitch: function(flowgraph) {
        var k;
        var code = '';
        if (flowgraph.length <= 0) {
            return undefined;
        }
        if (flowgraph.length === 1) {
            return flowgraph[0];
        }
        var first = flowgraph[0];
        for (k = 1; k < flowgraph.length; k++) {
            code += 'builder.combine(' + first + ',' + flowgraph[k] + ');\n';
        }
        this.emit(code);
        return first;
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
            FunctionProc: this.gen_FunctionProc,
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

    gen_SequentialGraph: function(ast) {
        var k, next, first;
        var elements = ast.elements;
        var code = '';

        // ignore top-level flowgraphs in modules
        if (ast.outer_module) {
            return;
        }

        first  = this.gen_proc_element(elements[0]);
        for (k = 1; k < elements.length; k++) {
            next = this.gen_proc_element(elements[k]);
            code += 'builder.append(' + first + ', ' + next + ');\n';
        }
        this.emit(code);
        return first;
    },

    gen_ParallelGraph: function(ast) {
        var k;
        var elements = ast.elements;
        var flowgraph = [];

        // ignore top-level flowgraphs in modules
        if (ast.outer_module) {
            return;
        }
        flowgraph = [ this.gen_proc_element(elements[0]) ];
        for (k = 1; k < elements.length; k++) {
            flowgraph.push(this.gen_proc_element(elements[k]));
        }
        return this.stitch(flowgraph);
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
    gen_ImportStatement: function(ast, functions) {
        // do nothing
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
        this.emit('throw juttle.errors.runtimeError("RT-CUSTOM-ERROR", {\n');
        this.emit('message: juttle.values.ensureString('
            + this.gen_expr(ast.message)
            + ', \'error statement: Invalid message type (<type>).\'),\n');
        this.emit('location: ' + JSON.stringify(ast.location) + '\n');
        this.emit('});');
    },
    gen_SequenceProc: function(ast) {
        var self = this;
        ast.filters = _.map(ast.filters, function(filter) { return self.build_reifier_expr(filter); });
        return this.gen_proc(ast);
    },
    gen_FilterProc: function(ast) {
        ast.filter = this.build_reifier_expr(ast.filter);
        return this.gen_proc(ast);
    },
    gen_SortProc: function(ast) {
        return this.gen_proc(ast);
    },
    gen_View: function(ast) {
        return this.gen_proc(ast);
    },
    gen_CalendarExpression: function(ast) {
        if (ast.direction === 'up') {
            return 'juttle.types.JuttleMoment.endOf('+ this.gen_expr(ast.expression) +', "'+ ast.unit +'")';
        } else {
            return 'juttle.types.JuttleMoment.startOf('+ this.gen_expr(ast.expression) +', "'+ ast.unit +'")';
        }
    },
    gen_ReadProc: function(ast) {
        ast.filter = this.build_reifier_expr(ast.filter);
        return this.gen_proc(ast);
    },
    gen_WriteProc: function(ast) {
        return this.gen_proc(ast);
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

    gen_ReifierProc: function(ast) {
        ast.pname = {type:'Eval', expr:'builder.alloc_pname()' };
        ast.exprs = this.build_reifier_expr(ast.exprs);
        var code = 'var ' + ast.uname + ' = ';

        this.build_options(ast);

        code += this.build_code_ast(ast) + ';';
        code += 'builder.add_node(' + ast.uname + ');\n';
        this.emit(code);
        return ast.uname;
    },
    gen_ReduceProc: function(ast) {
        return this.gen_ReifierProc(ast);
    },
    gen_PutProc: function(ast) {
        return this.gen_ReifierProc(ast);
    },
    gen_FunctionProc: function(ast) {
        return this.gen_sub_call(ast);
    },
    gen_InputStatement: function(ast, opts) {
        var self = this;
        var input_opts = '{ ' + _.map(ast.options, function(option) {
            return option.id + ': ' + self.gen_expr(option.expr);
        }).join(', ') + '}';

        var uname = ast.uname;
        var code = this.gen_var(uname);

        code += uname;
        code += ' = ';
        code += 'builder.define_input(builder.input_bname("' + opts.path_info.mod + '",' +
                                                               JSON.stringify(opts.path_info.sub) + ',"' +
                                                               ast.name + '"), "' +
                                      ast.input_name + '", ' +
                                      input_opts + ', ' +
                                      ast.static + ');\n';

        code += 'builder.set_const("' + uname + '",' + uname + ');\n';
        this.emit( code);
    },
    gen_assignment_lhs: function(ast) {
        switch (ast.type) {
            case 'UnaryExpression':
                return this.gen_UnaryExpression(ast);
            case 'PropertyAccess':
                return this.gen_PropertyAccess(ast, { lhs: true });
            case 'Variable':
                return ast.uname;
            default:
                throw new Error('unrecognized expression lhs ' + ast.type);
        }
    },

    //
    // walk the tree and leave AST nodes that must run in streaming/reducer
    // context and compile nodes that can be eval'd at build time (into AST
    // nodes of type 'Eval').
    //
    build_reifier_expr: function(ast) {
        var self = this;
        if (ast === null || typeof(ast) !== 'object') {
            return ast;
        }
        if (ast.d) {
            return {type:'Eval', expr:this.gen_expr(ast)};
        }
        _.each(ast, function (val, key) {
            if (key === 'symbol') {
                return;
            }
            ast[key] = self.build_reifier_expr(val);
        });
        return ast;
    },
    gen_expr: function(ast) {
        switch (ast.type) {
            case 'AssignmentExpression':
            case 'FunctionCall':
            case 'ReducerCall':
            case 'BinaryExpression':
            case 'CalendarExpression':
            case 'UnaryExpression':
            case 'NullLiteral':
            case 'BooleanLiteral':
            case 'StringLiteral':
            case 'MultipartStringLiteral':
            case 'NumericLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'RegularExpressionLiteral':
            case 'FilterLiteral':
            case 'ArrayLiteral':
            case 'ByList':
            case 'SortByList':
            case 'Variable':
            case 'ToString':
            case 'ObjectLiteral':
            case 'ConditionalExpression':
            case 'PostfixExpression':
            case 'MomentLiteral':
            case 'DurationLiteral':
                return this['gen_' + ast.type](ast);

            case 'PropertyAccess':
                return this.gen_PropertyAccess(ast, {});

            default:
                throw new Error('unrecognized expression type ' + ast.type);
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
        var code, self=this;
        code = 'juttle.ops.call(' + ast.fname.uname;
        code += _.map(ast.arguments, function(arg) {
            return ', ' + self.gen_expr(arg);
        }).join('');
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

    gen_UnaryExpression: function(ast) {
        var expr = this.gen_expr(ast.expression);
        var op = ast.operator;

        switch (op) {
            case '*':
                return 'juttle.ops.pget(pt,' + expr + ')';

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
    gen_ByList: function(ast) {
        var k, elem = ast.elements;
        // ast.elements is an array of the comma separated expressions
        // each element can be an identifier (which may be a variable
        // or may be coerced to a string), an expression that evaluates
        // to an array (which may be a single variable) or to an string.
        // we need to check all this at run time and stitch together the
        // results into a top level array that is the list of strings
        // representing the field names
        // XXX this could special case the common cases and make the ouput
        // much cleaner but it is not in the fast path so no big deal
        // XXX this could also be factored out into a runtime helper function
        var code = '(function() { var t, out = [];\n';
        for (k = 0; k < elem.length; k++) {
            var s = this.gen_expr(elem[k]);
            code += 't = (' + s + ');\n';
            code += 'if (Array.isArray(t)) {\n';
            code += 'out = out.concat(t);\n';
            code += '} else {\n';
            code += 'out.push(t);\n';
            code += '}\n';
        }
        // Check that they're all strings.
        // this should happen in semantic?
        code += '_(out).each(function(el) {'
                    +'if (!_(el).isString()) {'
                        +'throw juttle.errors.compileError("RT-FIELD-NOT-STRING", {'
                            +'field: juttle.values.toString(el),'
                            // The location should be more precise (pointing to
                            // a concrete item in the by-list), but that is too
                            // hard with the current flattening code. Maybe
                            // after PROD-6645 gets resolved.
                            +'location: ' + JSON.stringify(ast.location)
                        +'});'
                    +'}'
                +'});';
        code += 'return out;\n})()\n';
        return code;
    },
    gen_SortByList: function(ast) {
        var k, elem = ast.elements;
        var code = '(function() { var t, out = [];\n';
        for (k = 0; k < elem.length; k++) {
            var s = this.gen_expr(elem[k].expr);
            code += 't = {field: ' + s + ', direction: "' + elem[k].direction + '", location: ' + JSON.stringify(elem[k].expr.location) +'};\n';
            code += 'out.push(t);\n';
        }
        // Check that they're all strings.
        // this should happen in semantic?
        code += '_(out).each(function(el) {'
            +'if (!_(el.field).isString()) {'
            +'throw juttle.errors.compileError("RT-FIELD-NOT-STRING", {'
            +'field: juttle.values.toString(el.field),'
            +'location: el.location'
            +'});'
            +'}'
            +'});';
        code += 'return out;\n})()\n';
        return code;
    },
    gen_Variable: function(ast) {
        switch (ast.symbol.type) {
            case 'const':
                return 'builder.get_const("' + ast.uname + '")';
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

module.exports = Build;
