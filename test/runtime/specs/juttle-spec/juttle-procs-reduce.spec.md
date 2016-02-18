
Juttle "reduce" processor (-every epoch mode)
=========================================

complains if -every is not a duration
--------------------------------------

### Juttle

    reduce -every 0.01 count() |  view result

### Errors

   * -every wants a duration, got 0.01


complains if -on is not a duration or moment
----------------------------------------------

### Juttle

    reduce -every :s: -on 1 count() |  view result

### Errors

   * -on wants a duration or moment, got 1


complains if -on > -every
-------------------------

### Juttle
    emit -from :2014-01-15: -limit 6
    | reduce -every :minute: -on :hour: c=count()
    | view result

### Errors

   * CompileError: reduce -on cannot be greater than -every

complains if reduce -every is negative
-------------------------

### Juttle
    emit -from :2014-01-15: -limit 6
    | reduce -every -:minute: count()
    | view result

### Errors

   * CompileError: reduce -every must be a positive duration.

complains if reduce -every is 0
-------------------------

### Juttle
    emit -from :2014-01-15: -limit 6
    | reduce -every :0s: count()
    | view result

### Errors

   * CompileError: reduce -every must be a positive duration.

complains if reduce -every null -on notnull
-----------------------------------------------------

### Juttle
    emit -limit 10 -from Date.new(0)
    | batch :5s:
    | reduce -every null -on :1s: count()
    | view result

### Errors

   * CompileError: reduce -on requires -every

complains if reduce -forget without by
-------------------------

### Juttle
    emit -from :2014-01-15: -limit 6
    | reduce -forget :0s: count()
    | view result

### Errors

   * CompileError: -forget option only applies when using "by"

complains if reduce -forget -reset false
-------------------------

### Juttle
    emit -from :2014-01-15: -limit 6
    | reduce -reset false -forget :0s: count() by name
    | view result

### Errors

   * CompileError: cannot -forget when -reset false


complains about a bogus option
----------------------------------------------

### Juttle

    reduce -every :d: -on :d: -over :2d: -acc true -failure 1 count() |  view result

### Errors

   * unknown reduce option failure.

treats reduce -every null -on null as if no every was specified
-----------------------------------------------------
this lets us add optional -every -on parameters to subs with
default values of null for when no -every is specified.

### Juttle
    emit -limit 10 -from Date.new(0)
    |  batch :5s:
    | reduce -every null -on null count()
    | view result

### Output
    {count: 5, time: "1970-01-01T00:00:05.000Z"}
    {count: 5, time: "1970-01-01T00:00:10.000Z"}

basic reduce -every, historic
------------------------------

### Juttle

    emit  -hz 1000 -from Date.new(0) -limit 6
    | reduce -every :0.002s: a=count()
    | view result

### Output

    {"a": 2, "time": "1970-01-01T00:00:00.002Z"}
    {"a": 2, "time": "1970-01-01T00:00:00.004Z"}
    {"a": 2, "time": "1970-01-01T00:00:00.006Z"}

basic reduce -every, realtime
------------------------------

### Juttle

    emit  -hz 1000 -from Date.quantize(:+2s:, :2s:) -limit 6
    | reduce -every :0.002s: a=count()
    | keep a
    | view result

### Output

    {"a": 2}
    {"a": 2}
    {"a": 2}

reduce -every without teardown (-acc 1)
----------------------------------------

### Juttle

    emit  -from Date.new(0)  -hz 1000 -limit 10
    | put c = count()
    | reduce -every :0.005s: -acc 1 min("c")
    | view result

### Output

    { "min": 1, "time": "1970-01-01T00:00:00.005Z"}
    { "min": 1, "time": "1970-01-01T00:00:00.010Z"}

reduce -every without teardown (-reset false)
----------------------------------------

### Juttle

    emit  -from Date.new(0)  -hz 1000 -limit 10
    | put c = count()
    | reduce -every :0.005s: -reset false  min("c")
    | view result

### Output

    { "min": 1, "time": "1970-01-01T00:00:00.005Z"}
    { "min": 1, "time": "1970-01-01T00:00:00.010Z"}

reduce -every emits marks at batch boundaries
---------------------------------------------

