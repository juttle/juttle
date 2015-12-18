Juttle moments, infinite dates
==============================

can assign :beginning: and :end: to a field
-------------------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put b = :beginning:, e = :end:
    | remove time
    | view result

### Output
    {b: "-Infinity", e: "Infinity"}


can assign :beginning: and :end: to a field (runtime function)
--------------------------------------------------------------

### Juttle
    const long_time = :1000000y:;
    // the use of Math.random() below is to ensure that f()
    // isn't evaluated away at build-time, even
    // if/when we do more sophisticated d-bit computation
    function end() { return Math.random() > 0.5 ? :end: : :end:; }
    function beg() { return Math.random() > 0.5 ? :beginning: : :beginning:; }

    emit -from :-1m: -limit 1
    | put b = beg(), e=end()
    | remove time
    | view result

### Output
    {b: "-Infinity", e: "Infinity"}


can add/substract durations to :beginning:
------------------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put b = :beginning:, c = b + long_time, d = b - long_time
    | remove time
    | view result

### Output
    {b: "-Infinity", c: "-Infinity", d: "-Infinity"}


can add/substract durations to :end:
------------------------------------------

### Juttle
    const long_time = :1000000y:;

    emit -from :-1m: -limit 1
    | put b = :end:, c = b + long_time, d = b - long_time
    | remove time
    | view result

### Output
    {b: "Infinity", c: "Infinity", d: "Infinity"}


Programmatic :end: (in a put expression)
------------------------------------

### Juttle

    emit -hz 1000 -limit 1
    | put foo= Date.new(5) < Date.new(1/0)
    | keep foo
    | view result


### Output
    {foo: true}


Programmatic :end: (as const)
-------------------------

### Juttle

    const a = Date.new(1/0);

    emit -hz 1000 -limit 1
    | put foo= Date.new(5) < a
    | keep foo
    | view result


### Output
    {foo: true}


Programmatic :end: (in a stream-context function)
--------------------------------------------

### Juttle

    function f(d) { return Date.new(d); }

    emit -hz 1000 -limit 1
    | put d=1/0, foo= Date.new(5) < f(d)
    | keep foo
    | view result


### Output
    {foo: true}


Programmatic :beginning: (in a put expression)
---------------------------------------------

### Juttle

    emit -hz 1000 -limit 1
    | put foo= Date.new(5) < Date.new(-1/0)
    | keep foo
    | view result


### Output
    {foo: false}


Programmatic :beginning: (as const)
-----------------------------------

### Juttle

    const a = Date.new(-1/0);

    emit -hz 1000 -limit 1
    | put foo= Date.new(5) < a
    | keep foo
    | view result


### Output
    {foo: false}


Programmatic :beginning: (in a stream-context function)
-------------------------------------------------------

### Juttle

    function f(d) { return Date.new(d); }

    emit -hz 1000 -limit 1
    | put d=-1/0, foo= Date.new(5) < f(d)
    | keep foo
    | view result


### Output
    {foo: false}
