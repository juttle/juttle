/**
   words -- generate a variety of English word-based strings.

   You may construct a time-indexable generator by passing
   a StokeSequence object to the Word constructor. Or pass nothing
   for an uncontrolled generator.
*/
var StokeSequence = require('./stoke').StokeSequence;

var shortwords = require('./data/word-list');
var syswords =  require('./data/sysword-list');
var agents =  require('./data/agent-list');
var countries =  require('./data/country-list');
var domains =  require('./data/domain-list');
var firstnames = require('./data/firstname-list');
var lastnames = require('./data/lastname-list');
var merge_messages = require('./data/merge-message-list');
var commit_messages = require('./data/commit-message-list');

var Words = StokeSequence.extend({
    shortword: function word(t) {
        // return a random English word 4-6 characters long
        return this.choose(t, shortwords);
    },
    sysword: function sysword(t) {
        // return a random unix system path word 3-6 characters long
        return this.choose(t, syswords);
    },
    agent: function agent(t) {
        // return a random browser agent string
        return this.choose(t, agents);
    },
    country: function country(t) {
        // return a random country code
        return this.choose(t, countries);
    },
    domain: function domain(t) {
        // return a random internet domain name
        return this.choose(t, domains);
    },
    firstname: function firstname(t) {
        // return a random firstname
        return this.choose(t, firstnames);
    },
    lastname: function lastname(t) {
        // return a random lastname
        return this.choose(t, lastnames);
    },
    commit_message: function commit_message(t) {
        // return a git commit log message
        return this.choose(t, commit_messages);
    },
    merge_message: function merge_message(t) {
        // return a git merge log message
        return this.choose(t, merge_messages);
    },
    path: function path(t, n, m) {
        // return a random unix-like path with length between n and m inclusive.
        // if m is unspecified, return length n. n defaults to 5.
        n = n || 5;
        this.push_sequential();
        if (m) {
            n = this.integer(t, n, m);
        }
        for (var i=0, words=[]; i < n ; i++) {
            words.push(this.sysword(t));
        }
        this.pop_sequential();
        return '/' + words.join('/');
    },
    color: function color(t) {
        return this.choose(t, [
            'black', 'maroon', 'green', 'navy', 'olive',
            'purple', 'teal', 'lime', 'blue', 'silver',
            'gray', 'yellow', 'fuchsia', 'aqua', 'white'
        ]);
    }
});

module.exports = {
    Words: Words,
    shortwords: shortwords,
    syswords:syswords,
    agents: agents,
    countries: countries,
    domains: domains,
    firstnames: firstnames,
    lastnames: lastnames,
    merge_messages: merge_messages,
    commit_messages: commit_messages,
};

