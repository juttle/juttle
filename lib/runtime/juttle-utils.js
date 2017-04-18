'use strict';

var _ = require('underscore');
var ops = require('./ops');
var values = require('./values');
var errors = require('../errors');
var JuttleMoment = require('../runtime/types/juttle-moment');

function makeDate(time) {
    if (time instanceof Date) { return time; }

    return new Date(time);
}

//@deprecated
function toNative(records, epsilon) {
    _.each(records, function(record) {
        // check if we already called toNative on these points
        // that may happen if we have multiple live programs on the same points
        if (record.time !== undefined && !(record.time instanceof JuttleMoment)) {
            var date = makeDate(record.time);
            if (date.getTime() === date.getTime()) { // speedy check for invalid date, to make sure its getTime() isn't NaN
                record.time = new JuttleMoment({rawDate: date});
            } else {
                record.time = new JuttleMoment(record.time);
            }

            if (epsilon) {
                record.time.epsilon = epsilon;
            }
        }
    });

    return records;
}

// Assigns the time from timeField to 'time' and attempts to convert it
// into JuttleMoment
//
// If not specified, timeField defaults to 'time'. If specified and point
// is missing that field, emits a warning using the supplied context.
//@deprecated
function parseTime(points, timeField, context) {
    _.each(points, function(pt) {
        if (timeField && !pt[timeField]) {
            context.trigger('warning', new errors.runtimeError('POINT-MISSING-TIME', {field: timeField}));
        }

        var time = pt[timeField || 'time'];
        if (time) {
            pt.time = time;
            if (timeField !== 'time') {
                delete pt[timeField];
            }
        }
    });

    toNative(points);

    return points;
}

function filterPoints(points, from, to) {
    return _.filter(points, function(point) {
        if (point.time && point.time.moment) {
            return point.time.gte(from) && point.time.lt(to);
        } else {
            return true;
        }
    });
}


function _setTimeField(pt, timeField, context) {
    if (timeField) {
        if (!pt[timeField]) {
            if (context.trigger) {
                context.trigger('warning', new errors.runtimeError('POINT-MISSING-TIME', {field: timeField}));
            }
        } else if (timeField !== 'time') {
            pt.time = pt[timeField];
            delete pt[timeField];
        }
    }
}

function _ensureJuttleMoment(pt, epsilon, context) {
    if (pt.time !== undefined && !(pt.time instanceof JuttleMoment)) {
        var date = makeDate(pt.time);
        if (date.getTime() === date.getTime()) { // speedy check for invalid date, to make sure its getTime() isn't NaN
            pt.time = new JuttleMoment({rawDate: date});
        } else {
            try {
                pt.time = new JuttleMoment(pt.time);
            } catch(e) {
                if (context.trigger) {
                    context.trigger('warning', new errors.runtimeError('INVALID-TIME-ERROR', {time: pt.time}));
                }
                return null;
            }
        }

        if (epsilon) {
            pt.time.epsilon = epsilon;
        }
    }
    return pt;
}

// Assigns the time from timeField to 'time' and attempts to convert it
// into JuttleMoment
//
// If not specified, timeField defaults to 'time'. If specified and point
// is missing that field, emits a warning using the supplied context.
function toNativeTime(points, options, context) {
    options = options || {};

    points = _.map(points, (pt) => {
        _setTimeField(pt, options.timeField, context);
        return _ensureJuttleMoment(pt, options.epsilon, context);
    });
    return _.compact(points);
}

function fromNative(records) {
    return _.map(records, values.toJSONCompatible, values);
}

function isInteger(x) {
    return (_.isFinite(x)) && (x % 1 === 0);
}

function pointSortFunc(field, direction) {
    // given a field name, return a function that can be passed to
    // Array.sort to order points by the field.
    // if optional direction === 'desc', sort in reverse order.
    return function(first, second) {
        var a = first[field];
        var b = second[field];
        var fieldCompare;

        if (a === undefined && b === undefined) {
            fieldCompare = 0;
        } else if (a === undefined && b !== undefined) {
            fieldCompare = 1;
        } else if (a !== undefined && b === undefined) {
            fieldCompare = -1;
        } else if (_.isString(a) && _.isString(b)) {
            fieldCompare = a.toLowerCase().localeCompare(b.toLowerCase());
        } else if (a instanceof JuttleMoment) {
            fieldCompare = JuttleMoment.subtract(a, b).milliseconds();
        } else if (values.isArray(a)) {
            fieldCompare = ops.gt(a, b) ? 1 : -1;
        } else {
            fieldCompare = a - b;
        }
        if (direction === 'desc') {
            fieldCompare *= -1;
        }
        return fieldCompare;
    };
}

module.exports = {
    isInteger: isInteger,
    toNative: toNative,
    fromNative: fromNative,
    filterPoints: filterPoints,
    parseTime: parseTime,
    toNativeTime: toNativeTime,
    pointSortFunc: pointSortFunc
};
