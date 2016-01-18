/**
stoke --
basic stochastic functions implemented in terms of an underlying fixed
random sample indexed by time. This allows us random access by time to
series derived from these, at arbitrary specified granularity, with
repeatable results.
There are two distinct styles of time-indexed randomness:
1) always return the same value for a given t (a Stoke object), and
2) successive draws at given t return a sequence of random values
which can be re-played by calling a reset function (a StokeSequence)
*/
var _ = require('underscore');
var Base = require('extendable-base');
var util = require('./util');
var seedrandom = require('seedrandom');
var primes = require('./primes');
var FIFOCache = require('tiny-fifo-cache');
var errors = require('../../../errors');

var MarkovCache = new FIFOCache(50000);

var Stoke = Base.extend({
    // Stoke: stoke.func(t) always returns the same value
    // for a given t.
    initialize: function initialize(seed, dt) {
        // seed: integer. Different seeds produce different random
        // sequences.
        // dt: float: time-granularity of simulated stochastic
        // process.  invocations separated in time by less than dt
        // will return the same value.
        this.seed = seed || 13;
        this.dt = dt || 1;
        this.stride = primes[this.seed % primes.length];
        this.stride2 = primes[(this.seed + 1) % primes.length];
        this.i = 0;
        this.sequential = 0; // when > 0, successive calls at t yield a sequence
    },
    clone: function clone(sequential) {
        var stoke = new Stoke(this.seed, this.dt);
        stoke.sequential = (sequential === undefined)? this.sequential : sequential;
        return stoke;
    },
    bump: function bump(sequential) {
        // increment the seed and return a fresh copy.
        var stoke = new Stoke(++this.seed, this.dt);
        stoke.sequential = (sequential === undefined)? this.sequential : sequential;
        return stoke;
    },
    reset: function reset() {
        // reset the sequence counter, for successive calls with the same
        // t when sequential > 0;
        this.i = 0;
        this.last_t = null;
        return this;
    },
    step: function step(t) {
        // bump the sequence counter, for successive calls with the
        // same t when sequential > 0; Note: This resets when t
        // changes, because we do not track states for all t's in
        // concurrent use, and because it is really what you wanted.
        if (t === this.last_t) {
            this.i += this.stride2;
        } else {
            this.i = 0 ;
            this.last_t = t;
        }
        return this;
    },
    push_sequential: function push_sequential() {
        // temporarily begin sequential behavior. balance with a call to
        // pop_sequential() to restore original behavior when done.
        this.sequential ++;
    },
    pop_sequential: function pop_sequential() {
        if (--this.sequential === 0) {
            this.reset() ;
        }
    },
    uniform: function uniform(T) {
        // return a uniform random number between 0..1. If !this.sequential, always
        // return the same number for a given t, else return a repeatable sequence
        // for successive calls at t.
        // if called with no argument, behave as if sequential with t=0
        var t = (T && T.seconds) ? T.seconds() : (T || 0);
        if (this.sequential || T === undefined) {
            this.step(t);
        }
        var n = Math.floor(Math.abs(t / this.dt - this.seed));
        var idx = (n * this.stride + this.i) % _uniform_samples.length;
        return _uniform_samples[idx];
    },
    boxmuller: function boxmuller(t) {
        // return a pair of Box-Muller approximate normals, indexed by t
        this.push_sequential();
        var u = 2 * this.uniform(t) - 1;
        var v = 2 * this.uniform(t) - 1;
        var r = u*u + v*v;
        if (r === 0 || r > 1) {
            // out of bounds, try again
            var result = this.boxmuller(t);
            this.pop_sequential();
            return result;
        }
        var c = Math.sqrt(-2*Math.log(r)/r);
        this.pop_sequential();
        return [u*c, v*c];
    },
    normal: function normal(T) {
        // return a N(0,1) random number. If !this.sequential, always
        // return the same number for a given t, else return a
        // repeatable sequence for successive calls at t.
        // if called with no argument, behave as if sequential with t=0
        var t = (T && T.seconds) ? T.seconds() : (T || 0);
        if (this.sequential || T === undefined) {
            this.step(t);
        }
        var n = Math.floor(Math.abs(t / this.dt - this.seed));
        var idx = (n * this.stride + this.i) % _normal_samples.length;
        return _normal_samples[idx];
    },
    integer: function integer(t, min, max) {
        // choose an integer uniformly from min..max inclusive.
        var x = this.uniform(t);
        return Math.floor((max - min + 1) * x) + min;
    },
    ip: function ip(t) {
        var ipnum = Math.floor(this.uniform(t)*Math.pow(2,32));
        return ( [
            Math.floor( ipnum / 16777216 ) % 256,
            Math.floor( ipnum / 65536    ) % 256,
            Math.floor( ipnum / 256      ) % 256,
            Math.floor( ipnum            ) % 256
        ]).join('.');
    },
    noisy: function noisy(t, val, sigma, min, max) {
        val += sigma * this.normal(t) ;
        return util.bound(val, min, max);
    },
    digits: function digits(t, n, base) {
        // generate a string of digits of length n in the given base.
        // defaults are length 4 and base 10
        n = n || 4;
        base = base || 10;
        var result = '';
        this.push_sequential();
        while (result.length < n) {
            // uniform() is finite-precision, so iterate to get big numbers.
            result += this.uniform(t).toString(base).substr(2);
        }
        this.pop_sequential();
        return result.substr(-n);
    },
    mac: function mac(t) {
        // generate a random MAC address
        var addr = [];
        this.push_sequential();
        for (var i=0; i < 6 ; i++) {
            addr.push(this.digits(t, 2, 16));
        }
        this.pop_sequential();
        return addr.join(':');
    },
    random_occurrences: function random_occurrences(t, period, rate) {
        // return a random integer count of events over the given period,
        // indexed by t, such that average occurrences per unit time ==
        // rate.  note: this does not do aggregation over specific
        // intervals. random_occurrences(t,2*p) will not necessarily equal
        // random_occurrences(t,p) + random_occurrences(t+p,p), but their
        // expecations are equal.
        period = (period.seconds) ? period.seconds() : period;
        var lambda = rate*period ;
        if (lambda < 100) {
            // use Knuth's Poisson generator
            var exp = Math.exp(-lambda) ;
            this.push_sequential();
            for (var k=0, p=this.uniform(t) ; p > exp ; k++) {
                p *= this.uniform(t);
            }
            this.pop_sequential();
            return k;
        } else {
            // avoid underflow by taking the normal approximation to
            // Poisson for large lambda
            return Math.floor(this.normal(t) * Math.sqrt(lambda) + lambda) ;
        }
    },
    choose: function choose(t, choices) {
        // choose an item randomly from the choices such that the same
        // choice holds for this.dt seconds around t.
        var p = this.uniform(t);
        return choices[Math.floor(p * choices.length)];
    },
    choose_weighted: function choose_weighted(t, choices) {
        // Choose a key from choices, an object whose keys are the items
        // we want to choose from and whose values are the weights of its
        // keys (0..1, summing to 1.0).  If you pass a list of weights
        // instead of a weighted object, this returns the index of the
        // choice (array indices are keys!)
        var p = this.uniform(t);
        var cum = 0;
        var choice ;
        for (choice in choices) {
            cum += choices[choice];
            if (p <= cum) {
                return choice;
            }
        }
        return choice; // roundoff
    },

    cached_markov: function cached_markov(t, choices) {
        // Keep a cache of recent markov values to avoid having to search
        // for them each time. We make the sane assumption that nobody
        // would use one stoke for multiple state machines, and thus do
        // not bother encoding the choices object in the cache key.
        var key = this.seed + '-' + this.dt + '-' + t;
        var result = MarkovCache.get(key);
        if (result === null) {
            result = this.markov(t, choices);
            MarkovCache.put(key, result);
        }
        return result;
    },

    markov: function markov(t, choices) {
        // Simulate a limited class of discrete markov process in
        // which transition probabilities do not depend on state. For
        // this kind of process, instead of storing an evolving
        // memoryless random state (which we cannot do in our
        // framework), walk backwards from t to discover the most
        // recent state transition event and report that value as the
        // current state. The process timestep is this.dt
        //
        // Transition probabilities are in choices as state:p
        // attributes, and there is no explicit entry for "no
        // transition".
        t = (t.seconds) ? t.seconds() : t ;
        var choice;
        this.push_sequential();
        for (var i = 0 ; i < 10000 ; i++) {
            var p = this.uniform(t);
            for (choice in choices) {
                if (p <= choices[choice]) {
                    this.pop_sequential();
                    return choice;
                } else {
                    p -= choices[choice];
                }
            }
            t -= this.dt ;
        }
        // fail-safe: return last choice if we're spinning our wheels
        this.pop_sequential();
        return choice;
    },
    markov_switcherf: function markov_switcherf(items, avgdur, cached, location) {
        // return a function(moment) that switches randomly among items
        // over time such that on average a given choice holds for avgdur,
        // with events resolved to granularity dt. dt should be some
        // multiple of your current simulation granularity (computation time
        // scales as avgdur/dt).
        var self = this;
        avgdur = (avgdur.seconds) ? avgdur.seconds() : avgdur;
        var p = this.dt / (avgdur + this.dt - 1) ; // adjust: current state is in items
        var p_choice = {};
        var isNumber = _.every(items, _.isNumber);
        var isString = _.every(items, _.isString);
        if (!isNumber && !isString) {
            throw new errors.compileError('RT-INVALID-MARKOV-ITEMS', {
                location: location
            });
        }
        items.forEach(function(choice) { p_choice[choice] = p / items.length; }) ;
        if (cached) {
            return function(moment) {
                var choice = self.cached_markov(moment, p_choice);
                return isNumber ?  1 * choice : choice;
            };
        } else {
            return function(moment) {
                var choice = self.markov(moment, p_choice);
                return isNumber ? 1 * choice : choice;
            };
        }
    },
    round_robin_switcherf: function round_robin_switcherf(items, period) {
        // return a function(moment) analogous to markov_switcherf,
        // but that switches sequentially among items, switching once
        // each period. Not random, but convenient.
        period = (period && period.seconds) ? period.seconds() : (period || 1);
        return function(moment) {
            var idx = Math.floor(moment.unix()/period) % items.length ;
            return items[idx];
        };
    },
});

