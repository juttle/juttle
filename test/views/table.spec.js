var expect = require('chai').expect;
var TableView = require('../../lib/views').TableView;
var streams = require('memory-streams');


describe('table view', function () {

    it('outputs a simple table', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
        },{
            color: false
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        table.consume(data);
        table.eof();
        var lines = stream.toString().split('\n');
        expect(lines[1]).to.match(/│.*time.*│.*value.*│/);
        expect(lines[3]).to.match(/│.*2014-01-01T00:00:01.000Z.*│.*1.*│/);
        expect(lines[5]).to.match(/│.*2014-01-01T00:00:02.000Z.*│.*2.*│/);
        expect(lines[7]).to.match(/│.*2014-01-01T00:00:03.000Z.*│.*3.*│/);
    });

    it('respects -columnOrder', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
            columnOrder: ['value', 'time']
        },{
            color: false
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        table.consume(data);
        table.eof();
        var lines = stream.toString().split('\n');
        expect(lines[1]).to.match(/│.*value.*│.*time.*│/);
        expect(lines[3]).to.match(/│.*1.*│.*2014-01-01T00:00:01.000Z.*│/);
        expect(lines[5]).to.match(/│.*2.*│.*2014-01-01T00:00:02.000Z.*│/);
        expect(lines[7]).to.match(/│.*3.*│.*2014-01-01T00:00:03.000Z.*│/);
    });

    it('orders columns correctly', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
        },{
            color: false
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1, zfield: 'foo', afield: true },
            { time: '2014-01-01T00:00:02.000Z', value: 2, zfield: 'bar', afield: true },
            { time: '2014-01-01T00:00:03.000Z', value: 3, zfield: 'moo', afield: false },
        ];

        table.consume(data);
        table.eof();
        var lines = stream.toString().split('\n');
        expect(lines[1]).to.match(/│.*time.*│.*value.*│.*afield.*│.*zfield.*│/);
        expect(lines[3]).to.match(/│.*2014-01-01T00:00:01.000Z.*│.*1.*│.*true.*│.*foo.*│/);
        expect(lines[5]).to.match(/│.*2014-01-01T00:00:02.000Z.*│.*2.*│.*true.*│.*bar.*│/);
        expect(lines[7]).to.match(/│.*2014-01-01T00:00:03.000Z.*│.*3.*│.*false.*│.*moo.*│/);
    });

    it('does not truncate wide column headers', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
        },{
            color: false
        });

        var data = [
            { this_is_a_much_longer_header_than_its_value: true},
            { this_is_a_much_longer_header_than_its_value: true},
            { this_is_a_much_longer_header_than_its_value: false},
        ];

        table.consume(data);
        table.eof();
        var lines = stream.toString().split('\n');
        expect(lines[1]).to.match(/│.*this_is_a_much_longer_header_than_its_value.*│/);
        expect(lines[3]).to.match(/│.*true.*│/);
        expect(lines[5]).to.match(/│.*true.*│/);
        expect(lines[7]).to.match(/│.*false.*│/);
    });

    it('progressive mode truncates columns in subsequent batches', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
            progressive: true
        },{
            color: false
        });

        var batch1 = [
            { key: 'short' },
            { key: 'a bit longer' },
            { key: 'very much longer by far' },
            { key: 'shorter' }
        ];

        var batch2 = [
            { key: 'very very very very very much longer by far' }
        ];

        table.consume(batch1);
        table.consume(batch2);
        table.eof();

        var lines = stream.toString().split('\n');
        expect(lines).to.deep.equal([
            '┌───────────────────────────────────┐',
            '│ key                               │',
            '├───────────────────────────────────┤',
            '│ short                             │',
            '├───────────────────────────────────┤',
            '│ a bit longer                      │',
            '├───────────────────────────────────┤',
            '│ very much longer by far           │',
            '├───────────────────────────────────┤',
            '│ shorter                           │',
            '├───────────────────────────────────┤',
            '│ very very very very very much lo… │',
            '└───────────────────────────────────┘',
            '' ]);
    });

    it('warns if subsequent points arrive late with different keys', function() {
        var stream = new streams.WritableStream();
        var table = new TableView({
            fstream: stream,
            progressive: true
        },{
            color: false
        });

        var warnings = [];
        table.events.on('warning', function(msg) {
            warnings.push(msg);
        });

        table.consume([{key1: 'val1'}]);
        table.consume([{key2: 'val2'}]);
        table.eof();

        var lines = stream.toString().split('\n');
        expect(lines).to.deep.equal([
            '┌──────────┐',
            '│ key1     │',
            '├──────────┤',
            '│ val1     │',
            '├──────────┤',
            '│          │',
            '└──────────┘',
            ''
        ]);
        expect(warnings).to.deep.equal(['view table: Ignoring new point key(s) "key2"']);
    });
});
