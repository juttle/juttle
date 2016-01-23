'use strict';

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
});
