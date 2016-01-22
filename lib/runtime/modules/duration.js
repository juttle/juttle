'use strict';

/* Implementation of Juttle built-in Duration module. */

var errors = require('../errors');
var values = require('../values');
var JuttleMoment = require('../../moment').JuttleMoment;

var duration = {
    as: function(duration, unit) {
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Duration.as', 'duration', duration);
        }
        if (!values.isString(unit)) {
            throw errors.typeErrorFunction('Duration.as', 'string', unit);
        }

        return JuttleMoment.as(duration, unit);
    },

    format: function(duration, format) {
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Duration.format', 'duration', duration);
        }

        return JuttleMoment.format(duration, format);
    },

    get: function(duration, unit) {
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Duration.get', 'duration', duration);
        }
        if (!values.isString(unit)) {
            throw errors.typeErrorFunction('Duration.get', 'string', unit);
        }

        return JuttleMoment.get(duration, unit);
    },

    milliseconds: function(duration) {
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Duration.milliseconds', 'duration', duration);
        }

        return JuttleMoment.milliseconds(duration);
    },

    new: function(seconds) {
        if (!values.isNumber(seconds) && !values.isString(seconds)) {
            throw errors.typeErrorFunction('Duration.new', 'number or string', seconds);
        }

        return JuttleMoment.duration(seconds);
    },

    seconds: function(duration) {
        if (!values.isDuration(duration)) {
            throw errors.typeErrorFunction('Duration.seconds', 'duration', duration);
        }

        return JuttleMoment.seconds(duration);
    },

    toString: function(value) {
        if (!values.isDuration(value)) {
            throw errors.typeErrorFunction('Duration.toString', 'duration', value);
        }

        return value.valueOf();
    }
};

module.exports = duration;
