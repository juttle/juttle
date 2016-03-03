'use strict';

// Utilities for manipulating Juttle values.

var _ = require('underscore');
var ASTVisitor = require('../compiler/ast-visitor');
var Filter = require('./types/filter');
var JuttleMoment = require('../runtime/types/juttle-moment');
var errors = require('../errors');

function typeErrorIncomparable(left, right) {
    var leftStr = values.isNull(left) ? '' : ' (' + values.toString(left) + ')';
    var rightStr = values.isNull(right) ? '' : ' (' + values.toString(right) + ')';

    var message = 'Types '
        + values.typeDisplayName(values.typeOf(left)) + leftStr
        + ' and '
        + values.typeDisplayName(values.typeOf(right)) + rightStr
        + ' cannot be compared.';

    return errors.runtimeError('TYPE-ERROR', { message: message });
}

var TYPE_DISPLAY_NAMES = {
    Null:     'null',
    Boolean:  'boolean',
    Number:   'number',
    String:   'string',
    RegExp:   'regular expression',
    Date:     'date',
    Duration: 'duration',
    Filter:   'filter expression',
    Array:    'array',
    Object:   'object'
};

class ValueBuilder extends ASTVisitor {
    buildValue(ast) {
        return this.visit(ast);
    }

    visitNullLiteral() {
        return null;
    }

    visitBooleanLiteral(node) {
        return node.value;
    }

    visitNumberLiteral(node) {
        return node.value;
    }

    visitInfinityLiteral(node) {
        return node.negative ? -Infinity : Infinity;
    }

    visitNaNLiteral(node) {
        return NaN;
    }

    visitStringLiteral(node) {
        return node.value;
    }

    visitRegExpLiteral(node) {
        return new RegExp(node.pattern, node.flags);
    }

    visitMomentLiteral(node) {
        return new JuttleMoment(node.value);
    }

    visitDurationLiteral(node) {
        return JuttleMoment.duration(node.value);
    }

    visitFilterLiteral(node) {
        return new Filter(node.ast, node.source);
    }

    visitArrayLiteral(node) {
        return _.map(node.elements, this.visit, this);
    }

    visitObjectLiteral(node) {
        return _.object((_.map(node.properties, this.visit, this)));
    }

    visitObjectProperty(node) {
        return [this.visit(node.key), this.visit(node.value)];
    }
}

