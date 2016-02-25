# The `var` statement

## Initializes a variable to specified value

### Juttle

    function f() {
      var v = 5;

      return v;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 5 }

## Initializes a variable to `null` when no value is specified

### Juttle

    function f() {
      var v;

      return v;
    }

    emit -from Date.new(0) -limit 1 | put result = f() | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }
