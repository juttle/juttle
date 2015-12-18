var check_juttle = require('./specs/juttle-test-utils').check_juttle;

var expect = require('chai').expect;

describe('Juttle join tests, historic', function() {

    describe('Sanity: ', function() {
        it('complains if zip maxoffset is not a duration',
           function() {
               return check_juttle(
               { program: 'join -zip 0.01 |  view result'
               }).then(function() {
                   throw new Error("this should fail");
               }).catch(function(err) {
                   expect(err.code).to.equal('RT-JOIN-ZIP-ERROR');
               });
           });
        it('complains if nearest maxoffset is not a duration',
           function() {
               return check_juttle(
               { program: 'join -nearest 0.01 |  view result'
               }).then(function() {
                   throw new Error("this should fail");
               }).catch(function(err) {
                   expect(err.code).to.equal('RT-INVALID-OFFSET-ERROR');
               });
           });
        it('complains about zip and nearest at the same time',
           function() {
               return check_juttle(
               { program: 'join -nearest 0.01 -zip true |  view result'
               }).then(function() {
                   throw new Error("this should fail");
               }).catch(function(err) {
                   expect(err.code).to.equal('RT-JOIN-ZIP-NEAREST-ERROR');
               });
           });
        it('complains about a bogus option',
           function() {
               return check_juttle(
               { program: 'join -zip :0.01s: -once 1 -failure 1 |  view result'
               }).then(function(res) {
                   throw new Error("how did I get here?");
               }).catch(function(err) {
                   expect(err.code).to.equal('RT-UNKNOWN-OPTION-ERROR');
                   expect(err.info.proc).to.equal('join');
                   expect(err.info.option).to.equal('failure');
               });
           });
        it('complains about a numeric zip',
           function() {
               return check_juttle(
               { program: 'join -zip 1 |  view result'
               }).then(function(res) {
                   throw new Error("how did I get here?");
               }).catch(function(err) {
                   expect(err.code).to.equal('RT-JOIN-ZIP-ERROR');
               });
           });
    });

    describe('Join Once: ', function() {
        //
        it('joins timeful points as if they were timeless, with the -once flag.',
           // match a parts batch against a larger batched table of
           // assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                   ['const now=Date.new(0);', // get even batch starts for 3 and 5
                  '( emit -hz 1000 -from now -limit 5 ', // assy name table
                   '  | put batch=Math.floor(Duration.milliseconds((#time-now)/5)) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now -limit 3 ', // parts batch
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -once 1 assy_id ',
                  '  | remove time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0}
                   ]);
               });
           });
    });
    describe('Streaming Nearest Join: Points ', function() {
        //
        // when time is not specified as a join key, points are not
        // forced to time-align in lockstep pairs. Instead, a point is
        // matched to the most-recent not-newer point on the other
        // input. A join is triggered on arrival of each new timestamp
        // value at one of the inputs.
        //
        it('HSNP joins nearest point-by-point',
           // simplest positive case, exact matching, appears zipped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(.01) -limit 3',
                  '  | put a=count()-1, id=count()',
                  '; emit -hz 1000 -from Date.new(.01) -limit 3',
                  '  | put b=count()-1, id=count()',
                  ') | join | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(10).toISOString(), a:0, b:0, id:1},
                       {time:new Date(11).toISOString(), a:1, b:1, id:2},
                       {time:new Date(12).toISOString(), a:2, b:2, id:3}
                   ]);
               });
           });
        it('HSNP joins nearest with 0 offset selecting time-aligned subset',
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6 | put a=Math.floor((count()-1)/2)',
                  '; emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  ') | join -nearest :0s: | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(2).toISOString(), a:1, b:1},
                       {time:new Date(4).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with 0 offset selecting time-aligned subset, swapped',
           // swap inputs of previous test
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  '; emit -hz 1000 -from Date.new(0) -limit 6 | put a=Math.floor((count()-1)/2)',
                  ') | join -nearest :0s: | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(2).toISOString(), a:1, b:1},
                       {time:new Date(4).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest unmatched points',
           // nearest behavior hangs onto the final point of series b
           // while series a continues to match against it.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 1000 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join | remove time  |  view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {btime:'00:00:00.000', atime:'00:00:00.000', a:0, b:0},
                       {btime:'00:00:00.001', atime:'00:00:00.001', a:1, b:1},
                       {btime:'00:00:00.002', atime:'00:00:00.002', a:2, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.003', a:3, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.004', a:4, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.005', a:5, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest unmatched points',
           // same as previous, with inputs swapped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  '; emit -hz 1000 -from Date.new(0) -limit 6',
                  '  | put a=count()-1, atime=time-:0:',
                  ') | join | remove time  |  view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {btime:'00:00:00.000', atime:'00:00:00.000', a:0, b:0},
                       {btime:'00:00:00.001', atime:'00:00:00.001', a:1, b:1},
                       {btime:'00:00:00.002', atime:'00:00:00.002', a:2, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.003', a:3, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.004', a:4, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.005', a:5, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest, point-by-point with jitter',
           // phase-shift causes each point to participate in two
           // joins as alternating inputs advance and trigger a join
           // while the other remains ready. (You probably wanted to
           // join -zipped true if this was real-life, this test is a spec
           // verification, not a use-case)
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.005', btime:'00:00:00.010', a:0, b:1},
                       {atime:'00:00:00.015',btime:'00:00:00.010', a:1, b:1},
                       {atime:'00:00:00.015',btime:'00:00:00.020', a:1, b:2},
                       {atime:'00:00:00.025',btime:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins point-by-point with jitter and outer 1',
           // same example as above, but use -outer to limit outputs to one per 'a' input
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -outer 1 | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.015',btime:'00:00:00.010', a:1, b:1},
                       {atime:'00:00:00.025',btime:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins point-by-point with jitter and outer 2',
           // same example as above, but use -outer to limit outputs to one per 'b' input
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -outer 2 | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.005',btime:'00:00:00.010',  a:0, b:1},
                       {atime:'00:00:00.015',btime:'00:00:00.020',  a:1, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with outer selecting each from a fast stream',
           // here there are twice as many a points as b points.
           // verify that outer a gives us all the a points.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6 | put a=count()-1',
                  '; emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  ') | join -outer 1 | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(1).toISOString(), a:1, b:0},
                       {time:new Date(2).toISOString(), a:2, b:1},
                       {time:new Date(3).toISOString(), a:3, b:1},
                       {time:new Date(4).toISOString(), a:4, b:2},
                       {time:new Date(5).toISOString(), a:5, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with outer selecting each from a slow stream',
           // here there are twice as many a points as b points. use outer to
           // just get one of each of the b points.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6 | put a=Math.floor((count()-1)/2)',
                  '; emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  ') | join -outer 2 | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(2).toISOString(), a:1, b:1},
                       {time:new Date(4).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest point-by-point, though timestamps are skewed.',
           // two groups of points widely separated in time.  Each
           // point of the old group joins against the oldest point of
           // the new group, then each point of the new group joins
           // against the newest point of the old group. (not a useful
           // case, but a verification of the spec).
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(1) -limit 3 ',
                  '  | put atime=time-:0:, a=count()-1',
                  '; emit -hz 1000 -from Date.new(0) -limit 3 ',
                  '  | put btime=time-:0:, b=count()-1',
                  ') | join | remove time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:01.000', btime:'00:00:00.002', a:0, b:2},
                       {atime:'00:00:01.001', btime:'00:00:00.002', a:1, b:2},
                       {atime:'00:00:01.002', btime:'00:00:00.002', a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest point-by-point, though timestamps are skewed, inputs swapped.',
           // same as previous, with inputs swapped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3 ',
                  '  | put btime=time-:0:, b=count()-1',
                  '; emit -hz 1000 -from Date.new(1) -limit 3 ',
                  '  | put atime=time-:0:, a=count()-1',
                  ') | join | remove time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:01.000', btime:'00:00:00.002', a:0, b:2},
                       {atime:'00:00:01.001', btime:'00:00:00.002', a:1, b:2},
                       {atime:'00:00:01.002', btime:'00:00:00.002', a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with 0 maxoffset selecting time-aligned subset',
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6 | put a=Math.floor((count()-1)/2)',
                  '; emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  ') | join -nearest :0s: | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(2).toISOString(), a:1, b:1},
                       {time:new Date(4).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with 0 maxoffset selecting time-aligned subset, swapped',
           // same as above but with input order swapped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 500 -from Date.new(0) -limit 3 | put b=count()-1',
                  '; emit -hz 1000 -from Date.new(0) -limit 6 | put a=Math.floor((count()-1)/2)',
                  ') | join -nearest :0s: | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(2).toISOString(), a:1, b:1},
                       {time:new Date(4).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSNP joins nearest with joinfield',
           // time-aligned point by point join including an id field
           // which doesn't always match.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3',
                  '  | put a=count()-1, id=2',
                  '; emit -hz 1000 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, id=count()',
                  ') | join id | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(1).toISOString(), a:1, b:1, id:2}
                   ]);
               });
           });
        it('HSNP joins nearest with joinfield using subgraphs',
           function() {
               return check_juttle(
               { program:
                 ['sub teamColors() {',
                  '  (emit -from Date.new(0) -limit 1 | put team="alpha", color="#EB4A24";',
                  '   emit -from Date.new(0) -limit 1 | put team="beta", color="#7CBF42";',
                  '   emit -from Date.new(0) -limit 1 | put team="gamma", color="#34A8C8")',
                  '  | pass',
                  '}',
                  'sub teamScores() {',
                  '  (emit -hz 100 -limit 3 | put team="alpha", score=count();',
                  '   emit -hz 100 -limit 3 | put team="beta", score=count()*2;',
                  '   emit -hz 100 -limit 3 | put team="gamma", score=count()*3)',
                  '  | pass',
                  '}',
                  '(teamScores ; teamColors) | join team | keep team, color, score | view result'
                  ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"team":"alpha","score":1,"color":"#EB4A24"},
                       {"team":"beta", "score":2,"color":"#7CBF42"},
                       {"team":"gamma","score":3,"color":"#34A8C8"},
                       {"team":"alpha","score":2,"color":"#EB4A24"},
                       {"team":"beta", "score":4,"color":"#7CBF42"},
                       {"team":"gamma","score":6,"color":"#34A8C8"},
                       {"team":"alpha","score":3,"color":"#EB4A24"},
                       {"team":"beta", "score":6,"color":"#7CBF42"},
                       {"team":"gamma","score":9,"color":"#34A8C8"}
                   ]);
               });
           });
        it('HSNP cascaded join nearest, aligned stream',
           function() {
               return check_juttle(
               { program:
                 ('((emit -limit 3 -from Date.new(0) | put first=true, n=count() '+
                  ' ;emit -limit 4 -from Date.new(0) | put second=true, m=count() '+
                  ') | join '+
                  '; emit -limit 5 -from Date.new(0) | put third=true, p=count() '+
                  ') | join | view result')
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"time":"1970-01-01T00:00:00.000Z","first":true,"n":1,"second":true,"m":1,"third":true,"p":1},
                       {"time":"1970-01-01T00:00:01.000Z","first":true,"n":2,"second":true,"m":2,"third":true,"p":2},
                       {"time":"1970-01-01T00:00:02.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":3},
                       {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":4},
                       {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":5}
                   ]);
               });
           });
        it('HSNP cascaded join nearest, staggered stream',
           function() {
               return check_juttle(
               { program:
                 ('((emit -limit 3 -from Date.new(1) | put first=true, n=count() '+
                  ' ;emit -limit 4 -from Date.new(0) | put second=true, m=count() '+
                  ') | join '+
                  '; emit -limit 5 -from Date.new(0) | put third=true, p=count() '+
                  ') | join | view result')
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"time":"1970-01-01T00:00:01.000Z","first":true,"n":1,"second":true,"m":2,"third":true,"p":2},
                       {"time":"1970-01-01T00:00:02.000Z","first":true,"n":2,"second":true,"m":3,"third":true,"p":3},
                       {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":4},
                       {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":5}
                   ]);
               });
           });
    });
    describe('Streaming Nearest Join: Batches ', function() {
        //
        // in the batched version, batch timestamps are all that matters when
        // matching pointsets for a join against their most-recent
        // not-newer counterparts.
        //
        it('HSNB joins points against a batch.',
           // match a point stream of part names against a single batched
           // table of assy_id->assy_name mappings.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3 ', // assy name table
                 '  | batch :.003 second: | put batch=(time-:0:)/3',
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(1) -limit 9 ', // parts stream
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep time, batch, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time: '1970-01-01T00:00:01.000Z', batch:'00:00:00.000', part:'bar-1', assy:'baz-1'},
                       {time: '1970-01-01T00:00:01.001Z', batch:'00:00:00.000', part:'bar-2', assy:'baz-2'},
                       {time: '1970-01-01T00:00:01.002Z', batch:'00:00:00.000', part:'bar-3', assy:'baz-3'},
                       {time: '1970-01-01T00:00:01.003Z', batch:'00:00:00.000', part:'bar-4', assy:'baz-1'},
                       {time: '1970-01-01T00:00:01.004Z', batch:'00:00:00.000', part:'bar-5', assy:'baz-2'},
                       {time: '1970-01-01T00:00:01.005Z', batch:'00:00:00.000', part:'bar-6', assy:'baz-3'},
                       {time: '1970-01-01T00:00:01.006Z', batch:'00:00:00.000', part:'bar-7', assy:'baz-1'},
                       {time: '1970-01-01T00:00:01.007Z', batch:'00:00:00.000', part:'bar-8', assy:'baz-2'},
                       {time: '1970-01-01T00:00:01.008Z', batch:'00:00:00.000', part:'bar-9', assy:'baz-3'}
                   ]);
               });
           });
        it('HSNB joins nearest points against a sequence of early batches.',
           // match a point stream of part names against multiple batched
           // tables of assy_id->assy_name mappings. the batched tables all have earlier
           // timestamps than the point stream, so all joins should happen against
           // the final table batch and have the timestamps of the streaming points.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 9 ', // assy name table(s)
                  '  | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(1) -limit 9 ', // parts stream
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep time, part, assy, batch, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:'1970-01-01T00:00:01.000Z', part:'bar-1', assy:'baz-2.1', assy_id:1, batch:2},
                       {time:'1970-01-01T00:00:01.001Z', part:'bar-2', assy:'baz-2.2', assy_id:2, batch:2},
                       {time:'1970-01-01T00:00:01.002Z', part:'bar-3', assy:'baz-2.3', assy_id:3, batch:2},
                       {time:'1970-01-01T00:00:01.003Z', part:'bar-4', assy:'baz-2.1', assy_id:1, batch:2},
                       {time:'1970-01-01T00:00:01.004Z', part:'bar-5', assy:'baz-2.2', assy_id:2, batch:2},
                       {time:'1970-01-01T00:00:01.005Z', part:'bar-6', assy:'baz-2.3', assy_id:3, batch:2},
                       {time:'1970-01-01T00:00:01.006Z', part:'bar-7', assy:'baz-2.1', assy_id:1, batch:2},
                       {time:'1970-01-01T00:00:01.007Z', part:'bar-8', assy:'baz-2.2', assy_id:2, batch:2},
                       {time:'1970-01-01T00:00:01.008Z', part:'bar-9', assy:'baz-2.3', assy_id:3, batch:2}
                   ]);
               });
           });
        it('HSNB joins nearest points against a sequence of interleaved batches.',
           // match a point stream of part names against multiple batched
           // tables of assy_id->assy_name mappings. The point stream and batches
           // have interleaved timestamps, so the batch used will change over time.
           // use -outer so we only have to look at results triggered by the point
           // stream and no batch marks.
           // also, the first batch is not complete until .003 so the first result will be
           // a join of batch 0 with the .003 point.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 9 ', // assy name table(s)
                  '  | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 10 ', // parts stream
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -outer 2 assy_id | keep time, part, assy, batch, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:'1970-01-01T00:00:00.000Z', part:'bar-1', assy_id:1},
                       {time:'1970-01-01T00:00:00.001Z', part:'bar-2', assy_id:2},
                       {time:'1970-01-01T00:00:00.002Z', part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {time:'1970-01-01T00:00:00.003Z', part:'bar-4', assy:'baz-0.1', assy_id:1, batch:0},
                       {time:'1970-01-01T00:00:00.004Z', part:'bar-5', assy:'baz-0.2', assy_id:2, batch:0},
                       {time:'1970-01-01T00:00:00.005Z', part:'bar-6', assy:'baz-0.3', assy_id:3, batch:0},
                       {time:'1970-01-01T00:00:00.006Z', part:'bar-7', assy:'baz-1.1', assy_id:1, batch:1},
                       {time:'1970-01-01T00:00:00.007Z', part:'bar-8', assy:'baz-1.2', assy_id:2, batch:1},
                       {time:'1970-01-01T00:00:00.008Z', part:'bar-9', assy:'baz-1.3', assy_id:3, batch:1},
                       {time:'1970-01-01T00:00:00.009Z', part:'bar-10', assy:'baz-2.1', assy_id:1, batch:2}
                   ]);
               });
           });
        it('HSNB joins nearest a batch against a batch.',
           // match a parts batch against a larger batched table of
           // assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 5 ', // assy name table
                  '  | batch 0.005 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 3 ', // parts batch
                  '  | batch 0.003 | put bbatch=Math.floor(Duration.milliseconds(time-:0:)/3)',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep part, assy, batch, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0}
                   ]);
               });
           });
        it('HSNB joins nearest a sequence of batches against a recent fixed batch.',
           // match a sequnce of part batches against a larger batched table
           // of assy_id->assy_name mappings. All the early batches get dropped and there
           // is a single batch join against the late one.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 5 ',// assy name table
                  '  | batch :second: | put batch=Math.floor(Duration.milliseconds(time-:0:)/3) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',// parts batches
                  '  | batch 0.003 | put bbatch=Math.floor(Duration.milliseconds(time-:0:)/3)',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep time, batch, part, assy, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   var batch_end = new Date(1000).toISOString();
                   expect(res.sinks.result).to.deep.equal([
                       {time:batch_end, part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {time:batch_end, part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {time:batch_end, part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0}
                   ]);
               });
           });
        it('HSNB joins nearest a sequence of batches against a timeless batch.',
           // match a sequnce of part batches against a larger fixed table
           // of assy_id->assy_name mappings having no timestamps.
           // All join output gets the stamp of their batch ends.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 5 ',// assy name table
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '  | remove time',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',// parts batches
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep time, part, assy, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   var batch_1 = new Date(3).toISOString();
                   var batch_2 = new Date(6).toISOString();
                   var batch_3 = new Date(9).toISOString();
                   expect(res.sinks.result).to.deep.equal([
                       {time:batch_1, part:'bar-1', assy:'baz-1', assy_id:1},
                       {time:batch_1, part:'bar-2', assy:'baz-2', assy_id:2},
                       {time:batch_1, part:'bar-3', assy:'baz-3', assy_id:3},
                       {time:batch_2, part:'bar-1', assy:'baz-1', assy_id:1},
                       {time:batch_2, part:'bar-2', assy:'baz-2', assy_id:2},
                       {time:batch_2, part:'bar-3', assy:'baz-3', assy_id:3},
                       {time:batch_3, part:'bar-1', assy:'baz-1', assy_id:1},
                       {time:batch_3, part:'bar-2', assy:'baz-2', assy_id:2},
                       {time:batch_3, part:'bar-3', assy:'baz-3', assy_id:3}
                   ]);
               });
           });
        it('HSNB joins nearest a sequence of batches with gaps against a timeless batch.',
           // match a sequnce of part batches having an intervening sequence of
           // empty batches against a larger fixed table
           // of assy_id->assy_name mappings having no timestamps.
           // All join output gets the stamp of their batch ends.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 5 ',// assy name table
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '  | remove time',
                  '; emit -hz 1000 -from Date.new(0) -limit 18 ',// parts batches
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  '  | put ms = Date.unixms(time) | filter ms < 3 OR ms >= 15 ',
                  ') | join assy_id | keep time, part, assy, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   var batch_1 = new Date(3).toISOString();
                   var batch_6 = new Date(18).toISOString();
                   expect(res.sinks.result).to.deep.equal([
                       {time:batch_1, part:'bar-1', assy:'baz-1', assy_id:1},
                       {time:batch_1, part:'bar-2', assy:'baz-2', assy_id:2},
                       {time:batch_1, part:'bar-3', assy:'baz-3', assy_id:3},
                       {time:batch_6, part:'bar-1', assy:'baz-1', assy_id:1},
                       {time:batch_6, part:'bar-2', assy:'baz-2', assy_id:2},
                       {time:batch_6, part:'bar-3', assy:'baz-3', assy_id:3}
                   ]);
               });
           });
        it('HSNB joins nearest a sequence of batches against a sequence of batches.',
           // Yo dawg, we heard you like batches. So we put batches in your batches,
           // so you can batch when you're batching.
           // match a sequnce of part batches against multiple batched tables
           // of assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 12 ',// assy name table(s)
                  '  | batch 0.006 | put batch=Math.floor(Duration.milliseconds(time-:0:)/6) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',// parts batches
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep part, assy, assy_id, batch | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-1.1', assy_id:1, batch:1},
                       {part:'bar-2', assy:'baz-1.2', assy_id:2, batch:1},
                       {part:'bar-3', assy:'baz-1.3', assy_id:3, batch:1}
                   ]);
               });
           });
        it('HSNB 2 batched',
           function() {
               return check_juttle(
               { program:
                 ('(emit -limit 3 -from Date.new(1) | put first=true, n=count() | batch 1 '+
                  ' ;emit -limit 4 -from Date.new(2) | put second=true, m=count()| batch 1  '+
                  ') | join | view result'
                 )
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"time":"1970-01-01T00:00:03.000Z","first":true,"n":2,"second":true,"m":1},
                       {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":2},
                       {"time":"1970-01-01T00:00:05.000Z","first":true,"n":3,"second":true,"m":3},
                       {"time":"1970-01-01T00:00:06.000Z","first":true,"n":3,"second":true,"m":4}
                   ]);
               });
           });
        it('HSNB cascaded join nearest, all batched',
           function() {
               return check_juttle(
               { program:
                 ('((emit -limit 3 -from Date.new(0) | put first=true, n=count() | batch 1 '+
                  ' ;emit -limit 4 -from Date.new(0) | put second=true, m=count() | batch 1 '+
                  ' ) | join '+
                  '; emit -limit 5 -from Date.new(0) | put third=true, p=count() | batch 1 '+
                  ') | join | view result')
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"time":"1970-01-01T00:00:01.000Z","first":true,"n":1,"second":true,"m":1,"third":true,"p":1},
                       {"time":"1970-01-01T00:00:02.000Z","first":true,"n":2,"second":true,"m":2,"third":true,"p":2},
                       {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":3},
                       {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":4},
                       {"time":"1970-01-01T00:00:05.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":5},
                   ]);
               });
           });
    });
    describe('Streaming Zipped Join: Points', function() {
        //
        //
        it('HSZP joins point-by-point',
           // simplest positive case, exact matching, appears zipped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 3',
                  '  | put a=count()-1, id=count()',
                  '; emit -hz 1000 -from :now: -limit 3',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip true | keep a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {a:0, b:0, id:1},
                       {a:1, b:1, id:2},
                       {a:2, b:2, id:3}
                   ]);
               });
           });
        it('HSZP joins nearest with 0 offset selecting time-aligned subset',
           // simplest positive case, exact matching
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 6 | put a=Math.floor((count()-1)/2)',
                  '; emit -hz 500 -from :now: -limit 3 | put b=count()-1',
                  ') | join -zip :0s: | keep a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {a:0, b:0},
                       {a:1, b:1},
                       {a:2, b:2}
                   ]);
               });
           });
        it('HSZP joins given time-aligned, 1-1 points and -zip',
           // simplest positive case, exact matching
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3 | put a=count()-1',
                  '; emit -hz 1000 -from Date.new(0) -limit 3 | put b=count()-1',
                  ') | join -zip true |  view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0},
                       {time:new Date(1).toISOString(), a:1, b:1},
                       {time:new Date(2).toISOString(), a:2, b:2}
                   ]);
               });
           });
        it('HSZP drops unmatched points',
           // the zipped requirement means unpaired points are dropped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 6',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 1000 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -zip true | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), btime:'00:00:00.000', atime:'00:00:00.000', a:0, b:0},
                       {time:new Date(1).toISOString(), btime:'00:00:00.001', atime:'00:00:00.001', a:1, b:1},
                       {time:new Date(2).toISOString(), btime:'00:00:00.002', atime:'00:00:00.002', a:2, b:2}
                   ]);
               });
           });
        it('HSZP joins given skewed, 1-1 points using maxoffset',
           // the zipped requirement causes each point to
           // participate in one join, aligned with a nearby unjoined point
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -zip :0.01s: | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.015',btime:'00:00:00.010', a:1, b:1},
                       {atime:'00:00:00.025',btime:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('HSZP rejects skewed, 1-1 points using maxoffset',
           // the zipped requirement causes each point to
           // participate in one join, aligned with a nearby unjoined point
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -zip :0.002s: | keep atime, btime, a, b',
                  '| view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('HSZP rejects skewed, 1-1 points, exact time',
           // zipped 0s means exact timestamp matches, which none of these have.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0.005) -limit 3',
                  '  | put a=count()-1, atime=time-:0:',
                  '; emit -hz 100 -from Date.new(0) -limit 3',
                  '  | put b=count()-1, btime=time-:0:',
                  ') | join -zip :0s: | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('HSZP joins zipped, aligned, 1-1 using an id field',
           // join time. Given time-aligned stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()',
                  '; emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip true id | keep time, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:0, id:1},
                       {time:new Date(0).toISOString(), a:1, b:1, id:2},
                       {time:new Date(0).toISOString(), a:2, b:2, id:3},
                       {time:new Date(1).toISOString(), a:4, b:4, id:5},
                       {time:new Date(1).toISOString(), a:5, b:5, id:6},
                       {time:new Date(2).toISOString(), a:8, b:8, id:9}
                   ]);
               });
           });
        it('HSZP joins zipped, frequency mismatch, using an id field',
           // join time. Given time-aligned but skewed stream of
           // points, each of which has multiple points per timestamp,
           // use timestamp plus id to zip them together 1-1. points
           // with unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.004) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()+3',
                  '; emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.002) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) },',
                  '    { time: Date.new(0.003) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip true id | keep time, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(0).toISOString(), a:0, b:3, id:4},
                       {time:new Date(1).toISOString(), a:2, b:5, id:6},
                       {time:new Date(1).toISOString(), a:3, b:6, id:7},
                       {time:new Date(1).toISOString(), a:4, b:7, id:8},
                       {time:new Date(2).toISOString(), a:5, b:8, id:9},
                       {time:new Date(2).toISOString(), a:6, b:9, id:10},
                       {time:new Date(2).toISOString(), a:7, b:10,id:11},
                       {time:new Date(3).toISOString(), a:9, b:12,id:13},
                       {time:new Date(3).toISOString(), a:10, b:13,id:14}
                   ]);
               });
           });
        it('HSZP rejects jittered 1-1 points by time',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period. Easiest case
           // for timestamp mismatch-resampling behavior.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0) -limit 3 ',
                  '  | put a=count()-1, t=time-:0:',
                  '; emit -hz 100 -from Date.new(0.001) -limit 3 ',
                  '  | put b=count()-1',
                  ') | join -zip :0s: id | keep t, a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('HSZP joins given jittered 1-1 points and maxoffset',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period. Easiest case
           // for timestamp mismatch-resampling behavior.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0) -limit 3 ',
                  '  | put a=count()-1, t=time-:0:',
                  '; emit -hz 100 -from Date.new(0.001) -limit 3 ',
                  '  | put b=count()-1',
                  ') | join -zip :0.001s: id | keep t, a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:0},
                       {t:'00:00:00.010', a:1, b:1},
                       {t:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('HSZP joins given jittered and skewed 1-1 points and maxoffset',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period, and one stream
           // started up a few seconds earlier than the other.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 100 -from Date.new(0) -limit 9',
                  '  | put a=count()-1, t=time-:0:',
                  '; emit -hz 100 -from Date.new(0.03100) -limit 3',
                  '  | put b=count()-1',
                  ') | join -zip :0.001s: | keep t, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.030', a:3, b:0},
                       {t:'00:00:00.040', a:4, b:1},
                       {t:'00:00:00.050', a:5, b:2}
                   ]);
               });
           });
        it('HSZP joins zipped, frequency mismatch, jittered, 1-1 using an id field and maxoffset',
           // join time. Given time-aligned stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(3) },',
                  '    { time: Date.new(3) },',
                  '    { time: Date.new(3) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()',
                  '  | put t=time-:0:',
                  '; emit -points [',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip :0.01s: id |  keep t, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:0, id:1},
                       {t:'00:00:00.000', a:1, b:1, id:2},
                       {t:'00:00:00.000', a:2, b:2, id:3},
                       {t:'00:00:01.000', a:4, b:4, id:5},
                       {t:'00:00:01.000', a:5, b:5, id:6},
                       {t:'00:00:02.000', a:8, b:8, id:9}
                   ]);
               });
           });
        it('HSZP joins zipped, frequency mismatch, jittered and skewed, 1-1 using an id field and maxoffset',
           // join time. Given time-aligned but skewed stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -points [',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(0) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(1) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(2) },',
                  '    { time: Date.new(3) },',
                  '    { time: Date.new(3) },',
                  '    { time: Date.new(3) },',
                  '    { time: Date.new(4) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()+3',
                  '  | put t=time-:0:',
                  '; emit -points [',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(0.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(1.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(2.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) },',
                  '    { time: Date.new(3.001) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip :0.01s: id |  keep t, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:3, id:4},
                       {t:'00:00:01.000', a:2, b:5, id:6},
                       {t:'00:00:01.000', a:3, b:6, id:7},
                       {t:'00:00:01.000', a:4, b:7, id:8},
                       {t:'00:00:02.000', a:5, b:8, id:9},
                       {t:'00:00:02.000', a:6, b:9, id:10},
                       {t:'00:00:02.000', a:7, b:10, id:11},
                       {t:'00:00:03.000', a:9, b:12,id:13},
                       {t:'00:00:03.000', a:10, b:13,id:14}
                   ]);
               });
           });
        it('HSZP cascaded join, 1 zipped',
           function() {
               return check_juttle(
               { program:
                 ('((emit -limit 3 -from Date.new(0) | put first=true, n=count() '+
                  ' ;emit -limit 4 -from Date.new(0) | put second=true, m=count() '+
                  ') | join -zip true '+
                  '; emit -limit 5 -from Date.new(0) | put third=true, p=count() '+
                  ') | join | view result')
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {"time":"1970-01-01T00:00:00.000Z","first":true,"n":1,"second":true,"m":1,"third":true,"p":1},
                       {"time":"1970-01-01T00:00:01.000Z","first":true,"n":2,"second":true,"m":2,"third":true,"p":2},
                       {"time":"1970-01-01T00:00:02.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":3},
                       {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":4},
                       {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":5}
                   ]);
               });
           });
    });
    describe('Streaming Zipped Join: Batches', function() {
        it('HSZB joins zipped, points against a batch.',
           // match a point stream of part names against a single batched
           // table of assy_id->assy_name mappings. Since this is zipped,
           // the batch should only get to match one point
           // -- the one not exceeding its batch end time (this is not a useful example)
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 3 ',
                  '  | batch .003 | put batch=(time-:0:)/3 ',
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep batch, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {batch:'00:00:00.000', part:'bar-3', assy:'baz-3'}
                   ]);
               });
           });
        it('HSZB joins zipped, points against a sequence of batches.',
           // match a point stream of part names against multiple batched
           // tables of assy_id->assy_name mappings. Since batches only
           // get to match once, we should see output only at the batch change
           // times.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0) -limit 9 ',
                  '  | put batch=Math.floor(Duration.milliseconds(time-:0:)/3)',
                  '  | batch .003 ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep time, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time: new Date(3).toISOString(), part:'bar-3', assy:'baz-0.3'},
                       {time: new Date(6).toISOString(), part:'bar-6', assy:'baz-1.3'},
                       {time: new Date(9).toISOString(), part:'bar-9', assy:'baz-2.3'}
                   ]);
               });
           });
        it('HSZB joins zipped, a sequence of batches against a fixed batch.',
           // match a sequnce of part batches against one batched table
           // of assy_id->assy_name mappings. Since batches only get to match
           // once, the assy table should match only the second batch of parts.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0.003) -limit 3 ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-Date.new(0.003)))/3)',
                  '  | batch 0.003 ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep part, assy, batch, time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(6).toISOString(), part:'bar-1', assy:'baz-0.1', batch:0},
                       {time:new Date(6).toISOString(), part:'bar-2', assy:'baz-0.2', batch:0},
                       {time:new Date(6).toISOString(), part:'bar-3', assy:'baz-0.3', batch:0}
                   ]);
               });
           });
        it('HSZB joins zipped, a sequence of batches against a sequence of batches.',
           // match a sequnce of part batches against multiple batched tables
           // of assy_id->assy_name mappings. The sequences are shifted in time,
           // and only overlap to produce output for the 2nd and 3rd periods
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from Date.new(0.003) -limit 9 ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-Date.new(0.003)))/3)',
                  '  | batch .003 ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from Date.new(0) -limit 9 ',
                  '  | batch .003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep part, assy, time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {time:new Date(6).toISOString(), part:'bar-1', assy:'baz-0.1'},
                       {time:new Date(6).toISOString(), part:'bar-2', assy:'baz-0.2'},
                       {time:new Date(6).toISOString(), part:'bar-3', assy:'baz-0.3'},
                       {time:new Date(9).toISOString(), part:'bar-1', assy:'baz-1.1'},
                       {time:new Date(9).toISOString(), part:'bar-2', assy:'baz-1.2'},
                       {time:new Date(9).toISOString(), part:'bar-3', assy:'baz-1.3'}
                   ]);
               });
           });
    });
});