var StokeSequence = Stoke.extend({
    // StokeSequence: stoke.func(t) called repeatedly with the same t
    // returns a random sequence. This sequence is repeatable by
    // calling reset() or whenever t is returned to after evaluations
    // at other values of t.
    initialize: function(seed, dt) {
        // seed: integer. Different seeds produce different random sequences.
        // dt: float: time-granularity of simulated stochastic process.
        // invocations separated in time by less than dt will return the same value.
        this.sequential = 1;
        this.last_t = null;
    }
});

// pre-load global arrays with uniform random samples, and
// pre-generate normal random samples from these. Thereafter, random
// draws will be from these fixed arrays.
var N_SAMPLES = 10009;
var _uniform_samples = [];
var _rng = seedrandom(13);
for (var i=0 ; i < N_SAMPLES ; i++) { _uniform_samples.push(_rng()); }

var _normal_samples = [];
var _box_stoke = new Stoke(13, 1);
for (var j=0 ; j < (N_SAMPLES+1)/2 ; j++) {
    var pair = _box_stoke.boxmuller(j);
    _normal_samples.push(pair[0]);
    _normal_samples.push(pair[1]);
}
_normal_samples.pop() ; // discard so length === N_SAMPLES

module.exports = {
    Stoke: Stoke,
    StokeSequence: StokeSequence
};
