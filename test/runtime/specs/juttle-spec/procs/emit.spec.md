The `emit` processor
=======================

Complains about unknown options
---------------------------------
### Juttle
    emit -failure true
    | view result

### Errors
   * unknown emit option failure.

Complains if -limit isnt a number
----------------------------------------

### Juttle

    emit -limit "no limits!"  | view result

### Errors

   * CompileError: -limit wants a number, got "no limits!"

Complains if -hz isnt a number
----------------------------------------

### Juttle

    emit -hz "so good"  | view result

### Errors

   * CompileError: -hz wants a number, got "so good"

Complains if -every isnt a duration
----------------------------------------

### Juttle

    emit -every "so often"  | view result

### Errors

   * CompileError: -every wants a duration, got "so often"

Complains if -from isnt a moment
----------------------------------------

### Juttle

    emit -from "never"  | view result

### Errors

   * CompileError: -from wants a moment, got "never"

Complains if -to isnt a moment
----------------------------------------

### Juttle

    emit -to "never"  | view result

### Errors

   * CompileError: -to wants a moment, got "never"

Complains if -last isnt a duration
----------------------------------------

### Juttle

    emit -last "never"  | view result

### Errors

   * CompileError: -last wants a duration, got "never"

Complains if -last and -from are specified
------------------------------------------

### Juttle

    emit -from :yesterday: -last :day: | view result

### Errors

   * CompileError: -last option should not be combined with -from or -to

Complains if -last and -to are specified
----------------------------------------

### Juttle

    emit -to :tomorrow: -last :day: | view result

### Errors

   * CompileError: -last option should not be combined with -from or -to

Complains if -from and -to and -last are specified
----------------------------------------

### Juttle

    emit -from :yesterday: -to :tomorrow: -last :day: | view result

### Errors

   * CompileError: -last option should not be combined with -from or -to

Complains if -limit and -to are specified
----------------------------------------

### Juttle

    emit -limit 1 -to :now: | view result

### Errors

   * Do not specify both -limit and -to or -last

Complains if -limit and -last are specified
----------------------------------------

### Juttle

    emit -limit 1 -last :1 minute: | view result

### Errors

   * Do not specify both -limit and -to or -last

Complains about -points that are not an array
----------------------------------------------------

### Juttle

    emit -points "bleat" | view result

### Errors

   * CompileError: emit -points wants an array of points

Complains about -points that are not an array of objects
----------------------------------------------------

### Juttle

    emit -points ["bleat", "blort"] | view result

### Errors

   * CompileError: emit -points wants an array of points

Complains about -points and -limit
----------------------------------------------------

### Juttle

    emit -limit 1 -points [] | view result

### Errors

   * CompileError: Do not specify -points with -limit or -to

Complains about -points and -to
----------------------------------------------------

### Juttle

    emit -to :+10s: -points [] | view result

### Errors

   * CompileError: Do not specify -points with -limit or -to

Complains about timeful -points with -from
----------------------------------------------------

### Juttle

    emit -from :now: -points [{time: :0:}] | view result

### Errors

   * CompileError: emit -points must not have timestamps when -from or -every is specified

Complains about a mix of timeful and timeless -points
----------------------------------------------------

### Juttle

    emit -points [{time: :0:}, {foo: "bar"}] | view result

### Errors

   * CompileError: emit -points must all have timestamps or have no timestamps

Emits 1 point by default
-----------------------------------------------------------

### Juttle

    emit
    | reduce count()
    | view result

### Output

    { count: 1 }

Emits live points by default
-----------------------------------------------------------

### Juttle

    emit -limit 100
    | put n = count(), dt = time - :now:
    | filter n <= 3
    | keep n, dt
    | view result

### Output

    { n: 1, dt: "00:00:00.000" }
    { n: 2, dt: "00:00:01.000" }
    { n: 3, dt: "00:00:02.000" }

Emits points and ticks in a live setting
-----------------------------------------------------------

### Juttle

    emit -limit 3
    | put n = count(), dt = time - :now:
    | keep n, dt
    | view result -ticks true

### Output

    { n: 1, dt: "00:00:00.000" }
    { tick: true }
    { n: 2, dt: "00:00:01.000" }
    { tick: true }
    { n: 3, dt: "00:00:02.000" }

Does not emit any points with `-limit 0`
----------------------------------------

### Juttle

    emit -limit 0 | view result

### Output

```

```

Emits limited points with -to
----------------------------------------

### Juttle

    emit -to :now: + :3s:
    | put n = count(), dt = time - :now:
    | keep n, dt
    | view result

### Output

    { n: 1, dt: "00:00:00.000" }
    { n: 2, dt: "00:00:01.000" }
    { n: 3, dt: "00:00:02.000" }

