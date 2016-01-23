'use strict';

// A detector that determines whether an input is static (i.e. it doesn't depend
// on other inputs) or not.
//
// Since staticness of an input can't be determined precisely in compile-time,
// the detector actually looks for a stronger condition: absence of references
// to consts, functions, etc. in input options. This means that it can label
// some inputs as non-static even when a closer examination would reveal they
// are actually static. The algorithm can be made more precise in the future.

var ASTVisitor = require('./ast-visitor');

var StaticInputDetector = ASTVisitor.extend({
    isStatic: function(node) {
        this.result = true;
        this.visit(node);
        return this.result;
    },

    visitVariable: function() {
        this.result = false;
    }
});

module.exports = StaticInputDetector;
