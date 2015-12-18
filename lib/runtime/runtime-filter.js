var FilterJSCompiler = require('../compiler/filters/').FilterJSCompiler;

// these are referenced from eval()'ed filters
var juttle = require('../runtime').runtime; // jshint ignore:line
var JuttleMoment = require('../moment').JuttleMoment; // jshint ignore:line

// Create a javascript callable from a given filter structure.
// The `ast` argument is actually the filter object from the juttle
// flowgraph, not the raw parsed object.
// The returned filter takes care of the small but annoying details
// of referencing the juttle runtime, catching type errors, etc.
function make_filter(ast) {
    var compiler = new FilterJSCompiler();

    if (ast) {
        var code = compiler.compile(ast);

        /* jshint evil:true */
        var fn = eval(code);

        return function(pt) {
            try {
                return fn(pt);
            }
            catch (e) {
                return false;
            }
        };
    }
    else {
        // no filter means read everything
        // e.g., `read -from :1 hour ago: | ...`
        return function(pt) { return true; };
    }
}

module.exports = make_filter;
