'use strict';

/**
 stoke: random-access, repeatable stochastic timeseries
        (third time's the charm)

 stoke offers an assortment of stochastic functions, composition
 tools, and metric and event stream generators implemented in terms of
 an underlying fixed random sample indexed by time. This allows us
 random access to series derived from these, going forwards and
 backwards at arbitrary granularity with repeatable results.
*/
var _ = require('underscore');
var errors = require('../../../errors');
var cdn = require('./cdn');
var logs = require('./logs');

// cdn config for the AWS source
var saas_source = {
    source: 'cdn',
    app: 'saas',
    pops: ['us-east', 'us-west'],
    service_names: ['authentication', 'messaging', 'billing', 'database'],
    nhosts: 5,
    max_samples: 1000
};

var ecommerce_source = {
    source: 'cdn',
    app: 'ecommerce',
    pops: ['us-east', 'us-west'],
    service_names: ['authentication', 'billing', 'inventory', 'database'],
    nhosts: 5,
    max_samples: 1000
};

var srch_cluster_source = {
    source: 'cdn',
    app: 'search',
    service_names: ['search', 'index', 'authentication'],
    nhosts: 5,
    max_samples: 1000,
    dos: 0.7,
    dos_dur: 30
};

function make_source(source, options, filter, start, end, every, now, location) {
    source  = source || 'cdn';

    switch (source) {
        case 'srch_cluster':
            return cdn.make_source(_.extend({}, srch_cluster_source, options), filter, start, end, every, now);
        case 'saas':
            return cdn.make_source(_.extend({}, saas_source, options), filter, start, end, every, now);
        case 'ecommerce':
            return cdn.make_source(_.extend({}, ecommerce_source, options), filter, start, end, every, now);
        case 'cdn':
            return cdn.make_source(options, filter, start, end, every, now, location);
        case 'logs':
            return logs.make_source(options, filter, start, end, every);
        default:
            throw errors.compileError('RT-UNKNOWN-SOURCE', {
                source: source,
                location: location
            });
    }
}

module.exports = {
    util: require('./util'),
    stoke: require('./stoke'),
    metrics: require('./metrics'),
    events: require('./events'),
    make_source: make_source
};
