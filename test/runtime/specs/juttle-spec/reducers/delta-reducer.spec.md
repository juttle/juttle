Juttle "delta" reducer
======================

complains if missing argument
-----------------------------
### Juttle
    emit -limit 1 | put losing = delta() | view result

### Errors
   * reducer delta expects 1 to 3 arguments but was called with 0

complains if reduce delta
-----------------------------
### Juttle
    emit -limit 1 | reduce delta(foo) | view result

### Errors
   * CompileError: delta cannot be used with reduce (use reduce last | put delta=delta())

outputs "empty" on missing field
--------------------------------------------------
### Juttle
    emit -limit 2 -every :0.1s: -from Date.new(0)
    | put delta = delta(foo, "empty")
    | view result

### Output
    {delta: "empty", time: "1970-01-01T00:00:00.000Z"}
    {delta: "empty", time: "1970-01-01T00:00:00.100Z"}

reduce + put delta pattern works like reduce delta sorta-aughta
------------------------------------------------------

### Juttle

    emit -limit 8 -every :0.1s: -from Date.new(0)
    | put n = count()
    | filter n < 4 or n > 5
    | reduce -every :0.1s: n = last(n)
    | put delta = delta("n", "empty")
    | remove n
    | view result

### Output

    { time: "1970-01-01T00:00:00.100Z", delta: "empty" }
    { time: "1970-01-01T00:00:00.200Z", delta: 1 }
    { time: "1970-01-01T00:00:00.300Z", delta: 1 }
    { time: "1970-01-01T00:00:00.400Z", delta: "empty" }
    { time: "1970-01-01T00:00:00.500Z", delta: "empty" }
    { time: "1970-01-01T00:00:00.600Z", delta: 3 }
    { time: "1970-01-01T00:00:00.700Z", delta: 1 }
    { time: "1970-01-01T00:00:00.800Z", delta: 1 }

put computes point-to-point differences
--------------------------------------------------
### Juttle
    emit -points [
    { time: "1970-01-01T00:00:00.000Z", x: 1},
    { time: "1970-01-01T00:00:01.000Z", x: 10},
    { time: "1970-01-01T00:00:02.000Z", y: 100},
    { time: "1970-01-01T00:00:03.000Z", x: 20}]
    | put dx = delta(x)
    | keep x, dx
    | view result

### Output
    { x: 1, dx: 0 }
    { x: 10, dx: 9 }
    { dx: 0 }
    { x: 20, dx: 10 }

put works with durations and time
--------------------------------------------------
compute a rate in units per second by dividing delta(foo) by delta(time).
empty results give us NaN (one reason you want derivative()).
also compute running change in a duration.
### Juttle
    emit -limit 3 -from Date.new(0)
    | put foo = count() * count()
    | put foos = Duration.new(foo)
    | put dfoo=delta(foo)/Duration.seconds(delta(time,:0s:)), dfoos=delta(foos,null)
    | keep time, dfoo, dfoos
    | view result

### Output
    { time: "1970-01-01T00:00:00.000Z",       dfoo: NaN,     dfoos: null }
    { time: "1970-01-01T00:00:01.000Z",       dfoo: 3,       dfoos: "00:00:03.000" }
    { time: "1970-01-01T00:00:02.000Z",       dfoo: 5,       dfoos: "00:00:05.000" }

put computes point-to-point differences by name
--------------------------------------------------
### Juttle
    emit -points [
    { time: "1970-01-01T00:00:00.000Z", name:"x", value:1},
    { time: "1970-01-01T00:00:01.000Z", name:"y", value:-1},
    { time: "1970-01-01t00:00:02.000z", name:"x", value:10},
    { time: "1970-01-01t00:00:03.000z", name:"y", value:-10},
    { time: "1970-01-01t00:00:04.000z", name:"x", value:100},
    { time: "1970-01-01t00:00:05.000z", name:"y", value:-100}]
    | put d = delta(value) by name
    | keep name, value, d
    | view result

### Output
    { name: "x", value: 1, d: 0 }
    { name: "y", value: -1, d: 0 }
    { name: "x", value: 10, d: 9 }
    { name: "y", value: -10, d: -9 }
    { name: "x", value: 100, d: 90 }
    { name: "y", value: -100, d: -90 }

put computes point-to-point differences with a wrapping counter, wrap > 0
--------------------------------------------------
### Juttle
    emit -points [
    { time: "1970-01-01T00:00:00.000Z", x: 1},
    { time: "1970-01-01T00:00:01.000Z", x: 10},
    { time: "1970-01-01T00:00:02.000Z", x:  5},
    { time: "1970-01-01T00:00:03.000Z", x: 15}]
    | put dx = delta(x, 0, 20)
    | keep x, dx
    | view result

### Output
    { x:  1, dx: 0 }
    { x: 10, dx: 9 }
    { x:  5, dx: 15 }
    { x: 15, dx: 10 }

put computes point-to-point differences with a wrapping counter, wrap = 0
--------------------------------------------------
### Juttle
    emit -points [
    { time: "1970-01-01T00:00:00.000Z", x: 1},
    { time: "1970-01-01T00:00:01.000Z", x: 10},
    { time: "1970-01-01T00:00:02.000Z", x:  5},
    { time: "1970-01-01T00:00:03.000Z", x: 15}]
    | put dx = delta(x, 0, 0)
    | keep x, dx
    | view result

### Output
    { x:  1, dx: 0 }
    { x: 10, dx: 9 }
    { x:  5, dx: 5 }
    { x: 15, dx: 10 }

put computes point-to-point differences with a wrapping counter, wrap = true
--------------------------------------------------
### Juttle
    emit -points [
    { time: "1970-01-01T00:00:00.000Z", x: 1},
    { time: "1970-01-01T00:00:01.000Z", x: 10},
    { time: "1970-01-01T00:00:02.000Z", x:  5},
    { time: "1970-01-01T00:00:03.000Z", x: 15}]
    | put dx = delta(x, 0, true)
    | keep x, dx
    | view result

### Output
    { x:  1, dx: 0 }
    { x: 10, dx: 9 }
    { x:  5, dx: 0 }
    { x: 15, dx: 10 }
