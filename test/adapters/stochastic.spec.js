'use strict';

// unit tests for stochastic adapter
// stochastic is an adapter, but its named sources are based at
// ../../stoke/<source-name>.js

var _ = require('underscore');
var juttle_test_utils = require('../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;

describe('stochastic adapter options', function() {

    it('complains about mixed-up from/to', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -from :2012-01-02: -to :2012-01-01: ' +
             '| view text')
        }).then(function(res) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.message).to.equal('-to must not be earlier than -from');
        });
    });

    it('supports starting at :beginning:', function() {
        return check_juttle({
            program: 'read stochastic -from :beginning: '+
                     '-to :1970-01-01T00:00:10.000Z: ' +
                     '| reduce count() | view text'
        })
        .then(function(res) {
            expect(res.sinks.text[0]).deep.equal({count: 238});
        });
    });

    // a series of source cdn tests with various ways of specifying
    // the options will all produce these same results
    var hosts = [
        {'host':'nyc.2'},
        {'host':'sea.0'},
        {'host':'sjc.1'}
    ];
    it('accepts a named source and proc options',function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 3'+
             ' -from :2012-01-01: -to :2012-01-01T00:00:10: | keep host | sort host | reduce by host | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal(hosts);
        });
    });
    it('accepts a source config object',function() {
        return check_juttle({
            program:
            ('read stochastic -source {name:"cdn", nhosts:3}'+
             ' -from :2012-01-01: -to :2012-01-01T00:00:10: | keep host | sort host | reduce by host | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal(hosts);
        });
    });
    it('accepts a source config object in a variable',function() {
        return check_juttle({
            program:
            ('const config = {name:"cdn", nhosts:3};'+
             'read stochastic -source config'+
             ' -from :2012-01-01: -to :2012-01-01T00:00:10: | keep host | sort host | reduce by host | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal(hosts);
        });
    });
    it('allows adapter options to override options in a source config object',function() {
        return check_juttle({
            program:
            ('read stochastic -source {name:"cdn", nhosts:1}'+
             ' -nhosts 3'+
             ' -from :2012-01-01: -to :2012-01-01T00:00:10: | keep host | sort host | reduce by host | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal(hosts);
        });
    });
});

describe('stochastic -source "cdn"', function() {
    it('emits each kind of expected metric in a historic query', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -every :minute: -from :2014-01-01: -to :2014-01-01T00:01:00: -type "metric" '+
             '| keep name | sort name | reduce by name | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal([
                {'name':'cpu'},
                {'name':'disk'},
                {'name':'requests'},
                {'name':'response_ms'},
                {'name':'responses'},
            ]);
        });
    });
    it('events emits each kind of expected event in a historic query', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" '+
             ' -from :2014-01-01: -to :2014-01-01T00:01:00: source_type=="event"'+
             '| keep name | sort name | reduce by name | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal([
                {'name':'server_error'},
                {'name':'syslog'}
            ]);
        });
    });

    // The new adapter behavior doesn't actually work in the same way with a
    // finite -to in the future.
    //
    // Disable this test for now.
    it.skip('emits metrics in historic+realtime, with quantization of -from and finer realtime stepping', function() {
        // cdn emits a metric whenever we ask. this is actually a nasty little test for the stepper.
        return check_juttle({
            program:
            ('const start=Date.quantize(:now:, :2 seconds:);'+
             'read stochastic -source "cdn" -nhosts 1 -every :2 seconds: -to (start + :2 seconds:)'+
             ' -from (start - :2 seconds:) source_type=="metric" name=="cpu"  | put delta= time - start | '+
             'keep delta | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal([
                {'delta':'-00:00:02.000'},
                {'delta':'00:00:00.000'},
                {'delta':'00:00:02.000'}
            ]);
        });
    });
    it('has a DOS agent if we configure it', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -every :minute: -dos 1.0 -dos_id "demmer" '+
             ' -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| keep cust_id | sort cust_id | uniq | view text')
        }).then(function(res) {
            var n = res.sinks.text.length;
            expect(res.sinks.text[n-1].cust_id).to.equal('demmer');
        });
    });
    it('has no DOS agent if we disable it', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -every :minute: -dos 0 -dos_id "demmer" '+
             ' -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| keep cust_id | sort cust_id | uniq | view text')
        }).then(function(res) {
            var n = res.sinks.text.length;
            expect(res.sinks.text[n-1].cust_id).to.not.equal('demmer');
        });
    });
    it('lets us configure hostnames', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -every :minute: -host_names ["bleat", "blort", "freen"] '+
             ' -from :2014-01-01: -to :2014-01-01T00:01:00: source_type="metric"'+
             '| keep host | sort host | reduce by host | view text')
        }).then(function(res) {
            expect(res.sinks.text).to.deep.equal([
                {'host':'bleat'},
                {'host':'blort'},
                {'host':'freen'}
            ]);
        });
    });
    it('lets us change error probabilities', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -every :minute: -statusp {500:0.75, 503:0.25} '+
             ' -from :2014-01-01: -to :2014-01-01T00:01:00: name="server_error" '+
             '| reduce n=count() by code | keep code,n | sort n '+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].code).to.equal('503');
            expect(res.sinks.text[1].code).to.equal('500');
        });
    });
    it('lets us control average syslog rate', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 1 -syslog_lpm 10 -syslog_max_lpm 0  '+
             '-last :hour: name="syslog" '+
             '| reduce count() | view text')
        }).then(function(res) {
            expect(res.sinks.text[0].count).at.least(500).at.most(700);
        });
    });
    it('lets us control peak syslog rate', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 1 -dos 1.0 -syslog_lpm 0 -syslog_thresh 0 -syslog_max_lpm 10  '+
             '-last :h: name="syslog" '+
             '| reduce count() | view text')
        }).then(function(res) {
            expect(res.sinks.text[0].count).at.least(500);
        });
    });
    it('lets us throttle runaway syslogs', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 1 -syslog_max_lines 10 -syslog_lpm 10  '+
             ' -from :2012-01-01: -to :2012-01-01T01:00:00: name="syslog" '+
             '| reduce count() | view text')
        }).then(function(res) {
            expect(res.sinks.text[0].count).to.equal(10);
            expect(res.warnings[0]).to.equal(
                'too many logs from sea.0, throttling');
        });
    });
    it('lets us disable the runaway syslog throttle', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 1 -syslog_max_lines 0 -syslog_lpm 100  '+
             ' -from :2012-01-01: -to :2012-01-01T00:01:00: name="syslog" '+
             '| reduce count() | view text')
        }).then(function(res) {
            expect(res.sinks.text[0].count).at.least(1);
            expect(res.warnings.length).to.equal(0);
        });
    });
    it('doesnt throttle live syslogs', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -from :now: -to :1 second from now: -syslog_max_lines 1 -syslog_lpm 1000 name="syslog" '+
             '| reduce count() | view text')
        }).then(function(res) {
            expect(res.sinks.text[0].count).at.least(1);
        });
    });
    it('properly bounds cpu', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -dos .5 '+
             '-last :day: source_type=="metric" name=="cpu"'+
             '| reduce max = max(value), min = min(value) '+
             '| put winning = (min >= 0 && max <= 1.0) '+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].winning).true;
        });
    });
    it('lets us add a dc term to cpu', function() {
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -nhosts 1 -daily 0 -index_demand 0 -authentication_demand 0 -cpu_dc 0.22 '+
             '-last :day: source_type=="metric" name=="cpu"'+
             '| reduce max(value), min(value) '+
             '| put winning = (min == max) '+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].winning).true;
        });
    });
    it('lets us control the cpu CV', function() {
        return check_juttle({
            // XXX remote chance of a false negative for any given
            // interval, but we cheat death by fixing the interval.
            program:
            ('( read stochastic -source "cdn" -daily 0 -auth_demand 0 -index_demand 0.5 -cpu_cv .01 -cpu_dc 0 '+
             ' -from :2012-01-01: -to :2012-01-02: source_type=="metric" name=="cpu" '+
             '| put value0 = value '+
             '; read stochastic -source "cdn" -daily 0 -auth_demand 0 -index_demand 0.5 -cpu_cv 1 -cpu_dc 0 '+
             ' -from :2012-01-01: -to :2012-01-02: source_type=="metric" name=="cpu" '+
             '| put value1 = value '+
             ')| join '+
             '| reduce max1 = max(value1), min1 = min(value1), max0 = max(value0), min0 = min(value0)'+
             '| put winning = (min1 < min0 && max0 < max1) '+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].winning).true;
        });
    });
    it('lets us add ripple variation to demand', function() {
        // ripple will vary around 0 with amplitude given by -ripple
        return check_juttle({
            program:
            ('read stochastic -source "cdn" -debug 1 -nhosts 1 -daily 0 -index_demand 0 -authentication_demand 0 -ripple .5 -ripple_alpha 1.0 '+
             ' -from :2013-01-01: -to :2013-01-02: name=="host.demand" '+
             '| reduce max(value), min(value) '+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].max).to.equal(0.25);
            expect(res.sinks.text[0].min).to.equal(-0.25);
        });
    });
    it('gracefully shifts from historic to realtime after a big over-step', function() {
        return check_juttle({
            program:
            ('const qnow = Date.quantize(:now:,:3 second:);'+
             ' read stochastic -source "cdn" -nhosts 1 -every :1.5 seconds: -to :1 seconds from now:' +
             ' -from :12 seconds ago: source_type=="metric" name=="cpu" '+
             '| put dt=Duration.seconds(time - qnow)| keep dt | view text')
        }).then(function(res) {
            var dt = _.pluck(res.sinks.text, 'dt');
            expect(dt[1] - dt[0]).to.equal(1.5);
            // the final step is a messy one to -to, but before that
            // it should be clean 1-sec steps.
            expect(dt[dt.length-2] - dt[dt.length-3]).to.equal(1.5);
        });
    });
});

