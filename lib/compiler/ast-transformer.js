'use strict';

let ASTVisitor = require('./ast-visitor');
let _ = require('underscore');

// Base class for implementing AST transformers.
//
// AST transformer is a special kind of AST visitor, where each visit* method
// returns a node which then replaces the node the method was called on in the
// AST.
//
// To implement a transformer, create a class derived from ASTTransformer and
// override visit* methods for node types you are interested in. The default
// implementation of visit* methods visits child nodes (passing around
// arguments) and returns a clone of the node the method was called on with
// child nodes replaced by their transformed versions.
class ASTTransformer extends ASTVisitor {
    transform(ast) {
        return this.visit(ast);
    }
}

_.each(ASTVisitor.NODE_CHILDREN, (props, type) => {
    // A function expression needs to be used here instead of an arrow function,
    // otherwise "this" will have a wrong value inside the defined method.
    ASTTransformer.prototype['visit' + type] = function(node) {
        let extraArgs = Array.prototype.slice.call(arguments, 1);

        return _.mapObject(node, (value, prop) => {
            let transform = _.indexOf(props, prop) !== -1;
            if (!transform) {
                return value;
            }

            if (_.isArray(value)) {
                return _.map(value, (element) =>
                    element !== null ? this.visit.apply(this, [element].concat(extraArgs)) : null
                );
            } else {
                return value !== null ? this.visit.apply(this, [value].concat(extraArgs)) : null;
            }
        });
    };
});

module.exports = ASTTransformer;
