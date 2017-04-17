var _ = require('underscore');

var Scheduler = function(options) {
    // Scheduling information
    this.info = {};

    // Adapter id dispenser
    this.nextId = 0;
};

Scheduler.prototype.addAdapter = function(adapter, from, to) {
    var self = this;

    // Meh
    var id = this.nextId;

    // Create scheduling record, the time window. Originally <from, to>, adapters update
    // the <from> as they fetch data. When the <from> reaches <to>, we're done - which can
    // be immediately for historical, never for :end: or in the future for superqueries.
    this.info[id] = { adapter: adapter, from: new Date(from.getTime()), to: new Date(to.getTime()) };

    this.nextId++;

    function log(name, e) {
        var t1 = e.head.time.getTime();
        var t2 = e.tail.time.getTime();

        console.log(`${id} (${t1}, ${t2}) ${name} points: ${e.size} qlength: ${e.qlength}`);
    }

    // When adapter fetches data in the interval between <from> and <to>,
    // there are two cases to handle:
    //
    // 1. fetch did not return any points (disregarding errors for now) or
    //    points didn't fill the queue - move the <from> to the end of the fetch
    //    interval - it can be either <to> for historical, or <now> - for supers
    //    If <from> equals <to>, we're done (see 'done()').
    //
    // 2. fetch filled the queue, reaching the queueLimit and not <to>,
    //    move the <from> to the most recent point <tail>, so that next fetch will
    //    start from there
    //
    // What this also means is that the throughtput (batch size emitted into the
    // flowgraph) is capped by the maximum qlength. Adapter refuses to fetch
    // more data than it can store in its buffer (see adapter.fetch()) and waits
    // until the data is drained.
    //
    // Maybe there is a better way.
    adapter.on('fetch', function(event) {
        if (event.qlength === event.limit) {
            self.info[id].from = new Date(event.tail.time.getTime());
        } else {
            self.info[id].from = new Date(event.to.getTime());
        }

        if (event.qlength !== 0) {
            log('fetch', event);
        }
    });

    adapter.on('drain', function(event) {
        var points = event.points;
        log('drain', event);
    });

    adapter.on('full', function() {
        // NOOP
    });
};

// The least recent start of any time window (<from>) first
Scheduler.prototype.getLeastRecent = function() {
    return _.chain(this.info)
            .sortBy(function(nfo) { return nfo.from.getTime(); })
            .first()
            .value();
};

// Evict everything older than least recent <from>
Scheduler.prototype.drain = function() {
    var leastRecent = this.getLeastRecent();
    if (!leastRecent) { return; }

    _.each(this.info, function(nfo) {
        // XXX: not sure if this guard must be here
        if (!nfo.adapter.running) {
            nfo.adapter.drain(leastRecent.from);
        }
    });
};

Scheduler.prototype.getNextFetch = function() {
    return _.chain(this.info)
            // adapter not in the middle of a fetch
            .filter(function(nfo) { return !nfo.adapter.running; })
            // adapter not done
            .filter(function(nfo) { return nfo.from.getTime() !== nfo.to.getTime(); })
            // least recent first
            .sortBy(function(nfo) {
                return nfo.from.getTime();
            })
            .first()
            .value();
};

Scheduler.prototype.schedule = function() {
    var nextFetch = this.getNextFetch();

    // All busy or finished
    if (!nextFetch) { return; }

    var cur = new Date(Date.now());

    // If <to> is in the future, fetch until now
    // This is where the window logic would go
    if (nextFetch.to.getTime() > cur.getTime()) {
        nextFetch.adapter.fetch(nextFetch.from, cur);
    } else {
        nextFetch.adapter.fetch(nextFetch.from, nextFetch.to);
    }
};

// The done condition is that all adapters moved their least recent edge of the
// window fully to <to>.
Scheduler.prototype.done = function() {
    return _.chain(this.info)
            .filter(function(nfo) { return nfo.from.getTime() !== nfo.to.getTime(); })
            .isEmpty()
            .value();
};

Scheduler.prototype.start = function() {
    var self = this;

    this.tick = setInterval(function() {
        // XXX: we will probably have to separate the drain and fetch cycle to be
        // independent.
        self.drain();

        self.schedule();

        if (self.done()) {
            clearInterval(self.tick);
        }
    }, 1000);
};

module.exports = Scheduler;
