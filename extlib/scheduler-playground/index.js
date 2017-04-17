var _ = require('underscore');

var Adapter = require('./lib/adapter');
var Store = require('./lib/store');
var Scheduler = require('./lib/scheduler');

// Data store time range
var hour_ago = new Date(Date.now() - 3600 * 1000);
var hour_from_now = new Date(Date.now() + 3600 * 1000);

var scheduler = new Scheduler();

// Query range - historical query, same for both adapters
var from = new Date(Date.now() - 1200 * 1000);
var to   = new Date(Date.now() - 600 * 1000);

scheduler.addAdapter(
    new Adapter({
        latency: 500,
        queueLimit: 50,
        store: new Store({ first: hour_ago, last:  hour_from_now, density: 0.1 })
    }),
    from,
    to
);

scheduler.addAdapter(
    new Adapter({
        latency: 30,
        queueLimit: 50,
        store: new Store({ first: hour_ago, last:  hour_from_now, density: 0.1 })
    }),
    from,
    to
);

scheduler.start();
