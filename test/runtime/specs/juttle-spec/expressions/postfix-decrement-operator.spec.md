The postfix `--` operator
=========================

Returns correct result when used on a `Number`
----------------------------------------------

### Juttle

    function f(x) {
      var y = x--;

      return [x, y];
    }

    emit -from Date.new(0) -limit 1 | put result = f(5) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: [4, 5] }

Produces an error when used on operand of invalid type
------------------------------------------------------

### Juttle

    function f(x) {
      var y = x--;
    }

    emit -from Date.new(0) -limit 1 | put result = f(null) | view result

### Warnings

  * "--" operator: Invalid operand type (null).
