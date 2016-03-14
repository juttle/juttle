# Join tests

## join -table syntax: complains about out-of-range table
###Juttle
    emit -from Date.new(0) -limit 1
    | (put foo=1; put bar=2; put baz=3)
    | join -table 5 | view sink1

### Errors
   * -table must be an input number (1, 2, ...).

## join -table syntax: complains about nonnumeric table
###Juttle
    emit -from Date.new(0) -limit 1
    | (put foo=1; put bar=2; put baz=3)
    | join -table true | view sink1

### Errors
   * -table must be an input number (1, 2, ...).

## join -table syntax: complains of -outer and -table for same input
###Juttle
    emit -from Date.new(0) -limit 1
    | (put foo=1; put bar=2; put baz=3)
    | join -outer 2 -table 2 | view sink1

### Errors
   * -table and -outer cannot be specified for the same input

## (skip) join against a batched table complains
XXX we specifie the proper error output here, and it shows up in
the test output, yet the test fails.

### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1980-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1980-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1980-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  batch :3s:
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -table 1 id | view result

### Errors
   * -table input cannot be batched.

## complains about unknown options
### Juttle
    emit -limit 1 | join -failure 1 foo, bar | remove time | view result

### Errors
   * CompileError: unknown join option failure.

## not everything can be a table
### Juttle
    emit -from Date.new(0) -limit 1 |
    join -table 1 |  view result

### Errors
   * at least one input must not be a table

## System Test C4107 Scenario 2: join 2 event streams using once to generate every combination possible
### Juttle
    const services = [
    {"source_type": "event", "time": :now:+:0s:, "name": "C4107.<test:runid>.services", "space": "default", "service": "collector" },
    {"source_type": "event", "time": :now:+:1s:, "name": "C4107.<test:runid>.services", "space": "default", "service": "engine" },
    {"source_type": "event", "time": :now:+:2s:, "name": "C4107.<test:runid>.services", "space": "default", "service": "processor"},
    ];
    const environments = [
    {"source_type": "event", "time": :now:+:0s:, "name": "C4107.<test:runid>.environments", "space": "default", "env": "production.dev.jut.io"},
    {"source_type": "event", "time": :now:+:2s:, "name": "C4107.<test:runid>.environments", "space": "default", "env": "staging.dev.jut.io"},
    {"source_type": "event", "time": :now:+:2s:, "name": "C4107.<test:runid>.environments", "space": "default", "env": "testing.dev.jut.io"}
    ];
    (emit -points services
    ;emit -points environments
    )| join -once true
    | keep service, env
    | sort service, env
    | view result

### Output
    {"service":"collector","env":"production.dev.jut.io"}
    {"service":"collector","env":"staging.dev.jut.io"}
    {"service":"collector","env":"testing.dev.jut.io"}
    {"service":"engine","env":"production.dev.jut.io"}
    {"service":"engine","env":"staging.dev.jut.io"}
    {"service":"engine","env":"testing.dev.jut.io"}
    {"service":"processor","env":"production.dev.jut.io"}
    {"service":"processor","env":"staging.dev.jut.io"}
    {"service":"processor","env":"testing.dev.jut.io"}

