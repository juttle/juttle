/* globals describe,it  */
var Stoke = require('../../../../lib/runtime/procs/stoke/stoke').Stoke;
var StokeSequence = require('../../../../lib/runtime/procs/stoke/stoke').StokeSequence;
var expect      = require('chai').expect;

describe('stoke.Stoke', function() {

    it('.uniform produces uniform samples between 0 and 1', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.uniform(i)).to.be.at.least(0).and.at.most(1);
        }
        done();
    });

    it('.normal produces normal samples centered on 0', function(done) {
        var stoke = new Stoke(13,1);
        var sum = 0 ;
        var abssum = 0;
        for (var i = 0 ; i < 100 ; i++) {
            sum += stoke.normal(i);
            abssum += Math.abs(stoke.normal(i));
        }
        expect(sum).to.be.below(abssum);
        done();
    });

    it('.uniform produces the same samples for the same t', function(done) {
        var stoke = new Stoke(13,1);
        var result1 = [];
        var result2 = [];
        var result3 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.uniform(i));
            result2.push(stoke.uniform(i));
        }
        for (i = 0 ; i < 100 ; i++) {
            result3.push(stoke.uniform(i));
        }
        expect(result1).to.deep.equal(result2);
        expect(result1).to.deep.equal(result3);
        done();
    });

    it('.integer produces integers in the specified range', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            var n = stoke.integer(i, -3, 3);
            expect(n).to.be.at.least(-3).and.at.most(3);
            expect(Math.floor(n)).to.equal(n);
        }
        done();
    });

    it('.ip produces strings that look like ip addresses', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            var ip = stoke.ip(i);
            expect(ip.split('.').length).to.equal(4);
        }
        done();
    });

    it('.noisy produces samples centered and bound as specified', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.noisy(i, 100, 20, 90, 110)).at.least(90).and.at.most(110);
        }
        done();
    });

    it('.digits produces digit strings as specified', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(parseInt(stoke.digits(i, 3, 10), 10)).at.least(0).and.at.most(999);
            expect(parseInt(stoke.digits(i, 3, 16), 16)).at.least(0).and.at.most(4095);
        }
        done();
    });

    it('.mac produces strings that look like mac addresses', function(done) {
        var stoke = new Stoke(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            var mac = stoke.mac(i);
            expect(mac.split(':').length).to.equal(6);
        }
        done();
    });

    it('.choose selects from available choices', function(done) {
        var stoke = new Stoke(13,1);
        var choices = ['a', 'b', 'c', 'd'];
        for (var i = 0 ; i < 100 ; i++) {
            expect(choices.indexOf(stoke.choose(i, choices))).at.least(0);
        }
        done();
    });

    it('.choose_weighted selects from available choices', function(done) {
        var stoke = new Stoke(13,1);
        var choices = {a:0.2, b:0.2, c:0.2, d:0.4};
        for (var i = 0 ; i < 100 ; i++) {
            expect(choices[stoke.choose_weighted(i, choices)]).at.least(0.2);
        }
        done();
    });
});

describe('stoke.StokeSequence', function() {

    it('.uniform produces different samples for successive t', function(done) {
        var stoke = new StokeSequence(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.uniform(1)).to.not.equal(stoke.uniform(1));
        }
        done();
    });

    it('.uniform produces repeatable sequences for a given t', function(done) {
        var stoke = new StokeSequence(13,1);
        var result1 = [];
        var result2 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.uniform(1));
        }
        stoke.reset();
        for (i = 0 ; i < 100 ; i++) {
            result2.push(stoke.uniform(1));
        }
        expect(result1).to.deep.equal(result2);
        done();
    });

    it('.normal produces different samples for successive t', function(done) {
        var stoke = new StokeSequence(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.normal(1)).to.not.equal(stoke.normal(1));
        }
        done();
    });

    it('.normal produces repeatable sequences for a given t', function(done) {
        var stoke = new StokeSequence(13,1);
        var result1 = [];
        var result2 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.normal(1));
        }
        stoke.reset();
        for (i = 0 ; i < 100 ; i++) {
            result2.push(stoke.normal(1));
        }
        expect(result1).to.deep.equal(result2);
        done();
    });

    it('.digits produces different samples for successive t', function(done) {
        var stoke = new StokeSequence(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.digits(1, 3, 10)).to.not.equal(stoke.digits(1, 3, 10));
        }
        done();
    });

    it('.digits produces repeatable sequences for a given t', function(done) {
        var stoke = new StokeSequence(13,1);
        var result1 = [];
        var result2 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.digits(1, 3, 10));
        }
        stoke.reset();
        for (i = 0 ; i < 100 ; i++) {
            result2.push(stoke.digits(1, 3, 10));
        }
        expect(result1).to.deep.equal(result2);
        done();
    });

    it('.markov produces the same value for a given t', function(done) {
        var stoke = new Stoke(13,1);
        var states = {red:0.3, green:0.3, blue:0.4};
        var result = stoke.markov(0, states);
        for (var i = 0 ; i < 100 ; i++) {
            expect(stoke.markov(0, states)).to.equal(result);
        }
        done();
    });

    it('.markov produces a range of values for a range of t', function(done) {
        var stoke = new Stoke(13,1);
        var states = {red:0.3, green:0.3, blue:0.4};
        var result1 = [];
        var result2 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.markov(i, states));
        }
        for (i = 0 ; i < 100 ; i++) {
            result2.push(stoke.markov(i, states));
        }
        expect(result1).to.deep.equal(result2);
        expect(result1.indexOf('red')).at.least(0);
        expect(result1.indexOf('green')).at.least(0);
        expect(result1.indexOf('blue')).at.least(0);
        done();
    });

    it('.cached_markov produces the same values as markov over a range of t', function(done) {
        var stoke = new Stoke(13,1);
        var states = {red:0.3, green:0.3, blue:0.4};
        var result1 = [];
        var result2 = [];
        for (var i = 0 ; i < 100 ; i++) {
            result1.push(stoke.markov(i, states));
        }
        for (i = 0 ; i < 100 ; i++) {
            result2.push(stoke.cached_markov(i, states));
        }
        expect(result1).to.deep.equal(result2);
        done();
    });
});

