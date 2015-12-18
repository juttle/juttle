/**
 generate metric timeseries values for CDNs arising from a latent
 demand function.
*/
var JuttleMoment = require('../../../moment').JuttleMoment;
var Duration = JuttleMoment.duration;
var util = require('./util');
var Stoke = require('./stoke').Stoke;
var FIFOCache = require('tiny-fifo-cache');

// Keep a cache of N latent demand variables to avoid having to create them
// each time.
var LatentMetricCache = new FIFOCache(50000);

/// XXX/demmer expose in the browser for debuggability
/* global window */
if (typeof window !== 'undefined') {
    window.LatentMetricCache = LatentMetricCache;
}

var latent_stoke = new Stoke(0, 24*3600);

function _latent(moment) {
    // simulate a latent CDN demand curve with a 24-hour cycle.
    // Returns a number in 0..1 corresponding to min..max demand.
    var duty = latent_stoke.noisy(moment, 0.375, 0.25, 0.25, 0.5);
    return (util.day_wave(moment) + util.day_pulse(moment, duty)) / 2;
}

function latent(moment) {
    var key = latent_stoke.seed + '-' + latent_stoke.dt + '-' + moment.milliseconds();
    var result = LatentMetricCache.get(key);
    if (result === null) {
        result = _latent(moment);
        LatentMetricCache.put(key, result);
    }
    return result;
}

function requests(moment, noise_stoke, demandf) {
    // compute a request rate (per second) in response to the latent demand.
    // Implemented as EWMA with a short fuse.
    var mean = demandf(moment) ;
    var sd = 0.1 * mean;
    return noise_stoke.noisy(moment, mean, sd, -0.1, 1) * 100 + 1 ;
}

function cpu(moment, noise_stoke, demandf, config) {
    // compute a cpu load (percent) in response to the latent demand.
    // relatively short EWMA without much noise.
    var by = Duration(10); // 10 second steps
    var from = moment.subtract(Duration(600)); // 10 minute window
    var mean =  util.ewma(config.cpu_alpha, demandf, from, moment, by);
    var sd = config.cpu_cv * mean;
    // Defaults (with latent default) aim for a normal average of: .2
    // (mean is 0..1, sd is ~0.5)
    return noise_stoke.noisy(moment, mean, sd, -config.cpu_dc, 1 - config.cpu_dc) + config.cpu_dc;
}

function response_ms(moment, noise_stoke, demandf, config) {
    // compute a request rate (per second) in response to the latent demand.
    // Implemented as EWMA that is laggier than the driving requests.
    //
    // response-time stats ranges:
    //  Average response time:
    // normal average: 80 ms
    // normal extremes: 10ms-300ms
    // heavy load average: 2 seconds
    // heavy load extremes: 1-3 seconds
    //
    var alpha = 0.8;
    var by = Duration(300); // 5 minute steps
    var from = moment.subtract(Duration(1800)); // .5 hour window
    var d =  util.ewma(alpha, demandf, from, moment, by);
    var normal_mean = config.response_ms_normal_mean; // mean at response_ms_thresh load
    var heavy_mean = config.response_ms_heavy_mean; // mean at 100% load
    var dd = Math.max(d - config.response_ms_thresh, 0) ;
    var mean = normal_mean + dd / (1 - config.response_ms_thresh) * (heavy_mean - normal_mean);
    var sd = mean / 4 ;
    return noise_stoke.noisy(moment, mean, sd, 10, 3000);
}

function disk(moment, noise_stoke, demandf) {
    // compute a disk usage (percent) in response to the latent demand.
    // very slow EWMA without noise.
    var alpha = 0.1;
    var by = Duration(1200); // 20 minute steps
    var from = moment.subtract(Duration(6*3600)); // 6 hour window
    var d =  util.ewma(alpha, demandf, from, moment, by);
    return Math.sqrt(d)/3 + 0.25;
}

module.exports = {
    latent: latent,
    requests: requests,
    response_ms: response_ms,
    cpu: cpu,
    disk: disk
};
