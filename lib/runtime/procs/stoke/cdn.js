'use strict';

/**
 source cdn --

 simulate a CDN driven by a latent demand function.

 The unit of work generation in this CDN is a host+service.  A host's
 service behavior (request rates, response_ms, error event rates) is
 determined by the total "demand" on that host+service. Per-host
 behavior (cpu loads, disk capacity, host failure events) is
 determined by the sum of demand over all services on that host.
 Demand is a combination of a latent daily demand curve shared by all
 hosts and any idiosyncratic demands added through configuration.

 command options:
 -nhosts: int
      generate this many hosts, names are pop.1, pop.2, etc (1)
 -host_names: [pop.name, pop.name, ...]
      simulate hosts using these pop.host names.
 -pops: [name, name, ...] (['sea', 'sjc', 'nyc'])
      in conjunction with -nhosts, pop prefixes for generated hostnames
 -dos: 0..1 [0]
      extra demand when DOS targets a host. set to 0 to disable
 -dos_dur: duration [900 secs]
      average stay on host for DOS traffic
 -dos_router: markov
      host switching method: roundrobin or markov or none to disable DOS
 -debug: emit extra points with latent metrics
*/
var _ =  require('underscore');
var Duration = require('../../../runtime/types/juttle-moment').duration;
var util = require('./util');
var Stoke = require('./stoke').Stoke;
var metrics = require('./metrics');
var events = require('./events');
var duraflame = require('./duraflame');
var juttleErrors = require('../../../errors');

/////////////////////////////////////////////////////////////////
// host, service, and cdn collections
/////////////////////////////////////////////////////////////////

var _pops = ['sea', 'sjc', 'nyc'];
var _services = ['search', 'index', 'authentication'];

var _config = {
    app: 'cdn',
    pops: _pops,
    nhosts: 1,
    host_names: null,
    host_capacities: null,
    service_names: _services,
    period: Duration(1), // time-resolution of noise
    seed: 0, // RNG seed
    service_subsample: 4, // subsample service rates when estimating events
    daily: 1, // scale factor for daily latent demand amplitude
    dos: 0,   // dos demand level added to a host
    dos_id: 13,
    dos_dur: 15, // dos has 15-second average stay on a host
    dos_router: 'markov', // demand rounter: roundrobin or markov or null
    ripple: 0, // scale factor for ripple_levels to map to percent demand
    ripple_levels: [-0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5 ], // relative bump levels
    ripple_alpha: 0.9, // EWMA alpha for ripple.
    ripple_dur: 30, // average duration of any ripple step (seconds)
    statusp: {
        // default probabilities of each http return code, should add to 1
        // These are selected such that at 100 requests/sec, there is
        // one 50X failure every 3 minutes.
        404: 0.01,
        500: 1 / (100 * 60 * 9),
        502: 1 / (100 * 60 * 9),
        503: 1 / (100 * 60 * 9),
        200: 1 - (0.01 + 1 / (100 * 60 * 3 ))
    },
    syslog_lpm: 0.1, // avg syslog error lines per minute per host
    syslog_thresh: 0.7, // demand at which message rate increases
    syslog_max_lpm: 20, // additional syslog error lines above thresh
    syslog_max_lines: 100000, // max loglines produced before throttling
    response_ms_normal_mean: 80,
    response_ms_heavy_mean: 2000,
    response_ms_thresh: 0.5,
    cpu_alpha: 0.1, // EWMA alpha for cpu based on latent demand
    cpu_cv: 0.03, // coefficient of variation for cpu (s.d as pct of mean)
    cpu_dc: 0.1,   // constant shift added to cpu ewma value
    index_demand: 0.09, // constand host demand of index service
    authentication_demand: 0.06, // constand host demand of authentication service
    messaging_demand: 0.16, // constand host demand of messaging service
    billing_demand: 0.1, // constand host demand of billing service
    inventory_demand: 0.07, // constand host demand of inventory service
    database_demand: 0.12, // constand host demand of database service
    debug: false // emit points with behind-the-scenes info.
};

function make_hostnames(pops, nhosts) {
    // generate nhosts hostnames drawn from npops pops, return a list.
    var hosts = [];
    for (var i=0 ; i < nhosts ; i++) {
        var pop = pops[i%pops.length];
        var host = pop+'.'+i;
        hosts.push(host);
    }
    return hosts;
}

function host_combine_demandfs(host, host_demandfs) {
    // given a host and a list of host_demandf(host, next_demandf),
    // return a composite demandf(moment) for this host that "bakes
    // in" this host
    return host_demandfs.reduce(
        function(tail, head) { return head(host, tail) ; },
        function() { return 0; });
}

