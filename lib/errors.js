// Juttle exception classes and related helper functions.

var Base = require('extendable-base');
var _ = require('underscore');
var messages = require('./strings/juttle-error-strings-en-US').error;

// ----- Exception Definitions -----

var errors = {};

// Base class of all Juttle exceptions. Idally, all exceptions thrown by the
// Juttle compiler and runtime would be subclasses of this class, and all other
// exceptions would indicate bugs. But we aren't there yet.
//
// Don't throw this exception directly, use its subclasses and related helpers
// instead.
errors.JuttleError = Base.inherits(Error, {
    name: 'JuttleError',

    initialize: function(message, code, info) {
        this.message = message;
        this.code = code;
        this.info = info;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
});

// Exception thrown when Juttle program parsing fails.
//
// Don't throw this exception directly, use the syntaxError helper instead.
errors.SyntaxError = errors.JuttleError.extend({
    name: 'SyntaxError',
});

// Exception thrown when Juttle program compilation fails. Compilation includes
// everything that happens before points start flowing through the graph (e.g.
// proc initialization).
//
// Don't throw this exception directly, use the compileError helper instead.
errors.CompileError = errors.JuttleError.extend({
    name: 'CompileError',
});

// Exception thrown when Juttle program fails at runtime. Runtime is the time
// when points flow through the graph.
//
// Don't throw this exception directly, use the runtimeError helper instead.
errors.RuntimeError = errors.JuttleError.extend({
    name: 'RuntimeError',
});

// ----- Helpers -----

function messageForCode(code, info) {
    var template = _.template(messages[code], {
        interpolate: /\{\{([^}]*)\}\}/g,
        variable: 'info'
    });

    return template(info);
}

errors.syntaxError = function(code, info) {
    return new errors.SyntaxError(messageForCode(code, info), code, info || {});
};

errors.compileError = function(code, info) {
    return new errors.CompileError(messageForCode(code, info), code, info || {});
};

errors.runtimeError = function(code, info) {
    return new errors.RuntimeError(messageForCode(code, info), code, info || {});
};

// Adds specified location to any Juttle exception thrown when executing
// specified function. If the function does not throw any exception, returns its
// result.
errors.locate = function(fn, location) {
    try {
        return fn();
    } catch (e) {
        if (e instanceof errors.JuttleError && !e.info.location) {
            e.info.location = location;
        }

        throw e;
    }
};

module.exports = errors;
