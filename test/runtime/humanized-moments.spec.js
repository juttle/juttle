var _ = require('underscore');
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var JuttleMoment = require('../../lib/moment').JuttleMoment;

var validDurationUnits = [
    'week',
    'day',
    'hour',
    'minute',
    'second'
];

var validCalendarUnits = [
    'day',
    'week',
    'month',
    'year'
];

function getRand(max) {
    return Math.round((Math.random() * (max || 100)) + 1);
}

// Decomposes a combination of raw duration strings to a human readable
// duration and its representation in milliseconds.
function decomposeCombination(combination) {
    var durationArray = [];
    var secondsArray = [];

    _(combination).map(function(durationUnit) {
        // No adding months.
        var randomNumber;
        switch (durationUnit) {
            case 'week':
                randomNumber = getRand(3);
                break;

            case 'day':
                randomNumber = getRand(7);
                break;

            default:
                randomNumber = getRand();
        }

        durationArray.push(randomNumber +' '+ durationUnit +'s');

        var moment = JuttleMoment.duration(randomNumber, durationUnit);

        secondsArray.push(moment.seconds());
    });

    var duration = durationArray.join(' and ');

    var seconds = _(secondsArray).reduce(function(memo, num) {
        return memo + num;
    });

    return {
        duration: duration,
        seconds: seconds
    };
}

