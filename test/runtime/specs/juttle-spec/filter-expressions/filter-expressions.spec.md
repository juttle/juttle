Filter expressions
==================

Parses ambiguous expressions as expression filter terms
-------------------------------------------------------

Regression test for PROD-6646.

### Juttle

    emit -from Date.new(0) -limit 1 | put a = 5 | filter (a) == 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", a: 5 }