describe('Juttle join tests, realtime', function() {

    describe('Streaming Nearest Join: Points ', function() {
        //
        // when -zip is not specified, points are not forced to
        // time-align in lockstep pairs. Instead, a point is matched
        // to the most-recent not-newer point the other input. A join
        // is triggered on arrival of each new timestamp value at one
        // of the inputs.
        //
        it('RSNP joins point-by-point',
           // simplest positive case, exact matching, appears zipped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 3',
                  '  | put a=count()-1, id=count()',
                  '; emit -hz 1000 -from :now: -limit 3',
                  '  | put b=count()-1, id=count()',
                  ') | join | keep a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {a:0, b:0, id:1},
                       {a:1, b:1, id:2},
                       {a:2, b:2, id:3}
                   ]);
               });
           });
        it('RSNP joins nearest with 0 offset selecting time-aligned subset',
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 6 | put a=Math.floor((count()-1)/2)',
                  '; emit -hz 500 -from :now: -limit 3 | put b=count()-1',
                  ') | join -nearest :0s: | remove time | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {a:0, b:0},
                       {a:1, b:1},
                       {a:2, b:2}
                   ]);
               });
           });
        it('RSNP joins unmatched points',
           // nearest behavior hangs onto the final point of series b
           // while series a continues to match against it.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 6',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 1000 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join | keep atime, btime, a,b |  view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {btime:'00:00:00.000', atime:'00:00:00.000', a:0, b:0},
                       {btime:'00:00:00.001', atime:'00:00:00.001', a:1, b:1},
                       {btime:'00:00:00.002', atime:'00:00:00.002', a:2, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.003', a:3, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.004', a:4, b:2},
                       {btime:'00:00:00.002', atime:'00:00:00.005', a:5, b:2}
                   ]);
               });
           });
        it('RSNP joins point-by-point with jitter',
           // phase-shift causes each point to participate in two
           // joins as alternating inputs advance and trigger a join
           // while the other remains ready. (You probably wanted to
           // join -zip if this was real-life, this test is a spec
           // verification, not a use-case)
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.005); ',
                  '( emit -hz 100 -from jittered -limit 3',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 100 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.005', btime:'00:00:00.010', a:0, b:1},
                       {atime:'00:00:00.015',btime:'00:00:00.010', a:1, b:1},
                       {atime:'00:00:00.015',btime:'00:00:00.020', a:1, b:2},
                       {atime:'00:00:00.025',btime:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('RSNP rejects point-by-point with jitter',
           // setting maxoffset to 0 kills all the fun
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.005); ',
                  '( emit -hz 100 -from jittered -limit 3',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 100 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join -nearest :0s: | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('RSNP joins point-by-point, though timestamps are skewed.',
           // two groups of points, one realtime one historic.  Each
           // point of the new group joins against the newest point of
           // the old group. (not a useful case, but a verification of
           // the spec).
           function() {
               return check_juttle(
               { program:
                 ['const then=:now:-Duration.new(1); ',
                  '( emit -hz 1000 -from :now: -limit 3 ',
                  '  | put atime=#time-:now:, a=count()-1',
                  '; emit -hz 1000 -from then -limit 3 ',
                  '  | put btime=#time-:now:, b=count()-1',
                  ') | join | keep atime,btime,a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {btime:'-00:00:00.998', atime:'00:00:00.000', a:0, b:2},
                       {btime:'-00:00:00.998', atime:'00:00:00.001', a:1, b:2},
                       {btime:'-00:00:00.998', atime:'00:00:00.002', a:2, b:2}
                   ]);
               });
           });
        it('RSNP joins with joinfield',
           // time-aligned point by point join including an id field
           // which doesn't always match.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 3',
                  '  | put a=count()-1, id=2',
                  '; emit -hz 1000 -from :now: -limit 3',
                  '  | put b=count()-1, id=count()',
                  ') | join id | keep a,b,id | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {a:1, b:1, id:2}
                   ]);
               });
           });
    });
    describe('Streaming Nearest Join: Batches ', function() {
        //
        // in the batched version, batch timestamps are all that matters when
        // matching pointsets for a join against their most-recent
        // not-newer counterparts.
        //
        it('RSNB joins points against a batch.',
           // match a point stream of part names against a single batched
           // table of assy_id->assy_name mappings.
           function() {
               return check_juttle(
               { program:
                 ['const now=Date.quantize(:now:, Duration.new(0.003));',
                  '( emit -hz 1000 -from now -limit 3 ', // assy name table
                  '  | batch :s: | put batch=(#time-now)/3 ',
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now+:1s: -limit 9 ', // parts stream
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep batch, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {batch:'00:00:00.000', part:'bar-1', assy:'baz-1'},
                       {batch:'00:00:00.000', part:'bar-2', assy:'baz-2'},
                       {batch:'00:00:00.000', part:'bar-3', assy:'baz-3'},
                       {batch:'00:00:00.000', part:'bar-4', assy:'baz-1'},
                       {batch:'00:00:00.000', part:'bar-5', assy:'baz-2'},
                       {batch:'00:00:00.000', part:'bar-6', assy:'baz-3'},
                       {batch:'00:00:00.000', part:'bar-7', assy:'baz-1'},
                       {batch:'00:00:00.000', part:'bar-8', assy:'baz-2'},
                       {batch:'00:00:00.000', part:'bar-9', assy:'baz-3'}
                   ]);
               });
           });
        it('RSNB joins points against a sequence of batches.',
           // match a point stream of part names against multiple batched
           // tables of assy_id->assy_name mappings.
           // use -outer to filter out noise from the changing batched tables.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 9 ', // assy name table(s)
                  '  | batch -every :.003s: -on :now: ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-:now:))/3) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from :now: -limit 9 ', // parts stream
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -outer 2 assy_id | keep part, assy, batch, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy_id:1},
                       {part:'bar-2', assy_id:2},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-4', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-5', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-6', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-7', assy:'baz-1.1', assy_id:1, batch:1},
                       {part:'bar-8', assy:'baz-1.2', assy_id:2, batch:1},
                       {part:'bar-9', assy:'baz-1.3', assy_id:3, batch:1}
                   ]);
               });
           });
        it('RSNB joins a batch against a batch.',
           // match a parts batch against a larger batched table of
           // assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                 ['const now=Date.quantize(:now:, Duration.new(0.015));', // get even batch starts for 3 and 5
                  '( emit -hz 1000 -from now -limit 5 ', // assy name table
                  '  | batch 0.005 | put batch=Math.floor(Duration.milliseconds((#time-now))/5) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now -limit 3 ', // parts batch
                  '  | batch 0.003 | put bbatch=(#time-now)/3',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep part, assy, batch, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0}
                   ]);
               });
           });
        it('RSNB joins a sequence of batches against a fixed batch.',
           // match a sequnce of part batches against a larger batched table
           // of assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 5 ',// assy name table
                  '  | batch -every :.005s: -on :now: | put batch=Math.floor(Duration.milliseconds((#time-:now:))/5) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from :now:+:.015s: -limit 9 ',// parts batches
                  '  | batch -every :0.003s: -on :now: | put bbatch=(#time-:now:)/3',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -outer 2 assy_id | keep batch, part, assy, assy_id',
                  '  | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0}
                   ]);
               });
           });
        it('RSNB joins a sequence of batches against a sequence of batches.',
           // match a sequnce of part batches against multiple batched tables
           // of assy_id->assy_name mappings
           function() {
               return check_juttle(
               { program:
                 ['const now=Date.quantize(:now:, Duration.new(0.006));',
                  '( emit -hz 1000 -from now -limit 12 ',// assy name table(s)
                  '  | batch 0.006 | put batch=Math.floor(Duration.milliseconds((#time-now))/6) ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now -limit 9 ',// parts batches
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join assy_id | keep part, assy, assy_id, batch | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-0.1', assy_id:1, batch:0},
                       {part:'bar-2', assy:'baz-0.2', assy_id:2, batch:0},
                       {part:'bar-3', assy:'baz-0.3', assy_id:3, batch:0},
                       {part:'bar-1', assy:'baz-1.1', assy_id:1, batch:1},
                       {part:'bar-2', assy:'baz-1.2', assy_id:2, batch:1},
                       {part:'bar-3', assy:'baz-1.3', assy_id:3, batch:1}
                   ]);
               });
           });
    });
    describe('Streaming Join Zip: Points', function() {
        //
        //

        // XXX make a test where join on time to get exact match, but without 1-1 specified

        it('RSZP drops unmatched points',
           // the zipped requirement means unpaired points are dropped
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 6',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 1000 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join -zip true | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {btime:'00:00:00.000', atime:'00:00:00.000', a:0, b:0},
                       {btime:'00:00:00.001', atime:'00:00:00.001', a:1, b:1},
                       {btime:'00:00:00.002', atime:'00:00:00.002', a:2, b:2}
                   ]);
               });
           });
        it('RSZP rejects given skewed, 1-1 points and exact timestamp matching',
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.005); ',
                  '( emit -hz 100 -from jittered -limit 3',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 100 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join -zip :0s: | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('RSZP joins given skewed, 1-1 points and maxoffset',
           // the zipped requirement causes each point to
           // participate in one join, aligned with a nearby unjoined point
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.005); ',
                  '( emit -hz 100 -from jittered -limit 3',
                  '  | put a=count()-1, atime=#time-:now:',
                  '; emit -hz 100 -from :now: -limit 3',
                  '  | put b=count()-1, btime=#time-:now:',
                  ') | join -zip :0.005s:  | keep atime, btime, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {atime:'00:00:00.005', btime:'00:00:00.000', a:0, b:0},
                       {atime:'00:00:00.015', btime:'00:00:00.010', a:1, b:1},
                       {atime:'00:00:00.025', btime:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('RSZP joins zipped, aligned, 1-1 using an id field',
           // join time. Given time-aligned stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['( emit -points [',
                  '    { time: :now: },',
                  '    { time: :now: },',
                  '    { time: :now: },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.003) },',
                  '    { time: :now: + Duration.new(0.003) },',
                  '    { time: :now: + Duration.new(0.003) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()',
                  '  | put t=#time-:now:',
                  '; emit -points [',
                  '    { time: :now: },',
                  '    { time: :now: },',
                  '    { time: :now: },',
                  '    { time: :now: },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.001) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.002) },',
                  '    { time: :now: + Duration.new(0.003) },',
                  '    { time: :now: + Duration.new(0.003) },',
                  '    { time: :now: + Duration.new(0.003) },',
                  '    { time: :now: + Duration.new(0.003) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  '  | put t=#time-:now:',
                  ') | join -zip true id | keep t, a, b, id| view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:0, id:1},
                       {t:'00:00:00.000', a:1, b:1, id:2},
                       {t:'00:00:00.000', a:2, b:2, id:3},
                       {t:'00:00:00.001', a:4, b:4, id:5},
                       {t:'00:00:00.001', a:5, b:5, id:6},
                       {t:'00:00:00.002', a:8, b:8, id:9}
                   ]);
               });
           });
        it('RSZP joins zipped, frequency mismatch, using an id field',
           // join time. Given time-aligned but skewed stream of
           // points, each of which has multiple points per timestamp,
           // use timestamp plus id to zip them together 1-1. points
           // with unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['const now1=:now:+Duration.new(0.1); ',
                  '( emit -points [',
                  '    { time: now1 },',
                  '    { time: now1 },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.004) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()+3',
                  '; emit -points [',
                  '    { time: now1 },',
                  '    { time: now1 },',
                  '    { time: now1 },',
                  '    { time: now1 },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.001) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.002) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.003) },',
                  '    { time: now1 + Duration.new(0.003) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  '  | put t=#time-now1',
                  ') | join -zip true id | keep a, b, id, t | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:3, id:4},
                       {t:'00:00:00.001', a:2, b:5, id:6},
                       {t:'00:00:00.001', a:3, b:6, id:7},
                       {t:'00:00:00.001', a:4, b:7, id:8},
                       {t:'00:00:00.002', a:5, b:8, id:9},
                       {t:'00:00:00.002', a:6, b:9, id:10},
                       {t:'00:00:00.002', a:7, b:10,id:11},
                       {t:'00:00:00.003', a:9, b:12,id:13},
                       {t:'00:00:00.003', a:10, b:13,id:14}
                   ]);
               });
           });
        it('RSZP rejects jittered 1-1 points on exact time',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period. Easiest case
           // for timestamp mismatch-resampling behavior.
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.001); ',
                  '( emit -hz 100 -from :now: -limit 3 ',
                  '  | put a=count()-1, t=#time-:now:',
                  '; emit -hz 100 -from jittered -limit 3 ',
                  '  | put b=count()-1',
                  ') | join -zip :0s: id | keep t, a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('RSZP joins given jittered 1-1 points and maxoffset',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period. Easiest case
           // for timestamp mismatch-resampling behavior.
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.001); ',
                  '( emit -hz 100 -from :now: -limit 3 ',
                  '  | put a=count()-1, t=#time-:now:',
                  '; emit -hz 100 -from jittered -limit 3 ',
                  '  | put b=count()-1',
                  ') | join -zip :0.001s: id | keep t, a,b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:0},
                       {t:'00:00:00.010', a:1, b:1},
                       {t:'00:00:00.020', a:2, b:2}
                   ]);
               });
           });
        it('RSZP rejects jittered and skewed 1-1 points on time',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period, and one stream
           // started up a few seconds earlier than the other.
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.031); ',
                 '( emit -hz 100 -from :now: -limit 9',
                  '  | put a=count()-1, t=#time-:now:',
                  '; emit -hz 100 -from jittered -limit 3',
                  '  | put b=count()-1',
                  ') | join -zip :0s: | keep t, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([]);
               });
           });
        it('RSZP joins given jittered and skewed 1-1 points and maxoffset',
           // join time. streams are at a common freq but timestamps are
           // offset from each other by less than a period, and one stream
           // started up a few seconds earlier than the other.
           function() {
               return check_juttle(
               { program:
                 ['const jittered=:now:+Duration.new(0.031); ',
                 '( emit -hz 100 -from :now: -limit 9',
                  '  | put a=count()-1, t=#time-:now:',
                  '; emit -hz 100 -from jittered -limit 3',
                  '  | put b=count()-1',
                  ') | join -zip :0.001s: | keep t, a, b | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.030', a:3, b:0},
                       {t:'00:00:00.040', a:4, b:1},
                       {t:'00:00:00.050', a:5, b:2}
                   ]);
               });
           });
        it('RSZP joins zipped, frequency mismatch, jittered, 1-1 using an id field and maxoffset',
           // join time. Given time-aligned stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['const now=:now:+Duration.new(0.1); ',
                  '( emit -points [',
                  '    { time: now },',
                  '    { time: now },',
                  '    { time: now },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(3) },',
                  '    { time: now + Duration.new(3) },',
                  '    { time: now + Duration.new(3) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()',
                  '  | put t=time-now',
                  '; emit -points [',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  ') | join -zip :0.01s: id |  keep t, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:0, id:1},
                       {t:'00:00:00.000', a:1, b:1, id:2},
                       {t:'00:00:00.000', a:2, b:2, id:3},
                       {t:'00:00:01.000', a:4, b:4, id:5},
                       {t:'00:00:01.000', a:5, b:5, id:6},
                       {t:'00:00:02.000', a:8, b:8, id:9}
                   ]);
               });
           });
        it('RSZP joins zipped, frequency mismatch, jittered and skewed, 1-1 using an id field and maxoffset',
           // join time. Given time-aligned but skewed stream of points, each
           // of which has multiple points per timestamp, use
           // timestamp plus id to zip them together 1-1. points with
           // unmatched id+timestamp are dropped.
           function() {
               return check_juttle(
               { program:
                 ['const now=:now:+Duration.new(0.1); ',
                  '( emit -points [',
                  '    { time: now },',
                  '    { time: now },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(1) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(2) },',
                  '    { time: now + Duration.new(3) },',
                  '    { time: now + Duration.new(3) },',
                  '    { time: now + Duration.new(3) },',
                  '    { time: now + Duration.new(4) }',
                  '  ] ',
                  '  | put a=count()-1, id=count()+3',
                  '  | put t=#time-now',
                  '; emit -points [',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(0.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(1.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(2.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) },',
                  '    { time: now + Duration.new(3.001) }',
                  '  ] ',
                  '  | put b=count()-1, id=count()',
                  '  | put bt=#time-now+Duration.new(0.001)',
                  ') | join -zip :0.01s: id |  keep t, a, b, id | view result'
                 ].join(" ")
               }).then(function(res) {
                   // XXX this is fragile, ordering of points for a given
                   // timestamp value is not determined by the join definition
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.000', a:0, b:3, id:4},
                       {t:'00:00:01.000', a:2, b:5, id:6},
                       {t:'00:00:01.000', a:3, b:6, id:7},
                       {t:'00:00:01.000', a:4, b:7, id:8},
                       {t:'00:00:02.000', a:5, b:8, id:9},
                       {t:'00:00:02.000', a:6, b:9, id:10},
                       {t:'00:00:02.000', a:7, b:10, id:11},
                       {t:'00:00:03.000', a:9, b:12,id:13},
                       {t:'00:00:03.000', a:10, b:13,id:14}
                   ]);
               });
           });
    });
    describe('Streaming Zipped Join: Batches', function() {
        it('RSZB joins zipped, points against a batch.',
           // match a point stream of part names against a single batched
           // table of assy_id->assy_name mappings. Since this is zipped,
           // the batch should only get to match one point -- the one whose
           // timestamp is closest to the batch end of eps.003
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 3 ',
                  '  | batch -every :.003s: -on :now: | put batch=(#time-:now:)/3 ',
                  '  | put assy="baz-"+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from :now: -limit 9 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep batch, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {batch:'00:00:00.000', part:'bar-3', assy:'baz-3'}
                   ]);
               });
           });
        it('RSZB joins zipped, points against a sequence of batches.',
           // match a point stream of part names against multiple batched
           // tables of assy_id->assy_name mappings. Since batches only
           // get to match once, we should see output only at the batch change
           // times. It will be the point closest to the batch end time.
           function() {
               return check_juttle(
               { program:
                 ['( emit -hz 1000 -from :now: -limit 9 ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-:now:))/3), t=#time-:now:',
                  '  | batch -every :.003s: -on :now: ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from :now: -limit 9 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | keep t, part, assy | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t: '00:00:00.002', part:'bar-3', assy:'baz-0.3'},
                       {t: '00:00:00.005', part:'bar-6', assy:'baz-1.3'},
                       {t: '00:00:00.008', part:'bar-9', assy:'baz-2.3'}
                   ]);
               });
           });
        it('RSZB joins zipped, a sequence of batches against a fixed batch.',
           // match a sequnce of part batches against one batched table
           // of assy_id->assy_name mappings. Since batches only get to match
           // once, the assy table should match only the second batch of parts.
           function() {
               return check_juttle(
               { program:
                 ['const now=Date.quantize(:now:, Duration.new(0.003)); const jittered=now+Duration.new(0.003);',
                  '( emit -hz 1000 -from jittered -limit 3 ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-now-Duration.new(0.003)))/3)',
                  '  | batch 0.003 ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now -limit 9 ',
                  '  | batch 0.003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | put t=#time-now | keep part, assy, batch, t | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.006', part:'bar-1', assy:'baz-0.1', batch:0},
                       {t:'00:00:00.006', part:'bar-2', assy:'baz-0.2', batch:0},
                       {t:'00:00:00.006', part:'bar-3', assy:'baz-0.3', batch:0}
                   ]);
               });
           });
        it('RSZB joins zipped, a sequence of batches against a sequence of batches.',
           // match a sequnce of part batches against multiple batched tables
           // of assy_id->assy_name mappings. The sequences are shifted in time,
           // and only overlap to produce output for the 2nd and 3rd periods
           function() {
               return check_juttle(
               { program:
                 ['const now=Date.quantize(:now:, Duration.new(0.003)); const jittered=now+Duration.new(0.003);',
                  '( emit -hz 1000 -from jittered -limit 9 ',
                  '  | put batch=Math.floor(Duration.milliseconds((#time-now-Duration.new(0.003)))/3)',
                  '  | batch .003 ',
                  '  | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()',
                  '; emit -hz 1000 -from now -limit 9 ',
                  '  | batch .003 ',
                  '  | put part="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3',
                  ') | join -zip true assy_id | put t=#time-now | keep part, assy, t | view result'
                 ].join(" ")
               }).then(function(res) {
                   expect(res.sinks.result).to.deep.equal([
                       {t:'00:00:00.006', part:'bar-1', assy:'baz-0.1'},
                       {t:'00:00:00.006', part:'bar-2', assy:'baz-0.2'},
                       {t:'00:00:00.006', part:'bar-3', assy:'baz-0.3'},
                       {t:'00:00:00.009', part:'bar-1', assy:'baz-1.1'},
                       {t:'00:00:00.009', part:'bar-2', assy:'baz-1.2'},
                       {t:'00:00:00.009', part:'bar-3', assy:'baz-1.3'}
                   ]);
               });
           });
    });
});
