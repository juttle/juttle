Juttle pace command
============================================

pace -every and -x complains
-------------------------
### Juttle
    emit -from :2014-01-15: -limit 6
    | pace -every :2s: -x 2
    | reduce c=count()
    | view result

### Errors

   * Specify either output period with -every or time speedup with -x

pace -every and number complains
-------------------------
### Juttle
    emit -from :2014-01-15: -limit 6
    | pace -every 2
    | reduce c=count()
    | view result

### Errors

   * CompileError: Error: -every wants a duration, got 2

complains if -x is not a number
-------------------------
### Juttle
    emit -from :2014-01-15: -limit 6
    | pace -x :minute:
    | reduce c=count()
    | view result

### Errors

   * CompileError: Error: -x wants a number, got :00:01:00.000:

complains if -from is not a moment
-------------------------
### Juttle
    emit -from :2014-01-15: -limit 6
    | pace -from 0
    | reduce c=count()
    | view result

### Errors

   * CompileError: Error: -from wants a moment, got 0


plain pacer kicks history out at its real rate
-------------------------
### Juttle
    emit -from Date.new(0) -limit 2
    | pace
    | put t0=Date.elapsed(:now:)
    | put -over :1.01s: dt=Math.round(last(t0) - first(t0))
    | keep time, dt
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", dt: 0 }
    { time: "1970-01-01T00:00:01.000Z", dt: 1 }

pacer re-labels tick times with -from
-------------------------
### Juttle
    emit -from Date.new(0) -limit 2
    | pace -from :2014-01-01:
    | put t0=Date.elapsed(:now:)
    | put -over :1.01s: dt=Math.round(last(t0) - first(t0))
    | keep time, dt
    | view result

### Output

    { time: "2014-01-01T00:00:00.000Z", dt: 0 }
    { time: "2014-01-01T00:00:01.000Z", dt: 1 }

pacer runs at double its real rate with -x
-------------------------
### Juttle
    emit -from Date.new(0) -limit 3
    | pace -from :2014-01-01: -x 2
    | put t0=Date.elapsed(:now:)
    | put -over :1.01s: dt=Math.round((last(t0) - first(t0))*10)/10
    | keep time, dt
    | view result

### Output

    { time: "2014-01-01T00:00:00.000Z", dt: 0 }
    { time: "2014-01-01T00:00:01.000Z", dt: 0.5 }
    { time: "2014-01-01T00:00:02.000Z", dt: 0.5 }

pacer outputs every 2 seconds with -every
-------------------------
note that the put window is over the natural data times, not wall time
### Juttle
    emit -from Date.new(0) -every :minute: -limit 3
    | pace -from :2014-01-01: -every :2s:
    | put t0=Date.elapsed(:now:)
    | put -over :1.01m: dt=Math.round(last(t0) - first(t0))
    | keep time, dt
    | view result

### Output

    { time: "2014-01-01T00:00:00.000Z", dt: 0 }
    { time: "2014-01-01T00:01:00.000Z", dt: 2 }
    { time: "2014-01-01T00:02:00.000Z", dt: 2 }

pacer outputs a batch every second with -every
-------------------------
### Juttle
    emit -from Date.new(0) -limit 6
    | batch -every :2s:
    | pace -from :2014-01-01: -every :s:
    | put now=Date.new(Date.elapsed(:now:))
    | put t0=Date.elapsed(:now:)
    | put -over :2.01s: dt=Math.round(last(t0) - first(t0))
    | keep time, dt
    | view result

### Output

    { time: "2014-01-01T00:00:00.000Z", dt: 0 }
    { time: "2014-01-01T00:00:01.000Z", dt: 0 }
    { time: "2014-01-01T00:00:02.000Z", dt: 1 }
    { time: "2014-01-01T00:00:03.000Z", dt: 1 }
    { time: "2014-01-01T00:00:04.000Z", dt: 1 }
    { time: "2014-01-01T00:00:05.000Z", dt: 1 }
