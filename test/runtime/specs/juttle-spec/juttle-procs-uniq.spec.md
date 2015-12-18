Juttle uniq processor
======================

uniq on all fields
-------------------

### Juttle

    emit -from Date.new(0) -limit 5
    | put foo=time-:0:
    | put rate=#foo+#foo%:2 seconds:
    | keep time, rate
    | uniq
    | view result

### Output

    {time: "1970-01-01T00:00:00.000Z", rate: "00:00:00.000"}
    {time: "1970-01-01T00:00:01.000Z", rate: "00:00:02.000"}
    {time: "1970-01-01T00:00:03.000Z", rate: "00:00:04.000"}


uniq on a duration
-------------------

### Juttle
    emit -from Date.new(0) -limit 5
    | put foo=time-:0:
    | put rate=foo+foo%:2 seconds:
    | uniq rate
    | view result

### Output

    {time: "1970-01-01T00:00:00.000Z", foo: "00:00:00.000", rate: "00:00:00.000"}
    {time: "1970-01-01T00:00:01.000Z", foo: "00:00:01.000", rate: "00:00:02.000"}
    {time: "1970-01-01T00:00:03.000Z", foo: "00:00:03.000", rate: "00:00:04.000"}


uniq on multiple fields
------------------------

### Juttle

    emit -from Date.new(0) -limit 5
    | put foo=time-:0:
    | put rate=#foo+#foo%:2 seconds:, test=((#foo+Duration.new(1))%:3 seconds:)%:2 seconds:
    | uniq rate, test
    | view result

### Output

    {time: "1970-01-01T00:00:00.000Z", foo: "00:00:00.000", rate: "00:00:00.000", test: "00:00:01.000"}
    {time: "1970-01-01T00:00:01.000Z", foo: "00:00:01.000", rate: "00:00:02.000", test: "00:00:00.000"}
    {time: "1970-01-01T00:00:03.000Z", foo: "00:00:03.000", rate: "00:00:04.000", test: "00:00:01.000"}
    {time: "1970-01-01T00:00:04.000Z", foo: "00:00:04.000", rate: "00:00:04.000", test: "00:00:00.000"}


uniq by
--------

### Juttle

    // x y n
    // 0 0 1
    // 0 0 2
    // 1 0 3
    // 1 1 4
    // 2 1 5
    // 2 1 6
    // 3 2 7
    // 3 2 8
    // 4 2 9
    //
    emit -from Date.new(0) -limit 9
    | put n=count(), x=Math.floor((count()-1)/2), y=Math.floor((count()-1)/3)
    | uniq y by x
    | remove time
    | view result

### Output
    { x:0, y:0, n:1 }
    { x:1, y:0, n:3 }
    { x:1, y:1, n:4 }
    { x:2, y:1, n:5 }
    { x:3, y:2, n:7 }
    { x:4, y:2, n:9 }

uniq by on all fields
----------------------

### Juttle

    // x y n
    // 0 0 1
    // 0 0 2
    // 1 0 3
    // 1 1 4
    // 2 1 5
    // 2 1 6
    // 3 2 7
    // 3 2 8
    // 4 2 9
    //
    emit -from Date.new(0) -limit 9
    | put n=count(), x=Math.floor((count()-1)/2), y=Math.floor((count()-1)/3)
    | uniq by x
    | remove time
    | view result

### Output

    { x:0, y:0, n:1 }
    { x:0, y:0, n:2 }
    { x:1, y:0, n:3 }
    { x:1, y:1, n:4 }
    { x:2, y:1, n:5 }
    { x:2, y:1, n:6 }
    { x:3, y:2, n:7 }
    { x:3, y:2, n:8 }
    { x:4, y:2, n:9 }

uniq with batched input
------------------------

### Juttle

    emit -from Date.new(0) -limit 6
    | batch 3
    | put i = count() % 2
    | sort i
    | uniq i
    | view result

### Output

    { "i": 0, "time": "1970-01-01T00:00:03.000Z" }
    { "i": 1, "time": "1970-01-01T00:00:03.000Z" }
    { "i": 0, "time": "1970-01-01T00:00:06.000Z" }
    { "i": 1, "time": "1970-01-01T00:00:06.000Z" }
