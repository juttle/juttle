'use strict';

let juttle_utils = require('../runtime/juttle-utils');

//
// The AdapterAPI is the exported interface to the juttle compiler / runtime
// that is expected to be used by all adapters.
//
// The version field corresponds to the juttle version in which the latest
// changes were made to the adapter API.
//
let AdapterAPI = {
    version: '0.5.0',
    AdapterRead: require('./adapter-read'),
    AdapterWrite: require('./adapter-write'),
    compiler: {
        ASTVisitor: require('../compiler/ast-visitor'),
        FilterJSCompiler: require('../compiler/filters/filter-js-compiler')
    },
    errors: require('../errors'),
    getLogger: require('../logger').getLogger,
    runtime: {
        values: require('../runtime/values'),
        toNative: juttle_utils.toNative,
        parseTime: juttle_utils.parseTime,
        reducerDefaultValue: require('../runtime/reducers').default_value
    },
    types: require('../runtime/types')
};

module.exports = AdapterAPI;
