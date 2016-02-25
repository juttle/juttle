# The `sub` statement

## Optional parameters can be expressions

### Juttle

    sub s(a = 5 + 6 * 7) {
      put result = a;
    }

    emit -from Date.new(0) -limit 1 | s | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 47 }

## Optional parameters can depend on previous parameters

### Juttle

    sub s(a, b = a * 2) {
      put result = [a, b];
    }

    emit -from Date.new(0) -limit 1 | s -a 1 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [1, 2] }

## Produces an error when a required parameter follows an optional parameter

### Juttle

    sub s(a = 5, b) {
    }

### Errors

  * A required parameter cannot follow an optional parameter.