### Juttle

    emit  -hz 1000 -from Date.new(0) -limit 6
    | batch :.001s:
    | reduce -every :0.002s: a=count()
    | put c=count()
    | view result -marks true -times true

### Output

    {"a": 2, "c": 1, "time": "1970-01-01T00:00:00.002Z"}
    {"mark": true, "time": "1970-01-01T00:00:00.002Z"}
    {"a": 2, "c": 1, "time": "1970-01-01T00:00:00.004Z"}
    {"mark": true, "time": "1970-01-01T00:00:00.004Z"}
    {"a": 2, "c": 1, "time": "1970-01-01T00:00:00.006Z"}
    {"mark": true, "time": "1970-01-01T00:00:00.006Z"}

cascade of every-driven reducers
----------------------------------

### Juttle

    emit -from Date.new(0) -limit 3
    | reduce -every :s: last1=last(time)
    | reduce -every :s: last2=last(last1)
    | reduce -every :s: last3=last(last2)
    | view result

### Output

    {"time":"1970-01-01T00:00:01.000Z","last3":"1970-01-01T00:00:00.000Z"}
    {"time":"1970-01-01T00:00:02.000Z","last3":"1970-01-01T00:00:01.000Z"}
    {"time":"1970-01-01T00:00:03.000Z","last3":"1970-01-01T00:00:02.000Z"}

accepts a sub containing a windowed reducer
-------------------------------------------

### Juttle

    sub r(fname) { reduce -every :s: a=last(fname) }
    emit -from Date.new(0) -limit 5
    | put a=1 | r -fname 'a' | keep a | view result

### Output

    {"a": 1}
    {"a": 1}
    {"a": 1}
    {"a": 1}
    {"a": 1}

reduce with calendar intervals
------------------------------

### Juttle

    emit  -every :day: -from Date.new(0) -limit 365
    | reduce -every :month: days=count()
    | view result

### Output

    {
      "time": "1970-02-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-03-01T00:00:00.000Z",
      "days": 28
    }
    {
      "time": "1970-04-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-05-01T00:00:00.000Z",
      "days": 30
    }
    {
      "time": "1970-06-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-07-01T00:00:00.000Z",
      "days": 30
    }
    {
      "time": "1970-08-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-09-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-10-01T00:00:00.000Z",
      "days": 30
    }
    {
      "time": "1970-11-01T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-12-01T00:00:00.000Z",
      "days": 30
    }
    {
      "time": "1971-01-01T00:00:00.000Z",
      "days": 31
    }

reduce with calendar intervals and alignment
------------------------------

### Juttle

    emit  -every :day: -from Date.new(0) -limit 99
    | reduce -every :month: -on :day 10: days=count()
    | view result

### Output
    {
      "time": "1970-01-10T00:00:00.000Z",
      "days": 9
    }
    {
      "time": "1970-02-10T00:00:00.000Z",
      "days": 31
    }
    {
      "time": "1970-03-10T00:00:00.000Z",
      "days": 28
    }
    {
      "time": "1970-04-10T00:00:00.000Z",
      "days": 31
    }

reduce with regular intervals and alignment
------------------------------

### Juttle

    emit  -every :hour: -from Date.new(0) -limit 48
    | reduce -every :day: -on :12:00:00: hours=count()
    | view result

### Output
    { "hours": 12,
      "time": "1970-01-01T12:00:00.000Z"
    }
    { "hours": 24,
      "time": "1970-01-02T12:00:00.000Z"
    }
    { "hours": 12,
      "time": "1970-01-03T12:00:00.000Z"
    }

reduce with undefined field
---------------------------

### Juttle

    emit -from Date.new(0) -limit 10
      | put x=count() % 2
      | reduce count() by x, y
      // no time in these points so sort by x to get consistent output
      | sort x
      | view result

### Output
    { "count": 5, "x": 0, "y": null }
    { "count": 5, "x": 1, "y": null }


custom reducer is torn down at batch epochs
------------------------------------------------------------

### Juttle

    reducer kount() {
        var count = 0;

        function update() {
            count = count + 1;
        }
        function result() {
            return count;
        }
    }
    emit -limit 10 -from Date.new(0)
    | batch -every :5s:
    | reduce kount()
    | view result

