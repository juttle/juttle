'use strict';

var _ = require('underscore');
var builtin_reducers = require('../runtime/reducers').reducers;
var errors = require('../errors');

var uid = 0;

function reset() {
    uid = 0;
}

class Scope {
    constructor(next, type) {
        this.next = next;
        this.type = type;

        this.symbols = {};
    }
    get(name) {
        if (this.symbols.hasOwnProperty(name)) {
            return this.symbols[name];
        }

        return this.next ? this.next.get(name) : null;
    }
    put(name, info) {
        this.symbols[name] = info;
    }
    lookup(name) {
        var symbol;

        if (this.symbols.hasOwnProperty(name)) {
            symbol = this.symbols[name];

            switch (symbol.type) {
                case 'const':
                case 'var':
                    return symbol.uname;
            }
        }

        return undefined;
    }
    lookup_variable(name) {
        var result = this.lookup(name);
        if (result) {
            return result;
        } else if (this.next) {
            return this.next.lookup_variable(name);
        } else {
            return undefined;
        }
    }
    exports() {
        var result = {};

        _.each(this.symbols, function(value, key) {
            if (value.exported) {
                result[key] = value;
            }
        });

        return result;
    }
    alloc_var(sourcename) {
        var varName, suffix = uid++;
        if (sourcename) {
            varName = sourcename + '_' + suffix;
        } else {
            varName = 'v' + suffix;
        }
        return varName;
    }
    check_not_redefined(name, type, location) {
        if (this.symbols.hasOwnProperty(name)) {
            throw errors.compileError('REDEFINED', {
                type: type,
                name: name,
                location: location
            });
        }
    }
    define_import(name, exports, location) {
        this.check_not_redefined(name, 'import', location);
        var symbol = { type: 'import', exported: false, exports: exports };
        this.put(name, symbol);
        return symbol;
    }
    define_var(name, exported) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'var', exported: exported, uname: runtimeVar };
        this.put(name, symbol);
        return symbol;
    }
    define_const(name, exported, d) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'const', exported: exported, uname: runtimeVar, d: d };
        this.put(name, symbol);
        return symbol;
    }
    define_sub(name, args, exported) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'sub', exported: exported, uname: runtimeVar, args: args };
        this.put(name, symbol);
        return symbol;
    }
    define_native_proc(name, args, exported) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'native_proc', exported: exported, uname: runtimeVar, args: args };
        this.put(name, symbol);
        return symbol;
    }
    define_func(name, exported, arg_count) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'function', exported: exported, arg_count: arg_count, uname: runtimeVar };
        this.put(name, symbol);
        return symbol;
    }
    define_reducer(name, exported, arg_count) {
        var runtimeVar = this.alloc_var(name);
        var symbol = { type: 'reducer', exported: exported, arg_count: arg_count, uname: runtimeVar };
        this.put(name, symbol);
        return symbol;
    }
    define_variable(name, type, exported, can_redefine, d, location) {
        if (!can_redefine) {
            this.check_not_redefined(name, type, location);
        }
        switch (type) {
            case 'var':
                return this.define_var(name, exported);
            case 'const':
                return this.define_const(name, exported, d);
            default:
                throw new Error('unrecognized variable type ' + type);
        }
    }
    fake_builtin_reducer_symbol(name) {
        return {
            type: 'reducer',
            exported: false,
            arg_count: builtin_reducers[name].arg_count,
            uname: 'juttle.reducers.' + name + '.fn'
        };
    }
}

module.exports = {
    Scope: Scope,
    reset: reset
};
