'use strict';

var _ = require('underscore');
var Base = require('extendable-base');
var moment = require('moment-timezone');
var epoch = moment.utc(0);
var Moment = Object.getPrototypeOf(epoch);
require('moment-duration-format'); // momentjs plugin, no reference needed

var JuttleMoment = Base.extend({

    // Because this is called "constructor" instead of "initialize",
    // JuttleMoment can't be subclassed.
    // So never do var MyMomentClass = JuttleMoment.extend({some new properties})
    //
    // this defeats the whole purpose of extendable base but is
    // measurably faster at creating JuttleMoments which we do a lot
    constructor: function(options) {
        options = (options === undefined) ? {} : options;

        // Black magic to create a JuttleMoment without calling
        // the slow, slow moment.js constructor
        // basically we Object.create an empty object with Moment as its prototype
        // and explicitly copy into it the properties that define it as
        // the moment we're looking for
        // bypassing all the type-checking and parsing that moment.js would do
        // to get the same result object in the end
        if (options.rawDate) {
            this.moment = Object.create(Moment);
            this.moment._d = options.rawDate;
            this.moment._isUTC = true;
            this.moment._isAMomentObject = true;
            this.moment._locale = epoch._locale;
            this.moment._offset = 0;
            this.moment._pf = epoch._pf;
            this.epsilon = false;
            return;
        }

        // A rawDurationString is the result of a moment.duration().toJSON()
        // and can be used to construct a moment.duration directly
        if (options.rawDurationString) {
            this.duration = moment.duration(options.rawDurationString);
            this.normalize();
            return;
        }

        // For cloning a JuttleMoment.
        if (options.duration || options.moment) {
            this.duration = options.duration;
            this.moment = options.moment;
            this.epsilon = !!options.epsilon;
            this.normalize() ;
            return;
        } else if (_.isNumber(options) || _.isString(options)) { // Allow shorthand initialization.
            options = {
                raw: options
            };
        }

        this.epsilon = !!options.epsilon;

        // If isDuration is true, will parse as duration. If not, will attempt
        // to parse as a moment.
        if (options.isDuration) {
            this.parseDuration(options.raw, options.raw2);
        } else {
            this.parseDate(options.raw);
        }
    },

    milliseconds: function() {
        // XXX this should not be a moment, but too many tests abuse it
        if (this.moment) {
            var ms = this.moment.toDate().getTime();
            if (ms !== ms) { // speedy hack for isNaN(ms)
                return this.moment._i;
            }
            return ms;
        } else {
            return this.duration.asMilliseconds();
        }
    },

    seconds: function() {
        // XXX this should insist on duration, but too many tests abuse it
        return this.milliseconds() / 1000.0;
    },

    unix: function() {
        // return seconds since the epoch for this moment.
        return Math.floor(this.seconds());
    },

    unixms: function() {
        // return milliseconds since the epoch for this moment.
        return this.milliseconds();
    },

    finite: function() {
        // is this a finite time or duration?
        return _.isFinite(this.milliseconds());
    },

    parseDate: function(raw) {
        // arg can be a number of seconds, or an ISO date string, or 'now'
        if (!isNaN(raw)) {
            // Convert seconds to milliseconds.
            raw = Math.round(parseFloat(raw) * 1000) ;
        }

        this.moment = moment.utc(raw);

        if (!this.moment.isValid()
            && Math.abs(raw) !== Number.POSITIVE_INFINITY) {
            delete this.moment;
            throw new Error('Unable to parse: '+ raw);
        }
    },

    SIMPLE_DURATION: /^([+-])?(\d*([Mdhms]|ms)|Infinity)$/,
    FORMATTED_DURATION: /^([+-]?\d+\/)?([+-]?\d+\.)?([+-]?\d+):(\d+):([\d.]+)$/,
    parseDuration: function(dur, optunits) {
        var simple = _.isString(dur) && dur.match(this.SIMPLE_DURATION);
        if (simple) {
            // simple durations are like "Nunitabbrev"
            var N = parseFloat(simple[2]) * (simple[1] === '-' ? -1 : 1);
            this.duration = moment.duration(N, simple[3]);
        } else if (_.isNumber(dur) || optunits) {
            // If optunits is set, ensure that dur is a float.
            // If given a bare number, assume seconds.
            // rely on momentjs to validate optunits as a duration unit string.
            dur = parseFloat(dur);
            this.duration = moment.duration(dur, optunits || 's');
            if (this.duration.asMilliseconds() === 0 && dur !== 0) {
                throw new Error('Unable to parse: '+ dur + ',' + optunits);
            }
        } else if (_.isString(dur)) {
            // parse "M/d.h:m:s.msecs. M may have a different sign from
            // the remaining duration
            var s = dur.match(this.FORMATTED_DURATION);
            if (s === null) {
                throw new Error('Unable to parse as formatted duration: '+ dur);
            }
            var sign = (s[2] && s[2][0] === '-' || s[3] && s[3][0] === '-') ? -1 : 1;
            var d = {
                months:  s[1] ? parseInt(s[1]) : 0,
                days:    s[2] ? Math.abs(parseInt(s[2])) * sign : 0,
                hours:   s[3] ? Math.abs(parseInt(s[3])) * sign : 0,
                minutes: s[4] ? parseInt(s[4]) * sign : 0,
                seconds: s[5] ? parseFloat(s[5]) * sign : 0
            };
            this.duration = moment.duration(d);
        }
        this.normalize();
    },

    normalize: function() {
        // XXX momentjs behaves badly with durations having
        // floating-point days, so be sure we always give integer days
        // until we get a straight answer from the momentjs crew. This
        // is a narrow fix for a narrow bug, non-day units are not a problem.
        if (!this.duration) {
            return ;
        }
        var floatdays = this.duration.days();
        var days = (floatdays >= 0)? Math.floor(floatdays) : Math.ceil(floatdays);
        if (floatdays === days) {
            return ;
        }
        this.duration.subtract(moment.duration({days: floatdays - days}));
        this.duration.add(moment.duration({milliseconds:(floatdays - days) * 86400 * 1000}));
    },

    // Comparison convenience methods

    eq: function(operand) {
        return JuttleMoment.compare(this, operand) === 0;
    },

    ne: function(operand) {
        return JuttleMoment.compare(this, operand) !== 0;
    },

    gt: function(operand) {
        return JuttleMoment.compare(this, operand) > 0;
    },

    gte: function(operand) {
        return JuttleMoment.compare(this, operand) >= 0;
    },

    lt: function(operand) {
        return JuttleMoment.compare(this, operand) < 0;
    },

    lte: function(operand) {
        return JuttleMoment.compare(this, operand) <= 0;
    },

    add: function(operand) {
        return JuttleMoment.add(this, operand);
    },

    subtract: function(operand) {
        return JuttleMoment.subtract(this, operand);
    },

    multiply: function(operand) {
        return JuttleMoment.multiply(this, operand);
    },

    divide: function(operand) {
        return JuttleMoment.divide(this, operand);
    },

    negate: function() {
        return JuttleMoment.negate(this);
    },

    is_calendar: function() {
        return JuttleMoment.is_calendar(this);
    },

    is_mixed: function() {
        return JuttleMoment.is_mixed(this);
    },

    quantize: function(T, on) {
        return JuttleMoment.quantize(this, T, on);
    },

    // If logged, this gives a more accurate representation than toString().
    toJSON: function() {
        return this.valueOf();
    },

    toString: function() {
        //toString is commonly used to identify the type of the object, so return a more standard result.
        //See underscore's is* functions (isDate, isNumber, etc.) as a common use case that utilizes toString on Objects
        return '[object JuttleMoment]';
    },

    valueOf: function() {
        if (this.moment) {
            return JuttleMoment.momentString(this.moment);
        } else {
            return JuttleMoment.durationString(this.duration);
        }
    },

    UTCStartOf: function(timeunit) {
        // return a new JuttleMoment truncated to the beginning of timeunit (in UTC).
        // timeunit is one of momentjs's accepted timeunit strings,
        // year, month, day, hour, minute, second
        var newMoment = this.clone();
        newMoment.moment.startOf(timeunit);
        return newMoment;
    },

    startOf: function(timeunit) {
        // Same as UTCStartOf, for now.
        return this.UTCStartOf(timeunit);
    },

    endOf: function(timeunit) {
        // return a JuttleMoment truncated to the beginning of timeunit.
        // timeunit is one of momentjs's accepted timeunit strings,
        // year, month, day, hour, minute, second
        var newMoment = this.clone();
        newMoment.moment.endOf(timeunit);
        return newMoment;
    },

    clone: function() {
        return new JuttleMoment({
            duration: this.duration && moment.duration(this.duration),
            moment: this.moment && this.moment.clone()
        });
    },

    mapInterval: function(f, to, by) {
        // evaluate f(moment) over moment...to, and return an array of values.
        // operate directly on internal moment for speed.
        var values = [];
        var n = Math.floor((to.moment - this.moment) / by.duration) + 1;
        var m = this.clone();
        for (var i = 0 ; i < n ; i++) {
            values.push(f(m));
            m.moment.add(by.duration);
        }
        return values;
    },
    isBeginning: function() {
        if (!this.moment) {
            throw new Error('JuttleMoment.isBeginning() expects a Moment');
        }
        return this.unix() === -Infinity;
    },
    isEnd: function() {
        if (!this.moment) {
            throw new Error('JuttleMoment.isEnd() expects a Moment');
        }
        return this.unix() === Infinity;
    }

}, {

    now: function() {
        return new JuttleMoment();
    },

    duration: function(arg1, arg2) {
        return new JuttleMoment({raw:arg1, raw2:arg2, isDuration:true});
    },

    epsDuration: function(arg1, arg2) {
        return new JuttleMoment({raw:arg1, raw2:arg2, isDuration:true, epsilon:true});
    },

    epsMoment: function(arg) {
        var m = new JuttleMoment(arg);
        m.epsilon = true;
        return m;
    },

    // Comparison

    compare: function(operand1, operand2) {
        if (!(operand1 && operand1 instanceof JuttleMoment
            && operand2 && operand2 instanceof JuttleMoment)) {
            throw new Error('Can\'t compare a Date/Duration with other types.');
        } else if ((operand1.moment && operand2.duration)
            || (operand1.duration && operand2.moment)) {
            throw new Error('Can\'t compare a Date with a Duration.');
        }

        var ms1 = operand1.milliseconds();
        var ms2 = operand2.milliseconds();

        if (ms1 === ms2) {
            if (operand1.epsilon === operand2.epsilon) {
                return 0;
            } else {
                return (operand1.epsilon && !operand2.epsilon) ? -1 : 1;
            }
        } else {
            if (ms1 > ms2) {
                return 1;
            } else {
                return -1;
            }
        }
    },

    // Comparison convenience methods

    eq: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) === 0;
    },

    ne: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) !== 0;
    },

    gt: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) > 0;
    },

    gte: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) >= 0;
    },

    lt: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) < 0;
    },

    lte: function(operand1, operand2) {
        return JuttleMoment.compare(operand1, operand2) <= 0;
    },

    // Math

    // moment   + moment       -> **ILLEGAL**
    // moment   + duration     -> moment
    // duration + moment       -> moment
    // duration + duration     -> duration
    add: function(operand1, operand2) {
        if (!(operand1 instanceof JuttleMoment
            && operand2 instanceof JuttleMoment)) {
            throw new Error('Both operands must be JuttleMoments.');
        }
        var newMoment;

        function add_(dur, moment) {
            if (!dur.finite() && moment.finite()) {
                newMoment = new JuttleMoment(dur.milliseconds());
            } else {
                newMoment = new JuttleMoment({
                    moment: moment.moment.clone()
                });
                newMoment.moment.add(dur.duration);
            }
        }

        if (operand1.moment && operand2.duration) {
            add_(operand2, operand1);
        } else if (operand1.duration && operand2.moment) {
            add_(operand1, operand2);
        } else if (operand1.duration && operand2.duration) {
            newMoment = new JuttleMoment({
                duration: moment.duration(operand1.duration)
            });
            newMoment.duration.add(operand2.duration);
        } else {
            throw new Error('Cannot add moment to another moment.');
        }

        return newMoment;
    },

    // moment   - moment       -> duration
    // moment   - duration     -> moment
    // duration - moment       -> **ILLEGAL**
    // duration - duration     -> duration
    subtract: function(operand1, operand2) {
        if (!(operand1 instanceof JuttleMoment
            && operand2 instanceof JuttleMoment)) {
            throw new Error('Both operands must be JuttleMoments.');
        }
        var newMoment;

        if (operand1.moment && operand2.moment) {
            newMoment = new JuttleMoment({
                duration: moment.duration(operand1.moment.diff(operand2.moment))
            });
        } else if (operand1.moment && operand2.duration) {
            if (!operand2.finite() && operand1.finite()) {
                newMoment = new JuttleMoment(-1 * operand2.milliseconds());
            } else {
                newMoment = new JuttleMoment({
                    moment: operand1.moment.clone()
                });
                newMoment.moment.subtract(operand2.duration);
            }

        } else if (operand1.duration && operand2.duration) {
            newMoment = new JuttleMoment({
                duration: moment.duration(operand1.duration)
            });
            newMoment.duration.subtract(operand2.duration);
        } else {
            throw new Error('Cannot subtract a moment from a duration.');
        }

        return newMoment;
    },

    // number   * duration -> duration
    // duration * number   -> duration
    multiply: function(operand1, operand2) {
        var multiplier, dur ;
        if (_(operand1).isNumber() && operand2.duration) {
            multiplier = operand1 ;
            dur = operand2;
        } else if (operand1.duration && _(operand2).isNumber()) {
            multiplier = operand2 ;
            dur = operand1;
        } else {
            throw new Error('Invalid multiplication operands.');
        }
        var d = {months: multiplier * dur.duration._months,
                 days: multiplier * dur.duration._days,
                 milliseconds: multiplier * dur.duration._milliseconds};

        return new JuttleMoment({duration: moment.duration(d)});
    },

    // duration / duration -> number
    // duration / number   -> duration
    divide: function(operand1, operand2) {
        if (operand1.duration && operand2.duration) {
            return operand1.seconds() / operand2.seconds();
        }
        else if (operand1.duration && _(operand2).isNumber()) {
            return operand1.multiply(1 / operand2);
        }

        throw new Error('Invalid division operands.');
    },

    // duration % duration -> duration
    // number   % duration -> **ILLEGAL**
    // duration % number   -> **ILLEGAL**
    remainder: function(operand1, operand2) {
        if (operand1.duration && operand2.duration) {
            return JuttleMoment.duration(operand1.seconds() % operand2.seconds());
        }

        throw new Error('Invalid remainder operands.');
    },

    // -moment   -> **ILLEGAL**
    // -duration -> duration
    negate: function(operand) {
        if (!(operand instanceof JuttleMoment)) {
            throw new Error('Operand must be JuttleMoment.');
        }

        if (operand.duration) {
            return operand.multiply(-1);
        } else {
            throw new Error('Cannot negate moment.');
        }
    },

    max: function() {
        var moments = _(arguments).toArray();

        if (moments.length === 0) {
            return;
        }

        var maxMoment = moments[0];

        for (var i = 1; i < moments.length; i++) {
            if (moments[i].gt(maxMoment)) {
                maxMoment = moments[i];
            }
        }

        return maxMoment;
    },

    min: function() {
        var moments = _(arguments).toArray();

        if (moments.length === 0) {
            return;
        }

        var minMoment = moments[0];

        for (var i = 1; i < moments.length; i++) {
            if (moments[i].lt(minMoment)) {
                minMoment = moments[i];
            }
        }

        return minMoment;
    },

    is_calendar: function(time) {
        // momentjs implements a "calendar duration" by separately tracking months
        return (time.duration && time.duration._months !== 0);
    },

    is_mixed: function(time) {
        // is this a combined calendar and regular duration?
        return (time.duration && time.duration._months !== 0 &&
                (time.duration._days !== 0 || time.duration._milliseconds !== 0));
    },

    quantize: function(time, T, on) {
        // align the series with the moment 'on' by truncating
        // downwards such that the sequence (time + n*T) will
        // include 'on'. If on is not specified,
        // use the epoch.
        if (!(time instanceof JuttleMoment) || !T.duration) {
            throw new Error('Date.quantize() expects a Moment and a Duration as parameters.');
        }
        if (!on) {
            on = new JuttleMoment(0); // align to the epoch by default
        } else if (!on.moment) {
            throw new Error('Date.quantize() expects "on" to be a moment.');
        }
        if (T.is_mixed()) {
            throw new Error('Date.quantize doesn\'t accept mixed calendar intervals: '+T);
        } else if (!T.is_calendar()) {
            // for standard duruations, we quantize milliseconds
            var onms = on ? on.milliseconds() : 0;
            var q = new JuttleMoment((Math.floor((time.milliseconds() - onms) / T.milliseconds()) * T.milliseconds() + onms)/ 1000);
            if (q.moment.isSame(time.moment) && time.epsilon) {
                q = q.subtract(T);
            }
            return q;
        } else {
            // calendar durations involve separately tracked months.
            var dmonths = T.duration._months;
            var ma = time.moment.utc().toArray();
            var onm = on ? on.moment : moment.utc(0);
            var onma = onm.toArray();
            var months = (ma[0] - onma[0]) * 12 + ma[1] - onma[1];
            var qmonths = Math.floor(months / dmonths) * dmonths ;
            if (qmonths === months && time.epsilon) {
                qmonths -= dmonths;
            }
            var qmoment = onm.add(moment.duration({months:qmonths}));
            var jmoment = new JuttleMoment({moment:qmoment});
            if (jmoment.gt(time)) {
                // on was further into the month than time, so back up one
                jmoment = jmoment.subtract(T);
            }
            return jmoment;
        }
    },

    unix: function(moment) {
        // return seconds since the epoch for this moment.
        if (!moment.moment) {
            throw new Error('Date.unix() expects a Moment');
        }

        return moment.unix();
    },

    unixms: function(moment) {
        // return milliseconds since the epoch for this moment.
        if (!moment.moment) {
            throw new Error('Date.unixms() expects a Moment');
        }

        return moment.unixms();
    },

    elapsed: function(moment) {
        // return seconds elapsed since this moment.
        if (!moment.moment) {
            throw new Error('Date.elapsed() expects a Moment');
        }

        return Date.now()/1000.0 - moment.unix();
    },

    milliseconds: function(duration) {
        // convert duration to milliseconds. Not the same as momenentjs.milliseconds!
        if (!duration.duration) {
            throw new Error('Duration.milliseconds() expects a Duration');
        }

        return duration.milliseconds();
    },

    seconds: function(duration) {
        // convert duration to seconds. Not the same as momenentjs.seconds!
        if (!duration.duration) {
            throw new Error('Duration.seconds() expects a Duration');
        }

        return duration.seconds();
    },

    format: function(operand, format, tzstring) {
        if (operand.moment && (format || tzstring)) {
            if (tzstring) {
                // moment-timezone is not Americacentric enough, as it
                // does not include important abbreviations for our
                // zones.
                //
                // XXX this is a watermelon quickie. If you find
                // yourself modifying this list, it is officially time
                // to face the music and move it into the
                // moment-timezone database instead.
                tzstring = {
                    arizona:'US/Arizona',
                    az:'US/Arizona',
                    central:'US/Central',
                    cdt:'US/Central',
                    cst:'US/Central',
                    eastern:'US/Eastern',
                    edt:'US/Eastern',
                    est:'US/Eastern',
                    mountain:'US/Mountain',
                    mdt:'US/Mountain',
                    mst:'US/Mountain',
                    pacific:'US/Pacific',
                    pst:'US/Pacific',
                    pdt:'US/Pacific'
                }[tzstring.toLowerCase()] || tzstring;
                // tz() mutates the moment. clone it just to be safe.
                return operand.moment.clone().tz(tzstring).format(format);
            } else {
                return operand.moment.format(format);
            }
        } else if (operand.duration) {
            return operand.duration.format(format, {trim:false, forceLength:true});
        } else if (operand.moment || operand.duration) {
            return operand.valueOf();
        } else {
            throw new Error('format() expects a Duration or Moment');
        }
    },

    parse: function(s, format) {
        // parse a date string using momentjs's format-driven constructor.
        var m;
        if (typeof format === 'undefined') {
            var date = new Date(s);
            if (isNaN(date.valueOf())) {
                throw new Error('Unable to parse date:"'+s+'"');
            }
            return new JuttleMoment({rawDate:date});
        } else {
            m = moment.utc(s, format, true) ; // strict parsing
            if (!m.isValid()) {
                throw new Error('Unable to parse date:"'+s+'"');
            }
            return new JuttleMoment({moment:m});
        }
    },

    get: function(operand, timeunit) {
        if (!(operand instanceof JuttleMoment)) {
            throw new Error('Cannot get fields of non-JuttleMoment.');
        }
        if (operand.moment &&
            (timeunit === 'day' || timeunit === 'days' || timeunit === 'd')) {
            // for the lone command moment.get, "day" means day of week
            // and "date" means day of month. Hide this idiocy from juttle.
            timeunit = 'date';
        }
        var result = (operand.moment) ? operand.moment.get(timeunit) : operand.duration.get(timeunit);
        if (operand.moment &&
            (timeunit === 'month' || timeunit === 'months' || timeunit === 'M')) {
            // for moment.get, months are indexed from 0 rather than 1.
            // Hide this idiocy from our juttle.
            result += 1;
        }
        return result;
    },

    as: function(operand, timeunit) {
        if (!operand.duration) {
            throw new Error('duration.as wants a Duration');
        }
        return operand.duration.as(timeunit);
    },

    startOf: function(moment, timeunit) {
        // return a JuttleMoment truncated to the beginning of timeunit.
        // timeunit is one of momentjs's accepted timeunit strings,
        // year, month, day, hour, minute, second
        if (!moment.moment) {
            throw new Error('Date.startOf() wants a Moment.');
        }
        return moment.startOf(timeunit);
    },

    endOf: function(moment, timeunit) {
        // return a JuttleMoment truncated to the beginning of timeunit.
        // timeunit is one of momentjs's accepted timeunit strings,
        // year, month, day, hour, minute, second
        if (!moment.moment) {
            throw new Error('Date.endOf() wants a Moment.');
        }
        return moment.endOf(timeunit);
    },

    valueOf: function(operand) {
        if (!(operand instanceof JuttleMoment)) {
            throw new Error('Cannot get value of non-JuttleMoment.');
        }

        return operand.valueOf();
    },
    momentString: function(moment) {
        if (isNaN(moment.valueOf())) {
            return moment._i.toString();
        } else {
            return moment.toDate().toISOString();
        }
    },
    simpleDurationString: function(d) {
        // format a simple duration that can be represented as N * units
        if (d._milliseconds === 0 && d._days === 0 && d._months === 0) {
            return null; // let the HMS formatter do zero
        } else if (Math.abs(d._milliseconds + d._days + d._months) === Infinity) {
            return (d._milliseconds + d._days + d._months).toString() ;
        } else if (d._milliseconds === 0 && d._days === 0) {
            return d._months+'M';
        } else if (d.days() === d.as('d')) {
            return d.days()+'d';
        } else {
            return null;
        }
    },
    durationString: function(d) {
        var simple = JuttleMoment.simpleDurationString(d);
        if (simple) {
            return simple;
        }
        // Return a duration in the format DD.hh:mm:ss.ms (DD. is
        // optional) for a time-based duration, and MM/DD.hh:mm:ss.ms
        // for a calendar-based duration (whose month units will
        // be added/subtracted independently of the additional
        // time-based units in subsequent calculations).
        // in momentjs's duration representation, truth is in _months,
        // _days, and _milliseconds.
        var s = '';
        if (d._months) {
            s += d._months + '/';
        }
        // roll up _milliseconds and _days like momentjs _bubble, but
        // stop at days so months remain a pure calendar offset, and
        // allow negative _days to affect lesser units so days always
        // has same sign as lesser units.
        var as_milliseconds = d._milliseconds + d._days * 86400000;
        if (as_milliseconds < 0) {
            s += '-';
            as_milliseconds = -1 * as_milliseconds;
        }
        as_milliseconds = Math.floor(as_milliseconds + 0.1);
        var as_seconds = Math.floor(as_milliseconds / 1000);
        var as_minutes = Math.floor(as_seconds / 60);
        var as_hours = Math.floor(as_minutes / 60);
        var as_days = Math.floor(as_hours / 24);
        if (as_days !== 0 || d._months !== 0) {
            s += as_days + '.';
        }
        s += ('0' + as_hours % 24).slice(-2);
        s += ':' + ('0' + as_minutes % 60).slice(-2);
        s += ':' + ('0' + as_seconds % 60).slice(-2);
        s += '.' + ('00' + as_milliseconds % 1000).slice(-3);
        return s;
    }
});

module.exports = JuttleMoment;
