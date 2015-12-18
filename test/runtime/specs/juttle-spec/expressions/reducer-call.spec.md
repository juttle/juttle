A reducer call
===============

Returns correct result when passed required parameters
------------------------------------------------------

### Juttle

    reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 5] }

Returns correct result when passed required and optional parameters
-------------------------------------------------------------------

### Juttle

    reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r(1, 2) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

Produces an error when passed too few parameters
------------------------------------------------

### Juttle

    reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r() | view result

### Errors

  * Error: reducer r expects 1 to 2 arguments but was called with 0

Produces an error when passed too many parameters
-------------------------------------------------

### Juttle

    reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

    emit -from Date.new(0) -limit 1 | put result = r(1, 2, 3) | view result

### Errors

  * Error: reducer r expects 1 to 2 arguments but was called with 3

Returns correct result when passed required parameters (module)
---------------------------------------------------------------

### Module `m`

    export reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.r(1) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 5] }

Returns correct result when passed required and optional parameters (module)
----------------------------------------------------------------------------

### Module `m`

    export reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.r(1, 2) | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

Produces an error when passed too few parameters (module)
---------------------------------------------------------

### Module `m`

    export reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.r() | view result

### Errors

  * Error: reducer m.r expects 1 to 2 arguments but was called with 0

Produces an error when passed too many parameters (module)
----------------------------------------------------------

### Module `m`

    export reducer r(a, b = 5) {
      function update() {
      }

      function result() {
        return [a, b];
      }
    }

### Juttle

    import 'm' as m;

    emit -from Date.new(0) -limit 1 | put result = m.r(1, 2, 3) | view result

### Errors

  * Error: reducer m.r expects 1 to 2 arguments but was called with 3
