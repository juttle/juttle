var expect = require('chai').expect;
var _ = require('underscore');

var JuttleMoment = require('../../../lib/moment').JuttleMoment;
var JuttleParser = require('../../../lib/parser/juttle-parser');
var SemanticPass = require('../../../lib/compiler/semantic');


var FilterSearcher = require('../../../lib/compiler/filters/filter-searcher.js');

describe('FilterSearcher', function() {

    var semantic = new SemanticPass({ now: new JuttleMoment() });

    var searcher = new FilterSearcher();

    describe('hasField(..)', function() {

        describe('filters where "value" field is present', function() {
            var filters = [
                'value == "abcd"',
                'value > 10',
                '"value" == v OR value <= 0',
                '"search term" value in ["value"]',
                'NOT value > 10'
            ];

            _.each(filters, function (filter) {
                it(filter, function() {
                    var ast = JuttleParser.parseFilter(filter).ast;
                    var sem_ast = semantic.sa_expr(ast);
                    expect(searcher.hasField(sem_ast, 'value')).to.equal(true);
                });
            });
        });

        describe('filters where "value" field is not present', function() {
            var filters = ['v == "abcd"',
                           'v == "value"',
                           'v == Date(0)',
                           '"value" == v',
                           '"value" "value"',
                           'v in ["value"]'];

            _.each(filters, function (filter) {
                it(filter, function() {
                    var ast = JuttleParser.parseFilter(filter).ast;
                    expect(searcher.hasField(ast, 'value')).to.equal(false);
                });
            });
        });
    });
    describe('FilterSearcher.hasFulltextTerm(..)', function() {

        describe('filters with fulltext term(s)', function() {
            var filters = [
                '?= "value"',
                'NOT ?= "value"',
                'NOT (?= "value")',
                '"value" == v OR (value <= 0 AND ?= "thing")',
                '?= "search term" value in ["value"]'
            ];

            _.each(filters, function (filter) {
                it(filter, function() {
                    var ast = JuttleParser.parseFilter(filter).ast;
                    var sem_ast = semantic.sa_expr(ast);
                    expect(searcher.hasFulltextTerm(sem_ast, 'value')).to.equal(true);
                });
            });
        });

        describe('filters without fulltext terms', function() {
            var filters = ['v == "abcd"',
                           'v == "value" AND a > 1',
                           'v == Date(0)',
                           '"value" == v',
                           'v in ["value"]'];

            _.each(filters, function (filter) {
                it(filter, function() {
                    var ast = JuttleParser.parseFilter(filter).ast;
                    expect(searcher.hasFulltextTerm(ast, 'value')).to.equal(false);
                });
            });
        });
    });
});
