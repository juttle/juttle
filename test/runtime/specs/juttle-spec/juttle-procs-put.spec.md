# Juttle "put" processor

## Allows direct assignment to the `time` field

### Juttle

    emit -from Date.new(0) -limit 3 | put time = time + :1m: | view result

### Output

    { time: "1970-01-01T00:01:00.000Z" }
    { time: "1970-01-01T00:01:01.000Z" }
    { time: "1970-01-01T00:01:02.000Z" }

## Allows indirect assignment to the `time` field

### Juttle

    emit -from Date.new(3) -limit 3 | put *"time" = time - :3s: | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:01.000Z" }
    { time: "1970-01-01T00:00:02.000Z" }

## complains about non-time assignment to the `time` field

### Juttle

    emit -from Date.new(0) -limit 3 | put n=count(), time = :s: | view result

### Warnings

   * Invalid type assigned to time: duration (00:00:01.000).

## complains about out-of-order assignment to the `time` field with a reducer

### Juttle

    emit -from Date.new(0) -limit 4 | put n=count(), time = time - Math.floor(count() / 2) * 2 * :s: | view result

### Warnings

   * out-of-order assignment of time 1969-12-31T23:59:59.000Z after 1970-01-01T00:00:00.000Z, point(s) dropped

### Output
    { time: "1970-01-01T00:00:00.000Z", n: 1 }
    { time: "1970-01-01T00:00:00.000Z", n: 3 }

## complains about out-of-order assignment to the `time` field with non-reducer expression

### Juttle

    emit -from Date.new(0) -limit 4 | put n=count(), time = time - Math.floor(n / 2) * 2 * :s: | view result

### Warnings

   * out-of-order assignment of time 1969-12-31T23:59:59.000Z after 1970-01-01T00:00:00.000Z, point(s) dropped

### Output
    { time: "1970-01-01T00:00:00.000Z", n: 1 }
    { time: "1970-01-01T00:00:00.000Z", n: 3 }

## the -acc option suppresses reducer reset

### Juttle

    emit -limit 4 -from Date.new(0)
    |batch :2s:
    | put -acc true c=count()
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", c: 1 }
    { time: "1970-01-01T00:00:01.000Z", c: 2 }
    { time: "1970-01-01T00:00:02.000Z", c: 3 }
    { time: "1970-01-01T00:00:03.000Z", c: 4 }

## sequential assignments work with reducers

### Juttle

    emit -limit 4 -from Date.new(0)
    | put c=count(), c2 = c * c, two = count() == 2, again=last(c2), notagain=first(c2), ternary = count() % 2 == 1 ? count() : null
    | remove time
    | view result

### Output

    { c: 1, c2: 1, two: false, again: 1, notagain: 1, ternary: 1 }
    { c: 2, c2: 4, two: true, again: 4, notagain: 1, ternary: null }
    { c: 3, c2: 9, two: false, again: 9, notagain: 1, ternary: 2 }
    { c: 4, c2: 16, two: false, again: 16, notagain: 1, ternary: null }

## sequential assignments with -over show proper results of partial windows
note the ternary count is only incremented when the condition is true.
it gives a count of odds or evens in the current window.

### Juttle

    emit -from Date.new(0) -limit 6
    | put -over :3s: i = Date.unix(time), c = count(), d = c > 2 ? count() : null
    | remove time
    | view result

### Output

    { i: 0, c: 1, d: null }
    { i: 1, c: 2, d: null }
    { i: 2, c: 3, d: 1 }
    { i: 3, c: 3, d: 2 }
    { i: 4, c: 3, d: 3 }
    { i: 5, c: 3, d: 3 }

## assignments with -from and -over hide their results from you but not from themselves
Like the previous test, but final result points between 0..3s are suppressed.
intermediate sequential assignments for these points are processed as normal,
so that the window is loaded with conforming points. this is why the first value
of d is 2 instead of 3.

### Juttle

    emit -from Date.new(0) -limit 6
    | put -from Date.new(0) -over :3s: i = Date.unix(time), c = count(), d = c > 2 ? count() : null
    | remove time
    | view result

### Output

    {}
    {}
    {}
    { i: 3, c: 3, d: 2 }
    { i: 4, c: 3, d: 3 }
    { i: 5, c: 3, d: 3 }

## Warns and drops points on a runtime error

### Juttle

    emit -from Date.new(0) -limit 5
      | put x = (count() % 2 == 1 ? count() : null) > 0
      | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", x: true }
    { time: "1970-01-01T00:00:02.000Z", x: true }
    { time: "1970-01-01T00:00:04.000Z", x: true }

### Warnings

  * Invalid operand types for ">": null and number (0).