Emits properly spaced and limited points with -every
----------------------------------------

### Juttle

    emit -every :2s: -limit 3
    | put n = count(), dt = time - :now:
    | keep n, dt
    | view result

### Output

    { n: 1, dt: "00:00:00.000" }
    { n: 2, dt: "00:00:02.000" }
    { n: 3, dt: "00:00:04.000" }

Emits properly spaced and limited points with -hz
----------------------------------------

### Juttle

    emit -hz 0.5 -limit 3
    | put n = count(), dt = time - :now:
    | keep n, dt
    | view result

### Output

    { n: 1, dt: "00:00:00.000" }
    { n: 2, dt: "00:00:02.000" }
    { n: 3, dt: "00:00:04.000" }

Emits historic points with -from
----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 3 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:01.000Z" }
    { "time": "1970-01-01T00:00:02.000Z" }

### Output

    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:01.000Z" }
    { "time": "1970-01-01T00:00:02.000Z" }

Emits the right points when -from, -to, and -every are specified
----------------------------------------------------

### Juttle

    emit -from Date.new(0) -to Date.new(10) -every :3s: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:03.000Z" }
    { "time": "1970-01-01T00:00:06.000Z" }
    { "time": "1970-01-01T00:00:09.000Z" }

Emits the right number of points when -from, -to, and -every are specified
----------------------------------------------------

### Juttle

    emit -from :10 seconds ago: -to :now: -every :2 seconds:
    | reduce count()
    | view result

### Output

    { "count": 5 }

Emits the right number of points when -last and -every are specified
----------------------------------------------------

### Juttle

    emit -last :10 seconds: -every :2 seconds:
    | reduce count()
    | view result

### Output

    { "count": 5 }

Emits historic and live points with -from
----------------------------------------------------

### Juttle

    emit -from :-2s: -to :+3s:
    | put n = count(), dt = time - :now:
    | keep n, dt
    | view result -ticks true

### Output

    { n: 1, dt: "-00:00:02.000" }
    { n: 2, dt: "-00:00:01.000" }
    { n: 3, dt: "00:00:00.000" }
    { tick: true }
    { n: 4, dt: "00:00:01.000" }
    { tick: true }
    { n: 5, dt: "00:00:02.000" }

Emits historic and live points with -from and -points
----------------------------------------------------

### Juttle

    emit -from :-2s:
        -points [{n:1}, {n:2}, {n:3}, {n:4}, {n:5}]
    | put dt = time - :now:
    | keep n, dt
    | view result -ticks true

### Output

    { n: 1, dt: "-00:00:02.000" }
    { n: 2, dt: "-00:00:01.000" }
    { n: 3, dt: "00:00:00.000" }
    { tick: true }
    { n: 4, dt: "00:00:01.000" }
    { tick: true }
    { n: 5, dt: "00:00:02.000" }

Emits historic and live points with -points
----------------------------------------------------

### Juttle

    emit
        -points [{time: :-2s:, n:1}, {time: :-1s:, n:2}, {time: :+0s:, n:3}, {time: :+1s:, n:4}, {time: :+2s:, n:5}]
    | put dt = time - :now:
    | keep n, dt
    | view result -ticks true

### Output

    { n: 1, dt: "-00:00:02.000" }
    { n: 2, dt: "-00:00:01.000" }
    { n: 3, dt: "00:00:00.000" }
    { tick: true }
    { n: 4, dt: "00:00:01.000" }
    { tick: true }
    { n: 5, dt: "00:00:02.000" }

Parses time string and numbers in -points
----------------------------------------------------

### Juttle

    const points = [
        {time:"1970-01-01"},
        {time:0},
        {time:1},
        {time:"1970-01-01T00:00:02.000Z"}
    ];
    emit -points points
    | view result

### Output
    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:01.000Z" }
    { time: "1970-01-01T00:00:02.000Z" }

Complains when no points are given
----------------------------------

### Juttle

    emit -from :1970-01-01: -points []
    | reduce count()
    | view result

### Output
    { count: 0 }


Complains about bad time formatting in -points
----------------------------------------------------

### Juttle

    emit -points [ {time:"invalid"} ]
    | view result

### Errors
   * the time field must contain a number or a string representing time.

Emits correct number of points when -from and -every are set
------------------------------------------------------------

### Juttle

    emit -from :1 day ago: -every :hour:
    | reduce count()
    | view result

### Output
    { count: 24 }

Emits correct number of points when -from/-to and -every are set
----------------------------------------------------------------

### Juttle

    emit -from :6 hours ago: -every :hour: -to :6 hours from now:
    | reduce count()
    | view result

### Output
    { count: 12 }