## System Test C4105 Scenario: join metric stream with a small event stream using nearest option to dictate the joining groups
### Juttle
    const series1 =
    [
    {"source_type": "metric", "time": "2010-01-01T00:00:00.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 20},
    {"source_type": "metric", "time": "2010-01-01T00:00:01.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 20},
    {"source_type": "metric", "time": "2010-01-01T00:00:02.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 30},
    {"source_type": "metric", "time": "2010-01-01T00:00:03.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 25},
    {"source_type": "metric", "time": "2010-01-01T00:00:04.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 30},
    {"source_type": "metric", "time": "2010-01-01T00:00:05.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 10},
    {"source_type": "metric", "time": "2010-01-01T00:00:06.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 25},
    {"source_type": "metric", "time": "2010-01-01T00:00:07.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 35},
    {"source_type": "metric", "time": "2010-01-01T00:00:08.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 35},
    {"source_type": "metric", "time": "2010-01-01T00:00:09.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 40},
    {"source_type": "metric", "time": "2010-01-01T00:00:10.000Z", "name": "C4105.<test:runid>.series1", "space": "default", "host": "alpha", "value": 45}
    ];
    const series2 =
    [
    {"source_type": "event", "time": "2010-01-01T00:00:00.000Z", "name": "C4105.<test:runid>.series2", "space": "default", "group": "A"},
    {"source_type": "event", "time": "2010-01-01T00:00:05.000Z", "name": "C4105.<test:runid>.series2", "space": "default", "group": "B"},
    {"source_type": "event", "time": "2010-01-01T00:00:10.000Z", "name": "C4105.<test:runid>.series2", "space": "default", "group": "C"}
    ];
    ( emit -points series1
    ; emit -points series2
    )| join  -nearest :2 seconds:
    | keep time, value, group
    | view result

### Output
    {"time":"2010-01-01T00:00:00.000Z","value":20,"group":"A"}
    {"time":"2010-01-01T00:00:01.000Z","value":20,"group":"A"}
    {"time":"2010-01-01T00:00:02.000Z","value":30,"group":"A"}
    {"time":"2010-01-01T00:00:05.000Z","value":10,"group":"B"}
    {"time":"2010-01-01T00:00:06.000Z","value":25,"group":"B"}
    {"time":"2010-01-01T00:00:07.000Z","value":35,"group":"B"}
    {"time":"2010-01-01T00:00:10.000Z","value":45,"group":"C"}

## handles -once with no data
### Juttle
    (emit -every :1s: -from :-2s: -to :now:
    |( filter name="foo"
    ; filter name="foo"
    ) | join -once true | view result
    ; emit -limit 1 -from Date.new(0) | put ok=true | remove time | view result) // workaround empty test result

### Output
    {ok:true}


## handles -once with live ticks and no data
### Juttle
    (emit -every :2s: -from :now: -to :+4s:
    |( filter name="foo"
    ; filter name="foo"
    ) | join -once true | view result
    ; emit -limit 1 -from Date.new(0) | put ok=true | remove time | view result) // workaround empty test result

### Output
    {ok:true}

## joins 3 1-point streams
### Juttle
    emit -from :2010-01-01: -limit 1
    | ( put foo=1; put bar=2; put baz=3)
    | join | view result

### Output
    { "time":"2010-01-01T00:00:00.000Z", "foo":1, "bar":2, "baz":3 }

## joins 3 1-point streams with nested points
### Juttle
    emit -from :2010-01-01: -limit 1
    | ( put foo={ i: 1 }; put bar={ i: 2 }; put baz={ i: 3 })
    | join | view result

### Output
    { "time":"2010-01-01T00:00:00.000Z", "foo":{"i":1}, "bar":{"i":2}, "baz":{"i":3} }

## joins an unbatched stream against an advancing batched table and a fixed batched table
### Juttle
    ( emit -hz 1000 -from Date.new(0) -limit 9
        | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3)
        | put peek="peek-"+Number.toString(#batch)+"."+Number.toString(count()), cookie_id=count()
    ; emit -hz 1000 -from Date.new(0) -limit 3
        | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3)
        | put frean="frean-"+Number.toString(#batch)+"."+Number.toString(count()), cookie_id=count()
    ; emit -hz 1000 -from Date.new(1) -limit 9
        | put cookie="cookie-"+Number.toString(count()-1), cookie_id=1+(count()-1)%3
    ) | join cookie_id | keep time, peek, frean, cookie
    | view result

### Output
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-2.1","frean":"frean-0.1","cookie":"cookie-0"}
    {"time":"1970-01-01T00:00:01.001Z","peek":"peek-2.2","frean":"frean-0.2","cookie":"cookie-1"}
    {"time":"1970-01-01T00:00:01.002Z","peek":"peek-2.3","frean":"frean-0.3","cookie":"cookie-2"}
    {"time":"1970-01-01T00:00:01.003Z","peek":"peek-2.1","frean":"frean-0.1","cookie":"cookie-3"}
    {"time":"1970-01-01T00:00:01.004Z","peek":"peek-2.2","frean":"frean-0.2","cookie":"cookie-4"}
    {"time":"1970-01-01T00:00:01.005Z","peek":"peek-2.3","frean":"frean-0.3","cookie":"cookie-5"}
    {"time":"1970-01-01T00:00:01.006Z","peek":"peek-2.1","frean":"frean-0.1","cookie":"cookie-6"}
    {"time":"1970-01-01T00:00:01.007Z","peek":"peek-2.2","frean":"frean-0.2","cookie":"cookie-7"}
    {"time":"1970-01-01T00:00:01.008Z","peek":"peek-2.3","frean":"frean-0.3","cookie":"cookie-8"}

## single join of unbatched points against two batched tables with -once
### Juttle
    ( emit -hz 1000 -from Date.new(0) -limit 3
        | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3)
        | put peek="peek-"+Number.toString(#batch)+"."+Number.toString(count()), cookie_id=count()
    ; emit -hz 1000 -from Date.new(0) -limit 3
        | batch .003 | put batch=Math.floor(Duration.milliseconds(time-:0:)/3)
        | put frean="frean-"+Number.toString(#batch)+"."+Number.toString(count()), cookie_id=count()
    ; emit -hz 1000 -from Date.new(1) -limit 9
        | put cookie="cookie-"+Number.toString(count()-1), cookie_id=1+(count()-1)%3
    ) | join -once true cookie_id | keep time, peek, frean, cookie
    | view result

### Output
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.1","frean":"frean-0.1","cookie":"cookie-0"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.1","frean":"frean-0.1","cookie":"cookie-3"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.1","frean":"frean-0.1","cookie":"cookie-6"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.2","frean":"frean-0.2","cookie":"cookie-1"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.2","frean":"frean-0.2","cookie":"cookie-4"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.2","frean":"frean-0.2","cookie":"cookie-7"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.3","frean":"frean-0.3","cookie":"cookie-2"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.3","frean":"frean-0.3","cookie":"cookie-5"}
    {"time":"1970-01-01T00:00:01.000Z","peek":"peek-0.3","frean":"frean-0.3","cookie":"cookie-8"}

## 3-way version of HSNB cascaded join nearest, 1 batched, -outer
### Juttle
    ( emit -limit 3 -from Date.new(0) | put first=true, n=count()
    ; emit -limit 4 -from Date.new(0) | put second=true, m=count() | batch 1
    ; emit -limit 4 -from Date.new(0) | put third=true, p=count()
    ) | join -outer 2 | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z","first":true,"n":1,"second":true,"m":1,"third":true,"p":1}
    {"time":"1970-01-01T00:00:02.000Z","first":true,"n":2,"second":true,"m":2,"third":true,"p":2}
    {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":3}
    {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":4}

## 3-way version of HSNB cascaded join nearest, 2 batched -outer
### Juttle
    ( emit -limit 3 -from Date.new(0) | put first=true, n=count()
    ; emit -limit 4 -from Date.new(0) | put second=true, m=count() | batch 1
    ; emit -limit 5 -from Date.new(0) | put third=true, p=count() | batch 1
    ) | join -outer 3 | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z","first":true,"n":1,"second":true,"m":1,"third":true,"p":1}
    {"time":"1970-01-01T00:00:02.000Z","first":true,"n":2,"second":true,"m":2,"third":true,"p":2}
    {"time":"1970-01-01T00:00:03.000Z","first":true,"n":3,"second":true,"m":3,"third":true,"p":3}
    {"time":"1970-01-01T00:00:04.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":4}
    {"time":"1970-01-01T00:00:05.000Z","first":true,"n":3,"second":true,"m":4,"third":true,"p":5}

## 3-way version of RSNB: join two point streams against a sequence of batches using -outer
### Juttle
    ( emit -hz 1000 -from :now: -limit 9
      | batch -every :.003s: -on :now:
      | put batch=Math.floor(Duration.milliseconds((#time-:now:))/3)
      | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()
    ; emit -hz 1000 -from :now: -limit 9
      | put bar="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3
    ; emit -hz 1000 -from :now: -limit 9
      | put bag="bag-"+Number.toString(count()), assy_id=1+(count()-1)%3
    ) | join -outer 2 assy_id | keep bar, bag, assy, batch, assy_id
    | view result

### Output

    {"bar":"bar-1",                                         "assy_id":1}
    {"bar":"bar-2",                                         "assy_id":2}
    {"bar":"bar-3","bag":"bag-3","assy":"baz-0.3","batch":0,"assy_id":3}
    {"bar":"bar-4","bag":"bag-4","assy":"baz-0.1","batch":0,"assy_id":1}
    {"bar":"bar-5","bag":"bag-5","assy":"baz-0.2","batch":0,"assy_id":2}
    {"bar":"bar-6","bag":"bag-6","assy":"baz-0.3","batch":0,"assy_id":3}
    {"bar":"bar-7","bag":"bag-7","assy":"baz-1.1","batch":1,"assy_id":1}
    {"bar":"bar-8","bag":"bag-8","assy":"baz-1.2","batch":1,"assy_id":2}
    {"bar":"bar-9","bag":"bag-9","assy":"baz-1.3","batch":1,"assy_id":3}

## 3-way version of RSNB: join two point streams against a sequence of batches without -outer
Not something you would do, but a workout for arrival order handling.
Results start with eps-3 secs because the batch gets to be a leader, and
other fields repeat whenever batch gets to be a leader

### Juttle
    ( emit -hz 1000 -from :now: -limit 9
      | batch -every :.003s: -on :now:
      | put batch=Math.floor(Duration.milliseconds((#time-:now:))/3)
      | put assy="baz-"+Number.toString(#batch)+"."+Number.toString(count()), assy_id=count()
    ; emit -hz 1000 -from :now: -limit 9
      | put bar="bar-"+Number.toString(count()), assy_id=1+(count()-1)%3
    ; emit -hz 1000 -from :now: -limit 9
      | put bag="bag-"+Number.toString(count()), assy_id=1+(count()-1)%3
    ) | join assy_id | keep bar, bag, assy, batch, assy_id
    | view result

### Output

    {"bar":"bar-3","bag":"bag-3","assy":"baz-0.3","batch":0,"assy_id":3}
    {"bar":"bar-4","bag":"bag-4","assy":"baz-0.1","batch":0,"assy_id":1}
    {"bar":"bar-5","bag":"bag-5","assy":"baz-0.2","batch":0,"assy_id":2}
    {"bar":"bar-6","bag":"bag-6","assy":"baz-0.3","batch":0,"assy_id":3}
    {"bar":"bar-6","bag":"bag-6","assy":"baz-1.3","batch":1,"assy_id":3}
    {"bar":"bar-7","bag":"bag-7","assy":"baz-1.1","batch":1,"assy_id":1}
    {"bar":"bar-8","bag":"bag-8","assy":"baz-1.2","batch":1,"assy_id":2}
    {"bar":"bar-9","bag":"bag-9","assy":"baz-1.3","batch":1,"assy_id":3}
    {"bar":"bar-9","bag":"bag-9","assy":"baz-2.3","batch":2,"assy_id":3}

## outer join syntax: complains about out-of-range outer
###Juttle
    emit -from Date.new(0) -limit 1
    | (put foo=1; put bar=2; put baz=3)
    | join -outer 5 | view sink1

### Errors
   * -outer must be an input number (1, 2, ...).

## outer join syntax: complains about non-numeric outer
### Juttle
    emit -from Date.new(0) -limit 1 |
    join -outer true |  view result

### Errors
   * -outer must be an input number (1, 2, ...).

## outer join of a point stream of ids against a table of names
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -outer 2 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":4, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":5, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## outer join of a point stream of nested ids against a table of names
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":{i: 1}, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":{i: 2}, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":{i: 3}, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = { i: (count() - 1) % 5 + 1 }, n=count()
    ) | join -outer 2 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":{i: 1}, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":{i: 2}, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":{i: 3}, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":{i: 4}, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":{i: 5}, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":{i: 1}, "name":"fred", "n":6 }

## outer join of two point streams with ids against a table of names
verify we pick up the match with input 2 even when there is no match with input 1
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ; emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, m= 2 * count()
    ) | join -outer 1 id | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","id":1,"n":1,"name":"fred","m":2}
    {"time":"1970-01-01T00:00:01.000Z","id":2,"n":2,"name":"wilma","m":4}
    {"time":"1970-01-01T00:00:02.000Z","id":3,"n":3,"name":"dino","m":6}
    {"time":"1970-01-01T00:00:03.000Z","id":4,"n":4,"m":8}
    {"time":"1970-01-01T00:00:04.000Z","id":5,"n":5,"m":10}
    {"time":"1970-01-01T00:00:05.000Z","id":1,"n":6,"name":"fred","m":12}


## outer join with overlapping fields keeps the value from input 1
### Juttle
    const one = [
    {"userid":1234,"last":"bigboote","time":"2015-02-12T17:10:21"},
    ];
    const two = [
    {"first":"john","userid":1234,"last":"smallberries","time":"2015-02-12T17:10:21"}
    ];
    const three = [
    {"userid":1234,"last":"ya ya","time":"2015-02-12T17:10:21"},
    ];
    (
    emit -points one
    ;
    emit -points two
    ;
    emit -points three
    )
    | join  -outer 1 | keep last, first, userid | view result

### Output
    {"first":"john","last":"bigboote","userid":1234}

## outer join with overlapping fields keeps the value from input 2
### Juttle
    const one = [
    {"userid":1234,"last":"bigboote","time":"2015-02-12T17:10:21"},
    ];
    const two = [
    {"first":"john","userid":1234,"last":"smallberries","time":"2015-02-12T17:10:21"}
    ];
    const three = [
    {"userid":1234,"last":"ya ya","time":"2015-02-12T17:10:21"},
    ];
    (
    emit -points one
    ;
    emit -points two
    ;
    emit -points three
    )
    | join  -outer 2 | keep last, first, userid | view result

### Output
    {"first":"john","last":"smallberries","userid":1234}

## outer join with overlapping fields keeps the value from input 3
### Juttle
    const one = [
    {"userid":1234,"last":"bigboote","time":"2015-02-12T17:10:21"},
    ];
    const two = [
    {"first":"john","userid":1234,"last":"smallberries","time":"2015-02-12T17:10:21"}
    ];
    const three = [
    {"userid":1234,"last":"ya ya","time":"2015-02-12T17:10:21"},
    ];
    (
    emit -points one
    ;
    emit -points two
    ;
    emit -points three
    )
    | join  -outer 3 | keep last, first, userid | view result

### Output
    {"first":"john","last":"ya ya","userid":1234}

## single-stream join by a field
### Juttle
    emit -from :2000-01-01: -limit 1
    |(put region="north",  group="bar",  peek="frean", n=1
    ; put region="east",   group="blort",peek="thunk", m=2
    ; put region="south",  group="bar",  peek="frean", o=3
    ; put region="west",   group="blort",peek="thunk", p=4
    )
    | pass
    | join peek | view result

### Output
    {
      "group": "bar",
      "region": "south",
      "n": 1,
      "o": 3,
      "peek": "frean",
      "time": "2000-01-01T00:00:00.000Z"
    }
    {
      "group": "blort",
      "region": "west",
      "m": 2,
      "p": 4,
      "peek": "thunk",
      "time": "2000-01-01T00:00:00.000Z"
    }

## single-stream join by a nested field
### Juttle
    emit -from :2000-01-01: -limit 1
    |(put region="north",  group="bar",  peek={foo: "frean"}, n=1
    ; put region="east",   group="blort",peek={foo: "thunk"}, m=2
    ; put region="south",  group="bar",  peek={foo: "frean"}, o=3
    ; put region="west",   group="blort",peek={foo: "thunk"}, p=4
    )
    | pass
    | join peek | view result

### Output
    {
      "group": "bar",
      "region": "south",
      "n": 1,
      "o": 3,
      "peek": {"foo": "frean"},
      "time": "2000-01-01T00:00:00.000Z"
    }
    {
      "group": "blort",
      "region": "west",
      "m": 2,
      "p": 4,
      "peek": {"foo": "thunk"},
      "time": "2000-01-01T00:00:00.000Z"
    }

## single-stream groups by batch when batched
### Juttle
    const points=[
    {  "time": "2014-01-01T00:00:00.000Z", "name": "fred",   "value": 10 },
    {  "time": "2014-01-01T00:00:01.000Z", "name": "barney", "value": 20 },
    {  "time": "2014-01-01T00:00:02.000Z", "name": "wilma",  "value": 30 },
    {  "time": "2014-01-01T00:00:03.000Z", "name": "betty",  "value": 40 },
    {  "time": "2014-01-01T00:00:04.000Z", "name": "dino",   "value": 50 }
    ];
    emit -points points
    | batch 2
    | put *name = value | remove name, value // this makes join like unsplit
    | join
    | view result

### Output
    {
      "barney": 20,
      "fred": 10,
      "time": "2014-01-01T00:00:02.000Z"
    }
    {
      "betty": 40,
      "time": "2014-01-01T00:00:04.000Z",
      "wilma": 30
    }
    {
      "dino": 50,
      "time": "2014-01-01T00:00:06.000Z"
    }

## single-stream can fake an sql table join, batched
### Juttle
    const points=[
    { "time": "2014-01-01T00:00:00.000Z", "id":1, name:"first", "value": "fred"},
    { "time": "2014-01-01T00:00:01.000Z", "id":2, name:"first", "value": "barney" },
    { "time": "2014-01-01T00:00:02.000Z", "id":3, name:"first", "value": "wilma"   },
    { "time": "2014-01-01T00:00:03.000Z", "id":4, name:"first", "value": "betty" },
    { "time": "2014-01-01T00:00:04.000Z", "id":5, name:"first", "value": "dino"  },
    { "time": "2014-01-01T00:00:10.000Z", "id":1, name:"last", "value": "flintstone"},
    { "time": "2014-01-01T00:00:11.000Z", "id":2, name:"last", "value": "rubble" },
    { "time": "2014-01-01T00:00:12.000Z", "id":3, name:"last", "value": "flintstone"   },
    { "time": "2014-01-01T00:00:13.000Z", "id":4, name:"last", "value": "rubble" },
    { "time": "2014-01-01T00:00:14.000Z", "id":5, name:"last", "value": "de laurentis"  }
    ];
    emit -points points
    | batch 20
    | put *name = value | remove name, value // this makes join like unsplit
    | join id
    | view result

### Output
    {"time":"2014-01-01T00:00:20.000Z","id":1,"first":"fred","last":"flintstone"}
    {"time":"2014-01-01T00:00:20.000Z","id":2,"first":"barney","last":"rubble"}
    {"time":"2014-01-01T00:00:20.000Z","id":3,"first":"wilma","last":"flintstone"}
    {"time":"2014-01-01T00:00:20.000Z","id":4,"first":"betty","last":"rubble"}
    {"time":"2014-01-01T00:00:20.000Z","id":5,"first":"dino","last":"de laurentis"}

## single-stream can fake a table join, unbatched
### Juttle
    const points = [
    { "time": "2014-01-01T00:00:00", "id":1, name:"first", "value": "fred"},
    { "time": "2014-01-01T00:00:00", "id":2, name:"first", "value": "barney" },
    { "time": "2014-01-01T00:00:00", "id":3, name:"first", "value": "wilma"   },
    { "time": "2014-01-01T00:00:00", "id":4, name:"first", "value": "betty" },
    { "time": "2014-01-01T00:00:00", "id":5, name:"first", "value": "dino"  },
    { "time": "2014-01-01T00:00:00", "id":1, name:"last", "value": "flintstone"},
    { "time": "2014-01-01T00:00:00", "id":2, name:"last", "value": "rubble" },
    { "time": "2014-01-01T00:00:00", "id":3, name:"last", "value": "flintstone"   },
    { "time": "2014-01-01T00:00:00", "id":4, name:"last", "value": "rubble" },
    { "time": "2014-01-01T00:00:00", "id":5, name:"last", "value": "de laurentis"  }
    ];
    emit -points points
    | put *name = value | remove name, value // this makes join like unsplit
    | join id
    | view result

### Output
    {"time":"2014-01-01T00:00:00.000Z","id":1,"first":"fred","last":"flintstone"}
    {"time":"2014-01-01T00:00:00.000Z","id":2,"first":"barney","last":"rubble"}
    {"time":"2014-01-01T00:00:00.000Z","id":3,"first":"wilma","last":"flintstone"}
    {"time":"2014-01-01T00:00:00.000Z","id":4,"first":"betty","last":"rubble"}
    {"time":"2014-01-01T00:00:00.000Z","id":5,"first":"dino","last":"de laurentis"}

## single-stream with dereferencing puts really is the inverse of split
### Juttle
    emit -limit 1 -from Date.new(0)
    | put foo="bar", bleat="blort", peek="frean", cookie="serious"
    | split
    | put *name = value | remove name, value // this makes join like unsplit
    | join
    | view result

### Output
    {
      "bleat": "blort",
      "cookie": "serious",
      "foo": "bar",
      "peek": "frean",
      "time": "1970-01-01T00:00:00.000Z"
    }

## single-stream doesn't crash on null or undefined joinfield value
### Juttle
    emit -limit 1 -from Date.new(0)
    | (put n=0; put key=null, n=1; put key=true, n=2; put key=false, n=3)
    | pass | join key
    | remove time
    | view result

### Output
    {             n: 0 }
    { key: null,  n: 1 }
    { key: true,  n: 2 }
    { key: false, n: 3 }

## single-stream treats null and undefined as distinct key values for joining
### Juttle
    emit -limit 1 -from Date.new(0)
    | (
       put n0=0;
       put n1=0,  key=null;
       put n2=0,            color=null;
       put n3=0,  key=null, color=null;
       put n4=0,  key=null, color="gray";
       put n5=0,            color="black";
       )
    | pass | join key | remove time
    | view result

### Output
    { n0: 0, n2: 0, color: "black", n5: 0 }
    { key: null, n1: 0, n3: 0, color: "gray", n4: 0 }

## single-stream likes all types for joinkeys
### Juttle
    emit -limit 1 -from Date.new(0)
    | (
       put v1=1,  key=Date.new(0),color="red";
       put v2=2,  key=:1s:, color="blue";
       put v3=3,  key=true, color="green";
       put v4=4,  key=1,    color="brown";
       put v5=5,  key="s",  color="brown";
       )
    | pass | join key | remove time
    | view result

### Output
    { key: 1, v4: 4, color: "brown" }
    { key: "1970-01-01T00:00:00.000Z", v1: 1, color: "red" }
    { key: "00:00:01.000", v2: 2, color: "blue" }
    { key: true, v3: 3, color: "green" }
    { key: "s", v5: 5, color: "brown" }

## outer-join with empty stream produces points
### Juttle
    (emit -limit 5 -from Date.new(0)
     | put id=count(), foo = 1;
     emit -limit 0;
    ) | join -outer 1 id
    | remove time
    | view result

### Output
    { id: 1, foo: 1 }
    { id: 2, foo: 1 }
    { id: 3, foo: 1 }
    { id: 4, foo: 1 }
    { id: 5, foo: 1 }

## outer-join with sparse stream produces points
### Juttle
    (emit -limit 4 -from Date.new(0)
     | put id=count(), foo = 1;
     emit -limit 4 -from Date.new(0)
     | put id=count(), bar = 1, mod = id % 2
     | filter mod == 0;
    )| join -outer 1 id
    | remove time
    | view result

### Output
    { id: 1, foo: 1}
    { id: 2, bar: 1, mod: 0, foo: 1 }
    { id: 3, foo: 1 }
    { id: 4, bar: 1, mod: 0, foo: 1 }

## join on time works like join -maxoffset :0s:
### Juttle
    ( emit -every :1s:  -from Date.new(0) -limit 6 | put a=count()
    ; emit -every :2s:  -from Date.new(0) -limit 3 | put b=count()
    ) | join time
    | view result

### Output
    {time: "1970-01-01T00:00:00.000Z", a:1, b:1}
    {time: "1970-01-01T00:00:02.000Z", a:3, b:2}
    {time: "1970-01-01T00:00:04.000Z", a:5, b:3}

## join on time with -nearest is just join -nearest
### Juttle
    ( emit -every :1s:  -from Date.new(0) -limit 6 | put a=count()
    ; emit -every :2s:  -from Date.new(0) -limit 3 | put b=count()
    ) | join -nearest :3s: time | view result

### Output
    {time: "1970-01-01T00:00:00.000Z", a:1, b:1}
    {time: "1970-01-01T00:00:01.000Z", a:2, b:1}
    {time: "1970-01-01T00:00:02.000Z", a:3, b:2}
    {time: "1970-01-01T00:00:03.000Z", a:4, b:2}
    {time: "1970-01-01T00:00:04.000Z", a:5, b:3}
    {time: "1970-01-01T00:00:05.000Z", a:6, b:3}

## join on time with -zip is just join -zip
### Juttle
    ( emit -every :1s:  -from Date.new(0) -limit 6 | put a=count()
    ; emit -every :2s:  -from Date.new(0) -limit 3 | put b=count()
    ) | join -zip true time | view result

### Output
    {time: "1970-01-01T00:00:00.000Z", a:1, b:1}
    {time: "1970-01-01T00:00:02.000Z", a:3, b:2}
    {time: "1970-01-01T00:00:04.000Z", a:5, b:3}


## outer join of a point stream of ids against a -table of names from the past
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -outer 2 -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":4, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":5, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## inner join of a point stream of ids against a -table of names from the past
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## outer join of a point stream of ids against a -table of names from the future
### Juttle
    const names = [
        {time:"1980-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1980-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1980-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -outer 2 -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":4, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":5, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## inner join of a point stream of ids against a -table of names from the future
### Juttle
    const names = [
        {time:"1980-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1980-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1980-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"wilma", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"dino", "n":3 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## outer join of two point streams with ids against two -tables
verify we pick up the match with input 2 even when there is no match with input 1
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    const flavors = [
        {time:"1980-01-01T00:00:00.000Z", "id":1, "flavor":"vanilla"},
        {time:"1980-01-01T00:00:00.000Z", "id":2, "flavor":"strawberry"},
        {time:"1980-01-01T00:00:00.000Z", "id":4, "flavor":"mystery"},
    ];
    ( emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ; emit -points names |  remove type
    ; emit -points flavors |  remove type, name
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, m= 2 * count()
    ) | join -outer 1 -table [2, 3] id | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","id":1,"n":1,"name":"fred","m":2,"flavor":"vanilla"}
    {"time":"1970-01-01T00:00:01.000Z","id":2,"n":2,"name":"wilma","m":4,"flavor":"strawberry"}
    {"time":"1970-01-01T00:00:02.000Z","id":3,"n":3,"name":"dino","m":6}
    {"time":"1970-01-01T00:00:03.000Z","id":4,"n":4,"m":8,"flavor":"mystery"}
    {"time":"1970-01-01T00:00:04.000Z","id":5,"n":5,"m":10}
    {"time":"1970-01-01T00:00:05.000Z","id":1,"n":6,"name":"fred","m":12,"flavor":"vanilla"}


## inner join of a point stream #1 of ids against a stream of -table of names advances table
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1970-01-01T00:00:03.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:03.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:03.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"WILMA", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"DINO", "n":3 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## inner join of a point stream #2 of ids against a stream of -table of names advances table
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1970-01-01T00:00:03.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:03.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:03.000Z", "id":3, "name":"dino"}
    ];
    ( emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ; emit -points names |  remove type
    ) | join -table 2 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"WILMA", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"DINO", "n":3 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## outer join of a point stream #1 of ids against a stream of -table of names advances table
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1970-01-01T00:00:03.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:03.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:03.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ) | join -outer 2 -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"WILMA", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"DINO", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":4, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":5, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }

## outer join of a point stream #2 of ids against a stream of -table of names advances table
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1970-01-01T00:00:03.000Z", "id":1, "name":"fred"},
        {time:"1970-01-01T00:00:03.000Z", "id":2, "name":"wilma"},
        {time:"1970-01-01T00:00:03.000Z", "id":3, "name":"dino"}
    ];
    ( emit -from Date.new(0) -limit 6 | put id = (count() - 1) % 5 + 1, n=count()
    ; emit -points names |  remove type
    ) | join -outer 1 -table 2 id | view result

### Output
    {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED", "n":1 }
    {time:"1970-01-01T00:00:01.000Z", "id":2, "name":"WILMA", "n":2 }
    {time:"1970-01-01T00:00:02.000Z", "id":3, "name":"DINO", "n":3 }
    {time:"1970-01-01T00:00:03.000Z", "id":4, "n":4 }
    {time:"1970-01-01T00:00:04.000Z", "id":5, "n":5 }
    {time:"1970-01-01T00:00:05.000Z", "id":1, "name":"fred", "n":6 }


## inner join of a batched point stream of ids against a stream of -table of names shuns the future
what happens in the future, stays in the future: a single table from the future
will get used (earlier test) but if you are sending a stream of them your
timestamps better make sense.
### Juttle
    const names = [
        {time:"1970-01-01T00:00:00.000Z", "id":1, "name":"FRED"},
        {time:"1970-01-01T00:00:00.000Z", "id":2, "name":"WILMA"},
        {time:"1970-01-01T00:00:00.000Z", "id":3, "name":"DINO"},
        {time:"1980-01-01T00:00:00.000Z", "id":1, "name":"fred"},
        {time:"1980-01-01T00:00:00.000Z", "id":2, "name":"wilma"},
        {time:"1980-01-01T00:00:00.000Z", "id":3, "name":"dino"}
    ];
    ( emit -points names |  remove type
    ; emit -from Date.new(0) -limit 8 | put id = (count() - 1) % 5 + 1, n=count() | batch :3s:
    ) | join -table 1 id | view result

### Output
    {time:"1970-01-01T00:00:03.000Z", "id":1,"name":"FRED", "n":1 }
    {time:"1970-01-01T00:00:03.000Z", "id":2,"name":"WILMA", "n":2 }
    {time:"1970-01-01T00:00:03.000Z", "id":3,"name":"DINO", "n":3 }
    {time:"1970-01-01T00:00:06.000Z", "id":1,"name":"FRED", "n":6 }
    {time:"1970-01-01T00:00:09.000Z", "id":2,"name":"WILMA", "n":7 }
    {time:"1970-01-01T00:00:09.000Z", "id":3,"name":"DINO", "n":8 }

## ticks advance -table in live outer join of a point stream of ids
because a tick arrives between the first and 2nd table update, the first is
marked complete and participates in early joins. Later joins get the second table.

### Juttle
    const names = [
        {"time": :now:,     "id":1, "name":"FRED"},
        {"time": :now:,     "id":2, "name":"WILMA"},
        {"time": :now:,     "id":3, "name":"DINO"},
        {"time": :now:+:2 s:, "id":1, "name":"fred"},
        {"time": :now:+:2 s:, "id":2, "name":"wilma"},
        {"time": :now:+:2 s:, "id":3, "name":"dino"}
    ];
    ( emit -every :.5s: -limit 8 | put id = (count() - 1) % 5 + 1, n=count() ;
      emit -points names |  remove type
    ) | join -outer 1 -table 2 id
    | remove time
    | view result

### Output
    {"id":1, "name":"FRED", "n":1 }
    {"id":2, "name":"WILMA", "n":2 }
    {"id":3, "name":"DINO", "n":3 }
    {"id":4, "n":4 }
    {"id":5, "n":5 }
    {"id":1, "name":"fred", "n":6 }
    {"id":2, "name":"wilma", "n":7 }
    {"id":3, "name":"dino", "n":8 }

## implicit timeless table joins still work
### Juttle
    const read_pts = [
            {"source_type": "metric", "time": :yesterday: + :0s:, "name": "C4078.minutes_used", "user_id": 2, "value": 5},
            {"source_type": "metric", "time": :yesterday: + :2s:, "name": "C4078.minutes_used", "user_id": 0, "value": 20},
            {"source_type": "metric", "time": :yesterday: + :4s:, "name": "C4078.minutes_used", "user_id": 3, "value": 10},
            {"source_type": "metric", "time": :yesterday: + :6s:, "name": "C4078.minutes_used", "user_id": 0, "value": 15},
            {"source_type": "metric", "time": :yesterday: + :8s:, "name": "C4078.minutes_used", "user_id": 0, "value": 10}
    ];
    const source_pts = [
        {        "user_id": 0,        "username": "Homer Simpson"   },
        {        "user_id": 1,        "username": "Marge Simpson"   },
        {        "user_id": 2,        "username": "Bart Simpson"    },
        {        "user_id": 3,        "username": "Lisa Simpson"    },
        {        "user_id": 4,        "username": "Maggie Simpson"  }
    ];
    (
        emit -points source_pts | remove time;
        emit -points read_pts | filter name~"C4078.minutes_used"
            | reduce total_minutes_used=sum(value) by user_id
    )
        | join user_id
        | sort user_id
        | keep user_id, username, total_minutes_used
        | view result


### Output
    {        "user_id": 0,        "username": "Homer Simpson",        "total_minutes_used": 45    }
    {        "user_id": 2,        "username": "Bart Simpson",        "total_minutes_used": 5    }
    {        "user_id": 3,        "username": "Lisa Simpson",        "total_minutes_used": 10    }

## test for PROD-8738, cannot set property complete_time
### Juttle
    (
        emit -limit 1 -from :10s ago: -every :10s: | put name='bar';
        emit -limit 1 -from :1s ago: -every :1s: | put value=count();
    )
    | join -table 1
    | remove time, name // you can't depend on the timing of stream 1
    | view result

### Output
    { value: 1 }

## test for PROD-10061, outer join with empty stream forwards the outer points
### Juttle
    (
        emit -limit 1 -from :0: | put x = 1, y = 2;
        emit -limit 0;
        emit -limit 10 -from :0: | put x = 1, z = count();
    )
    | join -outer 3 x
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","x":1,"z":1}
    {"time":"1970-01-01T00:00:01.000Z","x":1,"z":2}
    {"time":"1970-01-01T00:00:02.000Z","x":1,"z":3}
    {"time":"1970-01-01T00:00:03.000Z","x":1,"z":4}
    {"time":"1970-01-01T00:00:04.000Z","x":1,"z":5}
    {"time":"1970-01-01T00:00:05.000Z","x":1,"z":6}
    {"time":"1970-01-01T00:00:06.000Z","x":1,"z":7}
    {"time":"1970-01-01T00:00:07.000Z","x":1,"z":8}
    {"time":"1970-01-01T00:00:08.000Z","x":1,"z":9}
    {"time":"1970-01-01T00:00:09.000Z","x":1,"z":10}

## test for PROD-10061, outer join with empty stream and -table forwards the outer points
### Juttle
    (
        emit -limit 1 -from :0: | put x = 1, y = 2;
        emit -limit 0;
        emit -limit 10 -from :0: | put x = 1, z = count();
    )
    | join -outer 3 -table 1 x
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","x":1,"z":1}
    {"time":"1970-01-01T00:00:01.000Z","x":1,"z":2}
    {"time":"1970-01-01T00:00:02.000Z","x":1,"z":3}
    {"time":"1970-01-01T00:00:03.000Z","x":1,"z":4}
    {"time":"1970-01-01T00:00:04.000Z","x":1,"z":5}
    {"time":"1970-01-01T00:00:05.000Z","x":1,"z":6}
    {"time":"1970-01-01T00:00:06.000Z","x":1,"z":7}
    {"time":"1970-01-01T00:00:07.000Z","x":1,"z":8}
    {"time":"1970-01-01T00:00:08.000Z","x":1,"z":9}
    {"time":"1970-01-01T00:00:09.000Z","x":1,"z":10}

## test for PROD-10061, outer join with empty -table stream does the join
### Juttle
    (
        emit -limit 1 -from :0: | put x = 1, y = 2;
        emit -limit 0;
        emit -limit 10 -from :0: | put x = 1, z = count();
    )
    | join -outer 3 -table 2 x
    | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","x":1,"z":1,"y":2}
    {"time":"1970-01-01T00:00:01.000Z","x":1,"z":2,"y":2}
    {"time":"1970-01-01T00:00:02.000Z","x":1,"z":3,"y":2}
    {"time":"1970-01-01T00:00:03.000Z","x":1,"z":4,"y":2}
    {"time":"1970-01-01T00:00:04.000Z","x":1,"z":5,"y":2}
    {"time":"1970-01-01T00:00:05.000Z","x":1,"z":6,"y":2}
    {"time":"1970-01-01T00:00:06.000Z","x":1,"z":7,"y":2}
    {"time":"1970-01-01T00:00:07.000Z","x":1,"z":8,"y":2}
    {"time":"1970-01-01T00:00:08.000Z","x":1,"z":9,"y":2}
    {"time":"1970-01-01T00:00:09.000Z","x":1,"z":10,"y":2}

## batched join preserves mark calendarness of calendar intervals (join on shorter)

### Juttle

    (
        emit -limit 2 -every :1M: -from :0: | put first=true, m=count() | batch :1M:;
        emit -limit 4 -every :1M: -from :0: | put second=true, n=count() | batch :2M:
    )
    | join -outer 1
    | view result -times true -marks true

### Output

    { "time": "1970-01-01T00:00:00.000Z", "interval": "1M", "mark": true }
    { "time": "1970-01-01T00:00:00.000Z", "first": true, "m": 1 }
    { "time": "1970-02-01T00:00:00.000Z", "interval": "1M", "mark": true }
    { "time": "1970-03-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 1 }
    { "time": "1970-03-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 2 }
    { "time": "1970-03-01T00:00:00.000Z", "interval": "1M", "mark": true }

## batched join preserves mark calendarness of calendar intervals (join on longer)

### Juttle

    (
        emit -limit 2 -every :1M: -from :0: | put first=true, m=count() | batch :1M:;
        emit -limit 4 -every :1M: -from :0: | put second=true, n=count() | batch :2M:
    )
    | join -outer 2
    | view result -times true -marks true

### Output

    { "time": "1970-01-01T00:00:00.000Z", "interval": "2M", "mark": true }
    { "time": "1970-03-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 1}
    { "time": "1970-03-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 2}
    { "time": "1970-03-01T00:00:00.000Z", "interval": "2M", "mark": true }
    { "time": "1970-05-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 3}
    { "time": "1970-05-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 4}
    { "time": "1970-05-01T00:00:00.000Z", "interval": "2M", "mark": true }

## batched join falls back to non-calendar intervals

### Juttle

    (
        emit -limit 2 -every :1M: -from :0: | put first=true, m=count()  | batch :1M:;
        emit -limit 4 -every :1M: -from :0: | put second=true, n=count() | batch :60d:
    )
    | join -outer 2
    | view result -times true -marks true

### Output

    { "time": "1970-01-01T00:00:00.000Z", "interval": "60.00:00:00.000", "mark": true }
    { "time": "1970-03-02T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 1}
    { "time": "1970-03-02T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 2}
    { "time": "1970-03-02T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 3}
    { "time": "1970-03-02T00:00:00.000Z", "interval": "60.00:00:00.000", "mark": true }
    { "time": "1970-05-01T00:00:00.000Z", "first": true, "second": true, "m": 2, "n": 4}
    { "time": "1970-05-01T00:00:00.000Z", "interval": "60.00:00:00.000", "mark": true }