// Takes an array and returns an array of arrays containing k-length combinations.
// From: https://gist.github.com/axelpale/3118596
function k_combinations(array, k) {
    var i, j, combs, head, tailcombs;

    if (k > array.length || k <= 0) {
        return [];
    }

    if (k === array.length) {
        return [array];
    }

    if (k === 1) {
        combs = [];
        for (i = 0; i < array.length; i++) {
            combs.push([array[i]]);
        }
        return combs;
    }

    // Assert {1 < k < array.length}

    combs = [];
    for (i = 0; i < array.length - k + 1; i++) {
        head = array.slice(i, i+1);
        tailcombs = k_combinations(array.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}


describe('Juttle Humanized Moments documentation examples', function() {
    // if it appears in the docs, lets test it here
    var program = 'emit -hz 1000 -limit 1 | put value = :expr: | view result';

    describe('Moments', function() {
        it(': now :', function()  {
            return check_juttle({
                program: program.replace('expr', 'now')
            }).then(function(res) {
                expect(res.sinks.result[0].value).to.equal(res.prog.env.now.valueOf());
            });
        });
        // ISO flavors
        it(': 2014-09-21 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21Z');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21Z :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21Z')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21Z');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21+0800 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21+0800')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21T00:00:00+0800');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21T01:23:45 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21T01:23:45')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21T01:23:45Z');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21T01:23:45.678 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21T01:23:45.678')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21T01:23:45.678Z');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21T01:23:45+01:23 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21T01:23:45+01:23')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21T01:23:45+01:23');
                expect(d1).equal(d2);
            });
        });
        it(': 2014-09-21T01:23:45-0123 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-21T01:23:45-0123')
            }).then(function(res) {
                var d1 = Date.parse(res.sinks.result[0].value);
                var d2 = Date.parse('2014-09-21T01:23:45-01:23');
                expect(d1).equal(d2);
            });
        });
        it(': rejects 2014-09-22Z+PST :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-22Z+PST')
            }).catch(function(err) {
                expect(err.name).equal('SyntaxError');
            });
        });
        it(': rejects 2014-09-22Z-8:00 :', function()  {
            return check_juttle({
                program: program.replace('expr', '2014-09-22Z-8:00')
            }).catch(function(err) {
                expect(err.name).equal('SyntaxError');
            });
        });
        it(': 2014-09-22T11:39:17.993 :', function()  {
            // without timezone, should be UTC0
            return check_juttle({
                program: program.replace('expr', '2014-09-22T11:39:17.993')
            }).then(function(res) {
                var epochs = new JuttleMoment(res.sinks.result[0].value).unix();
                expect(epochs).equal(1411385957);
            });
        });
        it(': 2014-09-22T11:39:17.993+UTC0 :', function()  {
            // this isnt a valid date (bad zone), don't fallback to
            // making it a duration!
            return check_juttle({
                program: 'function f(x) { return :2014-09-22T11:39:17.993+UTC0:;} emit -hz 1000 -limit 1 | put value = f(x) | view result'
            }).catch(function(err) {
                expect(err.name).equal('SyntaxError');
            });
        });
        it(': 1 week before 2014-09-21 :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week before 2014-09-21')
            }).then(function(res) {
                var epochs = new JuttleMoment(res.sinks.result[0].value).unix();
                expect(epochs).equal(1411257600-7*24*60*60);
            });
        });
        it(': 1 week after 2014-09-21 :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week after 2014-09-21')
            }).then(function(res) {
                var epochs = new JuttleMoment(res.sinks.result[0].value).unix();
                expect(epochs).equal(1411257600+7*24*60*60);
            });
        });
        it(': 1 week before yesterday :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week before yesterday')
            }).then(function(res) {
                var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, 'day'));
                moment = moment.startOf('day');
                moment = moment.subtract(JuttleMoment.duration(1, 'week'));

                expect(res.sinks.result[0].value).to.equal(moment.valueOf());
            });
        });
        it(': 1 week after yesterday :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week after yesterday')
            }).then(function(res) {
                var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, 'day'));
                moment = moment.startOf('day');
                moment = moment.add(JuttleMoment.duration(1, 'week'));

                expect(res.sinks.result[0].value).to.equal(moment.valueOf());
            });
        });
        it(': 1 week before 5 seconds ago :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week before 5 seconds ago')
            }).then(function(res) {
                var moment = res.prog.env.now.subtract(JuttleMoment.duration(5, 'seconds'));
                moment = moment.subtract(JuttleMoment.duration(1, 'week'));

                expect(res.sinks.result[0].value).to.equal(moment.valueOf());
            });
        });
        it(': 1 week after 5 seconds ago :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 week after 5 seconds ago')
            }).then(function(res) {
                var moment = res.prog.env.now.subtract(JuttleMoment.duration(5, 'seconds'));
                moment = moment.add(JuttleMoment.duration(1, 'week'));

                expect(res.sinks.result[0].value).to.equal(moment.valueOf());
            });
        });
        it(': rejects 0 :', function()  {
            return check_juttle({
                program: program.replace('expr', '0')
            }).catch(function(err) {
                expect(err.name).equal('SyntaxError');
            });
        });
        it(': rejects one hour :', function()  {
            // add cardinals soon, but for raise error
            return check_juttle({
                program: program.replace('expr', 'one hour')
            }).catch(function(err) {
                expect(err.name).equal('SyntaxError');
            });
        });
    });
    describe('Durations', function() {
        it(': 1 second :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 second')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = JuttleMoment.duration(1,'second').seconds();
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': 20 minutes :', function()  {
            return check_juttle({
                program: program.replace('expr', '20 minutes')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = JuttleMoment.duration(20,'minutes').seconds();
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': hour :', function()  {
            return check_juttle({
                program: program.replace('expr', 'hour')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = JuttleMoment.duration(1,'hour').seconds();
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': day :', function()  {
            return check_juttle({
                program: program.replace('expr', 'day')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = JuttleMoment.duration(24,'hour').seconds();
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': week :', function()  {
            return check_juttle({
                program: program.replace('expr', 'week')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = JuttleMoment.duration(7*24,'hour').seconds();
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': 1 hour and 23 minutes  :', function()  {
            return check_juttle({
                program: program.replace('expr', '1 hour and 23 minutes')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = 83*60;
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': 01:23:00  :', function()  {
            return check_juttle({
                program: program.replace('expr', '01:23:00')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = 83*60;
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': 8.01:23:00  :', function()  {
            return check_juttle({
                program: program.replace('expr', '8.01:23:00')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = 8*24*3600 + 83*60;
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it(': 8 days and 01:23:00  :', function()  {
            return check_juttle({
                program: program.replace('expr', '8 days and 01:23:00')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = 8*24*3600 + 83*60;
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it('handles abbreviations for durations', function() {
            return check_juttle({
                program: program.replace('expr', '1w and 2d and 3h and 4m and 5s')
            }).then(function(res) {
                var value = res.sinks.result[0].value;
                var expected = 5+ 60 * ( 4 + 60 * (3 + 24 * (2 + 7)));
                expect(expected).equal(JuttleMoment.duration(value).seconds());
            });
        });
        it('relative durations as moments: +1h', function() {
            return check_juttle({
                program: program.replace('expr', '+1h')
            }).then(function(res) {
                var add1h = res.prog.env.now.add(JuttleMoment.duration(1,'h'));
                expect(res.sinks.result[0].value).equal(add1h.valueOf());
            });
        });
        it('relative durations as moments: -1m', function() {
            return check_juttle({
                program: program.replace('expr', '-1m')
            }).then(function(res) {
                var sub1m = res.prog.env.now.subtract(JuttleMoment.duration(1,'m'));
                expect(res.sinks.result[0].value).equal(sub1m.valueOf());
            });
        });
        it('relative durations as moments: +1.00:00:00', function() {
            return check_juttle({
                program: program.replace('expr', '+1.00:00:00')
            }).then(function(res) {
                var add1d = res.prog.env.now.add(JuttleMoment.duration(1,'d'));
                expect(res.sinks.result[0].value).equal(add1d.valueOf());
            });
        });
        it('relative durations as moments: -7.00:00:00', function() {
            return check_juttle({
                program: program.replace('expr', '-7.00:00:00')
            }).then(function(res) {
                var sub1w = res.prog.env.now.subtract(JuttleMoment.duration(1,'w'));
                expect(res.sinks.result[0].value).equal(sub1w.valueOf());
            });
        });
    });
});

describe('Juttle Humanized Moments Fuzzy Tests', function() {

    describe('Durations', function() {
        it('6 milliseconds', function() {
            var expectedDuration = JuttleMoment.duration(0.006).valueOf();

            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :6 milliseconds: | view result'
            })
                .then(function(res) {
                    expect(res.sinks.result.length).to.equal(1);
                    _(res.sinks.result).each(function(point) {
                        expect(point.foo).to.equal(expectedDuration);
                    });
                });
        });

        it('27 minutes and 17 milliseconds', function() {
            var expectedDuration = JuttleMoment.duration((27 * 60) + 0.017).valueOf();

            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :27 minutes and 17 milliseconds: | view result'
            })
                .then(function(res) {
                    expect(res.sinks.result.length).to.equal(1);
                    _(res.sinks.result).each(function(point) {
                        expect(point.foo).to.equal(expectedDuration);
                    });
                });
        });

        for (var i = 1; i < validDurationUnits.length; i++) {
            var combinations = k_combinations(validDurationUnits, i);

            _(combinations).each(function(combination) {
                var decomposedCombination = decomposeCombination(combination);

                var duration = decomposedCombination.duration;
                var seconds = decomposedCombination.seconds;

                var expectedDuration = JuttleMoment.duration(seconds).valueOf();

                it(duration, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ duration +': | view result'
                    })
                        .then(function(res) {
                            expect(res.sinks.result.length).to.equal(1);
                            _(res.sinks.result).each(function(point) {
                                expect(point.foo).to.equal(expectedDuration);
                            });
                        });
                });
            });
        }
    });

    describe('Dates', function() {
        it('6 milliseconds ago', function() {
            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :6 milliseconds ago: | view result'
            })
                .then(function(res) {
                    var moment = res.prog.env.now.subtract(JuttleMoment.duration(0.006));

                    expect(res.sinks.result.length).to.equal(1);
                    expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                });
        });

        it('27 minutes and 17 milliseconds ago', function() {
            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :27 minutes and 17 milliseconds ago: | view result'
            })
                .then(function(res) {
                    var moment = res.prog.env.now.subtract(JuttleMoment.duration((27 * 60) + 0.017));

                    expect(res.sinks.result.length).to.equal(1);
                    expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                });
        });
        for (var i = 1; i < validDurationUnits.length; i++) {
            var combinations = k_combinations(validDurationUnits, i);

            _(combinations).each(function(combination) {
                var decomposedCombination = decomposeCombination(combination);

                var duration = decomposedCombination.duration;
                var seconds = decomposedCombination.seconds;

                it(duration +' ago', function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ duration +' ago: | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.subtract(JuttleMoment.duration(seconds));

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
            });
        }
    });

    describe('Moment Expressions', function() {
        for (var i = 1; i < 3; i++) {
            var combinations1 = k_combinations(validDurationUnits, i);
            var combinations2 = _(combinations1).shuffle();

            _(combinations1).each(function(combination, i) {
                var decomposedCombination1 = decomposeCombination(combination);
                var decomposedCombination2 = decomposeCombination(combinations2[i]);

                var duration1 = decomposedCombination1.duration;
                var duration2 = decomposedCombination2.duration;

                var seconds1 = decomposedCombination1.seconds;
                var seconds2 = decomposedCombination2.seconds;

                it(duration1 +' after '+ duration2 +' ago', function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ duration1 +' after '+ duration2 +' ago: | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.add(JuttleMoment.duration(seconds1 - seconds2));

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });

                it(duration1 +' from '+ duration2 +' ago', function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ duration1 +' from '+ duration2 +' ago: | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.add(JuttleMoment.duration(seconds1 - seconds2));

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });

                it(duration1 +' before '+ duration2 +' ago', function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ duration1 +' before '+ duration2 +' ago: | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.subtract(JuttleMoment.duration(seconds1 + seconds2));

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
            });
        }
    });

    describe('Calendar Math', function() {
        it('today', function() {
            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :today: | view result'
            })
                .then(function(res) {
                    var moment = res.prog.env.now.startOf('day');

                    expect(res.sinks.result.length).to.equal(1);
                    expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                });
        });

        it('tomorrow', function() {
            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :tomorrow: | view result'
            })
                .then(function(res) {
                    var moment = res.prog.env.now.add(JuttleMoment.duration(1, 'day'));
                    moment = moment.startOf('day');

                    expect(res.sinks.result.length).to.equal(1);
                    expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                });
        });

        it('yesterday', function() {
            return check_juttle({
                program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :yesterday: | view result'
            })
                .then(function(res) {
                    var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, 'day'));
                    moment = moment.startOf('day');

                    expect(res.sinks.result.length).to.equal(1);
                    expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                });
        });

        _(validCalendarUnits).each(function(calendarUnit) {
            it('this '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :this '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            it('last '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :last '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            var rand1 = getRand();
            it('last '+ rand1 +' '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :last '+ rand1 +' '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.subtract(JuttleMoment.duration(rand1, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            it('prior '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :prior '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            var rand2 = getRand();
            it('prior '+ rand2 +' '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :prior '+ rand2 +' '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.subtract(JuttleMoment.duration(rand2, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            it('next '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :next '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.add(JuttleMoment.duration(1, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            var rand3 = getRand();
            it('next '+ rand3 +' '+ calendarUnit, function() {
                return check_juttle({
                    program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :next '+ rand3 +' '+ calendarUnit +': | view result'
                })
                    .then(function(res) {
                        var moment = res.prog.env.now.add(JuttleMoment.duration(rand3, calendarUnit));
                        moment = moment.startOf(calendarUnit);

                        expect(res.sinks.result.length).to.equal(1);
                        expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                    });
            });

            _(validDurationUnits).each(function(durationUnit) {
                var rand4 = getRand();

                it('this '+ durationUnit, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :this '+ durationUnit +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.startOf(durationUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
                it('last '+ durationUnit, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :last '+ durationUnit +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, durationUnit));
                            moment = moment.startOf(durationUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
                it('next '+ durationUnit, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :next '+ durationUnit +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.add(JuttleMoment.duration(1, durationUnit));
                            moment = moment.startOf(durationUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
                it(calendarUnit +' of '+ rand4 +' '+ durationUnit +' ago', function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ calendarUnit +' of '+ rand4 +' '+ durationUnit +' ago: | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.subtract(JuttleMoment.duration(rand4, durationUnit));
                            moment = moment.startOf(calendarUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
            });

            _(validCalendarUnits).each(function(calendarUnit2) {
                var rand5 = getRand();

                it(calendarUnit +' '+ rand5 +' of last '+ calendarUnit2, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :'+ calendarUnit +' '+ rand5 +' of last '+ calendarUnit2 +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.subtract(JuttleMoment.duration(1, calendarUnit2));
                            moment = moment.startOf(calendarUnit2);
                            moment = moment.add(JuttleMoment.duration(rand5 - 1, calendarUnit));

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });

                it('first '+ calendarUnit +' of next '+ calendarUnit2, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :first '+ calendarUnit +' of next '+ calendarUnit2 +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.add(JuttleMoment.duration(1, calendarUnit2));
                            moment = moment.startOf(calendarUnit2);
                            moment = moment.startOf(calendarUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });

                it('final '+ calendarUnit +' of next '+ calendarUnit2, function() {
                    return check_juttle({
                        program: 'emit -from :now: -hz 1000 -limit 1 | put foo = :final '+ calendarUnit +' of next '+ calendarUnit2 +': | view result'
                    })
                        .then(function(res) {
                            var moment = res.prog.env.now.add(JuttleMoment.duration(1, calendarUnit2));
                            moment = moment.endOf(calendarUnit2);
                            moment = moment.startOf(calendarUnit);

                            expect(res.sinks.result.length).to.equal(1);
                            expect(res.sinks.result[0].foo).to.equal(moment.valueOf());
                        });
                });
            });
        });
    });

});
