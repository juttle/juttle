The `function` statement
========================

Optional parameters can be expressions
--------------------------------------

### Juttle

    function f(a = 5 + 6 * 7) {
      return a;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 47 }

Optional parameters can depend on previous parameters
-----------------------------------------------------

### Juttle

    function f(a, b = a * 2) {
      return [a, b];
    }

    emit -from Date.new(0) -limit 1 | put result = f(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

Produces an error when a required parameter follows an optional parameter
-------------------------------------------------------------------------

### Juttle

    function f(a = 5, b) {
    }

### Errors

  * A required parameter cannot follow an optional parameter.