function const_demandf(value) {
    // construct a constant host_demandf(host, next_demandf)
    return function host_demandf(host, next_demandf) {
        return function demandf(moment) {
            return value + ((next_demandf) ? next_demandf(moment) : 0);
        };
    };
}

function markov_demandf(stoke, levels, seconds, location) {
    // construct a host_demandf that randomly switches between values in the
    // levels array, with average time in a given state equal to seconds.
    return function host_demandf(host, next_demandf) {
        var switcher = stoke.markov_switcherf(levels, seconds, true, location);
        return function demandf(moment) {
            var demand = switcher(moment) ;
            var next_demand = ((next_demandf) ? next_demandf(moment) : 0);
            return demand + next_demand;
        };
    };
}

function ewma_demandf(alpha, host_demandf, over, by) {
    // given a host_demandf constructor, return a host_demandf that
    // runs a EWMA filter over the provided host_demandf.
    // by and over should be moments specifying the sampling interval and
    // window for the EWMA.
    return function host_ewma_demandf(host, next_demandf) {
        var demandf = host_demandf(host);
        return function ewma_demandf(moment) {
            var from = moment.subtract(over);
            var ewma =  util.ewma(alpha, demandf, from, moment, by);
            return ewma + ((next_demandf) ? next_demandf(moment) : 0);
        };
    };
}

function demand_switcherf(switcherf, demandf) {
    // create a host_demandf(host, next_demand) that uses
    // switcherf to make a time-varying assignment of demandf to
    // hosts. switcherf(moment) should return the name of the host
    // that should receive the demandf(moment) at the given time.
    return function host_switched_demandf(host, next_demandf) {
        return function switched_demandf(moment) {
            var next = (next_demandf) ? next_demandf(moment) : 0;
            if (switcherf(moment) === host.name) {
                return demandf(moment) + next ;
            } else {
                return next;
            }
        };
    };
}

