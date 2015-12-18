Juttle moments
==============

:now: is the same wherever it is used
-------------------------------------
### Juttle
    function f() {
      // the use of Math.random() below is to ensure that f()
      // isn't evaluated away at build-time, even
      // if/when we do more sophisticated d-bit computation
      return Math.random() > 0.5 ? :now: : :now:;
    }
    const n = :now:;
    emit -limit 1
    | put now1 = n, now2 = f(), d = now1 - now2
    | keep d
    | view result

### Output
    {d: "00:00:00.000"}


a now-relative moment is the same wherever it is used
------------------------------------------------------
### Juttle
    function f() { return Math.random() > 0.5 ? :-1d: : :-1d:; }
    const m = :-1d:;
    emit -limit 1
    | put m1 = m, m2 = f(), d = m1 - m2
    | keep d
    | view result

### Output
    {d: "00:00:00.000"}

unix time (seconds since the epoch)
-----------------------------------------------------------
### Juttle

    emit -limit 1
    | put t1 = :0:, d1 = Date.new(0)
    | put t2 = :0.0:, d2 = Date.new(0)
    | put t3 = :1.0:, d3 = Date.new(1)
    | put t4 = :123.456:, d4 = Date.new(123.456)
    | put t5 = :42:, d5 = Date.new(42)
    | put winning = (t1==d1 && t2==d2 && t3==d3 && t4==d4 && t5==d5)
    | keep winning
    | view result

### Output

    { winning: true }

reject signed unix time
-----------------------------------------------------------
### Juttle

    emit -limit 1
    | put t = :-42:
    | view result

### Errors

   * SyntaxError
