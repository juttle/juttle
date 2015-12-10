var expect = require('chai').expect;
var Scheduler = require('../../lib/runtime/scheduler').Scheduler;

describe('Scheduler', function() {
    var scheduler = new Scheduler();

    before(function() {
        scheduler.start();
    });

    after(function() {
        scheduler.stop();
    });

    it ('reschedules t1 arriving between (now, t2)', function(done) {
        var points = [];

        scheduler.schedule(Date.now() + 500, function() { points.push('second'); });
        scheduler.schedule(Date.now() + 250, function() { points.push('first'); });

        var check = setInterval(function() {
            if (points.length === 2) {
                clearInterval(check);
                expect(points).to.deep.equal(['first', 'second']);
                done();
            }
        }, 100);
    });

    it('runs periodic jobs', function(done) {
        var ticks  = 0;

        scheduler.schedule_every(10, function() { ticks += 1; });

        var check = setTimeout(function() {
            clearTimeout(check);
            expect(ticks).to.gte(5);
            done();
        }, 70);
    });

    it('schedule throws after scheduler stopped', function() {
        scheduler.stop();
        expect(scheduler.schedule.bind(scheduler, Date.now(), function() {})).to.throw(/Cannot schedule callbacks/);
        scheduler.start();
    });

    it('schedule every throws after scheduler stopped', function() {
        scheduler.stop();
        expect(scheduler.schedule_every.bind(scheduler, 1000, function() {})).to.throw(/Cannot schedule callbacks/);
        scheduler.start();
    });
});
