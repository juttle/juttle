'use strict';

// Compiler that transforms filter expression AST into a code of a
// JavaScript function that implements a partially evaluatable filter.
//
// A DemoFilter evaluates the full filter expression (from a filter
// AST) against a partial point (one with only a subset of fields
// defined) and returns false if an eventual full point cannot
// possibly pass the filter because the values in the partial point
// guarantee failure. It does this by letting the filter propagate
// unresolved field references up to nodes where boolean operations
// are performed, then decides whether a final boolean value has been
// resolved (eg, false && something_unresolved === false, whereas true
// && something_unresolved === unresolved).  Instead of introducing a
// new unresolved type and teaching everyone to operate with it, the
// visitor will throw a special exception when an undefined field is
// referenced, and catch it further up in boolean and/or/not nodes for
// resolution (see visitPartialBoolean).
//
// The function code is returned as the return value of the "compile" function.
// The compiler doesn't modify the AST.

var FilterJSCompiler = require('./filter-js-compiler');

var BINARY_OPS_TO_FUNCTIONS = {
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
    'OR':  'lor'
};

class PartialFilterJSCompiler extends FilterJSCompiler {
    compile(node, fields) {
        // construct a function that returns true if node is true or is unresolved
        this.fields = fields;
        return '(function(pt) { return ('
            + this.visitPartialBoolean(node, '\'Invalid operator type (<type>).\'')
            + ') !== false; })';
    }

    visitPartialBoolean(node, message) {
        // generate a visit that ensures boolean and propagates unresolved
        // values as undefined, for safe handling by the caller.
        return 'function() { try {'
            + '    return juttle.values.ensureBoolean(' + this.visit(node) + ',' + message +');'
            + '} catch (exc) {'
            + 'if (exc.partial) {'
            + '    return undefined ;'
            + '} else {'
            + '    throw exc ;'
            + '}}}()';
    }

    visitField(node) {
        var index = JSON.stringify(node.name);
        return '(' + JSON.stringify(this.fields) + '.indexOf(' + index + ') >= 0 '
            + '? juttle.ops.pget(pt, ' + index + ') '
            + ': juttle.partialOps.throw_unresolved())';
    }

    visitUnaryExpression(node) {
        switch (node.operator) {
            case 'NOT':
                var message = '\'"NOT" operator: Invalid operator type (<type>).\'';
                return 'juttle.partialOps.lnot('
                    + this.visitPartialBoolean(node.argument, message)
                    + ')';

            case '*':
                var index = this.visit(node.argument);
                return '(' + JSON.stringify(this.fields) + '.indexOf(' + index + ') >= 0 '
                    + '? juttle.ops.pget(pt, ' + index + ') '
                    + ': juttle.partialOps.throw_unresolved())';

            default:
                throw new Error('Invalid operator: ' + node.operator + '.');
        }
    }

    visitBinaryExpression(node) {
        if (node.operator === '&&' || node.operator === '||') {
            var message = '\'"' + node.operator + '" operator: Invalid operator type (<type>).\'';
            return 'juttle.partialOps.' + BINARY_OPS_TO_FUNCTIONS[node.operator] + '('
                + this.visitPartialBoolean(node.left, message) + ', '
                + this.visitPartialBoolean(node.right, message)
                + ')';
        } else {
            return 'juttle.ops.' + BINARY_OPS_TO_FUNCTIONS[node.operator] + '('
                + this.visit(node.left) + ', '
                + this.visit(node.right)
                + ')';
        }
    }
}

module.exports = PartialFilterJSCompiler;
