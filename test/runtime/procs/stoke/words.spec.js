/* globals describe,it  */
var _ =  require('underscore');
var words = require('../../../../lib/runtime/procs/stoke/words');
var syswords = words.syswords;
var shortwords = words.shortwords;
var agents = words.agents;
var countries = words.countries;
var firstnames = words.firstnames;
var lastnames = words.lastnames;
var commit_messages = words.commit_messages;
var merge_messages = words.merge_messages;
var domains = words.domains;
var expect      = require('chai').expect;

describe('stoke.words', function() {

    it('shortword produces short words', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(shortwords.indexOf(word.shortword(i))).at.least(0);
        }
        done();
    });

    it('sysword produces sys words', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(syswords.indexOf(word.sysword(i))).at.least(0);
        }
        done();
    });

    it('agent produces browser agents', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(agents.indexOf(word.agent(i))).at.least(0);
        }
        done();
    });

    it('country produces country codes', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(countries.indexOf(word.country(i))).at.least(0);
        }
        done();
    });

    it('domains produces internet domain names', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(domains.indexOf(word.domain(i))).at.least(0);
        }
        done();
    });

    it('firstnames produces first names', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(firstnames.indexOf(word.firstname(i))).at.least(0);
        }
        done();
    });

    it('lastnames produces last names', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(lastnames.indexOf(word.lastname(i))).at.least(0);
        }
        done();
    });

    it('commit_message produces git commits', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(commit_messages.indexOf(word.commit_message(i))).at.least(0);
        }
        done();
    });

    it('merge_messages produces git merge messages', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            expect(merge_messages.indexOf(word.merge_message(i))).at.least(0);
        }
        done();
    });

    it('paths produces unix-style paths', function(done) {
        var word = new words.Words(13,1);
        for (var i = 0 ; i < 100 ; i++) {
            var path = word.path(i, 3, 6);
            expect(path.split('/').length).at.least(4).at.most(7);
        }
        done();
    });

    it('shortwords with reset produces the same words for the same t',
       function(done) {
           var word = new words.Words(13,1);
           var result1 = [];
           var result2 = [];
           var result3 = [];
           for (var i = 0 ; i < 100 ; i++) {
               result1.push(word.reset().shortword(i));
               result2.push(word.reset().shortword(i));
           }
           for (i = 0 ; i < 100 ; i++) {
               result3.push(word.reset().shortword(i));
           }
           expect(result1).to.deep.equal(result2);
           expect(result1).to.deep.equal(result3);
           done();
       });

    it('shortwords with StokeSequence produces different words in sequence',
       function(done) {
           var word = new words.Words(13,1);
           var wordlist = [] ;
           for (var i = 0 ; i < 100 ; i++) {
               wordlist.push(word.shortword(1));
           }
           expect(_.all(wordlist, function(w) {
               return w === wordlist[0]; })).false;
           done();
       });

    it('shortwords with StokeSequence produces repeatable sequences',
       function(done) {
           var word = new words.Words(13,1);
           var result1 = [];
           var result2 = [];
           for (var i = 0 ; i < 100 ; i++) {
               result1.push(word.shortword(1));
           }
           word.reset();
           for (i = 0 ; i < 100 ; i++) {
               result2.push(word.shortword(1));
           }
           expect(result1).to.deep.equal(result2);
           done();
       });

});

