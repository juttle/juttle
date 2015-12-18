The `if` statement
==================

With one branch: Executes the branch depending on the condition
---------------------------------------------------------------

### Juttle

    function f(x) {
      if (x) {
        return 1;
      }

      return null;
    }

    emit -from Date.new(0) -limit 1
      | put f = f(false)
      | put t = f(true)
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", f: null, t: 1 }

With two branches: Executes one of the branches depending on the condition
--------------------------------------------------------------------------

### Juttle

    function f(x) {
      if (x) {
        return 1;
      } else {
        return 0;
      }
    }

    emit -from Date.new(0) -limit 1
      | put f = f(false)
      | put t = f(true)
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", f: 0, t: 1 }

Produces an error when used with a condition of invalid type
------------------------------------------------------------

### Juttle

    function f(x) {
      if (x) {
        return 1;
      } else {
        return 0;
      }
    }

    emit -from Date.new(0) -limit 1 | put result = f(null) | view result

### Warnings

  * if statement: Invalid condition type (null).
