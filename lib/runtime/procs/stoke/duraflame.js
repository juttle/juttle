'use strict';

/**
 duraflame -- make fake logs from shredded text

 Chooser:
   loads a list of messages and randomly chooses from them.

 Madlib:
   reads distilled log patterns produced by meoh
   (https://github.com/jut-io/scratch/tree/master/meoh) and generates
   random messages from them with a similar distribution of variation.

   A log message pattern file summarizes
   recurring patterns as lists of json objects of the form:

   count: <int> number of times this message appeared in source material
   terms: list of tokenized word possibilities for each position
   each term is a map from token or word literal to counts
   tokens replace recognized strings such as ip addresses, hexadecimal numbers,
   etc.

 TwoWayChooser:
   selects from a pair of Chooser/Madlib/etc using a provided pf

 Duraflame objects extend StokeSequence objects as random number generators
 so that sequences of messages are re-playable. You may call your generator's
 reset() method to restart the sequence (or just evaluate at a different t).
*/
var StokeSequence = require('./stoke').StokeSequence;
var Words = require('./words').Words;
var merge_messages = require('./data/merge-message-list');
var commit_messages = require('./data/commit-message-list');
var osx_patterns = require('./data/osx-patterns');
var pix_patterns = require('./data/pix-patterns');
var sysinfo_patterns = require('./data/syslog-info-patterns');
var syserror_patterns = require('./data/syslog-error-patterns');

class Chooser extends StokeSequence {
    // select random messages from choices.
    constructor(seed, dt, choices) {
        super(seed, dt, choices);
        this.choices = choices;
    }
    message(moment) {
        return this.choose(moment, this.choices);
    }
}class MultiChooser extends StokeSequence {
    // select a message generator from choices based on evaluating
    // choicepf which returns an array of probabilities, or may be a
    // constant array of probabilities for corresponding choices.
    constructor(seed, dt, choices, choicepf) {
        super(seed, dt, choices, choicepf);
        this.choices = choices;
        this.choicepf = choicepf;
    }
    reset() {
        StokeSequence.prototype.reset.call(this);
        this.choices.forEach(function(chooser) { chooser.reset(); });
        return this;
    }
    message(moment) {
        var choicep = ((this.choicepf instanceof Function) ?
                       this.choicepf(moment) : this.choicepf);
        var choiceidx = this.choose_weighted(moment, choicep);
        var choice = this.choices[choiceidx];
        return choice.message(moment);
    }
}class TwoWayChooser extends MultiChooser {
    // create a chooser that juggles between two choosers according to
    // the firstp function, which gives the probability of the first
    // choice (0..1) at the given moment, or may be a constant.
    constructor(seed, dt, choices, firstpf) {
        super(seed, dt, choices, firstpf);
        this.choicepf = function choicepf(moment) {
            var firstp = ((firstpf instanceof Function) ?
                          firstpf(moment) : firstpf);
            return [firstp, 1 - firstp];
        };
    }
}class Madlib extends StokeSequence {
    // build a duraflame by madlibbing from a MEOH-distilled list of patterns.
    constructor(seed, dt, patterns) {
        super(seed, dt, patterns);
        this.words = new Words(seed, dt);
        //
        // compute statistics for each pattern
        //
        var pattern_p = [];
        var sum = 0;
        patterns.forEach(function(pattern) {
            sum += pattern.count;
        });
        patterns.forEach(function(pattern) {
            pattern_p.push(pattern.count/sum);
            // convert term word counts into term word probabilities
            pattern.terms.forEach(function(term) {
                for (var word in term) {
                    term[word] /= pattern.count;
                }
            });
        });
        this.patterns = patterns;
        this.pattern_p = pattern_p;
    }
    reset() {
        StokeSequence.prototype.reset.call(this);
        this.words.reset();
        return this;
    }
    realize_token(t, token) {
        // turn the token into text
        var n;
        switch (token) {
            case 'IP': return this.ip(t);
            case 'MAC': return this.mac(t);
            case 'PATH': return this.words.path(t, 3, 6);
            case 'HEXX':  return '0x'+this.digits(t, 4, 16);
            case 'DIG1':  return this.digits(t, 1, 10);
            case 'DIG2': return this.digits(t, 2, 10);
            case 'TENNUM': {
                n = this.integer(t, 3, 6);
                return this.digits(t, n, 10);
            }
            case 'HEXNUM': {
                n = this.integer(t, 3, 6);
                return this.digits(t, n, 16);
            }
            default:
                throw new Error('duraflame: unknown token:'+token);
        }
    }
    realize_word(t, term) {
        // generate a literal word from a term object by choosing among
        // multiple word possibilties and substituting random values for
        // special tokens
        var word = this.choose_weighted(t, term);
        var tokpat = new RegExp('%{[^}]+}');
        while (tokpat.test(word)) {
            var token = tokpat.exec(word)[0];
            var value = this.realize_token(t, token.slice(2,-1));
            var prefix = word.split(token,1)[0];
            word = word.replace(prefix+token, prefix+value);
        }
        return word;
    }
    realize_message(t, pattern) {
        // generate a message string from the pattern by randomly choosing
        // among term word possibilities. pattern and its terms must have
        // been pre-annotated with probabilities as in meoh().
        var result = [];
        var self = this;
        pattern.terms.forEach( function(term) {
            result.push(self.realize_word(t, term));
        });
        return result.join(' ');
    }
    message(t) {
        this.push_sequential();
        var choice = this.choose_weighted(t, this.pattern_p);
        var text = this.realize_message(t, this.patterns[choice]);
        this.pop_sequential();
        return text;
    }
}

function mergelog(seed, dt) {
    return new Chooser(seed, dt, merge_messages);
}

function commitlog(seed, dt) {
    return new Chooser(seed, dt, commit_messages);
}

function gitlog(seed, dt, mergepf) {
    return new TwoWayChooser(
        seed, dt, [mergelog(seed, dt), commitlog(seed, dt)], mergepf) ;
}

function osx(seed, dt) {
    return new Madlib(seed, dt, osx_patterns);
}

function pix(seed, dt) {
    return new Madlib(seed, dt, pix_patterns);
}

function sysinfo(seed, dt) {
    return new Madlib(seed, dt, sysinfo_patterns);
}

function syserror(seed, dt) {
    return new Madlib(seed, dt, syserror_patterns);
}

function syslog(seed, dt, errpf) {
    return new TwoWayChooser(
        seed, dt, [syserror(seed, dt), sysinfo(seed, dt)], errpf) ;
}


module.exports = {
    sysinfo: sysinfo,
    syserror: syserror,
    syslog: syslog,
    mergelog: mergelog,
    commitlog: commitlog,
    gitlog: gitlog,
    osx: osx,
    pix: pix
};