var values = {

    // Returns a Juttle type represented by a JavaScript value. Throws an
    // exception if the JavaScript value doesn't represent any Juttle type.
    typeOf: function(value) {
        switch (typeof value) {
            case 'boolean':
                return 'Boolean';

            case 'number':
                return 'Number';

            case 'string':
                return 'String';

            case 'object':
                if (value === null) {
                    return 'Null';
                } else {
                    switch (Object.prototype.toString.call(value)) {
                        case '[object RegExp]':
                            return 'RegExp';

                        case '[object Array]':
                            return 'Array';

                        case '[object Object]':
                            switch (value.constructor) {
                                case JuttleMoment:
                                    if (value.moment) {
                                        return 'Date';
                                    }
                                    if (value.duration) {
                                        return 'Duration';
                                    }
                                    break;   // silence ESLint

                                case Filter:
                                    return 'Filter';

                                case Object:
                                    return 'Object';
                            }
                    }
                }
        }

        throw new Error('Invalid Juttle value: ' + value + '.');
    },

    // Returns a display name for a Juttle type name (for use in error messages,
    // etc.).
    typeDisplayName: function(name) {
        return TYPE_DISPLAY_NAMES[name];
    },

    // Shortcut functions for testing Juttle value types.
    //
    // Note these could have been implemented in terms of "typeOf", but they are
    // not in otder to make them as fast as possible (they'll be used often).

    isNull: function(value) {
        return value === null;
    },

    isBoolean: function(value) {
        return typeof value === 'boolean';
    },

    isNumber: function(value) {
        return typeof value === 'number';
    },

    isString: function(value) {
        return typeof value === 'string';
    },

    isRegExp: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object RegExp]';
    },

    isDate: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object Object]'
            && value.constructor === JuttleMoment
            && !!value.moment;
    },

    isDuration: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object Object]'
            && value.constructor === JuttleMoment
            && !!value.duration;
    },

    isFilter: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object Object]'
            && value.constructor === Filter;
    },

    isArray: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object Array]';
    },

    isObject: function(value) {
        return typeof value === 'object'
            && value !== null
            && Object.prototype.toString.call(value) === '[object Object]'
            && value.constructor === Object;
    },

    ensureBoolean: function(value, message) {
        if (!this.isBoolean(value)) {
            message = message.replace(/<type>/g, this.typeDisplayName(this.typeOf(value)));
            throw errors.runtimeError('TYPE-ERROR', { message: message });
        }

        return value;
    },

    ensureNumber: function(value, message) {
        if (!this.isNumber(value)) {
            message = message.replace(/<type>/g, this.typeDisplayName(this.typeOf(value)));
            throw errors.runtimeError('TYPE-ERROR', { message: message });
        }

        return value;
    },

    ensureString: function(value, message) {
        if (!this.isString(value)) {
            message = message.replace(/<type>/g, this.typeDisplayName(this.typeOf(value)));
            throw errors.runtimeError('TYPE-ERROR', { message: message });
        }

        return value;
    },

    buildObject: function(entries) {
        return _.object(entries);
    },

    // Compares two Juttle values. For values a and b,
    // returns -1 if a < b, 0 if a = b, 1 if a > b
    compare: function(a, b) {
        var self = this;

        function compareArrays(a, b) {
            if (a.length !== b.length) {
                return a.length < b.length ? -1 : 1;
            } else {
                for (var i = 0; i < a.length ; i++) {
                    var compareResult = self.compare(a[i], b[i]);
                    if (compareResult !== 0) {
                        return compareResult;
                    }
                }
                return 0;
            }
        }

        var typeA = this.typeOf(a);
        var typeB = this.typeOf(b);

        if (typeA !== typeB) {
            throw typeErrorIncomparable(a, b);
        }

        switch (typeA) {
            case 'Number':
            case 'String':
                return a === b ? 0 : (a > b ? 1 : -1);

            case 'Date':
            case 'Duration':
                return JuttleMoment.compare(a, b);

            case 'Array':
                return compareArrays(a, b);

            default:
                throw typeErrorIncomparable(a, b);
        }

    },

    // Determines whether two Juttle values are equal.
    equal: function(a, b) {
        var self = this;

        function equalArrays(a, b) {
            if (a.length !== b.length) {
                return false;
            }

            var length = a.length;
            var i;
            for (i = 0; i < length; i++) {
                if (!self.equal(a[i], b[i])) {
                    return false;
                }
            }

            return true;
        }

        function equalObjects(a, b) {
            var keysA = Object.keys(a);
            var keysB = Object.keys(b);

            keysA.sort();
            keysB.sort();

            if (keysA.length !== keysB.length) {
                return false;
            }

            var length = keysA.length;
            var i;
            var key;
            for (i = 0; i < length; i++) {
                if (keysA[i] !== keysB[i]) {
                    return false;
                }

                key = keysA[i];
                if (!self.equal(a[key], b[key])) {
                    return false;
                }
            }

            return true;
        }

        var typeA = this.typeOf(a);
        var typeB = this.typeOf(b);

        if (typeA !== typeB) {
            return false;
        }

        switch (typeA) {
            case 'Null':
            case 'Boolean':
            case 'Number':
            case 'String':
            case 'Filter':
                return a === b;

            case 'RegExp':
                return a.source === b.source
                    && a.global === b.global
                    && a.multiline === b.multiline
                    && a.ignoreCase === b.ignoreCase;

            case 'Date':
            case 'Duration':
                return JuttleMoment.eq(a, b);

            case 'Array':
                return equalArrays(a, b);

            case 'Object':
                return equalObjects(a, b);
        }
    },

    // Returns a value that can be serialized to JSON.
    toJSONCompatible: function(value) {
        switch (values.typeOf(value)) {
            case 'Null':
            case 'Boolean':
            case 'String':
            case 'Number':
                return value;

            case 'RegExp':
                return String(value);

            case 'Date':
            case 'Duration':
                return value.valueOf();

            case 'Filter':
                return value.source;

            case 'Array':
                return _.map(value, this.toJSONCompatible, this);

            case 'Object':
                return _.mapObject(value, this.toJSONCompatible, this);
        }
    },

    // Returns string representation of a Juttle value. This representation is
    // intended to be used in places where readability has precedence over
    // exactness (e.g. gadgets, charts).
    //
    // See also values.inspect.
    toString: function(value) {
        switch (values.typeOf(value)) {
            case 'Null':
                return 'null';

            case 'Boolean':
            case 'Number':
            case 'RegExp':
                return String(value);

            case 'String':
                return value;

            case 'Date':
            case 'Duration':
                return value.valueOf();

            case 'Filter':
                return value.source;

            case 'Array':
            case 'Object':
                return values.inspect(value);
        }
    },

    // Returns string representation of a Juttle value. This representation is
    // intended to be used in places where exactness has precedence over
    // readability (e.g. error messages, logs, dumps).
    //
    // The function guarantees that the representation of each Juttle value is
    // unique (typically the same as in Juttle source code). This means it can
    // be used e.g. as a key in objects that map values to some associated data.
    //
    // See also values.toString.
    inspect: function(value) {
        switch (values.typeOf(value)) {
            case 'Null':
            case 'Boolean':
            case 'Number':
            case 'RegExp':
                return String(value);

            case 'String':
                return JSON.stringify(value);

            case 'Date':
            case 'Duration':
                return ':' + value.valueOf() + ':';

            case 'Filter':
                // Filters don't have source-level representation yet, so we
                // can't use it and we need to use a pseudo-syntax here. If
                // filters ever become representable in source, this code should
                // be changed to match that representation.
                return 'filter(' + value.source + ')';

            case 'Array':
                if (_.isEmpty(value)) { return '[]'; }

                return '[ '
                    + _.map(value, values.inspect).join(', ')
                    + ' ]';

            case 'Object':
                if (_.isEmpty(value)) { return '{}'; }

                return '{ '
                    + _.map(value, function(v, k) { return k + ': ' + values.inspect(v); }).join(', ')
                    + ' }';
        }
    },

    // Returns a value corresponding to an AST.
    fromAST: function(ast) {
        var builder = new ValueBuilder();

        return builder.buildValue(ast);
    },

    // Returns an AST corresponding to a Juttle value.
    toAST: function(value) {
        switch (values.typeOf(value)) {
            case 'Null':
                return { type: 'NullLiteral' };

            case 'Boolean':
                return { type: 'BooleanLiteral', value: value };

            case 'Number':
                if (value !== value) {
                    return { type: 'NaNLiteral' };
                } else if (value === Infinity) {
                    return { type: 'InfinityLiteral', negative: false };
                } else if (value === -Infinity) {
                    return { type: 'InfinityLiteral', negative: true };
                } else {
                    return { type: 'NumberLiteral', value: value };
                }
                break;   // silence ESLint

            case 'String':
                return { type: 'StringLiteral', value: value };

            case 'RegExp':
                return {
                    type: 'RegExpLiteral',
                    pattern: value.source,
                    flags: value.toString().match(/\/(\w*)$/)[1]
                };

            case 'Date':
                return { type: 'MomentLiteral', value: value.valueOf() };

            case 'Duration':
                return { type: 'DurationLiteral', value: value.valueOf() };

            case 'Filter':
                return { type: 'FilterLiteral', ast: value.ast, source: value.source };

            case 'Array':
                return { type: 'ArrayLiteral', elements: _.map(value, values.toAST) };

            case 'Object':
                return {
                    type: 'ObjectLiteral',
                    properties: _.map(value, function(value, key) {
                        return {
                            type: 'ObjectProperty',
                            key: values.toAST(key),
                            value: values.toAST(value)
                        };
                    })
                };
        }
    }
};

module.exports = values;
