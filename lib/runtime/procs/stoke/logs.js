/**
source logs --

generate log message events from various sources
this exports a make_source function whose step() produces points with
these fields:
time: event timestamp
host: one of the configured hostnames
type: event
name: source type
message: message text
level: info|error (syslog source only)

source command options:
-logType : [git|syslog|osx|pix] log style to generate (default syslog)
-lpm: float -- average lines per minute (default 10)
-nhosts: int
      generate this many hosts, names are pop.1, pop.2, etc (1)
-host_names: [pop.name, pop.name, ...]
      simulate hosts using these pop.host names.
-pops: [name, name, ...] (['sea', 'sjc', 'nyc'])
      in conjunction with -nhosts, pop prefixes for generated hostnames
specific source options:

syslog:

  -errp: 0..1 -- percentage of messages which are errors (0.02)
git:
  -mergep: 0..1 -- percentage of messages which are merges (.05)

*/
var _ =  require('underscore');
var StokeSequence = require('./stoke').StokeSequence;
var util = require('./util');
var duraflame = require('./duraflame');
var make_hostnames = require('./cdn').make_hostnames;
var _pops = ['sea', 'sjc', 'nyc'];

var _config = {
    pops: _pops,
    nhosts: 1,
    host_names: null,
    lpm: 60,
    logType: 'syslog',
    period: 1, // stoke resolution XXX i see trouble with step_by i/by
    errp: 0.02, // % error msgs in syslog
    mergep: 0.10 // % merge msgs in git
};

function make_source(options, filter, start, end, every) {
    // return a logs source object.
    var live_filter = util.live_filter(filter);
    var config = _.chain(options || {}).clone()
        .extend({start:start, end:end})
        .defaults(_config)
        .value();
    // hosts
    if (!config.host_names) {
        config.host_names = make_hostnames(config.pops, config.nhosts);
    }
    // logs is old-skool and wants seconds for its parameters.
    config.period = (config.period && config.period.seconds) ? config.period.seconds() : (config.period || 1);
    var seed = 13;
    var stoke = new StokeSequence(seed, config.period);
    var logger;
    if (config.logType === 'syslog') {
        logger = duraflame.syslog(seed, config.period, config.errp);
    } else if (config.logType === 'git') {
        logger = duraflame.gitlog(seed, config.period, config.mergep);
    } else if (config.logType === 'osx') {
        logger = duraflame.osx(seed, config.period);
    } else if (config.logType === 'pix') {
        logger = duraflame.pix(seed, config.period);
    }

    function step_events(from, to, by, out, errors) {
        if (config.debug) {
            out.push({time:from, type:"debug", name:"step-logs "+config.logType});
        }
        util.step_by(from, to, by, function(moment, next) {
            var nevents = stoke.random_occurrences(
                moment, by, config.lpm/60);
            for (var i = 0; i < nevents ; i++) {
                var time = moment;
                if (by.divide(nevents).seconds() > config.period) {
                    // there is enough room to give every everyone
                    // their own time.  when times are closer than
                    // period you get duplictes because time is changing
                    // but the quantized time is not.
                    time = moment.add(by.multiply(i/nevents));
                }
                var pt = {
                    time:time,
                    host:stoke.choose(time, config.host_names),
                    pop:stoke.choose(time, config.pops),
                    source_type:"event",
                    name:config.logType,
                    message:logger.message(time)
                };
                if (live_filter(pt)) {
                    out.push(pt);
                }
            }
        });
    }

    return {
        config:config,
        step_events: step_events,
        step_metrics: function() { }, // no metrics from the logger
        eof: function() { return false; } // we never run out of logs
    };
}

module.exports = {
    make_source: make_source
};