### Output

    { time: "1970-01-01T00:00:05.000Z", kount: 5 }
    { time: "1970-01-01T00:00:10.000Z", kount: 5 }


custom reducer is torn down at reduce epochs
------------------------------------------------------------

### Juttle

    reducer kount() {
        var count = 0;

        function update() {
            count = count + 1;
        }
        function result() {
            return count;
        }
    }
    emit -limit 10 -from Date.new(0)
    | reduce -every :5s: kount()
    | view result

### Output

    { time: "1970-01-01T00:00:05.000Z", kount: 5 }
    { time: "1970-01-01T00:00:10.000Z", kount: 5 }


Warns and drops points on a runtime error
-----------------------------------------

### Juttle

    emit -from Date.new(0) -limit 5
      | put c = count()
      | batch 1
      | reduce x = (sum(c) % 2 == 1 ? sum(c) : null) > 0
      | view result

### Output

    { time: "1970-01-01T00:00:01.000Z", x: true }
    { time: "1970-01-01T00:00:03.000Z", x: true }
    { time: "1970-01-01T00:00:05.000Z", x: true }

### Warnings

  * Invalid operand types for ">": null and number (0).

Allows direct assignment to the `time` field
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 6 | reduce -every :2s: time = first(time) + :1m: | view result

### Output

    { time: "1970-01-01T00:01:00.000Z" }
    { time: "1970-01-01T00:01:02.000Z" }
    { time: "1970-01-01T00:01:04.000Z" }

complains about out-of-order points
-----------------------------------

### Juttle

    emit -points [
        { "time": "1970-01-01T00:00:01.000Z", "value": 1 },
        { "time": "1970-01-01T00:00:00.000Z", "value": 0 },
        { "time": "1970-01-01T00:00:02.000Z", "value": 2 },
    ]
    | reduce -every :s: avg=avg(value) | view result

### Warnings

   * out-of-order point(s) dropped by reduce

complains about non-time assignment to the `time` field in -every mode
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | reduce -every :s: time = :s: | view result

### Warnings

   * Invalid type assigned to time: duration (00:00:01.000).

complains about non-time assignment to the `time` field in batch mode
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | batch :s: | reduce time = :s: | view result

### Warnings

   * Invalid type assigned to time: duration (00:00:01.000).

complains about out-of-order assignment to the `time` field in -every mode
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 4 | reduce -reset false -every :s: time = last(time) - 2 * count() * :s: | view result

### Warnings

   * out-of-order assignment of time 1969-12-31T23:59:57.000Z after 1970-01-01T00:00:01.000Z, point(s) dropped
   * out-of-order assignment of time 1969-12-31T23:59:56.000Z after 1970-01-01T00:00:02.000Z, point(s) dropped
   * out-of-order assignment of time 1969-12-31T23:59:55.000Z after 1970-01-01T00:00:03.000Z, point(s) dropped

complains about out-of-order assignment to the `time` field in batch mode
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 6 | batch :s: | reduce -reset false time = last(time) - 2 * count() * :s: | view result

### Warnings

   * out-of-order assignment of time 1969-12-31T23:59:58.000Z after 1970-01-01T00:00:00.000Z, point(s) dropped

complains about out-of-order assignment to the `time` field with -every
-----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 4
    | reduce -every :s: -reset false  n=count(), time = last(time) - Math.floor(count() / 2) * 2 * :s:
    | view result

### Warnings

   * out-of-order assignment of time 1969-12-31T23:59:59.000Z after 1970-01-01T00:00:01.000Z, point(s) dropped
   * out-of-order assignment of time 1970-01-01T00:00:00.000Z after 1970-01-01T00:00:02.000Z, point(s) dropped
   * out-of-order assignment of time 1969-12-31T23:59:59.000Z after 1970-01-01T00:00:03.000Z, point(s) dropped

### Output
    { time: "1970-01-01T00:00:00.000Z", n: 1 }

emits grouped results in order when time is assigned
-----------------------------------------------------
### Juttle
    emit -from Date.new(0) -limit 20
    | put n=count()
    | reduce time=Date.new(20 - last(n)) by n
    | reduce count()
    | view result

### Output
    {count: 20}
