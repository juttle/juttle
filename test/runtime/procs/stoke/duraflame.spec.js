/* globals describe,it  */
var _ =  require('underscore');
var duraflame = require('../../../../lib/runtime/procs/stoke/duraflame');
var expect      = require('chai').expect;

describe('stoke.duraflame', function() {

    it('sysinfo produces something', function(done) {
        var sysinfo = duraflame.sysinfo();
        for (var i = 0 ; i < 100 ; i++) {
            expect(sysinfo.message(i).length).at.least(10).at.most(512);
        }
        done();
    });

    it('syserror produces something', function(done) {
        var syserror = duraflame.syserror();
        for (var i = 0 ; i < 100 ; i++) {
            expect(syserror.message(i).length).at.least(10).at.most(512);
        }
        done();
    });

    it('syslog produces a mix of error and info messages', function(done) {
        var syslog = duraflame.syslog(13, 1, 0.5);
        var messages = [];
        for (var i = 0 ; i < 100 ; i++) {
            messages.push(syslog.message(i));
        }
        var nerror = _.filter(messages, function(message) {
            return message.indexOf('error') >= 0; }).length;
        expect(nerror).least(messages.length/4);
        var ninfo = _.filter(messages, function(message) {
            return message.indexOf('error') < 0; }).length;
        expect(ninfo).least(messages.length/4);
        done();
    });

    it('gitlog produces a mix of commit and merge messages', function(done) {
        var gitlog =  duraflame.gitlog(13, 1, 0.5);
        var messages = [];
        for (var i = 0 ; i < 100 ; i++) {
            messages.push(gitlog.message(i));
        }
        var nmerge = _.filter(messages, function(message) {
            return message.indexOf('Merge') === 0; }).length;
        expect(nmerge).least(messages.length/4);
        var ncommit = _.filter(messages, function(message) {
            return message.indexOf('Merge') !== 0; }).length;
        expect(ncommit).equal(messages.length - nmerge);
        done();
    });

    it('we can pass a firstpf function to a TwoWayChooser', function(done) {
        var syslog = duraflame.syslog(13, 1, function() { return 0.5; });
        var messages = [];
        for (var i = 0 ; i < 100 ; i++) {
            messages.push(syslog.message(i));
        }
        var nerror = _.filter(messages, function(message) {
            return message.indexOf('error') >= 0; }).length;
        expect(nerror).least(messages.length/4);
        var ninfo = _.filter(messages, function(message) {
            return message.indexOf('error') < 0; }).length;
        expect(ninfo).least(messages.length/4);
        done();
    });

    it('osx produces something', function(done) {
        var osx = duraflame.osx();
        for (var i = 0 ; i < 100 ; i++) {
            expect(osx.message(i).length).at.least(10).at.most(512);
        }
        done();
    });

    it('pix produces something', function(done) {
        var pix = duraflame.pix();
        for (var i = 0 ; i < 100 ; i++) {
            expect(pix.message(i).length).at.least(10).at.most(512);
        }
        done();
    });

    it('sysinfo with reset produces the same messages for the same t',
       function(done) {
           var sysinfo = duraflame.sysinfo(13,1);
           var result1 = [];
           var result2 = [];
           var result3 = [];
           for (var i = 0 ; i < 100 ; i++) {
               result1.push(sysinfo.reset().message(i));
               result2.push(sysinfo.reset().message(i));
           }
           for (i = 0 ; i < 100 ; i++) {
               result3.push(sysinfo.reset().message(i));
           }
           expect(result1).to.deep.equal(result2);
           expect(result1).to.deep.equal(result3);
           done();
       });

    it('sysinfo produces different messages in sequence',
       function(done) {
           var sysinfo = duraflame.sysinfo(13,1);
           var wordlist = [] ;
           for (var i = 0 ; i < 100 ; i++) {
               wordlist.push(sysinfo.message(1));
           }
           expect(_.all(wordlist, function(w) {
               return w === wordlist[0]; })).false;
           done();
       });

    it('sysinfo produces repeatable sequences',
       function(done) {
           var sysinfo = duraflame.sysinfo(13,1);
           var result1 = [];
           var result2 = [];
           for (var i = 0 ; i < 100 ; i++) {
               result1.push(sysinfo.message(1));
           }
           sysinfo.reset();
           for (i = 0 ; i < 100 ; i++) {
               result2.push(sysinfo.message(1));
           }
           expect(result1).to.deep.equal(result2);
           done();
       });
});



