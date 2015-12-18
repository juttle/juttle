Juttle moments, new functionality
===================================


can assign :forever: to a point
-------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put f = :forever:, g = -1 * :forever:
    | remove time
    | view result

### Output
    {f: "Infinity", g: "-Infinity"}


can assign forever const to a point
-----------------------------------

### Juttle
    const long_time = :1000000y:;
    const forever = :forever:;

    emit -from :-1m: -limit 1
    | put f = forever, g = -1 * forever
    | remove time
    | view result

### Output
    {f: "Infinity", g: "-Infinity"}


can assign forever const to a point (runtime function)
------------------------------------------------------

### Juttle
    // the use of Math.random() below is to ensure that f()
    // isn't evaluated away at build-time, even
    // if/when we do more sophisticated d-bit computation
    function forever() { return Math.random() > 0.5 ? :forever: : :forever:; }

    emit -from :-1m: -limit 1
    | put f = forever(), g = -1 * forever()
    | remove time
    | view result

### Output
    {f: "Infinity", g: "-Infinity"}


can add/subtract durations with :forever:
-----------------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put f = :forever:, g = f + f, h = f - long_time, i = f + long_time
    | remove time
    | view result

### Output
    {f: "Infinity", g: "Infinity", h: "Infinity", i: "Infinity"}


can add :forever: to a finite date
----------------------------------

### Juttle
    const f = :now: + :forever:;

    emit -from :-1m: -limit 1
    | put f = f, g = :forever: + time
    | remove time
    | view result

### Output
    {f: "Infinity", g: "Infinity"}


can subtract :forever: from a finite date
-----------------------------------------

### Juttle
    const f = :now: - :forever:;

    emit -from :-1m: -limit 1
    | put f = f, g = time - :forever:
    | remove time
    | view result

### Output
    {f: "-Infinity", g: "-Infinity"}



can divide/multiply numbers with :forever:
-----------------------------------------

### Juttle

    emit -from :-1m: -limit 1
    | put f = :forever:, g = 10 * f, h = f / 10
    | remove time
    | view result

### Output
    {f: "Infinity", g: "Infinity", h: "Infinity"}


can compare durations with :forever:
------------------------------------

### Juttle
    emit -from :-1m: -limit 10
    | put d = :now: - time, f = :forever:
    | filter d < :forever:
    | filter f = :forever:
    | reduce count()
    | view result

### Output
    {count: 10}


programmatic infinite duration
------------------------------

### Juttle
    emit -from :-1m: -limit 1
    | put foo= Duration.new(5) < Duration.new(1/0)
    | keep foo
    | view result

### Output
    {foo: true}


programmatic infinite duration (as const)
-----------------------------------------

### Juttle
    const forever = Duration.new(1/0);
    emit -from :-1m: -limit 1
    | put foo= Duration.new(5) < forever
    | keep foo
    | view result

### Output
    {foo: true}


can add/subtract durations with negative :forever:
--------------------------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put f = -1 * :forever:, g = f + f, h = f - long_time, i = f + long_time
    | remove time
    | view result

### Output
    {f: "-Infinity", g: "-Infinity", h: "-Infinity", i: "-Infinity"}


can divide/multiply numbers with negative :forever:
---------------------------------------------------

### Juttle

    emit -from :-1m: -limit 1
    | put f = -1 * :forever:, g = 10 * f, h = f / 10
    | remove time
    | view result

### Output
    {f: "-Infinity", g: "-Infinity", h: "-Infinity"}



can compare durations with negative :forever:
---------------------------------------------

### Juttle
    emit -from :-1m: -limit 10
    | put d = :now: - time, f = -1 * :forever:
    | filter d > -1 * :forever:
    | filter f = -1 * :forever:
    | reduce count()
    | view result

### Output
    {count: 10}



programmatic negative infinite duration
---------------------------------------

### Juttle
    emit -from :-1m: -limit 1
    | put foo= Duration.new(5) < Duration.new(-1/0)
    | keep foo
    | view result

### Output
    {foo: false}