describe('stochastic -source "logs"', function() {
    it('live syslog logType produces something', function() {
        // PROD-4424, add plumbing to make random numbers
        // time-insensitive for some tests, so this is reliable.
        return check_juttle({
            program:
            ('read stochastic -source "logs" -logType "syslog" -lpm 3600 -to :second from now:  | view text')
        }).then(function(res) {
            expect(res.sinks.text.length).at.least(1) ; // want 60!
            expect(res.sinks.text[0].name).to.equal('syslog');
            for (var i = 0 ; i < res.sinks.text.length ; i++) {
                // smallest message is "Failed." see lib/runtime/procs/stoke/data/syslog-info-patterns.js
                // at line 2 which has this possible message
                expect(res.sinks.text[i].message.length).at.least(7);
            }
        });
    });
    it('historic syslog logType produces something', function() {
        return check_juttle({
            program:
            ('read stochastic -source "logs" -logType "syslog"  -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text.length).at.least(1) ; // want 60!
            expect(res.sinks.text[0].name).to.equal('syslog');
            for (var i = 0 ; i < res.sinks.text.length ; i++) {
                expect(res.sinks.text[i].message.length).at.least(10);
            }
        });
    });
    it('default source logType is syslog', function() {
        return check_juttle({
            program:
            ('read stochastic -source "logs" -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].name).to.equal('syslog');
        });
    });
    it('pix source logType produces something', function() {
        return check_juttle({
            program:
            ('read stochastic -source "logs" -logType "pix" -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].name).to.equal('pix');
        });
    });
    it('git source logType produces something', function() {
        return check_juttle({
            program:
            ('read stochastic -source "logs" -logType "git"  -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].name).to.equal('git');
        });
    });
    it('osx source logType produces something', function() {
        return check_juttle({
            program:
            ('read stochastic -source "logs" -logType "osx"  -from :2014-01-01: -to :2014-01-01T00:01:00:'+
             '| view text')
        }).then(function(res) {
            expect(res.sinks.text[0].name).to.equal('osx');
        });
    });
    it('emits points continously to the live stream', function() {
        return check_juttle({
            program: 'read stochastic -to :end: -source "cdn" -every :1s: ' +
                '| reduce -every :1s: count()' +
                '| view result',

        }, 2000).then(function(res) {
            expect(res.errors).to.have.length(0);
            expect(res.warnings).to.have.length(0);
            _.each(res.sinks.result, function(point) {
                expect(point.time).to.not.be.undefined();
                expect(point.count).to.greaterThan(0);
            });
        });
    });
});
