var _ = require('underscore');

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;

var simpleData;
var nestedData;

describe('Juttle reducers tests', function() {

    before(function() {
        simpleData = require('./specs/input/simple');
        nestedData = require('./specs/input/nested');
    });

    it('avg', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce avg=avg(rate) | view result',
        }).then(function (res) {
            var sum = _(simpleData)
                .chain()
                .pluck('rate')
                .reduce(function(memo, rate) {
                    return memo + rate;
                })
                .value();
            var avg = sum / simpleData.length;
            expect(res.sinks.result[0]).to.deep.equal({
                avg: avg
            });
        });
    });

    it('count', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce count=count(rate) | view result',
        }).then(function (res) {
            expect(res.sinks.result[0]).to.deep.equal({
                count: simpleData.length
            });
        });
    });

    it('first', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce first=first(rate) | view result',
        }).then(function (res) {
            expect(res.sinks.result[0]).to.deep.equal({
                first: simpleData[0].rate
            });
        });
    });

    it('last', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce last=last(rate) | view result',
        }).then(function (res) {
            expect(res.sinks.result[0]).to.deep.equal({
                last: _(simpleData).last().rate
            });
        });
    });

    it('min', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce min=min(rate) | view result',
        }).then(function (res) {
            var rates = _(simpleData).pluck('rate');

            expect(res.sinks.result[0]).to.deep.equal({
                min: Math.min.apply(null, rates)
            });
        });
    });

    it('min time', function() {
        return check_juttle({
            program: 'read file -file "input/simple-events.json" | reduce min=min(time) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].min).equal('2014-05-19T20:56:34.324Z');
        });
    });

    it('max', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce max=max(rate) | view result',
        }).then(function (res) {
            var rates = _(simpleData).pluck('rate');

            expect(res.sinks.result[0]).to.deep.equal({
                max: Math.max.apply(null, rates)
            });
        });
    });

    it('max time', function() {
        return check_juttle({
            program: 'read file -file "input/simple-events.json" | reduce max=max(time) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result[0].max).equal('2014-05-19T20:56:43.324Z');
        });
    });

    it('now', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce now=Date.time() | view result',
        }).then(function (res) {
            var now = new Date();
            var delta = Math.abs(new Date(res.sinks.result[0].now) - now);
            expect(delta).to.be.below(50);
        });
    });

    it('sigma', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce sigma=sigma(rate) | view result',
        }).then(function (res) {
            var sum = 0;
            var ssum = 0;

            _(simpleData).each(function(point) {
                sum += point.rate;
                ssum += point.rate * point.rate;
            });

            var sigma = Math.sqrt( 1 / (simpleData.length - 1) * ((ssum - sum * sum / simpleData.length)));

            expect(res.sinks.result[0]).to.deep.equal({
                sigma: sigma
            });
        });
    });

    it('sum', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce sum=sum(rate) | view result',
        }).then(function(res) {
            var sum = _(simpleData)
                .chain()
                .pluck('rate')
                .reduce(function(memo, rate) {
                    return memo + rate;
                })
                .value();

            expect(res.sinks.result[0]).to.deep.equal({
                sum: sum
            });
        });
    });

    it('pluck', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce pluck=pluck(rate) | view result'
        }).then(function(res) {
            var rate_values = _.pluck(simpleData, 'rate');
            expect(res.sinks.result[0].pluck).to.deep.equal(rate_values);
        });
    });

    it('pluck nested', function() {
        return check_juttle({
            program: 'read file -file "input/nested.json" | reduce pluck=pluck(obj) | view result'
        }).then(function(res) {
            var rate_values = _.pluck(nestedData, 'obj');
            expect(res.sinks.result[0].pluck).to.deep.equal(rate_values);
        });
    });

    it('percentile', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce pct=percentile(rate, 0.70) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).to.deep.equal([{pct: 5}]);
        });
    });

    it('percentile with const', function() {
        return check_juttle({
            program: 'const percent = 0.90; read file -file "input/simple.json" | reduce pct=percentile(rate, percent) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).to.deep.equal([{pct: 7}]);
        });
    });

    it('percentile with no second argument, gives median', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce pct=percentile(rate) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).to.deep.equal([{pct: 2}]);
        });
    });

    it('percentile on a non-existent field', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce pct=percentile(bananas, 0.70) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).to.deep.equal([{pct: null}]);
        });
    });

    it('count_unique', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | reduce uniq=count_unique(rate) | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([{uniq: 5}]);
        });
    });

    it('custom reducer, field reference in if-statement', function() {
        var program = ['reducer first_time(field, event_name, time) {',
                       'var min_ts = "0";',
                       'function result() { return min_ts; }',
                       'function update() {',
                       ' if (*field == event_name) {',
                       ' min_ts = *time;',
                       ' }',
                       '}',
                       '}',
                       'read file -file "input/event-data.json" | ',
                       'reduce onboarded=first_time(event, "onboarding_complete", "timestamp"),',
                       ' juttle=first_time(event, "juttle_saved", "timestamp"),',
                       ' invited=first_time(event, "invite_sent", "timestamp") by userid |',
                       'filter onboarded!="0" |',
                       'sort userid | view result'
                     ].join('\n');
        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result.length).equal(24);
        });
    });

    it('custom reducer, field reference in nested function', function() {
        var program = [ 'reducer r(field) {',
                        'var res = 0;',
                        'function result() { return res; }',
                        'function update() {',
                        'function f() {',
                        'res = *field;',
                        '}',
                        'var x = f();',
                        '}',
                        '}',
                        'emit -from Date.new(0) -limit 5 | put a=1 | reduce r=r("a") | view result'
                        ].join('\n');
        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([{r: 1}]);
        });
    });
});
