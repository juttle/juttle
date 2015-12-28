var Juttle = require('../runtime/index').Juttle;

var stochastic = require('./stochastic-adapter');
var file = require('./file');
var http = require('./http');
var stdio = require('./stdio');

// register the built-in adapters
Juttle.adapters.register('file', file({}));
Juttle.adapters.register('http', http({}));
Juttle.adapters.register('stochastic', stochastic({}));
Juttle.adapters.register('stdio', stdio({}));
