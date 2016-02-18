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
class Build extends CodeGenerator {
    constructor() {
        super();
        // XXX/sm we can easily get rid of emit and just recursively return
        // the code strings, except we rely on returning the uname for the
        // proc when building the graph contruction code
        this.code = '';
    }
    gen(ast) {
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
    }
    emit(s) {
        this.code += s;
    }
    gen_var(uname) {
        return 'var ' + uname + ';\n';
    }
    gen_var_decl(decl) {
        var code = this.gen_var(decl.uname);
        code += decl.uname;
        code += ' = ';
        code += decl.expr ? this.gen_expr(decl.expr) : 'null';
        code += ';\n';
        return code;
    }
    gen_const_decl(decl) {
        var uname = decl.uname;
        var code = this.gen_var(uname);
        code += uname;
        code += ' = ';
        code += this.gen_expr(decl.expr);
        code += ';\n';
        code += 'builder.set_const("' + uname + '",' + uname + ');\n';
        return code;
    }
    //
    // this is like JSON.stringify except we walk the object and for
    // code nodes we output the code directly instead of a string rep
    // of the code
    // XXX generalize this (google a deepcopy routine)
    //
    build_code_ast(node) {
        var s;
        var self = this;
        if (node === null || typeof(node) !== 'object') {
            return JSON.stringify(node);
        }
        if (node.type === 'Eval') {
            return 'builder.value_ast(' + node.expr + ')';
        }

        if (node.type === 'function_uname') {
            return 'builder.uname("' + node.uname + '")';
        }

        if (Array.isArray(node)) {
            s = '[\n' +
                _.map(node, function(el) { return self.build_code_ast(el); }).join(' ,') +
                ']\n';
        } else {
            s = '{\n' +
                _.map(node, function(val, key) {
                    return key + ': ' + self.build_code_ast(val);
                }).join(' ,') +
                '}';
        }
        return s;
    }
    gen_BuiltinProc(node) {
        return this.gen_proc(node);
    }
    gen_proc(node) {
        var code;
        node.pname = {type:'Eval', expr:'builder.alloc_pname()' };
        code = 'var ' + node.uname + ' = ';
        this.build_options(node);
        code += this.build_code_ast(node) + ';';
        code += 'builder.add_node(' + node.uname + ');\n';
        this.emit(code);
        return node.uname;
    }
    gen_sub_call(node) {
        var code = '';
        var self = this;
        var subname = node.op.type === 'Variable' ? node.op.name : node.op.object.name + '.' + node.op.property.value;
        code += 'var ' + node.uname + ' = ' + node.uname_sub + '.apply(';
        code += 'null, ';
        code += 'builder.build_sub_args(';
        code += JSON.stringify(node.sub_sig) + ', [';
        code += _.map(node.options, function(option) {
            return '{ id: "' + option.id + '", ' + 'value: ' + self.gen_expr(option.expr) + ', location:' + JSON.stringify(option.location) + '}';
        }).join(', ');
        code += '], ';
        code += '"' + subname + '",\n';
        code += JSON.stringify(node.location) + '));\n';
        this.emit(code);
        return node.uname;
    }
    build_options(node) {
        var that = this;
        node.options = _.map(node.options, function(option) {
            // when we finally set 'd' bit everywhere properly, we should be
            // able to uncomment this line without it throwing
            // if (!val.d) throw new Error ("All proc options should have 'd'!");

            return {
                id: option.id,
                val: {type:'Eval', expr:that.gen_expr(option.expr)},
                location: option.location
            };
        } );
    }

