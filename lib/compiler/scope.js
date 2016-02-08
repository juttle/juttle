'use strict';

var _ = require('underscore');
var Base = require('extendable-base');
var builtin_reducers = require('../runtime/reducers').reducers;
var errors = require('../errors');

var uid = 0;

function reset() {
    uid = 0;
}

var Scope = Base.extend({
    initialize: function(next, type) {
        this.next = next;
        this.type = type;

        this.symbols = {};

        this.arg_uid = uid++;
    },
    level: function() {
        return this.next ? (this.next.level() + 1) : 0;
    },
    get: function(name) {
        if (this.symbols.hasOwnProperty(name)) {
            return this.symbols[name];
        }

        return this.next ? this.next.get(name) : null;
    },
    put: function(name, info) {
        this.symbols[name] = info;
    },
    lookup: function(name) {
        var symbol;

        if (this.symbols.hasOwnProperty(name)) {
            symbol = this.symbols[name];

            switch (symbol.type) {
                case 'const':
                case 'var':
                    return symbol.name;
            }
        }

        return undefined;
    },
    lookup_variable: function(name) {
        var result = this.lookup(name);
        if (result) {
            return result;
        } else if (this.next) {
            return this.next.lookup_variable(name);
        } else {
            return undefined;
        }
    },
    is_mutable: function(name, opts, context) {
        var symbol;

        if (this.symbols.hasOwnProperty(name)) {
            symbol = this.symbols[name];

            switch (symbol.type) {
                case 'const':
                    return false;
                case 'var':
                    return true;
            }
        }
        if (this.next) {
            return this.next.is_mutable(name, opts, context);
        }
        return undefined;
    },
    exports: function() {
        var result = {};

        _.each(this.symbols, function(value, key) {
            if (value.exported) {
                result[key] = value;
            }
        });

        return result;
    },
    alloc_var: function(sourcename) {
        var varName, suffix = uid++;// + '_' + this.level();
        if (sourcename) {
            varName = sourcename + '_' + suffix;
        } else {
            varName = 'v' + suffix;
        }
        return varName;
    },
    define_var: function(name, exported) {
        var runtimeVar = this.alloc_var(name);
        this.put(name, { type: 'var', exported: exported, name: runtimeVar });
        return runtimeVar;
    },
    define_const: function(name, exported, d) {
        var runtimeVar = this.alloc_var(name);
        this.put(name, { type: 'const', exported: exported, name: runtimeVar, d: d });
        return runtimeVar;
    },
    define_sub: function(name, args, exported) {
        var runtimeVar = this.alloc_var(name);
        this.put(name, { type: 'sub', exported: exported, name: runtimeVar, args: args });
        return runtimeVar;
    },
    define_func: function(name, exported, arg_count) {
        var runtimeVar = this.alloc_var(name);
        this.put(name, { type: 'function', exported: exported, arg_count: arg_count, name: runtimeVar });
        return runtimeVar;
    },
    define_reducer: function(name, exported, arg_count) {
        var runtimeVar = this.alloc_var(name);
        this.put(name, { type: 'reducer', exported: exported, arg_count: arg_count, name: runtimeVar });
        return runtimeVar;
    },
    define_variable: function(name, type, exported, can_redefine, d, location) {
        if (!can_redefine && this.symbols.hasOwnProperty(name)) {
            throw errors.compileError('REDEFINED', {
                type: type,
                name: name,
                location: location
            });
        }
        switch (type) {
            case 'var':
                return this.define_var(name, exported);
            case 'const':
                return this.define_const(name, exported, d);
            default:
                throw new Error('unrecognized variable type ' + type);
        }
    },
    fake_builtin_reducer_symbol: function(name) {
        return {
            type: 'reducer',
            exported: false,
            arg_count: builtin_reducers[name].arg_count,
            name: 'juttle.reducers.' + name + '.fn'
        };
    },

    lookup_module_any: function(mod, name, type) {
        var imp = this.get(mod);
        if (!imp || imp.type !== 'import' || imp.exports[name] === undefined || imp.exports[name].type !== type) {
            return undefined;
        }
        //
        //XXX/sm changed the way module names are exported from a module
        // to simplify things... we still do all the type tracking here
        // in the semantic pass, but the module is flattened out and
        // module export are simply accessed via the global uname
        //
        return imp.exports[name];
    },
    lookup_module_variable: function(mod, name) {
        if (this.lookup_module_any(mod, name, 'const') !== undefined) {
            return this.lookup_module_any(mod, name, 'const');
        }
        return undefined;
    },
    lookup_module_sub: function(mod, name) {
        return this.lookup_module_any(mod, name, 'sub');
    },
    lookup_module_func: function(mod, name) {
        return this.lookup_module_any(mod, name, 'function');
    },
    lookup_module_reducer: function(mod, name) {
        return this.lookup_module_any(mod, name, 'reducer');
    }

});

module.exports = {
    Scope: Scope,
    reset: reset
};
