'use strict';

var _ = require('underscore');

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var get_times = juttle_test_utils.get_times;

var expect = require('chai').expect;


var simpleData = require('./specs/input/simple');
var simpleEvents = get_times(require('./specs/input/simple-events'));
var simple_value_field_no_timestamp = get_times(require('./specs/input/simple-value-field-no-timestamp'));

describe('Juttle procs tests', function() {

    describe('Merge Node', function() {
        it('merges a single stream', function() {
            return check_juttle({
                program: ' emit -from Date.new(0) -hz 1000 -limit 10 | view result'
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
                expect(res.sinks.result[0].time).to.equal('1970-01-01T00:00:00.000Z');
                expect(res.sinks.result[9].time).to.equal('1970-01-01T00:00:00.009Z');
            });
        });
        it('merges two identical historical streams', function() {
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(0) -limit 10 | put id=1  ',
                    '; emit  -hz 1000 -from Date.new(0) -limit 10 | put id=2) ',
                    '| view result'
                ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('merges two identical historical streams (with trailing semicolons)', function() {
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(0) -limit 10 | put id=1;',
                    'emit  -hz 1000 -from Date.new(0) -limit 10 | put id=2;) ',
                    '| view result;'
                ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('merges two identical realtime streams', function() {
            var program = 'const start=:now:;'
                + '(emit  -hz 1000 -from start -limit 10; '
                + 'emit  -hz 1000 -from start -limit 10) | view result';
            return check_juttle({
                program: program
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                var start = new Date(res.sinks.result[0].time).getTime();
                for (var i = 1 ; i < 20 ; i ++) {
                    var expected = new Date(start + Math.floor(i/2)).toISOString();
                    expect(res.sinks.result[i].time).to.equal(expected);
                }
            });
        });
        it('merges two interleaved historical streams', function() {
            return check_juttle({
                program: ['( emit  -hz 100 -from Date.new(0) -limit 10 ',
                          '; emit  -hz 100 -from Date.new(.005) -limit 10)',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(i*5).toISOString());
                }
            });
        });
        it('propagates historic points across a split/join', function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('propagates realtime points across a split/join',function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('propagates batched historical points across a split/join', function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| batch 0.002 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  reduce four=count() ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(5);
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(result[i].four).to.equal(4);
                }
            });
        });
        it('propagates batched realtime points across a split/join',function() {
            // round start time up to a 2 second boundary
            var start = 2 * Math.ceil(Date.now()/2);
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 10 ',
                          '| batch 0.002 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  reduce four=count() ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(5);
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(result[i].four).to.equal(4);
                }
            });
        });
        it('merges two interleaved realtime streams', function() {
            var start = Date.now();
            return check_juttle({
                program: ['( emit  -hz 100 -from Date.new(' + start/1000 + ') -limit 10 ',
                          '; emit  -hz 100 -from Date.new(' + (start+5)/1000 + ') -limit 10)',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                var start = new Date(res.sinks.result[0].time).getTime();
                for (var i = 1 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(start + i*5).toISOString());
                }
            });
        });
        it('handles streams longer than 2 procs each (2411)', function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| (put a=1 | put b=2 | put c=3) ',
                          '| keep a,b,c | view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
                for (var i = 0 ; i < 10 ; i ++) {
                    expect(res.sinks.result[i]).to.deep.equal({
                        a:1, b:2, c:3});
                }
            });
        });
        it('merges two timeless streams', function() {
            return check_juttle({
                program: ['emit  -hz 100 -from Date.new(0) -limit 10 |',
                          '( put oh="hai" | keep oh ',
                          '; put oh="bai" | keep oh ',
                          ')| view result'
                         ].join(' ')
            }).then(function(res) {
                var sorted = _(res.sinks.result).sortBy('oh');
                expect(sorted.length).to.equal(20);
                for (var i = 0 ; i < 10 ; i ++) {
                    expect(sorted[i].oh).to.equal('bai');
                    expect(sorted[i+10].oh).to.equal('hai');
                }
            });
        });
        it('merges two timeless batched streams', function() {
            return check_juttle({
                program: ['emit  -hz 100 -from Date.new(0) -limit 10 | batch .02 |',
                          '( put oh="hai" | keep oh ',
                          '; put oh="bai" | keep oh ',
                          ')|  reduce c=count() | view result'
                         ].join(' ')
            }).then(function(res) {
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(res.sinks.result[i].c).to.equal(4);
                }
            });
        });
        it('merges a timefull and timeless batched stream', function() {
            return check_juttle({
                program: ['emit  -hz 100 -from Date.new(0) -limit 10 | batch .02 |',
                          '( put oh="hai" | keep oh, time ',
                          '; put oh="bai" | keep oh ',
                          ')|  reduce c=count() | view result'
                         ].join(' ')
            }).then(function(res) {
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(res.sinks.result[i].c).to.equal(4);
                }
            });
        });
        it.skip('merges historic and live without waiting for live', function() {
            // useless test for PROD-4340.
            // this test doesnt fail; but it doesnt test what it says it tests for two reasons:
            // 1) the live stream includes ticks that kick the merge along, even in presense of the bug
            // 2) even if you disable ticks, an EOF comes along at end of test and kicks everything along.
            return check_juttle({
                program: ('(emit -from :yesterday: -to :now: | put name="hist", value=count()'+
                          '| batch 10 '+
                          ';emit -to :1 second from now: -every :10 seconds: '+
                          '| batch 20 | filter name=foo'+
                          ') | view sink')
            }).then(function(res) {
                expect(res.sinks.sink.length).at.least(60);
            });
        });

    });

    describe('Put tests', function() {

        it('put', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 3 | put x=4 | view result'
            })
                .then(function(res) {
                    expect(res.sinks.result).deep.equal([{time: '1970-01-01T00:00:00.000Z', x: 4}, {time: '1970-01-01T00:00:01.000Z', x: 4}, {time: '1970-01-01T00:00:02.000Z', x: 4}]);
                });
        });

        it('put coercion', function() {
            return check_juttle({
                program: 'const a = 5;'
                            + 'emit -from Date.new(0) -limit 3 | put b=5 | put c = a + b | view result'
            })
                .then(function(res) {
                    expect(res.sinks.result).deep.equal([{time: '1970-01-01T00:00:00.000Z', b: 5, c: 10}, {time: '1970-01-01T00:00:01.000Z', b: 5, c: 10}, {time: '1970-01-01T00:00:02.000Z', b: 5, c: 10}]);
                });
        });

        it('put with function', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 3 | put x=time-:0: | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{time: '1970-01-01T00:00:00.000Z', x: '00:00:00.000'}, {time: '1970-01-01T00:00:01.000Z', x: '00:00:01.000'}, {time: '1970-01-01T00:00:02.000Z', x: '00:00:02.000'}]);
            });
        });

        it('put by', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 7 | put x=Date.unix(#time), y=#x%3 | put z=min("x") by y | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', x: 0, y: 0, z: 0 },
                                  { time: '1970-01-01T00:00:01.000Z', x: 1, y: 1, z: 1 },
                                  { time: '1970-01-01T00:00:02.000Z', x: 2, y: 2, z: 2 },
                                  { time: '1970-01-01T00:00:03.000Z', x: 3, y: 0, z: 0 },
                                  { time: '1970-01-01T00:00:04.000Z', x: 4, y: 1, z: 1 },
                                  { time: '1970-01-01T00:00:05.000Z', x: 5, y: 2, z: 2 },
                                  { time: '1970-01-01T00:00:06.000Z', x: 6, y: 0, z: 0 } ]);
            });
        });

        it('put by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 5, "time": "1970-01-01T00:00:00.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 3, "time": "1970-01-01T00:00:01.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 3, "time": "1970-01-01T00:00:02.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 1, "time": "1970-01-01T00:00:03.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 2, "time": "1970-01-01T00:00:04.000Z" }]'
                            + ' | put o=#o, value=#value | put min=min("value") by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 1 }, value: 5, min: 5, time: '1970-01-01T00:00:00.000Z' },
                        { o: { a: 2 }, value: 3, min: 3, time: '1970-01-01T00:00:01.000Z' },
                        { o: { a: 1 }, value: 3, min: 3, time: '1970-01-01T00:00:02.000Z' },
                        { o: { a: 2 }, value: 1, min: 1, time: '1970-01-01T00:00:03.000Z' },
                        { o: { a: 1 }, value: 2, min: 2, time: '1970-01-01T00:00:04.000Z' }
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });
    });

    describe('Merge (synchronized) tests ', function() {
        it('passes a single stream', function() {
            return check_juttle({
                program: ' emit  -hz 1000 -from Date.new(0) -limit 10 |  view result'
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
                expect(res.sinks.result[0].time).to.equal('1970-01-01T00:00:00.000Z');
                expect(res.sinks.result[9].time).to.equal('1970-01-01T00:00:00.009Z');
            });
        });
        it('synchronizes two identical batch streams', function() {
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '; emit  -hz 1000 -from Date.new(0) -limit 10)',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('synchronizes two identical realtime streams', function() {
            var start = Date.now();
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 10 ',
                          '; emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 10)',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time)
                        .to.equal(new Date(start + Math.floor(i/2)).toISOString());
                }
            });
        });
        it('synchronizes two interleaved batch streams', function() {
            return check_juttle({
                program: ['( emit  -hz 100 -from Date.new(0) -limit 10 ',
                          '; emit  -hz 100 -from Date.new(0.005) -limit 10)',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(res.sinks.result[i].time).to.equal(new Date(i*0.5*10).toISOString());
                }
            });
        });
        it('synchronizes two interleaved realtime streams', function() {
            var start = Date.now();
            return check_juttle({
                program: ['( emit  -hz 100 -from Date.new(' + start/1000 + ') -limit 10 ',
                          '; emit  -hz 100 -from Date.new(' + (start+5)/1000 + ') -limit 10)',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(result[i].time).to.equal(new Date(start + i*0.5*10).toISOString());
                }
            });
        });
        it('synchronizes historic points across a split/join', function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(20);
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(result[i].time).to.equal(new Date(Math.floor(i/2)).toISOString());
                }
            });
        });
        it('synchronizes realtime points across a split/join',function() {
            return check_juttle({
                program: ['emit  -hz 1000 -limit 10 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(20);
                var start = new Date(result[0].time).getTime();
                for (var i = 0 ; i < 20 ; i ++) {
                    expect(result[i].time).to.equal(new Date(start + Math.floor(i/2)).toISOString());
                }
            });
        });
        it('synchronizes batched historical points across a split/join',function() {
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(0) -limit 10 ',
                          '| batch 0.002 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  reduce four=count() ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(5);
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(result[i].four).to.equal(4);
                }
            });
        });
        it('synchronizes batched realtime points across a split/join',function() {
            // round start time up to a 2 second boundary
            var start = 2 * Math.ceil(Date.now()/2);
            return check_juttle({
                program: ['emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 10 ',
                          '| batch 0.002 ',
                          '| ( put left=1 ; put left=0 ) ',
                          '|  reduce four=count() ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(5);
                for (var i = 0 ; i < 5 ; i ++) {
                    expect(result[i].four).to.equal(4);
                }
            });
        });
        it('synchronizes uneven marks', function() {
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(0) -limit 12 | batch 0.002',
                          '; emit  -hz 1000 -from Date.new(0) -limit 12 | batch 0.004 ) ',
                          '|  reduce n=count() ',
                          '| view result'
                         ].join(' ')
            }).then(function(res) {
                var result = res.sinks.result;
                expect(result.length).to.equal(6);
                for (var i = 0 ; i < 6 ; i ++) {
                    expect(result[i].n).to.equal(4);
                }
            });
        });
    });

    describe('Emit tests', function() {

        it('emit', function() {
            return check_juttle({
                program: 'emit -from Date.new(.032) -hz 1000 -limit 3 | view result'
            }).then(function(res) {
                var expect_pts = [
                    {time: '1970-01-01T00:00:00.032Z'},
                    {time: '1970-01-01T00:00:00.033Z'},
                    {time: '1970-01-01T00:00:00.034Z'}
                ];

                expect(res.sinks.result).to.deep.equal(expect_pts);
            });
        });

        it('emit frequency defaults', function() {
            return check_juttle({
                program: 'emit -limit 100 -from Date.new(0) | view result'
            }).then(function(res) {
                // emit should start instantly and emit @ 100hz
                var first_pt = {time: '1970-01-01T00:00:00.000Z'};
                var second_pt = {time: '1970-01-01T00:00:01.000Z'};
                expect(res.sinks.result[0]).to.deep.equal(first_pt);
                expect(res.sinks.result[1]).to.deep.equal(second_pt);

                // length should be 100
                expect(res.sinks.result.length).to.equal(100);
            });
        });

        it('emit moments', function() {
            var now = new Date();

            return check_juttle({
                program: 'emit -from :'+ now.toISOString() +': -limit 100 -hz 100 | view result'
            }).then(function(res) {
                // emit should start instantly and emit @ 100hz
                var first_pt = {time: now.toISOString()};
                expect(res.sinks.result[0]).to.deep.equal(first_pt);

                // length should be 100
                expect(res.sinks.result.length).to.equal(100);
            });
        });

        it('emit every seconds', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -every :300s: -limit 3 | view result'
            }).then(function(res) {
                var expect_pts = [
                    {time: '1970-01-01T00:00:00.000Z'},
                    {time: '1970-01-01T00:05:00.000Z'},
                    {time: '1970-01-01T00:10:00.000Z'}
                ];

                expect(res.sinks.result).to.deep.equal(expect_pts);
            });
        });

        it('emit every duration', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -every :5 minutes: -limit 3 | view result'
            }).then(function(res) {
                var expect_pts = [
                    {time: '1970-01-01T00:00:00.000Z'},
                    {time: '1970-01-01T00:05:00.000Z'},
                    {time: '1970-01-01T00:10:00.000Z'}
                ];
                expect(res.sinks.result).to.deep.equal(expect_pts);
            });
        });
    });

    describe('Emitter copes with realtime scheduler, ', function() {

        it('mixes historical and realtime point emission', function() {
            var start = Date.now() - 5;
            return check_juttle({
                program: 'emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 10 | view result',
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
            });
        });
        it('merges lagged realtime streams', function() {
            var start = Date.now();
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 5',
                          '; emit  -hz 1000 -from Date.new(' + (start-5)/1000 + ') -limit 5)',
                          '| view result'
                          ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
                expect(res.sinks.result[0].time).to.equal(new Date(start - 5).toISOString());
                expect(res.sinks.result[9].time).to.equal(new Date(start + 4).toISOString());
            });
        });
        it('merges lagged historic streams', function() {
            return check_juttle({
                program: ['( emit  -hz 1000 -from Date.new(0.01) -limit 10',
                          '; emit  -hz 1000 -from Date.new(0) -limit 10)',
                          '| view result'
                          ].join(' ')
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(20);
                expect(res.sinks.result[0].time).to.equal('1970-01-01T00:00:00.000Z');
                expect(res.sinks.result[19].time).to.equal('1970-01-01T00:00:00.019Z');
            });
        });
    });

    describe('Filter tests', function() {

        it('filter', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | filter rate=1 | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).where({ rate : 1 });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter wildcard*', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~"juttle*" | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^juttle.*$/.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter *wildcard', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~"*test" | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^.*test$/.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter *wildcard*', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~"*le_te*" | view result'
            }).then(
                function(res) {
                    var filteredData = _(simpleEvents).filter(function(event) {
                        return /^.*le_te.*$/.test(event.event_type);
                    });
                    expect(res.sinks.result).to.deep.equal(filteredData);
                });
        });

        it('filter in', function() {
            // array declaration is not supported right now, so the only way to get
            // arrays is through some function that returns one, String.split is
            // the most straight-forward
            var hosts = 'const hosts = ["server1", "server2"];';
            var program = hosts + 'read file -file "input/simple-value-field-no-timestamp.json" | filter host in hosts | view result';
            return check_juttle({
                program: program
            }).then(function (res) {
                var filteredData = _(simple_value_field_no_timestamp).filter(function(event) {
                    return event.host === 'server1' || event.host === 'server2';
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
                expect(res.sinks.result.length).to.not.equal(simple_value_field_no_timestamp.length);
            });
        });

        it('filter regex (string)', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~/.+test/ | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^.+test$/.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter regex (regex literal)', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~/.+test/ | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^.+test$/.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter regex (regex literal with flags)', function() {
            return check_juttle({
                program: 'read file -file "input/simple-events.json" | filter event_type~/.+TeSt/i | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^.+test$/i.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter regex (regex const)', function() {
            return check_juttle({
                program: 'const c =/.+test/; read file -file "input/simple-events.json" | filter event_type~c | view result'
            }).then(function(res) {
                var filteredData = _(simpleEvents).filter(function(event) {
                    return /^.+test$/.test(event.event_type);
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('filter on conditional expr', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 -hz 10 | put x=count()-1 | filter x=(true?4:0) | view result'
            }).then(function(res) {
                var pt = {time: '1970-01-01T00:00:00.400Z', x:4};
                expect(res.sinks.result[0]).to.deep.equal(pt);
            });
        });

        it('filter on field (const)', function() {
            return check_juttle({
                program: 'const one=1; emit -from Date.new(0) -limit 10 -hz 10 | put a=1, b=2 | filter a=one | view result'
            }).then(function(res) {
                expect(res.sinks.result.length).to.equal(10);
            });
        });

        // it('free text search (string)', function() {
        //     return check_juttle({
        //         program: 'emit -from Date.new(0) -limit 10 -hz 10 | put a="foo" | filter "foo" | view result'
        //     }).then(function(res) {
        //         expect(res.sinks.result.length).to.equal(10);
        //     });
        // });
        //
        // it('free text search (string in const)', function() {
        //     return check_juttle({
        //         program: 'const b="foo"; emit -from Date.new(0) -limit 10 -hz 10 | put a="foo" | filter b | view result'
        //     }).then(function(res) {
        //         expect(res.sinks.result.length).to.equal(10);
        //     });
        // });
        //
        // it('free text search (string in function)', function() {
        //     return check_juttle({
        //         program: 'function b() { return "foo"; } emit -from Date.new(0) -limit 10 -hz 10 | put a="foo" | filter b() | view result'
        //     }).then(function(res) {
        //         expect(res.sinks.result.length).to.equal(10);
        //     });
        // });
        //
        // it('free text search (number throws error)', function() {
        //     return check_juttle({
        //         program: 'emit -from Date.new(0) -limit 10 -hz 10 | put a=7 | filter 7 | view result'
        //     }).then(function(res) {
        //         expect(res.errors[0]).to.equal('Free text search only accepts strings or expressions that return strings.');
        //     });
        // });
        //
        // it('free text search (and)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter "blues" && "banana" | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(1);
        //         var received = res.sinks.result[0];
        //         expect(received.x).equal('blues clues');
        //         expect(received.y).equal('bananas in pajamas');
        //     });
        // });
        //
        // it('free text search (or)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter "rocky" || "sponge" | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(2);
        //         var receivedx = _.pluck(res.sinks.result, 'x').sort();
        //         var receivedy = _.pluck(res.sinks.result, 'y').sort();
        //         expect(receivedx).deep.equal([ 'george of the jungle', 'spongebob squarepants' ]);
        //         expect(receivedy).deep.equal([ 'rocky and bullwinkle', 'sesame street' ]);
        //     });
        // });
        //
        // it('free text search (and with or)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter ("rocky" && "johnny") || ("sponge" && "street") | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(2);
        //         var receivedx = _.pluck(res.sinks.result, 'x').sort();
        //         var receivedy = _.pluck(res.sinks.result, 'y').sort();
        //         expect(receivedx).deep.equal([ 'george of the jungle', 'spongebob squarepants' ]);
        //         expect(receivedy).deep.equal([ 'rocky and bullwinkle', 'sesame street' ]);
        //     });
        // });
        //
        // it('free text search (or with and)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter ("rocky" || "johnny") && ("sponge" || "street") | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(2);
        //         var receivedx = _.pluck(res.sinks.result, 'x').sort();
        //         var receivedz = _.pluck(res.sinks.result, 'z');
        //         expect(receivedx).deep.equal([ 'sesame street', 'spongebob squarepants' ]);
        //         expect(receivedz).deep.equal([ 'johnny bravo', 'johnny bravo' ]);
        //     });
        // });
        //
        // it('free text search (AND with OR)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter ("rocky" AND "johnny") OR ("sponge" AND "street") | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(2);
        //         var receivedx = _.pluck(res.sinks.result, 'x').sort();
        //         var receivedy = _.pluck(res.sinks.result, 'y').sort();
        //         expect(receivedx).deep.equal([ 'george of the jungle', 'spongebob squarepants' ]);
        //         expect(receivedy).deep.equal([ 'rocky and bullwinkle', 'sesame street' ]);
        //     });
        // });
        //
        // it('free text search (OR with AND)', function() {
        //     return check_juttle({
        //         program: 'read file -file "input/free-text-search-data.json" | filter ("rocky" OR "johnny") AND ("sponge" OR "street") | view result'
        //     })
        //     .then(function(res) {
        //         expect(res.sinks.result.length).equal(2);
        //         var receivedx = _.pluck(res.sinks.result, 'x').sort();
        //         var receivedz = _.pluck(res.sinks.result, 'z');
        //         expect(receivedx).deep.equal([ 'sesame street', 'spongebob squarepants' ]);
        //         expect(receivedz).deep.equal([ 'johnny bravo', 'johnny bravo' ]);
        //     });
        // });

        it('filter with NOT', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 2 | put x=count() | filter NOT(x = 1) | view result'
            })
            .then(function(res) {
                expect(res.sinks.result.length).equal(1);
                expect(res.sinks.result[0].x).equal(2);
            });
        });

        it('filter with AND and OR', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 5 | put x=count() | filter (x > 1 AND x < 3) OR (x < 5 AND x > 3) | view result'
            })
            .then(function(res) {
                expect(res.sinks.result.length).equal(2);
                expect(res.sinks.result[0].x).equal(2);
                expect(res.sinks.result[1].x).equal(4);
            });
        });

        it('filter with AND and OR', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 5 | put x=count() | filter (x = 1 OR x = 3) AND (x = 5 OR x = 3) | view result'
            })
            .then(function(res) {
                expect(res.sinks.result.length).equal(1);
                expect(res.sinks.result[0].x).equal(3);
            });
        });
    });

    describe('Head/tail tests', function() {

        it('head', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | head 3 | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).first(3);
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('head by', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 | put x=Date.unixms(#time)%3 | head 2 by x | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{ time: '1970-01-01T00:00:00.000Z', x: 0 },
                                                      { time: '1970-01-01T00:00:01.000Z', x: 1 },
                                                      { time: '1970-01-01T00:00:02.000Z', x: 2 },
                                                      { time: '1970-01-01T00:00:03.000Z', x: 0 },
                                                      { time: '1970-01-01T00:00:04.000Z', x: 1 },
                                                      { time: '1970-01-01T00:00:05.000Z', x: 2 }]);
            });
        });

        it('head by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 1, "time": "1970-01-01T00:00:00.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 2, "time": "1970-01-01T00:00:01.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 3, "time": "1970-01-01T00:00:02.000Z" }]'
                            + ' | head 1 by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 1 }, value: 1, time: '1970-01-01T00:00:00.000Z' },
                        { o: { a: 2 }, value: 2, time: '1970-01-01T00:00:01.000Z' },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('head default by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 1, "time": "1970-01-01T00:00:00.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 2, "time": "1970-01-01T00:00:01.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 3, "time": "1970-01-01T00:00:02.000Z" }]'
                            + ' | head by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 1 }, value: 1, time: '1970-01-01T00:00:00.000Z' },
                        { o: { a: 2 }, value: 2, time: '1970-01-01T00:00:01.000Z' },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('default head test', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | head | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).first(1);
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('head by default', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 | put x=Date.unixms(#time)%3 | head by x | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{time: '1970-01-01T00:00:00.000Z', x: 0},
                                                     {time: '1970-01-01T00:00:01.000Z', x: 1},
                                                     {time: '1970-01-01T00:00:02.000Z', x: 2}]);
            });
        });

        it('head emits timeless points in the order they came in', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 200 | put c = count() % 10 | keep c | sort c -desc | head 100 | head 50 | head 25 | head 21 | head 20  | view result'
            })
            .then(function(res) {
                var expected = _.range(20).map(function() {
                    return {c: 9};
                });
                expect(res.sinks.result).deep.equal(expected);
            });
        });

        it('timeless points stay where they belong', function() {
            return check_juttle({
                program: 'read file -file "input/timeless.json" | put c=count() | head 6 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { c: 1 },
                                  { c: 2 },
                                  { c: 3 },
                                  { time: '1970-01-01T00:00:01.000Z', c: 4 },
                                  { time: '1970-01-01T00:00:03.000Z', c: 5 },
                                  { time: '1970-01-01T00:00:05.000Z', c: 6 }
                               ]
                );
            });
        });

        it('head 0 returns empty results', function() {
            return check_juttle({
                program: 'emit -from :1 hour ago: | head 0 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([]);
            });
        });

        it('head -0 returns empty results', function() {
            return check_juttle({
                program: 'emit -from :1 hour ago: | head -0 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([]);
            });
        });

        it('tail', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | tail 3 | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).last(3);
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('default tail test', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | tail | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).last(1);
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('tail by', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 | put x=Date.unixms(#time)%3 | tail 2 by x | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{ time: '1970-01-01T00:00:04.000Z', x: 1 },
                                                      { time: '1970-01-01T00:00:05.000Z', x: 2 },
                                                      { time: '1970-01-01T00:00:06.000Z', x: 0 },
                                                      { time: '1970-01-01T00:00:07.000Z', x: 1 },
                                                      { time: '1970-01-01T00:00:08.000Z', x: 2 },
                                                      { time: '1970-01-01T00:00:09.000Z', x: 0 }]);
            });
        });

        it('tail by default', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 | put x=Date.unixms(#time)%3 | tail by x | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{time: '1970-01-01T00:00:07.000Z', x: 1},
                                                     {time: '1970-01-01T00:00:08.000Z', x: 2},
                                                     {time: '1970-01-01T00:00:09.000Z', x: 0}]);
            });
        });

        it('tail by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 1, "time": "1970-01-01T00:00:00.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 2, "time": "1970-01-01T00:00:01.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 3, "time": "1970-01-01T00:00:02.000Z" }]'
                            + ' | tail 1 by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 2 }, value: 2, time: '1970-01-01T00:00:01.000Z' },
                        { o: { a: 1 }, value: 3, time: '1970-01-01T00:00:02.000Z' },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('tail default by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 1, "time": "1970-01-01T00:00:00.000Z" },'
                            + '{ "o": { "a": 2 }, "value": 2, "time": "1970-01-01T00:00:01.000Z" },'
                            + '{ "o": { "a": 1 }, "value": 3, "time": "1970-01-01T00:00:02.000Z" }]'
                            + ' | tail by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 2 }, value: 2, time: '1970-01-01T00:00:01.000Z' },
                        { o: { a: 1 }, value: 3, time: '1970-01-01T00:00:02.000Z' },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('tail 0 returns empty results', function() {
            return check_juttle({
                program: 'emit -from :1 hour ago: | tail 0 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([]);
            });
        });

        it('tail -0 returns empty results', function() {
            return check_juttle({
                program: 'emit -from :1 hour ago: | tail -0 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([]);
            });
        });
    });

    describe('Sort tests', function() {

        it('sort', function() {
            return check_juttle({
                program: 'read file -file "input/simple.json" | sort rate | view result'
            }).then(function(res) {
                var filteredData = _(simpleData).sortBy('rate');
                filteredData = _.map(filteredData, function (pt) {
                    return _.omit(pt, 'time');
                });
                expect(res.sinks.result).to.deep.equal(filteredData);
            });
        });

        it('sort by', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 10 | put x=Date.unixms(#time)%7, y=#x%3 | sort x by y | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([ { x: 0, y: 0 },
                                                      { x: 0, y: 0 },
                                                      { x: 3, y: 0 },
                                                      { x: 6, y: 0 },
                                                      { x: 6, y: 0 },
                                                      { x: 2, y: 2 },
                                                      { x: 5, y: 2 },
                                                      { x: 5, y: 2 },
                                                      { x: 1, y: 1 },
                                                      { x: 4, y: 1 } ]);
            });
        });

        it('sort (letters)', function() {
            return check_juttle({
                program: 'read file -file "input/event-data.json" | keep event | sort event | view result'
            })
            .then(function(res) {
                var events = require('./specs/input/event-data.json');
                var expectData = _.map(events, function(e) {
                    return e.event;
                }).sort();
                var receivedData = _.map(res.sinks.result, function(e) {
                    return e.event;
                });
                expect(receivedData).deep.equal(expectData);
            });
        });

        it('sort (letters again)', function() {
            return check_juttle({
                program: ['const words = [\'alabaster\', \'dave\', \'glowering\', \'jejune\', \'marvelous\', \'avocado\', \'typhoon\', \'salmonella\', \'box\', \'cactus\'];',
                          'function randomWord() {',
                          'var index = Math.floor(Math.random() * 10);',
                          'return words[index];',
                          '}',
                          'emit -from Date.new(0) -limit 11 | put word=randomWord() | sort word | view result'].join('\n')
            })
            .then(function(res) {
                var words = _.map(res.sinks.result, function(obj) {
                    return obj.word;
                });
                var sorted = _.clone(words).sort();
                expect(words).deep.equal(sorted);
            });
        });

        it('sort(descending)', function() {
            return check_juttle({
                program: 'emit -from Date.new(0) -limit 5 | put a = count() | sort a -desc | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{a: 5}, {a: 4}, {a: 3}, {a: 2}, {a: 1}]);
            });
        });

        it('sort(multiple fields)', function() {
            return check_juttle({
                program: ['const words = [\'alabaster\', \'dave\', \'glowering\', \'jejune\', \'marvelous\', \'harridan\', \'typhoon\', \'salmonella\', \'box\', \'cactus\'];',
                          'function randomWord() {',
                          'var index = Math.floor(Math.random() * 10);',
                          'return words[index];',
                          '}',
                          'emit -from Date.new(0) -limit 1 | put a=randomWord(),b=randomWord(),c=randomWord() | sort a,b,c | keep a,b,c | view result'].join('\n')
            })
            .then(function(res) {
                var receivedData = res.sinks.result;
                var expectedData = _.sortBy(_.clone(receivedData), function(datum) {
                    return datum.a.charCodeAt(0) * 10000 + datum.b.charCodeAt(0) * 100 + datum.c.charCodeAt(0);
                });

                expect(receivedData).deep.equal(expectedData);
            });
        });

        it('sort (multiple fields, ascending & descending, letters & numbers)', function() {
            return check_juttle({
                program: 'read file -file "input/fancy-sort-data.json" | sort date, code -desc, user -asc | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { user: 'laura', code: 4, date: 0 },
                                  { user: 'juniper', code: 2, date: 0 },
                                  { user: 'Jot', code: 1, date: 0 },
                                  { user: 'raven', code: 1, date: 0 },
                                  { user: 'sapient', code: 3, date: 1 },
                                  { user: 'elephant', code: 2, date: 1 },
                                  { user: 'Tricky', code: 2, date: 1 },
                                  { user: 'emanate', code: 1, date: 1 },
                                  { user: 'kangaroo', code: 1, date: 1 },
                                  { user: 'alina', code: 2, date: 2 },
                                  { user: 'maudlin', code: 1, date: 2 } ]);
            });
        });
        it('sort (fields as expressions)', function() {
            return check_juttle({
                program: 'const a = "date", b = "cod"; read file -file "input/fancy-sort-data.json" | sort a, b + "e" -desc, user -asc | view result'
            })
                .then(function(res) {
                    expect(res.sinks.result)
                        .deep.equal([ { user: 'laura', code: 4, date: 0 },
                                      { user: 'juniper', code: 2, date: 0 },
                                      { user: 'Jot', code: 1, date: 0 },
                                      { user: 'raven', code: 1, date: 0 },
                                      { user: 'sapient', code: 3, date: 1 },
                                      { user: 'elephant', code: 2, date: 1 },
                                      { user: 'Tricky', code: 2, date: 1 },
                                      { user: 'emanate', code: 1, date: 1 },
                                      { user: 'kangaroo', code: 1, date: 1 },
                                      { user: 'alina', code: 2, date: 2 },
                                      { user: 'maudlin', code: 1, date: 2 } ]);
                });
        });

        it('sort (field as sub argument)', function() {
            return check_juttle({
                program: 'sub s(field) { sort field -desc } emit -from Date.new(0) -limit 5 | put a = count() | s -field "a" | view result'
            })
            .then(function(res) {
                expect(res.sinks.result).deep.equal([{a: 5}, {a: 4}, {a: 3}, {a: 2}, {a: 1}]);
            });
        });
    });

    describe('Reduce tests', function () {

        it('basic reduce, historic', function () {
            var program = 'emit  -hz 1000 -from Date.new(0) -limit 6  | batch 0.002 | reduce a=count() | view result';
            return check_juttle({
                program: program
            })
            .then(function (res) {
                var expected_value = [
                    {time: new Date(2).toISOString(), a: 2},
                    {time: new Date(4).toISOString(), a: 2},
                    {time: new Date(6).toISOString(), a: 2}
                ];
                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('basic reduce, realtime', function () {
            // round up to 2 second boundary
            var start = 2 * Math.ceil(Date.now() / 2);
            var program = 'emit  -hz 1000 -from Date.new(' + start/1000 + ') -limit 6  | batch 0.002 | reduce a=count() | view result';
            return check_juttle({
                program: program
            })
            .then(function (res) {
                var expected_value = [
                    {time: new Date(start + 2).toISOString(), a: 2},
                    {time: new Date(start + 4).toISOString(), a: 2},
                    {time: new Date(start + 6).toISOString(), a: 2}
                ];
                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('reduce by time', function() {
            var program = 'emit  -hz 1000 -from Date.new(0)  -limit 6 | reduce by time | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { time: '1970-01-01T00:00:00.000Z' },
                        { time: '1970-01-01T00:00:00.001Z' },
                        { time: '1970-01-01T00:00:00.002Z' },
                        { time: '1970-01-01T00:00:00.003Z' },
                        { time: '1970-01-01T00:00:00.004Z' },
                        { time: '1970-01-01T00:00:00.005Z' }
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('reduce by time (const array)', function() {
            var program = 'const groups = ["time"]; emit  -hz 1000 -from Date.new(0)  -limit 6 | reduce by groups | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { time: '1970-01-01T00:00:00.000Z' },
                        { time: '1970-01-01T00:00:00.001Z' },
                        { time: '1970-01-01T00:00:00.002Z' },
                        { time: '1970-01-01T00:00:00.003Z' },
                        { time: '1970-01-01T00:00:00.004Z' },
                        { time: '1970-01-01T00:00:00.005Z' },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('reduce by time (const array + additional field)', function() {
            var program = 'const groups = ["test"];'
                            +'( emit -hz 1000 -limit 1 | put test=1, blah="a";'
                            +'  emit -hz 1000 -limit 1 | put test=2, blah="b";'
                            +'  emit -hz 1000 -limit 3 | put test=3, blah="c" ) | reduce by groups, blah | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { test: 1, blah: 'a' },
                        { test: 2, blah: 'b' },
                        { test: 3, blah: 'c' }
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('reduce by non-scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "value": 5 },'
                            + '{ "o": { "a": 2 }, "value": 3 },'
                            + '{ "o": { "a": 1 }, "value": 2 }]'
                            + ' | reduce sum(value) by o | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 1 }, sum: 7 },
                        { o: { a: 2 }, sum: 3 },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('reduce by non-scalar field and a scalar field', function() {
            var program = 'emit -points ['
                            + '{ "o": { "a": 1 }, "tag": 1, "value": 5 },'
                            + '{ "o": { "a": 2 }, "tag": 2, "value": 3 },'
                            + '{ "o": { "a": 1 }, "tag": 1, "value": 2 }]'
                            + ' | reduce count() by o, tag | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { o: { a: 1 }, tag: 1, count: 2 },
                        { o: { a: 2 }, tag: 2, count: 1 },
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });


        it('reduce by time (from function returning array)', function() {
            var program = 'function getGroups() { return ["time"]; } emit  -hz 1000 -from Date.new(0)  -limit 6 | reduce by getGroups() | view result';
            return check_juttle({
                program: program
            })
                .then(function (res) {
                    var expected_value = [
                        { time: '1970-01-01T00:00:00.000Z' },
                        { time: '1970-01-01T00:00:00.001Z' },
                        { time: '1970-01-01T00:00:00.002Z' },
                        { time: '1970-01-01T00:00:00.003Z' },
                        { time: '1970-01-01T00:00:00.004Z' },
                        { time: '1970-01-01T00:00:00.005Z' }
                    ];
                    expect(res.sinks.result).to.deep.equal(expected_value);
                });
        });

        it('reduce by, historic', function () {
            var program = 'emit  -hz 1000 -from Date.new(0)  -limit 6  | put value=Date.unixms(#time)%2 | reduce by value | view result';
            return check_juttle({
                program: program
            })
            .then(function (res) {
                var expected_value = [
                    {value: 0},
                    {value: 1}
                ];
                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('reduce by, realtime', function () {
            var program = 'emit  -hz 1000 -limit 6  | put value=Date.unixms(#time)%2 | reduce by value | view result';
            return check_juttle({
                program: program
            })
            .then(function (res) {
                var sorted = _.sortBy(res.sinks.result, 'value');
                expect(sorted.length).to.equal(2);
                expect(sorted[1].value).to.equal(sorted[0].value + 1);
            });
        });

        it('reduce by multiple things', function() {
            var program = 'emit -from Date.new(0) -hz 1000 -limit 8 | put v1=Date.unixms(#time)%2 | put v2=Date.unixms(#time)%4 | reduce by v1,v2 | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {v1: 0, v2: 0},
                    {v1: 1, v2: 1},
                    {v1: 0, v2: 2},
                    {v1: 1, v2: 3}
                ];
                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('reduce using shorthand notation', function() {
            var program = 'emit -from Date.new(0) -hz 1000 -limit 6 | reduce count() | view result';

            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {count: 6}
                ];
                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('reduces by an undefined variable', function() {
            var program = 'emit -hz 200 | put value=Date.unixms(#time)%33 | reduce by nothing | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                expect(res.warnings.length).at.least(1);
                expect(res.warnings[0]).match(/undefined field/);
                expect(res.sinks.result.length).equal(1);
            });
        });

        it('reduce with accumulation (-acc 1)', function() {
            var program = 'emit  -from Date.new(0)  -hz 1000 -limit 10 | put c = count() | batch 0.005 | reduce -acc 1 min("c") | view result';

            return check_juttle({
                program: program
            })
            .then(function(res) {
                expect(res.sinks.result[0].min).to.equal(1);
                expect(res.sinks.result[1].min).to.equal(1);
            });
        });
    });

    it('outputs results with batch end timestamp', function() {
        return check_juttle({
            program:
            ('const start = Date.quantize(:3 seconds ago:, :second:);'+
             'const end = Date.quantize(:now:, :second:);'+
             'emit -from start -to end | batch 1 '+
             '| put dt = time - start | (view before -times 1 ; pass) '+
             '| reduce count() '+
             '| put dt = time - start | view after -times 1')
        }).then(function(res) {
            expect(_.pluck(res.sinks.before, 'dt')).deep.equal(
                ['00:00:00.000', '00:00:01.000', '00:00:02.000']
            );
            expect(_.pluck(res.sinks.after, 'dt')).deep.equal(
                ['00:00:01.000', '00:00:02.000', '00:00:03.000']
            );
        });
    });

    it('propagates batch end timestamp across multiple reducers', function() {
        return check_juttle({
            program:
            ('const start = Date.quantize(:3 seconds ago:, :second:);'+
             'const end = Date.quantize(:now:, :second:);'+
             'emit -from start -to end | batch 1 '+
             '| put dt = time - start | (view before -times 1 ; pass) '+
             '| reduce count() '+
             '| put dt = time - start | (view during -times 1 ; pass) '+
             '| reduce count() '+
             '| put dt = time - start | view after -times 1')
        }).then(function(res) {
            expect(_.pluck(res.sinks.before, 'dt')).deep.equal(
                ['00:00:00.000', '00:00:01.000', '00:00:02.000']
            );
            expect(_.pluck(res.sinks.during, 'dt')).deep.equal(
                ['00:00:01.000', '00:00:02.000', '00:00:03.000']
            );
            expect(_.pluck(res.sinks.after, 'dt')).deep.equal(
                ['00:00:01.000', '00:00:02.000', '00:00:03.000']
            );
        });
    });

    describe('Mark propagation tests', function() {

        it('put mark resets functions', function() {
            var program = 'emit -from Date.new(0) -hz 2 -limit 4 | batch 1 | put num=count() | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {time: '1970-01-01T00:00:00.000Z', num: 1},
                    {time: '1970-01-01T00:00:00.500Z', num: 2},
                    {time: '1970-01-01T00:00:01.000Z', num: 1},
                    {time: '1970-01-01T00:00:01.500Z', num: 2}
                ];

                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('tail mark', function() {
            var program = 'emit -from Date.new(0) -hz 2 -limit 4 | batch 1 | tail 1 | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {time: '1970-01-01T00:00:00.500Z'},
                    {time: '1970-01-01T00:00:01.500Z'}
                ];

                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('head mark', function() {
            var program = 'emit -from Date.new(0) -hz 2 -limit 4 | batch 1 | head 1 | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {time: '1970-01-01T00:00:00.000Z'},
                    {time: '1970-01-01T00:00:01.000Z'}
                ];

                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });

        it('sort mark', function() {
            var program = 'emit -from Date.new(0) -hz 2 -limit 4 | batch 1 | put num=Date.unixms(#time)%13 | sort num | view result';
            return check_juttle({
                program: program
            })
            .then(function(res) {
                var expected_value = [
                    {time: '1970-01-01T00:00:01.000Z', num: 0},
                    {time: '1970-01-01T00:00:01.000Z', num: 6},
                    {time: '1970-01-01T00:00:02.000Z', num: 5},
                    {time: '1970-01-01T00:00:02.000Z', num: 12}
                ];

                expect(res.sinks.result).to.deep.equal(expected_value);
            });
        });
    });
});
