var expect = require('chai').expect;

var Autocompleter = require('../../lib/compiler/autocompleter');

describe('Autocompleter', function() {
    describe('getCompletions()', function() {
        var autocompleter;

        beforeEach(function() {
            autocompleter = new Autocompleter({
                // Deliberately in reverse-alphabetical order (to exercise
                // sorting code in the autocompleter).
                sinks: {
                    '@timechart': {
                        type: 'sink',
                        options: {}
                    },
                    '@tile': {
                        type: 'sink',
                        options: { timeField: {}, valueField: {}, valueFormat: {} },
                    },
                    '@barchart': {
                        type: 'sink',
                        options: {}
                    }
                }
            });
        });

        describe('proc autocomplete', function() {
            var R_COMPLETIONS = [
                { type: 'source', value: 'read' }
            ];
            var RE_COMPLETIONS = [
                { type: 'proc', value: 'reduce' },
                { type: 'proc', value: 'remove' },
            ];
            var TI_COMPLETIONS = [
                { type: 'sink', value: '@tile' },
                { type: 'sink', value: '@timechart' }
            ];

            it.skip('returns correct completions for an autocompletable proc start (head)', function() {
                var completions = autocompleter.getCompletions('r', 1);

                expect(completions).to.deep.equal(R_COMPLETIONS);
            });

            it('returns correct completions for an autocompletable proc start (tail)', function() {
                var completions = autocompleter.getCompletions('emit | re', 9);

                expect(completions).to.deep.equal(RE_COMPLETIONS);
            });

            it.skip('returns correct completions for an autocompletable sink start', function() {
                var completions = autocompleter.getCompletions('emit | @ti', 10);

                expect(completions).to.deep.equal(TI_COMPLETIONS);
            });

            it('returns no completions for a non-autocompletable proc start (head)', function() {
                var completions = autocompleter.getCompletions('foo', 3);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a non-autocompletable proc start (tail)', function() {
                var completions = autocompleter.getCompletions('emit | foo', 10);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a non-autocompletable sink start', function() {
                var completions = autocompleter.getCompletions('emit | @foo', 11);

                expect(completions).to.deep.equal([]);
            });

            it('works when the program is syntactically invalid', function() {
                var completions = autocompleter.getCompletions('(r', 2);

                expect(completions).to.deep.equal(R_COMPLETIONS);
            });
        });

        describe('option autocomplete', function() {
            var S_COMPLETIONS = [
                { type: 'option_name', proc: 'read', value: '-source_type' },
                { type: 'option_name', proc: 'read', value: '-space' }
            ];
            var VALUE_COMPLETIONS = [
                { type: 'option_name', proc: '@tile', value: '-valueField' },
                { type: 'option_name', proc: '@tile', value: '-valueFormat' }
            ];

            it.skip('returns correct completions for an autocompletable proc option start', function() {
                var completions = autocompleter.getCompletions('read -s "metric"', 7);

                expect(completions).to.deep.equal(S_COMPLETIONS);
            });

            it.skip('returns correct completions for an autocompletable sink option start', function() {
                var completions = autocompleter.getCompletions('@tile -value "value"', 12);

                expect(completions).to.deep.equal(VALUE_COMPLETIONS);
            });

            it('returns no completions for a proc option start of unknown proc', function() {
                var completions = autocompleter.getCompletions('foo -bar 5', 8);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a proc option start of unknown sink', function() {
                var completions = autocompleter.getCompletions('@foo -bar 5', 9);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a non-autocompletable proc option start', function() {
                var completions = autocompleter.getCompletions('read -foo 5', 9);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a non-autocompletable sink option start', function() {
                var completions = autocompleter.getCompletions('@tile -foo 5', 10);

                expect(completions).to.deep.equal([]);
            });

            it.skip('works when there are multiple option names in the program', function() {
                var completions = autocompleter.getCompletions('read -last :1h: -s', 18);

                expect(completions).to.deep.equal(S_COMPLETIONS);
            });

            it.skip('works when the program is syntactically invalid', function() {
                var completions = autocompleter.getCompletions('(read -s "metric"', 8);

                expect(completions).to.deep.equal(S_COMPLETIONS);
            });

            it.skip('does not return completions for already used options', function() {
                var completions = autocompleter.getCompletions('read -source_type "metric" -s', 29);

                expect(completions).to.deep.equal(S_COMPLETIONS.slice(1));
            });
        });

        describe("option value autocomplete", function() {
            var NAME_COMPLETIONS = [
                { type: 'option_name', proc: 'read', value: '-space' }
            ];

            var VALUE_COMPLETIONS = [
                { type: 'option_value', proc: 'read', option: 'space', query: 'spaces | put value = "\'" + name + "\'" | keep value' },
            ];

            // PROD-10098 - No option value completion when cursor is at the end of option name.
            it.skip('returns correct completions for an autocompletable proc option value start (without leading space)', function() {
                var completions = autocompleter.getCompletions('read -space', 11);

                expect(completions).to.deep.equal(NAME_COMPLETIONS);
            });

            it.skip('returns correct completions for an autocompletable proc option value start (with leading space)', function() {
                var completions = autocompleter.getCompletions('read -space ', 12);

                expect(completions).to.deep.equal(VALUE_COMPLETIONS);
            });

            it('returns no completions for a non-autocompletable proc option value start', function() {
                var completions = autocompleter.getCompletions('read -noopt ', 12);

                expect(completions).to.deep.equal([]);
            });

            it('returns no completions for a non-autocompletable sink option value start', function() {
                var completions = autocompleter.getCompletions('@tile -foo ', 11);

                expect(completions).to.deep.equal([]);
            });

            it.skip('works when the program is syntactically invalid', function() {
                var completions = autocompleter.getCompletions('(read -space ', 13);

                expect(completions).to.deep.equal(VALUE_COMPLETIONS);
            });

            it.skip('returns correct completions for an autocompletable proc option value', function() {
                var completions = autocompleter.getCompletions('read -space "te', 11);

                expect(completions).to.deep.equal(VALUE_COMPLETIONS);
            });
        });

        it('returns no completions when not at autocompletable region', function() {
            var completions = autocompleter.getCompletions('const re = 5;', 8);

            expect(completions).to.deep.equal([]);
        });
    });
});
