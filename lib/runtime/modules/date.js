'use strict';

/* Implementation of Juttle built-in Date module. */

var errors = require('../errors');
var juttleErrors = require('../../errors');
var values = require('../values');
var JuttleMoment = require('../../runtime/types/juttle-moment');

var date = {
    elapsed: function(date) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.elapsed', 'date', date);
        }

        return JuttleMoment.elapsed(date);
    },

    endOf: function(date, unit) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.endOf', 'date', date);
        }
        if (!values.isString(unit)) {
            throw errors.typeErrorFunction('Date.endOf', 'string', unit);
        }

        return JuttleMoment.endOf(date, unit);
    },

    format: function(date, format, tzstring) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.format', 'date', date);
        }
        if (typeof format !== 'undefined' && format !== null && !values.isString(format)) {
            throw errors.typeErrorFunction('Date.format', 'string', format);
        }
        if (typeof tzstring !== 'undefined' && !values.isString(tzstring)) {
            throw errors.typeErrorFunction('Date.format', 'string', tzstring);
        }

        return JuttleMoment.format(date, format, tzstring);
    },

    formatTz: function(date, tzstring) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.formatTz', 'date', date);
        }
        if (typeof tzstring !== 'undefined' && !values.isString(tzstring)) {
            throw errors.typeErrorFunction('Date.formatTz', 'string', tzstring);
        }

        return JuttleMoment.format(date, null, tzstring);
    },

    parse: function(s, format) {
        if (!values.isString(s)) {
            throw errors.typeErrorFunction('Date.parse', 'string', s);
        }
        if (typeof format !== 'undefined' && !values.isString(format)) {
            throw errors.typeErrorFunction('Date.parse', 'string', format);
        }

        try {
            return JuttleMoment.parse(s, format);
        } catch (e) {
            throw juttleErrors.runtimeError('DATE-PARSE-ERROR', {
                s: s
            });
        }
    },

    get: function(date, unit) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.get', 'date', date);
        }
        if (!values.isString(unit)) {
            throw errors.typeErrorFunction('Date.get', 'string', unit);
        }

        return JuttleMoment.get(date, unit);
    },

    new: function(seconds) {
        if (!values.isNumber(seconds) && !values.isString(seconds)) {
            throw errors.typeErrorFunction('Date.new', 'number or string', seconds);
        }

        try {
            return new JuttleMoment(seconds);
        } catch (e) {
            throw juttleErrors.runtimeError('DATE-PARSE-ERROR', {
                s: seconds
            });
        }
    },

    time: function() {
        return JuttleMoment.now();
    },

    quantize: function(date, duration) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.quantize', 'date', date);
        }
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Date.quantize', 'duration', duration);
        }

        return JuttleMoment.quantize(date, duration);
    },

    startOf: function(date, unit) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.startOf', 'date', date);
        }
        if (!values.isString(unit)) {
            throw errors.typeErrorFunction('Date.startOf', 'string', unit);
        }

        return JuttleMoment.startOf(date, unit);
    },

    toString: function(value) {
        if (!values.isDate(value)) {
            throw errors.typeErrorFunction('Date.toString', 'date', value);
        }

        return values.toString(value);
    },

    unix: function(date) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.unix', 'date', date);
        }

        return JuttleMoment.unix(date);
    },

    unixms: function(date) {
        if (!values.isDate(date)) {
            throw errors.typeErrorFunction('Date.unixms', 'date', date);
        }

        return JuttleMoment.unixms(date);
    }
};

module.exports = date;
