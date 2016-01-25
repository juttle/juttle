'use strict';

var _ = require('underscore');
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var parser = require('../../lib/parser');

describe('Juttle Moments tests', function() {

    it('distinguishes between value and duration for parameters', function() {
        return parser.parse('emit -from :now: -for :00:00:10: -hz 1 | view result')
            .then(function(ast) {
                expect(ast.elements[0].elements[0].options[0].expr.type).to.equal('MomentLiteral');
                expect(ast.elements[0].elements[0].options[1].expr.type).to.equal('DurationLiteral');
            });
    });

    it('parses moment in proc call', function() {
        return parser.parse('sub testProc(m) {'
                                +'emit -from m -hz 1000 -limit 10'
                            +'}'
                            +'testProc -m :now: | view result');
    });

    it('parses moment in const assignment', function() {
        return parser.parse('const m = :now:;'
            +'emit | view result');
    });

    it('parses moment in variable assignment', function() {
        return parser.parse('function f() {var m = :now:;}'
            +'emit | view result');
    });

    it('parses moment in function call', function() {
        return parser.parse('const m;'
            +'function testFunction(_m) {'
            +'m = _m;'
            +'}'
            +'testFunction -m :now:  | view result');
    });

    it('parses moment in filter equality expression', function() {
        return parser.parse('read test | filter time = :now: | view result');
    });

    it('parses moment in filter inequality expression', function() {
        return parser.parse('read test | filter time > :now: | view result');
    });

    it('runs moment in filter inequality expression', function() {
        return check_juttle({
            program: 'const start = :now: - :2 seconds:; emit -from start -hz 1000 -limit 10 | filter time < :now: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
        });
    });

    it('parses moment in put expression', function() {
        return parser.parse('read test | put foo = :now: | view result');
    });

    it('runs moment in put expression', function() {
        var now = new Date();
        var ts = now.getTime();

        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :'+ now.toISOString() +': | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(new Date(point.foo).getTime()).to.equal(ts);
            });
        });
    });

    // Moment Addition

    it('moment + moment -> **ILLEGAL**', function() {
        var now = new Date();

        return check_juttle({
            program: 'function f(x) { return :'+ now.toISOString() +': + :'+ now.toISOString() +':;}' +
                'emit -from :now: -hz 1000 -limit 1 | put foo = f(x) | view result'
        })
        .then(function(res) {
            expect(res.warnings).to.have.length(1);
        });
    });

    it('moment + duration -> moment', function() {
        var now = new Date();

        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :'+ now.toISOString() +': + : 00:10:00 : | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(new Date(point.foo).getTime()).to.equal(now.getTime() + 600000);
            });
        });
    });

    it('duration + moment -> moment', function() {
        var now = new Date();

        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:10:00: + :'+ now.toISOString() +': | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(new Date(point.foo).getTime()).to.equal(now.getTime() + 600000);
            });
        });
    });

    it('duration + duration -> duration', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:10:00: + :00:00:30.123: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:10:30.123');
            });
        });
    });

    // Moment Subtraction

    it('moment - moment -> duration (positive)', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :2014-09-08T18:30:00.000Z: - :2014-09-08T18:00:00.000Z: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:30:00.000');
            });
        });
    });

    it('moment - moment -> duration (negative)', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :2014-09-08T18:00:00.000Z: - :2014-09-08T18:30:00.000Z: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('-00:30:00.000');
            });
        });
    });

    it('moment - duration -> moment', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :2014-09-08T18:30:00.000Z: - :00:10:00: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(new Date(point.foo).getTime()).to.equal(new Date('2014-09-08T18:30:00.000Z').getTime() - 600000);
            });
        });
    });

    it('duration - moment -> **ILLEGAL**', function() {
        return check_juttle({
            program: 'function f(x) { return :00:10:00: - :2014-09-08T18:30:00.000Z:;} ' +
                'emit -from :now: -hz 1000 -limit 1 | put foo = f(x) | view result'
        })
        .then(function(res) {
            expect(res.warnings).to.have.length(1);
        });
    });

    it('duration - duration -> duration (positive)', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:10:00: - :00:05:00: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:05:00.000');
            });
        });
    });

    it('duration - duration -> duration (negative)', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:05:00: - :00:10:00: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('-00:05:00.000');
            });
        });
    });

    it('number * duration -> duration', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = 5 * :00:00:05: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:00:25.000');
            });
        });
    });

    it('duration * number -> duration', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:00:05: * 5 | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:00:25.000');
            });
        });
    });

    it('duration / duration -> number', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:00:05: / :00:00:05: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal(1);
            });
        });
    });

    it('duration / number -> duration', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:00:05: / 5 | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:00:01.000');
            });
        });
    });

    it('duration % duration -> duration', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 10 | put foo = :00:00:05.123: % :00:00:05: | view result'
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(10);
            _(res.sinks.result).each(function(point) {
                expect(point.foo).to.equal('00:00:00.123');
            });
        });
    });

    // special moment and duration functions via momentjs

    it('Date.startOf("day")', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put today = Date.startOf(:2014-01-01T13:45:00Z:, "day") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].today).to.equal('2014-01-01T00:00:00.000Z');
        });
    });

    it('Date.endOf("day")', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put eom = Date.endOf(:2014-01-01T13:45:00Z:, "month") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].eom).to.equal('2014-01-31T23:59:59.999Z');
        });
    });

    it('date.unix', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put zero = Date.unix(Date.new(0)), hunnerd = Date.unix(Date.new(100)) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].zero).to.equal(0);
            expect(res.sinks.result[0].hunnerd).to.equal(100);
        });
    });

    it('date.elapsed', function() {
        return check_juttle({
            program: 'const start=:now: - Duration.new(60) ; emit -hz 100 -limit 2 | put delta = Date.elapsed(start) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[1].delta).gt(60);
            expect(res.sinks.result[1].delta).lt(70);
        });
    });

    it('moment.format, default', function() {
        return check_juttle({
            program: 'emit -hz 1000  -limit 1 | put foo=Date.format(:2014-01-01:), len=String.length(#foo) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].len).to.equal(24);
        });
    });

    it('moment.format, with format', function() {
        return check_juttle({
            program: 'emit -hz 1000  -limit 1 | put foo=Date.format(:2014-01-01:, "MMMM D0, YYYY") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].foo).to.equal('January 10, 2014');
        });
    });

    it('moment.get', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put dur=:2014-10-01:, ten=Date.get(dur, "month"), one=Date.get(dur, "day") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].ten).to.equal(10);
            expect(res.sinks.result[0].one).to.equal(1);
        });
    });

    it('duration.get', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put dur=:8 days:+:09:10:11.123:, ten=Duration.get(dur, "minutes"), eight=Duration.get(dur, "days") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].ten).to.equal(10);
            expect(res.sinks.result[0].eight).to.equal(8);
        });
    });

    it('duration.as.seconds', function() {
        return check_juttle({
            program: 'emit -hz 1000 -limit 1 | put secs=Duration.as(:09:10:11.123:, "seconds") | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].secs).to.equal(33011.123);
        });
    });

    // Programmatic Dates/Durations

    it('Date.new(5)', function() {
        return check_juttle({
            program: 'emit -limit 1 | put foo = Date.new(5) | view result'
        })
        .then(function(res) {
            expect(new Date(res.sinks.result[0].foo).getTime()).to.equal(5000);
        });
    });

    it('fails Date.new("blah")', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 1 | put foo = Date.new("blah") | view result'
        })
        .then(function(res) {
            expect(res.errors[0]).to.equal('Unable to parse: blah');
        })
        .catch(function(err) {
            expect(err.message).equal('Unable to parse: blah');
        });
    });

    it('Duration.new(5)', function() {
        return check_juttle({
            program: 'emit -limit 1 | put foo = Duration.new(5) | view result'
        })
            .then(function(res) {
                expect(res.sinks.result[0].foo).to.equal('00:00:05.000');
            });
    });

    it('fails Duration.new("blah")', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 1 | put foo = Duration.new("blah") | view result'
        })
        .then(function(res) {
            expect(res.errors[0]).to.equal('Unable to parse as formatted duration: blah');
        })
        .catch(function(err) {
            expect(err.message).equal('Unable to parse as formatted duration: blah');
        });
    });

    it('Date.quantize(Date.now(), Duration.new(5))', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 1 | put foo = Date.quantize(Date.time(), Duration.new(5)) | view result'
        })
            .then(function(res) {
                expect(res.errors).to.have.length(0);
            });
    });

    it('fails Date.quantize(Date.now(), 5)', function() {
        return check_juttle({
            program: 'emit -from :now: -hz 1000 -limit 1 | put foo = Date.quantize(Date.time(), 5) | view result'
        })
        .then(function(res) {
            expect(res.warnings[0]).to.equal('Invalid argument type for \"Date.quantize\": expected duration, received number (5).');
        });
    });

    it('parse errors are caught at parse time', function() {
        return check_juttle({
            program: 'emit -limit 1 | put moment=:1 day ago and 1 day ago: | view table'
        })
        .then(function(res) {
            throw new Error('should have failed');
        })
        .catch(function(err) {
            expect(err.name).equal('SyntaxError');
        });
    });
});
