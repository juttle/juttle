Juttle "remove" processor
=========================

Removes specified fields
------------------------

### Juttle

    emit -from Date.new(0) -limit 3 | put a = 1, b = 2, c = 3, d = 4 | remove a, b, c | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", d: 4 }
    { time: "1970-01-01T00:00:01.000Z", d: 4 }
    { time: "1970-01-01T00:00:02.000Z", d: 4 }

Ignores fields that don't exist in processed points
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 3 | put a = 1 | remove b | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 1 }
    { time: "1970-01-01T00:00:01.000Z", a: 1 }
    { time: "1970-01-01T00:00:02.000Z", a: 1 }