    // statements that can appear inside subs or at the top level
    gen_statement(node, opts) {
        switch (node.type) {
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
                return this['gen_' + node.type](node, opts);
            default:
                throw new Error('unrecognized statement type ' + node.type);
        }
    }
    gen_ModuleDef(node) {
        //
        // just spit out the module elements in the main scope since
        // the semantic pass flattened out all the module contents
        // with unames
        //
        var self = this;
        _.each(node.elements, function(stmt) {
            self.gen_statement(stmt, {path_info: {mod: node.name, sub: []}});
        } );
    }
    gen_SubDef(node, opts) {
        opts = opts || {};
        opts.path_info = opts.path_info || {};
        var flowgraph, returnVal;
        var args = _.pluck(node.args, 'uname');
        this.emit('var ' + node.uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(node.args, true);

        var self = this;

        // This could also be a top-level program (type 'MainModuleDef') in
        // which case we don't want to record a sub name
        if (node.type === 'SubDef') {
            opts.path_info.sub.push(node.name);
        }
        flowgraph = _.chain(node.elements)
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
    }

    // statements that can appear inside functions or reducers
    gen_function_statement(node) {
        switch (node.type) {
            case 'StatementBlock':
            case 'FunctionDef':
            case 'ConstStatement':
            case 'VarStatement':
            case 'EmptyStatement':
            case 'AssignmentStatement':
            case 'IfStatement':
            case 'ReturnStatement':
            case 'ErrorStatement':
                return this['gen_' + node.type](node);

            default:
                throw new Error('unrecognized function statement type ' + node.type);
        }
    }
    gen_fill_args(args, define_consts) {
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
    }
    define_consts(elems) {
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
    }
    gen_FunctionDef(node) {
        var k, elems = node.elements;
        var args = _.pluck(node.args, 'uname');
        this.emit('var ' + node.uname + '= function(' + args.join(', ') + ') {\n');
        this.gen_fill_args(node.args, false);
        for (k = 0; k < elems.length; ++k) {
            this.gen_function_statement(elems[k]);
        }
        this.emit('return null;\n');
        this.emit('};\n');
        this.emit(node.uname + '.location = ' + JSON.stringify(node.location) + ';\n');

        node = this.build_reify(node);

        // Define const statements outside of the function's scope so that
        // they are avaialble in the add_function call below.
        this.define_consts(elems);

        //XXX should only do add_functions for functions that are referenced
        //from stream context, otherwise, they should just go away after
        // this pass because they aren't needed at runtime
        this.emit('builder.add_function(' + this.build_code_ast(node) + ');\n');
    }
    build_reify(node) {
        var self = this;
        if (node === null || typeof(node) !== 'object') {
            return node;
        }
        if (node.type === 'Variable' && node.symbol.type === 'const' && node.d) {
            return this.build_reifier_expr(node);
        }
        _.each(node, function(val, name) {
            node[name] = self.build_reify(val);
        });
        return node;
    }
    gen_ReducerDef(node) {
        node = this.build_reify(node);

        // Define const statements outside of the reducer's scope so that they
        // are avaialble in the add_reducer call below.
        this.define_consts(node.elements);

        this.emit('builder.add_reducer(' + this.build_code_ast(node) + ');\n');
    }
    gen_StatementBlock(node) {
        for (var k = 0; k < node.elements.length; ++k) {
            this.gen_function_statement(node.elements[k]);
        }
    }
    stitch(flowgraph) {
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
            FunctionProc: this.gen_FunctionProc,
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

    gen_SequentialGraph(node) {
        var k, next, first;
        var elements = node.elements;
        var code = '';

        // ignore top-level flowgraphs in modules
        if (node.outer_module) {
            return;
        }

        first  = this.gen_proc_element(elements[0]);
        for (k = 1; k < elements.length; k++) {
            next = this.gen_proc_element(elements[k]);
            code += 'builder.append(' + first + ', ' + next + ');\n';
        }
        this.emit(code);
        return first;
    }

    gen_ParallelGraph(node) {
        var k;
        var elements = node.elements;
        var flowgraph = [];

        // ignore top-level flowgraphs in modules
        if (node.outer_module) {
            return;
        }
        flowgraph = [ this.gen_proc_element(elements[0]) ];
        for (k = 1; k < elements.length; k++) {
            flowgraph.push(this.gen_proc_element(elements[k]));
        }
        return this.stitch(flowgraph);
    }
    gen_EmptyStatement(node) {
    }
    // this type of assignment lives only in places where there are
    // no points or reducers
    gen_AssignmentStatement(node) {
        var code = this.gen_assignment_lhs(node.left);
        //XXX need to handle op's other than "="
        code +=  ' = ' + this.gen_expr(node.expr) + ';\n';
        this.emit(code);
    }
    // this type of assignment lives in places where there can be
    // points or reducers
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
    gen_ImportStatement(node, functions) {
        // do nothing
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
        this.emit('throw juttle.errors.runtimeError("CUSTOM-ERROR", {\n');
        this.emit('message: juttle.values.ensureString('
            + this.gen_expr(node.message)
            + ', \'error statement: Invalid message type (<type>).\'),\n');
        this.emit('location: ' + JSON.stringify(node.location) + '\n');
        this.emit('});');
    }
    gen_SequenceProc(node) {
        var self = this;
        node.filters = _.map(node.filters, function(filter) { return self.build_reifier_expr(filter); });
        return this.gen_proc(node);
    }
    gen_FilterProc(node) {
        node.filter = this.build_reifier_expr(node.filter);
        return this.gen_proc(node);
    }
    gen_SortProc(node) {
        return this.gen_proc(node);
    }
    gen_View(node) {
        return this.gen_proc(node);
    }
    gen_CalendarExpression(node) {
        if (node.direction === 'up') {
            return 'juttle.types.JuttleMoment.endOf('+ this.gen_expr(node.expression) +', "'+ node.unit +'")';
        } else {
            return 'juttle.types.JuttleMoment.startOf('+ this.gen_expr(node.expression) +', "'+ node.unit +'")';
        }
    }
    gen_ReadProc(node) {
        node.filter = this.build_reifier_expr(node.filter);
        return this.gen_proc(node);
    }
    gen_WriteProc(node) {
        return this.gen_proc(node);
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

    gen_ReifierProc(node) {
        node.pname = {type:'Eval', expr:'builder.alloc_pname()' };
        node.exprs = this.build_reifier_expr(node.exprs);
        var code = 'var ' + node.uname + ' = ';

        this.build_options(node);

        code += this.build_code_ast(node) + ';';
        code += 'builder.add_node(' + node.uname + ');\n';
        this.emit(code);
        return node.uname;
    }
    gen_ReduceProc(node) {
        return this.gen_ReifierProc(node);
    }
    gen_PutProc(node) {
        return this.gen_ReifierProc(node);
    }
    gen_FunctionProc(node) {
        return this.gen_sub_call(node);
    }
    gen_InputStatement(node, opts) {
        var self = this;
        var input_opts = '{ ' + _.map(node.options, function(option) {
            return option.id + ': ' + self.gen_expr(option.expr);
        }).join(', ') + '}';

        var uname = node.uname;
        var code = this.gen_var(uname);

        code += uname;
        code += ' = ';
        code += 'builder.define_input(builder.input_bname("' + opts.path_info.mod + '",' +
                                                               JSON.stringify(opts.path_info.sub) + ',"' +
                                                               node.name + '"), "' +
                                      node.input_name + '", ' +
                                      input_opts + ', ' +
                                      node.static + ');\n';

        code += 'builder.set_const("' + uname + '",' + uname + ');\n';
        this.emit( code);
    }
    gen_assignment_lhs(node) {
        switch (node.type) {
            case 'UnaryExpression':
                return this.gen_UnaryExpression(node);
            case 'MemberExpression':
                return this.gen_MemberExpression(node, { lhs: true });
            case 'Variable':
                return node.uname;
            case 'Field':
                return this.gen_Field(node);
            default:
                throw new Error('unrecognized expression lhs ' + node.type);
        }
    }

    //
    // walk the tree and leave AST nodes that must run in streaming/reducer
    // context and compile nodes that can be eval'd at build time (into AST
    // nodes of type 'Eval').
    //
    build_reifier_expr(node) {
        var self = this;
        if (node === null || typeof(node) !== 'object') {
            return node;
        }
        if (node.d) {
            return {type:'Eval', expr:this.gen_expr(node)};
        }
        _.each(node, function (val, key) {
            if (key === 'symbol') {
                return;
            }
            node[key] = self.build_reifier_expr(val);
        });
        return node;
    }
    gen_expr(node) {
        switch (node.type) {
            case 'AssignmentExpression':
            case 'CallExpression':
            case 'BinaryExpression':
            case 'CalendarExpression':
            case 'UnaryExpression':
            case 'NullLiteral':
            case 'BooleanLiteral':
            case 'StringLiteral':
            case 'MultipartStringLiteral':
            case 'NumberLiteral':
            case 'InfinityLiteral':
            case 'NaNLiteral':
            case 'RegExpLiteral':
            case 'FilterLiteral':
            case 'ArrayLiteral':
            case 'ByList':
            case 'SortByList':
            case 'Variable':
            case 'Field':
            case 'ToString':
            case 'ObjectLiteral':
            case 'ConditionalExpression':
            case 'PostfixExpression':
            case 'MomentLiteral':
            case 'DurationLiteral':
                return this['gen_' + node.type](node);

            case 'MemberExpression':
                return this.gen_MemberExpression(node, {});

            default:
                throw new Error('unrecognized expression type ' + node.type);
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
                var code, self=this;
                code = 'juttle.ops.call(' + node.fname.uname;
                code += _.map(node.arguments, function(arg) {
                    return ', ' + self.gen_expr(arg);
                }).join('');
                code += ')';
                return code;

            case 'reducer':
                var result = 'fns[' + node.reducer_call_index + '].result()';
                if (node.context === 'stream') {
                    // put must consume the current point before calling result
                    result = '(fns[' + node.reducer_call_index + '].update(pt),' + result + ')';
                }
                return result;

            default:
                throw new Error('Invalid symbol type: ' + node.callee.symbol.type + '.');
        }
    }

    gen_UnaryExpression(node) {
        var expr = this.gen_expr(node.argument);
        var op = node.operator;

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
    gen_ByList(node) {
        var k, elem = node.elements;
        // node.elements is an array of the comma separated expressions
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
        code += 'out.forEach(function(el) {'
                    +'if (!juttle.values.isString(el)) {'
                        +'throw juttle.errors.compileError("FIELD-NOT-STRING", {'
                            +'field: juttle.values.toString(el),'
                            // The location should be more precise (pointing to
                            // a concrete item in the by-list), but that is too
                            // hard with the current flattening code. Maybe
                            // after PROD-6645 gets resolved.
                            +'location: ' + JSON.stringify(node.location)
                        +'});'
                    +'}'
                +'});';
        code += 'return out;\n})()\n';
        return code;
    }
    gen_SortByList(node) {
        var k, elem = node.elements;
        var code = '(function() { var t, out = [];\n';
        for (k = 0; k < elem.length; k++) {
            var s = this.gen_expr(elem[k].expr);
            code += 't = {field: ' + s + ', direction: "' + elem[k].direction + '", location: ' + JSON.stringify(elem[k].expr.location) +'};\n';
            code += 'out.push(t);\n';
        }
        // Check that they're all strings.
        // this should happen in semantic?
        code += 'out.forEach(function(el) {'
            +'if (!juttle.values.isString(el.field)) {'
            +'throw juttle.errors.compileError("FIELD-NOT-STRING", {'
            +'field: juttle.values.toString(el.field),'
            +'location: el.location'
            +'});'
            +'}'
            +'});';
        code += 'return out;\n})()\n';
        return code;
    }
    gen_Variable(node) {
        switch (node.symbol.type) {
            case 'const':
                return 'builder.get_const("' + node.uname + '")';
            case 'import':
            case 'function':
            case 'reducer':
            case 'sub':
                throw errors.compileError('CANNOT-USE-AS-VARIABLE', {
                    thing: SYMBOL_TYPE_NAMES[node.symbol.type],
                    location: node.location
                });
            default:
                return node.uname;
        }
    }
    gen_Field(node) {
        return 'juttle.ops.pget(pt,' + JSON.stringify(node.name) + ')';
    }
    gen_MemberExpression(node, opts) {
        if (!node.computed) {
            return node.uname;
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

module.exports = Build;