function make_source(options, filter, start, end, every, now, location) {
    // return a cdn object. configure hosts, then distribute services
    // across the hosts.  use the supplied filter to decide which
    // metric and event generating functions need to be created.
    //
    // Note: for repeatable yet uncorrelated results, each such
    // generator function needs its own stoke object (with different
    // seeds). Because we are using stoke.bump(), we must allocate all
    // stoke objects in the same way each time, regardless of whether
    // a metric is actually needed.
    //
    var gexen = options.pattern ? options.pattern.split(',') : null;
    var live_filter = util.live_filter(filter);
    var config = _.chain(options || {}).clone()
        .extend({start:start, end:end, every:every, gexen:gexen, filter:live_filter})
        .defaults(_config)
        .value();
    // hosts
    if (!config.host_names) {
        config.host_names = make_hostnames(config.pops, config.nhosts);
    }
    var stoke = new Stoke(config.seed, config.period.seconds());
    config.nhosts = config.host_names.length;
    if (!config.host_capacities) {
        // assign random capacities to hosts, for distribution of
        // demand across the CDN. Only the relative magnitude between
        // hosts matters.
        var result = {};
        config.host_names.forEach(function(host_name) {
            result[host_name] = stoke.uniform() + 0.5;
        });
        config.host_capacities = result;
    }
    // demands
    var capacity = _.reduce(config.host_capacities,
                            function(sum,cap) { return sum + cap; }, 0);
    var host_demandfs = [];
    var host_service_demandfs = {};
    config.service_names.forEach(function(service_name) {
        if (service_name === 'index') {
            var host_index_demandf = const_demandf(config.index_demand);
            host_demandfs.push(host_index_demandf);
            host_service_demandfs['index'] = [host_index_demandf];
        } else if (service_name === 'search') {
            host_demandfs.push(host_latent_demandf);
            host_service_demandfs['search'] = [host_latent_demandf];
        } else if (service_name === 'authentication') {
            var host_auth_demandf = const_demandf(config.authentication_demand);
            host_demandfs.push(host_auth_demandf);
            host_service_demandfs['authentication'] = [host_auth_demandf];
        } else if (service_name === 'messaging') {
            var host_messaging_demandf = const_demandf(config.messaging_demand);
            host_demandfs.push(host_messaging_demandf);
            host_service_demandfs['messaging'] = [host_messaging_demandf];
        } else if (service_name === 'billing') {
            var host_billing_demandf = const_demandf(config.billing_demand);
            host_demandfs.push(host_billing_demandf);
            host_service_demandfs['billing'] = [host_billing_demandf];
        } else if (service_name === 'inventory') {
            var host_inventory_demandf = const_demandf(config.inventory_demand);
            host_demandfs.push(host_inventory_demandf);
            host_service_demandfs['inventory'] = [host_inventory_demandf];
        } else if (service_name === 'database') {
            var host_database_demandf = const_demandf(config.database_demand);
            host_demandfs.push(host_database_demandf);
            host_service_demandfs['database'] = [host_database_demandf];
        }
    });

    var dos_stoke = stoke.bump();
    if (config.dos) {
        // dos is an out-of-control search user who hoses random hosts
        // with requests and spikes their load.
        var dos_switcherf = function() {} ;
        switch (config.dos_router) {
            case 'roundrobin': dos_switcherf = dos_stoke.round_robin_switcherf(
            config.host_names, config.dos_dur);
                break;
            case 'markov': dos_switcherf = dos_stoke.markov_switcherf(
            config.host_names, config.dos_dur, true, location);
                break;
            default:
                throw juttleErrors.compileError('UNKNOWN-DOS-ROUTER', {
                    dos_router: config.dos_router,
                    location: location
                });
        }
        var dos_demand = function(moment) { return config.dos; };
        var host_dos_demandf = demand_switcherf(
            dos_switcherf, dos_demand);
        host_demandfs.push(host_dos_demandf);
        host_service_demandfs.search.push(host_dos_demandf);
    }
    var ripple_stoke = stoke.bump();
    if (config.ripple) {
        // ripple is a markov-selected discrete demand offset whose
        // levels are centered at 0. This allows us to layer
        // nonperiodic demand at small timescales onto the larger
        // periodic daily demand function
        var by = Duration(config.ripple_dur);
        var over = Duration(10*config.ripple_dur);
        var levels = config.ripple_levels.map(function(level) {
            return level * config.ripple / config.ripple_alpha;
        });
        ripple_stoke.dt = config.ripple_dur;
        var host_ripple_demandf = markov_demandf(ripple_stoke, levels, config.ripple_dur, location);
        host_ripple_demandf = ewma_demandf(config.ripple_alpha, host_ripple_demandf, over, by);
        host_demandfs.push(host_ripple_demandf);
        host_service_demandfs.search.push(host_ripple_demandf);
    }
    // hosts + services + demands
    var hosts = {};
    var metric_funcs = [];
    var event_funcs = [];
    config.host_names.forEach(function(host_name) {
        var host = {
            name: host_name,
            pop: host_name.substring(0, host_name.indexOf('.')),
            capacity:config.host_capacities[host_name]/capacity, // -> pct
        };
        host.demandf = host_combine_demandfs(host, host_demandfs);
        if (config.dos) {
            // need this broken out to alter cust_id frequencies
            host.dos_demandf = host_dos_demandf(host);
        }
        host.errlog = duraflame.syserror(stoke.bump().seed, stoke.dt);
        host.nlines = 0 ;
        var services = {};
        // services + demands
        config.service_names.forEach(function(service_name) {
            var service = {
                name: service_name,
                requests_stoke: stoke.bump(),
                response_stokeseq: {},
                demandf: host_combine_demandfs(
                    host, host_service_demandfs[service_name])
            };
            for (var code in config.statusp) {
                service.response_stokeseq[code] = stoke.bump(true);
            }
            services[service_name] = service;
        });
        host.services = services;
        hosts[host_name] = host;
        make_host_metrics(host, metric_funcs);
        _.each(host.services, function(service) {
            make_host_service_metrics(host, service, metric_funcs);
        });
        make_host_events(host, event_funcs, location);
        _.each(host.services, function(service) {
            make_host_service_events(host, service, event_funcs);
        });
    });

    function emittable(pt) {
        return util.emittable(pt, config.gexen, filter);
    }

    function host_latent_demandf(host, next_demandf) {
        // create a demandf(moment) for this host's share of the global
        // latent daily demand curve.
        var noise_stoke = stoke.bump();
        return function demandf(moment) {
            var daily = metrics.latent(moment, noise_stoke) ;
            return (daily * host.capacity * config.daily
                    + ((next_demandf) ? next_demandf(moment) : 0));
        };
    }

    function make_host_metrics(host, funcs) {
        // generate host-level metric functions(from, to, out, errors) that
        // satisfy the emittable filters and append them to funcs.
        var cpu_pt = {
            host:host.name,
            pop:host.pop,
            source_type:'metric',
            name:'cpu'
        } ;
        var cpu_stoke = stoke.bump();
        if (emittable(cpu_pt)) {
            funcs.push(function host_cpu(from, to, out, errors) {
                cpu_pt.time = from;
                cpu_pt.value = metrics.cpu(from, cpu_stoke, host.demandf, config);
                out.push(_(cpu_pt).clone());
            });
        }
        var disk_pt = {
            host:host.name,
            pop:host.pop,
            source_type:'metric',
            name:'disk'
        } ;
        var disk_stoke = stoke.bump();
        if (emittable(disk_pt)) {
            funcs.push(function host_disk(from, to, out, errors) {
                disk_pt.time = from;
                disk_pt.value = metrics.disk(from, disk_stoke, host.demandf);
                out.push(_(disk_pt).clone());
            });
        }
        var debug_pt = {
            host:host.name,
            pop:host.pop,
            type:'debug',
            name:'host.demand'
        } ;
        if (config.debug && emittable(debug_pt)) {
            funcs.push(function host_debug(from, to, out, errors) {
                debug_pt.time = from;
                debug_pt.value = host.demandf(from,to);
                out.push(_(debug_pt).clone());
            });
        }
    }

    function make_host_service_metrics(host, service, funcs) {
        // generate metric functions(from, to, out, errors) for services on
        // this host that satisfy the emittable filters and append
        // them to funcs.
        var requests_pt = {
            host:host.name,
            pop:host.pop,
            service:service.name,
            source_type:'metric',
            name:'requests'
        } ;
        if (emittable(requests_pt)) {
            funcs.push(function svc_requests(from, to, out, errors) {
                requests_pt.time = from;
                requests_pt.value = metrics.requests(from, service.requests_stoke, service.demandf);
                out.push(_(requests_pt).clone());
            });
        }
        var response_ms_pt = {
            host:host.name,
            pop:host.pop,
            service:service.name,
            source_type:'metric',
            name:'response_ms'
        } ;
        var response_stoke = stoke.bump();
        if (emittable(response_ms_pt)) {
            funcs.push(function svc_response_ms(from, to, out, errors) {
                response_ms_pt.time = from;
                response_ms_pt.value = metrics.response_ms(from, response_stoke, service.demandf, config);
                out.push(_(response_ms_pt).clone());
            });
        }
        var responses_pt = {
            host:host.name,
            pop:host.pop,
            service:service.name,
            source_type:'metric',
            name:'responses'
        } ;
        if (_.every(_.keys(config.statusp),
                    function skip(code) {
                        responses_pt.code = code;
                        return !emittable(responses_pt);
                    })) {
            return; // nothing left to compute!
        }
        funcs.push(function svc_responses(from, to, out, errors) {
            // compute summary counts for response types to emit as points.
            // do this using the same sampling scheme as service_events, so
            // the counts will be the same as the numbers of events.
            var by = to.subtract(from).seconds() / config.service_subsample ;
            if (by < service.requests_stoke.dt) {
                // don't sample finer than our RNG resolution.
                by = service.requests_stoke.dt;
            }
            by = Duration(by) ;
            util.step_by(from, to, by, function(moment, next) {
                var rate = metrics.requests(moment, service.requests_stoke, service.demandf);
                var demand = service.demandf(moment);
                var statusp = events.statusp(demand, config.statusp);
                for (var code in statusp) {
                    // for each http code, the number of messages is
                    // proportional to the demand-induced error rate
                    // (which may be less than 1 for rare events, so
                    // use a poisson draw).
                    responses_pt.time = moment;
                    responses_pt.code = code;
                    if (live_filter(responses_pt)) {
                        var seq = service.response_stokeseq[code];
                        responses_pt.value = seq.reset().random_occurrences(
                            moment, by, rate * statusp[code]);
                        out.push(_(responses_pt).clone());
                    }
                }
            });
        });
    }

    function make_host_service_events(host, service, funcs) {
        // generate event functions(from, to, out, errors) for services on
        // this host that satisfy the emittable filters and append
        // them to funcs.
        var event_pt = {
            host:host.name,
            pop:host.pop,
            service:service.name,
            source_type:'event',
            name:'server_error'
        } ;
        if (_.every(_.keys(config.statusp),
                    function skip(code) {
                        event_pt.code = code;
                        return !emittable(event_pt);
                    })) {
            return; // nothing left to compute!
        }
        funcs.push(function svc_events(from, to, out, errors) {
            // generate events for a service over the half-open interval [from..to).
            var by = to.subtract(from).seconds() / config.service_subsample ;
            if (by < service.requests_stoke.dt) {
                by = service.requests_stoke.dt; // don't sample finer than our RNG resolution.
            }
            by = Duration(by) ;
            util.step_by(from, to, by, function(moment, next) {
                var rate = metrics.requests(moment, service.requests_stoke, service.demandf);
                var demand = service.demandf(moment);
                var dos_demand;
                if (config.dos) {
                    dos_demand = host.dos_demandf(moment);
                }
                var statusp = events.statusp(demand, config.statusp);
                for (var code in statusp) {
                    // for each http code, emit a number of messages
                    // proportional to the demand-induced error rate (which is
                    // probably less than 1, so use a poisson draw).
                    if (code !== '500' && code !== '502' && code !== '503') {
                        // only emit 500 and 503 events.
                        continue ;
                    }
                    var seq = service.response_stokeseq[code] ;
                    var nevents = seq.reset().random_occurrences(moment, by, rate * statusp[code]);
                    for (var i = 0; i < nevents ; i++) {
                        var cust_id = seq.integer(moment, 100, 110);
                        if (config.dos) {
                            var cust_id_p = {};
                            cust_id_p[config.dos_id] = dos_demand/demand;
                            cust_id_p[cust_id] = 1 - dos_demand/demand;
                            cust_id = seq.choose_weighted(moment, cust_id_p) ;
                        }
                        event_pt.time = moment.add(by.multiply(i/nevents));
                        event_pt.code = code;
                        event_pt.cust_id = cust_id;
                        if (live_filter(event_pt)) { // filtering on cust_id
                            out.push(_(event_pt).clone());
                        }
                    }
                }
            });
        });
    }

    function make_host_events(host, funcs, location) {
        // generate event functions(from, to, out, errors) for this host that
        // satisfy the emittable filters and append them to funcs.
        var event_pt = {
            host:host.name,
            pop:host.pop,
            source_type:'event',
            name:'syslog',
            level:'error'
        } ;
        if (!emittable(event_pt)) {
            return ;
        }
        var warn_too_many = _.once(function (errors) {
            if (errors) {
                errors.push(new juttleErrors.runtimeError('TOO-MANY-LOGS-WARNING', {
                    host: host.name,
                    location: location
                }));
            }
        });
        funcs.push(function syslog_events(from, to, out, errors) {
            // generate events for a service over the half-open interval [from..to).
            var by = to.subtract(from) ;
            util.step_by(from, to, by, function(moment, next) {
                var demand = host.demandf(moment);
                var peak = Math.max(0, demand - config.syslog_thresh) / (1 - config.syslog_thresh);
                var lpm = config.syslog_lpm + peak * config.syslog_max_lpm;
                var nevents = host.errlog.random_occurrences(moment, by, lpm/60);
                for (var i = 0; i < nevents ; i++) {
                    if (config.syslog_max_lines && host.nlines >= config.syslog_max_lines && moment.lt(now)) {
                        warn_too_many(errors);
                        break;
                    }
                    var time = moment;
                    if (by.divide(nevents).gt(config.period)) {
                        // there is enough room to give every everyone
                        // their own time.  when times are closer than
                        // period you get duplictes because time is changing
                        // but the quantized time is not.
                        time = moment.add(by.multiply(i/nevents));
                    }
                    event_pt.time = time;
                    event_pt.message = host.errlog.message(time);
                    out.push(_(event_pt).clone());
                    host.nlines++;
                }
            });
        });
    }

    function step_metrics(from, to, by, out, errors) {
        // generate metric points emitted by the cdn for the given
        // interval and push into out.
        var _out = [];
        util.step_by(from, to, by, function(moment, next) {
            _.each(metric_funcs, function(func) { func(moment, next, _out, errors); });
        });
        _.each(_out, function(pt) { if (live_filter(pt)) { out.push(pt) ; }});
    }

    function step_events(from, to, by, out, errors) {
        // generate events emitted by the cdn in the given interval
        // and push into out.
        var _out = [];
        util.step_by(from, to, by, function(moment, next) {
            _.each(event_funcs, function(func) { func(moment, next, _out, errors); });
        });
        _.each(_out, function(pt) { if (live_filter(pt)) { out.push(pt) ; }});
    }

    return {
        config:config,
        step_events: step_events,
        step_metrics: step_metrics,
        eof: function() { return false; }
    };
}


module.exports = {
    make_source: make_source,
    make_hostnames: make_hostnames
};
